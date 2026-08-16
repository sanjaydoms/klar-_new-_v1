import type { Money } from '../shared/money.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { RevalidationReport } from '../revalidation/revalidation-report.js';
import { canProceedWithoutConsent } from '../revalidation/revalidation.js';
import type { Booking, BookingStatus, RefundKind, RefundMethod, RefundRecord } from './booking.js';

/**
 * Whether a commit may go ahead, decided from the revalidation report and
 * nothing else.
 *
 * **The client never sends a price.** The reference took `payload.sellingRate`
 * from the browser and defended it with a server-side `b2cPriceFloor` so that a
 * tampered-low figure could not book at cost — a guard that only exists because
 * the number arrived from somewhere it should not have. Here the amount comes
 * from the sealed quote and the fresh supplier cost, so there is no client-
 * supplied price to floor. What the client may send is *consent*: agreement to a
 * figure the server computed and showed.
 */

/**
 * The customer's answer to "the price changed — do you still want it?".
 *
 * `acceptedTotal` is a ceiling, not an equality: the supplier may move again
 * between the review page and the commit, and a customer who agreed to pay
 * 12,400 has plainly agreed to pay 12,100. Anything above it is a new question
 * and gets asked again.
 */
export interface CommitConsent {
  readonly acceptedTotal: Money;
  readonly acceptedAt: Date;
  /**
   * Dimensions the customer was told could not be confirmed, and accepted
   * regardless.
   *
   * Separate from the price, because they are a different question. A supplier
   * that does not restate the cancellation policy at precheck has not agreed to
   * the one we quoted, and "you may not be able to cancel this" is not something
   * a price acceptance can be read as covering.
   */
  readonly acknowledgedUnverified?: readonly ('room' | 'board' | 'cancellation')[];
}

export type CommitRefusal =
  /** The deal expired, or was never ours. */
  | 'DEAL_NOT_FOUND'
  | 'SUPPLIER_UNAVAILABLE'
  /** The supplier answered but did not say enough to commit against. */
  | 'INCOMPLETE'
  | 'SOLD_OUT'
  /**
   * The supplier offered a different product.
   *
   * Deliberately not consentable. A price consent is agreement to a number for
   * the room that was chosen; a different room, board or cancellation policy is
   * a different product, and the honest answer is to show what is actually
   * available rather than to ask "will you take this instead?" against a
   * substitution the customer never saw. The reference had a
   * `STRICT_ROOM_VALIDATION=false` switch that downgraded exactly this to a
   * warning.
   */
  | 'ROOM_CHANGED'
  | 'BOARD_CHANGED'
  | 'CANCELLATION_CHANGED';

export type CommitDecision =
  /** Go ahead, and charge exactly this. */
  | { readonly kind: 'PROCEED'; readonly chargeable: CustomerPrice }
  /**
   * Ask the customer, then commit again carrying their answer. The other half
   * of the price-change contract: precheck reports, commit enforces.
   */
  | {
      readonly kind: 'CONSENT_REQUIRED';
      readonly chargeable: CustomerPrice;
      readonly unverified: readonly ('room' | 'board' | 'cancellation')[];
    }
  | { readonly kind: 'REFUSED'; readonly reason: CommitRefusal };

export function decideCommit(
  report: RevalidationReport,
  consent?: CommitConsent,
): CommitDecision {
  if (report.status === 'DEAL_NOT_FOUND') return refuse('DEAL_NOT_FOUND');
  if (report.status === 'SUPPLIER_UNAVAILABLE') return refuse('SUPPLIER_UNAVAILABLE');
  if (report.status === 'INCOMPLETE') return refuse('INCOMPLETE');

  const outcome = report.outcome;
  if (outcome === undefined) return refuse('INCOMPLETE');

  switch (outcome.kind) {
    case 'SOLD_OUT':
      return refuse('SOLD_OUT');
    case 'ROOM_CHANGED':
      return refuse('ROOM_CHANGED');
    case 'BOARD_CHANGED':
      return refuse('BOARD_CHANGED');
    case 'CANCELLATION_CHANGED':
      return refuse('CANCELLATION_CHANGED');
    default:
      break;
  }

  const chargeable = report.chargeable;
  // Every remaining outcome carries a price; a report that says otherwise is
  // internally inconsistent and must not be charged against.
  if (chargeable === null) return refuse('INCOMPLETE');

  const outstanding = report.unverified.filter(
    (dimension) => !(consent?.acknowledgedUnverified ?? []).includes(dimension),
  );
  if (outstanding.length > 0) {
    return { kind: 'CONSENT_REQUIRED', chargeable, unverified: outstanding };
  }

  if (canProceedWithoutConsent(outcome)) {
    return { kind: 'PROCEED', chargeable };
  }

  /**
   * Checked against the FRESH figure, not the one the earlier precheck showed.
   *
   * The consent is a fact about a number the customer saw; the charge is a fact
   * about what the supplier will honour now. Comparing the consent against
   * itself — "did they accept the figure they accepted?" — would let a price
   * that moved again between the review page and the commit be charged on the
   * strength of an approval for a smaller one.
   */
  if (
    consent !== undefined &&
    consent.acceptedTotal.currency === chargeable.total.currency &&
    chargeable.total.minor <= consent.acceptedTotal.minor
  ) {
    return { kind: 'PROCEED', chargeable };
  }

  return { kind: 'CONSENT_REQUIRED', chargeable, unverified: [] };
}

