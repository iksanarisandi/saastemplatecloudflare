import type { 
  SubscriptionPlan, 
  CreatePlanInput,
  Pagination,
  PaginatedResult,
  Result,
  Subscription,
  BillingInterval,
} from '@saas/shared';
import { SubscriptionPlanRepository, SubscriptionRepository } from '@saas/db/repositories';

/**
 * Subscription service error types
 */
export type SubscriptionErrorCode = 
  | 'PLAN_NOT_FOUND'
  | 'PLAN_NAME_EXISTS'
  | 'PLAN_INACTIVE'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'SUBSCRIPTION_EXPIRED'
  | 'FEATURE_NOT_AVAILABLE'
  | 'INVALID_PLAN_DATA'
  | 'INTERNAL_ERROR';

export interface SubscriptionError {
  code: SubscriptionErrorCode;
  message: string;
}

/**
 * Input for updating a subscription plan
 */
export interface UpdatePlanInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  interval?: SubscriptionPlan['interval'];
  features?: SubscriptionPlan['features'];
  limits?: SubscriptionPlan['limits'];
  isActive?: boolean;
}

/**
 * Subscription Service
 * Handles subscription plan management and feature access checking
 * Requirements: 6.1, 6.4, 6.5
 */
export class SubscriptionService {
  private db: D1Database;
  private _tenantId?: string;

  constructor(db: D1Database, tenantId?: string) {
    this.db = db;
    this._tenantId = tenantId;
  }

  /**
   * Get the tenant ID for this service instance
   */
  get tenantId(): string | undefined {
    return this._tenantId;
  }

