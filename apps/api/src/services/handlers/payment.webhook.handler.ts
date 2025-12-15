import type {
  WebhookEvent,
  WebhookHandlerResult,
  PaymentWebhookPayload,
} from '@saas/shared';
import { PaymentRepository, SubscriptionRepository, SubscriptionPlanRepository } from '@saas/db/repositories';

/**
 * Payment Webhook Handler
 * Handles payment status updates from external payment gateways
 * Requirements: 12.2, 12.4
 */
export class PaymentWebhookHandler {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  /**
   * Handle payment.created webhook
   * Called when a payment is created in an external gateway
   */
  async handlePaymentCreated(
    event: WebhookEvent<PaymentWebhookPayload>
  ): Promise<WebhookHandlerResult> {
    const payload = event.data;
    
    console.log(`[Webhook] Payment created: ${payload.paymentId}`, {
      tenantId: payload.tenantId,
      amount: payload.amount,
      currency: payload.currency,
      method: payload.method,
    });

    // For future gateway integration:
    // - Sync payment record with external gateway
    // - Update local payment status if needed
    
    return {
      success: true,
      message: `Payment ${payload.paymentId} creation acknowledged`,
    };
  }

  /**
   * Handle payment.confirmed webhook
   * Called when a payment is confirmed by an external gateway
   * Requirement 12.4: Handle payment status updates
   */
  async handlePaymentConfirmed(
    event: WebhookEvent<PaymentWebhookPayload>
  ): Promise<WebhookHandlerResult> {
    const payload = event.data;
    
    console.log(`[Webhook] Payment confirmed: ${payload.paymentId}`, {
      tenantId: payload.tenantId,
      confirmedBy: payload.confirmedBy,
      confirmedAt: payload.confirmedAt,
    });

    try {
      const paymentRepo = new PaymentRepository(this.db, payload.tenantId);
      
      // Check if payment exists
      const payment = await paymentRepo.findById(payload.paymentId);
      if (!payment) {
        return {
          success: false,
          error: `Payment ${payload.paymentId} not found`,
        };
      }

      // Skip if already confirmed
      if (payment.status === 'confirmed') {
        return {
          success: true,
          message: `Payment ${payload.paymentId} already confirmed`,
        };
      }

      // Confirm the payment
      const confirmedPayment = await paymentRepo.confirm(
        payload.paymentId,
        payload.confirmedBy || 'webhook'
      );

      if (!confirmedPayment) {
        return {
          success: false,
          error: `Failed to confirm payment ${payload.paymentId}`,
        };
      }

      // Activate subscription if payment has a plan
      if (confirmedPayment.planId) {
        await this.activateSubscription(confirmedPayment.planId, payload.tenantId);
      }

      return {
        success: true,
        message: `Payment ${payload.paymentId} confirmed and subscription activated`,
      };
    } catch (error) {
      console.error(`[Webhook] Error confirming payment ${payload.paymentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle payment.rejected webhook
   * Called when a payment is rejected by an external gateway
   * Requirement 12.4: Handle payment status updates
   */
  async handlePaymentRejected(
    event: WebhookEvent<PaymentWebhookPayload>
  ): Promise<WebhookHandlerResult> {
    const payload = event.data;
    
    console.log(`[Webhook] Payment rejected: ${payload.paymentId}`, {
      tenantId: payload.tenantId,
      reason: payload.rejectionReason,
    });

    try {
      const paymentRepo = new PaymentRepository(this.db, payload.tenantId);
      
      // Check if payment exists
      const payment = await paymentRepo.findById(payload.paymentId);
      if (!payment) {
        return {
          success: false,
          error: `Payment ${payload.paymentId} not found`,
        };
      }

      // Skip if already rejected
      if (payment.status === 'rejected') {
        return {
          success: true,
          message: `Payment ${payload.paymentId} already rejected`,
        };
      }

      // Reject the payment
      const rejectedPayment = await paymentRepo.reject(
        payload.paymentId,
        payload.confirmedBy || 'webhook',
        payload.rejectionReason || 'Rejected via webhook'
      );

      if (!rejectedPayment) {
        return {
          success: false,
          error: `Failed to reject payment ${payload.paymentId}`,
        };
      }

      // TODO: Trigger notification to user about rejection

      return {
        success: true,
        message: `Payment ${payload.paymentId} rejected`,
      };
    } catch (error) {
      console.error(`[Webhook] Error rejecting payment ${payload.paymentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle payment.expired webhook
   * Called when a payment expires
   * Requirement 12.4: Handle payment status updates
   */
  async handlePaymentExpired(
    event: WebhookEvent<PaymentWebhookPayload>
  ): Promise<WebhookHandlerResult> {
    const payload = event.data;
    
    console.log(`[Webhook] Payment expired: ${payload.paymentId}`, {
      tenantId: payload.tenantId,
    });

    try {
      const paymentRepo = new PaymentRepository(this.db, payload.tenantId);
      
      // Check if payment exists
      const payment = await paymentRepo.findById(payload.paymentId);
      if (!payment) {
        return {
          success: false,
          error: `Payment ${payload.paymentId} not found`,
        };
      }

      // Skip if already expired or processed
      if (payment.status !== 'pending') {
        return {
          success: true,
          message: `Payment ${payload.paymentId} already processed (status: ${payment.status})`,
        };
      }

      // Mark as expired
      const expiredPayment = await paymentRepo.update(payload.paymentId, {
        status: 'expired',
      });

      if (!expiredPayment) {
        return {
          success: false,
          error: `Failed to expire payment ${payload.paymentId}`,
        };
      }

      return {
        success: true,
        message: `Payment ${payload.paymentId} marked as expired`,
      };
    } catch (error) {
      console.error(`[Webhook] Error expiring payment ${payload.paymentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Activate subscription after payment confirmation
   */
  private async activateSubscription(planId: string, tenantId: string): Promise<void> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);

      // Get the plan to determine subscription period
      const plan = await planRepo.findById(planId);
      if (!plan) {
        console.error(`[Webhook] Plan ${planId} not found for subscription activation`);
        return;
      }

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
        planId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: 'active',
      });

      console.log(`[Webhook] Subscription activated for tenant ${tenantId} with plan ${planId}`);
    } catch (error) {
      console.error(`[Webhook] Error activating subscription:`, error);
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

/**
 * Create webhook handlers for payment events
 * Returns a map of webhook type to handler function
 */
export function createPaymentWebhookHandlers(db: D1Database) {
  const handler = new PaymentWebhookHandler(db);

  return {
    'payment.created': (event: WebhookEvent<PaymentWebhookPayload>) =>
      handler.handlePaymentCreated(event),
    'payment.confirmed': (event: WebhookEvent<PaymentWebhookPayload>) =>
      handler.handlePaymentConfirmed(event),
    'payment.rejected': (event: WebhookEvent<PaymentWebhookPayload>) =>
      handler.handlePaymentRejected(event),
    'payment.expired': (event: WebhookEvent<PaymentWebhookPayload>) =>
      handler.handlePaymentExpired(event),
  };
}
