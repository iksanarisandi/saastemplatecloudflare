import { Hono } from 'hono';
import type { PaymentWebhookPayload, WebhookEvent } from '@saas/shared';
import { WebhookService } from '../services/webhook.service';
import { PaymentWebhookHandler } from '../services/handlers/payment.webhook.handler';
import {
  success,
  error,
} from '../lib/response';

type WebhooksEnv = { Bindings: Env; Variables: { requestId: string } };

const webhooksRoutes = new Hono<WebhooksEnv>();

/**
 * Create and configure the webhook service with handlers
 * Requirement 12.2, 12.4: Route to appropriate handler
 */
function createWebhookService(env: Env): WebhookService {
  const webhookService = new WebhookService();
  const paymentHandler = new PaymentWebhookHandler(env.DB);

  // Register payment webhook handlers with database integration
  // These handlers process incoming payment status updates from external gateways

  webhookService.registerHandler(
    'payment.created',
    async (event) => paymentHandler.handlePaymentCreated(event as WebhookEvent<PaymentWebhookPayload>),
    env.WEBHOOK_SECRET
  );

  webhookService.registerHandler(
    'payment.confirmed',
    async (event) => paymentHandler.handlePaymentConfirmed(event as WebhookEvent<PaymentWebhookPayload>),
    env.WEBHOOK_SECRET
  );

  webhookService.registerHandler(
    'payment.rejected',
    async (event) => paymentHandler.handlePaymentRejected(event as WebhookEvent<PaymentWebhookPayload>),
    env.WEBHOOK_SECRET
  );

  webhookService.registerHandler(
    'payment.expired',
    async (event) => paymentHandler.handlePaymentExpired(event as WebhookEvent<PaymentWebhookPayload>),
    env.WEBHOOK_SECRET
  );

  return webhookService;
}

/**
 * POST /webhooks
 * Generic webhook endpoint
 * Requirements: 12.1, 12.2, 12.5
 */
webhooksRoutes.post('/', async (c) => {
  const webhookService = createWebhookService(c.env);
  
  // Get raw body for signature verification
  const body = await c.req.text();
  
  // Get signature from header (common formats: X-Webhook-Signature, X-Hub-Signature-256)
  const signature = c.req.header('X-Webhook-Signature') || 
                    c.req.header('X-Hub-Signature-256') ||
                    c.req.header('X-Signature');

  // Process the webhook
  const result = await webhookService.processWebhook(body, signature);

  if (!result.success) {
    const statusMap: Record<string, number> = {
      INVALID_SIGNATURE: 401,
      INVALID_PAYLOAD: 400,
      HANDLER_NOT_FOUND: 404,
      HANDLER_ERROR: 500,
      INTERNAL_ERROR: 500,
    };

    return error(
      c,
      { code: result.error.code, message: result.error.message },
      (statusMap[result.error.code] || 400) as 400 | 401 | 404 | 500
    );
  }

  return success(c, result.data);
});

/**
 * POST /webhooks/payments
 * Payment-specific webhook endpoint
 * Requirement 12.2: Process payment webhooks
 */
webhooksRoutes.post('/payments', async (c) => {
  const webhookService = createWebhookService(c.env);
  
  const body = await c.req.text();
  const signature = c.req.header('X-Webhook-Signature') || 
                    c.req.header('X-Hub-Signature-256');

  const result = await webhookService.processWebhook(body, signature);

  if (!result.success) {
    // Log webhook failures for debugging
    console.error('Payment webhook processing failed:', {
      error: result.error,
      requestId: c.get('requestId'),
    });

    const statusMap: Record<string, number> = {
      INVALID_SIGNATURE: 401,
      INVALID_PAYLOAD: 400,
      HANDLER_NOT_FOUND: 404,
      HANDLER_ERROR: 500,
      INTERNAL_ERROR: 500,
    };

    return error(
      c,
      { code: result.error.code, message: result.error.message },
      (statusMap[result.error.code] || 400) as 400 | 401 | 404 | 500
    );
  }

  return success(c, result.data);
});

/**
 * GET /webhooks/types
 * List registered webhook types (for documentation/debugging)
 */
webhooksRoutes.get('/types', async (c) => {
  const webhookService = createWebhookService(c.env);
  
  const types = webhookService.getRegisteredTypes();
  const typeInfo = types.map(type => ({
    type,
    requiresSignature: webhookService.requiresSignature(type),
  }));

  return success(c, {
    types: typeInfo,
    signatureHeader: 'X-Webhook-Signature',
    signatureFormat: 'sha256=<hex-encoded-hmac>',
  });
});

export { webhooksRoutes };
