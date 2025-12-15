import type { User, Pagination, PaginatedResult } from '@saas/shared';
import { TenantScopedRepository } from './base.repository';

interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class UserRepository extends TenantScopedRepository<User> {
  constructor(db: D1Database, tenantId: string) {
    super(db, 'users', tenantId);
  }

  private mapRowToUser(row: UserRow): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as User['role'],
      status: row.status as User['status'],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).first<UserRow>();
    return result ? this.mapRowToUser(result) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    );
    const result = await stmt.bind(email).first<UserRow>();
    return result ? this.mapRowToUser(result) : null;
  }

  async findByEmailInTenant(email: string): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE email = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(email, this.tenantId).first<UserRow>();
    return result ? this.mapRowToUser(result) : null;
  }

  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<User>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    const result = await stmt.bind(this.tenantId, pagination.limit, offset).all<UserRow>();

    return {
      items: result.results.map(this.mapRowToUser),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  async search(query: string, pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<User>> {
    const searchPattern = `%${query}%`;
    
    const countStmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE tenant_id = ? AND (email LIKE ? OR role LIKE ?)`
    );
    const countResult = await countStmt.bind(this.tenantId, searchPattern, searchPattern).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM users 
       WHERE tenant_id = ? AND (email LIKE ? OR role LIKE ?)
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, searchPattern, searchPattern, pagination.limit, offset).all<UserRow>();

    return {
      items: result.results.map(this.mapRowToUser),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO users (id, tenant_id, email, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(id, this.tenantId, data.email, data.passwordHash, data.role, data.status, now, now).run();

    return {
      id,
      tenantId: this.tenantId,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      status: data.status,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.passwordHash !== undefined) {
      updates.push('password_hash = ?');
      values.push(data.passwordHash);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    values.push(id, this.tenantId);
    const stmt = this.db.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
    );
    await stmt.bind(...values).run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ? AND tenant_id = ?');
    const result = await stmt.bind(id, this.tenantId).run();
    return result.meta.changes > 0;
  }
}
