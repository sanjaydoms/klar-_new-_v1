import type { CurrencyCode, SearchId, SupplierCode } from '../../domain/shared/brand.js';

/**
 * An absolute point in time, not a duration.
 *
 * A per-call duration budget is how a pipeline ends up spending 8 seconds
 * resolving a destination and then still granting a supplier its "full" 14. The
 * deadline is set once when the request arrives and every downstream call
 * measures itself against the same instant.
 */
export interface Deadline {
  readonly at: number;
  remainingMs(now?: number): number;
  hasPassed(now?: number): boolean;
  /** A nearer sub-deadline. Never later than this one. */
  withBudget(ms: number, now?: number): Deadline;
}

export function deadlineIn(ms: number, now: number = Date.now()): Deadline {
  return deadlineAt(now + ms);
}

export function deadlineAt(at: number): Deadline {
  return {
    at,
    remainingMs: (now = Date.now()) => Math.max(0, at - now),
    hasPassed: (now = Date.now()) => now >= at,
    withBudget: (ms, now = Date.now()) => deadlineAt(Math.min(at, now + ms)),
  };
}

/**
 * Structured logging, injected rather than imported.
 *
 * An adapter that reaches for a module-level logger is an adapter that cannot
 * be tested without capturing global state, and one whose lines are missing the
 * search id that makes them useful.
 */
export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

/**
 * Everything an adapter is given beyond the request itself.
 *
 * Note what is absent: no markup rules, no pricing context, no channel. An
 * adapter has no way to compute a customer price even if it wanted to, which is
 * the structural guarantee against D-1 recurring.
 */
export interface SupplierContext {
  readonly supplier: SupplierCode;
  readonly searchId: SearchId;
  /** Unique per supplier call. Ties one HTTP exchange to its log lines. */
  readonly correlationId: string;
  readonly deadline: Deadline;
  readonly signal: AbortSignal;
  readonly logger: Logger;
  /** Currency to request from the supplier. FX, if needed, happens after. */
  readonly currency: CurrencyCode;
}
