import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { countryCode, klarBookingId, searchId, type CountryCode } from '../domain/shared/brand.js';
import type { MarkupRegion, MarkupRule } from '../domain/pricing/markup.js';
import type { SelectionPolicy } from '../domain/deal/selection.js';
import { createDatabase, type QueryableClient } from '../infrastructure/db/database.js';
import { PostgresPropertyRepository } from '../infrastructure/repositories/postgres-property-repository.js';
import { PostgresDestinationResolver } from '../infrastructure/repositories/postgres-destination-resolver.js';
import { PostgresBookingRepository } from '../infrastructure/repositories/postgres-booking-repository.js';
import { CachedPropertyRepository } from '../infrastructure/repositories/cached-property-repository.js';
import { CachedDestinationResolver } from '../infrastructure/repositories/cached-destination-resolver.js';
import {
  InMemoryKeyValueStore,
  KeyValueRateTokenStore,
  type KeyValueStore,
} from '../infrastructure/rate-token/rate-token-store.js';
import { KeyValueCache } from '../infrastructure/cache/cache.js';
import { InFlightCoalescer } from '../infrastructure/cache/coalescer.js';
import { SupplierRegistry, type SupplierConfig } from '../suppliers/contract/registry.js';
import { CircuitBreaker } from '../suppliers/common/circuit-breaker.js';
import { RateGainAdapter } from '../suppliers/rategain/adapter.js';
import { RATEGAIN } from '../suppliers/rategain/config.js';
import { TripJackAdapter } from '../suppliers/tripjack/adapter.js';
import { createNationalityResolver } from '../suppliers/tripjack/nationality.js';
import { TRIPJACK } from '../suppliers/tripjack/config.js';
import { createFetchTransport, type FetchTransportOptions, type HttpTransport } from '../suppliers/common/http.js';
import { PricingService } from '../modules/pricing/pricing-service.js';
import { SearchOrchestrator } from '../modules/search/orchestrator.js';
import {
  CacheWarmer,
  DEFAULT_WARM_CONCURRENCY,
  DEFAULT_WARM_INTERVAL_MS,
} from '../modules/search/warming.js';
import {
  BookingReconciler,
  DEFAULT_RECONCILE_BATCH_SIZE,
  DEFAULT_RECONCILE_CONCURRENCY,
  DEFAULT_RECONCILE_INTERVAL_MS,
} from '../modules/booking/reconciler.js';
import {
  PayloadRetentionJob,
  DEFAULT_RETENTION_INTERVAL_MS,
} from '../modules/booking/payload-retention.js';
import { MetricsRegistry } from '../infrastructure/metrics/registry.js';
import type { UnifiedHotelSearchRequest } from '../domain/search/request.js';
import { HotelDetailService } from '../modules/detail/detail-service.js';
import { RevalidationService } from '../modules/revalidation/revalidation-service.js';
import { BookingService } from '../modules/booking/booking-service.js';
import type {
  AuthVerifier,
  BookingRepository,
  Clock,
  IdGenerator,
  Logger,
  MarkupProvider,
  PaymentGateway,
} from '../modules/ports.js';
import { refusingAuthVerifier } from '../infrastructure/auth/jwt-verifier.js';
import { createApiServer } from '../api/server.js';

/**
 * The composition root: the one place concrete implementations meet the engine.
 *
 * Everything below the API is wired here and nowhere else. Modules take ports;
 * nothing inside them reaches for a database, a clock, a random number or an
 * HTTP client, which is what lets the whole engine run against in-memory fakes
 * in the test suite.
 *
 * The two external resources it does NOT construct are deliberate. A Postgres
 * client and a key/value store are passed in, so this function has no runtime
 * dependency on a driver and can be exercised end-to-end against PGlite and an
 * in-memory map — the same code path production takes.
 */
export interface SupplierCredentials {
  readonly tripjack?: {
    readonly hmsBaseUrl: string;
    readonly omsBaseUrl: string;
    readonly apiKey: string;
    readonly agencyId: string;
    readonly imageBaseUrl?: string;
  };
  readonly rategain?: {
    readonly baseUrl: string;
    readonly apiKey: string;
    readonly apiSecret: string;
    readonly imageBaseUrl?: string;
  };
}

