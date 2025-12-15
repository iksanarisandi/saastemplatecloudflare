import type { Session, User, Tenant, AuthContext } from '@saas/shared';

/**
 * Serialized session data for storage/transmission
 */
export interface SerializedSession {
  id: string;
  userId: string;
  tenantId: string;
  expiresAt: string; // ISO date string
  createdAt: string; // ISO date string
}

/**
 * Serialized auth context for API responses
 */
export interface SerializedAuthContext {
  user: SerializedUser;
  session: SerializedSession;
  tenant: SerializedTenant;
}

/**
 * Serialized user data (without sensitive fields)
 */
export interface SerializedUser {
  id: string;
  email: string;
  role: string;
  status: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Serialized tenant data
 */
export interface SerializedTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings: {
    features: string[];
    limits: {
      maxUsers: number;
      maxStorage: number;
    };
    branding?: {
      logo?: string;
      primaryColor?: string;
      name?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Serialize a session object to JSON-safe format
 * @param session - Session object
 * @returns Serialized session
 */
export function serializeSession(session: Session): SerializedSession {
  return {
    id: session.id,
    userId: session.userId,
    tenantId: session.tenantId,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
  };
}

/**
 * Deserialize a session from JSON format
 * @param data - Serialized session data
 * @returns Session object
 */
export function deserializeSession(data: SerializedSession): Session {
  return {
    id: data.id,
    userId: data.userId,
    tenantId: data.tenantId,
    expiresAt: new Date(data.expiresAt),
    createdAt: new Date(data.createdAt),
  };
}

/**
 * Serialize a user object (excluding sensitive data like passwordHash)
 * @param user - User object
 * @returns Serialized user
 */
export function serializeUser(user: User): SerializedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    tenantId: user.tenantId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * Serialize a tenant object
 * @param tenant - Tenant object
 * @returns Serialized tenant
 */
export function serializeTenant(tenant: Tenant): SerializedTenant {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    status: tenant.status,
    settings: tenant.settings,
    createdAt: tenant.createdAt.toISOString(),
    updatedAt: tenant.updatedAt.toISOString(),
  };
}

/**
 * Serialize full auth context for API response
 * @param context - Auth context
 * @returns Serialized auth context
 */
export function serializeAuthContext(context: AuthContext): SerializedAuthContext {
  return {
    user: serializeUser(context.user),
    session: serializeSession(context.session),
    tenant: serializeTenant(context.tenant),
  };
}

/**
 * Encode session to JSON string
 * @param session - Session object
 * @returns JSON string
 */
export function encodeSession(session: Session): string {
  return JSON.stringify(serializeSession(session));
}

/**
 * Decode session from JSON string
 * @param json - JSON string
 * @returns Session object
 */
export function decodeSession(json: string): Session {
  const data = JSON.parse(json) as SerializedSession;
  return deserializeSession(data);
}

/**
 * Validate serialized session data structure
 * @param data - Unknown data to validate
 * @returns true if data is valid SerializedSession
 */
export function isValidSerializedSession(data: unknown): data is SerializedSession {
  if (typeof data !== 'object' || data === null) return false;
  
  const obj = data as Record<string, unknown>;
  
  return (
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.tenantId === 'string' &&
    typeof obj.expiresAt === 'string' &&
    typeof obj.createdAt === 'string' &&
    !isNaN(Date.parse(obj.expiresAt)) &&
    !isNaN(Date.parse(obj.createdAt))
  );
}
