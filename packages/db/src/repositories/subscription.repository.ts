import type { Subscription, SubscriptionStatus, Pagination, PaginatedResult } from '@saas/shared';
import { TenantScopedRepository } from './base.repository';

interface SubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a subscription
 */
export interface CreateSubscriptionInput {
  planId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  status?: SubscriptionStatus;
}

/**
 * Input for updating a subscription
 */
export interface UpdateSubscriptionInput {
  status?: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  canceledAt?: Date;
}

/**
 * Subscription Repository
 * Handles CRUD operations for subscriptions with tenant scoping
 * Requirements: 6.2, 6.3
 */
export class SubscriptionRepository extends TenantScopedRepository<Subscription> {
  constructor(db: D1Database, tenantId: string) {
    super(db, 'subscriptions', tenantId);
  }

  /**
   * Map database row to Subscription entity
   */
  private mapRowToSubscription(row: SubscriptionRow): Subscription {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      planId: row.plan_id,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: new Date(row.current_period_start),
      currentPeriodEnd: new Date(row.current_period_end),
      canceledAt: row.canceled_at ? new Date(row.canceled_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Find subscription by ID (tenant-scoped)
   * @param id - Subscription ID
   * @returns Subscription or null
   */
  async findById(id: string): Promise<Subscription | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM subscriptions WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).first<SubscriptionRow>();
    return result ? this.mapRowToSubscription(result) : null;
  }

  /**
   * Find all subscriptions for the tenant
   * @param pagination - Pagination parameters
   * @returns Paginated list of subscriptions
   */
  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Subscription>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE tenant_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM subscriptions 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, pagination.limit, offset).all<SubscriptionRow>();

    return {
      items: result.results.map((row) => this.mapRowToSubscription(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find active subscription for the tenant
   * @returns Active subscription or null
   */
  async findActive(): Promise<Subscription | null> {
    const stmt = this.db.prepare(
      `SELECT * FROM subscriptions 
       WHERE tenant_id = ? AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`
    );
    const result = await stmt.bind(this.tenantId).first<SubscriptionRow>();
    return result ? this.mapRowToSubscription(result) : null;
  }

  /**
   * Find subscriptions by status
   * @param status - Subscription status to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of subscriptions
   */
  async findByStatus(
    status: SubscriptionStatus,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Subscription>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE tenant_id = ? AND status = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, status).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM subscriptions 
       WHERE tenant_id = ? AND status = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, status, pagination.limit, offset).all<SubscriptionRow>();

    return {
      items: result.results.map((row) => this.mapRowToSubscription(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find subscriptions by plan ID
   * @param planId - Plan ID to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of subscriptions
   */
  async findByPlanId(
    planId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Subscription>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM subscriptions WHERE tenant_id = ? AND plan_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, planId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM subscriptions 
       WHERE tenant_id = ? AND plan_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, planId, pagination.limit, offset).all<SubscriptionRow>();

    return {
      items: result.results.map((row) => this.mapRowToSubscription(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Create a new subscription
   * Requirement 6.2: Create a subscription record linked to confirmed payment
   * @param data - Subscription creation data
   * @returns Created subscription
   */
  async create(data: CreateSubscriptionInput): Promise<Subscription> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const status = data.status ?? 'active';

    const stmt = this.db.prepare(
      `INSERT INTO subscriptions 
       (id, tenant_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(
      id,
      this.tenantId,
      data.planId,
      status,
      data.currentPeriodStart.toISOString(),
      data.currentPeriodEnd.toISOString(),
      now,
      now
    ).run();

    return {
      id,
      tenantId: this.tenantId,
      planId: data.planId,
      status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * Update a subscription
   * @param id - Subscription ID
   * @param data - Update data
   * @returns Updated subscription or null
   */
  async update(id: string, data: UpdateSubscriptionInput): Promise<Subscription | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.currentPeriodStart !== undefined) {
      updates.push('current_period_start = ?');
      values.push(data.currentPeriodStart.toISOString());
    }
    if (data.currentPeriodEnd !== undefined) {
      updates.push('current_period_end = ?');
      values.push(data.currentPeriodEnd.toISOString());
    }
    if (data.canceledAt !== undefined) {
      updates.push('canceled_at = ?');
      values.push(data.canceledAt.toISOString());
    }

    values.push(id, this.tenantId);
    const stmt = this.db.prepare(
      `UPDATE subscriptions SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    );
    await stmt.bind(...values).run();

    return this.findById(id);
  }

  /**
   * Delete a subscription
   * @param id - Subscription ID
   * @returns true if deleted
   */
  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare(
      'DELETE FROM subscriptions WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).run();
    return result.meta.changes > 0;
  }

  /**
   * Cancel a subscription
   * @param id - Subscription ID
   * @returns Updated subscription or null
   */
  async cancel(id: string): Promise<Subscription | null> {
    return this.update(id, {
      status: 'canceled',
      canceledAt: new Date(),
    });
  }

  /**
   * Check if subscription is expired
   * Requirement 6.3: Update subscription status and restrict access to premium features
   * @param subscription - Subscription to check
   * @returns true if expired
   */
  isExpired(subscription: Subscription): boolean {
    return new Date() > subscription.currentPeriodEnd;
  }

  /**
   * Find expired subscriptions that are still marked as active
   * Used for batch expiration processing
   * @returns List of expired but active subscriptions
   */
  async findExpiredActive(): Promise<Subscription[]> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `SELECT * FROM subscriptions 
       WHERE tenant_id = ? AND status = 'active' AND current_period_end < ?`
    );
    const result = await stmt.bind(this.tenantId, now).all<SubscriptionRow>();
    return result.results.map((row) => this.mapRowToSubscription(row));
  }

  /**
   * Mark subscription as expired
   * Requirement 6.3: Update subscription status when expired
   * @param id - Subscription ID
   * @returns Updated subscription or null
   */
  async markExpired(id: string): Promise<Subscription | null> {
    return this.update(id, { status: 'expired' });
  }

  /**
   * Renew a subscription by extending the period
   * @param id - Subscription ID
   * @param newPeriodEnd - New period end date
   * @returns Updated subscription or null
   */
  async renew(id: string, newPeriodEnd: Date): Promise<Subscription | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    return this.update(id, {
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: newPeriodEnd,
    });
  }

  /**
   * Get subscription with plan details (for display purposes)
   * @param id - Subscription ID
   * @returns Subscription with plan info or null
   */
  async findByIdWithPlan(id: string): Promise<(Subscription & { planName?: string; planPrice?: number }) | null> {
    const stmt = this.db.prepare(
      `SELECT s.*, p.name as plan_name, p.price as plan_price
       FROM subscriptions s
       LEFT JOIN subscription_plans p ON s.plan_id = p.id
       WHERE s.id = ? AND s.tenant_id = ?`
    );
    const result = await stmt.bind(id, this.tenantId).first<SubscriptionRow & { plan_name: string; plan_price: number }>();
    
    if (!result) return null;

    return {
      ...this.mapRowToSubscription(result),
      planName: result.plan_name,
      planPrice: result.plan_price,
    };
  }
}
