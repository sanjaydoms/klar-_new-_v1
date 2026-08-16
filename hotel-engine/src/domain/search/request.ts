import type {
  CountryCode,
  CurrencyCode,
  KlarDestinationId,
  KlarHotelId,
  SupplierCode,
} from '../shared/brand.js';
import type { StayDates } from '../shared/stay.js';
import type { Occupancy } from '../rate/occupancy.js';
import type { BoardCode } from '../rate/board.js';
import type { PropertyType } from '../hotel/canonical-hotel.js';

/**
 * Where the customer wants to stay, already resolved.
 *
 * The API accepts free text; by the time a request is in the domain the
 * destination is a canonical id or a specific hotel. Supplier destination codes
 * do not appear here — they are looked up per supplier from the mapping table,
 * which is the whole point of having one.
 */
export type SearchTarget =
  | { readonly kind: 'DESTINATION'; readonly destinationId: KlarDestinationId }
  | { readonly kind: 'HOTEL'; readonly klarHotelId: KlarHotelId }
  | {
      readonly kind: 'AREA';
      readonly centre: { readonly lat: number; readonly lng: number };
      readonly radiusKm: number;
    };

export type SortOption =
  | 'PRICE_ASC'
  | 'PRICE_DESC'
  | 'RATING_DESC'
  | 'RECOMMENDED'
  | 'DISTANCE_ASC';

export interface SearchFilters {
  readonly starRatings?: readonly number[];
  /** Minor units, in the request currency. */
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly boards?: readonly BoardCode[];
  readonly propertyTypes?: readonly PropertyType[];
  /** Amenity codes from the controlled vocabulary. ALL must be present. */
  readonly amenities?: readonly string[];
  readonly freeCancellationOnly?: boolean;
  readonly suppliers?: readonly SupplierCode[];
  readonly nameContains?: string;
  readonly areas?: readonly string[];
  /** Only hotels where more than one supplier quoted. */
  readonly multiSupplierOnly?: boolean;
}

export interface PageRequest {
  readonly page: number;
  readonly limit: number;
}

/**
 * One canonical search request. Every supplier is asked this same question;
 * adapters translate it, and nothing supplier-shaped leaks back in.
 */
export interface UnifiedHotelSearchRequest {
  readonly target: SearchTarget;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly currency: CurrencyCode;
  /** Guest nationality. Materially changes price and availability. */
  readonly nationality: CountryCode;
  readonly channel: 'B2C' | 'B2B';
  /** Restrict to these suppliers. Absent ⇒ every enabled supplier. */
  readonly suppliers?: readonly SupplierCode[];
  readonly filters?: SearchFilters;
  readonly sort: SortOption;
  readonly page: PageRequest;
}

/** A `SearchTarget`, collapsed to a stable string. Shared by every cache key that targets a destination, area or hotel. */
export function searchTargetKey(target: SearchTarget): string {
  return target.kind === 'DESTINATION'
    ? `dest:${target.destinationId}`
    : target.kind === 'HOTEL'
      ? `hotel:${target.klarHotelId}`
      : `area:${target.centre.lat.toFixed(4)},${target.centre.lng.toFixed(4)},${target.radiusKm}`;
}

/**
 * Everything that materially changes a price, and nothing that does not.
 *
 * Filters, sort and page are excluded: they are applied after the supplier
 * fan-out, so including them would fragment the cache for no gain. Child ages
 * are included via the occupancy signature, because they change the rate — a
 * cache that ignored them would serve one family's price to another.
 *
 * `markupConfigVersion` is here because a margin change must invalidate quoted
 * prices; without it an operator's markup edit would not take effect until the
 * TTL expired.
 */
export function dynamicCacheKeyParts(
  req: UnifiedHotelSearchRequest,
  occupancySig: string,
  supplierSet: readonly SupplierCode[],
  markupConfigVersion: string,
): readonly string[] {
  return [
    'hsearch:v2',
    searchTargetKey(req.target),
    req.stay.checkIn,
    req.stay.checkOut,
    occupancySig,
    req.currency,
    req.nationality,
    req.channel,
    [...supplierSet].sort().join('+'),
    markupConfigVersion,
  ];
}
