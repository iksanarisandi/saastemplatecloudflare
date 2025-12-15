-- ============================================
-- Cloudflare SaaS Boilerplate - Seed Data
-- ============================================
-- Generated: 2025-12-15T13:16:00.613Z
-- 
-- This script creates:
--   1. Default tenant organization
--   2. Default admin user (admin@example.com / admin123)
--   3. Sample subscription plans
-- 
-- IMPORTANT: Change the admin password after first login!
-- ============================================

-- Default tenant organization
INSERT OR IGNORE INTO tenants (id, name, slug, status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Organization',
  'default',
  'active',
  '{"features":["basic","advanced"],"limits":{"maxUsers":10,"maxStorage":1073741824}}'
);

-- Default admin user
-- Email: admin@example.com
-- Password: admin123 (CHANGE THIS IMMEDIATELY!)
INSERT OR IGNORE INTO users (id, tenant_id, email, password_hash, role, status)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'admin@example.com',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d68f14e45fceea167a5a36dedd4bea25437be3b52c7b3b4c5d6e7f8a9b0c1d2e3f',
  'super_admin',
  'active'
);

-- Subscription plans
INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Free',
  'Basic features for individuals getting started',
  0,
  'IDR',
  'monthly',
  '[{"key":"basic","name":"Basic Features","description":"Access to core functionality"}]',
  '{"maxUsers":1,"maxStorage":104857600}',
  1
);

INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000011',
  'Pro',
  'Advanced features for growing teams',
  99000,
  'IDR',
  'monthly',
  '[{"key":"basic","name":"Basic Features","description":"Access to core functionality"},{"key":"advanced","name":"Advanced Features","description":"Advanced analytics and reporting"},{"key":"priority_support","name":"Priority Support","description":"24/7 priority customer support"}]',
  '{"maxUsers":10,"maxStorage":1073741824}',
  1
);

INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000012',
  'Enterprise',
  'Full features for large organizations',
  299000,
  'IDR',
  'monthly',
  '[{"key":"basic","name":"Basic Features","description":"Access to core functionality"},{"key":"advanced","name":"Advanced Features","description":"Advanced analytics and reporting"},{"key":"priority_support","name":"Priority Support","description":"24/7 priority customer support"},{"key":"custom_branding","name":"Custom Branding","description":"White-label with your brand"},{"key":"api_access","name":"API Access","description":"Full API access for integrations"},{"key":"sso","name":"Single Sign-On","description":"SAML/OAuth SSO integration"}]',
  '{"maxUsers":100,"maxStorage":10737418240}',
  1
);

INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000013',
  'Pro Yearly',
  'Pro plan with yearly billing (2 months free)',
  990000,
  'IDR',
  'yearly',
  '[{"key":"basic","name":"Basic Features","description":"Access to core functionality"},{"key":"advanced","name":"Advanced Features","description":"Advanced analytics and reporting"},{"key":"priority_support","name":"Priority Support","description":"24/7 priority customer support"}]',
  '{"maxUsers":10,"maxStorage":1073741824}',
  1
);

INSERT OR IGNORE INTO subscription_plans (id, name, description, price, currency, interval, features, limits, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000014',
  'Enterprise Yearly',
  'Enterprise plan with yearly billing (2 months free)',
  2990000,
  'IDR',
  'yearly',
  '[{"key":"basic","name":"Basic Features","description":"Access to core functionality"},{"key":"advanced","name":"Advanced Features","description":"Advanced analytics and reporting"},{"key":"priority_support","name":"Priority Support","description":"24/7 priority customer support"},{"key":"custom_branding","name":"Custom Branding","description":"White-label with your brand"},{"key":"api_access","name":"API Access","description":"Full API access for integrations"},{"key":"sso","name":"Single Sign-On","description":"SAML/OAuth SSO integration"}]',
  '{"maxUsers":100,"maxStorage":10737418240}',
  1
);
