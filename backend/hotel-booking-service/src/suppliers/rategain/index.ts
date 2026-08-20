import { rateGainAdapter } from "../../adapters/rategain.adapter";
import { BookingProvider } from "../../models/Booking.model";
import { bookingSupplierRegistry } from "../registry";
import { BookingSupplier, SupplierRef } from "../types";

export const rateGainBookingSupplier: BookingSupplier = {
  code: "RG",
  dbProvider: BookingProvider.RATEGAIN,

  /**
   * Catch-all default, mirroring the `else → RateGain` fallback every call site
   * used before the registry existed. MUST stay registered last (see
   * suppliers/index.ts) so specific predicates are checked first.
   */
  owns: (ref) =>
    ref.dbProvider ? ref.dbProvider === BookingProvider.RATEGAIN : true,

  adapter: rateGainAdapter,
};

bookingSupplierRegistry.register(rateGainBookingSupplier);
