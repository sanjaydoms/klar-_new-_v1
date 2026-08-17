import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { countryCode } from './domain/shared/brand.js';
import type { MarkupRule } from './domain/pricing/markup.js';
import type { UnifiedHotelSearchRequest } from './domain/search/request.js';
import type { QueryableClient } from './infrastructure/db/database.js';
import { migrate } from './infrastructure/db/migrate.js';
import { createDatabase } from './infrastructure/db/database.js';
import type { Logger } from './modules/ports.js';
import {
  buildHotelApi,
  DEFAULT_API_CONFIG,
  type SupplierCredentials,
} from './composition/build-api.js';
import { HmacJwtVerifier } from './infrastructure/auth/jwt-verifier.js';
import type { AuthVerifier } from './modules/ports.js';
import { RedisKeyValueStore, type RedisClient } from './infrastructure/rate-token/redis-store.js';
import type { KeyValueStore } from './infrastructure/rate-token/rate-token-store.js';

/**
 * `hotel-api` (ADR-0005 §1).
 *
 * One deployable. The entrypoint reads configuration, opens the two external
 * resources, hands them to the composition root and gets out of the way.
 *
 * Configuration is read here and only here. The reference read 80 distinct
 * environment variables across two services, most of them inline in business
 * logic, so what the system was configured to do could not be established
 * without grepping it.
 */

/** JSON-lines to stdout: one object per event, greppable and machine-readable. */
function createLogger(fields: Readonly<Record<string, unknown>> = {}): Logger {
  const emit = (level: string, message: string, extra?: Record<string, unknown>): void => {
    process.stdout.write(
      `${JSON.stringify({ level, message, ...fields, ...extra, at: new Date().toISOString() })}\n`,
    );
  };
  return {
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
    child: (f) => createLogger({ ...fields, ...f }),
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const optional = (name: string): string | undefined => {
  const value = process.env[name];
  return value !== undefined && value.trim().length > 0 ? value : undefined;
};

/**
 * Markup rules as JSON.
 *
 * Configuration, not code (ADR-0007 §1): the margin is a commercial decision
 * and changing it must not need a deploy. Absent means **no markup at all** —
 * selling at cost — so it is refused rather than defaulted. The reference
 * treated an unreachable config service as "no rules", which silently sold at
 * cost.
 */
function readMarkupRules(): readonly MarkupRule[] {
  const raw = required('KLAR_MARKUP_RULES');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('KLAR_MARKUP_RULES is not valid JSON');
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('KLAR_MARKUP_RULES must be a non-empty array of markup rules');
  }
  return parsed as readonly MarkupRule[];
}

/**
 * Cache warming (ADR-0005 §4-5). Absent means no warming — there is nothing
 * in this repository yet that could infer what is worth keeping warm
 * (Phase 10, observability), so, like `KLAR_MARKUP_RULES`, it is a stated
 * list rather than a guess.
 */
function readWarmTargets(): readonly UnifiedHotelSearchRequest[] {
  const raw = optional('KLAR_WARM_TARGETS');
  if (raw === undefined) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('KLAR_WARM_TARGETS is not valid JSON');
  }
  if (!Array.isArray(parsed)) throw new Error('KLAR_WARM_TARGETS must be a JSON array');
  return parsed as readonly UnifiedHotelSearchRequest[];
}

/**
 * Absent means every commit and cancel is refused (`buildHotelApi` warns at
 * boot and installs `refusingAuthVerifier`). There is no default that lets a
 * request through unverified — OPEN-ISSUES §4's one item that must not reach
 * production unresolved.
 */
function readAuthVerifier(): AuthVerifier | undefined {
  const secret = optional('KLAR_AUTH_JWT_SECRET');
  return secret === undefined ? undefined : new HmacJwtVerifier({ secret });
}

/**
 * Absent means the retention job never starts and `booking_supplier_payload`
 * rows are kept forever — the honest default until someone states a window
 * (OPEN-ISSUES §4: "no retention policy").
 */
function readPayloadRetentionMs(): number | undefined {
  const days = optional('KLAR_PAYLOAD_RETENTION_DAYS');
  if (days === undefined) return undefined;
  const parsed = Number(days);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('KLAR_PAYLOAD_RETENTION_DAYS must be a positive number of days');
  }
  return parsed * 24 * 60 * 60 * 1000;
}

/** Absent means `createApiServer`'s own defaults apply (300 requests / 60 s per IP). */
function readRateLimit(): { windowMs?: number; maxRequests?: number } {
  const windowMs = optional('KLAR_RATE_LIMIT_WINDOW_MS');
  const maxRequests = optional('KLAR_RATE_LIMIT_MAX_REQUESTS');
  return {
    ...(windowMs !== undefined ? { windowMs: Number(windowMs) } : {}),
    ...(maxRequests !== undefined ? { maxRequests: Number(maxRequests) } : {}),
  };
}

