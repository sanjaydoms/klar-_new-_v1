import type { KeyValueStore } from './rate-token-store.js';

/**
 * The slice of an ioredis client this store needs, expressed structurally so
 * this file carries no import of — and no compile-time dependency on —
 * `ioredis` itself. `main.ts` is the one place that constructs a real client
 * and passes it in, the same seam `QueryableClient` is for `pg`.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'PX', ttlMs: number): Promise<unknown>;
  del(key: string): Promise<number>;
}

/**
 * `KeyValueStore` over Redis — the shared store rate tokens, the dynamic
 * search cache and the catalogue/destination cache all use (ADR-0005 §5).
 *
 * Redis being down is this store's problem, not its callers': `KeyValueCache`
 * already treats a throwing `get`/`set` as a miss, per ADR-0005's "Redis
 * unavailable costs latency, never correctness." Nothing here needs to catch
 * or degrade — that already happens one layer up.
 */
export class RedisKeyValueStore implements KeyValueStore {
  readonly #client: RedisClient;

  constructor(client: RedisClient) {
    this.#client = client;
  }

  get(key: string): Promise<string | null> {
    return this.#client.get(key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    // PX takes milliseconds and rejects zero, so a floor of 1 ms is a real
    // write rather than a silently-dropped one.
    await this.#client.set(key, value, 'PX', Math.max(1, Math.round(ttlMs)));
  }

  async delete(key: string): Promise<boolean> {
    const removed = await this.#client.del(key);
    return removed > 0;
  }
}
