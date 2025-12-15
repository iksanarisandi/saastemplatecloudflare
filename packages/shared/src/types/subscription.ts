export type BillingInterval = 'monthly' | 'yearly' | 'lifetime';
export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due';

export interface PlanFeature {
  key: string;
  name: string;
  description?: string;
}

export interface PlanLimits {
  [key: string]: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: BillingInterval;
  features: PlanFeature[];
  limits: PlanLimits;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlanInput {
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: BillingInterval;
  features: PlanFeature[];
  limits: PlanLimits;
}
