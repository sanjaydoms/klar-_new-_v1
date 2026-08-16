import type { CountryCode, SupplierCode } from '../../domain/shared/brand.js';
import { searchTargetKey, type SearchTarget } from '../../domain/search/request.js';
import type {
  Cache,
  CacheTtl,
  DestinationCandidate,
  DestinationResolver,
  SupplierTargetCapability,
} from '../../modules/ports.js';
import type { SupplierSearchTarget } from '../../suppliers/contract/dto.js';

/** ADR-0005 §4's "destination / geo" layer: destinations, radii, supplier codes — days. */
const DESTINATION_TTL: CacheTtl = { freshMs: 24 * 60 * 60 * 1000, staleMs: 24 * 60 * 60 * 1000 };

/**
 * ADR-0005 §4's "supplier candidate sets" layer: TripJack's `HOTEL_IDS` window
 * is a live inventory list, not a place — held for hours, not days, even
 * though `resolveTargets` answers for every supplier's target shape in one
 * call. One TTL for the whole map is a simplification: a destination code or
 * geofilter would tolerate the longer window fine, but the call is one round
 * trip either way, so splitting it into two would buy nothing.
 */
const TARGETS_TTL: CacheTtl = { freshMs: 4 * 60 * 60 * 1000, staleMs: 4 * 60 * 60 * 1000 };

/**
 * ADR-0005 §4's "destination / geo" and "supplier candidate sets" cache layers.
 *
 * Only ever caches a HIT, the same rule `CachedPropertyRepository` uses: a
 * miss is never written, so nothing here needs an explicit invalidation path.
 */
export class CachedDestinationResolver implements DestinationResolver {
  readonly #inner: DestinationResolver;
  readonly #cache: Cache;

  constructor(inner: DestinationResolver, cache: Cache) {
    this.#inner = inner;
    this.#cache = cache;
  }

  async lookup(query: {
    text: string;
    countryCode?: CountryCode;
    limit?: number;
  }): Promise<readonly DestinationCandidate[]> {
    const key = `dest:lookup:${query.text.trim().toLowerCase()}:${query.countryCode ?? ''}:${query.limit ?? ''}`;
    const cached = await this.#cache.get<readonly DestinationCandidate[]>(key);
    if (cached.state !== 'MISS') return cached.value;

    const result = await this.#inner.lookup(query);
    await this.#cache.set(key, result, DESTINATION_TTL);
    return result;
  }

  async resolveTargets(
    target: SearchTarget,
    suppliers: readonly SupplierTargetCapability[],
  ): Promise<Map<SupplierCode, SupplierSearchTarget | null>> {
    const supplierKey = [...suppliers]
      .map((s) => `${s.code}:${[...s.searchTargets].sort().join(',')}`)
      .sort()
      .join('+');
    const key = `dest:targets:${searchTargetKey(target)}:${supplierKey}`;

    const cached = await this.#cache.get<readonly (readonly [SupplierCode, SupplierSearchTarget | null])[]>(key);
    if (cached.state !== 'MISS') return new Map(cached.value);

    const result = await this.#inner.resolveTargets(target, suppliers);
    await this.#cache.set(key, [...result.entries()], TARGETS_TTL);
    return result;
  }

  async countryOf(target: SearchTarget): Promise<CountryCode | undefined> {
    const key = `dest:country:${searchTargetKey(target)}`;
    const cached = await this.#cache.get<CountryCode>(key);
    if (cached.state !== 'MISS') return cached.value;

    const result = await this.#inner.countryOf(target);
    if (result !== undefined) await this.#cache.set(key, result, DESTINATION_TTL);
    return result;
  }

  async inventoryCount(target: SearchTarget): Promise<number> {
    const key = `dest:inventory:${searchTargetKey(target)}`;
    const cached = await this.#cache.get<number>(key);
    if (cached.state !== 'MISS') return cached.value;

    const result = await this.#inner.inventoryCount(target);
    await this.#cache.set(key, result, DESTINATION_TTL);
    return result;
  }
}
