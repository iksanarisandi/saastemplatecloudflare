/**
 * Middleware exports for Hono API
 */

// Authentication middleware
export {
  authMiddleware,
  optionalAuthMiddleware,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  type AuthVariables,
} from './auth.middleware';

// Tenant middleware
export {
  tenantMiddleware,
  validateTenantStatus,
  crossTenantMiddleware,
  type TenantVariables,
} from './tenant.middleware';

// Logging middleware
export {
  requestLoggingMiddleware,
  simpleRequestLogger,
  getLogger,
  createChildLogger,
  type LoggingVariables,
  type RequestLoggingConfig,
} from './logging.middleware';

// Security middleware
export {
  securityHeadersMiddleware,
  apiSecurityHeaders,
  webSecurityHeaders,
  strictSecurityHeaders,
  DEFAULT_SECURITY_CONFIG,
  type SecurityHeadersConfig,
  type CspDirectives,
} from './security.middleware';

// CORS middleware
export {
  corsMiddleware,
  createDomainCorsConfig,
  createDevCorsConfig,
  createStrictCorsConfig,
  createApiCors,
  DEFAULT_CORS_CONFIG,
  type CorsConfig,
} from './cors.middleware';
