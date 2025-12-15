import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  createUserInputSchema,
  updateUserInputSchema,
  userSearchQuerySchema,
} from '@saas/shared';
import { UserService } from '../services/user.service';
import {
  success,
  successPaginated,
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

type UsersEnv = { Bindings: Env; Variables: TenantVariables & { requestId: string } };

const usersRoutes = new Hono<UsersEnv>();

// All user routes require authentication and tenant context
usersRoutes.use('*', authMiddleware);
usersRoutes.use('*', tenantMiddleware);

/**
 * GET /users
 * List all users with pagination and optional search
 * Requirement 3.1: Display paginated list of all users
 * Requirement 3.5: Filter users by email, name, or role
 */
usersRoutes.get(
  '/',
  requireAdmin,
  zValidator('query', userSearchQuerySchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Invalid query parameters', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const { q, page, limit } = c.req.valid('query');
    const tenantId = c.get('tenantId');
    const userService = new UserService(c.env.DB, tenantId);

    const pagination = { page, limit };

    const result = q
      ? await userService.searchUsers(q, pagination)
      : await userService.listUsers(pagination);

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    return successPaginated(c, result.data);
  }
);


/**
 * POST /users
 * Create a new user
 * Requirement 3.2: Validate input data and create the user with specified role
 */
usersRoutes.post(
  '/',
  requireAdmin,
  zValidator('json', createUserInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const tenantId = c.get('tenantId');
    const userService = new UserService(c.env.DB, tenantId);

    const result = await userService.createUser(data);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        EMAIL_EXISTS: 409,
        INVALID_ROLE: 400,
        INTERNAL_ERROR: 500,
      };
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 409 | 500
      );
    }

    return success(c, {
      id: result.data.id,
      email: result.data.email,
      role: result.data.role,
      status: result.data.status,
      tenantId: result.data.tenantId,
      createdAt: result.data.createdAt.toISOString(),
    }, 201);
  }
);

/**
 * GET /users/:id
 * Get a user by ID
 */
usersRoutes.get('/:id', requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const userService = new UserService(c.env.DB, tenantId);

  const result = await userService.getUserById(userId);

  if (!result.success) {
    if (result.error.code === 'USER_NOT_FOUND') {
      return notFound(c, 'User', userId);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  return success(c, {
    id: result.data.id,
    email: result.data.email,
    role: result.data.role,
    status: result.data.status,
    tenantId: result.data.tenantId,
    createdAt: result.data.createdAt.toISOString(),
    updatedAt: result.data.updatedAt.toISOString(),
  });
});

/**
 * PATCH /users/:id
 * Update a user
 * Requirement 3.3: Modify the user's role and update permissions immediately
 */
usersRoutes.patch(
  '/:id',
  requireAdmin,
  zValidator('json', updateUserInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const userId = c.req.param('id');
    const data = c.req.valid('json');
    const tenantId = c.get('tenantId');
    const auth = c.get('auth');
    const userService = new UserService(c.env.DB, tenantId);

    const result = await userService.updateUser(userId, data, auth.user.id);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        USER_NOT_FOUND: 404,
        EMAIL_EXISTS: 409,
        INVALID_ROLE: 400,
        CANNOT_CHANGE_OWN_ROLE: 403,
        INTERNAL_ERROR: 500,
      };
      
      if (result.error.code === 'USER_NOT_FOUND') {
        return notFound(c, 'User', userId);
      }
      if (result.error.code === 'CANNOT_CHANGE_OWN_ROLE') {
        return forbidden(c, result.error.message);
      }
      
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 404 | 409 | 500
      );
    }

    return success(c, {
      id: result.data.id,
      email: result.data.email,
      role: result.data.role,
      status: result.data.status,
      tenantId: result.data.tenantId,
      createdAt: result.data.createdAt.toISOString(),
      updatedAt: result.data.updatedAt.toISOString(),
    });
  }
);

/**
 * DELETE /users/:id
 * Deactivate a user (soft delete)
 * Requirement 3.4: Mark the user as inactive and invalidate all active sessions
 */
usersRoutes.delete('/:id', requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const tenantId = c.get('tenantId');
  const auth = c.get('auth');
  const userService = new UserService(c.env.DB, tenantId);

  const result = await userService.deactivateUser(userId, auth.user.id);

  if (!result.success) {
    if (result.error.code === 'USER_NOT_FOUND') {
      return notFound(c, 'User', userId);
    }
    if (result.error.code === 'CANNOT_DEACTIVATE_SELF') {
      return forbidden(c, result.error.message);
    }
    return error(
      c,
      { code: result.error.code, message: result.error.message },
      500
    );
  }

  return success(c, {
    id: result.data.id,
    status: result.data.status,
    message: 'User deactivated successfully',
  });
});

export { usersRoutes };
