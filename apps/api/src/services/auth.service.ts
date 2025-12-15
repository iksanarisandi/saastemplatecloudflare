import { generateIdFromEntropySize } from 'lucia';
import type { 
  User, 
  Session, 
  RegisterInput, 
  LoginInput, 
  ResetPasswordInput, 
  ChangePasswordInput,
  Result,
  AuthContext,
} from '@saas/shared';
import { UserRepository, TenantRepository, SessionRepository } from '@saas/db/repositories';
import { getSessionExpirationDate } from '../lib/auth';
import { hashPassword, verifyPassword } from '../lib/password';

/**
 * Authentication error types
 */
export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'USER_INACTIVE'
  | 'TENANT_INACTIVE'
  | 'EMAIL_EXISTS'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'SESSION_INVALID'
  | 'SESSION_EXPIRED'
  | 'INTERNAL_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * Password reset token storage (in-memory for now, should use KV in production)
 */
interface PasswordResetToken {
  userId: string;
  email: string;
  expiresAt: Date;
}

/**
 * Authentication Service
 * Handles user registration, login, logout, session management, and password reset
 */
export class AuthService {
  private db: D1Database;
  private resetTokens: Map<string, PasswordResetToken> = new Map();

  constructor(db: D1Database) {
    this.db = db;
  }


