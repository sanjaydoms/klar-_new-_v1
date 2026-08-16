import type { Money } from '../shared/money.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { Board } from '../rate/board.js';
import type { Room } from '../rate/room.js';
import type { CancellationTerms } from '../rate/cancellation.js';
import { cancellationFingerprint } from '../rate/cancellation.js';
import { invariant } from '../shared/errors.js';

/**
 * What changed between the price we quoted and the price the supplier will
 * honour.
 *
 * Modelled as a value rather than an exception because "the price went up" is a
 * normal outcome of an OTA flow, not an error: the product decides whether to
 * ask the customer to accept it.
 */
export type RevalidationOutcome =
  | { readonly kind: 'UNCHANGED'; readonly price: CustomerPrice }
  /** Supplier came back cheaper. The saving goes to the customer. */
  | { readonly kind: 'PRICE_DECREASED'; readonly from: Money; readonly to: Money; readonly price: CustomerPrice }
  /** Within tolerance — absorbed silently, no re-consent needed. */
  | { readonly kind: 'PRICE_INCREASED_WITHIN_TOLERANCE'; readonly from: Money; readonly to: Money; readonly price: CustomerPrice }
  /** Beyond tolerance — requires explicit customer confirmation. */
  | { readonly kind: 'PRICE_INCREASED'; readonly from: Money; readonly to: Money; readonly price: CustomerPrice }
  | { readonly kind: 'ROOM_CHANGED'; readonly expected: Room; readonly offered: Room }
  | { readonly kind: 'BOARD_CHANGED'; readonly expected: Board; readonly offered: Board }
  | { readonly kind: 'CANCELLATION_CHANGED'; readonly expected: CancellationTerms; readonly offered: CancellationTerms }
  | { readonly kind: 'SOLD_OUT' };

/**
 * How much of an increase may be absorbed without asking again.
 *
 * The larger of a flat floor and a percentage, so tiny stays are not derailed
 * by rounding and large ones are not silently inflated.
 */
export interface PriceTolerance {
  readonly fixedMinor: number;
  readonly percent: number;
}

export const DEFAULT_TOLERANCE: PriceTolerance = { fixedMinor: 1000, percent: 0.5 };

export function toleranceAmount(quoted: Money, t: PriceTolerance): number {
  return Math.max(t.fixedMinor, Math.round((quoted.minor * t.percent) / 100));
}

/**
 * Is the offered room a different room from the one that was quoted?
 *
 * Category alone is too coarse to be the whole test. `classifyRoom` returns
 * `UNKNOWN` for every name that misses its keyword list — "Garden View Room",
 * "King Room", "Family Room" — so a category-only check silently passed any
 * substitution between two such rooms, which is a large share of real
 * inventory. Comparing on category alone also passed "Deluxe King" → "Deluxe
 * Twin".
 *
 * The supplier's own room code is the strongest signal when both sides carry
 * one; otherwise the name, normalised so that spacing and case do not
 * manufacture a substitution that did not happen.
 */
export function roomsDiffer(expected: Room, offered: Room): boolean {
  if (expected.category !== offered.category) return true;
  if (expected.code !== undefined && offered.code !== undefined) {
    return expected.code.trim().toLowerCase() !== offered.code.trim().toLowerCase();
  }
  return normalizeRoomName(expected.name) !== normalizeRoomName(offered.name);
}

const normalizeRoomName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export interface RevalidationInput {
  readonly quoted: CustomerPrice;
  readonly fresh: CustomerPrice;
  readonly available: boolean;
  readonly expectedRoom: Room;
  readonly offeredRoom: Room;
  readonly expectedBoard: Board;
  readonly offeredBoard: Board;
  readonly expectedCancellation: CancellationTerms;
  readonly offeredCancellation: CancellationTerms;
  readonly tolerance?: PriceTolerance;
}

