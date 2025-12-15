import type { Notification, Result } from '@saas/shared';
import type { INotificationChannel, NotificationError } from '../notification.service';

/**
 * Telegram channel configuration
 */
export interface TelegramChannelConfig {
  botToken: string;
  defaultChatId?: string;
}

/**
 * Telegram Bot API response types
 */
interface TelegramApiResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
}

/**
 * Telegram message formatting options
 */
export type TelegramParseMode = 'HTML' | 'Markdown' | 'MarkdownV2';

/**
 * Telegram Channel Adapter
 * Requirement 7.2: Call Telegram Bot API with formatted message
 */
export class TelegramChannel implements INotificationChannel {
  private botToken: string;
  private defaultChatId?: string;
  private baseUrl: string;

  constructor(config: TelegramChannelConfig) {
    this.botToken = config.botToken;
    this.defaultChatId = config.defaultChatId;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Check if the channel is properly configured
   * @returns true if bot token is set
   */
  isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.length > 0);
  }

  /**
   * Send a notification via Telegram
   * Requirement 7.2: Call Telegram Bot API with formatted message
   * @param notification - Notification to send
   * @returns Result indicating success or failure
   */
  async send(notification: Notification): Promise<Result<void, NotificationError>> {
    const chatId = this.getChatId(notification);
    
    if (!chatId) {
      return {
        success: false,
        error: {
          code: 'CHANNEL_NOT_CONFIGURED',
          message: 'No chat ID provided for Telegram notification',
        },
      };
    }

    const message = this.formatMessage(notification);
    
    try {
      const response = await this.sendMessage(chatId, message);
      
      if (response.ok) {
        return { success: true, data: undefined };
      }

      return {
        success: false,
        error: {
          code: 'CHANNEL_SEND_FAILED',
          message: response.description ?? 'Failed to send Telegram message',
        },
      };
    } catch (error) {
      console.error('Telegram send error:', error);
      return {
        success: false,
        error: {
          code: 'CHANNEL_SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error sending Telegram message',
        },
      };
    }
  }


  /**
   * Get the chat ID for the notification
   * Uses recipient from notification metadata or falls back to default
   * @param notification - Notification to get chat ID for
   * @returns Chat ID or undefined
   */
  private getChatId(notification: Notification): string | undefined {
    // Check if chat ID is in metadata
    const metadataChatId = notification.metadata?.telegramChatId;
    if (typeof metadataChatId === 'string' && metadataChatId.length > 0) {
      return metadataChatId;
    }

    // Use recipient if it looks like a Telegram chat ID (numeric or starts with @)
    if (notification.recipient.match(/^-?\d+$/) || notification.recipient.startsWith('@')) {
      return notification.recipient;
    }

    // Fall back to default chat ID
    return this.defaultChatId;
  }

  /**
   * Format the notification message for Telegram
   * Requirement 7.2: Message formatting
   * @param notification - Notification to format
   * @returns Formatted message string
   */
  private formatMessage(notification: Notification): string {
    const parts: string[] = [];

    // Add emoji based on notification type
    const emoji = this.getTypeEmoji(notification.type);
    
    // Add subject if present
    if (notification.subject) {
      parts.push(`${emoji} <b>${this.escapeHtml(notification.subject)}</b>`);
      parts.push('');
    } else {
      parts.push(`${emoji} <b>${this.getTypeTitle(notification.type)}</b>`);
      parts.push('');
    }

    // Add body
    parts.push(this.escapeHtml(notification.body));

    // Add timestamp
    parts.push('');
    parts.push(`<i>${new Date().toISOString()}</i>`);

    return parts.join('\n');
  }

  /**
   * Get emoji for notification type
   * @param type - Notification type
   * @returns Emoji string
   */
  private getTypeEmoji(type: string): string {
    const emojiMap: Record<string, string> = {
      payment_pending: '⏳',
      payment_confirmed: '✅',
      payment_rejected: '❌',
      subscription_expiring: '⚠️',
      subscription_expired: '🔴',
      welcome: '👋',
      password_reset: '🔐',
    };
    return emojiMap[type] ?? '📢';
  }

  /**
   * Get title for notification type
   * @param type - Notification type
   * @returns Title string
   */
  private getTypeTitle(type: string): string {
    const titleMap: Record<string, string> = {
      payment_pending: 'Payment Pending',
      payment_confirmed: 'Payment Confirmed',
      payment_rejected: 'Payment Rejected',
      subscription_expiring: 'Subscription Expiring',
      subscription_expired: 'Subscription Expired',
      welcome: 'Welcome',
      password_reset: 'Password Reset',
    };
    return titleMap[type] ?? 'Notification';
  }

  /**
   * Escape HTML special characters for Telegram HTML parse mode
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }


  /**
   * Send a message via Telegram Bot API
   * @param chatId - Target chat ID
   * @param text - Message text
   * @param parseMode - Parse mode for formatting
   * @returns Telegram API response
   */
  private async sendMessage(
    chatId: string,
    text: string,
    parseMode: TelegramParseMode = 'HTML'
  ): Promise<TelegramApiResponse> {
    const url = `${this.baseUrl}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    return response.json() as Promise<TelegramApiResponse>;
  }

  /**
   * Send a message with inline keyboard
   * Useful for interactive notifications
   * @param chatId - Target chat ID
   * @param text - Message text
   * @param buttons - Inline keyboard buttons
   * @returns Telegram API response
   */
  async sendMessageWithButtons(
    chatId: string,
    text: string,
    buttons: Array<{ text: string; url?: string; callback_data?: string }>
  ): Promise<TelegramApiResponse> {
    const url = `${this.baseUrl}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [buttons],
        },
      }),
    });

    return response.json() as Promise<TelegramApiResponse>;
  }

  /**
   * Get bot information
   * Useful for verifying bot token is valid
   * @returns Telegram API response with bot info
   */
  async getMe(): Promise<TelegramApiResponse> {
    const url = `${this.baseUrl}/getMe`;
    const response = await fetch(url);
    return response.json() as Promise<TelegramApiResponse>;
  }
}
