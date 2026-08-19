/**
 * Supplier-call telemetry, sent to integration-service.
 *
 * WHY BATCHED AND FIRE-AND-FORGET
 * -------------------------------
 * §63: the control center must never be the reason a customer waits. A search
 * fans out to every supplier and each call produces one observation, so a
 * synchronous report per call would add an HTTP round trip to the middle of
 * the search path for a number nobody is reading in that moment.
 *
 * So observations go into an in-memory buffer and leave on a timer. If the
 * buffer overflows, or the flush fails, the observations are DROPPED. That is
 * the correct trade: health data is a description of the system, and losing a
 * minute of description is survivable in a way that slowing down or failing
 * the thing being described is not.
 */

import axios from "axios";

import { env } from "./env";

export type CallOutcome =
  | "SUCCESS"
  | "TIMEOUT"
  | "AUTH_FAILED"
  | "SUPPLIER_ERROR"
  | "NETWORK_ERROR"
  | "OTHER_ERROR";

interface CallReport {
  providerSlug: string;
  service: string;
  operation: string;
  environment: string;
  outcome: CallOutcome;
  durationMs: number;
  reason?: string;
  at: string;

  /**
   * Log fields. Optional: a report without a requestId feeds health only.
   * Some measurements are worth counting without being worth keeping a row
   * for, and inventing an id for those would produce rows nobody can trace.
   */
  correlationId?: string;
  requestId?: string;
  httpStatus?: number;
  attempt?: number;
  isFailover?: boolean;
  failedOverFrom?: string;
  /**
   * Safe scalars for the log, chosen by the caller.
   *
   * The CALLER decides what is safe, because it is the only place that knows
   * which of its fields are a destination and which are a guest's name. Never
   * pass a payload, a header, or anything a customer typed about themselves.
   */
  summary?: Record<string, unknown>;
}

const FLUSH_MS = Number(process.env.TELEMETRY_FLUSH_MS || 10_000);
const TIMEOUT_MS = Number(process.env.TELEMETRY_TIMEOUT_MS || 3_000);
/**
 * Hard cap on the buffer.
 *
 * If integration-service is down for an hour, this must not grow into the
 * reason THIS service runs out of memory. Oldest observations are discarded
 * first — the newest are the ones an operator is about to look at.
 */
const MAX_BUFFERED = Number(process.env.TELEMETRY_MAX_BUFFERED || 5_000);

let buffer: CallReport[] = [];
let dropped = 0;
let timer: NodeJS.Timeout | null = null;

/**
 * Which supplier code maps to which provider slug.
 *
 * The registry speaks codes ("TJ", "RG"); the control center keys on slugs.
 * Held here rather than looked up per call: the mapping is small, changes only
 * when a provider is added, and a lookup on the search path to satisfy a
 * metrics label would defeat the point of buffering.
 */
const SLUG_BY_CODE: Record<string, string> = {
  TJ: "tripjack",
  RG: "rategain",
};

export const providerSlugFor = (code: string): string =>
  SLUG_BY_CODE[code] ?? code.toLowerCase();

/**
 * Classify a thrown supplier error.
 *
 * Deliberately coarse. The categories exist so an operator can tell "the key
 * was rejected" from "the host never answered" — finer distinctions belong in
 * the API log, not in a counter.
 */
export const classifyError = (err: any): { outcome: CallOutcome; reason: string } => {
  if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED") {
    // The orchestrator aborted this supplier because the page window elapsed.
    return { outcome: "TIMEOUT", reason: "aborted by the search window" };
  }
  if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message ?? "")) {
    return { outcome: "TIMEOUT", reason: "request timed out" };
  }

  const status = err?.response?.status;
  if (status === 401 || status === 403) {
    return { outcome: "AUTH_FAILED", reason: `supplier rejected credentials (${status})` };
  }
  if (status === 429) {
    return { outcome: "SUPPLIER_ERROR", reason: "rate limited (429)" };
  }
  if (typeof status === "number" && status >= 500) {
    return { outcome: "SUPPLIER_ERROR", reason: `supplier error (${status})` };
  }
  if (typeof status === "number") {
    return { outcome: "OTHER_ERROR", reason: `unexpected response (${status})` };
  }
  if (err?.code) {
    return { outcome: "NETWORK_ERROR", reason: `network error (${err.code})` };
  }
  // No status and no code: the adapter threw for its own reasons. The message
  // is NOT forwarded — it can contain a URL with credentials in the query.
  return { outcome: "OTHER_ERROR", reason: "adapter error" };
};

/** Record one supplier call. Returns immediately; never throws. */
export const recordCall = (report: Omit<CallReport, "at">): void => {
  if (buffer.length >= MAX_BUFFERED) {
    buffer.shift();
    dropped++;
  }
  buffer.push({ ...report, at: new Date().toISOString() });
  schedule();
};

const schedule = (): void => {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, FLUSH_MS);
  // Must not hold the process open at shutdown — this is background reporting,
  // not work anyone is waiting for.
  timer.unref?.();
};

export const flush = async (): Promise<void> => {
  if (!buffer.length) return;

  const internalKey = process.env.INTERNAL_SERVICE_KEY;
  if (!internalKey) {
    // No shared secret means the endpoint is unreachable by design. Drop the
    // buffer rather than growing it forever waiting for a key that is not coming.
    buffer = [];
    return;
  }

  const batch = buffer;
  buffer = [];

  if (dropped > 0) {
    console.warn(`[telemetry] dropped ${dropped} observations to stay within the buffer cap`);
    dropped = 0;
  }

  try {
    await axios.post(
      `${env.integrationServiceUrl}/internal/telemetry`,
      { reports: batch },
      { headers: { "x-internal-key": internalKey }, timeout: TIMEOUT_MS },
    );
  } catch (err: any) {
    // Not re-queued. A failed flush usually means integration-service is down,
    // and re-queueing would build a backlog that lands as a spike the moment it
    // recovers — right when it is least able to absorb one.
    console.warn(`[telemetry] flush failed, ${batch.length} observations dropped: ${err?.message ?? err}`);
  }
};

/** Test seam. */
export const __resetTelemetryForTests = (): void => {
  buffer = [];
  dropped = 0;
  if (timer) clearTimeout(timer);
  timer = null;
};

export const __bufferedForTests = (): CallReport[] => buffer;
