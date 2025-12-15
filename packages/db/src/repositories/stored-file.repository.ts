import type { StoredFile, Pagination, PaginatedResult } from '@saas/shared';
import { TenantScopedRepository } from './base.repository';

interface StoredFileRow {
  id: string;
  tenant_id: string;
  user_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  created_at: string;
}

/**
 * Input for creating a stored file record
 */
export interface CreateStoredFileInput {
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

/**
 * Stored File Repository
 * Handles CRUD operations for file metadata with tenant scoping
 * Requirements: 8.4
 */
export class StoredFileRepository extends TenantScopedRepository<StoredFile> {
  constructor(db: D1Database, tenantId: string) {
    super(db, 'stored_files', tenantId);
  }

  /**
   * Map database row to StoredFile entity
   */
  private mapRowToStoredFile(row: StoredFileRow): StoredFile {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      filename: row.filename,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      path: row.path,
      createdAt: new Date(row.created_at),
    };
  }


  /**
   * Find stored file by ID (tenant-scoped)
   * @param id - File ID
   * @returns StoredFile or null
   */
  async findById(id: string): Promise<StoredFile | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM stored_files WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).first<StoredFileRow>();
    return result ? this.mapRowToStoredFile(result) : null;
  }

  /**
   * Find all stored files for the tenant
   * Requirement 8.4: Return paginated list of files scoped to user's tenant
   * @param pagination - Pagination parameters
   * @returns Paginated list of stored files
   */
  async findAll(pagination: Pagination = { page: 1, limit: 20 }): Promise<PaginatedResult<StoredFile>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM stored_files WHERE tenant_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM stored_files 
       WHERE tenant_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, pagination.limit, offset).all<StoredFileRow>();

    return {
      items: result.results.map((row) => this.mapRowToStoredFile(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find stored files by user ID
   * Requirement 8.4: Return paginated list of files scoped to user's tenant
   * @param userId - User ID to filter by
   * @param pagination - Pagination parameters
   * @returns Paginated list of stored files
   */
  async findByUserId(
    userId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<StoredFile>> {
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM stored_files WHERE tenant_id = ? AND user_id = ?'
    );
    const countResult = await countStmt.bind(this.tenantId, userId).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM stored_files 
       WHERE tenant_id = ? AND user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, userId, pagination.limit, offset).all<StoredFileRow>();

    return {
      items: result.results.map((row) => this.mapRowToStoredFile(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find stored files by MIME type
   * @param mimeType - MIME type to filter by (supports prefix matching like 'image/')
   * @param pagination - Pagination parameters
   * @returns Paginated list of stored files
   */
  async findByMimeType(
    mimeType: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<StoredFile>> {
    const mimePattern = mimeType.endsWith('/') ? `${mimeType}%` : mimeType;
    
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM stored_files WHERE tenant_id = ? AND mime_type LIKE ?'
    );
    const countResult = await countStmt.bind(this.tenantId, mimePattern).first<{ count: number }>();
    const total = countResult?.count ?? 0;

    const offset = this.getOffset(pagination);
    const stmt = this.db.prepare(
      `SELECT * FROM stored_files 
       WHERE tenant_id = ? AND mime_type LIKE ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`
    );
    const result = await stmt.bind(this.tenantId, mimePattern, pagination.limit, offset).all<StoredFileRow>();

    return {
      items: result.results.map((row) => this.mapRowToStoredFile(row)),
      pagination: this.buildPaginationMeta(total, pagination),
    };
  }


  /**
   * Create a new stored file record
   * @param data - File creation data
   * @returns Created stored file
   */
  async create(data: CreateStoredFileInput): Promise<StoredFile> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO stored_files 
       (id, tenant_id, user_id, filename, original_name, mime_type, size, path, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    await stmt.bind(
      id,
      this.tenantId,
      data.userId,
      data.filename,
      data.originalName,
      data.mimeType,
      data.size,
      data.path,
      now
    ).run();

    return {
      id,
      tenantId: this.tenantId,
      userId: data.userId,
      filename: data.filename,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
      path: data.path,
      createdAt: new Date(now),
    };
  }

  /**
   * Update a stored file record (limited fields)
   * Note: Most file metadata is immutable after creation
   * @param id - File ID
   * @param data - Update data (only originalName can be updated)
   * @returns Updated stored file or null
   */
  async update(id: string, data: { originalName?: string }): Promise<StoredFile | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    if (data.originalName !== undefined) {
      const stmt = this.db.prepare(
        'UPDATE stored_files SET original_name = ? WHERE id = ? AND tenant_id = ?'
      );
      await stmt.bind(data.originalName, id, this.tenantId).run();
    }

    return this.findById(id);
  }


  /**
   * Delete a stored file record
   * Requirement 8.3: Remove the file from R2 and update database records
   * Note: This only deletes the database record. R2 deletion should be handled by StorageService
   * @param id - File ID
   * @returns true if deleted
   */
  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare(
      'DELETE FROM stored_files WHERE id = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(id, this.tenantId).run();
    return result.meta.changes > 0;
  }

  /**
   * Find stored file by path
   * @param path - File path in R2
   * @returns StoredFile or null
   */
  async findByPath(path: string): Promise<StoredFile | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM stored_files WHERE path = ? AND tenant_id = ?'
    );
    const result = await stmt.bind(path, this.tenantId).first<StoredFileRow>();
    return result ? this.mapRowToStoredFile(result) : null;
  }

  /**
   * Get total storage used by tenant
   * @returns Total size in bytes
   */
  async getTotalStorageUsed(): Promise<number> {
    const stmt = this.db.prepare(
      'SELECT COALESCE(SUM(size), 0) as total FROM stored_files WHERE tenant_id = ?'
    );
    const result = await stmt.bind(this.tenantId).first<{ total: number }>();
    return result?.total ?? 0;
  }

  /**
   * Get total storage used by user
   * @param userId - User ID
   * @returns Total size in bytes
   */
  async getUserStorageUsed(userId: string): Promise<number> {
    const stmt = this.db.prepare(
      'SELECT COALESCE(SUM(size), 0) as total FROM stored_files WHERE tenant_id = ? AND user_id = ?'
    );
    const result = await stmt.bind(this.tenantId, userId).first<{ total: number }>();
    return result?.total ?? 0;
  }
}
