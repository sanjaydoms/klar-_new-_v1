import type {
  CountryCode,
  KlarBookingId,
  SupplierCode,
  SupplierHotelId,
} from '../../domain/shared/brand.js';
import type { StayDates } from '../../domain/shared/stay.js';
import type { Occupancy } from '../../domain/rate/occupancy.js';
import type { Board } from '../../domain/rate/board.js';
import type { Room } from '../../domain/rate/room.js';
import type { CancellationTerms } from '../../domain/rate/cancellation.js';
import type { SupplierCost } from '../../domain/pricing/supplier-cost.js';
import type { MinimumSellingPrice } from '../../domain/pricing/customer-price.js';
import type { GeoPoint, PropertyType } from '../../domain/hotel/canonical-hotel.js';
import type { NormalizedSupplierError } from './errors.js';

/**
 * How this supplier wants a destination expressed. Resolved from the
 * destination mapping table before the call, so the adapter receives an
 * instruction rather than having to decide.
 */
export type SupplierSearchTarget =
  | { readonly kind: 'DEST_CODE'; readonly code: string }
  | { readonly kind: 'GEO'; readonly centre: GeoPoint; readonly radiusKm: number }
  /** TripJack's shape: search is over a candidate id list, not a place. */
  | { readonly kind: 'HOTEL_IDS'; readonly ids: readonly SupplierHotelId[] }
  | { readonly kind: 'SINGLE_HOTEL'; readonly id: SupplierHotelId };

export interface SupplierSearchRequest {
  readonly target: SupplierSearchTarget;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly nationality: CountryCode;
  /** Backend-managed. Suppliers paginate differently; the orchestrator absorbs it. */
  readonly page: number;
  readonly pageSize: number;
}

/**
 * One priced offer, exactly as the supplier described it.
 *
 * `cost` is a SupplierCost — there is no field here in which a customer price
 * could be placed.
 */
export interface SupplierRate {
  /** Supplier's own rate handle: rate key, option id, selection key. */
  readonly supplierRateRef: string;
  readonly room: Room;
  readonly board: Board;
  readonly occupancy: Occupancy;
  readonly cancellation: CancellationTerms;
  readonly cost: SupplierCost;
  /**
   * A floor the supplier requires us to sell at or above. Distinct from cost:
   * it constrains the price, it is not part of what we are charged.
   */
  readonly minimumSellingPrice?: MinimumSellingPrice;
  /**
   * Whether the supplier considers this rate directly bookable. `RECHECK`
   * means it must be re-priced before it can be committed.
   */
  readonly rateStatus?: 'BOOKABLE' | 'RECHECK' | 'UNAVAILABLE';
  readonly allotment?: number;
  readonly onHoldAllowed: boolean;
  readonly compliance?: {
    readonly panRequired: boolean;
    readonly passportRequired: boolean;
    readonly gstType?: string;
  };
  /**
   * Opaque supplier state needed to re-price or book this rate — session ids,
   * review hashes, correlation ids. Sealed into the rate token; never
   * serialised to a client.
   */
  readonly supplierState: Readonly<Record<string, unknown>>;
}

/** A property as one supplier sees it, before canonical matching. */
export interface SupplierHotel {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly name: string;
  readonly address?: string;
  readonly city?: string;
  readonly countryCode?: CountryCode;
  readonly location?: GeoPoint;
  readonly starRating?: number;
  readonly propertyType?: PropertyType;
  readonly chainCode?: string;
  readonly brand?: string;
  /**
   * Neutral third-party identifiers for THIS property — a GIATA id or
   * equivalent. Keyed by scheme, e.g. `{ giata: "1234567" }`.
   *
   * Match tier 2 compares these against a canonical hotel's own `externalIds`.
   * It must be a property-level id: a chain code identifies a brand, so
   * matching on one would merge every hotel of that chain into a single
   * canonical hotel — the false merge ADR-0001 exists to prevent. No supplier
   * populates this today (ADR-0000 §7); the field exists so that licensing a
   * content source activates tier 2 without a model change.
   */
  readonly externalIds?: Readonly<Record<string, string>>;
  /** Absolute URLs only. Bare filenames are resolved inside the adapter. */
  readonly imageUrls: readonly string[];
  /**
   * Only amenities the supplier actually reported. Adapters must not synthesise
   * from star rating or hotel name — the reference implementation did, and
   * those inventions then drove the amenity filter (D-18).
   */
  readonly amenityLabels: readonly string[];
  readonly rates: readonly SupplierRate[];
  /**
   * A lead-in price for suppliers whose search does not return bookable rates
   * (`capabilities.searchReturnsRates === false`).
   *
   * RateGain's `bestproperties` is one: it returns a single indicative `price`
   * per property and no rate key, so a bookable rate needs a second call to
   * `getproducts`. This lets the orchestrator rank and shortlist before paying
   * for those calls. It must never be presented as a bookable price.
   */
  readonly indicativeCost?: SupplierCost;

