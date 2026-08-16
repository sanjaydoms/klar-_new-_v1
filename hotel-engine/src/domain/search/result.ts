import type { KlarHotelId, SearchId, SupplierCode } from '../shared/brand.js';
import type { CanonicalHotel } from '../hotel/canonical-hotel.js';
import type { MatchConfidence } from '../hotel/match-confidence.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { SupplierDeal } from '../deal/supplier-deal.js';
import type { SelectionPolicy } from '../deal/selection.js';

/**
 * How a supplier's leg of one search actually went.
 *
 * The reference implementation swallowed supplier failures into
 * `console.error` and returned nothing to the caller (D-8), so a search where
 * RateGain timed out looked identical to one where RateGain had no inventory —
 * while the UI still implied the price shown was the cheapest available. This
 * record is what makes that distinction expressible.
 */
export type SupplierAttemptStatus =
  | 'SUCCESS'
  | 'EMPTY'
  | 'PARTIAL'
  | 'ERROR'
  | 'TIMEOUT'
  | 'CIRCUIT_OPEN'
  | 'DISABLED'
  | 'NOT_ELIGIBLE';

export interface SupplierAttempt {
  readonly supplier: SupplierCode;
  readonly status: SupplierAttemptStatus;
  readonly durationMs: number;
  readonly hotelsReturned: number;
  readonly dealsReturned: number;
  readonly supplierPagesConsumed: number;
  /** Normalised code, never the supplier's raw message. */
  readonly errorCode?: string;
  readonly retryable?: boolean;
}

/**
 * Whether the displayed price can honestly be called the best available.
 *
 * BEST_AVAILABLE requires every eligible supplier to have answered. If one did
 * not, the answer is PARTIAL and the UI must say so — the brief is explicit
 * that we must not claim a global cheapest when a supplier was never heard
 * from.
 */
export type PriceGuarantee = 'BEST_AVAILABLE' | 'PARTIAL';

export interface HotelComparison {
  /** Suppliers that returned a usable deal for this hotel. */
  readonly comparedAcross: readonly SupplierCode[];
  /** Eligible suppliers that did not answer in time, or errored. */
  readonly incompleteSuppliers: readonly SupplierCode[];
  readonly priceGuarantee: PriceGuarantee;
  readonly equivalenceClass: string;
  readonly policy: SelectionPolicy;
}

/**
 * A supplier's lead-in price for a property it has not yet quoted a bookable
 * rate for.
 *
 * Priced through the same engine as a real deal, so it is comparable — but it
 * is a "from" figure, not an offer. It can be ranked and displayed; it cannot
 * be booked, and it must never be presented as a confirmed price.
 */
export interface IndicativeOffer {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: string;
  readonly price: CustomerPrice;
}

/**
 * Whether the headline figure for a hotel is one we can honour.
 *
 * `INDICATIVE` exists because RateGain's `bestproperties` returns a lead-in
 * price and no rate key: a bookable rate needs a second `getproducts` call, and
 * the orchestrator only makes that call where it could change the answer. A
 * hotel nobody has quoted a bookable rate for is still worth showing — it just
 * must not claim a price we have not secured.
 */
export type PriceKind = 'BOOKABLE' | 'INDICATIVE';

/**
 * One hotel in a result set, with every deal we hold for it.
 *
 * `featuredDeal` is a reference into `deals` — the same object, not a copy.
 * Nothing is discarded at merge time, so the comparability policy can change
 * without data loss and every alternative shown is genuinely bookable.
 *
 * It is optional only for the indicative case above. When it is present,
 * `priceKind` is `BOOKABLE` and `bestPrice` is its price.
 */
export interface MergedHotel {
  readonly klarHotelId: KlarHotelId;
  readonly hotel: CanonicalHotel;
  readonly featuredDeal?: SupplierDeal;
  readonly deals: readonly SupplierDeal[];
  /** One winner per non-featured equivalence class. */
  readonly alternativeDeals: readonly SupplierDeal[];
  /** Lead-in prices from suppliers that have not quoted a bookable rate. */
  readonly indicativeOffers: readonly IndicativeOffer[];
  /** The figure this hotel is ranked and displayed on. */
  readonly bestPrice: CustomerPrice;
  readonly priceKind: PriceKind;
  readonly comparison: HotelComparison;
  /** Weakest confidence among the merged supplier properties. */
  readonly matchConfidence: MatchConfidence;
  readonly distanceMetres?: number;
}

