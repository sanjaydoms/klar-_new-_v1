import { describe, expect, it } from 'vitest';
import { klarHotelId, supplierCode, supplierHotelId } from '../../domain/shared/brand.js';
import { InMemoryPropertyRepository, FakeClock, silentLogger } from '../../modules/testing/fakes.js';
import { supplierRefKey } from '../../modules/ports.js';
import { KeyValueCache } from '../cache/cache.js';
import { CachedPropertyRepository } from './cached-property-repository.js';
import { InMemoryKeyValueStore } from '../rate-token/rate-token-store.js';

const TJ = supplierCode('TRIPJACK');
const RG = supplierCode('RATEGAIN');

function harness() {
  const clock = new FakeClock();
  const cache = new KeyValueCache({
    kv: new InMemoryKeyValueStore(() => clock.now()),
    now: () => clock.now(),
    logger: silentLogger,
  });
  const inner = new InMemoryPropertyRepository([
    { klarHotelId: 'KLAR-1', name: 'Taj Palace', mappings: [{ supplier: TJ, supplierHotelId: 'tj-1' }] },
  ]);
  let calls = 0;
  const counting: typeof inner = new Proxy(inner, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === 'findBySupplierRefs' || prop === 'findByKlarHotelId') {
        return (...args: unknown[]) => {
          calls += 1;
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return value;
    },
  });
  const repo = new CachedPropertyRepository(counting, cache);
  return { repo, inner, clock, callCount: () => calls };
}

describe('CachedPropertyRepository', () => {
  it('serves the second lookup by supplier ref from cache, not the inner repository', async () => {
    const { repo, callCount } = harness();
    const ref = { supplier: TJ, supplierHotelId: supplierHotelId('tj-1') };

    const first = await repo.findBySupplierRefs([ref]);
    const second = await repo.findBySupplierRefs([ref]);

    expect(first.get(supplierRefKey(TJ, 'tj-1'))?.name).toBe('Taj Palace');
    expect(second.get(supplierRefKey(TJ, 'tj-1'))?.name).toBe('Taj Palace');
    expect(callCount()).toBe(1);
  });

  it('only fetches the misses when some refs are cached and some are not', async () => {
    const { repo, inner, callCount } = harness();
    await inner.createFromSupplier({
      supplier: TJ,
      supplierHotelId: supplierHotelId('tj-2'),
      name: 'Second Hotel',
      imageUrls: [],
      amenityLabels: [],
    });
    const refA = { supplier: TJ, supplierHotelId: supplierHotelId('tj-1') };
    const refB = { supplier: TJ, supplierHotelId: supplierHotelId('tj-2') };

    await repo.findBySupplierRefs([refA]);
    const both = await repo.findBySupplierRefs([refA, refB]);

    expect(both.get(supplierRefKey(TJ, 'tj-1'))?.name).toBe('Taj Palace');
    expect(both.get(supplierRefKey(TJ, 'tj-2'))?.name).toBe('Second Hotel');
    expect(callCount()).toBe(2);
  });

  it('never caches a miss, so a mapping written after the first lookup is visible on the next', async () => {
    const { repo, inner } = harness();
    const ref = { supplier: RG, supplierHotelId: supplierHotelId('rg-9') };

    const before = await repo.findBySupplierRefs([ref]);
    expect(before.has(supplierRefKey(RG, 'rg-9'))).toBe(false);

    const wroteBack = await inner.persistMapping({
      klarHotelId: klarHotelId('KLAR-1'),
      supplier: RG,
      supplierHotelId: supplierHotelId('rg-9'),
      confidence: 'HIGH_CONFIDENCE',
      matchedBy: ['NORMALIZED_NAME'],
    });
    expect(wroteBack).toBe(true);

    const after = await repo.findBySupplierRefs([ref]);
    expect(after.get(supplierRefKey(RG, 'rg-9'))?.klarHotelId).toBe(klarHotelId('KLAR-1'));
  });

  it('serves findByKlarHotelId from cache on the second call', async () => {
    const { repo, callCount } = harness();
    const id = klarHotelId('KLAR-1');

    const first = await repo.findByKlarHotelId(id);
    const second = await repo.findByKlarHotelId(id);

    expect(first?.name).toBe('Taj Palace');
    expect(second?.name).toBe('Taj Palace');
    expect(callCount()).toBe(1);
  });

  it('does not cache an unknown id', async () => {
    const { repo, callCount } = harness();
    const unknown = klarHotelId('KLAR-DOES-NOT-EXIST');

    await repo.findByKlarHotelId(unknown);
    await repo.findByKlarHotelId(unknown);

    expect(callCount()).toBe(2);
  });
});