export interface ApiConfig {
  readonly homeCountry: CountryCode;
  /**
   * ADR-0007 §2. Stated here rather than defaulted anywhere, because a policy
   * that can be inherited is a policy nobody decided.
   */
  readonly selectionPolicy: SelectionPolicy;
  readonly searchDeadlineMs: number;
  readonly detailDeadlineMs: number;
  /** Budget for a precheck. It is the first leg of a booking, not a search. */
  readonly precheckDeadlineMs: number;
  /** Budget for a commit, a poll or a cancel. Longer: money has already moved. */
  readonly bookDeadlineMs: number;
  readonly rateTokenTtlMs: number;
  readonly markupRules: readonly MarkupRule[];
  readonly corsOrigins: readonly string[];
  readonly supplierConfig: Readonly<Record<string, Partial<SupplierConfig>>>;
  /** A flood backstop, not a product decision — `createApiServer`'s own defaults apply if absent. */
  readonly rateLimitWindowMs?: number;
  readonly rateLimitMaxRequests?: number;
  /**
   * Cache warming (ADR-0005 §4-5). Absent or empty means no warming — the
   * honest default, since nothing here can infer what is worth warming.
   */
  readonly warmTargets?: readonly UnifiedHotelSearchRequest[];
  readonly warmIntervalMs?: number;
  readonly warmConcurrency?: number;
  /**
   * The reconciliation worker (OPEN-ISSUES §4: "nothing polls a pending
   * booking"). Always runs — unlike warming, there is no configuration under
   * which leaving a booking unsettled forever is the right default.
   */
  readonly reconcileIntervalMs?: number;
  readonly reconcileBatchSize?: number;
  readonly reconcileConcurrency?: number;
  /**
   * `booking_supplier_payload` retention (OPEN-ISSUES §4). Absent means the
   * purge job never starts — there is no default retention window, because
   * guessing one is a policy decision, not an engineering default.
   */
  readonly payloadRetentionMs?: number;
  readonly payloadRetentionIntervalMs?: number;
}

export const DEFAULT_API_CONFIG: Omit<ApiConfig, 'markupRules'> = {
  homeCountry: countryCode('IN'),
  // ADR-0007 §2, confirmed by KLAR 2026-08-13.
  selectionPolicy: 'EQUIVALENT_CLASS_PREFERRED',
  // ADR-0003: 15 s hard, derived from RateGain's measured international
  // geofilter (~14.2 s).
  searchDeadlineMs: 15_000,
  detailDeadlineMs: 20_000,
  precheckDeadlineMs: 30_000,
  // TripJack's own book-then-poll window is 180 s; a commit that gives up
  // sooner leaves a reservation whose outcome nobody knows.
  bookDeadlineMs: 90_000,
  rateTokenTtlMs: 15 * 60 * 1000,
  corsOrigins: [],
  supplierConfig: {},
};

export interface Externals {
  /** A `pg.Pool`-shaped client. Injected so this module needs no driver. */
  readonly db: QueryableClient;
  /**
   * Redis in production.
   *
   * Defaults to an in-memory map, which is correct for exactly one process: a
   * rate token issued by one instance must resolve on another, so a multi-
   * instance deployment MUST pass a shared store or booking will fail on any
   * request that lands elsewhere.
   */
  readonly kv?: KeyValueStore;
  readonly logger: Logger;
  readonly clock?: Clock;
  readonly credentials: SupplierCredentials;
  /**
   * How a booking is paid for.
   *
   * Absent means no gateway is configured, and the commit path then declines at
   * the charge rather than booking rooms nobody paid for. There is no default
   * that says yes.
   */
  readonly payments?: PaymentGateway;
  /**
   * Verifies the bearer token on `commit` and `cancel`.
   *
   * Absent means every such request is refused with 401 — the same posture
   * `payments` takes on a charge. OPEN-ISSUES §4 names an unauthenticated
   * commit route as the one gap that must not reach production; there is no
   * default that lets a request through unverified.
   */
  readonly auth?: AuthVerifier;
  /**
   * How a supplier transport is built. Defaults to fetch.
   *
   * A seam, not a test hook: it is the one place the composition root touches
   * the network, so overriding it is how the whole stack — database,
   * repositories, registry, adapters, orchestrator, HTTP — runs end to end
   * against recorded payloads on the same code path production takes.
   */
  readonly createTransport?: (opts: FetchTransportOptions) => HttpTransport;
}

