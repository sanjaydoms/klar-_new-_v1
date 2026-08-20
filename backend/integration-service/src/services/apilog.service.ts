import { ApiRequestLog, IApiRequestLog } from "../models/ApiRequestLog.model";
import { CallReport } from "./health.service";

/**
 * The API log (§25, §26, §42).
 *
 * Written from the same telemetry batch that feeds health, because they are
 * the same observations — one aggregated, one kept individually.
 */

/**
 * Fields a report may carry beyond what health needs.
 *
 * A report without a requestId is health-only: some callers measure without
 * wanting a per-call record, and forcing them to invent an id would produce
 * rows nobody can correlate.
 */
export interface LogFields {
  correlationId?: string;
  requestId?: string;
  httpStatus?: number;
  attempt?: number;
  isFailover?: boolean;
  failedOverFrom?: string;
  summary?: Record<string, unknown>;
}

/** Caps on the caller-supplied summary. */
const MAX_SUMMARY_KEYS = 20;
const MAX_SUMMARY_VALUE_LENGTH = 200;

/**
 * Keep only small scalars.
 *
 * Objects and arrays are dropped rather than serialised: a nested value is how
 * a whole request payload ends up in here by accident, and the caller that
 * wanted one field would have sent one field. Strings are truncated, so a
 * caller passing something unexpectedly large cannot make one log row
 * enormous.
 */
const sanitiseSummary = (
  summary: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> | undefined => {
  if (!summary) return undefined;

  const out: Record<string, string | number | boolean> = {};
  let kept = 0;

  for (const [key, value] of Object.entries(summary)) {
    if (kept >= MAX_SUMMARY_KEYS) break;
    if (value === null || value === undefined) continue;

    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
      kept++;
    } else if (typeof value === "string") {
      out[key] = value.slice(0, MAX_SUMMARY_VALUE_LENGTH);
      kept++;
    }
    // Anything else — objects, arrays, functions — is dropped in silence.
  }

  return kept > 0 ? out : undefined;
};

/**
 * Write the log rows for a telemetry batch.
 *
 * Unordered insert, and a duplicate requestId is not an error: a client that
 * retried its flush would otherwise lose the whole batch to one row it had
 * already delivered.
 */
export const write = async (reports: (CallReport & LogFields)[]): Promise<number> => {
  const rows = reports
    .filter((r) => r.requestId)
    .map((r) => {
      const at = r.at ? new Date(r.at) : new Date();
      return {
        correlationId: r.correlationId ?? r.requestId!,
        requestId: r.requestId!,
        providerSlug: r.providerSlug,
        service: r.service,
        operation: r.operation,
        environment: r.environment,
        // The report timestamps the END of the call; the log wants the start.
        startedAt: new Date(at.getTime() - r.durationMs),
        durationMs: r.durationMs,
        outcome: r.outcome,
        success: r.outcome === "SUCCESS",
        httpStatus: r.httpStatus,
        errorReason: r.outcome === "SUCCESS" ? undefined : r.reason,
        attempt: r.attempt ?? 1,
        isFailover: Boolean(r.isFailover),
        failedOverFrom: r.failedOverFrom,
        summary: sanitiseSummary(r.summary),
      };
    });

  if (!rows.length) return 0;

  try {
    const res = await ApiRequestLog.insertMany(rows, { ordered: false });
    return res.length;
  } catch (err: any) {
    // A duplicate-key error means part of the batch landed. That is a success
    // with a redelivery, not a failure worth shouting about.
    if (err?.code === 11000 || err?.writeErrors) {
      return err.insertedDocs?.length ?? 0;
    }
    console.error(`[apilog] write failed: ${err?.message ?? err}`);
    return 0;
  }
};

export interface LogQuery {
  provider?: string;
  service?: string;
  operation?: string;
  environment?: string;
  /** "success" | "failed" */
  result?: string;
  httpStatus?: number;
  correlationId?: string;
  requestId?: string;
  failoverOnly?: boolean;
  from?: Date;
  to?: Date;
  limit?: number;
}

export const list = async (q: LogQuery = {}) => {
  const filter: Record<string, unknown> = {};

  if (q.provider) filter.providerSlug = q.provider;
  if (q.service) filter.service = q.service;
  if (q.operation) filter.operation = q.operation;
  if (q.environment) filter.environment = q.environment;
  if (q.result === "success") filter.success = true;
  if (q.result === "failed") filter.success = false;
  if (q.httpStatus) filter.httpStatus = q.httpStatus;
  if (q.correlationId) filter.correlationId = q.correlationId;
  if (q.requestId) filter.requestId = q.requestId;
  if (q.failoverOnly) filter.isFailover = true;
  if (q.from || q.to) {
    filter.startedAt = {
      ...(q.from ? { $gte: q.from } : {}),
      ...(q.to ? { $lte: q.to } : {}),
    };
  }

  const limit = Math.min(500, Math.max(1, q.limit ?? 100));
  return ApiRequestLog.find(filter).sort({ startedAt: -1 }).limit(limit).lean();
};

export interface Correlation {
  correlationId: string;
  attempts: IApiRequestLog[];
  startedAt: Date;
  totalMs: number;
  providersTried: string[];
  succeeded: boolean;
  /** The provider that finally answered, when one did. */
  servedBy: string | null;
}

/**
 * One customer action and everything it caused (§42).
 *
 * `totalMs` spans the first attempt's start to the last attempt's end rather
 * than summing durations — with a fan-out the attempts overlap, and adding
 * them would report a 12-second search as 24 seconds.
 */
export const correlation = async (correlationId: string): Promise<Correlation | null> => {
  const attempts = await ApiRequestLog.find({ correlationId }).sort({ startedAt: 1 });
  if (!attempts.length) return null;

  const startedAt = attempts[0].startedAt;
  const lastEnd = Math.max(
    ...attempts.map((a) => a.startedAt.getTime() + a.durationMs),
  );
  const winner = attempts.find((a) => a.success);

  return {
    correlationId,
    attempts,
    startedAt,
    totalMs: lastEnd - startedAt.getTime(),
    providersTried: [...new Set(attempts.map((a) => a.providerSlug))],
    succeeded: Boolean(winner),
    servedBy: winner?.providerSlug ?? null,
  };
};
