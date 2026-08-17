import type { CanonicalHotel } from '../../domain/hotel/canonical-hotel.js';
import type { KlarHotelId } from '../../domain/shared/brand.js';
import type {
  Cache,
  CacheTtl,
  MappingWriteback,
  MatchCandidateQuery,
  PropertyRepository,
  SupplierRef,
  UnresolvedMatch,
} from '../../modules/ports.js';
import { supplierRefKey } from '../../modules/ports.js';

/**
 * ADR-0005 §4's "static property" cache layer: name, address, images, stars,
 * amenities, coordinates — days, background-refreshed.
 *
 * Only ever caches a HIT. A supplier ref or a KLAR id that misses is never
 * written to the cache, so a mapping confirmed by `persistMapping` or a hotel
 * minted by `createFromSupplier` needs no invalidation here — there was
 * nothing cached under its key to go stale. Everything that writes
 * (`persistMapping`, `createFromSupplier`, `recordUnresolved`) and the bounded
 * matcher scan (`findMatchCandidates`) pass straight through: caching a
 * candidate scan would risk hiding a hotel created moments ago from its own
 * matcher pass.
 *
 * ponytail: refresh-on-expiry, not a background refresh — the entry is
 * refetched the moment a request finds it stale, not ahead of time. Add a
 * warming job if cold-entry latency on a popular hotel becomes a problem.
 */
const STATIC_TTL: CacheTtl = { freshMs: 24 * 60 * 60 * 1000, staleMs: 24 * 60 * 60 * 1000 };

export class CachedPropertyRepository implements PropertyRepository {
  readonly #inner: PropertyRepository;
  readonly #cache: Cache;

  constructor(inner: PropertyRepository, cache: Cache) {
    this.#inner = inner;
    this.#cache = cache;
  }

  async findBySupplierRefs(refs: readonly SupplierRef[]): Promise<Map<string, CanonicalHotel>> {
    const out = new Map<string, CanonicalHotel>();
    const misses: SupplierRef[] = [];

    for (const ref of refs) {
      const key = `prop:ref:${supplierRefKey(ref.supplier, ref.supplierHotelId)}`;
      const cached = await this.#cache.get<CanonicalHotel>(key);
      if (cached.state === 'MISS') misses.push(ref);
      else out.set(supplierRefKey(ref.supplier, ref.supplierHotelId), cached.value);
    }
    if (misses.length === 0) return out;

    const fetched = await this.#inner.findBySupplierRefs(misses);
    for (const [refKey, hotel] of fetched) {
      out.set(refKey, hotel);
      await this.#cache.set(`prop:ref:${refKey}`, hotel, STATIC_TTL);
    }
    return out;
  }

  async findByKlarHotelId(id: KlarHotelId): Promise<CanonicalHotel | null> {
    const key = `prop:id:${id}`;
    const cached = await this.#cache.get<CanonicalHotel>(key);
    if (cached.state !== 'MISS') return cached.value;

    const hotel = await this.#inner.findByKlarHotelId(id);
    if (hotel !== null) await this.#cache.set(key, hotel, STATIC_TTL);
    return hotel;
  }

  findMatchCandidates(query: MatchCandidateQuery): Promise<readonly CanonicalHotel[]> {
    return this.#inner.findMatchCandidates(query);
  }

  persistMapping(mapping: MappingWriteback): Promise<boolean> {
    return this.#inner.persistMapping(mapping);
  }

  createFromSupplier(
    input: Parameters<PropertyRepository['createFromSupplier']>[0],
  ): Promise<CanonicalHotel> {
    return this.#inner.createFromSupplier(input);
  }

  recordUnresolved(candidate: UnresolvedMatch): Promise<void> {
    return this.#inner.recordUnresolved(candidate);
  }
}