/**
 * Markup rules from configuration, versioned by their own content.
 *
 * `version()` is part of the dynamic cache key, so it has to change whenever a
 * rule does — a hash of the rules gives that for free and cannot drift from
 * what it describes. The reference read markup from a config service and cached
 * it with no version at all, so a margin edit took effect only when a TTL
 * happened to expire.
 */
export class ConfigMarkupProvider implements MarkupProvider {
  readonly #rules: readonly MarkupRule[];
  readonly #version: string;

  constructor(rules: readonly MarkupRule[]) {
    this.#rules = rules;
    this.#version = createHash('sha256')
      .update(JSON.stringify(rules))
      .digest('hex')
      .slice(0, 12);
  }

  rulesFor(region: MarkupRegion, channel: 'B2C' | 'B2B'): Promise<readonly MarkupRule[]> {
    void channel;
    void region;
    // Region and channel selection happens in `resolveRule`, against the whole
    // set: a provider that pre-filtered would hide the ALL fallback.
    return Promise.resolve(this.#rules);
  }

  version(): string {
    return this.#version;
  }
}

const systemClock: Clock = { now: () => Date.now() };

const uuidIds: IdGenerator = {
  searchId: () => searchId(`KLAR-SRCH-${randomUUID()}`),
  correlationId: () => randomUUID(),
  bookingId: () => klarBookingId(`KLAR-BKG-${randomUUID()}`),
  // Unguessable, and not derived from the booking id: the id turns up in logs
  // and support tickets, and one must not be recoverable from the other.
  publicToken: () => randomUUID().replace(/-/g, ''),
};

function supplierConfig(
  code: SupplierConfig['code'],
  overrides: Partial<SupplierConfig> = {},
): SupplierConfig {
  return {
    code,
    enabled: true,
    priority: 0,
    // ADR-0003: inside the 15 s search deadline, which `withBudget` clamps to.
    searchTimeoutMs: 14_000,
    detailTimeoutMs: 20_000,
    bookTimeoutMs: 60_000,
    maxRetries: 1,
    maxConcurrency: 4,
    circuitBreaker: { failureThreshold: 5, openMs: 30_000 },
    countries: [],
    maintenanceMode: false,
    reliabilityScore: 50,
    ...overrides,
  };
}

export interface BuiltApi {
  readonly server: Server;
  readonly registry: SupplierRegistry;
  /** Exposed for the worker and for tests; the API reaches it through handlers. */
  readonly bookings: BookingRepository;
  /** Started here if `warmTargets` is non-empty. The caller must `stop()` it on shutdown. */
  readonly warmer: CacheWarmer;
  /** Always started. The caller must `stop()` it on shutdown. */
  readonly reconciler: BookingReconciler;
  /** Started only when `payloadRetentionMs` is configured. Absent means no purge job runs at all. */
  readonly retentionJob?: PayloadRetentionJob;
  /** Exposed for tests; the API reaches it through `GET /metrics`. */
  readonly metrics: MetricsRegistry;
}

export function buildHotelApi(config: ApiConfig, externals: Externals): BuiltApi {
  const db = createDatabase(externals.db);
  const clock = externals.clock ?? systemClock;
  const logger = externals.logger;

  const transport = externals.createTransport ?? createFetchTransport;
  const pricing = new PricingService(new ConfigMarkupProvider(config.markupRules));
  // Always on — an in-process counter registry costs nothing to keep running
  // and needs no configuration, unlike warming, retention or auth.
  const metrics = new MetricsRegistry();

  if (externals.auth === undefined) {
    logger.warn('no auth verifier is configured: every commit and cancel will be refused');
  }
  const auth = externals.auth ?? refusingAuthVerifier;

  if (externals.kv === undefined) {
    logger.warn(
      'rate tokens are in-memory: a token issued here will not resolve on another instance',
    );
  }
  // One store, three users: rate tokens, the dynamic search cache and the
  // catalogue/destination cache below. They namespace their own keys, so
  // sharing it is a connection saved rather than a collision.
  const sharedKv = externals.kv ?? new InMemoryKeyValueStore(() => clock.now());
  const rateTokens = new KeyValueRateTokenStore({
    kv: sharedKv,
    newId: () => randomUUID(),
    now: () => clock.now(),
    maxTtlMs: config.rateTokenTtlMs,
  });

  // ADR-0005 §4's "static property" and "destination / geo" layers, over the
  // same store as everything else. Built before the repositories so they can
  // wrap them.
  const cache = new KeyValueCache({ kv: sharedKv, now: () => clock.now(), logger });
  const coalescer = new InFlightCoalescer();
  const properties = new CachedPropertyRepository(new PostgresPropertyRepository(db), cache);
  const destinations = new CachedDestinationResolver(new PostgresDestinationResolver(db), cache);

  const registry = new SupplierRegistry();

  // A supplier with no credentials is not registered at all. Registering one
  // that cannot authenticate would report it as ERROR on every search and open
  // its circuit breaker, which reads as an outage rather than as "not
  // configured".
  /**
   * The breaker an operator configured, rather than the adapter's own default.
   *
   * `SupplierConfig.circuitBreaker` was read from configuration, defaulted, and
   * then never reached a breaker: each adapter built its own with a hardcoded
   * 5 / 30 s. Tuning a flaky supplier's threshold had no effect at all.
   */
  const breakerFor = (cfg: SupplierConfig): CircuitBreaker =>
    new CircuitBreaker({ ...cfg.circuitBreaker, now: () => clock.now() });

  if (externals.credentials.tripjack !== undefined) {
    const tj = externals.credentials.tripjack;
    const tjConfig = supplierConfig(TRIPJACK, config.supplierConfig[String(TRIPJACK)] ?? {});
    const hms = transport({
      baseUrl: tj.hmsBaseUrl,
      headers: { apikey: tj.apiKey, agencyid: tj.agencyId },
    });
    registry.register(
      new TripJackAdapter({
        hms,
        oms: transport({ baseUrl: tj.omsBaseUrl, headers: { apikey: tj.apiKey, agencyid: tj.agencyId } }),
        credentials: {
          hmsBaseUrl: tj.hmsBaseUrl,
          omsBaseUrl: tj.omsBaseUrl,
          apiKey: tj.apiKey,
          agencyId: tj.agencyId,
          ...(tj.imageBaseUrl !== undefined ? { imageBaseUrl: tj.imageBaseUrl } : {}),
        },
        /**
         * TripJack takes its own country id, not an ISO code.
         *
         * This used to pass `"IN"` straight through, on the reasoning that only
         * booking needed the real lookup. It does not hold: nationality reaches
         * every listing and pricing call, and it decides both price and
         * availability — so search was asking TripJack to price a traveller it
         * had not described. `/hms/v3/nationality-info` is the table, fetched
         * once and cached.
         */
        resolveNationality: createNationalityResolver({ transport: hms }),
        newCorrelationId: () => randomUUID(),
        now: () => clock.now(),
        breaker: breakerFor(tjConfig),
        timeoutMs: tjConfig.searchTimeoutMs,
        maxRetries: tjConfig.maxRetries,
      }),
      tjConfig,
    );
  }

  if (externals.credentials.rategain !== undefined) {
    const rg = externals.credentials.rategain;
    const rgConfig = supplierConfig(RATEGAIN, config.supplierConfig[String(RATEGAIN)] ?? {});
    registry.register(
      new RateGainAdapter({
        transport: transport({
          baseUrl: rg.baseUrl,
          headers: { 'x-api-key': rg.apiKey, 'x-api-secret': rg.apiSecret },
        }),
        credentials: {
          baseUrl: rg.baseUrl,
          apiKey: rg.apiKey,
          apiSecret: rg.apiSecret,
          ...(rg.imageBaseUrl !== undefined ? { imageBaseUrl: rg.imageBaseUrl } : {}),
        },
        newEchoToken: () => randomUUID(),
        now: () => clock.now(),
        breaker: breakerFor(rgConfig),
        timeoutMs: rgConfig.searchTimeoutMs,
        maxRetries: rgConfig.maxRetries,
      }),
      rgConfig,
    );
  }

  if (registry.all().length === 0) {
    logger.warn('no supplier is configured: every search will return nothing');
  }

  const orchestrator = new SearchOrchestrator({
    registry,
    destinations,
    properties,
    pricing,
    rateTokens,
    cache,
    coalescer,
    clock,
    ids: uuidIds,
    logger,
    metrics,
    config: {
      deadlineMs: config.searchDeadlineMs,
      homeCountry: config.homeCountry,
      selectionPolicy: config.selectionPolicy,
      rateTokenTtlMs: config.rateTokenTtlMs,
    },
  });

  const detail = new HotelDetailService({
    registry,
    properties,
    pricing,
    rateTokens,
    clock,
    ids: uuidIds,
    logger,
    config: {
      deadlineMs: config.detailDeadlineMs,
      homeCountry: config.homeCountry,
      selectionPolicy: config.selectionPolicy,
      rateTokenTtlMs: config.rateTokenTtlMs,
      includeContent: true,
    },
  });

  /**
   * The booking gate.
   *
   * Its own deadline rather than the search one: a precheck is the first leg of
   * a booking, and a customer who has reached the review page will wait longer
   * than one browsing results. The per-supplier budget inside it is
   * `bookTimeoutMs`, which already exists on `SupplierConfig`.
   */
  const revalidation = new RevalidationService({
    registry,
    rateTokens,
    pricing,
    clock,
    ids: uuidIds,
    logger,
    config: { deadlineMs: config.precheckDeadlineMs },
  });

  const bookings = new PostgresBookingRepository(db);

  /**
   * One booking path, for every supplier.
   *
   * Its own deadline again, and a longer one: a commit is the step a customer
   * has already paid for, and abandoning it because a search-shaped budget ran
   * out would leave a reservation whose outcome nobody knows.
   */
  const booking = new BookingService({
    registry,
    revalidation,
    rateTokens,
    bookings,
    properties,
    payments: externals.payments ?? refusingPaymentGateway(logger),
    clock,
    ids: uuidIds,
    logger,
    config: { deadlineMs: config.bookDeadlineMs },
  });

  const server = createApiServer({
    deps: {
      orchestrator,
      detail,
      destinations,
      properties,
      logger,
      defaultCountry: config.homeCountry,
      knownSuppliers: new Set(registry.all().map((s) => String(s.config.code))),
      revalidation,
      booking,
      bookings,
      auth,
      metrics,
    },
    corsOrigins: config.corsOrigins,
    rateLimit: { windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitMaxRequests },
  });

  const warmer = new CacheWarmer(orchestrator, logger, {
    targets: config.warmTargets ?? [],
    intervalMs: config.warmIntervalMs ?? DEFAULT_WARM_INTERVAL_MS,
    concurrency: config.warmConcurrency ?? DEFAULT_WARM_CONCURRENCY,
  });
  warmer.start();

  const reconciler = new BookingReconciler(bookings, booking, logger, {
    intervalMs: config.reconcileIntervalMs ?? DEFAULT_RECONCILE_INTERVAL_MS,
    batchSize: config.reconcileBatchSize ?? DEFAULT_RECONCILE_BATCH_SIZE,
    concurrency: config.reconcileConcurrency ?? DEFAULT_RECONCILE_CONCURRENCY,
  });
  reconciler.start();

  // No default retention window: absent config, this job simply never exists.
  let retentionJob: PayloadRetentionJob | undefined;
  if (config.payloadRetentionMs !== undefined) {
    retentionJob = new PayloadRetentionJob(bookings, clock, logger, {
      retentionMs: config.payloadRetentionMs,
      intervalMs: config.payloadRetentionIntervalMs ?? DEFAULT_RETENTION_INTERVAL_MS,
    });
    retentionJob.start();
  }

  return {
    server,
    registry,
    bookings,
    warmer,
    reconciler,
    metrics,
    ...(retentionJob !== undefined ? { retentionJob } : {}),
  };
}

/**
 * The gateway when none is configured: it declines, loudly.
 *
 * KLAR has no gateway credentials in this repository, and the alternative — a
 * gateway that says yes — would let a deployment book real rooms against
 * payments nobody took. Declining leaves the commit path fully exercised and
 * fully safe: the booking is created, the charge fails, and nothing reaches a
 * supplier.
 */
function refusingPaymentGateway(logger: Logger): PaymentGateway {
  logger.warn('no payment gateway is configured: every commit will decline at the charge');
  return {
    authorize: () =>
      Promise.resolve({ ok: false as const, reason: 'no payment gateway is configured' }),
    refund: () =>
      Promise.resolve({ ok: false, error: 'no payment gateway is configured' }),
  };
}
