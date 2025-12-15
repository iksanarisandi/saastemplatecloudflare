export type NotificationType =
  | 'payment_pending'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'welcome'
  | 'password_reset';

export type NotificationChannel = 'telegram' | 'email';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  sentAt?: Date;
  createdAt: Date;
}

export interface SendNotificationInput {
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}
