/**
 * CORS middleware with origin validation and preflight handling
 * Requirements: 14.4
 */

import type { Context, Next, MiddlewareHandler } from 'hono';

/**
 * CORS configuration options
 */
export interface CorsConfig {
  /** Allowed origins - can be strings, regex patterns, or a validation function */
  allowedOrigins: (string | RegExp)[] | ((origin: string) => boolean);
  /** Allowed HTTP methods */
  allowedMethods?: string[];
  /** Allowed request headers */
  allowedHeaders?: string[];
  /** Headers to expose to the client */
  exposedHeaders?: string[];
  /** Allow credentials (cookies, authorization headers) */
  credentials?: boolean;
  /** Max age for preflight cache in seconds */
  maxAge?: number;
  /** Whether to pass preflight response to the next handler */
  preflightContinue?: boolean;
  /** Success status code for OPTIONS requests */
  optionsSuccessStatus?: number;
}

/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG: Required<CorsConfig> = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Check if an origin is allowed based on the configuration
 */
function isOriginAllowed(
  origin: string,
  allowedOrigins: CorsConfig['allowedOrigins']
): boolean {
  if (typeof allowedOrigins === 'function') {
    return allowedOrigins(origin);
  }

  for (const allowed of allowedOrigins) {
    if (typeof allowed === 'string') {
      // Exact match or wildcard
      if (allowed === '*' || allowed === origin) {
        return true;
      }
    } else if (allowed instanceof RegExp) {
      // Regex match
      if (allowed.test(origin)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Validate origin format
 */
function isValidOrigin(origin: string): boolean {
  if (!origin) return false;
  
  try {
    const url = new URL(origin);
    // Origin should only have protocol and host (no path)
    return url.origin === origin;
  } catch {
    return false;
  }
}

/**
 * Create CORS middleware with custom configuration
 * @param config - CORS configuration options
 * @returns Hono middleware handler
 */
export function corsMiddleware(config: Partial<CorsConfig> = {}): MiddlewareHandler {
  const mergedConfig: Required<CorsConfig> = {
    ...DEFAULT_CORS_CONFIG,
    ...config,
  };
  
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    const requestMethod = c.req.method;
    
    // No Origin header means same-origin request or non-browser client
    if (!origin) {
      await next();
      return;
    }
    
    // Validate origin format
    if (!isValidOrigin(origin)) {
      // Invalid origin format, don't set CORS headers
      await next();
      return;
    }
    
    // Check if origin is allowed
    const originAllowed = isOriginAllowed(origin, mergedConfig.allowedOrigins);
    
    if (!originAllowed) {
      // Origin not allowed - don't set CORS headers
      // The browser will block the request
      if (requestMethod === 'OPTIONS') {
        return c.text('', 403);
      }
      await next();
      return;
    }
    
    // Set CORS headers for allowed origins
    c.header('Access-Control-Allow-Origin', origin);
    
    if (mergedConfig.credentials) {
      c.header('Access-Control-Allow-Credentials', 'true');
    }
    
    if (mergedConfig.exposedHeaders.length > 0) {
      c.header('Access-Control-Expose-Headers', mergedConfig.exposedHeaders.join(', '));
    }
    
    // Handle preflight requests
    if (requestMethod === 'OPTIONS') {
      // Check if it's a preflight request
      const requestedMethod = c.req.header('Access-Control-Request-Method');
      
      if (requestedMethod) {
        // Validate requested method
        if (!mergedConfig.allowedMethods.includes(requestedMethod.toUpperCase())) {
          return c.text('', 403);
        }
        
        c.header('Access-Control-Allow-Methods', mergedConfig.allowedMethods.join(', '));
        
        // Handle requested headers
        const requestedHeaders = c.req.header('Access-Control-Request-Headers');
        if (requestedHeaders) {
          // Validate requested headers
          const headers = requestedHeaders.split(',').map((h) => h.trim().toLowerCase());
          const allowedLower = mergedConfig.allowedHeaders.map((h) => h.toLowerCase());
          
          const allHeadersAllowed = headers.every(
            (h) => allowedLower.includes(h) || isSimpleHeader(h)
          );
          
          if (!allHeadersAllowed) {
            return c.text('', 403);
          }
          
          c.header('Access-Control-Allow-Headers', mergedConfig.allowedHeaders.join(', '));
        }
        
        // Set max age for preflight cache
        if (mergedConfig.maxAge > 0) {
          c.header('Access-Control-Max-Age', String(mergedConfig.maxAge));
        }
        
        // Vary header for caching
        c.header('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
        
        if (!mergedConfig.preflightContinue) {
          return c.body(null, 204);
        }
      }
    }
    
    // Add Vary header for non-preflight requests
    c.header('Vary', 'Origin');
    
    await next();
  };
}

/**
 * Check if a header is a CORS-safelisted request header
 */
function isSimpleHeader(header: string): boolean {
  const simpleHeaders = [
    'accept',
    'accept-language',
    'content-language',
    'content-type',
  ];
  return simpleHeaders.includes(header.toLowerCase());
}

/**
 * Create a CORS config that allows specific domains
 * @param domains - List of allowed domains (without protocol)
 * @param options - Additional CORS options
 */
export function createDomainCorsConfig(
  domains: string[],
  options: Partial<Omit<CorsConfig, 'allowedOrigins'>> = {}
): CorsConfig {
  const origins: (string | RegExp)[] = [];
  
  for (const domain of domains) {
    // Allow both http and https
    origins.push(`https://${domain}`);
    origins.push(`http://${domain}`);
    // Allow subdomains
    origins.push(new RegExp(`^https?://([a-z0-9-]+\\.)*${escapeRegex(domain)}$`));
  }
  
  return {
    allowedOrigins: origins,
    ...options,
  };
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a permissive CORS config for development
 * WARNING: Do not use in production!
 */
export function createDevCorsConfig(
  options: Partial<Omit<CorsConfig, 'allowedOrigins'>> = {}
): CorsConfig {
  return {
    allowedOrigins: () => true, // Allow all origins
    ...options,
  };
}

/**
 * Create a strict CORS config for production
 * Only allows specified origins exactly
 */
export function createStrictCorsConfig(
  origins: string[],
  options: Partial<Omit<CorsConfig, 'allowedOrigins'>> = {}
): CorsConfig {
  return {
    allowedOrigins: origins,
    credentials: true,
    ...options,
  };
}

/**
 * Pre-configured CORS for API endpoints
 * Requires explicit origin configuration via environment
 */
export function createApiCors(allowedOrigins: string[]): MiddlewareHandler {
  return corsMiddleware({
    allowedOrigins,
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400,
  });
}
