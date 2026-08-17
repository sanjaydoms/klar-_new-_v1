import type {
  DealId,
  KlarHotelId,
  SupplierCode,
  SupplierHotelId,
} from '../shared/brand.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { SupplierCost } from '../pricing/supplier-cost.js';
import type { Board } from '../rate/board.js';
import type { Room } from '../rate/room.js';
import type { CancellationTerms } from '../rate/cancellation.js';
import type { Occupancy } from '../rate/occupancy.js';

/**
 * An opaque, resolvable handle to the supplier state behind a deal.
 *
 * Everything a supplier needs to price and book this exact offer again — its
 * rate key, session/correlation id, review hash, quoted amounts — is sealed
 * server-side and addressed by `DealId`. The client receives the id and nothing
 * else.
 *
 * This is what removes supplier protocol from the browser. In the reference
 * implementation the frontend assembled a native RateGain `BookReservation`
 * envelope — `ResStatus`, `EchoToken`, `RoomSelectionKey`, per-night `RoomRate`
 * — from search results it had been handed. Behind a `DealId` the client cannot
 * tell which supplier it is booking, so adding a supplier changes nothing in
 * the UI.
 */
export interface RateTokenRef {
  readonly dealId: DealId;
  readonly issuedAt: Date;
  readonly expiresAt: Date;
}

/**
 * A complete, bookable offer from one supplier for one hotel.
 *
 * Deals are values: merging never mutates or discards one. The reference
 * deduplicator kept the winner and reduced the loser to `{source, price}` — a
 * label and a number, with the rate key, room, board and cancellation terms
 * thrown away, so the "alternative deal" it advertised could never actually be
 * booked (D-4). Here `MergedHotel.deals[]` holds every deal intact and the
 * winner is a reference into that array.
 */
export interface SupplierDeal {
  readonly dealId: DealId;
  readonly supplier: SupplierCode;

  readonly klarHotelId: KlarHotelId;
  readonly supplierHotelId: SupplierHotelId;

  readonly room: Room;
  readonly board: Board;
  readonly occupancy: Occupancy;
  readonly cancellation: CancellationTerms;

  /** What the supplier charges KLAR. */
  readonly cost: SupplierCost;
  /** What the customer pays. The only comparable figure. */
  readonly price: CustomerPrice;

  readonly token: RateTokenRef;
  /** Rooms left, when the supplier discloses it. Drives urgency messaging only. */
  readonly allotment?: number;
  readonly onHoldAllowed: boolean;
  /** Supplier requires PAN / passport / GST at book time. */
  readonly compliance?: {
    readonly panRequired: boolean;
    readonly passportRequired: boolean;
    readonly gstType?: string;
  };
}

export function isBookable(deal: SupplierDeal, now: Date): boolean {
  if (deal.token.expiresAt.getTime() <= now.getTime()) return false;
  if (deal.price.total.minor <= 0) return false;
  if (deal.allotment !== undefined && deal.allotment <= 0) return false;
  return true;
}
