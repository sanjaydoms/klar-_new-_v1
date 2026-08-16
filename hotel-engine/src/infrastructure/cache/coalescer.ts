import type { Coalescer } from '../../modules/ports.js';

/**
 * One in-flight fetch per key. Everyone else waits for it.
 *
 * A popular destination whose cache entry has just expired arrives as N
 * identical searches within the same second. Without this, each one pays for its
 * own 14-second fan-out and the suppliers get N times the traffic at exactly the
 * moment they are least able to serve it — TripJack's WAF in particular
 * (ADR-0000 §3.1b). The teardown lists request coalescing among the things the
 * reference got right and worth carrying forward (§5.10).
 *
 * Three properties, each of which is a bug if it is missing:
 *
 *  1. **A failure is not shared beyond the callers already waiting.** The entry
 *     is removed before the promise settles, so a request arriving after a
 *     failed leader starts its own attempt rather than inheriting a rejection
 *     from a fetch it was never part of.
 *  2. **A rejection reaches every waiter.** They asked for the work; they are
 *     told it failed. Swallowing it here would hand back `undefined`.
 *  3. **The map is emptied.** A coalescer that leaks one entry per distinct key
 *     is an unbounded map keyed by every search anyone has ever run.
 *
 * This is per-process. Two instances behind a load balancer will each run one
 * fetch, which is the intended trade: a cross-process lock would put a network
 * round trip and a failure mode in front of every search to save a duplicate
 * call that the cache absorbs a moment later anyway.
 */
export class InFlightCoalescer implements Coalescer {
  readonly #pending = new Map<string, Promise<unknown>>();

  get inFlight(): number {
    return this.#pending.size;
  }

  run<T>(key: string, work: () => Promise<T>): Promise<T> {
    const existing = this.#pending.get(key) as Promise<T> | undefined;
    if (existing !== undefined) return existing;

    /**
     * `work()` is called inside the try so that a synchronous throw becomes a
     * rejected promise rather than escaping past the bookkeeping below and
     * leaving the key wedged in the map for the life of the process.
     */
    let started: Promise<T>;
    try {
      started = work();
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }

    const shared = started.finally(() => {
      // Cleared on settle, success or failure, so the next caller starts fresh.
      // `finally` rather than `then`: a rejection must clear the key too.
      this.#pending.delete(key);
    });

    this.#pending.set(key, shared);
    return shared;
  }
}

/** A coalescer that coalesces nothing, for callers that want the seam closed. */
export const NO_COALESCING: Coalescer = {
  run: (_key, work) => work(),
  inFlight: 0,
};
