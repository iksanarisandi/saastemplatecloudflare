import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'payment_pending',
  'payment_confirmed',
  'payment_rejected',
  'subscription_expiring',
  'subscription_expired',
  'welcome',
  'password_reset',
]);

export const notificationChannelSchema = z.enum(['telegram', 'email']);

export const notificationStatusSchema = z.enum(['pending', 'sent', 'failed']);

export const sendNotificationInputSchema = z.object({
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  recipient: z.string().min(1, 'Recipient is required'),
  subject: z.string().optional(),
  body: z.string().min(1, 'Body is required'),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: notificationTypeSchema,
  channel: notificationChannelSchema,
  recipient: z.string(),
  subject: z.string().optional(),
  body: z.string(),
  status: notificationStatusSchema,
  metadata: z.record(z.unknown()),
  sentAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
});

export type SendNotificationInputSchema = z.infer<typeof sendNotificationInputSchema>;
export type NotificationSchema = z.infer<typeof notificationSchema>;
