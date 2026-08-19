import { HISTOGRAM_SIZE, bucketFor, percentileFrom } from "../constants/latency";
import { HEALTH_STATUS, HealthStatus } from "../constants/status";
import { BreakerState } from "../models/BreakerState.model";
import { HealthBucket } from "../models/HealthBucket.model";
import { IHealthThresholds, currentThresholds } from "../models/HealthThresholds.model";
import { Provider } from "../models/Provider.model";

/**
 * Health monitoring (§22, §23, §24).
 *
 * Two halves: `report` folds observations into per-minute buckets, and
 * `snapshot` reads them back as the provider -> service -> operation hierarchy
 * §57 asks for. Nothing here calls a supplier; the services that make the calls
 * describe what happened.
 */

/**
 * How a supplier call ended.
 *
 * Classified by the CALLER, which is the only place that can tell a timeout
 * from a rejection. Keeping the vocabulary small means the dashboard can be
 * specific — "the key was rejected" and "the host is down" send an operator to
 * different places (§40).
 */
export type CallOutcome =
  | "SUCCESS"
  | "TIMEOUT"
  | "AUTH_FAILED"
  | "SUPPLIER_ERROR"
  | "NETWORK_ERROR"
  | "OTHER_ERROR";

export interface CallReport {
  providerSlug: string;
  service: string;
  operation: string;
  environment: string;
  outcome: CallOutcome;
  durationMs: number;
  /** Already-safe classification. Never a payload, never a header. */
  reason?: string;
  /** When the call finished. Absent means now. */
  at?: string | Date;
}

const floorToMinute = (d: Date): Date =>
  new Date(Math.floor(d.getTime() / 60_000) * 60_000);

/**
 * Fold a batch of observations into their minute buckets.
 *
 * One bulk write for the whole batch, and every field is an $inc, so
 * concurrent reports from several service instances merge rather than
 * overwrite. The unique index makes the upsert safe under that concurrency.
 *
 * Never throws to the caller: losing a measurement is an acceptable outcome,
 * failing the request that produced it is not.
 */
export const report = async (reports: CallReport[]): Promise<number> => {
  if (!reports.length) return 0;

  const operations = reports.map((r) => {
    const at = r.at ? new Date(r.at) : new Date();
    const success = r.outcome === "SUCCESS";

    const inc: Record<string, number> = {
      requests: 1,
      successes: success ? 1 : 0,
      failures: success ? 0 : 1,
      timeouts: r.outcome === "TIMEOUT" ? 1 : 0,
      authFailures: r.outcome === "AUTH_FAILED" ? 1 : 0,
      supplierErrors: r.outcome === "SUPPLIER_ERROR" ? 1 : 0,
      durationSumMs: r.durationMs,
      [`histogram.${bucketFor(r.durationMs)}`]: 1,
    };

    return {
      updateOne: {
        filter: {
          providerSlug: r.providerSlug,
          service: r.service,
          operation: r.operation,
          environment: r.environment,
          minute: floorToMinute(at),
        },
        update: {
          $inc: inc,
          $set: success
            ? { lastSuccessAt: at }
            : { lastFailureAt: at, lastFailureReason: r.reason ?? r.outcome },
        },
        upsert: true,
      },
    };
  });

  try {
    // Unordered: one malformed report must not discard the rest of the batch.
    const res = await HealthBucket.bulkWrite(operations, { ordered: false });
    return res.upsertedCount + res.modifiedCount;
  } catch (err: any) {
    console.error(`[health] report failed: ${err?.message ?? err}`);
    return 0;
  }
};

export interface BreakerReport {
  providerSlug: string;
  service: string;
  operation: string;
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  since?: string | Date;
  consecutiveFailures?: number;
  lastReason?: string;
}

/**
 * Record what a calling process believes about its circuits.
 *
 * CLOSED reports are deleted rather than stored. The dashboard question is
 * "what is broken", and a row per healthy circuit per instance would bury the
 * two that matter under a hundred that do not.
 */