  /**
   * Opaque supplier state that belongs to the PROPERTY rather than to a rate.
   *
   * A two-phase supplier's second call needs identifiers only its first call
   * knows. RateGain's `getproducts` requires `PropertyCode` and `BrandCode`,
   * both marked Required in the spec and both documented as coming from
   * `bestproperties` — and `bestproperties` returns no rates to hang them on.
   *
   * Without somewhere property-scoped to keep them, every rate lookup for a
   * two-phase supplier goes out missing required fields and is rejected. Never
   * serialised to a client.
   */
  readonly supplierState?: Readonly<Record<string, unknown>>;
}

export interface SupplierPageInfo {
  readonly hasMore: boolean;
  readonly cursor?: string;
  readonly supplierPagesConsumed: number;
  /**
   * The supplier's own idea of how much matched. Semantics vary wildly —
   * TripJack reports candidate ids scanned (~6,179 for Goa, of which perhaps 20
   * are bookable), RateGain a real property count. Never summed across
   * suppliers, never shown to a customer as a result count.
   */
  readonly supplierReportedTotal?: number;
}

export type SupplierResultStatus =
  | 'SUCCESS'
  | 'EMPTY'
  /** Returned some pages before running out of budget. Results are usable. */
  | 'PARTIAL'
  | 'ERROR'
  | 'TIMEOUT'
  | 'CIRCUIT_OPEN';

/**
 * Always resolves — never rejects.
 *
 * A supplier failing is an expected outcome that the orchestrator must record
 * and route around, not an exception that unwinds the fan-out.
 */
export interface SupplierSearchResult {
  readonly supplier: SupplierCode;
  readonly status: SupplierResultStatus;
  readonly hotels: readonly SupplierHotel[];
  readonly pageInfo: SupplierPageInfo;
  readonly responseTimeMs: number;
  readonly error?: NormalizedSupplierError;
}

// ── Detail & rates ──────────────────────────────────────────────────────────

export interface SupplierHotelDetailsRequest {
  readonly supplierHotelId: SupplierHotelId;
}

export interface SupplierHotelDetails {
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly name: string;
  readonly description?: string;
  readonly address?: string;
  readonly city?: string;
  readonly countryCode?: CountryCode;
  readonly location?: GeoPoint;
  readonly starRating?: number;
  readonly imageUrls: readonly string[];
  readonly amenityLabels: readonly string[];
  readonly checkInTime?: string;
  readonly checkOutTime?: string;
  readonly policies: readonly string[];
  readonly checkInInstructions?: string;
}

export interface SupplierRatesRequest {
  readonly supplierHotelId: SupplierHotelId;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly nationality: CountryCode;
  /** Carried from search so a supplier can reuse its own session. */
  readonly supplierState?: Readonly<Record<string, unknown>>;
}

export interface SupplierRatesResult {
  readonly supplier: SupplierCode;
  readonly status: SupplierResultStatus;
  readonly rates: readonly SupplierRate[];
  readonly responseTimeMs: number;
  readonly error?: NormalizedSupplierError;
}

// ── Precheck, book, cancel ──────────────────────────────────────────────────

export interface SupplierPrecheckRequest {
  readonly supplierHotelId: SupplierHotelId;
  readonly supplierRateRef: string;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  /**
   * Required, not inferred.
   *
   * Guest nationality changes both price and availability, and RateGain sends
   * it on the reservation envelope. Defaulting it inside an adapter would
   * quietly re-price the stay for a different traveller than the one who
   * searched.
   */
  readonly nationality: CountryCode;
  readonly supplierState: Readonly<Record<string, unknown>>;
}

