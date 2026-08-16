import type { SupplierCode } from '../../domain/shared/brand.js';
import { supplierCode } from '../../domain/shared/brand.js';
import type { SupplierCapabilities } from '../contract/hotel-supplier.js';

export const TRIPJACK: SupplierCode = supplierCode('TJ');

/**
 * Credentials and endpoints. Constructed by the composition root from
 * configuration management — never read from `process.env` in here, and never
 * defaulted to a literal. The reference shipped a live OpenCage key as a `||`
 * fallback in three places (D-14); an adapter that cannot start without its
 * credentials is the behaviour we want.
 */
export interface TripJackCredentials {
  /** Hotel Management System: search, pricing, static detail, review. */
  readonly hmsBaseUrl: string;
  /** Order Management System: book, booking-details, cancel. */
  readonly omsBaseUrl: string;
  readonly apiKey: string;
  readonly agencyId: string;
  /** Where relative image paths resolve. Absent ⇒ relative images are dropped. */
  readonly imageBaseUrl?: string;
}

/**
 * Exactly one header carries the key.
 *
 * The reference client sent it under six names — `apikey`, `apiKey`, `key`,
 * `x-api-key`, `Authorization` — plus three spellings of `agencyId` and a
 * spoofed Chrome User-Agent to get past the WAF (D-16). Six copies of a
 * credential on every request, and a UA that breaks the day TripJack tightens
 * its rules. `apikey` is TripJack's documented header; if that turns out to be
 * wrong, this is the one line to change.
 */
export function tripJackHeaders(creds: TripJackCredentials): Record<string, string> {
  return {
    apikey: creds.apiKey,
    agencyid: creds.agencyId,
  };
}

/**
 * Tuning that is a property of the supplier's own behaviour rather than an
 * operator preference. Operator-tunable values (timeouts, retries, breaker
 * thresholds) live in `SupplierConfig` and are editable without a deploy.
 */
export interface TripJackTuning {
  /**
   * Candidate hotel ids scanned per KLAR page.
   *
   * TripJack has no destination search: a listing call prices only the ids you
   * hand it, and for a large destination most of them are not bookable on the
   * requested dates — measured at roughly one bookable hotel per twenty ids.
   * Scanning a window rather than a page is what makes a page worth returning.
   */
  readonly idsPerPage: number;
  /** Ids per listing call. TripJack rejects unbounded id lists. */
  readonly idsPerCall: number;
  /**
   * Listing calls in flight at once.
   *
   * Kept low because TripJack's WAF answers a burst with 403s — the reason the
   * reference resorted to a spoofed User-Agent. Three was the observed ceiling.
   */
  readonly concurrency: number;
  /** Safety valve on an implausibly dense window. */
  readonly maxHotelsPerPage: number;
}

export const DEFAULT_TRIPJACK_TUNING: TripJackTuning = {
  idsPerPage: 150,
  idsPerCall: 50,
  concurrency: 3,
  maxHotelsPerPage: 100,
};

export const TRIPJACK_CAPABILITIES: SupplierCapabilities = {
  // No destination search — the orchestrator resolves a place to candidate ids.
  searchTargets: ['HOTEL_IDS', 'SINGLE_HOTEL'],
  searchReturnsRates: true,
  supportsHold: true,
  supportsAmendment: true,
  // Book returns a pending order; confirmation arrives within ~180 s.
  asyncBooking: true,
  countries: [],
  rateValidityMs: 15 * 60 * 1000,
  maxConcurrency: DEFAULT_TRIPJACK_TUNING.concurrency,
  pageSize: DEFAULT_TRIPJACK_TUNING.idsPerPage,
};
