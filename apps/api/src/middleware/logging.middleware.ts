/**
 * Request Logging Middleware
 * 
 * Provides structured request/response logging with duration tracking.
 * 
 * Requirements: 13.1
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { LogContext, LogLevel, ILogger } from '@saas/shared';
import { Logger, createLoggerForEnv } from '../services/logging.service';

/**
 * Variables added to context by logging middleware
 */
export interface LoggingVariables {
  logger: ILogger;
}

/**
 * Configuration for request logging middleware
 */
export interface RequestLoggingConfig {
  /** Logger instance to use */
  logger?: ILogger;
  /** Whether to log request body (be careful with sensitive data) */
  logRequestBody?: boolean;
  /** Whether to log response body (be careful with sensitive data) */
  logResponseBody?: boolean;
  /** Paths to exclude from logging */
  excludePaths?: string[];
  /** Custom log level for successful requests */
  successLevel?: LogLevel;
  /** Custom log level for error requests */
  errorLevel?: LogLevel;
}

const DEFAULT_CONFIG: RequestLoggingConfig = {
  logRequestBody: false,
  logResponseBody: false,
  excludePaths: ['/health'],
  successLevel: 'info',
  errorLevel: 'error',
};

/**
 * Create request logging middleware
 * 
 * Logs:
 * - Request method and path
 * - Request duration
 * - Response status code
 * - Request ID
 * - User ID and Tenant ID (if available)
 */
export function requestLoggingMiddleware(
  config: RequestLoggingConfig = {}
): MiddlewareHandler {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    
    // Skip excluded paths
    if (mergedConfig.excludePaths?.includes(path)) {
      await next();
      return;
    }

    const startTime = Date.now();
    const requestId = c.get('requestId') as string | undefined;
    
    // Get or create logger
    const baseLogger = mergedConfig.logger || createLoggerForEnv(
      (c.env as { ENVIRONMENT?: string })?.ENVIRONMENT || 'production'
    );

    // Create request-scoped logger with context
    const logger = baseLogger.child({
      requestId,
      method: c.req.method,
      path,
    });

    // Attach logger to context for use in handlers
    c.set('logger', logger);

    // Log request start
    const requestContext: LogContext = {
      requestId,
      method: c.req.method,
      path,
      query: c.req.query(),
      userAgent: c.req.header('user-agent'),
    };

    if (mergedConfig.logRequestBody && c.req.method !== 'GET') {
      try {
        const body = await c.req.raw.clone().text();
        if (body) {
          requestContext.requestBody = body.substring(0, 1000); // Limit body size
        }
      } catch {
        // Ignore body parsing errors
      }
    }

    logger.debug('Request started', requestContext);

    // Execute request
    let error: Error | undefined;
    try {
      await next();
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const duration = Date.now() - startTime;
      const statusCode = c.res.status;

      // Build response context
      const responseContext: LogContext = {
        requestId,
        method: c.req.method,
        path,
        statusCode,
        duration,
      };

      // Add auth context if available
      const auth = c.get('auth') as { user?: { id: string }; tenant?: { id: string } } | undefined;
      if (auth?.user?.id) {
        responseContext.userId = auth.user.id;
      }
      if (auth?.tenant?.id) {
        responseContext.tenantId = auth.tenant.id;
      }

      // Log based on status
      if (error) {
        logger.error('Request failed', error, responseContext);
      } else if (statusCode >= 500) {
        logger.error('Request completed with server error', undefined, responseContext);
      } else if (statusCode >= 400) {
        logger.warn('Request completed with client error', responseContext);
      } else {
        logger.info('Request completed', responseContext);
      }
    }
  };
}

/**
 * Simple request logging middleware that uses default configuration
 */
export const simpleRequestLogger: MiddlewareHandler = requestLoggingMiddleware();

/**
 * Create a child logger from context
 * Useful for creating loggers with additional context in route handlers
 */
export function getLogger(c: Context): ILogger {
  const logger = c.get('logger') as ILogger | undefined;
  if (logger) {
    return logger;
  }
  
  // Fallback to creating a new logger
  const requestId = c.get('requestId') as string | undefined;
  return new Logger({}, { requestId });
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(c: Context, context: LogContext): ILogger {
  return getLogger(c).child(context);
}
