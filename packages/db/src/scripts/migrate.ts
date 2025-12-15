/**
 * Migration CLI script
 * 
 * This script provides instructions for running migrations with wrangler.
 * The actual migration logic is in the MigrationRunner class which can be
 * used programmatically in the API.
 * 
 * Usage:
 *   pnpm --filter @saas/db migrate [command]
 * 
 * Commands:
 *   status  - Show migration status
 *   up      - Apply all pending migrations
 *   down    - Rollback last migration
 *   reset   - Rollback all and re-apply
 * 
 * For D1 database operations, use wrangler:
 *   wrangler d1 execute DB --local --file=packages/db/src/migrations/001_initial_schema.sql
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrations } from '../migrations/definitions';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

function printUsage(): void {
  console.log(`
Migration CLI

Usage: pnpm --filter @saas/db migrate [command]

Commands:
  status    Show all migrations and their status
  list      List available migration files
  help      Show this help message

Note: To apply migrations to D1, use wrangler CLI:

  # Local development
  wrangler d1 execute DB --local --file=packages/db/src/migrations/001_initial_schema.sql

  # Production
  wrangler d1 execute DB --file=packages/db/src/migrations/001_initial_schema.sql

For programmatic migration control, use the MigrationRunner class in your API:

  import { MigrationRunner, migrations } from '@saas/db/migrations';
  
  const runner = new MigrationRunner(env.DB, migrations);
  await runner.migrateUp();
`);
}


function listMigrations(): void {
  console.log('\nAvailable migrations:');
  console.log('─'.repeat(60));
  
  migrations.forEach((m, index) => {
    console.log(`  ${index + 1}. ${m.name}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`\nTotal: ${migrations.length} migration(s)`);
}

function showStatus(): void {
  console.log('\nMigration Status:');
  console.log('─'.repeat(60));
  console.log('Note: Status tracking requires D1 database connection.');
  console.log('Use the MigrationRunner class in your API to check status.\n');
  
  listMigrations();
  
  console.log('\nTo check applied migrations in D1:');
  console.log('  wrangler d1 execute DB --local --command="SELECT * FROM migrations"');
}

function getSqlFiles(): string[] {
  try {
    return fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();
  } catch {
    return [];
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  switch (command) {
    case 'status':
      showStatus();
      break;
    
    case 'list':
      listMigrations();
      console.log('\nSQL files in migrations directory:');
      const sqlFiles = getSqlFiles();
      if (sqlFiles.length > 0) {
        sqlFiles.forEach(f => console.log(`  - ${f}`));
      } else {
        console.log('  (no SQL files found)');
      }
      break;
    
    case 'help':
    default:
      printUsage();
      break;
  }
}

main().catch(console.error);
