/**
 * Webhook Types
 * Requirements: 12.1, 12.2, 12.5
 */

/**
 * Supported webhook types
 */
export type WebhookType = 
  | 'payment.created'
  | 'payment.confirmed'
  | 'payment.rejected'
  | 'payment.expired'
  | 'subscription.created'
  | 'subscription.canceled'
  | 'subscription.expired';

/**
 * Webhook event payload structure
 */
export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookType;
  timestamp: string;
  data: T;
}

/**
 * Webhook configuration for a registered handler
 */
export interface WebhookConfig {
  type: WebhookType;
  secret?: string;
  enabled: boolean;
}

/**
 * Webhook handler function signature
 */
export type WebhookHandler<T = unknown> = (
  event: WebhookEvent<T>
) => Promise<WebhookHandlerResult>;

/**
 * Result of webhook handler execution
 */
export interface WebhookHandlerResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Payment webhook payload types
 */
export interface PaymentWebhookPayload {
  paymentId: string;
  tenantId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  planId?: string;
  confirmedBy?: string;
  confirmedAt?: string;
  rejectionReason?: string;
}

/**
 * Subscription webhook payload types
 */
export interface SubscriptionWebhookPayload {
  subscriptionId: string;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

/**
 * Webhook signature verification result
 */
export interface SignatureVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Incoming webhook request structure
 */
export interface WebhookRequest {
  headers: Record<string, string>;
  body: string;
  signature?: string;
}
