/**
 * Migration Runner
 * Handles applying and rolling back database migrations
 */

import type { Migration, AppliedMigration, MigrationResult, MigrationStatus } from './types';

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

export class MigrationRunner {
  private db: D1Database;
  private migrations: Migration[];

  constructor(db: D1Database, migrations: Migration[]) {
    this.db = db;
    this.migrations = migrations.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Ensure the migrations table exists
   */
  async ensureMigrationsTable(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }


  /**
   * Get list of applied migrations from database
   */
  async getAppliedMigrations(): Promise<AppliedMigration[]> {
    await this.ensureMigrationsTable();
    const result = await this.db.prepare(
      'SELECT id, name, applied_at FROM migrations ORDER BY name ASC'
    ).all<AppliedMigration>();
    return result.results || [];
  }

  /**
   * Get status of all migrations
   */
  async getStatus(): Promise<MigrationStatus[]> {
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map(m => [m.name, m]));

    return this.migrations.map(m => ({
      name: m.name,
      applied: appliedMap.has(m.name),
      applied_at: appliedMap.get(m.name)?.applied_at,
    }));
  }

  /**
   * Get pending migrations (not yet applied)
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const appliedNames = new Set(applied.map(m => m.name));
    return this.migrations.filter(m => !appliedNames.has(m.name));
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<MigrationResult> {
    try {
      // Execute the up migration
      await this.db.exec(migration.up);
      
      // Record the migration
      await this.db.prepare(
        'INSERT INTO migrations (name) VALUES (?)'
      ).bind(migration.name).run();

      return {
        success: true,
        name: migration.name,
        direction: 'up',
      };
    } catch (error) {
      return {
        success: false,
        name: migration.name,
        direction: 'up',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Rollback a single migration
   */
  async rollbackMigration(migration: Migration): Promise<MigrationResult> {
    try {
      // Execute the down migration
      await this.db.exec(migration.down);
      
      // Remove the migration record
      await this.db.prepare(
        'DELETE FROM migrations WHERE name = ?'
      ).bind(migration.name).run();

      return {
        success: true,
        name: migration.name,
        direction: 'down',
      };
    } catch (error) {
      return {
        success: false,
        name: migration.name,
        direction: 'down',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Apply all pending migrations
   */
  async migrateUp(): Promise<MigrationResult[]> {
    const pending = await this.getPendingMigrations();
    const results: MigrationResult[] = [];

    for (const migration of pending) {
      const result = await this.applyMigration(migration);
      results.push(result);
      
      if (!result.success) {
        // Stop on first failure
        break;
      }
    }

    return results;
  }

  /**
   * Rollback the last applied migration
   */
  async migrateDown(): Promise<MigrationResult | null> {
    const applied = await this.getAppliedMigrations();
    
    if (applied.length === 0) {
      return null;
    }

    // Get the last applied migration
    const lastApplied = applied[applied.length - 1];
    const migration = this.migrations.find(m => m.name === lastApplied.name);

    if (!migration) {
      return {
        success: false,
        name: lastApplied.name,
        direction: 'down',
        error: `Migration file not found for: ${lastApplied.name}`,
      };
    }

    return this.rollbackMigration(migration);
  }

  /**
   * Rollback all migrations
   */
  async migrateDownAll(): Promise<MigrationResult[]> {
    const results: MigrationResult[] = [];
    
    let result = await this.migrateDown();
    while (result !== null) {
      results.push(result);
      if (!result.success) {
        break;
      }
      result = await this.migrateDown();
    }

    return results;
  }

  /**
   * Reset database (rollback all, then apply all)
   */
  async reset(): Promise<{ down: MigrationResult[]; up: MigrationResult[] }> {
    const down = await this.migrateDownAll();
    const up = await this.migrateUp();
    return { down, up };
  }
}
