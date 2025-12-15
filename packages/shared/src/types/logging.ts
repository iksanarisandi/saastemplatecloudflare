/**
 * Logging types for structured logging
 */

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log level numeric values for comparison
 */
export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Context information for log entries
 */
export interface LogContext {
  /** Unique request identifier */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Tenant ID for multi-tenant context */
  tenantId?: string;
  /** HTTP method */
  method?: string;
  /** Request path */
  path?: string;
  /** HTTP status code */
  statusCode?: number;
  /** Request duration in milliseconds */
  duration?: number;
  /** Additional custom context */
  [key: string]: unknown;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  /** ISO timestamp of the log entry */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Contextual information */
  context: LogContext;
  /** Error stack trace (for error logs) */
  stack?: string;
  /** Error name (for error logs) */
  errorName?: string;
  /** Service or component name */
  service?: string;
}

/**
 * Logger configuration options
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Service name to include in logs */
  service?: string;
  /** Whether to include stack traces for errors */
  includeStackTrace?: boolean;
  /** Whether to pretty print JSON (for development) */
  prettyPrint?: boolean;
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
}
