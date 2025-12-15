import { Lucia, TimeSpan } from 'lucia';
import { D1Adapter } from '@lucia-auth/adapter-sqlite';
import type { User } from '@saas/shared';

/**
 * Session attributes stored in the database
 */
export interface DatabaseSessionAttributes {
  // Additional session attributes can be added here
}

/**
 * User attributes stored in the database
 */
export interface DatabaseUserAttributes {
  email: string;
  role: string;
  status: string;
  tenant_id: string;
}

/**
 * Creates a Lucia instance configured for D1 database
 * @param db - D1 database instance
 * @returns Configured Lucia instance
 */
export function createLucia(db: D1Database) {
  const adapter = new D1Adapter(db, {
    user: 'users',
    session: 'sessions',
  });

  return new Lucia(adapter, {
    sessionExpiresIn: new TimeSpan(30, 'd'), // 30 days
    sessionCookie: {
      name: 'session',
      expires: false, // Session cookies
      attributes: {
        secure: true,
        sameSite: 'lax',
      },
    },
    getUserAttributes: (attributes) => {
      return {
        email: attributes.email,
        role: attributes.role as User['role'],
        status: attributes.status as User['status'],
        tenantId: attributes.tenant_id,
      };
    },
    getSessionAttributes: () => {
      return {};
    },
  });
}

/**
 * Type declaration for Lucia module augmentation
 */
declare module 'lucia' {
  interface Register {
    Lucia: ReturnType<typeof createLucia>;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

/**
 * Session expiration configuration
 */
export const SESSION_CONFIG = {
  /** Session duration in days */
  expirationDays: 30,
  /** Session refresh threshold - refresh if less than this many days remaining */
  refreshThresholdDays: 15,
} as const;

/**
 * Calculates session expiration date
 * @returns Date when session should expire
 */
export function getSessionExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.expirationDays);
  return expiresAt;
}

/**
 * Checks if a session should be refreshed
 * @param expiresAt - Current session expiration date
 * @returns true if session should be refreshed
 */
export function shouldRefreshSession(expiresAt: Date): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + SESSION_CONFIG.refreshThresholdDays);
  return expiresAt < threshold;
}
