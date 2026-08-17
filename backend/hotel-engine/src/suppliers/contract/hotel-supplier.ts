import type { CountryCode, SupplierCode } from '../../domain/shared/brand.js';
import type { SupplierContext } from './context.js';
import type {
  SupplierBookRequest,
  SupplierBookResult,
  SupplierBookingStatusResult,
  SupplierCancelRequest,
  SupplierCancelResult,
  SupplierHotelDetails,
  SupplierHotelDetailsRequest,
  SupplierPrecheckRequest,
  SupplierPrecheckResult,
  SupplierRatesRequest,
  SupplierRatesResult,
  SupplierSearchRequest,
  SupplierSearchResult,
} from './dto.js';

/**
 * What a supplier can do, and what it needs from the orchestrator.
 *
 * Capabilities are declared rather than discovered. The reference
 * implementation inferred supplier behaviour from the shape of whatever the
 * frontend happened to send — commit's supplier detection was a five-clause
 * heuristic including `payload.type === "HOTEL"` (D-9). Declaring capabilities
 * means the orchestrator can plan a search instead of guessing at one.
 */
export interface SupplierCapabilities {
  /** Which target shapes `search()` accepts. */
  readonly searchTargets: readonly ('DEST_CODE' | 'GEO' | 'HOTEL_IDS' | 'SINGLE_HOTEL')[];
  /**
   * True when search returns bookable rates. False means search is a property
   * listing and `getRates()` must be called before anything can be priced.
   */
  readonly searchReturnsRates: boolean;
  readonly supportsHold: boolean;
  readonly supportsAmendment: boolean;
  /** Booking confirms asynchronously and must be polled (TripJack does). */
  readonly asyncBooking: boolean;
  /** Restrict to these markets. Empty ⇒ no restriction. */
  readonly countries: readonly CountryCode[];
  /** Rates this supplier issues stop being honoured after roughly this long. */
  readonly rateValidityMs: number;
  /** Concurrent in-flight calls the supplier tolerates. TripJack's WAF is strict. */
  readonly maxConcurrency: number;
  readonly pageSize: number;
}

/**
 * The contract every hotel supplier implements.
 *
 * Two rules make this an abstraction rather than a shared shape:
 *
 *  1. **Adapters return cost, never price.** No method here can express a
 *     customer price, and `SupplierContext` carries no markup rules, so the
 *     asymmetry that made cross-supplier comparison meaningless (D-1) cannot be
 *     written.
 *
 *  2. **Nothing rejects.** Every method resolves with a result carrying a
 *     status and, where relevant, a normalised error. Supplier failure is data
 *     the orchestrator records and reports, not an exception that unwinds a
 *     fan-out and disappears into a log line (D-8).
 *
 * `precheck`, `book` and `cancel` are required, not optional. A supplier whose
 * rates cannot be booked has no business appearing in a search that promises
 * the lowest bookable price; variation in what a supplier supports belongs in
 * `capabilities`, not in a missing method.
 */
export interface HotelSupplier {
  readonly code: SupplierCode;
  readonly capabilities: SupplierCapabilities;

  search(req: SupplierSearchRequest, ctx: SupplierContext): Promise<SupplierSearchResult>;

  getHotelDetails(
    req: SupplierHotelDetailsRequest,
    ctx: SupplierContext,
  ): Promise<SupplierHotelDetails | null>;

  getRates(req: SupplierRatesRequest, ctx: SupplierContext): Promise<SupplierRatesResult>;

  precheck(
    req: SupplierPrecheckRequest,
    ctx: SupplierContext,
  ): Promise<SupplierPrecheckResult>;

  book(req: SupplierBookRequest, ctx: SupplierContext): Promise<SupplierBookResult>;

  cancel(req: SupplierCancelRequest, ctx: SupplierContext): Promise<SupplierCancelResult>;

  /** Required when `capabilities.asyncBooking` is true. */
  getBookingStatus?(
    supplierBookingRef: string,
    ctx: SupplierContext,
  ): Promise<SupplierBookingStatusResult>;
}
