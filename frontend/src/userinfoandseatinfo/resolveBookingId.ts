/**
 * Which booking the confirmation screen is about, in order of trustworthiness.
 *
 * The third source is the one that matters. The confirmation page is navigated to
 * with router state ONLY — BeforeBookingConfirmation.tsx:1008-1020 passes no query
 * string — and router state does not survive a reload. So one refresh left the id
 * undefined and the customer was told to "provide a valid booking ID", on the
 * screen that confirms their money went somewhere.
 *
 * `sessionStorage.bookingId` is not a guess at the right value: the payment step
 * resolves `finalBookingId` from exactly that key
 * (BeforeBookingConfirmation.tsx:781) and then passes it as the router state read
 * above — same id, same source. The mobile flow already reads it this way
 * (MobilePaymentPage.tsx:459).
 *
 * Order matters: an explicit link or a fresh navigation must beat whatever this
 * tab happens to have booked last, or a shared confirmation link would show the
 * recipient their own previous booking.
 */
export function resolveBookingId(
  searchParams: Pick<URLSearchParams, 'get'>,
  routerState: unknown,
): string | undefined {
  const fromState = (routerState as { bookingId?: unknown } | null)?.bookingId;

  const candidates = [
    searchParams.get('bookingId'),
    typeof fromState === 'string' ? fromState : undefined,
    safeSessionRead('bookingId'),
  ];

  return candidates.find((value): value is string => !!value && value.trim().length > 0);
}

/** sessionStorage throws in some privacy modes; a missing id is not worth a crash. */
function safeSessionRead(key: string): string | undefined {
  try {
    return sessionStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}
