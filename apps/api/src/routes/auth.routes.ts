import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  registerInputSchema,
  loginInputSchema,
  resetPasswordInputSchema,
  changePasswordInputSchema,
} from '@saas/shared';
import { AuthService } from '../services/auth.service';
import {
  success,
  error,
  unauthorized,
  badRequest,
} from '../lib/response';
import { authMiddleware, type AuthVariables } from '../middleware/auth.middleware';

type AuthEnv = { Bindings: Env; Variables: AuthVariables & { requestId: string } };

const authRoutes = new Hono<AuthEnv>();

/**
 * POST /auth/register
 * Register a new user account
 * Requirement 2.1: Create a new user account and store credentials securely
 */
authRoutes.post(
  '/register',
  zValidator('json', registerInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const authService = new AuthService(c.env.DB);

    const result = await authService.register(data);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        EMAIL_EXISTS: 409,
        INTERNAL_ERROR: 500,
      };
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 409 | 500
      );
    }

    // Set session cookie
    c.header(
      'Set-Cookie',
      `session=${result.data.session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return success(c, {
      user: {
        id: result.data.user.id,
        email: result.data.user.email,
        role: result.data.user.role,
        status: result.data.user.status,
        tenantId: result.data.user.tenantId,
      },
      token: result.data.session.id,
      session: {
        id: result.data.session.id,
        expiresAt: result.data.session.expiresAt.toISOString(),
      },
    }, 201);
  }
);


/**
 * POST /auth/login
 * Login with email and password
 * Requirement 2.2: Create a session and return a session token
 * Requirement 2.3: Reject login with invalid credentials
 */
authRoutes.post(
  '/login',
  zValidator('json', loginInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const authService = new AuthService(c.env.DB);

    const result = await authService.login(data);

    if (!result.success) {
      if (result.error.code === 'INVALID_CREDENTIALS') {
        return unauthorized(c, result.error.message);
      }
      if (result.error.code === 'USER_INACTIVE' || result.error.code === 'TENANT_INACTIVE') {
        return error(
          c,
          { code: 'FORBIDDEN', message: result.error.message },
          403
        );
      }
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    // Set session cookie
    c.header(
      'Set-Cookie',
      `session=${result.data.session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
    );

    return success(c, {
      user: {
        id: result.data.user.id,
        email: result.data.user.email,
        role: result.data.user.role,
        status: result.data.user.status,
        tenantId: result.data.user.tenantId,
      },
      token: result.data.session.id,
      session: {
        id: result.data.session.id,
        expiresAt: result.data.session.expiresAt.toISOString(),
      },
    });
  }
);

/**
 * POST /auth/logout
 * Logout and invalidate session
 * Requirement 2.5: Invalidate the current session immediately
 */
authRoutes.post('/logout', authMiddleware, async (c) => {
  const auth = c.get('auth');
  const authService = new AuthService(c.env.DB);

  await authService.logout(auth.session.id);

  // Clear session cookie
  c.header(
    'Set-Cookie',
    'session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );

  return success(c, { message: 'Logged out successfully' });
});

/**
 * POST /auth/password-reset
 * Request password reset
 * Requirement 2.4: Generate a secure reset token
 */
authRoutes.post(
  '/password-reset',
  zValidator('json', resetPasswordInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const authService = new AuthService(c.env.DB);

    const result = await authService.requestPasswordReset(data);

    if (!result.success) {
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        500
      );
    }

    // In production, the token would be sent via email/notification
    // For development, we return it in the response
    return success(c, {
      message: 'If an account exists with this email, a reset link has been sent',
      // Only include token in non-production for testing
      ...(c.env.ENVIRONMENT !== 'production' && { token: result.data.token }),
    });
  }
);

/**
 * POST /auth/password-reset/confirm
 * Confirm password reset with token
 * Requirement 2.4: Reset password using token
 */
authRoutes.post(
  '/password-reset/confirm',
  zValidator('json', changePasswordInputSchema, (result, c) => {
    if (!result.success) {
      return badRequest(c, 'Validation failed', {
        fields: result.error.flatten().fieldErrors,
      });
    }
  }),
  async (c) => {
    const data = c.req.valid('json');
    const authService = new AuthService(c.env.DB);

    const result = await authService.changePassword(data);

    if (!result.success) {
      const statusMap: Record<string, number> = {
        INVALID_TOKEN: 400,
        TOKEN_EXPIRED: 400,
        USER_NOT_FOUND: 404,
        INTERNAL_ERROR: 500,
      };
      return error(
        c,
        { code: result.error.code, message: result.error.message },
        (statusMap[result.error.code] || 400) as 400 | 404 | 500
      );
    }

    return success(c, { message: 'Password has been reset successfully' });
  }
);

/**
 * GET /auth/me
 * Get current authenticated user info
 * Requirement 2.6: Verify token and return user context
 */
authRoutes.get('/me', authMiddleware, async (c) => {
  const auth = c.get('auth');

  // Return user directly as PublicUser (matching frontend expectation)
  return success(c, {
    id: auth.user.id,
    email: auth.user.email,
    role: auth.user.role,
    status: auth.user.status,
    tenantId: auth.user.tenantId,
    createdAt: auth.user.createdAt.toISOString(),
    updatedAt: auth.user.updatedAt.toISOString(),
  });
});

export { authRoutes };
