import { z } from 'zod';

export const tenantStatusSchema = z.enum(['active', 'inactive', 'suspended']);

export const tenantLimitsSchema = z.object({
  maxUsers: z.number().int().positive(),
  maxStorage: z.number().int().positive(),
});

export const tenantBrandingSchema = z.object({
  logo: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  name: z.string().optional(),
});

export const tenantSettingsSchema = z.object({
  features: z.array(z.string()),
  limits: tenantLimitsSchema,
  branding: tenantBrandingSchema.optional(),
});

export const createTenantInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  settings: tenantSettingsSchema.partial().optional(),
});

export const updateTenantInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: tenantStatusSchema.optional(),
  settings: tenantSettingsSchema.partial().optional(),
});

export type CreateTenantInputSchema = z.infer<typeof createTenantInputSchema>;
export type UpdateTenantInputSchema = z.infer<typeof updateTenantInputSchema>;
