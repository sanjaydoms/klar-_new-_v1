import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import type { Database } from '../db/database.js';
import { createDatabase, type QueryableClient } from '../db/database.js';
import { migrate } from '../db/migrate.js';

/**
 * A real PostgreSQL 16, in-process, for tests.
 *
 * PGlite runs the actual engine compiled to WASM, so the migrations, the
 * constraints, the trigram index and `ON CONFLICT` semantics are all genuinely
 * exercised — not approximated by a fake. A repository verified only against a
 * hand-written stub is verified against the author's beliefs about SQL.
 *
 * `pg_trgm` is loaded as a contrib extension. PostGIS is not available here,
 * which is one reason the schema uses a bounding box on indexed `(lat, lng)`
 * and computes exact distances in the domain instead.
 */
export interface TestDatabase {
  readonly db: Database;
  /**
   * The raw client, for code that wraps its own.
   *
   * The composition root takes a `pg.Pool`-shaped client and calls
   * `createDatabase` itself, so handing it `db` would wrap a `Database` in a
   * `Database` — which type-checks through an `as` and fails at runtime.
   */
  readonly client: QueryableClient;
  close(): Promise<void>;
  /** Empty every table, keeping the schema. Faster than re-migrating. */
  truncate(): Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = await PGlite.create({ extensions: { pg_trgm } });
  const client: QueryableClient = {
    query: async (sql: string, params?: readonly unknown[]) => {
      const result = await pg.query(sql, params as unknown[] | undefined);
      return { rows: result.rows as unknown[] };
    },
    // PGlite's extended protocol takes one statement at a time; migrations are
    // many, so DDL goes over the simple protocol.
    exec: async (sql: string) => {
      await pg.exec(sql);
    },
  };
  const db = createDatabase(client);

  await migrate(db);

  return {
    db,
    client,
    async close(): Promise<void> {
      await pg.close();
    },
    async truncate(): Promise<void> {
      await db.exec(`
        TRUNCATE canonical_hotel,
                 supplier_property_mapping,
                 match_candidate,
                 canonical_destination,
                 destination_mapping,
                 supplier_config,
                 booking,
                 booking_supplier_payload,
                 booking_event
        RESTART IDENTITY CASCADE;
      `);
    },
  };
}
