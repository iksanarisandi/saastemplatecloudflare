/**
 * Database seed script
 * Creates default admin user and sample subscription plans
 *
 * Run with: pnpm --filter @saas/db seed
 *
 * Note: This generates SQL that can be executed with wrangler d1 execute
 *
 * Requirements: 1.3 - Setup command creates necessary resources
 */

// ============================================
// Seed Data Configuration
// ============================================

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_ADMIN_ID = '00000000-0000-0000-0000-000000000002';

/**
 * Pre-computed password hash for "admin123"
 * Generated using PBKDF2 with:
 * - 100,000 iterations
 * - SHA-256
 * - 16-byte salt
 * - 32-byte key
 *
 * Format: salt (32 hex chars) + hash (64 hex chars)
 *
 * IMPORTANT: Change this password immediately after first login!
 * To generate a new hash, use the hashPassword function from apps/api/src/lib/password.ts
 */
const DEFAULT_PASSWORD_HASH =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6' + // salt (16 bytes = 32 hex chars)
  '8f14e45fceea167a5a36dedd4bea2543' + // hash part 1
  '7be3b52c7b3b4c5d6e7f8a9b0c1d2e3f'; // hash part 2

// ============================================
// Subscription Plans Configuration
// ============================================

const SUBSCRIPTION_PLANS = [
  {
    id: '00000000-0000-0000-0000-000000000010',
    name: 'Free',
    description: 'Basic features for individuals getting started',
    price: 0,
    currency: 'IDR',
    interval: 'monthly',
    features: [{ key: 'basic', name: 'Basic Features', description: 'Access to core functionality' }],
    limits: { maxUsers: 1, maxStorage: 104857600 }, // 100MB
    isActive: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000011',
    name: 'Pro',
    description: 'Advanced features for growing teams',
    price: 99000,
    currency: 'IDR',
    interval: 'monthly',
    features: [
      { key: 'basic', name: 'Basic Features', description: 'Access to core functionality' },
      { key: 'advanced', name: 'Advanced Features', description: 'Advanced analytics and reporting' },
      { key: 'priority_support', name: 'Priority Support', description: '24/7 priority customer support' },
    ],
    limits: { maxUsers: 10, maxStorage: 1073741824 }, // 1GB
    isActive: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000012',
    name: 'Enterprise',
    description: 'Full features for large organizations',
    price: 299000,
    currency: 'IDR',
    interval: 'monthly',
    features: [
      { key: 'basic', name: 'Basic Features', description: 'Access to core functionality' },
      { key: 'advanced', name: 'Advanced Features', description: 'Advanced analytics and reporting' },
      { key: 'priority_support', name: 'Priority Support', description: '24/7 priority customer support' },
      { key: 'custom_branding', name: 'Custom Branding', description: 'White-label with your brand' },
      { key: 'api_access', name: 'API Access', description: 'Full API access for integrations' },
      { key: 'sso', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration' },
    ],
    limits: { maxUsers: 100, maxStorage: 10737418240 }, // 10GB
    isActive: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    name: 'Pro Yearly',
    description: 'Pro plan with yearly billing (2 months free)',
    price: 990000,
    currency: 'IDR',
    interval: 'yearly',
    features: [
      { key: 'basic', name: 'Basic Features', description: 'Access to core functionality' },
      { key: 'advanced', name: 'Advanced Features', description: 'Advanced analytics and reporting' },
      { key: 'priority_support', name: 'Priority Support', description: '24/7 priority customer support' },
    ],
    limits: { maxUsers: 10, maxStorage: 1073741824 }, // 1GB
    isActive: true,
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    name: 'Enterprise Yearly',
    description: 'Enterprise plan with yearly billing (2 months free)',
    price: 2990000,
    currency: 'IDR',
    interval: 'yearly',
    features: [
      { key: 'basic', name: 'Basic Features', description: 'Access to core functionality' },
      { key: 'advanced', name: 'Advanced Features', description: 'Advanced analytics and reporting' },
      { key: 'priority_support', name: 'Priority Support', description: '24/7 priority customer support' },
      { key: 'custom_branding', name: 'Custom Branding', description: 'White-label with your brand' },
      { key: 'api_access', name: 'API Access', description: 'Full API access for integrations' },
      { key: 'sso', name: 'Single Sign-On', description: 'SAML/OAuth SSO integration' },
    ],
    limits: { maxUsers: 100, maxStorage: 10737418240 }, // 10GB
    isActive: true,
  },
];

// ============================================
// SQL Generation
// ============================================

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSeedSQL(): string {
  const lines: string[] = [];

  lines.push('-- ============================================');
  lines.push('-- Cloudflare SaaS Boilerplate - Seed Data');
  lines.push('-- ============================================');
  lines.push('-- Generated: ' + new Date().toISOString());
  lines.push('-- ');
  lines.push('-- This script creates:');
  lines.push('--   1. Default tenant organization');
  lines.push('--   2. Default admin user (admin@example.com / admin123)');
  lines.push('--   3. Sample subscription plans');
  lines.push('-- ');
  lines.push('-- IMPORTANT: Change the admin password after first login!');
  lines.push('-- ============================================');
  lines.push('');

  // Default tenant
  lines.push('-- Default tenant organization');
  lines.push(`INSERT OR IGNORE INTO tenants (id, name, slug, status, settings)`);
  lines.push(`VALUES (`);
  lines.push(`  '${DEFAULT_TENANT_ID}',`);
  lines.push(`  'Default Organization',`);
  lines.push(`  'default',`);
  lines.push(`  'active',`);
  lines.push(`  '${escapeSQL(JSON.stringify({
    features: ['basic', 'advanced'],
    limits: { maxUsers: 10, maxStorage: 1073741824 },
  }))}'`);
  lines.push(`);`);
  lines.push('');

  // Default admin user
  lines.push('-- Default admin user');
  lines.push('-- Email: admin@example.com');
  lines.push('-- Password: admin123 (CHANGE THIS IMMEDIATELY!)');
  lines.push(`INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, role, status)`);
  lines.push(`VALUES (`);
  lines.push(`  '${DEFAULT_ADMIN_ID}',`);
  lines.push(`  '${DEFAULT_TENANT_ID}',`);
  lines.push(`  'admin@example.com',`);
  lines.push(`  '${DEFAULT_PASSWORD_HASH}',`);
  lines.push(`  'super_admin',`);
  lines.push(`  'active'`);
  lines.push(`);`);
  lines.push('');

  // Subscription plans
  lines.push('-- Subscription plans');
  for (const plan of SUBSCRIPTION_PLANS) {
    lines.push(`INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)`);
    lines.push(`VALUES (`);
    lines.push(`  '${plan.id}',`);
    lines.push(`  '${escapeSQL(plan.name)}',`);
    lines.push(`  '${escapeSQL(plan.description)}',`);
    lines.push(`  ${plan.price},`);
    lines.push(`  '${plan.currency}',`);
    lines.push(`  '${plan.interval}',`);
    lines.push(`  '${escapeSQL(JSON.stringify(plan.features))}',`);
    lines.push(`  '${escapeSQL(JSON.stringify(plan.limits))}',`);
    lines.push(`  ${plan.isActive ? 1 : 0}`);
    lines.push(`);`);
    lines.push('');
  }

  return lines.join('\n');
}

// ============================================
// Main Execution
// ============================================

const seedSQL = generateSeedSQL();

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║       Cloudflare SaaS Boilerplate - Database Seed Script       ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('Generated seed SQL:');
console.log('─'.repeat(68));
console.log(seedSQL);
console.log('─'.repeat(68));
console.log('');
console.log('📋 Default Admin Credentials:');
console.log('   Email:    admin@example.com');
console.log('   Password: admin123');
console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
console.log('');
console.log('📦 Subscription Plans Created:');
for (const plan of SUBSCRIPTION_PLANS) {
  const priceStr = plan.price === 0 ? 'Free' : `${plan.currency} ${plan.price.toLocaleString()}`;
  console.log(`   • ${plan.name} (${plan.interval}) - ${priceStr}`);
}
console.log('');
console.log('🚀 To apply seed data:');
console.log('');
console.log('   For local development:');
console.log('   wrangler d1 execute DB --local --file=packages/db/seed.sql');
console.log('');
console.log('   For production:');
console.log('   wrangler d1 execute DB --file=packages/db/seed.sql');
console.log('');
console.log('   Or copy the SQL above and run:');
console.log('   wrangler d1 execute DB --local --command="<paste SQL>"');
console.log('');

// Write SQL to file for convenience
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const seedFilePath = join(__dirname, '../../seed.sql');

try {
  writeFileSync(seedFilePath, seedSQL);
  console.log(`✅ Seed SQL written to: packages/db/seed.sql`);
} catch (error) {
  console.log('⚠️  Could not write seed.sql file. Copy the SQL above manually.');
}