export const reportBreakers = async (
  reportedBy: string,
  breakers: BreakerReport[],
): Promise<number> => {
  if (!breakers.length) return 0;

  const now = new Date();
  const operations = breakers.map((b) =>
    b.state === "CLOSED"
      ? {
          deleteOne: {
            filter: {
              providerSlug: b.providerSlug,
              service: b.service,
              operation: b.operation,
              reportedBy,
            },
          },
        }
      : {
          updateOne: {
            filter: {
              providerSlug: b.providerSlug,
              service: b.service,
              operation: b.operation,
              reportedBy,
            },
            update: {
              $set: {
                state: b.state,
                reportedBy,
                reportedAt: now,
                since: b.since ? new Date(b.since) : now,
                consecutiveFailures: b.consecutiveFailures ?? 0,
                lastReason: b.lastReason,
              },
            },
            upsert: true,
          },
        },
  );

  try {
    const res = await BreakerState.bulkWrite(operations, { ordered: false });
    return res.upsertedCount + res.modifiedCount + res.deletedCount;
  } catch (err: any) {
    console.error(`[health] breaker report failed: ${err?.message ?? err}`);
    return 0;
  }
};

/** Every circuit not currently closed, newest report first. */
export const openCircuits = () =>
  BreakerState.find({ state: { $ne: "CLOSED" } })
    .sort({ reportedAt: -1 })
    .lean();

export interface Metrics {
  requests: number;
  successes: number;
  failures: number;
  timeouts: number;
  authFailures: number;
  supplierErrors: number;
  /** Percent, 0-100. Null when nothing was measured. */
  errorRate: number | null;
  averageMs: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  lastFailureReason: string | null;
  status: HealthStatus;
  /**
   * True when there were too few requests to say anything. The dashboard shows
   * "not enough data" rather than a status, because a status inferred from
   * three requests is a guess wearing a colour.
   */
  belowSampleSize: boolean;
}

const emptyMetrics = (): Metrics => ({
  requests: 0,
  successes: 0,
  failures: 0,
  timeouts: 0,
  authFailures: 0,
  supplierErrors: 0,
  errorRate: null,
  averageMs: null,
  p95Ms: null,
  p99Ms: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastFailureReason: null,
  status: HEALTH_STATUS.UNKNOWN,
  belowSampleSize: true,
});

/**
 * Measurement to status.
 *
 * Takes the WORSE of the error-rate verdict and the latency verdict: a
 * supplier answering every request in forty seconds is not healthy just
 * because none of them technically failed.
 */
const classify = (
  errorRate: number | null,
  p95: number | null,
  thresholds: IHealthThresholds,
): HealthStatus => {
  const rank: Record<HealthStatus, number> = {
    UNKNOWN: 0,
    HEALTHY: 1,
    WARNING: 2,
    DEGRADED: 3,
    CRITICAL: 4,
  };

  const byErrors: HealthStatus =
    errorRate === null
      ? HEALTH_STATUS.UNKNOWN
      : errorRate >= thresholds.criticalErrorRate
        ? HEALTH_STATUS.CRITICAL
        : errorRate >= thresholds.degradedErrorRate
          ? HEALTH_STATUS.DEGRADED
          : errorRate >= thresholds.warningErrorRate
            ? HEALTH_STATUS.WARNING
            : HEALTH_STATUS.HEALTHY;

  const byLatency: HealthStatus =
    p95 === null
      ? HEALTH_STATUS.UNKNOWN
      : p95 >= thresholds.criticalP95Ms
        ? HEALTH_STATUS.CRITICAL
        : p95 >= thresholds.degradedP95Ms
          ? HEALTH_STATUS.DEGRADED
          : p95 >= thresholds.warningP95Ms
            ? HEALTH_STATUS.WARNING
            : HEALTH_STATUS.HEALTHY;

  return rank[byErrors] >= rank[byLatency] ? byErrors : byLatency;
};

