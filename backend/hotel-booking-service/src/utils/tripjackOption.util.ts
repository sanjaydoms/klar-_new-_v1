/**
 * A TripJack hotel Review response has carried three different shapes across
 * versions: v2 `hotel.ops[]`, the booking-details style `hInfo.ops[]`, and v3's
 * singular `option`.
 *
 * The adapter already tolerated all three; the agent pricing endpoint understood
 * only `hotel.ops[0]`, so a genuine v3 response made it answer 502 "Could not
 * fetch live price from provider". One definition, used by both.
 */
export function extractTripJackOption(body: any): any | null {
  return body?.hotel?.ops?.[0] ?? body?.option ?? body?.hInfo?.ops?.[0] ?? null;
}

/** Total price for an option, whichever shape it arrived in. */
export function optionTotalPrice(option: any): number {
  return Number(option?.tp ?? option?.pricing?.totalPrice ?? option?.totalPrice ?? 0);
}

/** Base price, falling back to total minus the management fees when absent. */
export function optionBasePrice(option: any): number {
  const explicit = Number(option?.bf ?? option?.pricing?.basePrice ?? 0);
  if (explicit > 0) return explicit;

  const total = optionTotalPrice(option);
  const mf = Number(option?.mf ?? option?.pricing?.mf ?? 0);
  const mft = Number(option?.mft ?? option?.pricing?.mft ?? 0);
  return total - mf - mft;
}

/** Management fee and its tax, as separate line items (v3 requires showing both). */
export function optionFees(option: any): { mf: number; mft: number } {
  return {
    mf: Number(option?.mf ?? option?.pricing?.mf ?? 0),
    mft: Number(option?.mft ?? option?.pricing?.mft ?? 0),
  };
}