function readCredentials(): SupplierCredentials {
  const tjKey = optional('TRIPJACK_API_KEY');
  const rgKey = optional('RATEGAIN_API_KEY');

  return {
    ...(tjKey !== undefined
      ? {
          tripjack: {
            hmsBaseUrl: required('TRIPJACK_HMS_BASE_URL'),
            omsBaseUrl: required('TRIPJACK_OMS_BASE_URL'),
            apiKey: tjKey,
            agencyId: required('TRIPJACK_AGENCY_ID'),
            ...(optional('TRIPJACK_IMAGE_BASE_URL') !== undefined
              ? { imageBaseUrl: optional('TRIPJACK_IMAGE_BASE_URL') as string }
              : {}),
          },
        }
      : {}),
    ...(rgKey !== undefined
      ? {
          rategain: {
            baseUrl: required('RATEGAIN_BASE_URL'),
            apiKey: rgKey,
            apiSecret: required('RATEGAIN_API_SECRET'),
            ...(optional('RATEGAIN_IMAGE_BASE_URL') !== undefined
              ? { imageBaseUrl: optional('RATEGAIN_IMAGE_BASE_URL') as string }
              : {}),
          },
        }
      : {}),
  };
}

/**
 * Open the database.
 *
 * `pg` is imported dynamically so it is a deployment dependency rather than a
 * compile-time one: the engine and its whole test suite build and run without a
 * driver installed, which is what keeps `src/` free of runtime dependencies.
 */
interface PgModule {
  readonly default?: { new (config: PoolConfig): QueryableClient };
  readonly Pool?: { new (config: PoolConfig): QueryableClient };
}
interface PoolConfig {
  readonly connectionString: string;
  readonly max?: number;
}

async function openDatabase(logger: Logger): Promise<QueryableClient> {
  const connectionString = required('DATABASE_URL');

  // The specifier is a variable so the compiler does not resolve it: `pg` is a
  // dependency of the DEPLOYABLE, not of the engine, and `src/` plus its whole
  // test suite must build and run without a driver installed. Declared in
  // package.json `dependencies`; absent here it fails loudly at boot, which is
  // the right time.
  const specifier = 'pg';
  const mod = (await import(/* @vite-ignore */ specifier)) as PgModule;
  const Pool = mod.Pool ?? (mod.default as PgModule['Pool']);
  if (Pool === undefined) throw new Error('the pg driver is installed but exports no Pool');

  logger.info('connecting to postgres');
  return new Pool({ connectionString, max: Number(optional('DATABASE_POOL_MAX') ?? 10) });
}

/**
 * Open Redis, if configured.
 *
 * Absent `REDIS_URL` is a valid, ordinary deployment: `buildHotelApi` falls
 * back to an in-memory store and warns, which is correct for exactly one
 * process (ADR-0005 §5). Multi-instance deployments must set it.
 */
interface IoredisModule {
  readonly default?: new (url: string) => RedisClient;
}

async function openRedis(logger: Logger): Promise<KeyValueStore | undefined> {
  const url = optional('REDIS_URL');
  if (url === undefined) return undefined;

  // Same reasoning as `pg`: a dependency of the deployable, not the engine.
  const specifier = 'ioredis';
  const mod = (await import(/* @vite-ignore */ specifier)) as IoredisModule;
  const Redis = mod.default;
  if (Redis === undefined) throw new Error('the ioredis driver is installed but exports no default');

  logger.info('connecting to redis');
  return new RedisKeyValueStore(new Redis(url));
}

export async function main(): Promise<void> {
  const logger = createLogger({ service: 'hotel-api' });
  const port = Number(optional('PORT') ?? 5030);

  const rateLimit = readRateLimit();
  const db = await openDatabase(logger);
  if (optional('RUN_MIGRATIONS') === 'true') {
    await migrate(createDatabase(db));
    logger.info('migrations applied');
  }
  const kv = await openRedis(logger);

  const { server, warmer, reconciler, retentionJob } = buildHotelApi(
    {
      ...DEFAULT_API_CONFIG,
      homeCountry: countryCode(optional('KLAR_HOME_COUNTRY') ?? 'IN'),
      markupRules: readMarkupRules(),
      corsOrigins: (optional('KLAR_CORS_ORIGINS') ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter((o) => o.length > 0),
      warmTargets: readWarmTargets(),
      payloadRetentionMs: readPayloadRetentionMs(),
      rateLimitWindowMs: rateLimit.windowMs,
      rateLimitMaxRequests: rateLimit.maxRequests,
    },
    { db, logger, credentials: readCredentials(), auth: readAuthVerifier(), kv },
  );

  server.listen(port, () => logger.info('listening', { port }));

  /**
   * Stop accepting, then finish what is in flight.
   *
   * A search holds supplier calls and may have issued rate tokens; killing it
   * mid-flight leaves the customer with a price that resolves to nothing. The
   * timeout is the backstop for a connection that will not drain.
   */
  const shutdown = (signal: string): void => {
    logger.info('shutting down', { signal });
    warmer.stop();
    reconciler.stop();
    retentionJob?.stop();
    const forced = setTimeout(() => {
      logger.error('shutdown timed out; exiting anyway');
      process.exit(1);
    }, 25_000);
    forced.unref();

    server.close(() => {
      logger.info('closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Only when executed, never when imported by a test.
//
// Compare real filesystem paths, not a URL against a path: import.meta.url is
// percent-encoded, so a repository checked out under a directory containing a
// space (or any character a URL escapes) never matched, and `npm start` exited
// zero having silently done nothing.
if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        level: 'error',
        message: 'failed to start',
        reason: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
    process.exit(1);
  });
}
