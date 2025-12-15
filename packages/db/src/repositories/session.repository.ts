import type { Session, Pagination, PaginatedResult } from '@saas/shared';
import { BaseRepository } from './base.repository';

interface SessionRow {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export class SessionRepository extends BaseRepository<Session> {
  constructor(db: D1Database) {
    super(db, 'sessions');
  }

  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      userId: row.user_id,
      expiresAt: new Date(row.expires_at),
      tenantId: '', // Will be populated from user lookup
      createdAt: new Date(row.created_at),
    };
  }

  async findById(id: string): Promise<Session | null> {
    const stmt = this.db.prepare(
      `SELECT s.*, u.tenant_id 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`
    );
    const result = await stmt.bind(id).first<SessionRow & { tenant_id: string }>();
    if (!result) return null;
    
    return {
      ...this.mapRowToSession(result),
      tenantId: result.tenant_id,
    };
  }

  async findValidById(id: string): Promise<Session | null> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(
      `SELECT s.*, u.tenant_id 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ? AND s.expires_at > ?`
    );
    const result = await stmt.bind(id, now).first<SessionRow & { tenant_id: string }>();
    if (!result) return null;
    
    return {
      ...this.mapRowToSession(result),
      tenantId: result.tenant_id,
    };
  }

  async findByUserId(userId: string): Promise<Session[]> {
    const stmt = this.db.prepare(
      `SELECT s.*, u.tenant_id 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.user_id = ?`
    );
    const result = await stmt.bind(userId).all<SessionRow & { tenant_id: string }>();
    return result.results.map(row => ({
      ...this.mapRowToSession(row),
      tenantId: row.tenant_id,
    }));
  }

  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Session>> {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions');
    const countResult = await countStmt.first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT s.*, u.tenant_id 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(pagination.limit, offset).all<SessionRow & { tenant_id: string }>();

    return {
      items: result.results.map(row => ({
        ...this.mapRowToSession(row),
        tenantId: row.tenant_id,
      })),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  async create(data: Omit<Session, 'id' | 'createdAt'>): Promise<Session> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO sessions (id, user_id, expires_at, created_at)
       VALUES (?, ?, ?, ?)`
    );
    await stmt.bind(id, data.userId, data.expiresAt.toISOString(), now).run();

    return {
      id,
      userId: data.userId,
      expiresAt: data.expiresAt,
      tenantId: data.tenantId,
      createdAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<Session>): Promise<Session | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (data.expiresAt !== undefined) {
      const stmt = this.db.prepare(
        'UPDATE sessions SET expires_at = ? WHERE id = ?'
      );
      await stmt.bind(data.expiresAt.toISOString(), id).run();
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = await stmt.bind(id).run();
    return result.meta.changes > 0;
  }

  async deleteByUserId(userId: string): Promise<number> {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE user_id = ?');
    const result = await stmt.bind(userId).run();
    return result.meta.changes;
  }

  async deleteExpired(): Promise<number> {
    const now = new Date().toISOString();
    const stmt = this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
    const result = await stmt.bind(now).run();
    return result.meta.changes;
  }
}
