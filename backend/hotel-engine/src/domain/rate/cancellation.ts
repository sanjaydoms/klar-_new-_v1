import type { Money } from '../shared/money.js';
import type { Tristate } from '../shared/tristate.js';

/**
 * One window of a cancellation policy: cancel from `from` onwards and this
 * penalty applies.
 */
export interface CancellationWindow {
  /** ISO instant the penalty starts applying. */
  readonly from: string;
  readonly penalty: Money;
}

/**
 * How refundable a rate is, as a comparison bucket.
 *
 * PARTIAL exists because "refundable" and "non-refundable" are not the whole
 * story: a rate that is free to cancel until tomorrow and 100% charged after is
 * not commercially the same product as one free until the day of arrival. The
 * tier participates in the equivalence class, so the two never compete on price
 * alone.
 */
export type RefundTier = 'REFUNDABLE' | 'PARTIALLY_REFUNDABLE' | 'NON_REFUNDABLE' | 'UNKNOWN';

export interface CancellationTerms {
  readonly refundable: Tristate;
  readonly tier: RefundTier;
  /** ISO instant free cancellation ends. Null when there is no free window. */
  readonly freeUntil: string | null;
  readonly windows: readonly CancellationWindow[];
  /** The supplier's own wording, when it gave one. Display only. */
  readonly notes?: string;
}

export const UNKNOWN_CANCELLATION: CancellationTerms = {
  refundable: 'UNKNOWN',
  tier: 'UNKNOWN',
  freeUntil: null,
  windows: [],
};

/**
 * Derive terms from normalised windows.
 *
 * Carried forward from the reference `deriveRefundable()`, which got the hard
 * part right: no signal means UNKNOWN, not "non-refundable". Where this differs
 * is that there is no boolean to read past — a caller that ignores the tier
 * still cannot render a false promise, because `refundable` is a Tristate.
 *
 * `explicit` is the supplier's own flag where it has one (TripJack); it wins,
 * because a supplier stating its own policy beats our inference from windows.
 */
export function deriveCancellationTerms(input: {
  explicit?: boolean;
  windows?: readonly CancellationWindow[];
  notes?: string;
}): CancellationTerms {
  const windows = [...(input.windows ?? [])].sort((a, b) => a.from.localeCompare(b.from));
  const firstPenalty = windows.find((w) => w.penalty.minor > 0);
  const freeWindow = windows.find((w) => w.penalty.minor === 0);
  const freeUntil = firstPenalty?.from ?? null;
  const notesPart = input.notes !== undefined ? { notes: input.notes } : {};

  if (input.explicit === true) {
    return {
      refundable: 'TRUE',
      tier: freeUntil ? 'REFUNDABLE' : 'PARTIALLY_REFUNDABLE',
      freeUntil,
      windows,
      ...notesPart,
    };
  }
  if (input.explicit === false) {
    return {
      refundable: 'FALSE',
      tier: 'NON_REFUNDABLE',
      freeUntil: null,
      windows,
      ...notesPart,
    };
  }

  if (windows.length > 0) {
    if (freeWindow) {
      return { refundable: 'TRUE', tier: 'REFUNDABLE', freeUntil, windows, ...notesPart };
    }
    return {
      refundable: 'FALSE',
      tier: 'NON_REFUNDABLE',
      freeUntil: null,
      windows,
      ...notesPart,
    };
  }

  if (input.notes && /non[-\s]?refundable/i.test(input.notes)) {
    return {
      refundable: 'FALSE',
      tier: 'NON_REFUNDABLE',
      freeUntil: null,
      windows: [],
      ...notesPart,
    };
  }

  return { ...UNKNOWN_CANCELLATION, ...notesPart };
}

/** Higher is better for the customer. Deterministic tiebreak only. */
const TIER_RANK: Readonly<Record<RefundTier, number>> = {
  REFUNDABLE: 3,
  PARTIALLY_REFUNDABLE: 2,
  NON_REFUNDABLE: 1,
  UNKNOWN: 0,
};

export const refundTierRank = (t: RefundTier): number => TIER_RANK[t];

/**
 * A cancellation-policy fingerprint, for detecting that the supplier changed
 * the terms between quote and book.
 *
 * It covers what the customer was promised — the tier, the deadline free
 * cancellation ends, and every penalty that can be charged after it — and
 * deliberately not the moment a FREE window began.
 *
 * That start is not a term of the policy. It is "you may cancel from now", and
 * suppliers stamp it differently on different calls: RateGain's `getproducts`
 * dates the free window from the instant it quoted (`09:08:12`) while its
 * `PreCheckReservation` dates the same policy from midnight. Including it made
 * every RateGain booking report CANCELLATION_CHANGED at the gate — a
 * substitution that never happened, blocking the booking one step before
 * payment.
 *
 * `includeAmounts` exists for the other half of that problem. Suppliers state
 * penalties as absolute amounts DERIVED from the price — RateGain's
 * non-refundable window is exactly `totalPrice` — so a rate that re-prices
 * comes back with its penalty restated, and comparing amounts reports a policy
 * change on every price change. Since a substitution is refused outright while
 * a price change is offered to the customer for consent, that turned every
 * price move on a non-refundable rate into a dead end. The caller passes
 * `false` when the two sides are priced differently; the tier and the deadlines
 * are still compared exactly, and the price move is reported as what it is.
 */
export function cancellationFingerprint(
  t: CancellationTerms,
  options: { readonly includeAmounts?: boolean } = {},
): string {
  const withAmounts = options.includeAmounts ?? true;
  const chargeable = t.windows
    .filter((w) => w.penalty.minor > 0)
    .map((w) => (withAmounts ? `${w.from}:${w.penalty.minor}${w.penalty.currency}` : w.from))
    .join(',');
  return `${t.tier}|${t.freeUntil ?? '-'}|${chargeable}`;
}
