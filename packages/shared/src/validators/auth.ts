import { z } from 'zod';

export const userRoleSchema = z.enum(['super_admin', 'admin', 'user']);
export const userStatusSchema = z.enum(['active', 'inactive', 'pending']);

export const registerInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
});

export const loginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const resetPasswordInputSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const changePasswordInputSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  expiresAt: z.coerce.date(),
  tenantId: z.string(),
});

// User management validators (Requirements 3.1, 3.2, 3.3, 3.4)
export const createUserInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: userRoleSchema,
  status: userStatusSchema.optional(),
});

export const updateUserInputSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

export const updateUserRoleInputSchema = z.object({
  role: userRoleSchema,
});

export const userSearchQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type RegisterInputSchema = z.infer<typeof registerInputSchema>;
export type LoginInputSchema = z.infer<typeof loginInputSchema>;
export type SessionSchema = z.infer<typeof sessionSchema>;
export type CreateUserInputSchema = z.infer<typeof createUserInputSchema>;
export type UpdateUserInputSchema = z.infer<typeof updateUserInputSchema>;
export type UpdateUserRoleInputSchema = z.infer<typeof updateUserRoleInputSchema>;
export type UserSearchQuerySchema = z.infer<typeof userSearchQuerySchema>;
