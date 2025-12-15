import type {
  Notification,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  SendNotificationInput,
  Result,
} from '@saas/shared';

/**
 * Notification service error types
 */
export type NotificationErrorCode =
  | 'NOTIFICATION_NOT_FOUND'
  | 'CHANNEL_NOT_CONFIGURED'
  | 'CHANNEL_SEND_FAILED'
  | 'INVALID_NOTIFICATION_DATA'
  | 'RETRY_EXHAUSTED'
  | 'INTERNAL_ERROR';

export interface NotificationError {
  code: NotificationErrorCode;
  message: string;
}

/**
 * Channel configuration for notification routing
 * Requirement 7.5: Allow enabling or disabling specific channels per notification type
 */
export interface ChannelConfig {
  telegram?: {
    enabled: boolean;
    botToken: string;
    defaultChatId?: string;
  };
  email?: {
    enabled: boolean;
    apiKey: string;
    fromEmail: string;
    fromName?: string;
  };
}

/**
 * Notification type to channel mapping
 * Requirement 7.5: Configure which channels are enabled per notification type
 */
export interface NotificationTypeConfig {
  [key: string]: NotificationChannel[];
}

/**
 * Retry configuration
 * Requirement 7.4: Retry based on configured retry policy
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  channels: ChannelConfig;
  typeChannelMapping?: NotificationTypeConfig;
  retry?: RetryConfig;
}


/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Default notification type to channel mapping
 */
const DEFAULT_TYPE_CHANNEL_MAPPING: NotificationTypeConfig = {
  payment_pending: ['telegram', 'email'],
  payment_confirmed: ['telegram', 'email'],
  payment_rejected: ['telegram', 'email'],
  subscription_expiring: ['telegram', 'email'],
  subscription_expired: ['telegram', 'email'],
  welcome: ['email'],
  password_reset: ['email'],
};

/**
 * Interface for notification channel adapters
 * Requirement 7.1: Route the message to configured channels
 */
export interface INotificationChannel {
  /**
   * Send a notification through this channel
   * @param notification - Notification to send
   * @returns Result indicating success or failure
   */
  send(notification: Notification): Promise<Result<void, NotificationError>>;
  
  /**
   * Check if the channel is properly configured
   * @returns true if channel is ready to send
   */
  isConfigured(): boolean;
}

/**
 * Notification Service
 * Handles notification routing, sending, and retry logic
 * Requirements: 7.1, 7.4, 7.5
 */
export class NotificationService {
  private channels: Map<NotificationChannel, INotificationChannel> = new Map();
  private config: NotificationServiceConfig;
  private retryConfig: RetryConfig;
  private typeChannelMapping: NotificationTypeConfig;

  constructor(config: NotificationServiceConfig) {
    this.config = config;
    this.retryConfig = config.retry ?? DEFAULT_RETRY_CONFIG;
    this.typeChannelMapping = config.typeChannelMapping ?? DEFAULT_TYPE_CHANNEL_MAPPING;
  }

  /**
   * Register a channel adapter
   * @param channelType - Channel type identifier
   * @param adapter - Channel adapter implementation
   */
  registerChannel(channelType: NotificationChannel, adapter: INotificationChannel): void {
    this.channels.set(channelType, adapter);
  }

  /**
   * Get enabled channels for a notification type
   * Requirement 7.5: Allow enabling or disabling specific channels per notification type
   * @param type - Notification type
   * @returns Array of enabled channel types
   */
  getEnabledChannels(type: NotificationType): NotificationChannel[] {
    const configuredChannels = this.typeChannelMapping[type] ?? [];
    
    return configuredChannels.filter(channel => {
      const adapter = this.channels.get(channel);
      if (!adapter) return false;
      
      // Check if channel is enabled in config
      const channelConfig = this.config.channels[channel];
      if (!channelConfig?.enabled) return false;
      
      return adapter.isConfigured();
    });
  }


  /**
   * Send a notification
   * Requirement 7.1: Route the message to configured channels
   * @param data - Notification input data
   * @returns Result with notification or error
   */
  async send(data: SendNotificationInput): Promise<Result<Notification, NotificationError>> {
    const notification = this.createNotification(data);
    
    // Get the channel adapter
    const adapter = this.channels.get(data.channel);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_NOT_CONFIGURED',
          message: `Channel ${data.channel} is not configured`,
        },
      };
    }

    if (!adapter.isConfigured()) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_NOT_CONFIGURED',
          message: `Channel ${data.channel} is not properly configured`,
        },
      };
    }

    // Attempt to send with retry
    const result = await this.sendWithRetry(notification, adapter);
    
    if (result.success) {
      notification.status = 'sent';
      notification.sentAt = new Date();
    } else {
      notification.status = 'failed';
    }

    return { success: true, data: notification };
  }

  /**
   * Send notifications to all enabled channels for a notification type
   * Requirement 7.1: Route the message to configured channels
   * @param data - Base notification data (channel will be determined by type)
   * @returns Results for each channel
   */
  async sendToAllChannels(
    data: Omit<SendNotificationInput, 'channel'>
  ): Promise<Result<Notification[], NotificationError>> {
    const enabledChannels = this.getEnabledChannels(data.type);
    
    if (enabledChannels.length === 0) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_NOT_CONFIGURED',
          message: `No channels configured for notification type: ${data.type}`,
        },
      };
    }

    const notifications: Notification[] = [];
    const errors: NotificationError[] = [];

    for (const channel of enabledChannels) {
      const result = await this.send({ ...data, channel });
      if (result.success) {
        notifications.push(result.data);
      } else {
        errors.push(result.error);
      }
    }

    // Return success if at least one notification was sent
    if (notifications.length > 0) {
      return { success: true, data: notifications };
    }

    return {
      success: false,
      error: errors[0] ?? {
        code: 'CHANNEL_SEND_FAILED',
        message: 'Failed to send notification to any channel',
      },
    };
  }


  /**
   * Send notification with retry logic
   * Requirement 7.4: Log the error and retry based on configured retry policy
   * @param notification - Notification to send
   * @param adapter - Channel adapter to use
   * @returns Result indicating success or failure after all retries
   */
  private async sendWithRetry(
    notification: Notification,
    adapter: INotificationChannel
  ): Promise<Result<void, NotificationError>> {
    let lastError: NotificationError | undefined;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      const result = await adapter.send(notification);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;
      
      // Log the error
      console.error(
        `Notification send failed (attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}):`,
        {
          notificationId: notification.id,
          channel: notification.channel,
          error: result.error,
        }
      );

      // Don't wait after the last attempt
      if (attempt < this.retryConfig.maxRetries) {
        await this.sleep(delay);
        delay = Math.min(
          delay * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );
      }
    }

    return {
      success: false,
      error: lastError ?? {
        code: 'RETRY_EXHAUSTED',
        message: 'Failed to send notification after all retry attempts',
      },
    };
  }

  /**
   * Create a notification object from input data
   * @param data - Notification input
   * @returns Notification object
   */
  private createNotification(data: SendNotificationInput): Notification {
    return {
      id: crypto.randomUUID(),
      type: data.type,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject,
      body: data.body,
      status: 'pending' as NotificationStatus,
      metadata: data.metadata ?? {},
      createdAt: new Date(),
    };
  }

  /**
   * Sleep for a specified duration
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the retry configuration
   * @returns Current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Get the type to channel mapping
   * @returns Current type to channel mapping
   */
  getTypeChannelMapping(): NotificationTypeConfig {
    return { ...this.typeChannelMapping };
  }
}