/**
 * The stored histogram as [bucketIndex, count] pairs.
 *
 * `.lean()` hands back a plain object where a hydrated document hands back a
 * Map, and both shapes reach here.
 */
const histogramEntries = (
  histogram: Map<string, number> | Record<string, number> | undefined,
): [number, number][] => {
  if (!histogram) return [];
  const entries =
    histogram instanceof Map ? [...histogram.entries()] : Object.entries(histogram);
  return entries.map(([k, v]) => [Number(k), Number(v)]);
};

/** Roll a set of buckets into one set of numbers. */
const aggregate = (
  buckets: {
    requests: number;
    successes: number;
    failures: number;
    timeouts: number;
    authFailures: number;
    supplierErrors: number;
    durationSumMs: number;
    histogram?: Map<string, number> | Record<string, number>;
    lastSuccessAt?: Date;
    lastFailureAt?: Date;
    lastFailureReason?: string;
  }[],
  thresholds: IHealthThresholds,
): Metrics => {
  if (!buckets.length) return emptyMetrics();

  const totals = buckets.reduce(
    (acc, b) => {
      acc.requests += b.requests;
      acc.successes += b.successes;
      acc.failures += b.failures;
      acc.timeouts += b.timeouts;
      acc.authFailures += b.authFailures;
      acc.supplierErrors += b.supplierErrors;
      acc.durationSumMs += b.durationSumMs;
      for (const [index, count] of histogramEntries(b.histogram)) {
        if (index >= 0 && index < acc.histogram.length) acc.histogram[index] += count;
      }
      if (b.lastSuccessAt && (!acc.lastSuccessAt || b.lastSuccessAt > acc.lastSuccessAt)) {
        acc.lastSuccessAt = b.lastSuccessAt;
      }
      if (b.lastFailureAt && (!acc.lastFailureAt || b.lastFailureAt > acc.lastFailureAt)) {
        acc.lastFailureAt = b.lastFailureAt;
        acc.lastFailureReason = b.lastFailureReason ?? null;
      }
      return acc;
    },
    {
      requests: 0,
      successes: 0,
      failures: 0,
      timeouts: 0,
      authFailures: 0,
      supplierErrors: 0,
      durationSumMs: 0,
      histogram: new Array(HISTOGRAM_SIZE).fill(0) as number[],
      lastSuccessAt: null as Date | null,
      lastFailureAt: null as Date | null,
      lastFailureReason: null as string | null,
    },
  );

  const errorRate =
    totals.requests > 0 ? (totals.failures / totals.requests) * 100 : null;
  const averageMs =
    totals.requests > 0 ? Math.round(totals.durationSumMs / totals.requests) : null;

  const belowSampleSize = totals.requests < thresholds.minimumSampleSize;
  const p95 = percentileFrom(totals.histogram, 0.95);
  const p99 = percentileFrom(totals.histogram, 0.99);

  return {
    requests: totals.requests,
    successes: totals.successes,
    failures: totals.failures,
    timeouts: totals.timeouts,
    authFailures: totals.authFailures,
    supplierErrors: totals.supplierErrors,
    errorRate: errorRate === null ? null : Math.round(errorRate * 10) / 10,
    averageMs,
    p95Ms: p95,
    p99Ms: p99,
    lastSuccessAt: totals.lastSuccessAt,
    lastFailureAt: totals.lastFailureAt,
    lastFailureReason: totals.lastFailureReason,
    // Too little traffic to judge — reported as unknown rather than as a
    // status derived from a handful of calls.
    status: belowSampleSize
      ? HEALTH_STATUS.UNKNOWN
      : classify(errorRate, p95, thresholds),
    belowSampleSize,
  };
};

