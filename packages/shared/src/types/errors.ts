import type { ApiError } from './api';

/**
 * Base error class for all application errors
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }

  toJSON(): ApiError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Authentication errors (401)
 */
export class AuthError extends AppError {
  readonly statusCode = 401;

  static readonly CODES = {
    INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
    SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
    SESSION_INVALID: 'AUTH_SESSION_INVALID',
    USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
    USER_INACTIVE: 'AUTH_USER_INACTIVE',
    EMAIL_EXISTS: 'AUTH_EMAIL_EXISTS',
    INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
    UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  } as const;

  constructor(
    readonly code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message, details);
  }
}


/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly fields: Record<string, string[]>;

  constructor(message: string, fields: Record<string, string[]>) {
    super(message, { fields });
    this.fields = fields;
  }
}

/**
 * Not found errors (404)
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;

  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? `: ${id}` : ''}`);
  }
}

/**
 * Forbidden errors (403)
 */
export class ForbiddenError extends AppError {
  readonly code = 'FORBIDDEN';
  readonly statusCode = 403;

  constructor(message: string = 'Access denied') {
    super(message);
  }
}

/**
 * Tenant errors (403)
 */
export class TenantError extends AppError {
  readonly statusCode = 403;

  static readonly CODES = {
    INACTIVE: 'TENANT_INACTIVE',
    NOT_FOUND: 'TENANT_NOT_FOUND',
    LIMIT_EXCEEDED: 'TENANT_LIMIT_EXCEEDED',
  } as const;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Payment errors (400)
 */
export class PaymentError extends AppError {
  readonly statusCode = 400;

  static readonly CODES = {
    INVALID_AMOUNT: 'PAYMENT_INVALID_AMOUNT',
    ALREADY_CONFIRMED: 'PAYMENT_ALREADY_CONFIRMED',
    ALREADY_REJECTED: 'PAYMENT_ALREADY_REJECTED',
    PROOF_REQUIRED: 'PAYMENT_PROOF_REQUIRED',
    NOT_FOUND: 'PAYMENT_NOT_FOUND',
  } as const;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Storage errors (400)
 */
export class StorageError extends AppError {
  readonly statusCode = 400;

  static readonly CODES = {
    FILE_TOO_LARGE: 'STORAGE_FILE_TOO_LARGE',
    INVALID_TYPE: 'STORAGE_INVALID_TYPE',
    UPLOAD_FAILED: 'STORAGE_UPLOAD_FAILED',
    NOT_FOUND: 'STORAGE_NOT_FOUND',
  } as const;

  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly retryAfter: number;

  constructor(retryAfter: number) {
    super('Rate limit exceeded', { retryAfter });
    this.retryAfter = retryAfter;
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AppError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;

  constructor(message: string = 'An internal error occurred') {
    super(message);
  }
}

/**
 * Bad request error (400)
 */
export class BadRequestError extends AppError {
  readonly code = 'BAD_REQUEST';
  readonly statusCode = 400;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message, details);
  }
}
