import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { TenantRepository } from '@saas/db/repositories';
import {
  success,
  error,
  notFound,
  badRequest,
  forbidden,
} from '../lib/response';
import {
  authMiddleware,
  requireAdmin,
} from '../middleware/auth.middleware';
import { tenantMiddleware, type TenantVariables } from '../middleware/tenant.middleware';

type TenantsEnv = { Bindings: Env; Variables: TenantVariables & { requestId: string } };

const tenantsRoutes = new Hono<TenantsEnv>();

// All tenant routes require authentication and tenant context
tenantsRoutes.use('*', authMiddleware);
tenantsRoutes.use('*', tenantMiddleware);

// Validation schemas
const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
});

const updateTenantSettingsSchema = z.object({
  features: z.array(z.string()).optional(),
  limits: z.object({
    maxUsers: z.number().int().positive().optional(),
    maxStorage: z.number().int().positive().optional(),
  }).optional(),
  branding: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    name: z.string().max(100).optional(),
  }).optional(),
});

/**
 * GET /tenants/:id
 * Get tenant by ID
 * Requirement 4.1: Generate a unique tenant identifier
 */
tenantsRoutes.get('/:id', requireAdmin, async (c) => {
  const tenantId = c.req.param('id');
  const auth = c.get('auth');

  // Users can only access their own tenant unless super_admin
  if (auth.user.role !== 'super_admin' && tenantId !== auth.tenant.id) {
    return forbidden(c, 'Cannot access other tenants');
  }

  const tenantRepo = new TenantRepository(c.env.DB);
  const tenant = await tenantRepo.findById(tenantId);

  if (!tenant) {
    return notFound(c, 'Tenant', tenantId);
  }

  return success(c, {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    settings: tenant.settings,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  });
});


/**
 * PATCH /tenants/:id
 * Update tenant
 * Requirement 4.3: Persist changes to D1 and apply them immediately
 */
tenantsRoutes.patch(
  '/:id',
  requireAdmin,
  zValidator('json', updateTenantSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const tenantId = c.req.param('id');
    const data = c.req.valid('json');
    const auth = c.get('auth');

    // Users can only update their own tenant unless super_admin
    if (auth.user.role !== 'super_admin' && tenantId !== auth.tenant.id) {
      return forbidden(c, 'Cannot update other tenants');
    }

    // Only super_admin can change tenant status
    if (data.status && auth.user.role !== 'super_admin') {
      return forbidden(c, 'Only super admin can change tenant status');
    }

    const tenantRepo = new TenantRepository(c.env.DB);
    const tenant = await tenantRepo.update(tenantId, data);

    if (!tenant) {
      return notFound(c, 'Tenant', tenantId);
    }

    return success(c, {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      settings: tenant.settings,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    });
  }
);

/**
 * GET /tenants/:id/settings
 * Get tenant settings
 * Requirement 4.3: Tenant settings management
 */
tenantsRoutes.get('/:id/settings', requireAdmin, async (c) => {
  const tenantId = c.req.param('id');
  const auth = c.get('auth');

  // Users can only access their own tenant settings unless super_admin
  if (auth.user.role !== 'super_admin' && tenantId !== auth.tenant.id) {
    return forbidden(c, 'Cannot access other tenant settings');
  }

  const tenantRepo = new TenantRepository(c.env.DB);
  const tenant = await tenantRepo.findById(tenantId);

  if (!tenant) {
    return notFound(c, 'Tenant', tenantId);
  }

  return success(c, tenant.settings);
});

/**
 * PATCH /tenants/:id/settings
 * Update tenant settings
 * Requirement 4.3: Persist changes to D1 and apply them immediately
 */
tenantsRoutes.patch(
  '/:id/settings',
  requireAdmin,
  zValidator('json', updateTenantSettingsSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const tenantId = c.req.param('id');
    const data = c.req.valid('json');
    const auth = c.get('auth');

    // Users can only update their own tenant settings unless super_admin
    if (auth.user.role !== 'super_admin' && tenantId !== auth.tenant.id) {
      return forbidden(c, 'Cannot update other tenant settings');
    }

    const tenantRepo = new TenantRepository(c.env.DB);
    const existingTenant = await tenantRepo.findById(tenantId);

    if (!existingTenant) {
      return notFound(c, 'Tenant', tenantId);
    }

    // Merge settings
    const updatedSettings = {
      ...existingTenant.settings,
      ...(data.features && { features: data.features }),
      ...(data.limits && {
        limits: {
          ...existingTenant.settings.limits,
          ...data.limits,
        },
      }),
      ...(data.branding && {
        branding: {
          ...existingTenant.settings.branding,
          ...data.branding,
        },
      }),
    };

    const tenant = await tenantRepo.update(tenantId, { settings: updatedSettings });

    if (!tenant) {
      return error(c, { code: 'INTERNAL_ERROR', message: 'Failed to update settings' }, 500);
    }

    return success(c, tenant.settings);
  }
);

export { tenantsRoutes };
