import type { SupplierCode } from '../../domain/shared/brand.js';
import { compare } from '../../domain/shared/money.js';
import { invariant } from '../../domain/shared/errors.js';
import { distanceMetres, hasUsableLocation, type GeoPoint } from '../../domain/hotel/canonical-hotel.js';
import type { MergedHotel, SearchFacets, FacetCount, PriceBucket } from '../../domain/search/result.js';
import type { SearchFilters, SortOption } from '../../domain/search/request.js';
import { boardLabel, type BoardCode } from '../../domain/rate/board.js';

/**
 * Filtering, sorting, paging and facets over merged results.
 *
 * All of it runs on the canonical model, after pricing, so a filter compares
 * the same number the customer sees. Two mistakes from the teardown are
 * deliberately avoided here: the client re-sorting an accumulated list on top
 * of a server sort (D-13), and paging measured against the unfiltered set while
 * slicing the filtered one (D-12).
 */

export function applyFilters(
  hotels: readonly MergedHotel[],
  filters: SearchFilters | undefined,
): readonly MergedHotel[] {
  if (filters === undefined) return hotels;
  let out = hotels;

  if (filters.starRatings !== undefined && filters.starRatings.length > 0) {
    const wanted = new Set(filters.starRatings);
    out = out.filter((h) => h.hotel.starRating !== undefined && wanted.has(Math.round(h.hotel.starRating)));
  }

  if (filters.priceMin !== undefined) {
    out = out.filter((h) => h.bestPrice.total.minor >= (filters.priceMin as number));
  }
  if (filters.priceMax !== undefined) {
    out = out.filter((h) => h.bestPrice.total.minor <= (filters.priceMax as number));
  }

  if (filters.boards !== undefined && filters.boards.length > 0) {
    const wanted = new Set(filters.boards);
    // Any deal on the hotel satisfying the board is enough — filtering on the
    // featured deal alone would hide a hotel that does offer what was asked for.
    out = out.filter((h) => h.deals.some((d) => wanted.has(d.board.code)));
  }

  if (filters.propertyTypes !== undefined && filters.propertyTypes.length > 0) {
    const wanted = new Set(filters.propertyTypes);
    out = out.filter((h) => h.hotel.propertyType !== undefined && wanted.has(h.hotel.propertyType));
  }

  if (filters.amenities !== undefined && filters.amenities.length > 0) {
    // ALL must be present. A customer filtering for a pool and a gym wants both.
    out = out.filter((h) => {
      const codes = new Set(h.hotel.amenities.map((a) => a.code));
      return (filters.amenities as readonly string[]).every((a) => codes.has(a));
    });
  }

  if (filters.freeCancellationOnly === true) {
    out = out.filter((h) => h.deals.some((d) => d.cancellation.tier === 'REFUNDABLE'));
  }

  if (filters.suppliers !== undefined && filters.suppliers.length > 0) {
    const wanted = new Set<SupplierCode>(filters.suppliers);
    out = out.filter(
      (h) =>
        h.deals.some((d) => wanted.has(d.supplier)) ||
        h.indicativeOffers.some((o) => wanted.has(o.supplier)),
    );
  }

  if (filters.nameContains !== undefined && filters.nameContains.trim().length > 0) {
    const needle = filters.nameContains.trim().toLowerCase();
    out = out.filter(
      (h) =>
        h.hotel.name.toLowerCase().includes(needle) ||
        (h.hotel.city ?? '').toLowerCase().includes(needle) ||
        (h.hotel.address ?? '').toLowerCase().includes(needle),
    );
  }

  if (filters.areas !== undefined && filters.areas.length > 0) {
    const wanted = filters.areas.map((a) => a.trim().toLowerCase());
    out = out.filter((h) => {
      const city = (h.hotel.city ?? '').toLowerCase();
      const address = (h.hotel.address ?? '').toLowerCase();
      return wanted.some((a) => city === a || address.includes(a));
    });
  }

  if (filters.multiSupplierOnly === true) {
    out = out.filter(
      (h) => new Set([...h.deals.map((d) => d.supplier), ...h.indicativeOffers.map((o) => o.supplier)]).size > 1,
    );
  }

  return out;
}