/**
 * Compare a quote against what the supplier will actually honour.
 *
 * Ordered by severity: a room substitution matters more than a price move, and
 * a sold-out room ends the flow regardless. Product substitutions are checked
 * before price so the customer is never asked to approve a higher price for a
 * room that also silently changed.
 */
export function revalidate(input: RevalidationInput): RevalidationOutcome {
  if (!input.available) return { kind: 'SOLD_OUT' };

  /**
   * A currency switch is not a price move, and there is no honest outcome to
   * report for one.
   *
   * `delta` is a raw subtraction of minor units, so quoting INR 11,500
   * (1,150,000 paise) and re-pricing at USD 140 (14,000 cents) read as a
   * 1,136,000-unit *decrease* — an outcome that proceeds without consent and
   * charges the fresh figure. `comparePrices` throws on exactly this rather than
   * comparing raw numbers; the last gate before a charge cannot be laxer than
   * the search that led to it.
   */
  invariant(
    input.quoted.currency === input.fresh.currency,
    'REVALIDATION_CURRENCY_MISMATCH',
    'A revalidated price must be in the currency it was quoted in',
    { quoted: input.quoted.currency, fresh: input.fresh.currency },
  );

  if (roomsDiffer(input.expectedRoom, input.offeredRoom)) {
    return { kind: 'ROOM_CHANGED', expected: input.expectedRoom, offered: input.offeredRoom };
  }
  if (input.expectedBoard.code !== input.offeredBoard.code) {
    return { kind: 'BOARD_CHANGED', expected: input.expectedBoard, offered: input.offeredBoard };
  }
  /**
   * Penalty amounts are compared only when the two sides cost the same.
   *
   * A supplier states its penalty as an absolute amount derived from the rate,
   * so a rate that re-prices restates its penalty too. Comparing the amounts
   * across a price change reports CANCELLATION_CHANGED — which is refused
   * outright — for what is really a price change, which the customer would have
   * been offered. When the cost has moved, the tier and the deadlines are still
   * compared exactly and the price move is reported on the next lines as itself.
   */
  const samePrice =
    input.quoted.supplierTotal.currency === input.fresh.supplierTotal.currency &&
    input.quoted.supplierTotal.minor === input.fresh.supplierTotal.minor;

  if (
    cancellationFingerprint(input.expectedCancellation, { includeAmounts: samePrice }) !==
    cancellationFingerprint(input.offeredCancellation, { includeAmounts: samePrice })
  ) {
    return {
      kind: 'CANCELLATION_CHANGED',
      expected: input.expectedCancellation,
      offered: input.offeredCancellation,
    };
  }

  const from = input.quoted.total;
  const to = input.fresh.total;
  const delta = to.minor - from.minor;

  if (delta === 0) return { kind: 'UNCHANGED', price: input.fresh };
  if (delta < 0) return { kind: 'PRICE_DECREASED', from, to, price: input.fresh };

  const allowed = toleranceAmount(from, input.tolerance ?? DEFAULT_TOLERANCE);
  return delta <= allowed
    ? { kind: 'PRICE_INCREASED_WITHIN_TOLERANCE', from, to, price: input.fresh }
    : { kind: 'PRICE_INCREASED', from, to, price: input.fresh };
}

/** Outcomes the flow may continue through without asking the customer again. */
export function canProceedWithoutConsent(o: RevalidationOutcome): boolean {
  return (
    o.kind === 'UNCHANGED' ||
    o.kind === 'PRICE_DECREASED' ||
    o.kind === 'PRICE_INCREASED_WITHIN_TOLERANCE'
  );
}

/**
 * The amount to charge after revalidation.
 *
 * Always the fresh figure. A decrease is passed on rather than pocketed — the
 * reference implementation did this too, and it is the right call: we were
 * going to be invoiced the lower amount either way.
 */
export function chargeableAfter(o: RevalidationOutcome): CustomerPrice | null {
  return 'price' in o ? o.price : null;
}
