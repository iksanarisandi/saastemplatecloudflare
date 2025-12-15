/**
 * Input sanitization utilities for XSS prevention and HTML escaping
 * Requirements: 14.1
 */

/**
 * HTML entities map for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Reverse HTML entities map for unescaping
 */
const REVERSE_HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#x60;': '`',
  '&#x3D;': '=',
  '&#39;': "'",
  '&#47;': '/',
};

/**
 * Escape HTML special characters to prevent XSS attacks
 * @param input - The string to escape
 * @returns The escaped string safe for HTML output
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Unescape HTML entities back to their original characters
 * @param input - The escaped string
 * @returns The unescaped string
 */
export function unescapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input.replace(
    /&(?:amp|lt|gt|quot|#x27|#x2F|#x60|#x3D|#39|#47);/g,
    (entity) => REVERSE_HTML_ENTITIES[entity] || entity
  );
}

/**
 * Common XSS attack patterns to detect and remove
 */
const XSS_PATTERNS: RegExp[] = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\bon\w+\s*=/gi,
  // JavaScript URLs
  /javascript\s*:/gi,
  // Data URLs with script
  /data\s*:[^,]*;base64[^"']*/gi,
  // VBScript
  /vbscript\s*:/gi,
  // Expression (IE)
  /expression\s*\(/gi,
  // Embedded objects
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  // Form elements that could be used for phishing
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  // Style with expression
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  // SVG with script
  /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
  // Math with script
  /<math\b[^<]*(?:(?!<\/math>)<[^<]*)*<\/math>/gi,
];

/**
 * Remove potentially dangerous XSS patterns from input
 * @param input - The string to sanitize
 * @returns The sanitized string with XSS patterns removed
 */
export function stripXss(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  let result = input;
  
  // Remove null bytes
  result = result.replace(/\0/g, '');
  
  // Apply all XSS pattern removals
  for (const pattern of XSS_PATTERNS) {
    result = result.replace(pattern, '');
  }
  
  return result;
}

/**
 * Sanitize input by both stripping XSS and escaping HTML
 * This is the most secure option for user input
 * @param input - The string to sanitize
 * @returns The fully sanitized string
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  return escapeHtml(stripXss(input));
}

/**
 * Sanitize an object's string values recursively
 * @param obj - The object to sanitize
 * @param options - Sanitization options
 * @returns A new object with sanitized string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizeOptions = {}
): T {
  const { escapeOnly = false, skipKeys = [] } = options;
  
  const sanitizeFn = escapeOnly ? escapeHtml : sanitizeInput;
  
  const sanitizeValue = (value: unknown, key?: string): unknown => {
    // Skip specified keys
    if (key && skipKeys.includes(key)) {
      return value;
    }
    
    if (typeof value === 'string') {
      return sanitizeFn(value);
    }
    
    if (Array.isArray(value)) {
      return value.map((item) => sanitizeValue(item));
    }
    
    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = sanitizeValue(v, k);
      }
      return result;
    }
    
    return value;
  };
  
  return sanitizeValue(obj) as T;
}

/**
 * Options for sanitization
 */
export interface SanitizeOptions {
  /** Only escape HTML, don't strip XSS patterns */
  escapeOnly?: boolean;
  /** Keys to skip during sanitization */
  skipKeys?: string[];
}

/**
 * Check if a string contains potential XSS patterns
 * @param input - The string to check
 * @returns True if XSS patterns are detected
 */
export function containsXss(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  
  // Check for null bytes
  if (input.includes('\0')) {
    return true;
  }
  
  // Check against XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Sanitize a URL to prevent javascript: and data: attacks
 * @param url - The URL to sanitize
 * @returns The sanitized URL or empty string if dangerous
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'vbscript:', 'data:'];
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return '';
    }
  }
  
  // Allow safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', '/'];
  const hasProtocol = safeProtocols.some(
    (p) => trimmed.startsWith(p) || trimmed.startsWith(p.replace(':', '://'))
  );
  
  // If no protocol, assume relative URL (safe)
  if (!hasProtocol && !trimmed.includes(':')) {
    return url;
  }
  
  // If has safe protocol, return original
  if (hasProtocol) {
    return url;
  }
  
  // Unknown protocol, block it
  return '';
}