/**
 * Sort the merged set.
 *
 * Every comparator ends in a `klarHotelId` tiebreak, so two hotels with equal
 * price and rating keep a stable relative order across requests. Without it a
 * refresh could reorder the page for no visible reason.
 */
export function applySort(
  hotels: readonly MergedHotel[],
  sort: SortOption,
  centre?: GeoPoint,
): readonly MergedHotel[] {
  const byId = (a: MergedHotel, b: MergedHotel): number =>
    a.klarHotelId.localeCompare(b.klarHotelId);

  /**
   * Prices in two currencies are not comparable, and the domain refuses to
   * compare them — `comparePrices` throws rather than fall back to raw numbers.
   * Sorting silently by currency CODE ordered a page by an alphabetical
   * accident and called it "cheapest first". One search carries one currency,
   * so this cannot happen today, which is exactly why it must fail loudly if it
   * ever does rather than quietly produce a plausible wrong order.
   */
  const byPrice = (a: MergedHotel, b: MergedHotel): number => {
    invariant(
      a.bestPrice.currency === b.bestPrice.currency,
      'SORT_CURRENCY_MISMATCH',
      'Cannot order a result set that mixes currencies',
      { left: a.bestPrice.currency, right: b.bestPrice.currency },
    );
    return compare(a.bestPrice.total, b.bestPrice.total);
  };

  const sorted = hotels.slice();
  switch (sort) {
    case 'PRICE_ASC':
      return sorted.sort((a, b) => byPrice(a, b) || byId(a, b));
    case 'PRICE_DESC':
      return sorted.sort((a, b) => byPrice(b, a) || byId(a, b));
    case 'RATING_DESC':
      return sorted.sort(
        (a, b) =>
          (b.hotel.starRating ?? 0) - (a.hotel.starRating ?? 0) || byPrice(a, b) || byId(a, b),
      );
    case 'DISTANCE_ASC':
      return sorted.sort((a, b) => {
        const da = distanceOf(a, centre);
        const db = distanceOf(b, centre);
        return da - db || byPrice(a, b) || byId(a, b);
      });
    case 'RECOMMENDED':
      // A bookable price outranks an indicative one: recommending a hotel whose
      // price we have not secured is a poor recommendation. Then rating, then
      // price.
      return sorted.sort((a, b) => {
        const bookable = (h: MergedHotel): number => (h.priceKind === 'BOOKABLE' ? 0 : 1);
        return (
          bookable(a) - bookable(b) ||
          (b.hotel.starRating ?? 0) - (a.hotel.starRating ?? 0) ||
          byPrice(a, b) ||
          byId(a, b)
        );
      });
    default:
      return sorted.sort(byId);
  }
}

function distanceOf(hotel: MergedHotel, centre?: GeoPoint): number {
  if (centre === undefined || !hasUsableLocation(hotel.hotel.location)) return Number.MAX_SAFE_INTEGER;
  return distanceMetres(centre, hotel.hotel.location);
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
  readonly matched: number;
}

/**
 * Slice a page from the filtered, sorted set.
 *
 * `hasMore` is measured against the same list the page came from. The reference
 * grew its list against the unfiltered set and sliced from the filtered one, so
 * a selective filter produced an empty page that also reported no more results
 * — telling the customer the inventory was exhausted when it was not (D-12).
 */
export function paginate<T>(items: readonly T[], page: number, limit: number): Page<T> {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.max(1, Math.floor(limit));
  const start = (safePage - 1) * safeLimit;
  const slice = items.slice(start, start + safeLimit);
  return {
    items: slice,
    page: safePage,
    limit: safeLimit,
    hasMore: start + safeLimit < items.length,
    matched: items.length,
  };
}

const PRICE_BUCKET_COUNT = 6;

/**
 * Facet counts.
 *
 * Computed on the merged-but-**unfiltered** set, so selecting one filter never
 * collapses the options the customer did not pick. The reference got this right
 * and it is carried forward deliberately.
 */
