/**
 * Subscription Store
 * 
 * Manages subscription plans and current subscription state:
 * - Available plans listing
 * - Current subscription status
 * - Subscribe flow
 * 
 * Requirements: 6.1, 6.2
 */

import { writable, derived, get } from 'svelte/store';
import { api, ApiClientError } from '$lib/api';
import type { SubscriptionPlan, Subscription } from '@saas/shared';

/**
 * Plans state interface
 */
export interface PlansState {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Current subscription state interface
 */
export interface CurrentSubscriptionState {
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Initial plans state
 */
const initialPlansState: PlansState = {
  plans: [],
  isLoading: false,
  error: null,
};

/**
 * Initial current subscription state
 */
const initialCurrentState: CurrentSubscriptionState = {
  subscription: null,
  plan: null,
  isLoading: false,
  error: null,
};

/**
 * Create the plans store
 */
function createPlansStore() {
  const { subscribe, set, update } = writable<PlansState>(initialPlansState);

  /**
   * Fetch all active plans
   */
  async function fetch(): Promise<void> {
    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await api.plans.list();
      
      if (response.success && response.data) {
        update(state => ({
          ...state,
          plans: response.data!,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          error: 'Failed to fetch plans',
          isLoading: false,
        }));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        update(state => ({
          ...state,
          error: error.message,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          error: 'An unexpected error occurred',
          isLoading: false,
        }));
      }
    }
  }

  /**
   * Get plan by ID
   */
  function getPlanById(id: string): SubscriptionPlan | undefined {
    const state = get({ subscribe });
    return state.plans.find(p => p.id === id);
  }

  /**
   * Reset store
   */
  function reset() {
    set(initialPlansState);
  }

  return {
    subscribe,
    fetch,
    getPlanById,
    reset,
  };
}

/**
 * Create the current subscription store
 */
function createCurrentSubscriptionStore() {
  const { subscribe, set, update } = writable<CurrentSubscriptionState>(initialCurrentState);

  /**
   * Fetch current subscription
   */
  async function fetch(): Promise<void> {
    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await api.subscriptions.current();
      
      if (response.success) {
        const subscription = response.data ?? null;
        let plan: SubscriptionPlan | null = null;
        
        if (subscription?.planId) {
          const planResponse = await api.plans.get(subscription.planId);
          if (planResponse.success && planResponse.data) {
            plan = planResponse.data;
          }
        }
        
        update(state => ({
          ...state,
          subscription,
          plan,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          subscription: null,
          plan: null,
          isLoading: false,
        }));
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        update(state => ({
          ...state,
          error: error.message,
          isLoading: false,
        }));
      } else {
        update(state => ({
          ...state,
          error: 'An unexpected error occurred',
          isLoading: false,
        }));
      }
    }
  }

  /**
   * Reset store
   */
  function reset() {
    set(initialCurrentState);
  }

  return {
    subscribe,
    fetch,
    reset,
  };
}

/**
 * Plans store instance
 */
export const plansStore = createPlansStore();

/**
 * Current subscription store instance
 */
export const currentSubscription = createCurrentSubscriptionStore();

/**
 * Derived store for plans array
 */
export const plans = derived(
  plansStore,
  $plansStore => $plansStore.plans
);

/**
 * Derived store for plans loading state
 */
export const isPlansLoading = derived(
  plansStore,
  $plansStore => $plansStore.isLoading
);

/**
 * Derived store for plans error
 */
export const plansError = derived(
  plansStore,
  $plansStore => $plansStore.error
);

/**
 * Derived store for checking if user has active subscription
 */
export const hasActiveSubscription = derived(
  currentSubscription,
  $currentSubscription => 
    $currentSubscription.subscription?.status === 'active'
);

/**
 * Derived store for current plan name
 */
export const currentPlanName = derived(
  currentSubscription,
  $currentSubscription => $currentSubscription.plan?.name ?? null
);
