import { toMajor } from '../../domain/shared/money.js';
import type { RevalidationReport } from '../../domain/revalidation/revalidation-report.js';
import { legacyPricingBlock, type LegacyPricingBlock } from './legacy-pricing.js';

/**
 * LEGACY. The precheck response the existing frontend reads.
 *
 * **Expiry: deleted when the review page reads the canonical report.**
 *
 * The consumer gates on `status === 'success' || status === true ||
 * statusCode === 200` (`HotelReviewBooking.tsx`), unwraps `body`, and reads a
 * fresh net figure out of one of six differently-named fields — `totalNet`,
 * `tp`, `totalFare`, `BookingRate`, `totalnet`, `option.pricing.totalPrice`.
 * That list is the shape of the problem: six names for one number, and the page
 * comparing them by hand to decide whether the price moved.
 *
 * Here the decision is already made. `priceChanged` and `requiresConsent` are
 * computed server-side from the sealed quote, so the page renders a decision
 * rather than re-deriving one — and cannot reach a different answer from the
 * engine that will take the payment.
 */
export interface LegacyPrecheckResponse {
  readonly status: boolean;
  readonly statusCode: number;
  readonly body: {
    /** Kept for the consumer's own gate; the canonical answer is `outcome`. */
    readonly available: boolean;
    /** The number to charge, in the block the page's resolver understands. */
    readonly pricing?: LegacyPricingBlock;
    /** Six legacy aliases for one figure, all the same number, on purpose. */
    readonly totalNet?: number;
    readonly BookingRate?: number;
  };

  // ── Canonical, from day one ──────────────────────────────────────────────
  readonly dealId: string;
  /** `UNCHANGED`, `PRICE_INCREASED`, `ROOM_CHANGED`, `SOLD_OUT`, … */
  readonly outcome: string;
  /**
   * Whether the customer must approve before booking.
   *
   * The one field the review page should branch on. It is true for a price
   * increase beyond tolerance, any product substitution, and anything the
   * supplier declined to describe — see `unverified`.
   */
  readonly requiresConsent: boolean;
  readonly priceChanged?: {
    readonly from: number;
    readonly to: number;
    readonly currency: string;
  };
  /** Dimensions the supplier did not describe, so they could not be compared. */
  readonly unverified: readonly string[];
  readonly expiresAt?: string;
  readonly message?: string;
}

const MESSAGES: Readonly<Record<string, string>> = {
  DEAL_NOT_FOUND: 'this price is no longer held — please search again',
  SUPPLIER_UNAVAILABLE: 'we could not confirm this rate just now — please try again',
  INCOMPLETE: 'the supplier confirmed the room without a price — please try again',
  SOLD_OUT: 'this room has just been taken',
};

export function toLegacyPrecheckResponse(report: RevalidationReport): LegacyPrecheckResponse {
  const outcome = report.outcome?.kind ?? report.status;
  const chargeable = report.chargeable;

  const priced =
    chargeable !== null
      ? {
          pricing: legacyPricingBlock(chargeable),
          totalNet: toMajor(chargeable.total),
          BookingRate: toMajor(chargeable.total),
        }
      : {};

  const change =
    report.outcome !== undefined && 'from' in report.outcome && 'to' in report.outcome
      ? {
          priceChanged: {
            from: toMajor(report.outcome.from),
            to: toMajor(report.outcome.to),
            currency: String(report.outcome.to.currency),
          },
        }
      : {};

  return {
    // The consumer's success gate. A sold-out room or an expired deal is a
    // legitimate answer to the question asked, but it is not a green light,
    // and saying `true` here would let the page walk on to payment.
    status: report.status === 'REVALIDATED' && report.outcome?.kind !== 'SOLD_OUT',
    statusCode: report.status === 'DEAL_NOT_FOUND' ? 409 : 200,
    body: {
      available: report.outcome?.kind !== 'SOLD_OUT' && report.status === 'REVALIDATED',
      ...priced,
    },

    dealId: String(report.dealId),
    outcome,
    requiresConsent: report.requiresConsent,
    ...change,
    unverified: report.unverified,
    ...(report.expiresAt !== undefined ? { expiresAt: report.expiresAt.toISOString() } : {}),
    ...(MESSAGES[outcome] !== undefined ? { message: MESSAGES[outcome] as string } : {}),
  };
}
