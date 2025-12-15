import type { 
  User, 
  UserRole,
  UserStatus,
  Pagination,
  PaginatedResult,
  Result,
} from '@saas/shared';
import { UserRepository, SessionRepository } from '@saas/db/repositories';
import { hashPassword } from '../lib/password';

/**
 * User service error types
 */
export type UserErrorCode = 
  | 'USER_NOT_FOUND'
  | 'EMAIL_EXISTS'
  | 'INVALID_ROLE'
  | 'CANNOT_DEACTIVATE_SELF'
  | 'CANNOT_CHANGE_OWN_ROLE'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'INTERNAL_ERROR';

export interface UserError {
  code: UserErrorCode;
  message: string;
}

/**
 * Input for creating a new user
 */
export interface CreateUserInput {
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
}

/**
 * Input for updating a user
 */
export interface UpdateUserInput {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
}

/**
 * User Service
 * Handles user management operations for admins
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export class UserService {
  private db: D1Database;
  private tenantId: string;

  constructor(db: D1Database, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  /**
   * List all users with pagination
   * Requirement 3.1: Display paginated list of all users with their roles and status
   * @param pagination - Pagination parameters
   * @returns Paginated list of users
   */
  async listUsers(pagination: Pagination = { page: 1, limit: 20 }): Promise<Result<PaginatedResult<User>, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      const result = await userRepo.findAll(pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('List users error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
      };
    }
  }

  /**
   * Search users by email, name, or role
   * Requirement 3.5: Filter users by email, name, or role
   * @param query - Search query
   * @param pagination - Pagination parameters
   * @returns Paginated list of matching users
   */
  async searchUsers(query: string, pagination: Pagination = { page: 1, limit: 20 }): Promise<Result<PaginatedResult<User>, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      const result = await userRepo.search(query, pagination);
      return { success: true, data: result };
    } catch (error) {
      console.error('Search users error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to search users' },
      };
    }
  }

  /**
   * Get a user by ID
   * @param userId - User ID
   * @returns User or error
   */
  async getUserById(userId: string): Promise<Result<User, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      const user = await userRepo.findById(userId);
      
      if (!user) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      return { success: true, data: user };
    } catch (error) {
      console.error('Get user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get user' },
      };
    }
  }

  /**
   * Create a new user
   * Requirement 3.2: Validate input data and create the user with specified role
   * @param data - User creation data
   * @returns Created user or error
   */
  async createUser(data: CreateUserInput): Promise<Result<User, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      
      // Check if email already exists in tenant
      const existingUser = await userRepo.findByEmailInTenant(data.email);
      if (existingUser) {
        return {
          success: false,
          error: { code: 'EMAIL_EXISTS', message: 'Email already exists in this tenant' },
        };
      }

      // Validate role
      if (!this.isValidRole(data.role)) {
        return {
          success: false,
          error: { code: 'INVALID_ROLE', message: 'Invalid user role' },
        };
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const user = await userRepo.create({
        email: data.email,
        passwordHash,
        role: data.role,
        status: data.status || 'active',
        tenantId: this.tenantId,
      });

      return { success: true, data: user };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create user' },
      };
    }
  }

  /**
   * Update a user
   * @param userId - User ID to update
   * @param data - Update data
   * @param currentUserId - ID of the user performing the update (for self-modification checks)
   * @returns Updated user or error
   */
  async updateUser(
    userId: string, 
    data: UpdateUserInput, 
    currentUserId?: string
  ): Promise<Result<User, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      
      // Check if user exists
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      // Prevent changing own role
      if (currentUserId && userId === currentUserId && data.role !== undefined) {
        return {
          success: false,
          error: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'Cannot change your own role' },
        };
      }

      // Validate role if provided
      if (data.role !== undefined && !this.isValidRole(data.role)) {
        return {
          success: false,
          error: { code: 'INVALID_ROLE', message: 'Invalid user role' },
        };
      }

      // Check email uniqueness if changing email
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await userRepo.findByEmailInTenant(data.email);
        if (emailExists) {
          return {
            success: false,
            error: { code: 'EMAIL_EXISTS', message: 'Email already exists in this tenant' },
          };
        }
      }

      // Update user
      const updatedUser = await userRepo.update(userId, data);
      if (!updatedUser) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
        };
      }

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user' },
      };
    }
  }

  /**
   * Update user role
   * Requirement 3.3: Modify the user's role and update permissions immediately
   * @param userId - User ID
   * @param role - New role
   * @param currentUserId - ID of the user performing the update
   * @returns Updated user or error
   */
  async updateUserRole(
    userId: string, 
    role: UserRole, 
    currentUserId?: string
  ): Promise<Result<User, UserError>> {
    return this.updateUser(userId, { role }, currentUserId);
  }

  /**
   * Deactivate a user
   * Requirement 3.4: Mark the user as inactive and invalidate all active sessions
   * @param userId - User ID to deactivate
   * @param currentUserId - ID of the user performing the deactivation
   * @returns Deactivated user or error
   */
  async deactivateUser(userId: string, currentUserId?: string): Promise<Result<User, UserError>> {
    try {
      // Prevent self-deactivation
      if (currentUserId && userId === currentUserId) {
        return {
          success: false,
          error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'Cannot deactivate your own account' },
        };
      }

      const userRepo = new UserRepository(this.db, this.tenantId);
      
      // Check if user exists
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      // Update user status to inactive
      const updatedUser = await userRepo.update(userId, { status: 'inactive' });
      if (!updatedUser) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate user' },
        };
      }

      // Invalidate all sessions for this user
      const sessionRepo = new SessionRepository(this.db);
      await sessionRepo.deleteByUserId(userId);

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Deactivate user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate user' },
      };
    }
  }

  /**
   * Activate a user
   * @param userId - User ID to activate
   * @returns Activated user or error
   */
  async activateUser(userId: string): Promise<Result<User, UserError>> {
    try {
      const userRepo = new UserRepository(this.db, this.tenantId);
      
      // Check if user exists
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      // Update user status to active
      const updatedUser = await userRepo.update(userId, { status: 'active' });
      if (!updatedUser) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to activate user' },
        };
      }

      return { success: true, data: updatedUser };
    } catch (error) {
      console.error('Activate user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to activate user' },
      };
    }
  }

  /**
   * Delete a user
   * @param userId - User ID to delete
   * @param currentUserId - ID of the user performing the deletion
   * @returns Success or error
   */
  async deleteUser(userId: string, currentUserId?: string): Promise<Result<void, UserError>> {
    try {
      // Prevent self-deletion
      if (currentUserId && userId === currentUserId) {
        return {
          success: false,
          error: { code: 'CANNOT_DEACTIVATE_SELF', message: 'Cannot delete your own account' },
        };
      }

      const userRepo = new UserRepository(this.db, this.tenantId);
      
      // Check if user exists
      const existingUser = await userRepo.findById(userId);
      if (!existingUser) {
        return {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        };
      }

      // Delete all sessions for this user first
      const sessionRepo = new SessionRepository(this.db);
      await sessionRepo.deleteByUserId(userId);

      // Delete user
      const deleted = await userRepo.delete(userId);
      if (!deleted) {
        return {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' },
        };
      }

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete user' },
      };
    }
  }

  /**
   * Validate if a role is valid
   * @param role - Role to validate
   * @returns true if valid
   */
  private isValidRole(role: string): role is UserRole {
    return ['super_admin', 'admin', 'user'].includes(role);
  }
}
