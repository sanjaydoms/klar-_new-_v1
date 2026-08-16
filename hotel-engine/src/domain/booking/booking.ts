import type {
  CountryCode,
  DealId,
  KlarBookingId,
  KlarHotelId,
  SupplierCode,
  SupplierHotelId,
} from '../shared/brand.js';
import type { Money } from '../shared/money.js';
import type { StayDates } from '../shared/stay.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { SupplierCost } from '../pricing/supplier-cost.js';
import type { Board } from '../rate/board.js';
import type { Room } from '../rate/room.js';
import type { CancellationTerms } from '../rate/cancellation.js';
import type { Occupancy } from '../rate/occupancy.js';

export type BookingStatus =
  | 'DRAFT'
  | 'PRECHECK_PASSED'
  | 'PAYMENT_HELD'
  | 'SUPPLIER_PENDING'
  | 'CONFIRMED'
  | 'ON_HOLD'
  | 'CANCELLATION_PENDING'
  | 'CANCELLED'
  | 'FAILED'
  | 'MANUAL_REVIEW';

export interface Guest {
  readonly firstName: string;
  readonly lastName: string;
  readonly isPrimary: boolean;
  readonly email?: string;
  readonly phone?: string;
  readonly countryCode?: CountryCode;
  readonly postalCode?: string;
  readonly age?: number;
  readonly isChild: boolean;
}

/**
 * What the customer was shown and agreed to, frozen at book time.
 *
 * This is what the voucher, the bookings list and the invoice render from. In
 * the reference implementation those surfaces read the stored raw supplier
 * request — `booking.rateGainRequest.BookReservation.RoomSelection[0]...` — so
 * a third supplier would have broken the bookings page. A canonical snapshot
 * makes display independent of who sold the room.
 */
export interface DealSnapshot {
  readonly dealId: DealId;
  readonly supplier: SupplierCode;
  readonly supplierHotelId: SupplierHotelId;
  readonly klarHotelId: KlarHotelId;
  readonly hotelName: string;
  readonly hotelAddress?: string;
  readonly hotelImage?: string;
  readonly starRating?: number;
  readonly room: Room;
  readonly board: Board;
  readonly occupancy: Occupancy;
  readonly cancellation: CancellationTerms;
  readonly cost: SupplierCost;
  readonly price: CustomerPrice;
  readonly quotedAt: Date;
}

export type RefundKind = 'FAILED_BOOKING' | 'CANCELLATION';
export type RefundStatus = 'NONE' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'NOT_APPLICABLE';
export type RefundMethod = 'WALLET' | 'GATEWAY' | 'NONE';

/**
 * Refund bookkeeping.
 *
 * Its presence is what makes refunds idempotent: the in-request poll, the
 * status cron and the reconciliation worker all race to refund the same failed
 * booking, and only the one that claims this record may move money. Carried
 * forward from the reference implementation, which got this right.
 */
export interface RefundRecord {
  readonly kind: RefundKind;
  readonly status: RefundStatus;
  readonly method: RefundMethod;
  readonly amount: Money;
  readonly referenceId: string;
  readonly providerRefundId?: string;
  readonly reason?: string;
  readonly error?: string;
  readonly attemptedAt?: Date;
  readonly completedAt?: Date;
}

export interface PaymentRecord {
  readonly provider: 'RAZORPAY' | 'WALLET';
  readonly orderId?: string;
  readonly paymentId?: string;
  readonly capturedAmount: Money;
  readonly verifiedAt: Date;
}

export interface Booking {
  readonly klarBookingId: KlarBookingId;
  /** Unguessable handle for anonymous guest access. Never the primary key. */
  readonly publicToken: string;
  /** Client-supplied; a unique index on it is what stops double bookings. */
  readonly idempotencyKey: string;

  /**
   * A string keyed to supplier_config, deliberately NOT an enum. The reference
   * model's two-value `BookingProvider` enum meant a third supplier required a
   * schema migration — one of the two hard blockers on the add-a-supplier
   * requirement.
   */
  readonly supplier: SupplierCode;
  /** The supplier's own booking reference. Needed to cancel. */
  readonly supplierBookingRef?: string;
  /** The property's own confirmation number, when the supplier passes it on. */
  readonly hotelConfirmationNumber?: string;

  /**
   * Opaque supplier state the booking must keep in order to be cancelled.
   *
   * A confirmation number is not always enough: RateGain's `CancelReservation`
   * also requires `ReservationId`, `PropertyId` and `PropertyCode`, and those
   * exist only in the commit response (A-3). Without somewhere on the booking to
   * put them, a booking can be made and not unmade. Never serialised to a
   * client — it is supplier protocol, and the whole point of `dealId` is that
   * the browser never sees any.
   */
  readonly supplierState?: Readonly<Record<string, unknown>>;

  readonly status: BookingStatus;
  readonly stay: StayDates;
  readonly deal: DealSnapshot;
  readonly guests: readonly Guest[];

  readonly payment?: PaymentRecord;
  readonly refund?: RefundRecord;

  readonly channel: 'B2C' | 'B2B';
  readonly agentId?: string;
  readonly userId?: string;

  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** States from which a supplier cancellation may still be attempted. */
const CANCELLABLE: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  'CONFIRMED',
  'ON_HOLD',
  'SUPPLIER_PENDING',
]);

export const isCancellable = (b: Booking): boolean => CANCELLABLE.has(b.status);

/** Terminal states. A booking here is never advanced by any worker. */
const TERMINAL: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  'CONFIRMED',
  'CANCELLED',
  'FAILED',
]);

export const isTerminal = (s: BookingStatus): boolean => TERMINAL.has(s);
