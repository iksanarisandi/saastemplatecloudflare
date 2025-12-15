import type {
  WebhookType,
  WebhookEvent,
  WebhookHandler,
  WebhookHandlerResult,
  SignatureVerificationResult,
  Result,
} from '@saas/shared';
import {
  webhookEventSchema,
  paymentWebhookEventSchema,
  subscriptionWebhookEventSchema,
} from '@saas/shared';

/**
 * Webhook service error types
 */
export type WebhookErrorCode =
  | 'INVALID_SIGNATURE'
  | 'INVALID_PAYLOAD'
  | 'HANDLER_NOT_FOUND'
  | 'HANDLER_ERROR'
  | 'INTERNAL_ERROR';

export interface WebhookError {
  code: WebhookErrorCode;
  message: string;
}

/**
 * Webhook Service
 * Handles signature validation, payload parsing, and handler routing
 * Requirements: 12.1, 12.2, 12.5
 */
export class WebhookService {
  private handlers: Map<WebhookType, WebhookHandler> = new Map();
  private secrets: Map<WebhookType, string> = new Map();

  /**
   * Register a webhook handler for a specific type
   * Requirement 12.4: Allow configuration of endpoint and handler function
   * @param type - Webhook type
   * @param handler - Handler function
   * @param secret - Optional secret for signature verification
   */
  registerHandler(
    type: WebhookType,
    handler: WebhookHandler,
    secret?: string
  ): void {
    this.handlers.set(type, handler);
    if (secret) {
      this.secrets.set(type, secret);
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Requirement 12.1: Validate the webhook signature if configured
   * @param payload - Raw payload string
   * @param signature - Signature from header
   * @param secret - Secret key for verification
   * @returns Verification result
   */
  async verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<SignatureVerificationResult> {
    try {
      // Import the secret key for HMAC
      const encoder = new TextEncoder();
      const keyData = encoder.encode(secret);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      // Compute the expected signature
      const payloadData = encoder.encode(payload);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, payloadData);
      
      // Convert to hex string
      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Compare signatures (timing-safe comparison)
      const providedSig = signature.replace(/^sha256=/, '').toLowerCase();
      const expectedSig = expectedSignature.toLowerCase();
      
      if (providedSig.length !== expectedSig.length) {
        return { valid: false, error: 'Signature length mismatch' };
      }

      // Constant-time comparison
      let result = 0;
      for (let i = 0; i < providedSig.length; i++) {
        result |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
      }

      if (result !== 0) {
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Signature verification error:', error);
      return { valid: false, error: 'Signature verification failed' };
    }
  }

  /**
   * Parse and validate webhook payload
   * Requirement 12.5: Decode JSON body and validate against expected schema
   * @param body - Raw JSON body string
   * @returns Parsed webhook event or error
   */
  parsePayload(body: string): Result<WebhookEvent, WebhookError> {
    try {
      const parsed = JSON.parse(body);
      
      // First validate basic structure
      const baseResult = webhookEventSchema.safeParse(parsed);
      if (!baseResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: `Invalid webhook payload: ${baseResult.error.message}`,
          },
        };
      }

      // Validate based on webhook type
      const type = baseResult.data.type;
      let validationResult;

      if (type.startsWith('payment.')) {
        validationResult = paymentWebhookEventSchema.safeParse(parsed);
      } else if (type.startsWith('subscription.')) {
        validationResult = subscriptionWebhookEventSchema.safeParse(parsed);
      } else {
        // Generic validation passed
        return { success: true, data: baseResult.data as WebhookEvent };
      }

      if (!validationResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: `Invalid ${type} payload: ${validationResult.error.message}`,
          },
        };
      }

      return { success: true, data: validationResult.data as WebhookEvent };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'Failed to parse webhook payload as JSON',
        },
      };
    }
  }

  /**
   * Process a webhook request
   * Requirement 12.2: Parse the payload and route to appropriate handler
   * @param body - Raw request body
   * @param signature - Optional signature header
   * @returns Handler result or error
   */
  async processWebhook(
    body: string,
    signature?: string
  ): Promise<Result<WebhookHandlerResult, WebhookError>> {
    // Parse the payload first to get the type
    const parseResult = this.parsePayload(body);
    if (!parseResult.success) {
      return parseResult;
    }

    const event = parseResult.data;
    const webhookType = event.type;

    // Check if signature verification is required for this type
    const secret = this.secrets.get(webhookType);
    if (secret) {
      if (!signature) {
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: 'Webhook signature is required but not provided',
          },
        };
      }

      const verifyResult = await this.verifySignature(body, signature, secret);
      if (!verifyResult.valid) {
        return {
          success: false,
          error: {
            code: 'INVALID_SIGNATURE',
            message: verifyResult.error || 'Invalid webhook signature',
          },
        };
      }
    }

    // Route to the appropriate handler
    const handler = this.handlers.get(webhookType);
    if (!handler) {
      return {
        success: false,
        error: {
          code: 'HANDLER_NOT_FOUND',
          message: `No handler registered for webhook type: ${webhookType}`,
        },
      };
    }

    try {
      const result = await handler(event);
      return { success: true, data: result };
    } catch (error) {
      console.error(`Webhook handler error for ${webhookType}:`, error);
      return {
        success: false,
        error: {
          code: 'HANDLER_ERROR',
          message: error instanceof Error ? error.message : 'Handler execution failed',
        },
      };
    }
  }

  /**
   * Get all registered webhook types
   * @returns Array of registered webhook types
   */
  getRegisteredTypes(): WebhookType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a handler is registered for a type
   * @param type - Webhook type
   * @returns True if handler is registered
   */
  hasHandler(type: WebhookType): boolean {
    return this.handlers.has(type);
  }

  /**
   * Check if signature verification is required for a type
   * @param type - Webhook type
   * @returns True if signature verification is required
   */
  requiresSignature(type: WebhookType): boolean {
    return this.secrets.has(type);
  }
}

/**
 * Create a webhook event object
 * Utility function for creating webhook events
 */
export function createWebhookEvent<T>(
  type: WebhookType,
  data: T
): WebhookEvent<T> {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    data,
  };
}
