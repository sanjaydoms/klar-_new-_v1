import { tripJackAdapter } from "../../adapters/tripjack.adapter";
import { BookingProvider } from "../../models/Booking.model";
import { bookingSupplierRegistry } from "../registry";
import { BookingSupplier, SupplierRef } from "../types";

const startsWithTJ = (v?: string) =>
  !!v && (v.startsWith("TJ") || v.startsWith("TG"));

export const tripJackBookingSupplier: BookingSupplier = {
  code: "TJ",
  dbProvider: BookingProvider.TRIPJACK,

  /**
   * The union of the five predicates this replaces (precheck.service,
   * commit.service, cancel.service ×2, amend.service), so no request that used
   * to reach TripJack stops reaching it.
   *
   * One deliberate behaviour change: a stored `provider` now DECIDES rather than
   * merely contributing. cancel.service used `payloadSaysTJ || dbSaysTJ`, which
   * would send a RateGain booking to TripJack's cancel API whenever the client
   * posted `type: "HOTEL"`. The record is ground truth for who actually holds
   * the reservation; a cross-supplier cancel could only ever fail at the supplier.
   */
  owns(ref: SupplierRef): boolean {
    if (ref.dbProvider) return ref.dbProvider === BookingProvider.TRIPJACK;
    if (ref.propertyId?.startsWith("TJ")) return true;
    if (startsWithTJ(ref.bookingId)) return true;
    if (startsWithTJ(ref.confirmationNumber)) return true;
    if (ref.payloadType === "HOTEL") return true;
    // A bookingId with no RateGain envelope is TripJack's unified payload shape.
    if (!ref.hasBookReservation && ref.bookingId) return true;
    return false;
  },

  adapter: tripJackAdapter,
};

bookingSupplierRegistry.register(tripJackBookingSupplier);
