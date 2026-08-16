import { describe, expect, it } from 'vitest';
import { klarDestinationId, supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import { FakeClock, FakeDestinationResolver, IN, silentLogger } from '../../modules/testing/fakes.js';
import { KeyValueCache } from '../cache/cache.js';
import { CachedDestinationResolver } from './cached-destination-resolver.js';
import { InMemoryKeyValueStore } from '../rate-token/rate-token-store.js';

const TJ = supplierCode('TRIPJACK');

function harness() {
  const clock = new FakeClock();
  const cache = new KeyValueCache({
    kv: new InMemoryKeyValueStore(() => clock.now()),
    now: () => clock.now(),
    logger: silentLogger,
  });
  const targets = new Map([[TJ, { kind: 'HOTEL_IDS' as const, ids: [supplierHotelId('tj-1')] }]]);
  const inner = new FakeDestinationResolver(targets, 42, IN, [
    { klarDestinationId: 'KLAR-DEST-1', name: 'Goa', propertyCount: 42 },
  ]);
  let calls = 0;
  const counting = new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          calls += 1;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return value;
    },
  }) as FakeDestinationResolver;
  const resolver = new CachedDestinationResolver(counting, cache);
  return { resolver, callCount: () => calls };
}

const destTarget = { kind: 'DESTINATION' as const, destinationId: klarDestinationId('KLAR-DEST-1') };
const capabilities = [{ code: TJ, searchTargets: ['HOTEL_IDS' as const] }];

describe('CachedDestinationResolver', () => {
  it('serves resolveTargets from cache on the second call for the same target and suppliers', async () => {
    const { resolver, callCount } = harness();

    const first = await resolver.resolveTargets(destTarget, capabilities);
    const second = await resolver.resolveTargets(destTarget, capabilities);

    expect(first.get(TJ)).toEqual(second.get(TJ));
    expect(callCount()).toBe(1);
  });

  it('serves lookup from cache, keyed case- and whitespace-insensitively', async () => {
    const { resolver, callCount } = harness();

    const first = await resolver.lookup({ text: 'Goa' });
    const second = await resolver.lookup({ text: '  goa  ' });

    expect(first[0]?.klarDestinationId).toBe(klarDestinationId('KLAR-DEST-1'));
    expect(second[0]?.klarDestinationId).toBe(klarDestinationId('KLAR-DEST-1'));
    expect(callCount()).toBe(1);
  });

  it('serves countryOf and inventoryCount from cache on the second call', async () => {
    const { resolver, callCount } = harness();

    await resolver.countryOf(destTarget);
    await resolver.countryOf(destTarget);
    await resolver.inventoryCount(destTarget);
    await resolver.inventoryCount(destTarget);

    expect(callCount()).toBe(2);
  });

  it('does not share a cache entry between different supplier capability sets', async () => {
    const { resolver, callCount } = harness();
    const otherCapabilities = [{ code: TJ, searchTargets: ['SINGLE_HOTEL' as const] }];

    await resolver.resolveTargets(destTarget, capabilities);
    await resolver.resolveTargets(destTarget, otherCapabilities);

    expect(callCount()).toBe(2);
  });
});
