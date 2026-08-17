import type { Cache, CacheLookup, CacheTtl, Logger } from '../../modules/ports.js';
import type { KeyValueStore } from '../rate-token/rate-token-store.js';

/**
 * A cache over the same key/value port the rate tokens use — Redis in
 * production, a map in tests.
 *
 * Two things are deliberate:
 *
 * **Freshness is stored, not inferred from the TTL.** The entry carries the
 * instant it stops being fresh, and the store's own expiry is set to the end of
 * the *stale* window. So one key can be a `HIT` for 90 seconds and a `STALE`
 * for 30 more, which a single TTL cannot express.
 *
 * **Nothing here throws.** A store that is down, slow, or returning nonsense
 * produces `MISS` and a log line. ADR-0005 §5 promises that Redis being
 * unavailable costs latency and never correctness, and that promise is only
 * worth anything if the failure path is the one that gets exercised — so it is
 * the same path as an ordinary miss.
 */
export interface KeyValueCacheOptions {
  readonly kv: KeyValueStore;
  readonly now: () => number;
  readonly logger: Logger;
  /** Namespace, so a cache and a rate token can never collide on one key. */
  readonly prefix?: string;
  /** A ceiling on any caller's freshness window. */
  readonly maxFreshMs?: number;
}

interface Envelope<T> {
  /** Fresh until this instant. */
  readonly f: number;
  readonly v: T;
}

export class KeyValueCache implements Cache {
  readonly #kv: KeyValueStore;
  readonly #now: () => number;
  readonly #logger: Logger;
  readonly #prefix: string;
  readonly #maxFreshMs: number;

  constructor(opts: KeyValueCacheOptions) {
    this.#kv = opts.kv;
    this.#now = opts.now;
    this.#logger = opts.logger;
    this.#prefix = opts.prefix ?? 'klar:cache:';
    this.#maxFreshMs = opts.maxFreshMs ?? 15 * 60 * 1000;
  }

  async get<T>(key: string): Promise<CacheLookup<T>> {
    let raw: string | null;
    try {
      raw = await this.#kv.get(this.#prefix + key);
    } catch (error) {
      // The whole point of the port's return type. A cache outage must look
      // exactly like a cold cache.
      this.#logger.warn('cache read failed; treating as a miss', {
        reason: error instanceof Error ? error.message : String(error),
      });
      return { state: 'MISS' };
    }
    if (raw === null) return { state: 'MISS' };

    let entry: Envelope<T>;
    try {
      entry = JSON.parse(raw) as Envelope<T>;
    } catch {
      // Someone else's data, or a half-written value. Not ours to interpret.
      this.#logger.warn('cache held an unreadable entry; treating as a miss', { key });
      return { state: 'MISS' };
    }
    if (typeof entry?.f !== 'number') return { state: 'MISS' };

    const now = this.#now();
    if (now < entry.f) return { state: 'HIT', value: entry.v };
    return { state: 'STALE', value: entry.v, ageMs: now - entry.f };
  }

  async set<T>(key: string, value: T, ttl: CacheTtl): Promise<void> {
    const freshMs = Math.min(Math.max(0, ttl.freshMs), this.#maxFreshMs);
    const staleMs = Math.max(0, ttl.staleMs ?? 0);
    if (freshMs === 0 && staleMs === 0) return;

    const envelope: Envelope<T> = { f: this.#now() + freshMs, v: value };
    try {
      await this.#kv.set(this.#prefix + key, JSON.stringify(envelope), freshMs + staleMs);
    } catch (error) {
      // A write that failed costs the next caller a miss, and nothing else.
      this.#logger.warn('cache write failed; the next request will fetch again', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.#kv.delete(this.#prefix + key);
    } catch {
      /* a cache entry we could not remove expires on its own */
    }
  }
}

/** A cache that holds nothing. The honest default when none is configured. */
export const NO_CACHE: Cache = {
  get: () => Promise.resolve({ state: 'MISS' }),
  set: () => Promise.resolve(),
  delete: () => Promise.resolve(),
};
