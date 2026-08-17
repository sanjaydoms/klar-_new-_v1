import type { KlarHotelId, SupplierCode } from '../shared/brand.js';
import type { StayDates } from '../shared/stay.js';
import type { CanonicalHotel, HotelImage } from '../hotel/canonical-hotel.js';
import type { Amenity } from '../hotel/canonical-hotel.js';
import type { Board } from '../rate/board.js';
import type { Room } from '../rate/room.js';
import type { RefundTier } from '../rate/cancellation.js';
import type { Occupancy } from '../rate/occupancy.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { SupplierDeal } from '../deal/supplier-deal.js';
import type { SelectionPolicy } from '../deal/selection.js';
import type { PriceGuarantee, SupplierAttempt } from '../search/result.js';

/**
 * One hotel, everything bookable on it, from every supplier that sells it.
 *
 * The detail page is the second place a customer sees a price, and the
 * reference implementation is why this type is shaped the way it is: there, the
 * detail endpoint re-priced independently of search and picked the pre-markup
 * total, so the B2C margin vanished between the card and the review page. Here
 * detail and search reach the same number the same way — one pricing engine,
 * one selection policy, one equivalence rule — and the difference between the
 * two responses is which hotels they cover, not how they cost them.
 */

/**
 * A bookable product: one room, one board, one refund tier, one occupancy —
 * offered by one or more suppliers.
 *
 * This is the unit the page renders as a row. It is the *equivalence class*
 * from `deal/equivalence.ts`, not a supplier's own grouping: the reference
 * grouped TripJack's options by room name, which put a refundable and a
 * non-refundable rate for the same room in one bucket and let the cheaper one
 * represent both.
 */
export interface RoomProduct {
  /** The equivalence key. Stable, and echoed so the UI can correlate rows. */
  readonly key: string;
  readonly room: Room;
  readonly board: Board;
  readonly occupancy: Occupancy;
  readonly refundTier: RefundTier;
  /** Cheapest first. Every one is bookable via its own `dealId`. */
  readonly offers: readonly SupplierDeal[];
  /** The cheapest offer's price — what the row leads with. */
  readonly leadPrice: CustomerPrice;
  /** Suppliers quoting this exact product. More than one means it is compared. */
  readonly offeredBy: readonly SupplierCode[];
}

/**
 * Static content, merged across suppliers.
 *
 * The canonical record is deliberately thin — it is built from whatever a
 * search returned — so the detail page asks suppliers for the richer version.
 * Each field records where it came from, because "the description" is one
 * supplier's marketing copy and the page may want to say so.
 */
export interface HotelContent {
  readonly description?: string;
  readonly checkInTime?: string;
  readonly checkOutTime?: string;
  readonly policies: readonly string[];
  readonly images: readonly HotelImage[];
  readonly amenities: readonly Amenity[];
  /** Suppliers whose static detail contributed. Empty when none answered. */
  readonly sourcedFrom: readonly SupplierCode[];
}

export interface HotelDetailResult {
  readonly klarHotelId: KlarHotelId;
  readonly hotel: CanonicalHotel;
  readonly content: HotelContent;
  readonly stay: StayDates;

  /** Every comparable product, cheapest lead price first. */
  readonly products: readonly RoomProduct[];
  /**
   * The deal the page should feature, chosen by the same policy search used.
   * Absent when no supplier quoted a bookable rate for these dates.
   */
  readonly featuredDeal?: SupplierDeal;
  /** Every bookable offer, flat. `featuredDeal` is a reference into this. */
  readonly deals: readonly SupplierDeal[];

  readonly priceGuarantee: PriceGuarantee;
  readonly policy: SelectionPolicy;
  readonly diagnostics: HotelDetailDiagnostics;
}

export interface HotelDetailDiagnostics {
  readonly totalDurationMs: number;
  readonly deadlineMs: number;
  readonly deadlineHit: boolean;
  /** One per supplier that maps this hotel, answered or not. */
  readonly attempts: readonly SupplierAttempt[];
  readonly suppliersMapped: number;
  readonly ratesReturned: number;
}

/**
 * Order products by what they cost, then by key so the order never moves.
 *
 * The tiebreak matters for the same reason it does in search: a page refresh
 * that reorders equal-priced rows looks like the inventory changed.
 */
export function sortProducts(products: readonly RoomProduct[]): RoomProduct[] {
  return products
    .slice()
    .sort(
      (a, b) =>
        a.leadPrice.total.minor - b.leadPrice.total.minor || a.key.localeCompare(b.key),
    );
}
