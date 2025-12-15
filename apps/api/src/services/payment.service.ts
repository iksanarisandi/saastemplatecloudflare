import type {
  Payment,
  PaymentInput,
  PaymentStatus,
  Pagination,
  PaginatedResult,
  Result,
} from '@saas/shared';
import { PaymentRepository, SubscriptionRepository, SubscriptionPlanRepository } from '@saas/db/repositories';

/**
 * Payment service error types
 */
export type PaymentErrorCode =
  | 'PAYMENT_NOT_FOUND'
  | 'PAYMENT_ALREADY_PROCESSED'
  | 'PAYMENT_EXPIRED'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_INACTIVE'
  | 'INVALID_PAYMENT_DATA'
  | 'INVALID_STATUS_TRANSITION'
  | 'PROOF_REQUIRED'
  | 'INTERNAL_ERROR';

export interface PaymentError {
  code: PaymentErrorCode;
  message: string;
}

/**
 * Payment Service
 * Handles payment creation, confirmation, and rejection flows
 * Requirements: 5.1, 5.4, 5.5
 */
export class PaymentService {
  private db: D1Database;
  private tenantId: string;

  constructor(db: D1Database, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  /**
   * Create a new payment
   * Requirement 5.1: Generate a payment record with pending status and display QRIS code
   * @param userId - User ID creating the payment
   * @param data - Payment input data
   * @returns Created payment or error
   */
  async create(userId: string, data: PaymentInput): Promise<Result<Payment, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const planRepo = new SubscriptionPlanRepository(this.db);

      // Verify plan exists and is active
      const plan = await planRepo.findById(data.subscriptionPlanId);
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      if (!plan.isActive) {
        return {
          success: false,
          error: { code: 'PLAN_INACTIVE', message: 'Subscription plan is not active' },
        };
      }


      // Validate amount matches plan price
      if (data.amount !== plan.price) {
        return {
          success: false,
          error: { 
            code: 'INVALID_PAYMENT_DATA', 
            message: `Payment amount must match plan price: ${plan.price} ${plan.currency}` 
          },
        };
      }

      // Create payment with pending status
      const payment = await paymentRepo.create({
        userId,
        planId: data.subscriptionPlanId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        metadata: {
          planName: plan.name,
          planInterval: plan.interval,
        },
      });

      return { success: true, data: payment };
    } catch (error) {
      console.error('Create payment error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment' },
      };
    }
  }

  /**
   * Get payment by ID
   * @param paymentId - Payment ID
   * @returns Payment or error
   */
  async getById(paymentId: string): Promise<Result<Payment, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const payment = await paymentRepo.findById(paymentId);

      if (!payment) {
        return {
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
        };
      }

      return { success: true, data: payment };
    } catch (error) {
      console.error('Get payment error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payment' },
      };
    }
  }

  /**
   * Get payments by user
   * @param userId - User ID
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async getByUser(
    userId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<Payment>, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const result = await paymentRepo.findByUserId(userId, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get user payments error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payments' },
      };
    }
  }

  /**
   * Get all payments for the tenant
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async getAll(
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<Payment>, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const result = await paymentRepo.findAll(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get all payments error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payments' },
      };
    }
  }

  /**
   * Get pending payments
   * Requirement 5.3: Display list of payments awaiting confirmation
   * @param pagination - Pagination parameters
   * @returns Paginated list of pending payments
   */
  async getPending(
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<Payment>, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const result = await paymentRepo.findPending(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get pending payments error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get pending payments' },
      };
    }
  }

  /**
   * Get payments by status
   * @param status - Payment status to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async getByStatus(
    status: PaymentStatus,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<Payment>, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      const result = await paymentRepo.findByStatus(status, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get payments by status error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get payments' },
      };
    }
  }


  /**
   * Upload payment proof
   * Requirement 5.2: Store the image in R2 and link it to the payment record
   * @param paymentId - Payment ID
   * @param fileId - Stored file ID from R2
   * @returns Updated payment or error
   */
  async uploadProof(
    paymentId: string,
    fileId: string
  ): Promise<Result<Payment, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      
      // Verify payment exists
      const payment = await paymentRepo.findById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
        };
      }

      // Only allow proof upload for pending payments
      if (payment.status !== 'pending') {
        return {
          success: false,
          error: { 
            code: 'PAYMENT_ALREADY_PROCESSED', 
            message: 'Cannot upload proof for a processed payment' 
          },
        };
      }

      const updatedPayment = await paymentRepo.uploadProof(paymentId, fileId);
      if (!updatedPayment) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to upload proof' },
        };
      }

      return { success: true, data: updatedPayment };
    } catch (error) {
      console.error('Upload proof error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to upload proof' },
      };
    }
  }


  /**
   * Confirm a payment
   * Requirement 5.4: Update payment status to confirmed and activate user subscription
   * @param paymentId - Payment ID
   * @param adminId - Admin user ID who confirmed
   * @returns Updated payment or error
   */
  async confirm(
    paymentId: string,
    adminId: string
  ): Promise<Result<Payment, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      
      // Verify payment exists
      const payment = await paymentRepo.findById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
        };
      }

      // Only allow confirmation of pending payments
      if (payment.status !== 'pending') {
        return {
          success: false,
          error: { 
            code: 'PAYMENT_ALREADY_PROCESSED', 
            message: `Payment has already been ${payment.status}` 
          },
        };
      }

      // Confirm the payment
      const confirmedPayment = await paymentRepo.confirm(paymentId, adminId);
      if (!confirmedPayment) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm payment' },
        };
      }

      // Activate subscription if payment has a plan
      if (confirmedPayment.planId) {
        await this.activateSubscription(confirmedPayment);
      }

      return { success: true, data: confirmedPayment };
    } catch (error) {
      console.error('Confirm payment error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm payment' },
      };
    }
  }


  /**
   * Reject a payment
   * Requirement 5.5: Update payment status to rejected and notify the user with reason
   * @param paymentId - Payment ID
   * @param adminId - Admin user ID who rejected
   * @param reason - Rejection reason
   * @returns Updated payment or error
   */
  async reject(
    paymentId: string,
    adminId: string,
    reason: string
  ): Promise<Result<Payment, PaymentError>> {
    try {
      const paymentRepo = new PaymentRepository(this.db, this.tenantId);
      
      // Verify payment exists
      const payment = await paymentRepo.findById(paymentId);
      if (!payment) {
        return {
          success: false,
          error: { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found' },
        };
      }

      // Only allow rejection of pending payments
      if (payment.status !== 'pending') {
        return {
          success: false,
          error: { 
            code: 'PAYMENT_ALREADY_PROCESSED', 
            message: `Payment has already been ${payment.status}` 
          },
        };
      }

      // Reject the payment
      const rejectedPayment = await paymentRepo.reject(paymentId, adminId, reason);
      if (!rejectedPayment) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to reject payment' },
        };
      }

      // TODO: Trigger notification to user about rejection
      // This will be implemented in the notification system task

      return { success: true, data: rejectedPayment };
    } catch (error) {
      console.error('Reject payment error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to reject payment' },
      };
    }
  }


  /**
   * Activate subscription after payment confirmation
   * @param payment - Confirmed payment
   */
  private async activateSubscription(payment: Payment): Promise<void> {
    if (!payment.planId) return;

    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const subscriptionRepo = new SubscriptionRepository(this.db, this.tenantId);

      // Get the plan to determine subscription period
      const plan = await planRepo.findById(payment.planId);
      if (!plan) return;

      // Calculate subscription period
      const periodStart = new Date();
      const periodEnd = this.calculatePeriodEnd(periodStart, plan.interval);

      // Cancel any existing active subscription
      const existingSubscription = await subscriptionRepo.findActive();
      if (existingSubscription) {
        await subscriptionRepo.cancel(existingSubscription.id);
      }

      // Create new subscription
      await subscriptionRepo.create({
        planId: payment.planId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: 'active',
      });
    } catch (error) {
      console.error('Activate subscription error:', error);
      // Don't throw - payment is already confirmed
    }
  }

  /**
   * Calculate subscription period end date based on billing interval
   */
  private calculatePeriodEnd(startDate: Date, interval: string): Date {
    const endDate = new Date(startDate);
    switch (interval) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        endDate.setFullYear(endDate.getFullYear() + 100);
        break;
    }
    return endDate;
  }
}
