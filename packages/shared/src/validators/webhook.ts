import { z } from 'zod';

/**
 * Webhook Validators
 * Requirements: 12.5 - Validate webhook payload against expected schema
 */

/**
 * Supported webhook types
 */
export const webhookTypeSchema = z.enum([
  'payment.created',
  'payment.confirmed',
  'payment.rejected',
  'payment.expired',
  'subscription.created',
  'subscription.canceled',
  'subscription.expired',
]);

/**
 * Base webhook event schema
 */
export const webhookEventSchema = z.object({
  id: z.string().uuid(),
  type: webhookTypeSchema,
  timestamp: z.string().datetime(),
  data: z.record(z.unknown()),
});

/**
 * Payment webhook payload schema
 */
export const paymentWebhookPayloadSchema = z.object({
  paymentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  status: z.enum(['pending', 'confirmed', 'rejected', 'expired']),
  method: z.enum(['qris', 'bank_transfer', 'gateway']),
  planId: z.string().uuid().optional(),
  confirmedBy: z.string().uuid().optional(),
  confirmedAt: z.string().datetime().optional(),
  rejectionReason: z.string().optional(),
});

/**
 * Subscription webhook payload schema
 */
export const subscriptionWebhookPayloadSchema = z.object({
  subscriptionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  planId: z.string().uuid(),
  status: z.enum(['active', 'canceled', 'expired', 'past_due']),
  currentPeriodStart: z.string().datetime(),
  currentPeriodEnd: z.string().datetime(),
});

/**
 * Payment webhook event schema
 */
export const paymentWebhookEventSchema = webhookEventSchema.extend({
  type: z.enum(['payment.created', 'payment.confirmed', 'payment.rejected', 'payment.expired']),
  data: paymentWebhookPayloadSchema,
});

/**
 * Subscription webhook event schema
 */
export const subscriptionWebhookEventSchema = webhookEventSchema.extend({
  type: z.enum(['subscription.created', 'subscription.canceled', 'subscription.expired']),
  data: subscriptionWebhookPayloadSchema,
});

/**
 * Infer types from schemas
 */
export type WebhookEventInput = z.infer<typeof webhookEventSchema>;
export type PaymentWebhookPayloadInput = z.infer<typeof paymentWebhookPayloadSchema>;
export type SubscriptionWebhookPayloadInput = z.infer<typeof subscriptionWebhookPayloadSchema>;
export type PaymentWebhookEventInput = z.infer<typeof paymentWebhookEventSchema>;
export type SubscriptionWebhookEventInput = z.infer<typeof subscriptionWebhookEventSchema>;
