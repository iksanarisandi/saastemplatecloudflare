import { z } from 'zod';

export const paymentStatusSchema = z.enum(['pending', 'confirmed', 'rejected', 'expired']);
export const paymentMethodSchema = z.enum(['qris', 'bank_transfer', 'gateway']);

export const paymentInputSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  method: paymentMethodSchema,
  subscriptionPlanId: z.string().min(1, 'Subscription plan is required'),
});

export const confirmPaymentInputSchema = z.object({
  paymentId: z.string().min(1),
  adminId: z.string().min(1),
});

export const rejectPaymentInputSchema = z.object({
  paymentId: z.string().min(1),
  adminId: z.string().min(1),
  reason: z.string().min(1, 'Rejection reason is required'),
});

export const paymentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  planId: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
  status: paymentStatusSchema,
  method: paymentMethodSchema,
  proofFileId: z.string().optional(),
  confirmedBy: z.string().optional(),
  confirmedAt: z.coerce.date().optional(),
  rejectionReason: z.string().optional(),
  metadata: z.record(z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PaymentInputSchema = z.infer<typeof paymentInputSchema>;
export type PaymentSchema = z.infer<typeof paymentSchema>;
