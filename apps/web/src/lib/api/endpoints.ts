/**
 * Typed API Endpoints
 * 
 * Provides type-safe methods for all API endpoints
 * 
 * Requirements: 9.1, 9.2
 */

import type { ApiClient, QueryParams } from './client';
import type {
  User,
  Session,
  Tenant,
  Payment,
  Subscription,
  SubscriptionPlan,
  StoredFile,
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
  PaymentInput,
  UpdateTenantInput,
  CreatePlanInput,
  ApiResponse,
} from '@saas/shared';

/**
 * User without sensitive fields (for API responses)
 */
export interface PublicUser {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth response with session token
 */
export interface AuthResponse {
  user: PublicUser;
  token: string;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  email: string;
  password: string;
  role?: string;
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  email?: string;
  role?: string;
  status?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * User search params
 */
export interface UserSearchParams extends PaginationParams {
  search?: string;
  role?: string;
  status?: string;
}

/**
 * Payment search params
 */
export interface PaymentSearchParams extends PaginationParams {
  status?: string;
}

/**
 * Create API endpoints with typed methods
 */
export function createApiEndpoints(client: ApiClient) {
  return {
    /**
     * Authentication endpoints
     */
    auth: {
      /**
       * Register a new user
       */
      register(data: RegisterInput) {
        return client.post<AuthResponse, RegisterInput>('/auth/register', data);
      },

      /**
       * Login with credentials
       */
      login(data: LoginInput) {
        return client.post<AuthResponse, LoginInput>('/auth/login', data);
      },

      /**
       * Logout current session
       */
      logout() {
        return client.post<void>('/auth/logout');
      },

      /**
       * Get current user
       */
      me() {
        return client.get<PublicUser>('/auth/me');
      },

      /**
       * Request password reset
       */
      requestPasswordReset(data: ResetPasswordInput) {
        return client.post<void, ResetPasswordInput>('/auth/password-reset', data);
      },

      /**
       * Confirm password reset
       */
      confirmPasswordReset(data: ChangePasswordInput) {
        return client.post<void, ChangePasswordInput>('/auth/password-reset/confirm', data);
      },
    },

    /**
     * User management endpoints
     */
    users: {
      /**
       * List users with pagination and search
       */
      list(params?: UserSearchParams) {
        return client.get<PublicUser[]>('/users', { params: params as QueryParams });
      },

      /**
       * Get user by ID
       */
      get(id: string) {
        return client.get<PublicUser>(`/users/${id}`);
      },

      /**
       * Create a new user
       */
      create(data: CreateUserInput) {
        return client.post<PublicUser, CreateUserInput>('/users', data);
      },

      /**
       * Update user
       */
      update(id: string, data: UpdateUserInput) {
        return client.patch<PublicUser, UpdateUserInput>(`/users/${id}`, data);
      },

      /**
       * Delete (deactivate) user
       */
      delete(id: string) {
        return client.delete<void>(`/users/${id}`);
      },
    },

    /**
     * Tenant endpoints
     */
    tenants: {
      /**
       * Get tenant by ID
       */
      get(id: string) {
        return client.get<Tenant>(`/tenants/${id}`);
      },

      /**
       * Update tenant
       */
      update(id: string, data: UpdateTenantInput) {
        return client.patch<Tenant, UpdateTenantInput>(`/tenants/${id}`, data);
      },

      /**
       * Get tenant settings
       */
      getSettings(id: string) {
        return client.get<Tenant['settings']>(`/tenants/${id}/settings`);
      },

      /**
       * Update tenant settings
       */
      updateSettings(id: string, data: Partial<Tenant['settings']>) {
        return client.patch<Tenant['settings'], Partial<Tenant['settings']>>(
          `/tenants/${id}/settings`,
          data
        );
      },
    },

    /**
     * Subscription plan endpoints
     */
    plans: {
      /**
       * List all active plans
       */
      list() {
        return client.get<SubscriptionPlan[]>('/plans');
      },

      /**
       * Get plan by ID
       */
      get(id: string) {
        return client.get<SubscriptionPlan>(`/plans/${id}`);
      },

      /**
       * Create a new plan (admin only)
       */
      create(data: CreatePlanInput) {
        return client.post<SubscriptionPlan, CreatePlanInput>('/plans', data);
      },
    },

    /**
     * Subscription endpoints
     */
    subscriptions: {
      /**
       * List subscriptions
       */
      list(params?: PaginationParams) {
        return client.get<Subscription[]>('/subscriptions', { params: params as QueryParams });
      },

      /**
       * Get subscription by ID
       */
      get(id: string) {
        return client.get<Subscription>(`/subscriptions/${id}`);
      },

      /**
       * Create subscription (after payment)
       */
      create(data: { planId: string; paymentId: string }) {
        return client.post<Subscription>('/subscriptions', data);
      },

      /**
       * Get current tenant subscription
       */
      current() {
        return client.get<Subscription | null>('/subscriptions/current');
      },
    },

    /**
     * Payment endpoints
     */
    payments: {
      /**
       * List payments
       */
      list(params?: PaymentSearchParams) {
        return client.get<Payment[]>('/payments', { params: params as QueryParams });
      },

      /**
       * Get payment by ID
       */
      get(id: string) {
        return client.get<Payment>(`/payments/${id}`);
      },

      /**
       * Create a new payment
       */
      create(data: PaymentInput) {
        return client.post<Payment, PaymentInput>('/payments', data);
      },

      /**
       * Upload payment proof
       */
      uploadProof(id: string, file: File) {
        return client.upload<Payment>(`/payments/${id}/proof`, file);
      },

      /**
       * Confirm payment (admin only)
       */
      confirm(id: string) {
        return client.post<Payment>(`/payments/${id}/confirm`);
      },

      /**
       * Reject payment (admin only)
       */
      reject(id: string, reason: string) {
        return client.post<Payment>(`/payments/${id}/reject`, { reason });
      },
    },

    /**
     * File storage endpoints
     */
    files: {
      /**
       * List files
       */
      list(params?: PaginationParams) {
        return client.get<StoredFile[]>('/files', { params: params as QueryParams });
      },

      /**
       * Get file by ID
       */
      get(id: string) {
        return client.get<StoredFile>(`/files/${id}`);
      },

      /**
       * Upload a file
       */
      upload(file: File, folder?: string) {
        return client.upload<StoredFile>(
          '/files',
          file,
          folder ? { folder } : undefined
        );
      },

      /**
       * Delete a file
       */
      delete(id: string) {
        return client.delete<void>(`/files/${id}`);
      },

      /**
       * Get signed URL for file download
       */
      getUrl(id: string) {
        return client.get<{ url: string }>(`/files/${id}/url`);
      },
    },
  };
}

/**
 * Type for the API endpoints
 */
export type ApiEndpoints = ReturnType<typeof createApiEndpoints>;
