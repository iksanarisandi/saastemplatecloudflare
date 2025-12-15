#!/usr/bin/env node
/**
 * Deploy all services to Cloudflare
 * 
 * Usage:
 *   pnpm deploy              - Deploy both API and Web
 *   pnpm deploy --api-only   - Deploy only API
 *   pnpm deploy --web-only   - Deploy only Web
 *   pnpm deploy --prod       - Deploy to production
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '..');

interface DeployOptions {
  apiOnly: boolean;
  webOnly: boolean;
  production: boolean;
}

function parseArgs(): DeployOptions {
  const args = process.argv.slice(2);
  return {
    apiOnly: args.includes('--api-only'),
    webOnly: args.includes('--web-only'),
    production: args.includes('--prod') || args.includes('--production'),
  };
}

function log(message: string): void {
  console.log(`[deploy] ${message}`);
}

function error(message: string): void {
  console.error(`[deploy] ERROR: ${message}`);
}

function exec(command: string): void {
  log(`Running: ${command}`);
  execSync(command, { cwd: ROOT_DIR, stdio: 'inherit' });
}

function deploy(options: DeployOptions): void {
  log('='.repeat(50));
  log('Cloudflare SaaS Boilerplate - Deployment');
  log('='.repeat(50));
  log(`Environment: ${options.production ? 'PRODUCTION' : 'development'}`);
  log('');

  const deployApi = !options.webOnly;
  const deployWeb = !options.apiOnly;

  try {
    // Run full build first
    log('Building all packages...');
    exec('pnpm build');

    // Deploy API
    if (deployApi) {
      log('');
      log('-'.repeat(50));
      log('Deploying API to Cloudflare Workers...');
      log('-'.repeat(50));
      
      const apiCommand = options.production 
        ? 'pnpm --filter @saas/api deploy -- --config wrangler.prod.toml'
        : 'pnpm --filter @saas/api deploy';
      exec(apiCommand);
    }

    // Deploy Web
    if (deployWeb) {
      log('');
      log('-'.repeat(50));
      log('Deploying Web to Cloudflare Pages...');
      log('-'.repeat(50));
      exec('pnpm --filter @saas/web deploy');
    }

    log('');
    log('='.repeat(50));
    log('✅ Deployment complete!');
    log('='.repeat(50));
    
    if (deployApi) {
      log('  API: Deployed to Cloudflare Workers');
    }
    if (deployWeb) {
      log('  Web: Deployed to Cloudflare Pages');
    }
    
    if (options.production) {
      log('');
      log('Production deployment checklist:');
      log('  [ ] Verify all secrets are configured');
      log('  [ ] Test API endpoints');
      log('  [ ] Test frontend functionality');
      log('  [ ] Check Cloudflare dashboard for errors');
    }
  } catch (err) {
    error('Deployment failed');
    process.exit(1);
  }
}

// Main
const options = parseArgs();
deploy(options);
