import type { Tenant, TenantSettings, Pagination, PaginatedResult } from '@saas/shared';
import { BaseRepository } from './base.repository';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: string;
  created_at: string;
  updated_at: string;
}

export class TenantRepository extends BaseRepository<Tenant> {
  constructor(db: D1Database) {
    super(db, 'tenants');
  }

  private mapRowToTenant(row: TenantRow): Tenant {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status as Tenant['status'],
      settings: JSON.parse(row.settings) as TenantSettings,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  async findById(id: string): Promise<Tenant | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM tenants WHERE id = ?'
    );
    const result = await stmt.bind(id).first<TenantRow>();
    return result ? this.mapRowToTenant(result) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM tenants WHERE slug = ?'
    );
    const result = await stmt.bind(slug).first<TenantRow>();
    return result ? this.mapRowToTenant(result) : null;
  }

  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<Tenant>> {
    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM tenants');
    const countResult = await countStmt.first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      'SELECT * FROM tenants ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    const result = await stmt.bind(pagination.limit, offset).all<TenantRow>();

    return {
      items: result.results.map(this.mapRowToTenant),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const settings = JSON.stringify(data.settings);

    const stmt = this.db.prepare(
      `INSERT INTO tenants (id, name, slug, status, settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(id, data.name, data.slug, data.status, settings, now, now).run();

    return {
      id,
      ...data,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: unknown[] = [now];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.settings !== undefined) {
      updates.push('settings = ?');
      values.push(JSON.stringify(data.settings));
    }

    values.push(id);
    const stmt = this.db.prepare(
      `UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`
    );
    await stmt.bind(...values).run();

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare('DELETE FROM tenants WHERE id = ?');
    const result = await stmt.bind(id).run();
    return result.meta.changes > 0;
  }
}