/**
 * The supplier's live answer. Reports what IS, not whether it matches what we
 * quoted — that comparison is `domain/revalidation`, which has to be identical
 * across suppliers to be trustworthy.
 */
export interface SupplierPrecheckResult {
  readonly supplier: SupplierCode;
  readonly available: boolean;
  readonly cost?: SupplierCost;
  readonly room?: Room;
  readonly board?: Board;
  readonly cancellation?: CancellationTerms;
  /**
   * The selling floor, re-confirmed.
   *
   * Carried through precheck because it is a term of the distribution
   * agreement, not a property of a search result: `priceFromCost` RAISES a
   * price to meet a mandatory MSP, so dropping it here would sell below a floor
   * the search honoured — at the one moment the number becomes a charge.
   */
  readonly minimumSellingPrice?: MinimumSellingPrice;
  /** Suppliers routinely hand back a new rate reference at precheck. */
  readonly supplierRateRef?: string;
  readonly supplierState?: Readonly<Record<string, unknown>>;
  readonly error?: NormalizedSupplierError;
}

export interface SupplierGuest {
  readonly firstName: string;
  readonly lastName: string;
  readonly isPrimary: boolean;
  readonly isChild: boolean;
  readonly age?: number;
  readonly email?: string;
  readonly phone?: string;
  readonly countryCode?: CountryCode;
  readonly postalCode?: string;
}

export interface SupplierBookRequest {
  readonly klarBookingId: KlarBookingId;
  readonly supplierHotelId: SupplierHotelId;
  readonly supplierRateRef: string;
  readonly stay: StayDates;
  readonly occupancy: Occupancy;
  readonly nationality: CountryCode;
  readonly guests: readonly SupplierGuest[];
  readonly specialRequests?: readonly string[];
  readonly holdOnly: boolean;
  readonly supplierState: Readonly<Record<string, unknown>>;
  /** Passed through so a supplier's own idempotency can be engaged. */
  readonly idempotencyKey: string;
}

export type SupplierBookStatus = 'CONFIRMED' | 'ON_HOLD' | 'PENDING' | 'FAILED';

export interface SupplierBookResult {
  readonly supplier: SupplierCode;
  readonly status: SupplierBookStatus;
  readonly supplierBookingRef?: string;
  /** The property's own PMS number, when the supplier passes one on. */
  readonly hotelConfirmationNumber?: string;
  readonly cost?: SupplierCost;
  /** PENDING only: how to poll, and for how long. */
  readonly poll?: { readonly intervalMs: number; readonly maxWaitMs: number };
  /**
   * Supplier state the booking record must keep in order to cancel later.
   *
   * RateGain's cancel needs the `ReservationId` its commit returned, alongside
   * the property identifiers. Losing them leaves a booking that can be made and
   * not unmade.
   */
  readonly supplierState?: Readonly<Record<string, unknown>>;
  readonly error?: NormalizedSupplierError;
}

export interface SupplierCancelRequest {
  readonly supplierBookingRef: string;
  readonly reason?: string;
  /**
   * Supplier state captured at booking.
   *
   * A confirmation number alone is not always enough to cancel: RateGain's
   * `CancelReservation` also requires `ReservationId`, `PropertyId` and
   * `PropertyCode`. Those exist only in the commit response, so the booking
   * record carries them forward to here — otherwise a booking can be made and
   * not unmade.
   */
  readonly supplierState?: Readonly<Record<string, unknown>>;
}

export interface SupplierCancelResult {
  readonly supplier: SupplierCode;
  readonly status: 'CANCELLED' | 'PENDING' | 'REJECTED';
  readonly penalty?: SupplierCost;
  readonly supplierCancellationRef?: string;
  readonly error?: NormalizedSupplierError;
}

export interface SupplierBookingStatusResult {
  readonly supplier: SupplierCode;
  readonly status: SupplierBookStatus | 'CANCELLED';
  readonly hotelConfirmationNumber?: string;
  readonly error?: NormalizedSupplierError;
}
