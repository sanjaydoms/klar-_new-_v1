import type { SupplierCode } from '../../domain/shared/brand.js';
import { supplierCode } from '../../domain/shared/brand.js';
import type { SupplierCapabilities } from '../contract/hotel-supplier.js';

export const RATEGAIN: SupplierCode = supplierCode('RG');

/**
 * Base URLs, per the Smart Distribution specification v1.5.3 §1.
 * Sandbox: https://sandbox-smartdistribution.rategain.com
 * Production: https://smartdistribution.rategain.com
 */
export interface RateGainCredentials {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly apiSecret: string;
  /** Where relative image paths resolve. Absent ⇒ relative images are dropped. */
  readonly imageBaseUrl?: string;
}

export function rateGainHeaders(creds: RateGainCredentials): Record<string, string> {
  return {
    ApiKey: creds.apiKey,
    ApiSecret: creds.apiSecret,
  };
}

export interface RateGainTuning {
  /**
   * Supplier pages fetched per KLAR page.
   *
   * RateGain returns ten properties per page, against TripJack's densified
   * ~100. Left at one page, RateGain contributes a tenth as many hotels and
   * loses most comparisons simply by not being in them — which reads as
   * "RateGain is never cheapest" and is really "RateGain was barely asked".
   * These pages are fetched concurrently, so raising it costs supplier quota
   * rather than wall-clock time.
   */
  readonly pagesPerSearch: number;
  /**
   * Spec §3: "Default page size is 10, no option to change the page size."
   * Used to work out whether more pages remain.
   */
  readonly supplierPageSize: number;
  /** Spec §3 Geofilter: radius in km, minimum 5, maximum 200. */
  readonly minRadiusKm: number;
  readonly maxRadiusKm: number;
}

export const DEFAULT_RATEGAIN_TUNING: RateGainTuning = {
  pagesPerSearch: 4,
  supplierPageSize: 10,
  minRadiusKm: 5,
  maxRadiusKm: 200,
};

export const RATEGAIN_CAPABILITIES: SupplierCapabilities = {
  // `PropertyId` on bestproperties takes a comma-separated list, so an id-list
  // search works as well as a destination code or a geofilter.
  searchTargets: ['DEST_CODE', 'GEO', 'SINGLE_HOTEL', 'HOTEL_IDS'],
  /**
   * FALSE, and this matters.
   *
   * `bestproperties` returns one indicative `price` per property and **no rate
   * key** — nothing it returns can be booked. Bookable rates come from a second
   * `getproducts` call. The orchestrator reads this flag to know a detail call
   * is required before a RateGain property can enter price comparison.
   */
  searchReturnsRates: false,
  supportsHold: false,
  // modificationPolicies.modification is reported, but there is no amend endpoint.
  supportsAmendment: false,
  asyncBooking: false,
  countries: [],
  rateValidityMs: 15 * 60 * 1000,
  maxConcurrency: DEFAULT_RATEGAIN_TUNING.pagesPerSearch,
  pageSize: DEFAULT_RATEGAIN_TUNING.supplierPageSize,
};
