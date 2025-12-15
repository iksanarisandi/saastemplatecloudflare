import type { SubscriptionPlan, PlanFeature, PlanLimits, Pagination, PaginatedResult } from '@saas/shared';
import { BaseRepository } from './base.repository';

interface SubscriptionPlanRow {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  features: string;
  limits: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class SubscriptionPlanRepository extends BaseRepository<SubscriptionPlan> {
  constructor(db: D1Database) {
    super(db, 'subscription_plans');
  }

  private mapRowToPlan(row: SubscriptionPlanRow): SubscriptionPlan {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      currency: row.currency,
      interval: row.interval as SubscriptionPlan['interval'],
      features: JSON.parse(row.features) as PlanFeature[],
      limits: JSON.parse(row.limits) as PlanLimits,
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<SubscriptionPlan | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM subscription_plans WHERE id = ?'
    );
    const result = await stmt.bind(id).first<SubscriptionPlanRow>();
    return result ? this.mapRowToPlan(result) : null;
  }

  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<SubscriptionPlan>> {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM subscription_plans');
    const countResult = await countStmt.first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      'SELECT * FROM subscription_plans ORDER BY price ASC LIMIT ? OFFSET ?'
    );
    const result = await stmt.bind(pagination.limit, offset).all<SubscriptionPlanRow>();

    return {
      items: result.results.map((row) => this.mapRowToPlan(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find all active subscription plans
   * @param pagination - Pagination parameters
   * @returns Paginated list of active plans
   */
  async findActive(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<SubscriptionPlan>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM subscription_plans WHERE is_active = 1'
    );
    const countResult = await countStmt.first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC LIMIT ? OFFSET ?'
    );
    const result = await stmt.bind(pagination.limit, offset).all<SubscriptionPlanRow>();

    return {
      items: result.results.map((row) => this.mapRowToPlan(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find plan by name
   * @param name - Plan name
   * @returns Plan or null
   */
  async findByName(name: string): Promise<SubscriptionPlan | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM subscription_plans WHERE name = ?'
    );
    const result = await stmt.bind(name).first<SubscriptionPlanRow>();
    return result ? this.mapRowToPlan(result) : null;
  }

  async create(data: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const features = JSON.stringify(data.features);
    const limits = JSON.stringify(data.limits);

    const stmt = this.db.prepare(
      `INSERT INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(
      id,
      data.name,
      data.description,
      data.price,
      data.currency,
      data.interval,
      features,
      limits,
      data.isActive ? 1 : 0,
      now,
      now
    ).run();

    return {
      id,
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.price !== undefined) {
      updates.push('price = ?');
      values.push(data.price);
    }
    if (data.currency !== undefined) {
      updates.push('currency = ?');
      values.push(data.currency);
    }
    if (data.interval !== undefined) {
      updates.push('interval = ?');
      values.push(data.interval);
    }
    if (data.features !== undefined) {
      updates.push('features = ?');
      values.push(JSON.stringify(data.features));
    }
    if (data.limits !== undefined) {
      updates.push('limits = ?');
      values.push(JSON.stringify(data.limits));
    }
    if (data.isActive !== undefined) {
      updates.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`
    );
    await stmt.bind(...values).run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM subscription_plans WHERE id = ?');
    const result = await stmt.bind(id).run();
    return result.meta.changes > 0;
  }

  /**
   * Activate a subscription plan
   * @param id - Plan ID
   * @returns Updated plan or null
   */
  async activate(id: string): Promise<SubscriptionPlan | null> {
    return this.update(id, { isActive: true });
  }

  /**
   * Deactivate a subscription plan
   * @param id - Plan ID
   * @returns Updated plan or null
   */
  async deactivate(id: string): Promise<SubscriptionPlan | null> {
    return this.update(id, { isActive: false });
  }
}