export function buildFacets(hotels: readonly MergedHotel[]): SearchFacets {
  const stars = new Map<string, number>();
  const propertyTypes = new Map<string, number>();
  const boards = new Map<string, number>();
  const amenities = new Map<string, { label: string; count: number }>();
  const areas = new Map<string, number>();
  const totals: number[] = [];

  const suppliers = new Map<string, number>();
  let multiSupplier = 0;
  let freeCancellation = 0;
  let withAlternative = 0;

  for (const hotel of hotels) {
    // Once per hotel per supplier, however many rates that supplier quoted.
    for (const supplier of new Set([
      ...hotel.deals.map((d) => String(d.supplier)),
      ...hotel.indicativeOffers.map((o) => String(o.supplier)),
    ])) {
      suppliers.set(supplier, (suppliers.get(supplier) ?? 0) + 1);
    }
    if (hotel.deals.length > 1) withAlternative += 1;

    if (hotel.hotel.starRating !== undefined) {
      const k = String(Math.round(hotel.hotel.starRating));
      stars.set(k, (stars.get(k) ?? 0) + 1);
    }
    if (hotel.hotel.propertyType !== undefined) {
      propertyTypes.set(hotel.hotel.propertyType, (propertyTypes.get(hotel.hotel.propertyType) ?? 0) + 1);
    }

    // A board counts once per hotel, however many rates offer it.
    for (const board of new Set(hotel.deals.map((d) => d.board.code))) {
      boards.set(board, (boards.get(board) ?? 0) + 1);
    }
    for (const amenity of new Set(hotel.hotel.amenities.map((a) => a.code))) {
      const label = hotel.hotel.amenities.find((a) => a.code === amenity)?.label ?? amenity;
      const existing = amenities.get(amenity);
      amenities.set(amenity, { label, count: (existing?.count ?? 0) + 1 });
    }
    if (hotel.hotel.city !== undefined) {
      areas.set(hotel.hotel.city, (areas.get(hotel.hotel.city) ?? 0) + 1);
    }

    totals.push(hotel.bestPrice.total.minor);
    if (new Set([...hotel.deals.map((d) => d.supplier), ...hotel.indicativeOffers.map((o) => o.supplier)]).size > 1) {
      multiSupplier += 1;
    }
    if (hotel.deals.some((d) => d.cancellation.tier === 'REFUNDABLE')) freeCancellation += 1;
  }

  const counted = (m: Map<string, number>): FacetCount[] =>
    [...m.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));

  return {
    starRatings: counted(stars).sort((a, b) => Number(b.value) - Number(a.value)),
    propertyTypes: counted(propertyTypes),
    // The filter value stays the code the engine matches on; the label is what
    // a person reads. `counted` uses the value for both, which offered the
    // customer a meal-plan filter called "BB".
    boards: counted(boards).map((f) => ({ ...f, label: boardLabel(f.value as BoardCode) })),
    amenities: [...amenities.entries()]
      .map(([value, v]) => ({ value, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      .slice(0, 60),
    areas: counted(areas).slice(0, 10),
    priceBuckets: buildPriceBuckets(totals),
    minPrice: totals.length > 0 ? Math.min(...totals) : 0,
    maxPrice: totals.length > 0 ? Math.max(...totals) : 0,
    totalHotels: hotels.length,
    multiSupplierHotels: multiSupplier,
    freeCancellationHotels: freeCancellation,
    suppliers: counted(suppliers),
    alternativeDealHotels: withAlternative,
  };
}

/** Even-width buckets across the observed range, with exact counts. */
function buildPriceBuckets(totals: readonly number[]): PriceBucket[] {
  if (totals.length === 0) return [];
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  if (min === max) return [{ min, max, count: totals.length }];

  const width = Math.ceil((max - min) / PRICE_BUCKET_COUNT);
  const buckets: PriceBucket[] = [];
  for (let i = 0; i < PRICE_BUCKET_COUNT; i++) {
    const lo = min + i * width;
    const hi = i === PRICE_BUCKET_COUNT - 1 ? max : lo + width - 1;
    const count = totals.filter((t) => t >= lo && t <= hi).length;
    if (count > 0) buckets.push({ min: lo, max: hi, count });
  }
  return buckets;
}
