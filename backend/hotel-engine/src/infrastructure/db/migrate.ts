import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './database.js';

/**
 * Apply migrations, once each, in filename order.
 *
 * Idempotent by construction: a `schema_migration` ledger records what has run,
 * so calling this on every boot is safe and a half-applied deploy resumes
 * rather than double-applying.
 */
const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));

export interface Migration {
  readonly name: string;
  readonly sql: string;
}

export function loadMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
}

export async function migrate(db: Database, migrations = loadMigrations()): Promise<string[]> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migration (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await db.query<{ name: string }>('SELECT name FROM schema_migration')).map((r) => r.name),
  );

  const ran: string[] = [];
  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    // Each migration is its own transaction: one failing does not roll back the
    // ones before it, and the ledger stays honest about where it stopped.
    await db.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.query('INSERT INTO schema_migration (name) VALUES ($1)', [migration.name]);
    });
    ran.push(migration.name);
  }
  return ran;
}
