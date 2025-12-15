#!/usr/bin/env node
/**
 * Deploy API to Cloudflare Workers
 * 
 * Usage:
 *   pnpm deploy:api          - Deploy to development
 *   pnpm deploy:api:prod     - Deploy to production
 * 
 * Or directly:
 *   npx tsx scripts/deploy-api.ts [--prod]
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '..');
const API_DIR = resolve(ROOT_DIR, 'apps/api');

interface DeployOptions {
  production: boolean;
  dryRun: boolean;
}

function parseArgs(): DeployOptions {
  const args = process.argv.slice(2);
  return {
    production: args.includes('--prod') || args.includes('--production'),
    dryRun: args.includes('--dry-run'),
  };
}

function log(message: string): void {
  console.log(`[deploy-api] ${message}`);
}

function error(message: string): void {
  console.error(`[deploy-api] ERROR: ${message}`);
}

function exec(command: string, cwd: string = API_DIR): void {
  log(`Running: ${command}`);
  execSync(command, { cwd, stdio: 'inherit' });
}

function checkPrerequisites(): boolean {
  // Check if wrangler is available
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
  } catch {
    error('wrangler CLI not found. Install with: npm install -g wrangler');
    return false;
  }

  // Check if API directory exists
  if (!existsSync(API_DIR)) {
    error(`API directory not found: ${API_DIR}`);
    return false;
  }

  // Check if wrangler.toml exists
  const wranglerConfig = resolve(API_DIR, 'wrangler.toml');
  if (!existsSync(wranglerConfig)) {
    error(`wrangler.toml not found: ${wranglerConfig}`);
    return false;
  }

  return true;
}

function deploy(options: DeployOptions): void {
  log('Starting API deployment...');
  log(`Environment: ${options.production ? 'PRODUCTION' : 'development'}`);

  if (!checkPrerequisites()) {
    process.exit(1);
  }

  // Build command
  let deployCommand = 'wrangler deploy';
  
  if (options.production) {
    const prodConfig = resolve(API_DIR, 'wrangler.prod.toml');
    if (!existsSync(prodConfig)) {
      error(`Production config not found: ${prodConfig}`);
      process.exit(1);
    }
    deployCommand += ' --config wrangler.prod.toml';
  }

  if (options.dryRun) {
    deployCommand += ' --dry-run';
    log('Dry run mode - no actual deployment');
  }

  try {
    // Run type check first
    log('Running type check...');
    exec('pnpm typecheck');

    // Deploy
    log('Deploying to Cloudflare Workers...');
    exec(deployCommand);

    log('✅ API deployment complete!');
    
    if (options.production) {
      log('');
      log('Post-deployment checklist:');
      log('  1. Verify secrets are set (AUTH_SECRET, etc.)');
      log('  2. Test API endpoints');
      log('  3. Check Cloudflare dashboard for logs');
    }
  } catch (err) {
    error('Deployment failed');
    process.exit(1);
  }
}

// Main
const options = parseArgs();
deploy(options);