  /**
   * Get all subscription plans (including inactive)
   * For admin use
   * @param pagination - Pagination parameters
   * @returns Paginated list of all plans
   */
  async getAllPlans(pagination: Pagination = { page: 1, limit: 20 }): Promise<Result<PaginatedResult<SubscriptionPlan>, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const result = await planRepo.findAll(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get all plans error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get plans' },
      };
    }
  }

  /**
   * Get all active subscription plans
   * Requirement 6.1: Display all active subscription plans with features and pricing
   * @param pagination - Pagination parameters
   * @returns Paginated list of active plans
   */
  async getActivePlans(pagination: Pagination = { page: 1, limit: 20 }): Promise<Result<PaginatedResult<SubscriptionPlan>, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const result = await planRepo.findActive(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get active plans error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get active plans' },
      };
    }
  }

  /**
   * Get a subscription plan by ID
   * @param planId - Plan ID
   * @returns Plan or error
   */
  async getPlanById(planId: string): Promise<Result<SubscriptionPlan, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const plan = await planRepo.findById(planId);
      
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      return { success: true, data: plan };
    } catch (error) {
      console.error('Get plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get plan' },
      };
    }
  }

  /**
   * Create a new subscription plan
   * Requirement 6.5: Validate plan data and store it in D1
   * @param data - Plan creation data
   * @returns Created plan or error
   */
  async createPlan(data: CreatePlanInput): Promise<Result<SubscriptionPlan, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      
      // Check if plan name already exists
      const existingPlan = await planRepo.findByName(data.name);
      if (existingPlan) {
        return {
          success: false,
          error: { code: 'PLAN_NAME_EXISTS', message: 'A plan with this name already exists' },
        };
      }

      // Validate plan data
      if (data.price < 0) {
        return {
          success: false,
          error: { code: 'INVALID_PLAN_DATA', message: 'Price must be non-negative' },
        };
      }

      // Create plan (active by default)
      const plan = await planRepo.create({
        ...data,
        isActive: true,
      });

      return { success: true, data: plan };
    } catch (error) {
      console.error('Create plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create plan' },
      };
    }
  }

  /**
   * Update a subscription plan
   * @param planId - Plan ID to update
   * @param data - Update data
   * @returns Updated plan or error
   */
  async updatePlan(planId: string, data: UpdatePlanInput): Promise<Result<SubscriptionPlan, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      
      // Check if plan exists
      const existingPlan = await planRepo.findById(planId);
      if (!existingPlan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      // Check name uniqueness if changing name
      if (data.name && data.name !== existingPlan.name) {
        const nameExists = await planRepo.findByName(data.name);
        if (nameExists) {
          return {
            success: false,
            error: { code: 'PLAN_NAME_EXISTS', message: 'A plan with this name already exists' },
          };
        }
      }

      // Validate price if provided
      if (data.price !== undefined && data.price < 0) {
        return {
          success: false,
          error: { code: 'INVALID_PLAN_DATA', message: 'Price must be non-negative' },
        };
      }

      // Update plan
      const updatedPlan = await planRepo.update(planId, data);
      if (!updatedPlan) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update plan' },
        };
      }

      return { success: true, data: updatedPlan };
    } catch (error) {
      console.error('Update plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update plan' },
      };
    }
  }

  /**
   * Activate a subscription plan
   * @param planId - Plan ID to activate
   * @returns Updated plan or error
   */
  async activatePlan(planId: string): Promise<Result<SubscriptionPlan, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      
      const plan = await planRepo.activate(planId);
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      return { success: true, data: plan };
    } catch (error) {
      console.error('Activate plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to activate plan' },
      };
    }
  }

  /**
   * Deactivate a subscription plan
   * @param planId - Plan ID to deactivate
   * @returns Updated plan or error
   */
  async deactivatePlan(planId: string): Promise<Result<SubscriptionPlan, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      
      const plan = await planRepo.deactivate(planId);
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      return { success: true, data: plan };
    } catch (error) {
      console.error('Deactivate plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate plan' },
      };
    }
  }

  /**
   * Delete a subscription plan
   * @param planId - Plan ID to delete
   * @returns Success or error
   */
  async deletePlan(planId: string): Promise<Result<void, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      
      // Check if plan exists
      const existingPlan = await planRepo.findById(planId);
      if (!existingPlan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      // Delete plan
      const deleted = await planRepo.delete(planId);
      if (!deleted) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete plan' },
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Delete plan error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete plan' },
      };
    }
  }

  // ============================================
  // Subscription Lifecycle Methods
  // Requirements: 6.2, 6.3
  // ============================================

  /**
   * Calculate subscription period end date based on billing interval
   * @param startDate - Period start date
   * @param interval - Billing interval
   * @returns Period end date
   */
  private calculatePeriodEnd(startDate: Date, interval: BillingInterval): Date {
    const endDate = new Date(startDate);
    switch (interval) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      case 'lifetime':
        // Set to 100 years in the future for lifetime subscriptions
        endDate.setFullYear(endDate.getFullYear() + 100);
        break;
    }
    return endDate;
  }

  /**
   * Subscribe a tenant to a plan
   * Requirement 6.2: Create a subscription record linked to confirmed payment
   * @param tenantId - Tenant ID
   * @param planId - Plan ID to subscribe to
   * @param paymentId - Confirmed payment ID (optional, for tracking)
   * @returns Created subscription or error
   */
  async subscribe(
    tenantId: string,
    planId: string,
    _paymentId?: string // Reserved for future payment tracking integration
  ): Promise<Result<Subscription, SubscriptionError>> {
    try {
      const planRepo = new SubscriptionPlanRepository(this.db);
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);

      // Verify plan exists and is active
      const plan = await planRepo.findById(planId);
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      if (!plan.isActive) {
        return {
          success: false,
          error: { code: 'PLAN_INACTIVE', message: 'Subscription plan is not active' },
        };
      }

      // Check if tenant already has an active subscription
      const existingSubscription = await subscriptionRepo.findActive();
      if (existingSubscription) {
        // Cancel the existing subscription before creating a new one
        await subscriptionRepo.cancel(existingSubscription.id);
      }

      // Calculate subscription period
      const periodStart = new Date();
      const periodEnd = this.calculatePeriodEnd(periodStart, plan.interval);

      // Create the subscription
      const subscription = await subscriptionRepo.create({
        planId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status: 'active',
      });

      return { success: true, data: subscription };
    } catch (error) {
      console.error('Subscribe error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create subscription' },
      };
    }
  }

  /**
   * Cancel a subscription
   * @param tenantId - Tenant ID
   * @param subscriptionId - Subscription ID to cancel
   * @returns Canceled subscription or error
   */
  async cancelSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);

      const subscription = await subscriptionRepo.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found' },
        };
      }

      const canceledSubscription = await subscriptionRepo.cancel(subscriptionId);
      if (!canceledSubscription) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' },
        };
      }

      return { success: true, data: canceledSubscription };
    } catch (error) {
      console.error('Cancel subscription error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel subscription' },
      };
    }
  }

  /**
   * Get subscription by ID
   * @param tenantId - Tenant ID
   * @param subscriptionId - Subscription ID
   * @returns Subscription or error
   */
  async getSubscriptionById(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);

      const subscription = await subscriptionRepo.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found' },
        };
      }

      return { success: true, data: subscription };
    } catch (error) {
      console.error('Get subscription error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscription' },
      };
    }
  }

  /**
   * Get tenant's active subscription
   * @param tenantId - Tenant ID
   * @returns Active subscription or null (wrapped in Result)
   */
  async getActiveSubscription(
    tenantId: string
  ): Promise<Result<Subscription | null, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);
      const subscription = await subscriptionRepo.findActive();
      return { success: true, data: subscription };
    } catch (error) {
      console.error('Get active subscription error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get active subscription' },
      };
    }
  }

  /**
   * Get all subscriptions for a tenant
   * @param tenantId - Tenant ID
   * @param pagination - Pagination parameters
   * @returns Paginated list of subscriptions
   */
  async getTenantSubscriptions(
    tenantId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<Subscription>, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);
      const result = await subscriptionRepo.findAll(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Get tenant subscriptions error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get subscriptions' },
      };
    }
  }

  /**
   * Handle subscription expiration
   * Requirement 6.3: Update subscription status and restrict access to premium features
   * @param tenantId - Tenant ID
   * @returns Number of subscriptions marked as expired
   */
  async handleExpiredSubscriptions(tenantId: string): Promise<Result<number, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);
      
      // Find all expired but still active subscriptions
      const expiredSubscriptions = await subscriptionRepo.findExpiredActive();
      
      let expiredCount = 0;
      for (const subscription of expiredSubscriptions) {
        const result = await subscriptionRepo.markExpired(subscription.id);
        if (result) {
          expiredCount++;
        }
      }

      return { success: true, data: expiredCount };
    } catch (error) {
      console.error('Handle expired subscriptions error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to handle expired subscriptions' },
      };
    }
  }

  /**
   * Renew a subscription
   * @param tenantId - Tenant ID
   * @param subscriptionId - Subscription ID to renew
   * @returns Renewed subscription or error
   */
  async renewSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription, SubscriptionError>> {
    try {
      const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);
      const planRepo = new SubscriptionPlanRepository(this.db);

      // Get the subscription
      const subscription = await subscriptionRepo.findById(subscriptionId);
      if (!subscription) {
        return {
          success: false,
          error: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found' },
        };
      }

      // Get the plan to determine the new period
      const plan = await planRepo.findById(subscription.planId);
      if (!plan) {
        return {
          success: false,
          error: { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' },
        };
      }

      if (!plan.isActive) {
        return {
          success: false,
          error: { code: 'PLAN_INACTIVE', message: 'Subscription plan is no longer active' },
        };
      }

      // Calculate new period end
      const newPeriodEnd = this.calculatePeriodEnd(new Date(), plan.interval);

      // Renew the subscription
      const renewedSubscription = await subscriptionRepo.renew(subscriptionId, newPeriodEnd);
      if (!renewedSubscription) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to renew subscription' },
        };
      }

      return { success: true, data: renewedSubscription };
    } catch (error) {
      console.error('Renew subscription error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to renew subscription' },
      };
    }
  }

  /**
   * Check if a subscription is expired
   * @param subscription - Subscription to check
   * @returns true if expired
   */
  isSubscriptionExpired(subscription: Subscription): boolean {
    return new Date() > subscription.currentPeriodEnd;
  }

  /**
   * Check if a tenant has access to a specific feature
   * Requirement 6.4: Verify user's active subscription and plan features
   * @param tenantId - Tenant ID to check
   * @param featureKey - Feature key to check access for
   * @returns true if tenant has access to the feature
   */
  async checkFeatureAccess(tenantId: string, featureKey: string): Promise<Result<boolean, SubscriptionError>> {
    try {
      // Get tenant's active subscription
      const subscription = await this.getTenantActiveSubscription(tenantId);
      
      if (!subscription) {
        return { success: true, data: false };
      }

      // Check if subscription is expired
      if (new Date(subscription.currentPeriodEnd) < new Date()) {
        return { success: true, data: false };
      }

      // Get the plan
      const planRepo = new SubscriptionPlanRepository(this.db);
      const plan = await planRepo.findById(subscription.planId);
      
      if (!plan || !plan.isActive) {
        return { success: true, data: false };
      }

      // Check if feature is in plan
      const hasFeature = plan.features.some((f: { key: string }) => f.key === featureKey);
      return { success: true, data: hasFeature };
    } catch (error) {
      console.error('Check feature access error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to check feature access' },
      };
    }
  }

  /**
   * Check if a tenant has access to a specific limit
   * @param tenantId - Tenant ID to check
   * @param limitKey - Limit key to check
   * @returns The limit value or 0 if no access
   */
  async getFeatureLimit(tenantId: string, limitKey: string): Promise<Result<number, SubscriptionError>> {
    try {
      // Get tenant's active subscription
      const subscription = await this.getTenantActiveSubscription(tenantId);
      
      if (!subscription) {
        return { success: true, data: 0 };
      }

      // Check if subscription is expired
      if (new Date(subscription.currentPeriodEnd) < new Date()) {
        return { success: true, data: 0 };
      }

      // Get the plan
      const planRepo = new SubscriptionPlanRepository(this.db);
      const plan = await planRepo.findById(subscription.planId);
      
      if (!plan || !plan.isActive) {
        return { success: true, data: 0 };
      }

      // Get limit value
      const limitValue = plan.limits[limitKey] ?? 0;
      return { success: true, data: limitValue };
    } catch (error) {
      console.error('Get feature limit error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get feature limit' },
      };
    }
  }

  /**
   * Get tenant's active subscription (private helper)
   * @param tenantId - Tenant ID
   * @returns Active subscription or null
   */
  private async getTenantActiveSubscription(tenantId: string): Promise<Subscription | null> {
    const subscriptionRepo = new SubscriptionRepository(this.db, tenantId);
    return subscriptionRepo.findActive();
  }
}
