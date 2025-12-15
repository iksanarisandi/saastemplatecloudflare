import type { Pagination, PaginatedResult, PaginationMeta } from '@saas/shared';

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TenantScopedEntity extends BaseEntity {
  tenantId: string;
}

export interface IBaseRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(pagination?: Pagination): Promise<PaginatedResult<T>>;
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends BaseEntity> implements IBaseRepository<T> {
  protected db: D1Database;
  protected tableName: string;

  constructor(db: D1Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  protected generateId(): string {
    return crypto.randomUUID();
  }

  protected buildPaginationMeta(total: number, pagination: Pagination): PaginationMeta {
    return {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  protected getOffset(pagination: Pagination): number {
    return (pagination.page - 1) * pagination.limit;
  }

  abstract findById(id: string): Promise<T | null>;
  abstract findAll(pagination?: Pagination): Promise<PaginatedResult<T>>;
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
}

export abstract class TenantScopedRepository<T extends TenantScopedEntity> extends BaseRepository<T> {
  protected tenantId: string;

  constructor(db: D1Database, tableName: string, tenantId: string) {
    super(db, tableName);
    this.tenantId = tenantId;
  }

  protected ensureTenantScope(data: Partial<T>): Partial<T> & { tenantId: string } {
    return { ...data, tenantId: this.tenantId };
  }
}
