interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Storage
  STORAGE: R2Bucket;
  
  // KV Namespace
  KV: KVNamespace;
  
  // Environment variables
  ENVIRONMENT: string;
  
  // Auth secrets
  AUTH_SECRET?: string;
  
  // Telegram Bot
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  
  // Email provider
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  
  // Webhook secrets
  WEBHOOK_SECRET?: string;
}
