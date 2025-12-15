import type {
  StoredFile,
  UploadInput,
  SignedUrlOptions,
  Pagination,
  PaginatedResult,
  Result,
} from '@saas/shared';
import { StoredFileRepository } from '@saas/db/repositories';

/**
 * Storage service error types
 */
export type StorageErrorCode =
  | 'FILE_NOT_FOUND'
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'UPLOAD_FAILED'
  | 'DELETE_FAILED'
  | 'STORAGE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export interface StorageError {
  code: StorageErrorCode;
  message: string;
}

/**
 * Allowed file types configuration
 */
export interface AllowedFileTypes {
  mimeTypes: string[];
  extensions: string[];
}

/**
 * Storage configuration
 */
export interface StorageConfig {
  maxFileSize: number; // in bytes
  allowedTypes?: AllowedFileTypes;
  defaultSignedUrlExpiry: number; // in seconds
  maxStoragePerTenant?: number; // in bytes
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  defaultSignedUrlExpiry: 3600, // 1 hour
  allowedTypes: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json',
    ],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.json'],
  },
};


/**
 * Storage Service
 * Handles file upload, retrieval, and deletion with R2 integration
 * Requirements: 8.1, 8.2, 8.3
 */
export class StorageService {
  private db: D1Database;
  private storage: R2Bucket;
  private tenantId: string;
  private config: StorageConfig;

  constructor(
    db: D1Database,
    storage: R2Bucket,
    tenantId: string,
    config: Partial<StorageConfig> = {}
  ) {
    this.db = db;
    this.storage = storage;
    this.tenantId = tenantId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate file type
   * Requirement 8.1: Validate file type before storing in R2
   * @param mimeType - File MIME type
   * @param filename - Original filename
   * @returns true if valid
   */
  private isValidFileType(mimeType: string, filename: string): boolean {
    if (!this.config.allowedTypes) return true;

    const { mimeTypes, extensions } = this.config.allowedTypes;
    
    // Check MIME type
    const mimeValid = mimeTypes.some(allowed => {
      if (allowed.endsWith('/*')) {
        return mimeType.startsWith(allowed.slice(0, -1));
      }
      return mimeType === allowed;
    });

    // Check extension
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const extValid = extensions.includes(ext);

    return mimeValid || extValid;
  }

  /**
   * Validate file size
   * Requirement 8.5: Reject upload if file exceeds size limit
   * @param size - File size in bytes
   * @returns true if valid
   */
  private isValidFileSize(size: number): boolean {
    return size <= this.config.maxFileSize;
  }


  /**
   * Generate a unique filename for storage
   * @param originalName - Original filename
   * @returns Unique filename with path
   */
  private generateStoragePath(originalName: string, folder?: string): string {
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().slice(0, 8);
    const ext = originalName.substring(originalName.lastIndexOf('.'));
    const safeName = originalName
      .substring(0, originalName.lastIndexOf('.'))
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    
    const filename = `${safeName}_${timestamp}_${randomId}${ext}`;
    const basePath = `${this.tenantId}`;
    
    if (folder) {
      return `${basePath}/${folder}/${filename}`;
    }
    return `${basePath}/${filename}`;
  }

  /**
   * Upload a file to R2
   * Requirement 8.1: Validate file type and size before storing in R2
   * @param userId - User ID uploading the file
   * @param data - Upload input data
   * @returns Stored file metadata or error
   */
  async upload(userId: string, data: UploadInput): Promise<Result<StoredFile, StorageError>> {
    try {
      const { file, folder } = data;

      // Validate file type
      if (!this.isValidFileType(file.type, file.name)) {
        return {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type '${file.type}' is not allowed. Allowed types: ${this.config.allowedTypes?.mimeTypes.join(', ')}`,
          },
        };
      }

      // Validate file size
      if (!this.isValidFileSize(file.size)) {
        return {
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size exceeds maximum allowed size of ${this.config.maxFileSize / (1024 * 1024)}MB`,
          },
        };
      }


      // Check tenant storage limit if configured
      if (this.config.maxStoragePerTenant) {
        const fileRepo = new StoredFileRepository(this.db, this.tenantId);
        const currentUsage = await fileRepo.getTotalStorageUsed();
        if (currentUsage + file.size > this.config.maxStoragePerTenant) {
          return {
            success: false,
            error: {
              code: 'STORAGE_LIMIT_EXCEEDED',
              message: 'Tenant storage limit exceeded',
            },
          };
        }
      }

      // Generate storage path
      const path = this.generateStoragePath(file.name, folder);

      // Upload to R2
      const arrayBuffer = await file.arrayBuffer();
      await this.storage.put(path, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          tenantId: this.tenantId,
          userId,
          originalName: file.name,
        },
      });

      // Create database record
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const storedFile = await fileRepo.create({
        userId,
        filename: path.split('/').pop() || path,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path,
      });

