import type { 
  Notification, 
  NotificationType, 
  NotificationChannel, 
  NotificationStatus,
  SendNotificationInput 
} from '../types/notification';

/**
 * Serialized notification format for API responses
 * Requirement 7.6: JSON encoding for channel APIs
 */
export interface SerializedNotification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  sentAt?: string;
  createdAt: string;
}

/**
 * Input format for deserializing notification from request
 */
export interface NotificationRequestBody {
  id?: string;
  type?: string;
  channel?: string;
  recipient?: string;
  subject?: string;
  body?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  sentAt?: string;
  createdAt?: string;
}

/**
 * Telegram API payload format
 */
export interface TelegramPayload {
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  reply_markup?: {
    inline_keyboard?: Array<Array<{
      text: string;
      url?: string;
      callback_data?: string;
    }>>;
  };
}

/**
 * Email API payload format (generic)
 */
export interface EmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}


/**
 * Valid notification types
 */
const VALID_NOTIFICATION_TYPES: NotificationType[] = [
  'payment_pending',
  'payment_confirmed',
  'payment_rejected',
  'subscription_expiring',
  'subscription_expired',
  'welcome',
  'password_reset',
];

/**
 * Valid notification channels
 */
const VALID_NOTIFICATION_CHANNELS: NotificationChannel[] = ['telegram', 'email'];

/**
 * Valid notification statuses
 */
const VALID_NOTIFICATION_STATUSES: NotificationStatus[] = ['pending', 'sent', 'failed'];

/**
 * Serialize a Notification object to JSON-safe format for API response
 * Requirement 7.6: Encode the message data to JSON format
 * @param notification - Notification object to serialize
 * @returns Serialized notification with ISO date strings
 */
export function serializeNotification(notification: Notification): SerializedNotification {
  return {
    id: notification.id,
    type: notification.type,
    channel: notification.channel,
    recipient: notification.recipient,
    subject: notification.subject,
    body: notification.body,
    status: notification.status,
    metadata: notification.metadata,
    sentAt: notification.sentAt?.toISOString(),
    createdAt: notification.createdAt.toISOString(),
  };
}

/**
 * Serialize an array of Notification objects
 * @param notifications - Array of Notification objects
 * @returns Array of serialized notifications
 */
export function serializeNotifications(notifications: Notification[]): SerializedNotification[] {
  return notifications.map(serializeNotification);
}

/**
 * Deserialize a notification from JSON request body
 * @param body - Request body with notification data
 * @returns Notification object with Date objects
 * @throws Error if required fields are missing or invalid
 */
