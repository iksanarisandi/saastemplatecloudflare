import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { paymentInputSchema } from '@saas/shared';
import { PaymentService } from '../services/payment.service';
import { StorageService } from '../services/storage.service';
import {
  success,
  successPaginated,
  error,
  notFound,
  badRequest,
  forbidden,
} from '../lib/response';
import {
  authMiddleware,
  requireAdmin,
} from '../middleware/auth.middleware';
import { tenantMiddleware, type TenantVariables } from '../middleware/tenant.middleware';

type PaymentsEnv = { Bindings: Env; Variables: TenantVariables & { requestId: string } };

const paymentsRoutes = new Hono<PaymentsEnv>();

// All payment routes require authentication and tenant context
paymentsRoutes.use('*', authMiddleware);
paymentsRoutes.use('*', tenantMiddleware);

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['pending', 'confirmed', 'rejected', 'expired']).optional(),
});

// Reject payment schema
const rejectPaymentSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

// Helper to transform payment for response
function transformPayment(payment: any) {
  return {
    id: payment.id,
    tenantId: payment.tenantId,
    userId: payment.userId,
    planId: payment.planId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    proofFileId: payment.proofFileId,
    confirmedBy: payment.confirmedBy,
    confirmedAt: payment.confirmedAt?.toISOString(),
    rejectionReason: payment.rejectionReason,
    metadata: payment.metadata,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}


/**
 * GET /payments
 * Get payments with optional status filter
 * Requirement 5.3: Display list of payments awaiting confirmation
 */
paymentsRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { page, limit, status } = c.req.valid('query');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const paymentService = new PaymentService(c.env.DB, tenantId);

    let result;
    
    // Admins can see all payments, users only see their own
    if (auth.user.role === 'admin' || auth.user.role === 'super_admin') {
      if (status === 'pending') {
        result = await paymentService.getPending({ page, limit });
      } else if (status) {
        result = await paymentService.getByStatus(status, { page, limit });
      } else {
        result = await paymentService.getAll({ page, limit });
      }
    } else {
      result = await paymentService.getByUser(auth.user.id, { page, limit });
    }

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    return successPaginated(c, {
      items: result.data.items.map(transformPayment),
      pagination: result.data.pagination,
    });
  }
);

/**
 * POST /payments
 * Create a new payment
 * Requirement 5.1: Generate a payment record with pending status
 */
paymentsRoutes.post(
  '/',
  zValidator('json', paymentInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const paymentService = new PaymentService(c.env.DB, tenantId);

    const result = await paymentService.create(auth.user.id, data);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        PLAN_NOT_FOUND: 404,
        PLAN_INACTIVE: 400,
        INVALID_PAYMENT_DATA: 400,
        INTERNAL_ERROR: 500,
      };
      
      if (result.error.code === 'PLAN_NOT_FOUND') {
        return notFound(c, 'Subscription plan', data.subscriptionPlanId);
      }
      
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 404 | 500
      );
    }

    return success(c, transformPayment(result.data), 201);
  }
);

/**
 * GET /payments/:id
 * Get payment by ID
 */
paymentsRoutes.get('/:id', async (c) => {
  const paymentId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const paymentService = new PaymentService(c.env.DB, tenantId);

  const result = await paymentService.getById(paymentId);

  if (!result.success) {
    if (result.error.code === 'PAYMENT_NOT_FOUND') {
      return notFound(c, 'Payment', paymentId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  // Users can only see their own payments unless admin
  if (auth.user.role === 'user' && result.data.userId !== auth.user.id) {
    return forbidden(c, 'Cannot access this payment');
  }

  return success(c, transformPayment(result.data));
});


/**
 * POST /payments/:id/proof
 * Upload payment proof
 * Requirement 5.2: Store the image in R2 and link it to the payment record
 */
paymentsRoutes.post('/:id/proof', async (c) => {
  const paymentId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const paymentService = new PaymentService(c.env.DB, tenantId);

  // Verify payment exists and belongs to user
  const paymentResult = await paymentService.getById(paymentId);
  if (!paymentResult.success) {
    if (paymentResult.error.code === 'PAYMENT_NOT_FOUND') {
      return notFound(c, 'Payment', paymentId);
    }
    return error(
      c,
      { code: paymentResult.error.code, message: paymentResult.error.message },
      500
    );
  }

  // Users can only upload proof for their own payments
  if (paymentResult.data.userId !== auth.user.id && auth.user.role === 'user') {
    return forbidden(c, 'Cannot upload proof for this payment');
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return badRequest(c, 'No file provided');
  }

  // Upload file to storage
  const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);
  const uploadResult = await storageService.upload(auth.user.id, {
    file,
    folder: 'payment-proofs',
  });

  if (!uploadResult.success) {
    return error(
      c,
      { code: uploadResult.error.code, message: uploadResult.error.message },
      400
    );
  }

  // Link proof to payment
  const result = await paymentService.uploadProof(paymentId, uploadResult.data.id);

  if (!result.success) {
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      400
    );
  }

  return success(c, {
    ...transformPayment(result.data),
    proofFile: {
      id: uploadResult.data.id,
      filename: uploadResult.data.filename,
      originalName: uploadResult.data.originalName,
    },
  });
});

/**
 * POST /payments/:id/confirm
 * Confirm a payment (admin only)
 * Requirement 5.4: Update payment status to confirmed and activate subscription
 */
paymentsRoutes.post('/:id/confirm', requireAdmin, async (c) => {
  const paymentId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const paymentService = new PaymentService(c.env.DB, tenantId);

  const result = await paymentService.confirm(paymentId, auth.user.id);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      PAYMENT_NOT_FOUND: 404,
      PAYMENT_ALREADY_PROCESSED: 400,
      INTERNAL_ERROR: 500,
    };
    
    if (result.error.code === 'PAYMENT_NOT_FOUND') {
      return notFound(c, 'Payment', paymentId);
    }
    
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      (statusMap[result.error.code] || 400) as 400 | 404 | 500
    );
  }

  return success(c, {
    ...transformPayment(result.data),
    message: 'Payment confirmed successfully',
  });
});

/**
 * POST /payments/:id/reject
 * Reject a payment (admin only)
 * Requirement 5.5: Update payment status to rejected and notify user
 */
paymentsRoutes.post(
  '/:id/reject',
  requireAdmin,
  zValidator('json', rejectPaymentSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const paymentId = c.req.param('id');
    const { reason } = c.req.valid('json');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const paymentService = new PaymentService(c.env.DB, tenantId);

    const result = await paymentService.reject(paymentId, auth.user.id, reason);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        PAYMENT_NOT_FOUND: 404,
        PAYMENT_ALREADY_PROCESSED: 400,
        INTERNAL_ERROR: 500,
      };
      
      if (result.error.code === 'PAYMENT_NOT_FOUND') {
        return notFound(c, 'Payment', paymentId);
      }
      
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 404 | 500
      );
    }

    return success(c, {
      ...transformPayment(result.data),
      message: 'Payment rejected',
    });
  }
);

export { paymentsRoutes };
