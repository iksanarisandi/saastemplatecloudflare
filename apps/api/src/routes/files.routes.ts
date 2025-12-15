import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { StorageService } from '../services/storage.service';
import {
  success,
  successPaginated,
  error,
  notFound,
  badRequest,
  forbidden,
} from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { tenantMiddleware, type TenantVariables } from '../middleware/tenant.middleware';

type FilesEnv = { Bindings: Env; Variables: TenantVariables & { requestId: string } };

const filesRoutes = new Hono<FilesEnv>();

// All file routes require authentication and tenant context
filesRoutes.use('*', authMiddleware);
filesRoutes.use('*', tenantMiddleware);

// Pagination schema
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Signed URL options schema
const signedUrlOptionsSchema = z.object({
  expiresIn: z.coerce.number().int().positive().max(86400).default(3600),
});

// Helper to transform file for response
function transformFile(file: any) {
  return {
    id: file.id,
    tenantId: file.tenantId,
    userId: file.userId,
    filename: file.filename,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    createdAt: file.createdAt.toISOString(),
  };
}


/**
 * GET /files
 * List files for the tenant
 * Requirement 8.4: Return paginated list of files scoped to user's tenant
 */
filesRoutes.get(
  '/',
  zValidator('query', paginationSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { page, limit } = c.req.valid('query');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

    // Admins see all tenant files, users see only their own
    const result = auth.user.role === 'user'
      ? await storageService.listByUser(auth.user.id, { page, limit })
      : await storageService.listByTenant({ page, limit });

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    return successPaginated(c, {
      items: result.data.items.map(transformFile),
      pagination: result.data.pagination,
    });
  }
);

/**
 * POST /files
 * Upload a file
 * Requirement 8.1: Validate file type and size before storing in R2
 */
filesRoutes.post('/', async (c) => {
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  const folder = formData.get('folder') as string | null;

  if (!file) {
    return badRequest(c, 'No file provided');
  }

  const result = await storageService.upload(auth.user.id, {
    file,
    folder: folder || undefined,
  });

  if (!result.success) {
    const statusMap: Record<string, number> = {
      INVALID_FILE_TYPE: 400,
      FILE_TOO_LARGE: 400,
      STORAGE_LIMIT_EXCEEDED: 403,
      UPLOAD_FAILED: 500,
      INTERNAL_ERROR: 500,
    };
    
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      (statusMap[result.error.code] || 400) as 400 | 403 | 500
    );
  }

  return success(c, transformFile(result.data), 201);
});

/**
 * GET /files/:id
 * Get file metadata by ID
 */
filesRoutes.get('/:id', async (c) => {
  const fileId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

  const result = await storageService.getById(fileId);

  if (!result.success) {
    if (result.error.code === 'FILE_NOT_FOUND') {
      return notFound(c, 'File', fileId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  // Users can only see their own files unless admin
  if (auth.user.role === 'user' && result.data.userId !== auth.user.id) {
    return forbidden(c, 'Cannot access this file');
  }

  return success(c, transformFile(result.data));
});


/**
 * DELETE /files/:id
 * Delete a file
 * Requirement 8.3: Remove the file from R2 and update database records
 */
filesRoutes.delete('/:id', async (c) => {
  const fileId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

  // First check if file exists and user has access
  const fileResult = await storageService.getById(fileId);
  if (!fileResult.success) {
    if (fileResult.error.code === 'FILE_NOT_FOUND') {
      return notFound(c, 'File', fileId);
    }
    return error(
      c,
      { code: fileResult.error.code, message: fileResult.error.message },
      500
    );
  }

  // Users can only delete their own files unless admin
  if (auth.user.role === 'user' && fileResult.data.userId !== auth.user.id) {
    return forbidden(c, 'Cannot delete this file');
  }

  const result = await storageService.delete(fileId);

  if (!result.success) {
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  return success(c, { message: 'File deleted successfully' });
});

/**
 * GET /files/:id/url
 * Get a signed URL for file access
 * Requirement 8.2: Generate a signed URL with configurable expiration
 */
filesRoutes.get(
  '/:id/url',
  zValidator('query', signedUrlOptionsSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const fileId = c.req.param('id');
    const { expiresIn } = c.req.valid('query');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

    // First check if file exists and user has access
    const fileResult = await storageService.getById(fileId);
    if (!fileResult.success) {
      if (fileResult.error.code === 'FILE_NOT_FOUND') {
        return notFound(c, 'File', fileId);
      }
      return error(
        c,
        { code: fileResult.error.code, message: fileResult.error.message },
        500
      );
    }

    // Users can only get URLs for their own files unless admin
    if (auth.user.role === 'user' && fileResult.data.userId !== auth.user.id) {
      return forbidden(c, 'Cannot access this file');
    }

    const result = await storageService.getSignedUrl(fileId, { expiresIn });

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    return success(c, {
      url: result.data,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  }
);

/**
 * GET /files/:id/download
 * Download file content (validates signed token)
 */
filesRoutes.get('/:id/download', async (c) => {
  const fileId = c.req.param('id');
  const token = c.req.query('token');
  const expiresStr = c.req.query('expires');
  const tenantId = c.get('tenantId');
  const storageService = new StorageService(c.env.DB, c.env.STORAGE, tenantId);

  if (!token || !expiresStr) {
    return badRequest(c, 'Missing token or expires parameter');
  }

  const expiresAt = parseInt(expiresStr, 10);
  if (isNaN(expiresAt)) {
    return badRequest(c, 'Invalid expires parameter');
  }

  // Validate signed token
  const isValid = await storageService.validateSignedToken(fileId, token, expiresAt);
  if (!isValid) {
    return error(
      c,
      { code: 'INVALID_TOKEN', message: 'Invalid or expired download token' },
      401
    );
  }

  // Get file content
  const result = await storageService.getFileContent(fileId);
  if (!result.success) {
    if (result.error.code === 'FILE_NOT_FOUND') {
      return notFound(c, 'File', fileId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  // Return file content with appropriate headers
  return new Response(result.data.body, {
    headers: {
      'Content-Type': result.data.contentType,
      'Content-Length': String(result.data.size),
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

export { filesRoutes };
