/**
 * Migration system types
 */

export interface Migration {
  name: string;
  up: string;
  down: string;
}

export interface AppliedMigration {
  id: number;
  name: string;
  applied_at: string;
}

export interface MigrationResult {
  success: boolean;
  name: string;
  direction: 'up' | 'down';
  error?: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  applied_at?: string;
}
