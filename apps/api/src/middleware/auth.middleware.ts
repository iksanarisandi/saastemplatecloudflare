import { Context, Next } from 'hono';
import type { AuthContext } from '@saas/shared';
import { AuthService } from '../services/auth.service';

/**
 * Extended Hono context variables for authenticated requests
 */
export interface AuthVariables {
  auth: AuthContext;
  requestId: string;
}

/**
 * Extract session token from request
 * Supports both Authorization header (Bearer token) and cookie
 * @param c - Hono context
 * @returns Session token or null
 */
function extractSessionToken(c: Context): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Try cookie
  const sessionCookie = c.req.header('Cookie');
  if (sessionCookie) {
    const match = sessionCookie.match(/session=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Authentication middleware for Hono
 * Validates session and injects user context into request
 * 
 * Requirements: 9.1 - API request validation and authentication
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next
): Promise<Response | void> {
  const sessionToken = extractSessionToken(c);

  if (!sessionToken) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing authentication token',
      },
    }, 401);
  }

  const db = c.env.DB as D1Database;
  const authService = new AuthService(db);
  const result = await authService.validateSession(sessionToken);

  if (!result.success) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: result.error.message,
      },
    }, 401);
  }

  // Inject auth context into request
  c.set('auth', result.data);

  await next();
}

/**
 * Optional authentication middleware
 * Validates session if present but doesn't require it
 * Useful for endpoints that behave differently for authenticated users
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Env; Variables: Partial<AuthVariables> }>,
  next: Next
): Promise<Response | void> {
  const sessionToken = extractSessionToken(c);

  if (sessionToken) {
    const db = c.env.DB as D1Database;
    const authService = new AuthService(db);
    const result = await authService.validateSession(sessionToken);

    if (result.success) {
      c.set('auth', result.data);
    }
  }

  await next();
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 * 
 * @param allowedRoles - Array of roles that are allowed access
 * @returns Middleware function
 */
export function requireRole(...allowedRoles: AuthContext['user']['role'][]) {
  return async (
    c: Context<{ Bindings: Env; Variables: AuthVariables }>,
    next: Next
  ): Promise<Response | void> => {
    const auth = c.get('auth');

    if (!auth) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }, 401);
    }

    if (!allowedRoles.includes(auth.user.role)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      }, 403);
    }

    await next();
  };
}

/**
 * Admin-only middleware
 * Shorthand for requireRole('admin', 'super_admin')
 */
export const requireAdmin = requireRole('admin', 'super_admin');

/**
 * Super admin-only middleware
 * Shorthand for requireRole('super_admin')
 */
export const requireSuperAdmin = requireRole('super_admin');
