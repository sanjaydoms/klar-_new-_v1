import { BookingSupplier, SupplierRef } from "./types";

class BookingSupplierRegistry {
  private suppliers: BookingSupplier[] = [];

  /** Called once per supplier at module-load time (see each suppliers/<name>/index.ts). */
  register(supplier: BookingSupplier): void {
    this.suppliers.push(supplier);
  }

  all(): BookingSupplier[] {
    return this.suppliers;
  }

  getByCode(code: string): BookingSupplier | undefined {
    return this.suppliers.find((s) => s.code === code);
  }

  /**
   * The single routing decision for the whole service: which supplier owns this
   * booking. Checks suppliers in registration order and returns the FIRST match,
   * so a catch-all supplier must be registered last (see suppliers/index.ts).
   *
   * Throws rather than guessing. With RateGain registered as the catch-all this
   * cannot fire today, but it is what stops a future supplier's booking from
   * being silently committed or cancelled against RateGain if someone registers
   * it after the catch-all.
   */
  resolve(ref: SupplierRef): BookingSupplier {
    const match = this.suppliers.find((s) => s.owns(ref));
    if (!match) {
      throw new Error(
        `No supplier owns this booking (propertyId=${ref.propertyId ?? ""}, ` +
          `bookingId=${ref.bookingId ?? ""}, confirmationNumber=${ref.confirmationNumber ?? ""}, ` +
          `provider=${ref.dbProvider ?? ""})`,
      );
    }
    return match;
  }
}

export const bookingSupplierRegistry = new BookingSupplierRegistry();
