import { describe, expect, it } from 'vitest';
import { silentLogger } from '../../modules/testing/fakes.js';
import { InMemoryKeyValueStore, type KeyValueStore } from '../rate-token/rate-token-store.js';
import { KeyValueCache, NO_CACHE } from './cache.js';
import { InFlightCoalescer } from './coalescer.js';

const clock = (start = 1_000_000) => {
  const c = { now: start };
  return { c, read: () => c.now };
};

const build = (kv?: KeyValueStore) => {
  const { c, read } = clock();
  const store = kv ?? new InMemoryKeyValueStore(read);
  return {
    c,
    cache: new KeyValueCache({ kv: store, now: read, logger: silentLogger }),
  };
};

describe('the cache', () => {
  it('round-trips a value while it is fresh', async () => {
    const { cache } = build();
    await cache.set('k', { hotels: 2 }, { freshMs: 60_000 });

    const found = await cache.get<{ hotels: number }>('k');
    expect(found.state).toBe('HIT');
    if (found.state === 'HIT') expect(found.value).toEqual({ hotels: 2 });
  });

  it('misses a key it was never given', async () => {
    const { cache } = build();
    expect((await cache.get('nothing')).state).toBe('MISS');
  });

  /**
   * Freshness and lifetime are two different windows, which a single TTL cannot
   * express. An entry past its freshness is still a good enough answer to hand
   * back while a replacement is fetched behind it.
   */
  it('reports an entry past its freshness as stale, not as a miss', async () => {
    const { c, cache } = build();
    await cache.set('k', 'v', { freshMs: 60_000, staleMs: 30_000 });

    c.now += 59_999;
    expect((await cache.get('k')).state).toBe('HIT');

    c.now += 2;
    const stale = await cache.get<string>('k');
    expect(stale.state).toBe('STALE');
    if (stale.state === 'STALE') {
      expect(stale.value).toBe('v');
      expect(stale.ageMs).toBe(1);
    }
  });

  it('drops the entry once the stale window has gone too', async () => {
    const { c, cache } = build();
    await cache.set('k', 'v', { freshMs: 60_000, staleMs: 30_000 });

    c.now += 90_001;
    expect((await cache.get('k')).state).toBe('MISS');
  });

  it('never serves a stale entry when staleness was not asked for', async () => {
    const { c, cache } = build();
    await cache.set('k', 'v', { freshMs: 60_000 });

    c.now += 60_001;
    expect((await cache.get('k')).state).toBe('MISS');
  });

  it('forgets a key on request', async () => {
    const { cache } = build();
    await cache.set('k', 'v', { freshMs: 60_000 });
    await cache.delete('k');
    expect((await cache.get('k')).state).toBe('MISS');
  });

  it('clamps a freshness window nobody should have asked for', async () => {
    const { c, cache } = build();
    // ADR-0005 §4: dynamic prices live 60-180 s. A caller asking for a day is a
    // bug, and the cache is the last place able to refuse it.
    await cache.set('k', 'v', { freshMs: 24 * 60 * 60 * 1000 });

    c.now += 15 * 60 * 1000 + 1;
    expect((await cache.get('k')).state).toBe('MISS');
  });

  it('stores nothing when asked for no lifetime at all', async () => {
    const kv = new InMemoryKeyValueStore(() => 1_000_000);
    const cache = new KeyValueCache({ kv, now: () => 1_000_000, logger: silentLogger });
    await cache.set('k', 'v', { freshMs: 0 });
    expect(kv.size).toBe(0);
  });

  /**
   * ADR-0005 §5: Redis being down degrades latency, never correctness. The only
   * way to hold callers to that is for the failure path to BE the miss path.
   */
  describe('when the store is broken', () => {
    const broken: KeyValueStore = {
      get: () => Promise.reject(new Error('ECONNREFUSED')),
      set: () => Promise.reject(new Error('ECONNREFUSED')),
      delete: () => Promise.reject(new Error('ECONNREFUSED')),
    };

    it('reads as a miss rather than throwing', async () => {
      const { cache } = build(broken);
      await expect(cache.get('k')).resolves.toEqual({ state: 'MISS' });
    });

    it('swallows a failed write', async () => {
      const { cache } = build(broken);
      await expect(cache.set('k', 'v', { freshMs: 60_000 })).resolves.toBeUndefined();
    });

    it('swallows a failed delete', async () => {
      const { cache } = build(broken);
      await expect(cache.delete('k')).resolves.toBeUndefined();
    });
  });

  it('treats someone else’s data as a miss', async () => {
    // A half-written value, or a key namespace collision. Not ours to interpret.
    const kv = new InMemoryKeyValueStore(() => 1_000_000);
    await kv.set('klar:cache:k', 'not json at all', 60_000);
    const cache = new KeyValueCache({ kv, now: () => 1_000_000, logger: silentLogger });

    expect((await cache.get('k')).state).toBe('MISS');
  });

  it('namespaces its keys away from everything else in the store', async () => {
    const kv = new InMemoryKeyValueStore(() => 1_000_000);
    const cache = new KeyValueCache({ kv, now: () => 1_000_000, logger: silentLogger });
    await cache.set('deal-1', 'a cached search', { freshMs: 60_000 });

    // A rate token under the same logical id must be untouched: the two share a
    // Redis instance in production.
    expect(await kv.get('klar:deal:deal-1')).toBeNull();
  });

  it('holds nothing when no cache is configured', async () => {
    await NO_CACHE.set('k', 'v', { freshMs: 60_000 });
    expect((await NO_CACHE.get('k')).state).toBe('MISS');
  });
});