      return { success: true, data: storedFile };
    } catch (error) {
      console.error('Upload file error:', error);
      return {
        success: false,
        error: { code: 'UPLOAD_FAILED', message: 'Failed to upload file' },
      };
    }
  }


  /**
   * Get a signed URL for file access
   * Requirement 8.2: Generate a signed URL with configurable expiration
   * @param fileId - File ID
   * @param options - Signed URL options
   * @returns Signed URL or error
   */
  async getSignedUrl(
    fileId: string,
    options: SignedUrlOptions = {}
  ): Promise<Result<string, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const file = await fileRepo.findById(fileId);

      if (!file) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        };
      }

      // R2 doesn't have native signed URL support in Workers
      // We'll create a presigned URL using a custom implementation
      const expiresIn = options.expiresIn ?? this.config.defaultSignedUrlExpiry;
      const expiresAt = Date.now() + expiresIn * 1000;
      
      // Create a signed token (in production, use proper HMAC signing)
      const token = await this.createSignedToken(file.path, expiresAt);
      
      // Return a URL that can be validated by the API
      const signedUrl = `/api/files/${fileId}/download?token=${token}&expires=${expiresAt}`;

      return { success: true, data: signedUrl };
    } catch (error) {
      console.error('Get signed URL error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate signed URL' },
      };
    }
  }

  /**
   * Create a signed token for URL validation
   * @param path - File path
   * @param expiresAt - Expiration timestamp
   * @returns Signed token
   */
  private async createSignedToken(path: string, expiresAt: number): Promise<string> {
    const data = `${path}:${expiresAt}:${this.tenantId}`;
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }


  /**
   * Validate a signed token
   * @param fileId - File ID
   * @param token - Signed token
   * @param expiresAt - Expiration timestamp
   * @returns true if valid
   */
  async validateSignedToken(
    fileId: string,
    token: string,
    expiresAt: number
  ): Promise<boolean> {
    // Check expiration
    if (Date.now() > expiresAt) {
      return false;
    }

    const fileRepo = new StoredFileRepository(this.db, this.tenantId);
    const file = await fileRepo.findById(fileId);
    if (!file) {
      return false;
    }

    const expectedToken = await this.createSignedToken(file.path, expiresAt);
    return token === expectedToken;
  }

  /**
   * Get file content from R2
   * @param fileId - File ID
   * @returns File content and metadata or error
   */
  async getFileContent(
    fileId: string
  ): Promise<Result<{ body: ReadableStream; contentType: string; size: number }, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const file = await fileRepo.findById(fileId);

      if (!file) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        };
      }

      const object = await this.storage.get(file.path);
      if (!object) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found in storage' },
        };
      }

      return {
        success: true,
        data: {
          body: object.body,
          contentType: file.mimeType,
          size: file.size,
        },
      };
    } catch (error) {
      console.error('Get file content error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get file content' },
      };
    }
  }


  /**
   * Delete a file from R2 and database
   * Requirement 8.3: Remove the file from R2 and update database records
   * @param fileId - File ID
   * @returns Success or error
   */
  async delete(fileId: string): Promise<Result<void, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const file = await fileRepo.findById(fileId);

      if (!file) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        };
      }

      // Delete from R2
      await this.storage.delete(file.path);

      // Delete database record
      const deleted = await fileRepo.delete(fileId);
      if (!deleted) {
        return {
          success: false,
          error: { code: 'DELETE_FAILED', message: 'Failed to delete file record' },
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Delete file error:', error);
      return {
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Failed to delete file' },
      };
    }
  }

  /**
   * Get file metadata by ID
   * @param fileId - File ID
   * @returns File metadata or error
   */
  async getById(fileId: string): Promise<Result<StoredFile, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const file = await fileRepo.findById(fileId);

      if (!file) {
        return {
          success: false,
          error: { code: 'FILE_NOT_FOUND', message: 'File not found' },
        };
      }

      return { success: true, data: file };
    } catch (error) {
      console.error('Get file error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get file' },
      };
    }
  }


  /**
   * List files for the tenant
   * Requirement 8.4: Return paginated list of files scoped to user's tenant
   * @param pagination - Pagination parameters
   * @returns Paginated list of files
   */
  async listByTenant(
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<StoredFile>, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const result = await fileRepo.findAll(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('List files error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list files' },
      };
    }
  }

  /**
   * List files for a specific user
   * Requirement 8.4: Return paginated list of files scoped to user's tenant
   * @param userId - User ID
   * @param pagination - Pagination parameters
   * @returns Paginated list of files
   */
  async listByUser(
    userId: string,
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<Result<PaginatedResult<StoredFile>, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const result = await fileRepo.findByUserId(userId, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('List user files error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list files' },
      };
    }
  }

  /**
   * Get storage usage statistics
   * @returns Storage usage info
   */
  async getStorageUsage(): Promise<Result<{ used: number; limit?: number }, StorageError>> {
    try {
      const fileRepo = new StoredFileRepository(this.db, this.tenantId);
      const used = await fileRepo.getTotalStorageUsed();
      return {
        success: true,
        data: {
          used,
          limit: this.config.maxStoragePerTenant,
        },
      };
    } catch (error) {
      console.error('Get storage usage error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get storage usage' },
      };
    }
  }
}
