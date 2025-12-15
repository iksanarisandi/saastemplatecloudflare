/**
 * API Module
 * 
 * Main entry point for the frontend API client.
 * Exports configured API client and endpoints.
 * 
 * Requirements: 9.1, 9.2
 */

import { browser } from '$app/environment';
import { createApiClient, ApiClientError, NetworkError, unwrap, getPagination } from './client';
import { createApiEndpoints } from './endpoints';

// Re-export types and utilities
export { ApiClientError, NetworkError, unwrap, getPagination } from './client';
export type { ApiClient, ApiClientConfig, RequestOptions, QueryParams } from './client';
export type { 
  ApiEndpoints, 
  PublicUser, 
  AuthResponse,
  CreateUserInput,
  UpdateUserInput,
  PaginationParams,
  UserSearchParams,
  PaymentSearchParams,
} from './endpoints';

// Re-export shared types used by stores
export type { Payment, Subscription, SubscriptionPlan } from '@saas/shared';

/**
 * Token storage key
 */
const TOKEN_KEY = 'auth_token';

/**
 * Get stored auth token
 */
function getStoredToken(): string | null {
  if (!browser) return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Store auth token
 */
export function setAuthToken(token: string): void {
  if (!browser) return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * Clear auth token
 */
export function clearAuthToken(): void {
  if (!browser) return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if user has auth token
 */
export function hasAuthToken(): boolean {
  return !!getStoredToken();
}

/**
 * API base URL - configurable via window global or defaults to localhost
 * In production, set window.__API_URL__ before loading the app
 * or configure via SvelteKit's environment variables
 */
const DEFAULT_API_URL = 'http://localhost:8787';

/**
 * Get API base URL from environment or default
 */
function getApiBaseUrl(): string {
  if (browser) {
    // Check for runtime config set via script tag or build config
    const runtimeUrl = (window as unknown as { __API_URL__?: string }).__API_URL__;
    if (runtimeUrl) return runtimeUrl;
  }
  
  return DEFAULT_API_URL;
}

/**
 * Unauthorized handler - called when 401 response received
 */
function handleUnauthorized(): void {
  clearAuthToken();
  
  // Redirect to login if in browser
  if (browser && typeof window !== 'undefined') {
    // Only redirect if not already on login page
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
}

/**
 * Create configured API client
 */
const client = createApiClient({
  baseUrl: getApiBaseUrl(),
  getToken: getStoredToken,
  onUnauthorized: handleUnauthorized,
});

/**
 * API endpoints with typed methods
 */
export const api = createApiEndpoints(client);

/**
 * Raw API client for custom requests
 */
export const apiClient = client;

/**
 * Default export
 */
export default api;
