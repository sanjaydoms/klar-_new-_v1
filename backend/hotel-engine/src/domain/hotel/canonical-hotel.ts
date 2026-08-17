import type {
  CountryCode,
  KlarHotelId,
  SupplierCode,
  SupplierHotelId,
} from '../shared/brand.js';
import type { MatchConfidence, MatchSignal } from './match-confidence.js';

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface HotelImage {
  /** Absolute URL. Relative paths and bare filenames are resolved at ingest. */
  readonly url: string;
  readonly caption?: string;
  readonly kind?: 'EXTERIOR' | 'ROOM' | 'AMENITY' | 'DINING' | 'OTHER';
  /** Which supplier contributed it, for provenance when galleries are merged. */
  readonly sourcedFrom: SupplierCode;
}

/**
 * A normalised amenity.
 *
 * `code` comes from a controlled vocabulary so that filtering is exact; `label`
 * is what a supplier called it, kept for display and for debugging the mapping.
 *
 * There is deliberately no way to construct an amenity that no supplier
 * reported. The reference implementation synthesised amenities from star rating
 * ("5 stars, therefore Spa") and from the hotel's own name ("contains 'beach',
 * therefore Spa"), then let those inventions drive the amenity filter. A
 * customer who filtered for a spa was shown hotels we had guessed had one.
 */
export interface Amenity {
  readonly code: string;
  readonly label: string;
  readonly sourcedFrom: SupplierCode;
}

export interface SupplierPropertyMapping {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly confidence: MatchConfidence;
  readonly matchedBy: readonly MatchSignal[];
  /** Set when a human confirmed it. Promotes the mapping to fully trusted. */
  readonly verifiedAt?: Date;
  readonly firstSeenAt: Date;
  readonly lastSeenAt: Date;
}

/**
 * The controlled vocabulary, as a value.
 *
 * A caller validating client input needs to test membership at runtime, and a
 * type alone cannot be tested. Deriving the type from the list keeps the two
 * from drifting.
 */
export const PROPERTY_TYPES = [
  'HOTEL', 'RESORT', 'APARTMENT', 'VILLA', 'HOSTEL', 'GUESTHOUSE',
  'BNB', 'MOTEL', 'LODGE', 'HOMESTAY', 'CAMP', 'OTHER',
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * KLAR's own record of a property. The system of record for identity.
 *
 * Nothing here is supplier-specific. A supplier's view of this property is
 * reachable only through `supplierMappings`, which is the point: the search
 * engine, the pricing engine and the frontend all address a hotel by
 * `klarHotelId` and never learn which suppliers sell it.
 */
export interface CanonicalHotel {
  readonly klarHotelId: KlarHotelId;

  readonly name: string;
  /** Lower-cased, de-accented, chain-prefix- and suffix-stripped. Match input. */
  readonly normalizedName: string;

  readonly address?: string;
  readonly city?: string;
  readonly countryCode?: CountryCode;
  readonly postalCode?: string;
  readonly location?: GeoPoint;

  readonly starRating?: number;
  readonly propertyType?: PropertyType;
  readonly brand?: string;
  readonly chainCode?: string;

  /**
   * Neutral third-party identifiers, when we have them (GIATA and equivalents).
   * Reserved rather than used: no neutral content source is licensed today
   * (ADR-0000 §7). Populating this activates match tier 2 with no model change.
   */
  readonly externalIds?: Readonly<Record<string, string>>;

  readonly images: readonly HotelImage[];
  readonly amenities: readonly Amenity[];

  readonly supplierMappings: readonly SupplierPropertyMapping[];
  readonly updatedAt: Date;
}

export function mappingFor(
  hotel: CanonicalHotel,
  supplier: SupplierCode,
): SupplierPropertyMapping | undefined {
  return hotel.supplierMappings.find((m) => m.supplier === supplier);
}

export function suppliersSelling(hotel: CanonicalHotel): SupplierCode[] {
  return hotel.supplierMappings.map((m) => m.supplier);
}

/** Great-circle distance in metres. Used by the matcher's proximity signal. */
export function distanceMetres(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * The `[0,0]` sentinel: several supplier feeds use it for "no geocode". Treating
 * it as a real coordinate puts unrelated properties on top of each other in the
 * Gulf of Guinea, which is precisely the input that makes proximity matching
 * dangerous.
 */
export function hasUsableLocation(p: GeoPoint | undefined): p is GeoPoint {
  if (!p) return false;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return false;
  if (p.lat === 0 && p.lng === 0) return false;
  return Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}
