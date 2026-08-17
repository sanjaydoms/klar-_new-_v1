import { toMajor } from '../../domain/shared/money.js';
import type { Booking, BookingStatus } from '../../domain/booking/booking.js';
import { legacyPricingBlock, type LegacyPricingBlock } from './legacy-pricing.js';

/**
 * LEGACY. A booking, in the shape the existing frontend reads.
 *
 * **Expiry: deleted when the bookings page reads the canonical booking.**
 *
 * This is the projection that retires the worst dependency in the teardown.
 * `MyBookingsPage.tsx` renders a booking's hotel name, room type, image, room
 * count and guest count out of the stored RAW SUPPLIER REQUEST —
 * `booking.rateGainRequest.BookReservation.RoomSelection[0].Property.Name`,
 * with a parallel `tripJackRequest.roomTravellerInfo` branch beside it. Adding
 * a third supplier broke the bookings list.
 *
 * Read the page carefully, though, and every one of those reads is a FALLBACK:
 * it prefers `booking.hotelName`, `booking.roomType`, `booking.hotelImage` and
 * `booking.rooms[]` and only then goes digging. So the fix needs no frontend
 * release at all — supplying the canonical fields makes the supplier-specific
 * branches unreachable, and they can be deleted at leisure.
 *
 * Nothing here is derived from a supplier payload. The `deal_snapshot` frozen
 * at book time is the source, which is why this projection is the same length
 * for one supplier as for ten.
 */
export interface LegacyBooking {
  // ── What the page reads first ────────────────────────────────────────────
  readonly klarBookingId: string;
  readonly confirmationNumber: string;
  readonly publicToken: string;
  readonly status: LegacyBookingStatus;
  readonly hotelName: string;
  readonly hotelImage?: string;
  readonly roomType: string;
  readonly checkIn: string;
  readonly checkOut: string;
  readonly nights: number;
  readonly totalAmount: number;
  readonly currencyCode: string;
  readonly guestName?: string;
  readonly rooms: ReadonlyArray<{
    readonly roomType: string;
    readonly guests: number;
    readonly board: string;
  }>;
  readonly createdAt: string;

  // ── Canonical, from day one ──────────────────────────────────────────────
  readonly supplier: string;
  /** The property's own PMS number when the supplier gave one — often absent. */
  readonly hotelConfirmationNumber?: string;
  readonly pricing: LegacyPricingBlock;
  readonly cancellation: {
    readonly refundable: string;
    readonly freeUntil: string | null;
  };
  readonly refund?: {
    readonly status: string;
    readonly amount: number;
    readonly currency: string;
  };
}

/**
 * The frontend's own status union, which is not ours.
 *
 * Three names differ — `HELD`, `PRECHECK_VALIDATED`, `PAYMENT_RESERVED` — and
 * translating here rather than renaming the domain keeps a legacy vocabulary
 * from setting the engine's.
 */
export type LegacyBookingStatus =
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PENDING'
  | 'FAILED'
  | 'HELD'
  | 'PRECHECK_VALIDATED'
  | 'PAYMENT_RESERVED'
  | 'SUPPLIER_PENDING'
  | 'CANCELLATION_PENDING'
  | 'MANUAL_REVIEW';

const STATUS: Readonly<Record<BookingStatus, LegacyBookingStatus>> = {
  DRAFT: 'PENDING',
  PRECHECK_PASSED: 'PRECHECK_VALIDATED',
  PAYMENT_HELD: 'PAYMENT_RESERVED',
  SUPPLIER_PENDING: 'SUPPLIER_PENDING',
  CONFIRMED: 'CONFIRMED',
  ON_HOLD: 'HELD',
  CANCELLATION_PENDING: 'CANCELLATION_PENDING',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
};

export function toLegacyBooking(booking: Booking): LegacyBooking {
  const deal = booking.deal;
  const lead = booking.guests.find((g) => g.isPrimary) ?? booking.guests[0];

  return {
    klarBookingId: String(booking.klarBookingId),
    /**
     * KLAR's id, not the supplier's.
     *
     * The page shows this to the customer and support quotes it back. A
     * supplier reference means nothing to either, changes shape per supplier,
     * and is absent entirely while a booking is still settling.
     */
    confirmationNumber: String(booking.klarBookingId),
    publicToken: booking.publicToken,
    status: STATUS[booking.status],
    hotelName: deal.hotelName,
    ...(deal.hotelImage !== undefined ? { hotelImage: deal.hotelImage } : {}),
    roomType: deal.room.name,
    checkIn: booking.stay.checkIn,
    checkOut: booking.stay.checkOut,
    nights: booking.stay.nights,
    totalAmount: toMajor(deal.price.total),
    currencyCode: String(deal.price.currency),
    ...(lead !== undefined ? { guestName: `${lead.firstName} ${lead.lastName}`.trim() } : {}),
    rooms: deal.occupancy.rooms.map((room) => ({
      roomType: deal.room.name,
      guests: room.adults + room.children,
      board: deal.board.label,
    })),
    createdAt: booking.createdAt.toISOString(),

    supplier: String(booking.supplier),
    ...(booking.hotelConfirmationNumber !== undefined
      ? { hotelConfirmationNumber: booking.hotelConfirmationNumber }
      : {}),
    pricing: legacyPricingBlock(deal.price),
    cancellation: {
      refundable: deal.cancellation.refundable,
      freeUntil: deal.cancellation.freeUntil,
    },
    ...(booking.refund !== undefined
      ? {
          refund: {
            status: booking.refund.status,
            amount: toMajor(booking.refund.amount),
            currency: String(booking.refund.amount.currency),
          },
        }
      : {}),
  };
}
