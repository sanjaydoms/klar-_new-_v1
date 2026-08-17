/**
 * The only way a repository reaches Postgres.
 *
 * An interface rather than a `pg.Pool`, for the same reason the supplier layer
 * takes an `HttpTransport`: the repositories can then be exercised against a
 * real Postgres running in-process (PGlite) with no server, and the same
 * conformance suite runs against them and against the in-memory fake.
 */
export type SqlValue =
  | string
  | number
  | boolean
  | null
  | Date
  | undefined
  /** Bound as a Postgres array; use with `= ANY($n)` or `unnest($n)`. */
  | readonly string[];

export interface SqlRow {
  readonly [column: string]: unknown;
}

export interface Database {
  query<T extends SqlRow = SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly T[]>;
  /** Multi-statement DDL. Not parameterised — never build this from input. */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T>;
}

/**
 * The shape both `pg.Pool` and PGlite already satisfy.
 *
 * Declaring it structurally means neither driver is a compile-time dependency
 * of this package: production wires a `pg.Pool` in one line, tests wire PGlite,
 * and nothing in `src/` imports either.
 */
export interface QueryableClient {
  query(sql: string, params?: readonly unknown[]): Promise<{ rows: unknown[] }>;
  /**
   * Run multi-statement SQL — migrations, chiefly.
   *
   * Parameterised queries go over the extended protocol, which accepts exactly
   * one statement; a migration file is many. `pg.Pool.query` happens to tolerate
   * both, PGlite does not, so a driver that needs the simple protocol exposes it
   * here and `exec` uses it.
   */
  exec?(sql: string): Promise<void>;
}

/**
 * Wrap any query-capable client.
 *
 * `transaction` issues real BEGIN/COMMIT/ROLLBACK. On a pooled client this is
 * only correct if the pool hands back a single dedicated connection — pass a
 * checked-out client, not the pool itself, when using node-postgres.
 */
export function createDatabase(client: QueryableClient): Database {
  const db: Database = {
    async query<T extends SqlRow = SqlRow>(
      sql: string,
      params: readonly SqlValue[] = [],
    ): Promise<readonly T[]> {
      const result = await client.query(sql, params as readonly unknown[]);
      return result.rows as T[];
    },

    async exec(sql: string): Promise<void> {
      if (client.exec !== undefined) await client.exec(sql);
      else await client.query(sql);
    },

    async transaction<T>(fn: (tx: Database) => Promise<T>): Promise<T> {
      await client.query('BEGIN');
      try {
        const out = await fn(db);
        await client.query('COMMIT');
        return out;
      } catch (err) {
        // A failed rollback must not mask the error that caused it.
        try {
          await client.query('ROLLBACK');
        } catch {
          /* the original error is the one worth reporting */
        }
        throw err;
      }
    },
  };
  return db;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** `$1, $2, …` for a list of values, offset by any parameters already bound. */
export function placeholders(count: number, offset = 0): string {
  return Array.from({ length: count }, (_, i) => `$${i + offset + 1}`).join(', ');
}

export const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/** Postgres returns `numeric` as a string, so every numeric column goes through here. */
export function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    const parsed = Number(v);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function asDate(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return undefined;
}

/** jsonb comes back parsed on some drivers and as text on others. */
export function asJson<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}
