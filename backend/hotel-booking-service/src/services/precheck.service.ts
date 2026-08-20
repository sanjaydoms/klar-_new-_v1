import { rateGainProvider } from "../providers/rategain.provider";
import { tripJackProvider } from "../providers/tripjack.provider";
import { bookingSupplierRegistry } from "../suppliers";

class PrecheckService {
  async precheck(payload: any) {
    const propertyId: string =
      payload.propertyId ||
      payload.PropertyId ||
      payload.BookReservation?.propertyID ||
      "";

    // Routing lives in suppliers/ — this used to match "TJ:" while commit.service
    // matched "TJ", so a propertyId without the colon precheck'd against RateGain
    // and then committed against TripJack.
    const supplier = bookingSupplierRegistry.resolve({
      propertyId,
      bookingId: payload.bookingId,
      payloadType: payload.type,
      hasBookReservation: !!payload.BookReservation,
    });

    if (supplier.code === "TJ") {
      // TripJack Review flow.
      // Frontend might wrap in BookReservation (RateGain style)
      const tjPayload = payload.BookReservation || payload;
      console.log(
        "[TripJack Precheck] Raw payload received:",
        JSON.stringify(payload, null, 2),
      );
      console.log(
        "[TripJack Precheck] Unwrapped payload to provider:",
        JSON.stringify(tjPayload, null, 2),
      );
      return tripJackProvider.precheck(tjPayload);
    }

    // Default: RateGain PreCheckReservation
    return rateGainProvider.precheck(payload);
  }
}

export const precheckService = new PrecheckService();