export function deserializeNotification(body: NotificationRequestBody): Notification {
  // Validate type
  const type = body.type as NotificationType;
  if (body.type && !VALID_NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type: ${body.type}`);
  }

  // Validate channel
  const channel = body.channel as NotificationChannel;
  if (body.channel && !VALID_NOTIFICATION_CHANNELS.includes(channel)) {
    throw new Error(`Invalid notification channel: ${body.channel}`);
  }

  // Validate status
  const status = body.status as NotificationStatus;
  if (body.status && !VALID_NOTIFICATION_STATUSES.includes(status)) {
    throw new Error(`Invalid notification status: ${body.status}`);
  }

  return {
    id: body.id ?? '',
    type: type ?? 'welcome',
    channel: channel ?? 'email',
    recipient: body.recipient ?? '',
    subject: body.subject,
    body: body.body ?? '',
    status: status ?? 'pending',
    metadata: body.metadata ?? {},
    sentAt: body.sentAt ? new Date(body.sentAt) : undefined,
    createdAt: body.createdAt ? new Date(body.createdAt) : new Date(),
  };
}


/**
 * Deserialize a SendNotificationInput from request body
 * @param body - Request body
 * @returns SendNotificationInput object
 * @throws Error if required fields are missing or invalid
 */
export function deserializeSendNotificationInput(body: NotificationRequestBody): SendNotificationInput {
  if (!body.type) {
    throw new Error('Notification type is required');
  }
  if (!body.channel) {
    throw new Error('Notification channel is required');
  }
  if (!body.recipient) {
    throw new Error('Notification recipient is required');
  }
  if (!body.body) {
    throw new Error('Notification body is required');
  }

  const type = body.type as NotificationType;
  if (!VALID_NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`Invalid notification type: ${body.type}`);
  }

  const channel = body.channel as NotificationChannel;
  if (!VALID_NOTIFICATION_CHANNELS.includes(channel)) {
    throw new Error(`Invalid notification channel: ${body.channel}`);
  }

  return {
    type,
    channel,
    recipient: body.recipient,
    subject: body.subject,
    body: body.body,
    metadata: body.metadata,
  };
}

/**
 * Check if a serialized notification is valid
 * @param notification - Serialized notification to validate
 * @returns true if valid
 */
export function isValidSerializedNotification(notification: unknown): notification is SerializedNotification {
  if (!notification || typeof notification !== 'object') return false;
  
  const n = notification as Record<string, unknown>;
  
  return (
    typeof n.id === 'string' &&
    typeof n.type === 'string' &&
    VALID_NOTIFICATION_TYPES.includes(n.type as NotificationType) &&
    typeof n.channel === 'string' &&
    VALID_NOTIFICATION_CHANNELS.includes(n.channel as NotificationChannel) &&
    typeof n.recipient === 'string' &&
    typeof n.body === 'string' &&
    typeof n.status === 'string' &&
    VALID_NOTIFICATION_STATUSES.includes(n.status as NotificationStatus) &&
    typeof n.createdAt === 'string'
  );
}

/**
 * Convert serialized notification back to Notification object
 * Used for round-trip testing
 * @param serialized - Serialized notification
 * @returns Notification object
 */
export function fromSerializedNotification(serialized: SerializedNotification): Notification {
  return {
    id: serialized.id,
    type: serialized.type,
    channel: serialized.channel,
    recipient: serialized.recipient,
    subject: serialized.subject,
    body: serialized.body,
    status: serialized.status,
    metadata: serialized.metadata,
    sentAt: serialized.sentAt ? new Date(serialized.sentAt) : undefined,
    createdAt: new Date(serialized.createdAt),
  };
}


/**
 * Create a Telegram API payload from notification
 * Requirement 7.6: Encode the message data to JSON format for the target channel API
 * @param notification - Notification to convert
 * @param chatId - Telegram chat ID
 * @param parseMode - Parse mode for formatting
 * @returns Telegram API payload
 */
export function toTelegramPayload(
  notification: Notification,
  chatId: string,
  parseMode: 'HTML' | 'Markdown' | 'MarkdownV2' = 'HTML'
): TelegramPayload {
  const parts: string[] = [];

  // Add subject if present
  if (notification.subject) {
    if (parseMode === 'HTML') {
      parts.push(`<b>${escapeHtml(notification.subject)}</b>`);
    } else {
      parts.push(`*${escapeMarkdown(notification.subject)}*`);
    }
    parts.push('');
  }

  // Add body
  if (parseMode === 'HTML') {
    parts.push(escapeHtml(notification.body));
  } else {
    parts.push(escapeMarkdown(notification.body));
  }

  return {
    chat_id: chatId,
    text: parts.join('\n'),
    parse_mode: parseMode,
    disable_web_page_preview: true,
  };
}

/**
 * Create an Email API payload from notification
 * Requirement 7.6: Encode the message data to JSON format for the target channel API
 * @param notification - Notification to convert
 * @param fromEmail - Sender email address
 * @param fromName - Sender name (optional)
 * @returns Email API payload
 */
export function toEmailPayload(
  notification: Notification,
  fromEmail: string,
  fromName?: string
): EmailPayload {
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  
  return {
    from,
    to: notification.recipient,
    subject: notification.subject ?? getDefaultSubject(notification.type),
    html: `<p>${escapeHtml(notification.body).replace(/\n/g, '<br>')}</p>`,
    text: notification.body,
  };
}

/**
 * Get default subject for notification type
 * @param type - Notification type
 * @returns Default subject string
 */
function getDefaultSubject(type: NotificationType): string {
  const subjectMap: Record<NotificationType, string> = {
    payment_pending: 'Payment Pending',
    payment_confirmed: 'Payment Confirmed',
    payment_rejected: 'Payment Rejected',
    subscription_expiring: 'Subscription Expiring',
    subscription_expired: 'Subscription Expired',
    welcome: 'Welcome',
    password_reset: 'Password Reset',
  };
  return subjectMap[type] ?? 'Notification';
}

/**
 * Escape HTML special characters
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape Markdown special characters
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/**
 * Validate that a payload can be serialized to JSON
 * @param payload - Payload to validate
 * @returns true if payload can be serialized
 */
export function isJsonSerializable(payload: unknown): boolean {
  try {
    JSON.stringify(payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely serialize payload to JSON string
 * @param payload - Payload to serialize
 * @returns JSON string or null if serialization fails
 */
export function safeJsonStringify(payload: unknown): string | null {
  try {
    return JSON.stringify(payload);
  } catch {
    return null;
  }
}
