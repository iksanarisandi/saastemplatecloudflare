/**
 * Auth Store
 * 
 * Manages authentication state including:
 * - Current user
 * - Session token
 * - Login/logout operations
 * 
 * Requirements: 2.6
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { 
  api, 
  setAuthToken, 
  clearAuthToken, 
  hasAuthToken,
  ApiClientError,
} from '$lib/api';
import type { PublicUser, AuthResponse } from '$lib/api';
import type { LoginInput, RegisterInput, ResetPasswordInput, ChangePasswordInput } from '@saas/shared';

/**
 * Auth state interface
 */
export interface AuthState {
  user: PublicUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

/**
 * Initial auth state
 */
const initialState: AuthState = {
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,
};

/**
 * Create the auth store
 */
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  /**
   * Set loading state
   */
  function setLoading(isLoading: boolean) {
    update(state => ({ ...state, isLoading, error: null }));
  }

  /**
   * Set error state
   */
  function setError(error: string) {
    update(state => ({ ...state, error, isLoading: false }));
  }

  /**
   * Set user and mark as initialized
   */
  function setUser(user: PublicUser | null) {
    update(state => ({
      ...state,
      user,
      isLoading: false,
      isInitialized: true,
      error: null,
    }));
  }

  /**
   * Initialize auth state from stored token
   */
  async function initialize(): Promise<void> {
    if (!browser) {
      update(state => ({ ...state, isInitialized: true }));
      return;
    }

    // Check if we have a stored token
    if (!hasAuthToken()) {
      update(state => ({ ...state, isInitialized: true }));
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.me();
      if (response.success && response.data) {
        setUser(response.data);
      } else {
        // Token is invalid, clear it
        clearAuthToken();
        setUser(null);
      }
    } catch (error) {
      // Token is invalid or expired
      clearAuthToken();
      setUser(null);
    }
  }

  /**
   * Login with credentials
   */
  async function login(credentials: LoginInput): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.auth.login(credentials);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        setAuthToken(token);
        setUser(user);
        return true;
      }
      
      setError('Login failed');
      return false;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  }

  /**
   * Register a new user
   */
  async function register(data: RegisterInput): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.auth.register(data);
      
      if (response.success && response.data) {
        const { user, token } = response.data;
        setAuthToken(token);
        setUser(user);
        return true;
      }
      
      setError('Registration failed');
      return false;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  }

  /**
   * Logout current user
   */
  async function logout(): Promise<void> {
    try {
      await api.auth.logout();
    } catch {
      // Ignore errors during logout
    } finally {
      clearAuthToken();
      setUser(null);
    }
  }

  /**
   * Request password reset
   */
  async function requestPasswordReset(data: ResetPasswordInput): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.auth.requestPasswordReset(data);
      update(state => ({ ...state, isLoading: false }));
      return response.success;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  }

  /**
   * Confirm password reset
   */
  async function confirmPasswordReset(data: ChangePasswordInput): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.auth.confirmPasswordReset(data);
      update(state => ({ ...state, isLoading: false }));
      return response.success;
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
      return false;
    }
  }

  /**
   * Clear any error
   */
  function clearError() {
    update(state => ({ ...state, error: null }));
  }

  /**
   * Reset store to initial state
   */
  function reset() {
    clearAuthToken();
    set(initialState);
  }

  return {
    subscribe,
    initialize,
    login,
    register,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    clearError,
    reset,
  };
}

/**
 * Auth store instance
 */
export const auth = createAuthStore();

/**
 * Derived store for checking if user is authenticated
 */
export const isAuthenticated = derived(
  auth,
  $auth => $auth.user !== null
);

/**
 * Derived store for current user
 */
export const currentUser = derived(
  auth,
  $auth => $auth.user
);

/**
 * Derived store for checking if user is admin
 */
export const isAdmin = derived(
  auth,
  $auth => $auth.user?.role === 'admin' || $auth.user?.role === 'super_admin'
);

/**
 * Derived store for checking if user is super admin
 */
export const isSuperAdmin = derived(
  auth,
  $auth => $auth.user?.role === 'super_admin'
);

/**
 * Derived store for auth loading state
 */
export const isAuthLoading = derived(
  auth,
  $auth => $auth.isLoading
);

/**
 * Derived store for auth error
 */
export const authError = derived(
  auth,
  $auth => $auth.error
);

/**
 * Helper to get current auth state synchronously
 */
export function getAuthState(): AuthState {
  return get(auth);
}