const refuse = (reason: CommitRefusal): CommitDecision => ({ kind: 'REFUSED', reason });

// ── Booking state ───────────────────────────────────────────────────────────

/**
 * Which status may follow which.
 *
 * Written down because a booking's status decides whether money moves: a worker
 * that advances a CANCELLED booking to CONFIRMED, or a poller that revives a
 * FAILED one after its refund has been paid, costs the price of a room. The
 * reference had ten statuses, no transition table, and three separate writers.
 */
const TRANSITIONS: Readonly<Record<BookingStatus, readonly BookingStatus[]>> = {
  DRAFT: ['PRECHECK_PASSED', 'FAILED'],
  PRECHECK_PASSED: ['PAYMENT_HELD', 'FAILED'],
  PAYMENT_HELD: ['SUPPLIER_PENDING', 'CONFIRMED', 'ON_HOLD', 'FAILED', 'MANUAL_REVIEW'],
  SUPPLIER_PENDING: ['CONFIRMED', 'ON_HOLD', 'FAILED', 'MANUAL_REVIEW', 'CANCELLATION_PENDING'],
  ON_HOLD: ['CONFIRMED', 'CANCELLATION_PENDING', 'CANCELLED', 'FAILED'],
  CONFIRMED: ['CANCELLATION_PENDING', 'CANCELLED'],
  // A refused cancellation puts the booking back where it was, which is not
  // always CONFIRMED — it may still have been on hold or unsettled.
  CANCELLATION_PENDING: ['CANCELLED', 'CONFIRMED', 'ON_HOLD', 'SUPPLIER_PENDING', 'MANUAL_REVIEW'],
  MANUAL_REVIEW: ['CONFIRMED', 'CANCELLED', 'FAILED'],
  CANCELLED: [],
  FAILED: [],
};

export const canTransition = (from: BookingStatus, to: BookingStatus): boolean =>
  from === to || (TRANSITIONS[from] ?? []).includes(to);

// ── Refunds ─────────────────────────────────────────────────────────────────

export interface RefundRequest {
  readonly kind: RefundKind;
  readonly method: RefundMethod;
  readonly amount: Money;
  /** Ties the refund to the thing that caused it, so it can be reconciled. */
  readonly referenceId: string;
  readonly reason?: string;
  readonly now: Date;
}

/**
 * What to give back after a cancellation the supplier accepted.
 *
 * The penalty arrives as a supplier COST — what KLAR will be invoiced — and is
 * passed through to the customer at face value. That under-recovers our own
 * margin on a cancelled booking and never over-charges the traveller, which is
 * the right way round for a number nobody has agreed to.
 *
 * A penalty in another currency is not converted. An FX rate picked at refund
 * time is a rate nobody quoted, and applying one would deduct an amount that
 * cannot be reconciled against either the charge or the invoice. It goes to a
 * human instead.
 */
export function refundAfterCancellation(
  captured: Money,
  penalty?: Money,
): { readonly amount: Money; readonly needsReview: boolean } {
  if (penalty === undefined || penalty.minor <= 0) return { amount: captured, needsReview: false };
  if (penalty.currency !== captured.currency) return { amount: captured, needsReview: true };

  return {
    amount: {
      minor: Math.max(0, captured.minor - penalty.minor),
      currency: captured.currency,
    },
    // A penalty at or above what was charged leaves nothing to return, which is
    // a legitimate outcome of a non-refundable rate and not an error.
    needsReview: false,
  };
}

export type RefundClaim =
  | { readonly ok: true; readonly record: RefundRecord }
  /** Someone else already owns this refund. Doing nothing is the correct action. */
  | { readonly ok: false; readonly reason: 'ALREADY_CLAIMED' | 'NOTHING_WAS_PAID' };

/**
 * Claim the right to move money for this booking, exactly once.
 *
 * A failed booking is discovered by whoever gets there first — the request that
 * made it, the status poller, or the reconciliation worker — and all three will
 * try to make the customer whole. The record is the claim: only the caller who
 * moves it out of `NONE` may pay, so the refund happens once no matter how many
 * paths find the same booking. Carried forward from the reference, which got
 * this right and is the reason it is stated here rather than rediscovered.
 */
export function claimRefund(
  // Narrowed to what the decision actually reads: a claim is about money paid
  // and money already being returned, and nothing else about the booking.
  booking: Pick<Booking, 'payment' | 'refund'>,
  request: RefundRequest,
): RefundClaim {
  if (booking.payment === undefined) return { ok: false, reason: 'NOTHING_WAS_PAID' };

  const existing = booking.refund;
  if (existing !== undefined && existing.status !== 'NONE' && existing.status !== 'FAILED') {
    // FAILED is retryable — a refund that could not be paid still has to be. Any
    // other non-NONE state means another path owns it.
    return { ok: false, reason: 'ALREADY_CLAIMED' };
  }

  return {
    ok: true,
    record: {
      kind: request.kind,
      status: 'PROCESSING',
      method: request.method,
      amount: request.amount,
      referenceId: request.referenceId,
      ...(request.reason !== undefined ? { reason: request.reason } : {}),
      attemptedAt: request.now,
    },
  };
}
