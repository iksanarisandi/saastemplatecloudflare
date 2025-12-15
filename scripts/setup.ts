#!/usr/bin/env node
/**
 * Setup Script for Cloudflare SaaS Boilerplate
 * 
 * This script helps set up the required Cloudflare resources:
 * - D1 Database
 * - R2 Bucket
 * - KV Namespace
 * 
 * Usage:
 *   pnpm setup                    - Interactive setup
 *   pnpm setup --resources-only   - Create resources only (no migration)
 *   pnpm setup --prod             - Setup production resources
 * 
 * Or directly:
 *   npx tsx scripts/setup.ts [options]
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as readline from 'node:readline';

const ROOT_DIR = resolve(import.meta.dirname, '..');
const API_WRANGLER = resolve(ROOT_DIR, 'apps/api/wrangler.toml');
const API_WRANGLER_PROD = resolve(ROOT_DIR, 'apps/api/wrangler.prod.toml');
const MIGRATIONS_DIR = resolve(ROOT_DIR, 'packages/db/src/migrations');

interface SetupOptions {
  production: boolean;
  resourcesOnly: boolean;
  skipPrompts: boolean;
}

interface ResourceIds {
  d1DatabaseId?: string;
  kvNamespaceId?: string;
}

function parseArgs(): SetupOptions {
  const args = process.argv.slice(2);
  return {
    production: args.includes('--prod') || args.includes('--production'),
    resourcesOnly: args.includes('--resources-only'),
    skipPrompts: args.includes('--yes') || args.includes('-y'),
  };
}

function log(message: string): void {
  console.log(`[setup] ${message}`);
}

function success(message: string): void {
  console.log(`[setup] ✅ ${message}`);
}

function warn(message: string): void {
  console.log(`[setup] ⚠️  ${message}`);
}

function error(message: string): void {
  console.error(`[setup] ❌ ${message}`);
}

function execCommand(command: string, silent = false): string {
  try {
    const result = execSync(command, { 
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return result || '';
  } catch (err: any) {
    if (silent) {
      return err.stdout || '';
    }
    throw err;
  }
}

function checkWrangler(): boolean {
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkWranglerAuth(): boolean {
  try {
    const result = execSync('wrangler whoami', { encoding: 'utf-8', stdio: 'pipe' });
    return !result.includes('not authenticated');
  } catch {
    return false;
  }
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const suffix = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = await prompt(`${question} ${suffix}: `);
  
  if (answer === '') {
    return defaultYes;
  }
  
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

function createD1Database(name: string): string | null {
  log(`Creating D1 database: ${name}`);
  
  try {
    const output = execCommand(`wrangler d1 create ${name}`, true);
    
    // Parse the database_id from output
    const match = output.match(/database_id\s*=\s*"([^"]+)"/);
    if (match) {
      success(`D1 database created: ${name}`);
      return match[1];
    }
    
    // Database might already exist
    if (output.includes('already exists')) {
      warn(`D1 database '${name}' already exists`);
      return null;
    }
    
    return null;
  } catch (err) {
    error(`Failed to create D1 database: ${name}`);
    return null;
  }
}

function createR2Bucket(name: string): boolean {
  log(`Creating R2 bucket: ${name}`);
  
  try {
    execCommand(`wrangler r2 bucket create ${name}`, true);
    success(`R2 bucket created: ${name}`);
    return true;
  } catch (err: any) {
    if (err.message?.includes('already exists') || err.stdout?.includes('already exists')) {
      warn(`R2 bucket '${name}' already exists`);
      return true;
    }
    error(`Failed to create R2 bucket: ${name}`);
    return false;
  }
}

function createKVNamespace(name: string): string | null {
  log(`Creating KV namespace: ${name}`);
  
  try {
    const output = execCommand(`wrangler kv:namespace create ${name}`, true);
    
    // Parse the id from output
    const match = output.match(/id\s*=\s*"([^"]+)"/);
    if (match) {
      success(`KV namespace created: ${name}`);
      return match[1];
    }
    
    return null;
  } catch (err: any) {
    if (err.message?.includes('already exists') || err.stdout?.includes('already exists')) {
      warn(`KV namespace '${name}' already exists`);
      return null;
    }
    error(`Failed to create KV namespace: ${name}`);
    return null;
  }
}

function updateWranglerConfig(configPath: string, ids: ResourceIds): void {
  if (!existsSync(configPath)) {
    warn(`Config file not found: ${configPath}`);
    return;
  }

  let content = readFileSync(configPath, 'utf-8');
  
  if (ids.d1DatabaseId) {
    content = content.replace(
      /database_id\s*=\s*"YOUR_[^"]*D1[^"]*"/gi,
      `database_id = "${ids.d1DatabaseId}"`
    );
  }
  
  if (ids.kvNamespaceId) {
    content = content.replace(
      /id\s*=\s*"YOUR_[^"]*KV[^"]*"/gi,
      `id = "${ids.kvNamespaceId}"`
    );
  }
  
  writeFileSync(configPath, content);
  success(`Updated config: ${configPath}`);
}

function runMigrations(dbName: string, local: boolean): boolean {
  const migrationFile = resolve(MIGRATIONS_DIR, '001_initial_schema.sql');
  
  if (!existsSync(migrationFile)) {
    error(`Migration file not found: ${migrationFile}`);
    return false;
  }

  log(`Running migrations on ${dbName}...`);
  
  try {
    const localFlag = local ? '--local' : '';
    execCommand(`wrangler d1 execute ${dbName} ${localFlag} --file=${migrationFile}`);
    success('Migrations applied successfully');
    return true;
  } catch (err) {
    error('Failed to run migrations');
    return false;
  }
}

async function setup(options: SetupOptions): Promise<void> {
  console.log('');
  console.log('='.repeat(60));
  console.log('  Cloudflare SaaS Boilerplate - Setup');
  console.log('='.repeat(60));
  console.log('');

  const env = options.production ? 'production' : 'development';
  log(`Environment: ${env}`);
  console.log('');

  // Check prerequisites
  log('Checking prerequisites...');
  
  if (!checkWrangler()) {
    error('wrangler CLI not found');
    console.log('');
    console.log('Install wrangler with:');
    console.log('  npm install -g wrangler');
    console.log('');
    process.exit(1);
  }
  success('wrangler CLI found');

  if (!checkWranglerAuth()) {
    error('Not authenticated with Cloudflare');
    console.log('');
    console.log('Login with:');
    console.log('  wrangler login');
    console.log('');
    process.exit(1);
  }
  success('Authenticated with Cloudflare');
  console.log('');

  // Resource names
  const suffix = options.production ? '-prod' : '';
  const dbName = `saas-db${suffix}`;
  const bucketName = `saas-storage${suffix}`;
  const kvName = options.production ? 'KV_PROD' : 'KV';

  // Confirm setup
  if (!options.skipPrompts) {
    console.log('This will create the following Cloudflare resources:');
    console.log(`  - D1 Database: ${dbName}`);
    console.log(`  - R2 Bucket: ${bucketName}`);
    console.log(`  - KV Namespace: ${kvName}`);
    console.log('');
    
    const proceed = await confirm('Continue?');
    if (!proceed) {
      log('Setup cancelled');
      process.exit(0);
    }
    console.log('');
  }

  // Create resources
  log('Creating Cloudflare resources...');
  console.log('');

  const ids: ResourceIds = {};

  // Create D1 database
  const d1Id = createD1Database(dbName);
  if (d1Id) {
    ids.d1DatabaseId = d1Id;
  }

  // Create R2 bucket
  createR2Bucket(bucketName);

  // Create KV namespace
  const kvId = createKVNamespace(kvName);
  if (kvId) {
    ids.kvNamespaceId = kvId;
  }

  console.log('');

  // Update wrangler config
  if (ids.d1DatabaseId || ids.kvNamespaceId) {
    log('Updating wrangler configuration...');
    
    const configPath = options.production ? API_WRANGLER_PROD : API_WRANGLER;
    updateWranglerConfig(configPath, ids);
    
    console.log('');
  }

  // Run migrations
  if (!options.resourcesOnly) {
    if (!options.skipPrompts) {
      const runMigration = await confirm('Run database migrations?');
      if (runMigration) {
        console.log('');
        runMigrations(dbName, !options.production);
      }
    } else {
      runMigrations(dbName, !options.production);
    }
  }

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log('  Setup Complete!');
  console.log('='.repeat(60));
  console.log('');
  
  if (ids.d1DatabaseId) {
    console.log(`D1 Database ID: ${ids.d1DatabaseId}`);
  }
  if (ids.kvNamespaceId) {
    console.log(`KV Namespace ID: ${ids.kvNamespaceId}`);
  }
  
  console.log('');
  console.log('Next steps:');
  console.log('  1. Copy .env.example to .env and update values');
  console.log('  2. Start development: pnpm dev');
  console.log('');
  
  if (options.production) {
    console.log('For production, set secrets:');
    console.log('  wrangler secret put AUTH_SECRET --config apps/api/wrangler.prod.toml');
    console.log('  wrangler secret put TELEGRAM_BOT_TOKEN --config apps/api/wrangler.prod.toml');
    console.log('  wrangler secret put EMAIL_API_KEY --config apps/api/wrangler.prod.toml');
    console.log('');
  }
}

// Main
const options = parseArgs();
setup(options).catch((err) => {
  error(err.message);
  process.exit(1);
});
