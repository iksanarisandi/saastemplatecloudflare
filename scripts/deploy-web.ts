#!/usr/bin/env node
/**
 * Deploy Web App to Cloudflare Pages
 * 
 * Usage:
 *   pnpm deploy:web          - Deploy to Cloudflare Pages
 * 
 * Or directly:
 *   npx tsx scripts/deploy-web.ts [--project-name=your-project]
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT_DIR = resolve(import.meta.dirname, '..');
const WEB_DIR = resolve(ROOT_DIR, 'apps/web');
const BUILD_OUTPUT = resolve(WEB_DIR, '.svelte-kit/cloudflare');

interface DeployOptions {
  projectName: string;
  branch?: string;
}

function parseArgs(): DeployOptions {
  const args = process.argv.slice(2);
  let projectName = 'saas-web';
  let branch: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--project-name=')) {
      projectName = arg.split('=')[1];
    }
    if (arg.startsWith('--branch=')) {
      branch = arg.split('=')[1];
    }
  }

  return { projectName, branch };
}

function log(message: string): void {
  console.log(`[deploy-web] ${message}`);
}

function error(message: string): void {
  console.error(`[deploy-web] ERROR: ${message}`);
}

function exec(command: string, cwd: string = WEB_DIR): void {
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

  // Check if web directory exists
  if (!existsSync(WEB_DIR)) {
    error(`Web directory not found: ${WEB_DIR}`);
    return false;
  }

  return true;
}

function deploy(options: DeployOptions): void {
  log('Starting Web deployment to Cloudflare Pages...');
  log(`Project: ${options.projectName}`);

  if (!checkPrerequisites()) {
    process.exit(1);
  }

  try {
    // Run type check first
    log('Running type check...');
    exec('pnpm typecheck');

    // Build the app
    log('Building SvelteKit app...');
    exec('pnpm build');

    // Check if build output exists
    if (!existsSync(BUILD_OUTPUT)) {
      error(`Build output not found: ${BUILD_OUTPUT}`);
      error('Make sure the build completed successfully');
      process.exit(1);
    }

    // Deploy to Pages
    let deployCommand = `wrangler pages deploy .svelte-kit/cloudflare --project-name=${options.projectName}`;
    
    if (options.branch) {
      deployCommand += ` --branch=${options.branch}`;
    }

    log('Deploying to Cloudflare Pages...');
    exec(deployCommand);

    log('✅ Web deployment complete!');
    log('');
    log('Your app is now live on Cloudflare Pages.');
    log(`Visit the Cloudflare dashboard to see your deployment.`);
  } catch (err) {
    error('Deployment failed');
    process.exit(1);
  }
}

// Main
const options = parseArgs();
deploy(options);
