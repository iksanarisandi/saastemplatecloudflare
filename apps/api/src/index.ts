import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { AppError, type ILogger } from '@saas/shared';
import { type TenantVariables, requestLoggingMiddleware } from './middleware';
import {
  success,
  notFound,
  internalError,
  errorFromAppError,
  generateRequestId,
} from './lib';
import { createLoggerForEnv } from './services';
import {
  authRoutes,
  usersRoutes,
  tenantsRoutes,
  subscriptionsRoutes,
  paymentsRoutes,
  filesRoutes,
  webhooksRoutes,
} from './routes';

// App type with variables for authenticated routes
type AppEnv = { 
  Bindings: Env; 
  Variables: TenantVariables & { requestId: string; logger: ILogger };
};

const app = new Hono<AppEnv>();

// Request ID middleware - adds unique ID to each request
app.use('*', async (c, next) => {
  const requestId = generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});

// Structured request logging middleware
app.use('*', async (c, next) => {
  const logger = createLoggerForEnv(c.env.ENVIRONMENT || 'production');
  const loggingMiddleware = requestLoggingMiddleware({ logger });
  return loggingMiddleware(c, next);
});

// Global middleware
app.use('*', secureHeaders());
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-Id'],
  credentials: true,
  maxAge: 86400,
}));

// Health check
app.get('/health', (c) => {
  return success(c, {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
  });
});

// API root
app.get('/', (c) => {
  return success(c, {
    name: 'SaaS API',
    version: '0.1.0',
  });
});

// Mount API routes
app.route('/auth', authRoutes);
app.route('/users', usersRoutes);
app.route('/tenants', tenantsRoutes);
app.route('/', subscriptionsRoutes); // Mounts /plans and /subscriptions
app.route('/payments', paymentsRoutes);
app.route('/files', filesRoutes);
app.route('/webhooks', webhooksRoutes);

// 404 handler
app.notFound((c) => {
  return notFound(c, 'Resource');
});

// Error handler
app.onError((err, c) => {
  const requestId = c.get('requestId') || generateRequestId();
  
  // Get logger from context or create one
  const logger = c.get('logger') || createLoggerForEnv(c.env.ENVIRONMENT || 'production');
  
  // Log error with structured context
  logger.error('Unhandled error', err, {
    requestId,
    path: c.req.path,
    method: c.req.method,
  });
  
  // Handle known application errors
  if (err instanceof AppError) {
    return errorFromAppError(c, err);
  }
  
  // Handle unknown errors
  const showDetails = c.env.ENVIRONMENT !== 'production';
  return internalError(c, err.message, showDetails);
});

export default app;
