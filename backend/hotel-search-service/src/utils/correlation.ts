import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

/**
 * The id that ties one customer action to every supplier call it caused (§42).
 *
 * WHY AsyncLocalStorage RATHER THAN A PARAMETER
 * ---------------------------------------------
 * A search reaches the suppliers through five call sites — the blocking fetch,
 * two background prefetch paths, the extend-on-scroll path and the cache
 * refresh — and the telemetry call sits at the bottom of all of them. Threading
 * an id through every signature would touch each of those and be silently
 * wrong the first time somebody added a sixth.
 *
 * AsyncLocalStorage is Node's own answer to exactly this and follows the
 * promise chain without any of them knowing. It is stdlib, so it costs a
 * require and nothing else.
 *
 * BACKGROUND WORK GETS ITS OWN ID. A refresh scheduled during request A but
 * running long after it finished is not part of A: labelling it so would make
 * one user's search look like it took two minutes. `deriveBackgroundId` keeps
 * the link visible without pretending they are the same action.
 */

const storage = new AsyncLocalStorage<{ correlationId: string }>();

export const newCorrelationId = (): string =>
  `KLAR-REQ-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

/** A background job's own id, carrying the id that scheduled it. */
export const deriveBackgroundId = (): string =>
  `${currentCorrelationId() ?? newCorrelationId()}-BG`;

export const runWithCorrelation = <T>(id: string, fn: () => T): T =>
  storage.run({ correlationId: id }, fn);

/**
 * Start a correlation scope for the current async context, unless one is
 * already open.
 *
 * `enterWith` rather than `run` so an entry point can adopt a scope without
 * its whole body being wrapped in a callback. The "unless one is already
 * open" part is what makes that safe: a background job that already derived
 * its own id keeps it, and a nested call never overwrites its caller's.
 *
 * Returns the id in force afterwards.
 */
export const ensureCorrelation = (): string => {
  const existing = currentCorrelationId();
  if (existing) return existing;
  const correlationId = newCorrelationId();
  storage.enterWith({ correlationId });
  return correlationId;
};

/** Null outside any scope — telemetry then records health without a log row. */
export const currentCorrelationId = (): string | null =>
  storage.getStore()?.correlationId ?? null;

/** A unique id for one supplier attempt within a correlation. */
export const newRequestId = (providerCode: string): string =>
  `${providerCode}-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
