import { SupplierAdapter } from "../models/PrecheckResult";
import { BookingProvider } from "../models/Booking.model";

/**
 * Everything the routing decision is allowed to look at.
 *
 * Before this existed, precheck/commit/cancel/amend each sniffed the payload
 * with their own hand-rolled predicate. The five disagreed — precheck matched
 * `"TJ:"` (with colon) where commit matched `"TJ"` (without), and only cancel
 * consulted the booking record — so the same booking could route to different
 * suppliers depending on which endpoint it entered through.
 */
export interface SupplierRef {
  propertyId?: string;
  bookingId?: string;
  confirmationNumber?: string;
  /** `Booking.provider` from the stored record. Authoritative when present. */
  dbProvider?: BookingProvider | string | null;
  /** `payload.type` — "HOTEL" on TripJack's unified booking payload. */
  payloadType?: string;
  /** True when the payload is RateGain-shaped (`{ BookReservation: … }`). */
  hasBookReservation?: boolean;
}

/**
 * A supplier registered in the booking-service supplier registry.
 * Reuses the existing `SupplierAdapter` contract from models/PrecheckResult.ts
 * (precheck/commit/cancel/pollStatus) — nothing new is invented here.
 *
 * SCOPE NOTE: this registry decides WHICH supplier handles a request. The
 * per-supplier commit/cancel FLOWS still live in commit.service.ts and
 * cancel.service.ts, because they differ in more than the supplier call
 * (payload shape, payment sequencing, what gets persisted). Adding a third
 * supplier means registering it here — which is the only place routing is
 * decided — plus a branch in each of those two flows.
 */
export interface BookingSupplier {
  /** Short code, e.g. "RG" | "TJ". */
  code: string;
  /** The `Booking.provider` value this supplier writes and is matched on. */
  dbProvider: BookingProvider;
  /**
   * True if this supplier owns the referenced booking.
   *
   * Checked in registration order, first match wins, so a supplier may act as
   * the catch-all default by always returning true (see rategain/index.ts) —
   * and must therefore be registered last.
   */
  owns(ref: SupplierRef): boolean;
  adapter: SupplierAdapter;
}
