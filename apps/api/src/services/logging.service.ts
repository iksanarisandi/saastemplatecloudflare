/**
 * Structured Logging Service
 * 
 * Provides JSON-formatted logging with log levels, context injection,
 * and support for error stack traces.
 * 
 * Requirements: 13.1, 13.2, 13.5
 */

import type {
  LogLevel,
  LogContext,
  LogEntry,
  LoggerConfig,
  ILogger,
} from '@saas/shared';
import { LOG_LEVEL_VALUES } from '@saas/shared';

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: 'info',
  service: 'saas-api',
  includeStackTrace: true,
  prettyPrint: false,
};

/**
 * Structured Logger implementation
 * 
 * Outputs JSON-formatted log entries with:
 * - Timestamp
 * - Log level
 * - Message
 * - Context (requestId, userId, tenantId, etc.)
 * - Stack trace for errors
 */
export class Logger implements ILogger {
  private config: LoggerConfig;
  private baseContext: LogContext;

  constructor(config: Partial<LoggerConfig> = {}, baseContext: LogContext = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseContext = baseContext;
  }

  /**
   * Check if a log level should be output based on minimum level
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[this.config.minLevel];
  }

  /**
   * Create a log entry object
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context: LogContext = {},
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.baseContext, ...context },
    };

    if (this.config.service) {
      entry.service = this.config.service;
    }

    if (error) {
      entry.errorName = error.name;
      if (this.config.includeStackTrace && error.stack) {
        entry.stack = error.stack;
      }
    }

    return entry;
  }

  /**
   * Output a log entry
   */
  private output(entry: LogEntry): void {
    const output = this.config.prettyPrint
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      this.output(this.createEntry('debug', message, context));
    }
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      this.output(this.createEntry('info', message, context));
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      this.output(this.createEntry('warn', message, context));
    }
  }

  /**
   * Log an error message with optional error object
   */
  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog('error')) {
      this.output(this.createEntry('error', message, context, error));
    }
  }

  /**
   * Create a child logger with additional base context
   */
  child(context: LogContext): ILogger {
    return new Logger(this.config, { ...this.baseContext, ...context });
  }
}

/**
 * Create a logger instance with configuration
 */
export function createLogger(
  config: Partial<LoggerConfig> = {},
  context: LogContext = {}
): Logger {
  return new Logger(config, context);
}

/**
 * Create a logger configured for a specific environment
 */
export function createLoggerForEnv(environment: string): Logger {
  const isDev = environment === 'development';
  
  return createLogger({
    minLevel: isDev ? 'debug' : 'info',
    prettyPrint: isDev,
    includeStackTrace: true,
    service: 'saas-api',
  });
}

/**
 * Serialize a log entry to JSON string
 * Useful for testing and validation
 */
export function serializeLogEntry(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Parse a JSON log string back to LogEntry
 * Useful for testing and validation
 */
export function parseLogEntry(json: string): LogEntry {
  return JSON.parse(json) as LogEntry;
}

/**
 * Validate that a log entry has all required fields
 */
export function isValidLogEntry(entry: unknown): entry is LogEntry {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }

  const e = entry as Record<string, unknown>;
  
  return (
    typeof e.timestamp === 'string' &&
    typeof e.level === 'string' &&
    ['debug', 'info', 'warn', 'error'].includes(e.level as string) &&
    typeof e.message === 'string' &&
    typeof e.context === 'object' &&
    e.context !== null
  );
}
