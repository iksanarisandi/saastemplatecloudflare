import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { 
  ApiResponse, 
  ApiError, 
  ResponseMeta, 
  PaginationMeta,
  PaginatedResult,
} from '@saas/shared';
import { AppError, RateLimitError } from '@saas/shared';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID();
}

/**
 * Create response metadata
 */
export function createMeta(
  requestId: string,
  pagination?: PaginationMeta
): ResponseMeta {
  return {
    timestamp: new Date().toISOString(),
    requestId,
    ...(pagination && { pagination }),
  };
}

/**
 * Create a successful API response
 */
export function success<T>(
  c: Context,
  data: T,
  statusCode: ContentfulStatusCode = 200
): Response {
  const requestId = c.get('requestId') || generateRequestId();
  
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: createMeta(requestId),
  };
  
  return c.json(response, statusCode);
}

/**
 * Create a successful paginated API response
 */
export function successPaginated<T>(
  c: Context,
  result: PaginatedResult<T>,
  statusCode: ContentfulStatusCode = 200
): Response {
  const requestId = c.get('requestId') || generateRequestId();

  const response: ApiResponse<T[]> = {
    success: true,
    data: result.items,
    meta: createMeta(requestId, result.pagination),
  };
  
  return c.json(response, statusCode);
}

/**
 * Create an error API response
 */
export function error(
  c: Context,
  err: ApiError,
  statusCode: ContentfulStatusCode = 400
): Response {
  const requestId = c.get('requestId') || generateRequestId();
  
  const response: ApiResponse<null> = {
    success: false,
    error: err,
    meta: createMeta(requestId),
  };
  
  return c.json(response, statusCode);
}

/**
 * Create an error response from an AppError instance
 */
export function errorFromAppError(
  c: Context,
  err: AppError
): Response {
  const requestId = c.get('requestId') || generateRequestId();
  
  const response: ApiResponse<null> = {
    success: false,
    error: err.toJSON(),
    meta: createMeta(requestId),
  };
  
  // Add retry-after header for rate limit errors
  if (err instanceof RateLimitError) {
    c.header('Retry-After', String(err.retryAfter));
  }
  
  return c.json(response, err.statusCode as ContentfulStatusCode);
}

/**
 * Create a validation error response
 */
export function validationError(
  c: Context,
  message: string,
  fields: Record<string, string[]>
): Response {
  return error(
    c,
    {
      code: 'VALIDATION_ERROR',
      message,
      details: { fields },
    },
    400
  );
}

/**
 * Create a not found error response
 */
export function notFound(
  c: Context,
  resource: string,
  id?: string
): Response {
  return error(
    c,
    {
      code: 'NOT_FOUND',
      message: `${resource} not found${id ? `: ${id}` : ''}`,
    },
    404
  );
}

/**
 * Create an unauthorized error response
 */
export function unauthorized(
  c: Context,
  message: string = 'Unauthorized'
): Response {
  return error(
    c,
    {
      code: 'UNAUTHORIZED',
      message,
    },
    401
  );
}

/**
 * Create a forbidden error response
 */
export function forbidden(
  c: Context,
  message: string = 'Access denied'
): Response {
  return error(
    c,
    {
      code: 'FORBIDDEN',
      message,
    },
    403
  );
}

/**
 * Create a rate limit error response
 */
export function rateLimited(
  c: Context,
  retryAfter: number
): Response {
  c.header('Retry-After', String(retryAfter));
  
  return error(
    c,
    {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: { retryAfter },
    },
    429
  );
}

/**
 * Create an internal server error response
 */
export function internalError(
  c: Context,
  message: string = 'An internal error occurred',
  includeDetails: boolean = false
): Response {
  return error(
    c,
    {
      code: 'INTERNAL_ERROR',
      message: includeDetails ? message : 'An internal error occurred',
    },
    500
  );
}

/**
 * Create a bad request error response
 */
export function badRequest(
  c: Context,
  message: string,
  details?: Record<string, unknown>
): Response {
  return error(
    c,
    {
      code: 'BAD_REQUEST',
      message,
      details,
    },
    400
  );
}

/**
 * HTTP status code mapping for common error types
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error code to HTTP status mapping
 */
export const ERROR_STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: HTTP_STATUS.BAD_REQUEST,
  BAD_REQUEST: HTTP_STATUS.BAD_REQUEST,
  UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  AUTH_INVALID_CREDENTIALS: HTTP_STATUS.UNAUTHORIZED,
  AUTH_SESSION_EXPIRED: HTTP_STATUS.UNAUTHORIZED,
  AUTH_SESSION_INVALID: HTTP_STATUS.UNAUTHORIZED,
  AUTH_USER_NOT_FOUND: HTTP_STATUS.UNAUTHORIZED,
  AUTH_USER_INACTIVE: HTTP_STATUS.UNAUTHORIZED,
  AUTH_UNAUTHORIZED: HTTP_STATUS.UNAUTHORIZED,
  FORBIDDEN: HTTP_STATUS.FORBIDDEN,
  TENANT_INACTIVE: HTTP_STATUS.FORBIDDEN,
  TENANT_LIMIT_EXCEEDED: HTTP_STATUS.FORBIDDEN,
  NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  TENANT_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  PAYMENT_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  STORAGE_NOT_FOUND: HTTP_STATUS.NOT_FOUND,
  RATE_LIMIT_EXCEEDED: HTTP_STATUS.TOO_MANY_REQUESTS,
  INTERNAL_ERROR: HTTP_STATUS.INTERNAL_SERVER_ERROR,
};

/**
 * Get HTTP status code for an error code
 */
export function getStatusForErrorCode(code: string): number {
  return ERROR_STATUS_MAP[code] || HTTP_STATUS.INTERNAL_SERVER_ERROR;
}
