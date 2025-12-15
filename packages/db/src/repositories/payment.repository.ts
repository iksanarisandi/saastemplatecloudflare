import type { Payment, PaymentStatus, PaymentMethod, Pagination, PaginatedResult } from '@saas/shared';
import { TenantScopedRepository } from './base.repository';

interface PaymentRow {
  id: string;
  tenant_id: string;
  user_id: string;
  plan_id: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string;
  proof_file_id: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  rejection_reason: string | null;
  metadata: string;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a payment
 */
export interface CreatePaymentInput {
  userId: string;
  planId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a payment
 */
export interface UpdatePaymentInput {
  status?: PaymentStatus;
  proofFileId?: string;
  confirmedBy?: string;
  confirmedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment Repository
 * Handles CRUD operations for payments with tenant scoping
 * Requirements: 5.1, 5.3
 */
export class PaymentRepository extends TenantScopedRepository<Payment> {
  constructor(db: D1Database, tenantId: string) {
    super(db, 'payments', tenantId);
  }


  /**
   * Map database row to Payment entity
   */
  private mapRowToPayment(row: PaymentRow): Payment {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      planId: row.plan_id ?? undefined,
      amount: row.amount,
      currency: row.currency,
      status: row.status as PaymentStatus,
      method: row.method as PaymentMethod,
      proofFileId: row.proof_file_id ?? undefined,
      confirmedBy: row.confirmed_by ?? undefined,
      confirmedAt: row.confirmed_at ? new Date(row.confirmed_at) : undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      metadata: JSON.parse(row.metadata || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Find payment by ID (tenant-scoped)
   * @param id - Payment ID
   * @returns Payment or null
   */
  async findById(id: string): Promise<Payment | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM payments WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).first<PaymentRow>();
    return result ? this.mapRowToPayment(result) : null;
  }

  /**
   * Find all payments for the tenant
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Payment>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE tenant_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM payments 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, pagination.limit, offset).all<PaymentRow>();

    return {
      items: result.results.map((row) => this.mapRowToPayment(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find payments by status
   * Requirement 5.3: Display list of payments awaiting confirmation
   * @param status - Payment status to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async findByStatus(
    status: PaymentStatus,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Payment>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE tenant_id = ? AND status = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, status).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM payments 
       WHERE tenant_id = ? AND status = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, status, pagination.limit, offset).all<PaymentRow>();

    return {
      items: result.results.map((row) => this.mapRowToPayment(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find pending payments (convenience method)
   * Requirement 5.3: Display list of payments awaiting confirmation
   * @param pagination - Pagination parameters
   * @returns Paginated list of pending payments
   */
  async findPending(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Payment>> {
    return this.findByStatus('pending', pagination);
  }

  /**
   * Find payments by user ID
   * @param userId - User ID to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async findByUserId(
    userId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Payment>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE tenant_id = ? AND user_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, userId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM payments 
       WHERE tenant_id = ? AND user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, userId, pagination.limit, offset).all<PaymentRow>();

    return {
      items: result.results.map((row) => this.mapRowToPayment(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }


  /**
   * Find payments by plan ID
   * @param planId - Plan ID to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments
   */
  async findByPlanId(
    planId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<Payment>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE tenant_id = ? AND plan_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, planId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM payments 
       WHERE tenant_id = ? AND plan_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, planId, pagination.limit, offset).all<PaymentRow>();

    return {
      items: result.results.map((row) => this.mapRowToPayment(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Create a new payment
   * Requirement 5.1: Generate a payment record with pending status
   * @param data - Payment creation data
   * @returns Created payment
   */
  async create(data: CreatePaymentInput): Promise<Payment> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const metadata = JSON.stringify(data.metadata ?? {});

    const stmt = this.db.prepare(
      `INSERT INTO payments 
       (id, tenant_id, user_id, plan_id, amount, currency, status, method, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(
      id,
      this.tenantId,
      data.userId,
      data.planId ?? null,
      data.amount,
      data.currency,
      'pending', // Always start with pending status
      data.method,
      metadata,
      now,
      now
    ).run();

    return {
      id,
      tenantId: this.tenantId,
      userId: data.userId,
      planId: data.planId,
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      method: data.method,
      metadata: data.metadata ?? {},
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  /**
   * Update a payment
   * @param id - Payment ID
   * @param data - Update data
   * @returns Updated payment or null
   */
  async update(id: string, data: UpdatePaymentInput): Promise<Payment | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.proofFileId !== undefined) {
      updates.push('proof_file_id = ?');
      values.push(data.proofFileId);
    }
    if (data.confirmedBy !== undefined) {
      updates.push('confirmed_by = ?');
      values.push(data.confirmedBy);
    }
    if (data.confirmedAt !== undefined) {
      updates.push('confirmed_at = ?');
      values.push(data.confirmedAt.toISOString());
    }
    if (data.rejectionReason !== undefined) {
      updates.push('rejection_reason = ?');
      values.push(data.rejectionReason);
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    values.push(id, this.tenantId);
    const stmt = this.db.prepare(
      `UPDATE payments SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    );
    await stmt.bind(...values).run();

    return this.findById(id);
  }

  /**
   * Delete a payment
   * @param id - Payment ID
   * @returns true if deleted
   */
  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare(
      'DELETE FROM payments WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).run();
    return result.meta.changes > 0;
  }

  /**
   * Confirm a payment
   * Requirement 5.4: Update payment status to confirmed
   * @param id - Payment ID
   * @param adminId - Admin user ID who confirmed
   * @returns Updated payment or null
   */
  async confirm(id: string, adminId: string): Promise<Payment | null> {
    return this.update(id, {
      status: 'confirmed',
      confirmedBy: adminId,
      confirmedAt: new Date(),
    });
  }

  /**
   * Reject a payment
   * Requirement 5.5: Update payment status to rejected with reason
   * @param id - Payment ID
   * @param adminId - Admin user ID who rejected
   * @param reason - Rejection reason
   * @returns Updated payment or null
   */
  async reject(id: string, adminId: string, reason: string): Promise<Payment | null> {
    return this.update(id, {
      status: 'rejected',
      confirmedBy: adminId,
      confirmedAt: new Date(),
      rejectionReason: reason,
    });
  }

  /**
   * Upload payment proof
   * Requirement 5.2: Store the image in R2 and link it to the payment record
   * @param id - Payment ID
   * @param fileId - Stored file ID
   * @returns Updated payment or null
   */
  async uploadProof(id: string, fileId: string): Promise<Payment | null> {
    return this.update(id, {
      proofFileId: fileId,
    });
  }

  /**
   * Mark payment as expired
   * @param id - Payment ID
   * @returns Updated payment or null
   */
  async markExpired(id: string): Promise<Payment | null> {
    return this.update(id, {
      status: 'expired',
    });
  }

  /**
   * Find payments with proof images (for admin review)
   * @param pagination - Pagination parameters
   * @returns Paginated list of payments with proof
   */
  async findWithProof(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Payment>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM payments WHERE tenant_id = ? AND proof_file_id IS NOT NULL AND status = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, 'pending').first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM payments 
       WHERE tenant_id = ? AND proof_file_id IS NOT NULL AND status = ?
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, 'pending', pagination.limit, offset).all<PaymentRow>();

    return {
      items: result.results.map((row) => this.mapRowToPayment(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }
}
