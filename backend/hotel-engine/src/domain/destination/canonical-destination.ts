import type {
  CountryCode,
  KlarDestinationId,
  SupplierCode,
} from '../shared/brand.js';
import type { GeoPoint } from '../hotel/canonical-hotel.js';

export type DestinationKind = 'CITY' | 'REGION' | 'AREA' | 'LANDMARK' | 'AIRPORT' | 'COUNTRY';

/**
 * A supplier's own handle for a destination.
 *
 * TripJack and RateGain do not agree on what a destination is: RateGain takes a
 * destination code or a geofilter, TripJack takes a list of candidate hotel
 * ids. Both are supplier concerns, kept behind this mapping so the search
 * request can name a place instead of a code.
 */
export interface SupplierDestinationMapping {
  readonly supplier: SupplierCode;
  /** Supplier destination code, when it has one. */
  readonly supplierDestCode?: string;
  /** Supplier prefers a geo query for this place. */
  readonly useGeoFilter?: boolean;
  readonly verifiedAt?: Date;
}

export interface CanonicalDestination {
  readonly klarDestinationId: KlarDestinationId;
  readonly name: string;
  readonly normalizedName: string;
  readonly kind: DestinationKind;
  readonly countryCode: CountryCode;
  readonly parentId?: KlarDestinationId;

  readonly centre: GeoPoint;
  /**
   * Search radius covering the destination's real extent, from its geocoded
   * bounding box rather than a constant. Goa is not Paris.
   */
  readonly radiusKm: number;

  /** Alternate and historical names: "Bombay" → Mumbai, "Bengaluru"/"Bangalore". */
  readonly aliases: readonly string[];
  readonly supplierMappings: readonly SupplierDestinationMapping[];
  /** Hotels we hold here. Ranks autocomplete and powers "6,179 properties". */
  readonly propertyCount: number;
  readonly updatedAt: Date;
}

export function destinationMappingFor(
  dest: CanonicalDestination,
  supplier: SupplierCode,
): SupplierDestinationMapping | undefined {
  return dest.supplierMappings.find((m) => m.supplier === supplier);
}

/**
 * Radius bounds. Five kilometres is too small for anything but a city-state;
 * five hundred covers an archipelago like the Maldives. Outside those, a
 * geocoder's bounding box is more likely wrong than the place is unusual.
 */
export const MIN_RADIUS_KM = 5;
export const MAX_RADIUS_KM = 500;

export function clampRadiusKm(km: number): number {
  if (!Number.isFinite(km) || km <= 0) return 20;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, km));
}
