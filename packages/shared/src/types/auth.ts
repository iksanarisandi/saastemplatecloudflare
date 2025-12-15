export type UserRole = 'super_admin' | 'admin' | 'user';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  tenantId: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: Date;
  tenantId: string;
  createdAt: Date;
}

export interface AuthContext {
  user: User;
  session: Session;
  tenant: Tenant;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ResetPasswordInput {
  email: string;
}

export interface ChangePasswordInput {
  token: string;
  newPassword: string;
}

// Import Tenant type
import type { Tenant } from './tenant';
