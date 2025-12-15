import type { Notification, NotificationType, Result } from '@saas/shared';
import type { INotificationChannel, NotificationError } from '../notification.service';

/**
 * Email channel configuration
 */
export interface EmailChannelConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  provider?: EmailProvider;
  apiEndpoint?: string;
}

/**
 * Supported email providers
 */
export type EmailProvider = 'resend' | 'sendgrid' | 'mailgun' | 'custom';

/**
 * Email template data
 */
export interface EmailTemplateData {
  subject: string;
  body: string;
  preheader?: string;
  ctaText?: string;
  ctaUrl?: string;
}

/**
 * Email send request
 */
interface EmailSendRequest {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Email API response
 */
interface EmailApiResponse {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Email Channel Adapter
 * Requirement 7.3: Use configured email provider API
 */
export class EmailChannel implements INotificationChannel {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private provider: EmailProvider;
  private apiEndpoint: string;

  constructor(config: EmailChannelConfig) {
    this.apiKey = config.apiKey;
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName ?? 'SaaS App';
    this.provider = config.provider ?? 'resend';
    this.apiEndpoint = config.apiEndpoint ?? this.getDefaultEndpoint(this.provider);
  }

  /**
   * Get default API endpoint for provider
   * @param provider - Email provider
   * @returns API endpoint URL
   */
  private getDefaultEndpoint(provider: EmailProvider): string {
    const endpoints: Record<EmailProvider, string> = {
      resend: 'https://api.resend.com/emails',
      sendgrid: 'https://api.sendgrid.com/v3/mail/send',
      mailgun: 'https://api.mailgun.net/v3',
      custom: '',
    };
    return endpoints[provider];
  }

  /**
   * Check if the channel is properly configured
   * @returns true if API key and from email are set
   */
  isConfigured(): boolean {
    return Boolean(
      this.apiKey && 
      this.apiKey.length > 0 && 
      this.fromEmail && 
      this.fromEmail.length > 0
    );
  }


  /**
   * Send a notification via email
   * Requirement 7.3: Use configured email provider API
   * @param notification - Notification to send
   * @returns Result indicating success or failure
   */
  async send(notification: Notification): Promise<Result<void, NotificationError>> {
    if (!this.isValidEmail(notification.recipient)) {
      return {
        success: false,
        error: {
          code: 'INVALID_NOTIFICATION_DATA',
          message: 'Invalid email recipient',
        },
      };
    }

    const templateData = this.getTemplateData(notification);
    const html = this.renderTemplate(notification.type, templateData);
    const text = this.renderPlainText(templateData);

    const request: EmailSendRequest = {
      from: this.fromName ? `${this.fromName} <${this.fromEmail}>` : this.fromEmail,
      to: notification.recipient,
      subject: templateData.subject,
      html,
      text,
    };

    try {
      const response = await this.sendEmail(request);
      
      if (response.success) {
        return { success: true, data: undefined };
      }

      return {
        success: false,
        error: {
          code: 'CHANNEL_SEND_FAILED',
          message: response.error ?? 'Failed to send email',
        },
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: {
          code: 'CHANNEL_SEND_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error sending email',
        },
      };
    }
  }

  /**
   * Validate email address format
   * @param email - Email to validate
   * @returns true if valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get template data from notification
   * @param notification - Notification to extract data from
   * @returns Template data
   */
  private getTemplateData(notification: Notification): EmailTemplateData {
    const ctaUrl = notification.metadata?.ctaUrl as string | undefined;
    const ctaText = notification.metadata?.ctaText as string | undefined;

    return {
      subject: notification.subject ?? this.getDefaultSubject(notification.type),
      body: notification.body,
      preheader: notification.metadata?.preheader as string | undefined,
      ctaText,
      ctaUrl,
    };
  }

  /**
   * Get default subject for notification type
   * @param type - Notification type
   * @returns Default subject string
   */
  private getDefaultSubject(type: NotificationType): string {
    const subjectMap: Record<NotificationType, string> = {
      payment_pending: 'Payment Pending - Action Required',
      payment_confirmed: 'Payment Confirmed',
      payment_rejected: 'Payment Rejected',
      subscription_expiring: 'Your Subscription is Expiring Soon',
      subscription_expired: 'Your Subscription Has Expired',
      welcome: 'Welcome to Our Platform',
      password_reset: 'Password Reset Request',
    };
    return subjectMap[type] ?? 'Notification';
  }


