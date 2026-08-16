import { describe, expect, it } from 'vitest';
import type { RedisClient } from './redis-store.js';
import { RedisKeyValueStore } from './redis-store.js';

function fakeClient(): RedisClient & { calls: unknown[][] } {
  const store = new Map<string, string>();
  const calls: unknown[][] = [];
  return {
    calls,
    get: (key) => {
      calls.push(['get', key]);
      return Promise.resolve(store.get(key) ?? null);
    },
    set: (key, value, mode, ttlMs) => {
      calls.push(['set', key, value, mode, ttlMs]);
      store.set(key, value);
      return Promise.resolve('OK');
    },
    del: (key) => {
      calls.push(['del', key]);
      const had = store.delete(key);
      return Promise.resolve(had ? 1 : 0);
    },
  };
}

describe('RedisKeyValueStore', () => {
  it('reads back a value it wrote', async () => {
    const client = fakeClient();
    const store = new RedisKeyValueStore(client);

    await store.set('k', 'v', 5_000);
    expect(await store.get('k')).toBe('v');
  });

  it('sets with PX and the ttl in milliseconds', async () => {
    const client = fakeClient();
    const store = new RedisKeyValueStore(client);

    await store.set('k', 'v', 5_000);
    expect(client.calls).toContainEqual(['set', 'k', 'v', 'PX', 5_000]);
  });

  it('floors a zero or fractional ttl at 1ms rather than sending PX 0', async () => {
    const client = fakeClient();
    const store = new RedisKeyValueStore(client);

    await store.set('k', 'v', 0);
    await store.set('k2', 'v', 0.4);

    expect(client.calls).toContainEqual(['set', 'k', 'v', 'PX', 1]);
    expect(client.calls).toContainEqual(['set', 'k2', 'v', 'PX', 1]);
  });

  it('reports true only when delete actually removed a key', async () => {
    const client = fakeClient();
    const store = new RedisKeyValueStore(client);
    await store.set('k', 'v', 5_000);

    expect(await store.delete('k')).toBe(true);
    expect(await store.delete('k')).toBe(false);
  });

  it('returns null for a key that was never set', async () => {
    const client = fakeClient();
    const store = new RedisKeyValueStore(client);
    expect(await store.get('missing')).toBeNull();
  });
});