  /**
   * Register a new user
   * Creates a new tenant if this is the first user with this email domain
   * @param data - Registration input data
   * @returns Result with created user or error
   */
  async register(data: RegisterInput): Promise<Result<{ user: User; session: Session }, AuthError>> {
    try {
      // Check if email already exists
      const tenantRepo = new TenantRepository(this.db);
      
      // Create a temporary user repo to check email globally
      const existingUser = await this.findUserByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already registered' },
        };
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Generate tenant slug from email domain or name
      const emailDomain = data.email.split('@')[1];
      const tenantSlug = this.generateSlug(data.name || emailDomain);

      // Check if tenant with this slug exists, if not create one
      let tenant = await tenantRepo.findBySlug(tenantSlug);
      if (!tenant) {
        tenant = await tenantRepo.create({
          name: data.name || emailDomain,
          slug: tenantSlug,
          status: 'active',
          settings: {
            features: ['basic'],
            limits: {
              maxUsers: 5,
              maxStorage: 1024 * 1024 * 100, // 100MB
            },
          },
        });
      }

      // Create user
      const userRepo = new UserRepository(this.db, tenant.id);
      const user = await userRepo.create({
        email: data.email,
        passwordHash,
        role: 'admin', // First user is admin
        status: 'active',
        tenantId: tenant.id,
      });

      // Create session
      const sessionRepo = new SessionRepository(this.db);
      const session = await sessionRepo.create({
        userId: user.id,
        tenantId: tenant.id,
        expiresAt: getSessionExpirationDate(),
      });

      return { success: true, data: { user, session } };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to register user' },
      };
    }
  }

  /**
   * Login with email and password
   * @param data - Login credentials
   * @returns Result with session or error
   */
  async login(data: LoginInput): Promise<Result<{ user: User; session: Session }, AuthError>> {
    try {
      // Find user by email
      const user = await this.findUserByEmail(data.email);
      if (!user) {
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        };
      }

      // Check user status
      if (user.status !== 'active') {
        return {
          success: false,
          error: { code: 'USER_INACTIVE', message: 'User account is not active' },
        };
      }

      // Check tenant status
      const tenantRepo = new TenantRepository(this.db);
      const tenant = await tenantRepo.findById(user.tenantId);
      if (!tenant || tenant.status !== 'active') {
        return {
          success: false,
          error: { code: 'TENANT_INACTIVE', message: 'Tenant is not active' },
        };
      }

      // Verify password
      const validPassword = await verifyPassword(user.passwordHash, data.password);
      if (!validPassword) {
        return {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        };
      }

      // Create session
      const sessionRepo = new SessionRepository(this.db);
      const session = await sessionRepo.create({
        userId: user.id,
        tenantId: user.tenantId,
        expiresAt: getSessionExpirationDate(),
      });

      return { success: true, data: { user, session } };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to login' },
      };
    }
  }

  /**
   * Logout - invalidate session
   * @param sessionId - Session ID to invalidate
   * @returns Result indicating success or error
   */
  async logout(sessionId: string): Promise<Result<void, AuthError>> {
    try {
      const sessionRepo = new SessionRepository(this.db);
      const deleted = await sessionRepo.delete(sessionId);
      
      if (!deleted) {
        return {
          success: false,
          error: { code: 'SESSION_INVALID', message: 'Session not found' },
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to logout' },
      };
    }
  }


  /**
   * Validate session and return auth context
   * @param sessionId - Session ID to validate
   * @returns Result with auth context or error
   */
  async validateSession(sessionId: string): Promise<Result<AuthContext, AuthError>> {
    try {
      const sessionRepo = new SessionRepository(this.db);
      const session = await sessionRepo.findValidById(sessionId);
      
      if (!session) {
        return {
          success: false,
          error: { code: 'SESSION_INVALID', message: 'Invalid or expired session' },
        };
      }

      // Get user
      const userRepo = new UserRepository(this.db, session.tenantId);
      const user = await userRepo.findById(session.userId);
      
      if (!user) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      if (user.status !== 'active') {
        return {
          success: false,
          error: { code: 'USER_INACTIVE', message: 'User account is not active' },
        };
      }

      // Get tenant
      const tenantRepo = new TenantRepository(this.db);
      const tenant = await tenantRepo.findById(session.tenantId);
      
      if (!tenant) {
        return {
          success: false,
          error: { code: 'TENANT_INACTIVE', message: 'Tenant not found' },
        };
      }

      if (tenant.status !== 'active') {
        return {
          success: false,
          error: { code: 'TENANT_INACTIVE', message: 'Tenant is not active' },
        };
      }

      return {
        success: true,
        data: { user, session, tenant },
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to validate session' },
      };
    }
  }

  /**
   * Request password reset
   * Generates a reset token and stores it
   * @param data - Reset password input with email
   * @returns Result with token (in production, this would be sent via email)
   */
  async requestPasswordReset(data: ResetPasswordInput): Promise<Result<{ token: string }, AuthError>> {
    try {
      const user = await this.findUserByEmail(data.email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        // Generate a fake token to maintain consistent timing
        const fakeToken = generateIdFromEntropySize(32);
        return { success: true, data: { token: fakeToken } };
      }

      // Generate reset token
      const token = generateIdFromEntropySize(32);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Store token
      this.resetTokens.set(token, {
        userId: user.id,
        email: user.email,
        expiresAt,
      });

      // Clean up expired tokens
      this.cleanupExpiredTokens();

      return { success: true, data: { token } };
    } catch (error) {
      console.error('Password reset request error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to request password reset' },
      };
    }
  }

  /**
   * Change password using reset token
   * @param data - Change password input with token and new password
   * @returns Result indicating success or error
   */
  async changePassword(data: ChangePasswordInput): Promise<Result<void, AuthError>> {
    try {
      const tokenData = this.resetTokens.get(data.token);
      
      if (!tokenData) {
        return {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token' },
        };
      }

      if (tokenData.expiresAt < new Date()) {
        this.resetTokens.delete(data.token);
        return {
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Reset token has expired' },
        };
      }

      // Find user
      const user = await this.findUserByEmail(tokenData.email);
      if (!user) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      // Hash new password
      const passwordHash = await hashPassword(data.newPassword);

      // Update user password
      const userRepo = new UserRepository(this.db, user.tenantId);
      await userRepo.update(user.id, { passwordHash });

      // Invalidate all existing sessions for this user
      const sessionRepo = new SessionRepository(this.db);
      await sessionRepo.deleteByUserId(user.id);

      // Remove used token
      this.resetTokens.delete(data.token);

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Password change error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to change password' },
      };
    }
  }


  /**
   * Invalidate all sessions for a user
   * Used when user is deactivated or password is changed
   * @param userId - User ID
   * @returns Number of sessions invalidated
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    const sessionRepo = new SessionRepository(this.db);
    return sessionRepo.deleteByUserId(userId);
  }

  /**
   * Find user by email across all tenants
   * @param email - User email
   * @returns User or null
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare(
      'SELECT * FROM users WHERE email = ?'
    );
    const result = await stmt.bind(email).first<{
      id: string;
      tenant_id: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>();

    if (!result) return null;

    return {
      id: result.id,
      tenantId: result.tenant_id,
      email: result.email,
      passwordHash: result.password_hash,
      role: result.role as User['role'],
      status: result.status as User['status'],
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    };
  }

  /**
   * Generate URL-safe slug from string
   * @param input - Input string
   * @returns URL-safe slug
   */
  private generateSlug(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Clean up expired reset tokens
   */
  private cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, data] of this.resetTokens.entries()) {
      if (data.expiresAt < now) {
        this.resetTokens.delete(token);
      }
    }
  }

  /**
   * Check if a reset token exists and is valid (for testing)
   * @param token - Reset token
   * @returns true if token is valid
   */
  isValidResetToken(token: string): boolean {
    const tokenData = this.resetTokens.get(token);
    if (!tokenData) return false;
    return tokenData.expiresAt > new Date();
  }

  /**
   * Get all active reset tokens (for testing)
   * @returns Array of tokens
   */
  getActiveResetTokens(): string[] {
    const now = new Date();
    const tokens: string[] = [];
    for (const [token, data] of this.resetTokens.entries()) {
      if (data.expiresAt > now) {
        tokens.push(token);
      }
    }
    return tokens;
  }
}
