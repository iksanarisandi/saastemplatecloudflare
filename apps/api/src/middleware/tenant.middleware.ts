import { Context, Next } from 'hono';
import type { AuthContext, Tenant } from '@saas/shared';
import { TenantRepository } from '@saas/db/repositories';
import type { AuthVariables } from './auth.middleware';

/**
 * Extended variables for tenant-scoped requests
 */
export interface TenantVariables extends AuthVariables {
  tenantId: string;
  tenant: Tenant;
}

/**
 * Tenant middleware for Hono
 * Scopes requests to the authenticated user's tenant and validates tenant status
 * 
 * Requirements: 
 * - 4.2: Automatic tenant scoping for database queries
 * - 4.4: Prevent access for deactivated tenants
 * 
 * This middleware must be used AFTER authMiddleware
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function tenantMiddleware(
  c: Context<{ Bindings: Env; Variables: TenantVariables }>,
  next: Next
): Promise<Response | void> {
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }, 401);
  }

  // Validate tenant status
  // The auth context already contains tenant info, but we re-check for freshness
  const tenantRepo = new TenantRepository(c.env.DB);
  const tenant = await tenantRepo.findById(auth.tenant.id);

  if (!tenant) {
    return c.json({
      success: false,
      error: {
        code: 'TENANT_NOT_FOUND',
        message: 'Tenant not found',
      },
    }, 404);
  }

  // Check tenant status - deny access for inactive or suspended tenants
  if (tenant.status !== 'active') {
    const statusMessages: Record<string, string> = {
      inactive: 'Tenant account is inactive',
      suspended: 'Tenant account has been suspended',
    };

    return c.json({
      success: false,
      error: {
        code: 'TENANT_INACTIVE',
        message: statusMessages[tenant.status] || 'Tenant is not active',
      },
    }, 403);
  }

  // Set tenant context for downstream handlers
  c.set('tenantId', tenant.id);
  c.set('tenant', tenant);

  await next();
}

/**
 * Tenant status validation middleware
 * Lightweight middleware that only checks tenant status without re-fetching
 * Use when tenant data is already validated in auth context
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function validateTenantStatus(
  c: Context<{ Bindings: Env; Variables: AuthVariables }>,
  next: Next
): Promise<Response | void> {
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }, 401);
  }

  if (auth.tenant.status !== 'active') {
    return c.json({
      success: false,
      error: {
        code: 'TENANT_INACTIVE',
        message: 'Tenant is not active',
      },
    }, 403);
  }

  await next();
}

/**
 * Cross-tenant access middleware for super admins
 * Allows super admins to access resources across tenants
 * 
 * @param c - Hono context
 * @param next - Next middleware function
 */
export async function crossTenantMiddleware(
  c: Context<{ Bindings: Env; Variables: TenantVariables }>,
  next: Next
): Promise<Response | void> {
  const auth = c.get('auth') as AuthContext | undefined;

  if (!auth) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    }, 401);
  }

  // Check if a specific tenant is requested via header or query param
  const requestedTenantId = c.req.header('X-Tenant-Id') || c.req.query('tenant_id');

  if (requestedTenantId && requestedTenantId !== auth.tenant.id) {
    // Only super admins can access other tenants
    if (auth.user.role !== 'super_admin') {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cross-tenant access not allowed',
        },
      }, 403);
    }

    // Validate the requested tenant exists and is accessible
    const tenantRepo = new TenantRepository(c.env.DB);
    const tenant = await tenantRepo.findById(requestedTenantId);

    if (!tenant) {
      return c.json({
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'Requested tenant not found',
        },
      }, 404);
    }

    // Set the requested tenant context
    c.set('tenantId', tenant.id);
    c.set('tenant', tenant);
  } else {
    // Use the authenticated user's tenant
    c.set('tenantId', auth.tenant.id);
    c.set('tenant', auth.tenant);
  }

  await next();
}
