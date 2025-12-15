// User roles
export const USER_ROLES = ['super_admin', 'admin', 'user'] as const;

// User statuses
export const USER_STATUSES = ['active', 'inactive', 'pending'] as const;

// Tenant statuses
export const TENANT_STATUSES = ['active', 'inactive', 'suspended'] as const;

// Payment statuses
export const PAYMENT_STATUSES = ['pending', 'confirmed', 'rejected', 'expired'] as const;

// Payment methods
export const PAYMENT_METHODS = ['qris', 'bank_transfer', 'gateway'] as const;

// Subscription statuses
export const SUBSCRIPTION_STATUSES = ['active', 'canceled', 'expired', 'past_due'] as const;

// Billing intervals
export const BILLING_INTERVALS = ['monthly', 'yearly', 'lifetime'] as const;

// Notification types
export const NOTIFICATION_TYPES = [
  'payment_pending',
  'payment_confirmed',
  'payment_rejected',
  'subscription_expiring',
  'subscription_expired',
  'welcome',
  'password_reset',
] as const;

// Notification channels
export const NOTIFICATION_CHANNELS = ['telegram', 'email'] as const;

// Notification statuses
export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed'] as const;

// File upload limits
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Session settings
export const SESSION = {
  EXPIRY_DAYS: 30,
  COOKIE_NAME: 'session',
} as const;

// API rate limits
export const RATE_LIMITS = {
  DEFAULT: {
    requests: 100,
    window: 60, // seconds
  },
  AUTH: {
    requests: 10,
    window: 60,
  },
} as const;
