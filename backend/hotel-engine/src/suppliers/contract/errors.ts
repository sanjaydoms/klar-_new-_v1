/**
 * Normalised supplier failures.
 *
 * Two rules, both from the teardown:
 *
 *  - A supplier's raw response never reaches a customer. The reference
 *    products controller returned `body: error.response?.data` verbatim (D-15),
 *    handing the browser a supplier's error envelope.
 *  - A failure is a value, not a thrown exception. The orchestrator must be able
 *    to record that RateGain timed out and still return TripJack's results;
 *    exceptions crossing the adapter boundary is how failures got swallowed
 *    into `console.error` in the first place (D-8).
 */
export type SupplierErrorCode =
  /** Did not answer inside its budget. */
  | 'SUPPLIER_TIMEOUT'
  /** Deliberately cancelled — the search deadline passed. Not a supplier fault. */
  | 'SUPPLIER_CANCELLED'
  /** Breaker is open after repeated failures. */
  | 'SUPPLIER_CIRCUIT_OPEN'
  | 'SUPPLIER_RATE_LIMITED'
  | 'SUPPLIER_AUTH_FAILED'
  /** We sent something the supplier rejected. Our bug, not theirs. */
  | 'SUPPLIER_BAD_REQUEST'
  | 'SUPPLIER_UNAVAILABLE'
  /** Answered, but not in a shape we can map. */
  | 'SUPPLIER_MALFORMED_RESPONSE'
  /** Answered correctly: nothing available. Not an error at the search level. */
  | 'SUPPLIER_NO_AVAILABILITY'
  /** The specific rate is gone — the usual precheck outcome. */
  | 'SUPPLIER_RATE_EXPIRED'
  | 'SUPPLIER_PRICE_CHANGED'
  | 'SUPPLIER_SOLD_OUT'
  | 'SUPPLIER_UNKNOWN_ERROR';

export interface NormalizedSupplierError {
  readonly code: SupplierErrorCode;
  /** For our logs and dashboards. Never rendered to a customer. */
  readonly message: string;
  readonly retryable: boolean;
  /** The supplier's own code, for correlating with their support. Internal. */
  readonly supplierCode?: string;
  readonly httpStatus?: number;
}

const RETRYABLE: ReadonlySet<SupplierErrorCode> = new Set<SupplierErrorCode>([
  'SUPPLIER_TIMEOUT',
  'SUPPLIER_RATE_LIMITED',
  'SUPPLIER_UNAVAILABLE',
  'SUPPLIER_UNKNOWN_ERROR',
]);

export function supplierError(
  code: SupplierErrorCode,
  message: string,
  extra: { supplierCode?: string; httpStatus?: number } = {},
): NormalizedSupplierError {
  return {
    code,
    message,
    retryable: RETRYABLE.has(code),
    ...(extra.supplierCode !== undefined ? { supplierCode: extra.supplierCode } : {}),
    ...(extra.httpStatus !== undefined ? { httpStatus: extra.httpStatus } : {}),
  };
}

/**
 * Should the circuit breaker count this against the supplier?
 *
 * A cancellation is our own doing, and a rate expiring or selling out is the
 * supplier working correctly. Counting either would open breakers on healthy
 * feeds during a busy period — worse than the failure it guards against.
 */
export function countsAgainstBreaker(code: SupplierErrorCode): boolean {
  switch (code) {
    case 'SUPPLIER_CANCELLED':
    case 'SUPPLIER_NO_AVAILABILITY':
    case 'SUPPLIER_RATE_EXPIRED':
    case 'SUPPLIER_PRICE_CHANGED':
    case 'SUPPLIER_SOLD_OUT':
    case 'SUPPLIER_BAD_REQUEST':
      return false;
    default:
      return true;
  }
}

/**
 * After a failed commit, could the supplier still be holding a booking?
 *
 * The question every write has to answer and no read has to ask. A commit that
 * times out, that answers 500, or that answers in a shape we cannot parse has
 * very often *succeeded* — the room is held, the hotel has the reservation and
 * the invoice will follow. Reporting that as FAILED refunds the customer, tells
 * them nothing was booked, and leaves KLAR paying for a room nobody will sleep
 * in.
 *
 * So the safe direction is not "assume failure". It is **assume unknown**, which
 * routes the booking to reconciliation instead of to a refund. `false` is
 * returned only for outcomes that prove the supplier never accepted the request:
 * a breaker that never let it out, a credential it rejected, a payload it
 * refused, a rate it says is gone.
 *
 * `SUPPLIER_CANCELLED` is deliberately on the unknown side. It covers both "the
 * deadline passed before we called" and "we aborted a call already in flight",
 * and the two are indistinguishable here — so it is treated as the more
 * expensive of the two.
 */
export function mayHaveBooked(code: SupplierErrorCode): boolean {
  switch (code) {
    case 'SUPPLIER_CIRCUIT_OPEN':
    case 'SUPPLIER_AUTH_FAILED':
    case 'SUPPLIER_BAD_REQUEST':
    case 'SUPPLIER_RATE_LIMITED':
    case 'SUPPLIER_NO_AVAILABILITY':
    case 'SUPPLIER_RATE_EXPIRED':
    case 'SUPPLIER_PRICE_CHANGED':
    case 'SUPPLIER_SOLD_OUT':
      return false;
    default:
      return true;
  }
}

/**
 * Customer-safe messages. Deliberately vague about which supplier failed and
 * why — that is our operational detail, not the traveller's problem.
 */
const CUSTOMER_MESSAGE: Readonly<Record<SupplierErrorCode, string>> = {
  SUPPLIER_TIMEOUT: 'Some results are still loading. Please try again in a moment.',
  SUPPLIER_CANCELLED: 'Some results are still loading. Please try again in a moment.',
  SUPPLIER_CIRCUIT_OPEN: 'Some results are temporarily unavailable.',
  SUPPLIER_RATE_LIMITED: 'We are busy right now. Please try again in a moment.',
  SUPPLIER_AUTH_FAILED: 'We could not complete this request. Please contact support.',
  SUPPLIER_BAD_REQUEST: 'We could not complete this request. Please contact support.',
  SUPPLIER_UNAVAILABLE: 'Some results are temporarily unavailable.',
  SUPPLIER_MALFORMED_RESPONSE: 'We could not complete this request. Please contact support.',
  SUPPLIER_NO_AVAILABILITY: 'No rooms are available for these dates.',
  SUPPLIER_RATE_EXPIRED: 'This rate is no longer available. Please search again for current prices.',
  SUPPLIER_PRICE_CHANGED: 'The price for this room has changed. Please review it before booking.',
  SUPPLIER_SOLD_OUT: 'This room has just sold out. Please choose another.',
  SUPPLIER_UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export const customerMessageFor = (code: SupplierErrorCode): string =>
  CUSTOMER_MESSAGE[code];
