import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SubscriptionService } from '../services/subscription.service';
import {
  success,
  successPaginated,
  error,
  notFound,
  badRequest,
} from '../lib/response';
import {
  authMiddleware,
  requireAdmin,
} from '../middleware/auth.middleware';
import { tenantMiddleware, type TenantVariables } from '../middleware/tenant.middleware';

type SubscriptionsEnv = { Bindings: Env; Variables: TenantVariables & { requestId: string } };

const subscriptionsRoutes = new Hono<SubscriptionsEnv>();

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Subscribe input schema
const subscribeInputSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
});

/**
 * GET /plans
 * Get all active subscription plans
 * Requirement 6.1: Display all active subscription plans with features and pricing
 */
subscriptionsRoutes.get(
  '/plans',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { page, limit } = c.req.valid('query');
    const subscriptionService = new SubscriptionService(c.env.DB);

    const result = await subscriptionService.getActivePlans({ page, limit });

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    // Transform plans for response
    const transformedItems = result.data.items.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      interval: plan.interval,
      features: plan.features,
      limits: plan.limits,
    }));

    return successPaginated(c, {
      items: transformedItems,
      pagination: result.data.pagination,
    });
  }
);


// Protected routes - require authentication
const protectedRoutes = new Hono<SubscriptionsEnv>();
protectedRoutes.use('*', authMiddleware);
protectedRoutes.use('*', tenantMiddleware);

/**
 * GET /subscriptions
 * Get tenant's subscriptions
 * Requirement 6.2: Subscription management
 */
protectedRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { page, limit } = c.req.valid('query');
    const tenantId = c.get('tenantId');
    const subscriptionService = new SubscriptionService(c.env.DB, tenantId);

    const result = await subscriptionService.getTenantSubscriptions(tenantId, { page, limit });

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    // Transform subscriptions for response
    const transformedItems = result.data.items.map(sub => ({
      id: sub.id,
      tenantId: sub.tenantId,
      planId: sub.planId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      canceledAt: sub.canceledAt?.toISOString(),
      createdAt: sub.createdAt.toISOString(),
      updatedAt: sub.updatedAt.toISOString(),
    }));

    return successPaginated(c, {
      items: transformedItems,
      pagination: result.data.pagination,
    });
  }
);

/**
 * POST /subscriptions
 * Subscribe to a plan
 * Requirement 6.2: Create a subscription record linked to confirmed payment
 */
protectedRoutes.post(
  '/',
  requireAdmin,
  zValidator('json', subscribeInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { planId } = c.req.valid('json');
    const tenantId = c.get('tenantId');
    const subscriptionService = new SubscriptionService(c.env.DB, tenantId);

    const result = await subscriptionService.subscribe(tenantId, planId);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        PLAN_NOT_FOUND: 404,
        PLAN_INACTIVE: 400,
        INTERNAL_ERROR: 500,
      };
      
      if (result.error.code === 'PLAN_NOT_FOUND') {
        return notFound(c, 'Subscription plan', planId);
      }
      
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 404 | 500
      );
    }

    return success(c, {
      id: result.data.id,
      tenantId: result.data.tenantId,
      planId: result.data.planId,
      status: result.data.status,
      currentPeriodStart: result.data.currentPeriodStart.toISOString(),
      currentPeriodEnd: result.data.currentPeriodEnd.toISOString(),
      createdAt: result.data.createdAt.toISOString(),
    }, 201);
  }
);

/**
 * GET /subscriptions/active
 * Get tenant's active subscription
 */
protectedRoutes.get('/active', async (c) => {
  const tenantId = c.get('tenantId');
  const subscriptionService = new SubscriptionService(c.env.DB, tenantId);

  const result = await subscriptionService.getActiveSubscription(tenantId);

  if (!result.success) {
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  if (!result.data) {
    return success(c, null);
  }

  return success(c, {
    id: result.data.id,
    tenantId: result.data.tenantId,
    planId: result.data.planId,
    status: result.data.status,
    currentPeriodStart: result.data.currentPeriodStart.toISOString(),
    currentPeriodEnd: result.data.currentPeriodEnd.toISOString(),
    canceledAt: result.data.canceledAt?.toISOString(),
    createdAt: result.data.createdAt.toISOString(),
    updatedAt: result.data.updatedAt.toISOString(),
  });
});

/**
 * GET /subscriptions/:id
 * Get subscription by ID
 */
protectedRoutes.get('/:id', async (c) => {
  const subscriptionId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const subscriptionService = new SubscriptionService(c.env.DB, tenantId);

  const result = await subscriptionService.getSubscriptionById(tenantId, subscriptionId);

  if (!result.success) {
    if (result.error.code === 'SUBSCRIPTION_NOT_FOUND') {
      return notFound(c, 'Subscription', subscriptionId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  return success(c, {
    id: result.data.id,
    tenantId: result.data.tenantId,
    planId: result.data.planId,
    status: result.data.status,
    currentPeriodStart: result.data.currentPeriodStart.toISOString(),
    currentPeriodEnd: result.data.currentPeriodEnd.toISOString(),
    canceledAt: result.data.canceledAt?.toISOString(),
    createdAt: result.data.createdAt.toISOString(),
    updatedAt: result.data.updatedAt.toISOString(),
  });
});

/**
 * POST /subscriptions/:id/cancel
 * Cancel a subscription
 */
protectedRoutes.post('/:id/cancel', requireAdmin, async (c) => {
  const subscriptionId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const subscriptionService = new SubscriptionService(c.env.DB, tenantId);

  const result = await subscriptionService.cancelSubscription(tenantId, subscriptionId);

  if (!result.success) {
    if (result.error.code === 'SUBSCRIPTION_NOT_FOUND') {
      return notFound(c, 'Subscription', subscriptionId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  return success(c, {
    id: result.data.id,
    status: result.data.status,
    canceledAt: result.data.canceledAt?.toISOString(),
    message: 'Subscription canceled successfully',
  });
});

// Mount protected routes
subscriptionsRoutes.route('/subscriptions', protectedRoutes);

export { subscriptionsRoutes };