export interface SearchDiagnostics {
  readonly searchId: SearchId;
  readonly totalDurationMs: number;
  readonly deadlineMs: number;
  readonly deadlineHit: boolean;
  readonly attempts: readonly SupplierAttempt[];
  readonly cache: 'HIT' | 'MISS' | 'STALE';
  readonly hotelsBeforeMerge: number;
  readonly hotelsAfterMerge: number;
  readonly mergesPerformed: number;
  readonly mergesRejectedLowConfidence: number;
  /**
   * Rate lookups issued for suppliers whose search returns no bookable rates.
   * Deliberately visible: it is the main cost driver of a mixed-supplier search
   * and the first number to look at when latency moves.
   */
  readonly enrichmentCallsIssued: number;
  readonly enrichmentCallsSucceeded: number;
  /** Hotels left with only an indicative price because the budget ran out. */
  readonly enrichmentSkipped: number;
}

export interface SearchPage {
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
  /** Hotels matching the filters, across all pages. */
  readonly matchedHotels: number;
  /** Properties known in this destination. Display only — never drives paging. */
  readonly inventoryCount: number;
}

export interface UnifiedSearchResult {
  readonly searchId: SearchId;
  readonly hotels: readonly MergedHotel[];
  readonly page: SearchPage;
  readonly facets: SearchFacets;
  /** Search-wide guarantee: the weakest of every hotel's. */
  readonly priceGuarantee: PriceGuarantee;
  readonly diagnostics: SearchDiagnostics;
}

export interface FacetCount {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface PriceBucket {
  /** Minor units. */
  readonly min: number;
  readonly max: number;
  readonly count: number;
}

/**
 * Filter counts, computed on the merged-but-unfiltered set so that applying one
 * filter never zeroes the options the customer did not pick. Carried forward
 * from the reference implementation, which got this right.
 */
export interface SearchFacets {
  readonly starRatings: readonly FacetCount[];
  readonly propertyTypes: readonly FacetCount[];
  readonly boards: readonly FacetCount[];
  readonly amenities: readonly FacetCount[];
  readonly areas: readonly FacetCount[];
  readonly priceBuckets: readonly PriceBucket[];
  readonly minPrice: number;
  readonly maxPrice: number;
  readonly totalHotels: number;
  readonly multiSupplierHotels: number;
  readonly freeCancellationHotels: number;
  /** Hotels each supplier quoted. The legacy panel's `providerCounts`. */
  readonly suppliers: readonly FacetCount[];
  /**
   * Hotels carrying a bookable alternative to the featured deal.
   *
   * Distinct from `multiSupplierHotels`: an alternative can come from the same
   * supplier — a non-refundable rate on the same room is one — and the legacy
   * `showOnlyAltDeals` filter counts those too.
   */
  readonly alternativeDealHotels: number;
}

const ANSWERED: ReadonlySet<SupplierAttemptStatus> = new Set<SupplierAttemptStatus>([
  'SUCCESS',
  'EMPTY',
]);

/**
 * A supplier that was asked and did not fully answer. NOT_ELIGIBLE and DISABLED
 * are excluded: a supplier that does not serve this destination, or that an
 * operator switched off, is not a gap in the comparison.
 */
export function incompleteSuppliers(
  attempts: readonly SupplierAttempt[],
): SupplierCode[] {
  return attempts
    .filter((a) => a.status !== 'DISABLED' && a.status !== 'NOT_ELIGIBLE')
    .filter((a) => !ANSWERED.has(a.status))
    .map((a) => a.supplier);
}

export function priceGuaranteeFor(
  attempts: readonly SupplierAttempt[],
): PriceGuarantee {
  return incompleteSuppliers(attempts).length === 0 ? 'BEST_AVAILABLE' : 'PARTIAL';
}