export interface OperationHealth extends Metrics {
  operation: string;
}
export interface ServiceHealth extends Metrics {
  service: string;
  operations: OperationHealth[];
}
export interface ProviderHealth extends Metrics {
  providerSlug: string;
  name: string;
  environment: string;
  services: ServiceHealth[];
}

export interface HealthSnapshot {
  windowMinutes: number;
  since: Date;
  providers: ProviderHealth[];
  overall: Metrics;
  /** Circuits a calling process has taken out of rotation (§46). */
  circuits: {
    providerSlug: string;
    service: string;
    operation: string;
    state: string;
    since: Date;
    reportedBy: string;
    reportedAt: Date;
    consecutiveFailures: number;
    lastReason?: string;
  }[];
}

/**
 * The whole hierarchy, for the dashboard.
 *
 * One query for the window, then rolled up in memory. Every level is
 * aggregated from the SAME buckets rather than from the level below's summary,
 * so a percentile at provider level is the real distribution across its
 * operations and not an average of averages.
 */
export const snapshot = async (options: { minutes?: number } = {}): Promise<HealthSnapshot> => {
  const thresholds = await currentThresholds();
  const windowMinutes = options.minutes ?? thresholds.windowMinutes;
  const since = new Date(Date.now() - windowMinutes * 60_000);

  const [buckets, providers, circuits] = await Promise.all([
    HealthBucket.find({ minute: { $gte: since } }).lean(),
    Provider.find().lean(),
    openCircuits(),
  ]);

  const providerHealth: ProviderHealth[] = providers.map((provider) => {
    const mine = buckets.filter((b) => b.providerSlug === provider.slug);

    const services: ServiceHealth[] = provider.services.map((svc) => {
      const forService = mine.filter((b) => b.service === svc.service);
      const operations: OperationHealth[] = svc.operations
        .filter((op) => op.supported)
        .map((op) => ({
          operation: op.operation,
          ...aggregate(
            forService.filter((b) => b.operation === op.operation),
            thresholds,
          ),
        }));

      return {
        service: svc.service,
        operations,
        ...aggregate(forService, thresholds),
      };
    });

    return {
      providerSlug: provider.slug,
      name: provider.name,
      environment: provider.activeEnvironment,
      services,
      ...aggregate(mine, thresholds),
    };
  });

  return {
    windowMinutes,
    since,
    providers: providerHealth,
    overall: aggregate(buckets, thresholds),
    circuits: circuits.map((c) => ({
      providerSlug: c.providerSlug,
      service: c.service,
      operation: c.operation,
      state: c.state,
      since: c.since,
      reportedBy: c.reportedBy,
      reportedAt: c.reportedAt,
      consecutiveFailures: c.consecutiveFailures,
      lastReason: c.lastReason,
    })),
  };
};

/** One provider's history, minute by minute, for a chart. */
export const timeline = async (
  providerSlug: string,
  minutes = 180,
): Promise<{ minute: Date; requests: number; failures: number; averageMs: number | null }[]> => {
  const since = new Date(Date.now() - minutes * 60_000);
  const buckets = await HealthBucket.find({
    providerSlug: providerSlug.toLowerCase(),
    minute: { $gte: since },
  })
    .sort({ minute: 1 })
    .lean();

  const byMinute = new Map<number, { requests: number; failures: number; durationSumMs: number }>();
  for (const b of buckets) {
    const key = b.minute.getTime();
    const entry = byMinute.get(key) ?? { requests: 0, failures: 0, durationSumMs: 0 };
    entry.requests += b.requests;
    entry.failures += b.failures;
    entry.durationSumMs += b.durationSumMs;
    byMinute.set(key, entry);
  }

  return [...byMinute.entries()]
    .sort(([a], [b]) => a - b)
    .map(([minute, v]) => ({
      minute: new Date(minute),
      requests: v.requests,
      failures: v.failures,
      averageMs: v.requests ? Math.round(v.durationSumMs / v.requests) : null,
    }));
};