describe('request coalescing', () => {
  /** A promise this test resolves by hand, so the interleaving is exact. */
  const deferred = <T>() => {
    let resolve!: (v: T) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };

  it('runs the work once for callers that arrive together', async () => {
    const coalescer = new InFlightCoalescer();
    const gate = deferred<string>();
    let calls = 0;

    const work = () => {
      calls += 1;
      return gate.promise;
    };

    const a = coalescer.run('goa', work);
    const b = coalescer.run('goa', work);
    const c = coalescer.run('goa', work);
    expect(coalescer.inFlight).toBe(1);

    gate.resolve('one fan-out');
    expect(await Promise.all([a, b, c])).toEqual(['one fan-out', 'one fan-out', 'one fan-out']);
    expect(calls).toBe(1);
  });

  it('keeps different keys apart', async () => {
    const coalescer = new InFlightCoalescer();
    const calls: string[] = [];
    const work = (key: string) => () => {
      calls.push(key);
      return Promise.resolve(key);
    };

    const [goa, mumbai] = await Promise.all([
      coalescer.run('goa', work('goa')),
      coalescer.run('mumbai', work('mumbai')),
    ]);

    expect([goa, mumbai]).toEqual(['goa', 'mumbai']);
    expect(calls.sort()).toEqual(['goa', 'mumbai']);
  });

  it('tells every waiter when the work failed', async () => {
    const coalescer = new InFlightCoalescer();
    const gate = deferred<string>();

    const a = coalescer.run('goa', () => gate.promise);
    const b = coalescer.run('goa', () => gate.promise);

    gate.reject(new Error('every supplier timed out'));
    await expect(a).rejects.toThrow('every supplier timed out');
    await expect(b).rejects.toThrow('every supplier timed out');
  });

  /**
   * A failure belongs to the callers who were waiting for it, and to nobody
   * else. A request arriving afterwards must start its own attempt rather than
   * inherit a rejection from a fetch it was never part of.
   */
  it('does not hand a failure to a caller who arrived later', async () => {
    const coalescer = new InFlightCoalescer();
    let calls = 0;

    await expect(
      coalescer.run('goa', () => {
        calls += 1;
        return Promise.reject(new Error('first attempt failed'));
      }),
    ).rejects.toThrow('first attempt failed');

    await expect(
      coalescer.run('goa', () => {
        calls += 1;
        return Promise.resolve('second attempt worked');
      }),
    ).resolves.toBe('second attempt worked');

    expect(calls).toBe(2);
  });

  it('empties itself, so it cannot grow into a map of every search ever run', async () => {
    const coalescer = new InFlightCoalescer();
    for (let i = 0; i < 50; i++) {
      await coalescer.run(`key-${i}`, () => Promise.resolve(i));
    }
    expect(coalescer.inFlight).toBe(0);
  });

  it('turns a synchronous throw into a rejection, and unwedges the key', async () => {
    const coalescer = new InFlightCoalescer();
    await expect(
      coalescer.run('goa', () => {
        throw new Error('built the request wrong');
      }),
    ).rejects.toThrow('built the request wrong');

    expect(coalescer.inFlight).toBe(0);
    await expect(coalescer.run('goa', () => Promise.resolve('fine now'))).resolves.toBe('fine now');
  });
});
