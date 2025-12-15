/**
 * Security headers middleware for Hono API
 * Implements CSP, HSTS, X-Frame-Options and other security headers
 * Requirements: 14.3
 */

import type { Context, Next, MiddlewareHandler } from 'hono';

/**
 * Content Security Policy directives
 */
export interface CspDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  frameSrc?: string[];
  frameAncestors?: string[];
  formAction?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
}

/**
 * Security headers configuration
 */
export interface SecurityHeadersConfig {
  /** Content Security Policy directives */
  csp?: CspDirectives | false;
  /** HTTP Strict Transport Security max-age in seconds (default: 31536000 = 1 year) */
  hstsMaxAge?: number | false;
  /** Include subdomains in HSTS */
  hstsIncludeSubdomains?: boolean;
  /** Add preload directive to HSTS */
  hstsPreload?: boolean;
  /** X-Frame-Options value: 'DENY', 'SAMEORIGIN', or false to disable */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false;
  /** X-Content-Type-Options: 'nosniff' or false to disable */
  contentTypeOptions?: 'nosniff' | false;
  /** X-XSS-Protection value or false to disable */
  xssProtection?: string | false;
  /** Referrer-Policy value */
  referrerPolicy?: string | false;
  /** Permissions-Policy directives */
  permissionsPolicy?: Record<string, string[]> | false;
}

/**
 * Default security headers configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: true,
  },
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: false,
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    'interest-cohort': [],
  },
};

/**
 * Build Content-Security-Policy header value from directives
 */
function buildCspHeader(directives: CspDirectives): string {
  const parts: string[] = [];
  
  const directiveMap: Record<keyof CspDirectives, string> = {
    defaultSrc: 'default-src',
    scriptSrc: 'script-src',
    styleSrc: 'style-src',
    imgSrc: 'img-src',
    fontSrc: 'font-src',
    connectSrc: 'connect-src',
    mediaSrc: 'media-src',
    objectSrc: 'object-src',
    frameSrc: 'frame-src',
    frameAncestors: 'frame-ancestors',
    formAction: 'form-action',
    baseUri: 'base-uri',
    upgradeInsecureRequests: 'upgrade-insecure-requests',
    blockAllMixedContent: 'block-all-mixed-content',
  };
  
  for (const [key, value] of Object.entries(directives)) {
    const directiveName = directiveMap[key as keyof CspDirectives];
    if (!directiveName) continue;
    
    if (typeof value === 'boolean') {
      if (value) {
        parts.push(directiveName);
      }
    } else if (Array.isArray(value) && value.length > 0) {
      parts.push(`${directiveName} ${value.join(' ')}`);
    }
  }
  
  return parts.join('; ');
}

/**
 * Build Permissions-Policy header value
 */
function buildPermissionsPolicy(policy: Record<string, string[]>): string {
  return Object.entries(policy)
    .map(([feature, allowlist]) => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.join(' ')})`;
    })
    .join(', ');
}

/**
 * Create security headers middleware with custom configuration
 * @param config - Security headers configuration
 * @returns Hono middleware handler
 */
export function securityHeadersMiddleware(
  config: SecurityHeadersConfig = {}
): MiddlewareHandler {
  const mergedConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  
  return async (c: Context, next: Next) => {
    await next();
    
    // Content-Security-Policy
    if (mergedConfig.csp !== false && mergedConfig.csp) {
      const cspValue = buildCspHeader(mergedConfig.csp);
      if (cspValue) {
        c.header('Content-Security-Policy', cspValue);
      }
    }
    
    // Strict-Transport-Security (HSTS)
    if (mergedConfig.hstsMaxAge !== false && mergedConfig.hstsMaxAge) {
      let hstsValue = `max-age=${mergedConfig.hstsMaxAge}`;
      if (mergedConfig.hstsIncludeSubdomains) {
        hstsValue += '; includeSubDomains';
      }
      if (mergedConfig.hstsPreload) {
        hstsValue += '; preload';
      }
      c.header('Strict-Transport-Security', hstsValue);
    }
    
    // X-Frame-Options
    if (mergedConfig.frameOptions !== false && mergedConfig.frameOptions) {
      c.header('X-Frame-Options', mergedConfig.frameOptions);
    }
    
    // X-Content-Type-Options
    if (mergedConfig.contentTypeOptions !== false && mergedConfig.contentTypeOptions) {
      c.header('X-Content-Type-Options', mergedConfig.contentTypeOptions);
    }
    
    // X-XSS-Protection
    if (mergedConfig.xssProtection !== false && mergedConfig.xssProtection) {
      c.header('X-XSS-Protection', mergedConfig.xssProtection);
    }
    
    // Referrer-Policy
    if (mergedConfig.referrerPolicy !== false && mergedConfig.referrerPolicy) {
      c.header('Referrer-Policy', mergedConfig.referrerPolicy);
    }
    
    // Permissions-Policy
    if (mergedConfig.permissionsPolicy !== false && mergedConfig.permissionsPolicy) {
      const policyValue = buildPermissionsPolicy(mergedConfig.permissionsPolicy);
      if (policyValue) {
        c.header('Permissions-Policy', policyValue);
      }
    }
  };
}

/**
 * Pre-configured security headers for API endpoints
 * More permissive CSP for API responses
 */
export const apiSecurityHeaders = securityHeadersMiddleware({
  csp: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '0', // Disable for APIs as it can cause issues
  referrerPolicy: 'no-referrer',
});

/**
 * Pre-configured security headers for web pages
 * Standard CSP for HTML pages
 */
export const webSecurityHeaders = securityHeadersMiddleware({
  ...DEFAULT_SECURITY_CONFIG,
});

/**
 * Strict security headers for sensitive endpoints
 */
export const strictSecurityHeaders = securityHeadersMiddleware({
  csp: {
    defaultSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'"],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  hstsMaxAge: 63072000, // 2 years
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  frameOptions: 'DENY',
  contentTypeOptions: 'nosniff',
  xssProtection: '1; mode=block',
  referrerPolicy: 'no-referrer',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    'interest-cohort': [],
    accelerometer: [],
    gyroscope: [],
    magnetometer: [],
    payment: [],
    usb: [],
  },
});