  /**
   * Render HTML email template
   * Requirement 7.3: Template support
   * @param type - Notification type
   * @param data - Template data
   * @returns HTML string
   */
  private renderTemplate(type: NotificationType, data: EmailTemplateData): string {
    const primaryColor = '#3b82f6';
    const backgroundColor = '#f3f4f6';
    
    const ctaButton = data.ctaUrl && data.ctaText
      ? `
        <tr>
          <td style="padding: 20px 0;">
            <a href="${this.escapeHtml(data.ctaUrl)}" 
               style="display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; 
                      color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
              ${this.escapeHtml(data.ctaText)}
            </a>
          </td>
        </tr>
      `
      : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(data.subject)}</title>
  ${data.preheader ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${this.escapeHtml(data.preheader)}</span>` : ''}
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${backgroundColor};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${backgroundColor};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #e5e7eb;">
              <h1 style="margin: 0; font-size: 24px; color: #111827;">
                ${this.getTypeIcon(type)} ${this.escapeHtml(data.subject)}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #374151;">
                ${this.escapeHtml(data.body).replace(/\n/g, '<br>')}
              </p>
            </td>
          </tr>
          <!-- CTA Button -->
          ${ctaButton}
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; border-top: 1px solid #e5e7eb; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                This email was sent by ${this.escapeHtml(this.fromName)}.<br>
                If you have any questions, please contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Render plain text version of email
   * @param data - Template data
   * @returns Plain text string
   */
  private renderPlainText(data: EmailTemplateData): string {
    const parts: string[] = [
      data.subject,
      '='.repeat(data.subject.length),
      '',
      data.body,
    ];

    if (data.ctaUrl && data.ctaText) {
      parts.push('', `${data.ctaText}: ${data.ctaUrl}`);
    }

    parts.push('', '---', `Sent by ${this.fromName}`);

    return parts.join('\n');
  }


  /**
   * Get icon for notification type (HTML entity)
   * @param type - Notification type
   * @returns HTML entity string
   */
  private getTypeIcon(type: NotificationType): string {
    const iconMap: Record<NotificationType, string> = {
      payment_pending: '⏳',
      payment_confirmed: '✅',
      payment_rejected: '❌',
      subscription_expiring: '⚠️',
      subscription_expired: '🔴',
      welcome: '👋',
      password_reset: '🔐',
    };
    return iconMap[type] ?? '📧';
  }

  /**
   * Escape HTML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Send email via configured provider
   * @param request - Email send request
   * @returns API response
   */
  private async sendEmail(request: EmailSendRequest): Promise<EmailApiResponse> {
    switch (this.provider) {
      case 'resend':
        return this.sendViaResend(request);
      case 'sendgrid':
        return this.sendViaSendGrid(request);
      case 'mailgun':
        return this.sendViaMailgun(request);
      default:
        return this.sendViaCustom(request);
    }
  }

  /**
   * Send email via Resend API
   * @param request - Email send request
   * @returns API response
   */
  private async sendViaResend(request: EmailSendRequest): Promise<EmailApiResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: request.from,
        to: [request.to],
        subject: request.subject,
        html: request.html,
        text: request.text,
      }),
    });

    const data = await response.json() as { id?: string; message?: string };
    
    if (response.ok) {
      return { success: true, id: data.id };
    }

    return { success: false, error: data.message ?? 'Failed to send email via Resend' };
  }

  /**
   * Send email via SendGrid API
   * @param request - Email send request
   * @returns API response
   */
  private async sendViaSendGrid(request: EmailSendRequest): Promise<EmailApiResponse> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: request.to }] }],
        from: { email: this.fromEmail, name: this.fromName },
        subject: request.subject,
        content: [
          { type: 'text/plain', value: request.text ?? '' },
          { type: 'text/html', value: request.html },
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      return { success: true };
    }

    const data = await response.json() as { errors?: Array<{ message: string }> };
    return { 
      success: false, 
      error: data.errors?.[0]?.message ?? 'Failed to send email via SendGrid' 
    };
  }

  /**
   * Send email via Mailgun API
   * @param request - Email send request
   * @returns API response
   */
  private async sendViaMailgun(request: EmailSendRequest): Promise<EmailApiResponse> {
    // Mailgun uses form data
    const formData = new FormData();
    formData.append('from', request.from);
    formData.append('to', request.to);
    formData.append('subject', request.subject);
    formData.append('html', request.html);
    if (request.text) {
      formData.append('text', request.text);
    }

    const response = await fetch(`${this.apiEndpoint}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${this.apiKey}`)}`,
      },
      body: formData,
    });

    const data = await response.json() as { id?: string; message?: string };
    
    if (response.ok) {
      return { success: true, id: data.id };
    }

    return { success: false, error: data.message ?? 'Failed to send email via Mailgun' };
  }

  /**
   * Send email via custom endpoint
   * @param request - Email send request
   * @returns API response
   */
  private async sendViaCustom(request: EmailSendRequest): Promise<EmailApiResponse> {
    if (!this.apiEndpoint) {
      return { success: false, error: 'Custom email endpoint not configured' };
    }

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json() as { success?: boolean; id?: string; error?: string };
    
    if (response.ok && data.success !== false) {
      return { success: true, id: data.id };
    }

    return { success: false, error: data.error ?? 'Failed to send email' };
  }
}
