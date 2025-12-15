import { z } from 'zod';

export const billingIntervalSchema = z.enum(['monthly', 'yearly', 'lifetime']);
export const subscriptionStatusSchema = z.enum(['active', 'canceled', 'expired', 'past_due']);

export const planFeatureSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const planLimitsSchema = z.record(z.number());

export const createPlanInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500),
  price: z.number().int().nonnegative('Price must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  interval: billingIntervalSchema,
  features: z.array(planFeatureSchema),
  limits: planLimitsSchema,
});

export const subscriptionPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  currency: z.string(),
  interval: billingIntervalSchema,
  features: z.array(planFeatureSchema),
  limits: planLimitsSchema,
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CreatePlanInputSchema = z.infer<typeof createPlanInputSchema>;
export type SubscriptionPlanSchema = z.infer<typeof subscriptionPlanSchema>;
