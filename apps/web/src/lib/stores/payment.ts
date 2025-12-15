/**
 * Payment Store
 * 
 * Manages payment list state for admin payment management:
 * - Payment list with pagination
 * - Status filtering
 * - Confirm/reject operations
 * 
 * Requirements: 5.3, 5.4, 5.5
 */

import { writable, derived, get } from 'svelte/store';
import { api, ApiClientError, getPagination } from '$lib/api';
import type { Payment, PaymentSearchParams } from '$lib/api';
import type { PaginationMeta } from '@saas/shared';

/**
 * Payment list state interface
 */
export interface PaymentListState {
  payments: Payment[];
  pagination: PaginationMeta | null;
  isLoading: boolean;
  error: string | null;
  searchParams: PaymentSearchParams;
}

/**
 * Initial payment list state
 */
const initialListState: PaymentListState = {
  payments: [],
  pagination: null,
  isLoading: false,
  error: null,
  searchParams: {
    page: 1,
    limit: 10,
  },
};

/**
 * Create the payment list store
 */
function createPaymentListStore() {
  const { subscribe, set, update } = writable<PaymentListState>(initialListState);

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
   * Fetch payments with current search params
   */
  async function fetch(params?: Partial<PaymentSearchParams>): Promise<void> {
    const currentState = get({ subscribe });
    const searchParams = { ...currentState.searchParams, ...params };
    
    update(state => ({ ...state, searchParams, isLoading: true, error: null }));

    try {
      const response = await api.payments.list(searchParams);
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          payments: response.data!,
          pagination: getPagination(response),
          isLoading: false,
        }));
      } else {
        setError('Failed to fetch payments');
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setError(error.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  }

  /**
   * Filter by status
   */
  async function filterByStatus(status: string | undefined): Promise<void> {
    await fetch({ status, page: 1 });
  }

  /**
   * Go to page
   */
  async function goToPage(page: number): Promise<void> {
    await fetch({ page });
  }

  /**
   * Confirm a payment
   */
  async function confirm(id: string): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.payments.confirm(id);
      
      if (response.success && response.data) {
        // Update the payment in the list
        update(state => ({
          ...state,
          payments: state.payments.map(p => p.id === id ? response.data! : p),
          isLoading: false,
        }));
        return true;
      }
      
      setError('Failed to confirm payment');
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
   * Reject a payment
   */
  async function reject(id: string, reason: string): Promise<boolean> {
    setLoading(true);

    try {
      const response = await api.payments.reject(id, reason);
      
      if (response.success && response.data) {
        // Update the payment in the list
        update(state => ({
          ...state,
          payments: state.payments.map(p => p.id === id ? response.data! : p),
          isLoading: false,
        }));
        return true;
      }
      
      setError('Failed to reject payment');
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
   * Clear error
   */
  function clearError() {
    update(state => ({ ...state, error: null }));
  }

  /**
   * Reset store
   */
  function reset() {
    set(initialListState);
  }

  return {
    subscribe,
    fetch,
    filterByStatus,
    goToPage,
    confirm,
    reject,
    clearError,
    reset,
  };
}

/**
 * Payment list store instance
 */
export const paymentList = createPaymentListStore();

/**
 * Derived store for payment list loading state
 */
export const isPaymentListLoading = derived(
  paymentList,
  $paymentList => $paymentList.isLoading
);

/**
 * Derived store for payment list error
 */
export const paymentListError = derived(
  paymentList,
  $paymentList => $paymentList.error
);

/**
 * Derived store for payments array
 */
export const payments = derived(
  paymentList,
  $paymentList => $paymentList.payments
);

/**
 * Derived store for pagination
 */
export const paymentPagination = derived(
  paymentList,
  $paymentList => $paymentList.pagination
);
