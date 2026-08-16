import type { DealId, SupplierCode } from '../shared/brand.js';
import type { CustomerPrice } from '../pricing/customer-price.js';
import type { SupplierAttempt } from '../search/result.js';
import type { RevalidationOutcome } from './revalidation.js';

/**
 * What happened when we asked the supplier to honour a quote.
 *
 * `revalidate()` answers a narrower question — given an expected offer and a
 * fresh one, what changed — and it can only be asked when both sides are
 * complete. This type covers the rest: the deal may have expired, the supplier
 * may not have answered, or it may have answered without saying enough to
 * compare. Each of those is a distinct thing to tell a customer, and collapsing
 * them into "unavailable" is how a transient supplier error becomes a lost
 * booking.
 */
export type RevalidationStatus =
  /** The supplier answered and `outcome` says what changed. */
  | 'REVALIDATED'
  /** Unknown or expired `dealId`. Indistinguishable by design — search again. */
  | 'DEAL_NOT_FOUND'
  /** The supplier could not be asked, or refused to answer. */
  | 'SUPPLIER_UNAVAILABLE'
  /**
   * The supplier says the rate is available but did not quote a price for it.
   *
   * Blocking, deliberately: there is nothing to charge and nothing to compare.
   * Treating a missing price as "unchanged" would bill the customer the old
   * number on a supplier's say-so that it never gave.
   */
  | 'INCOMPLETE';

export interface RevalidationReport {
  readonly status: RevalidationStatus;
  readonly dealId: DealId;
  readonly supplier?: SupplierCode;

  /** Present only when `status` is `REVALIDATED`. */
  readonly outcome?: RevalidationOutcome;

  /**
   * What to charge if the flow continues. `null` when there is nothing to
   * charge — sold out, expired, or the supplier did not price it.
   */
  readonly chargeable: CustomerPrice | null;

  /**
   * Whether the customer must be asked again before booking.
   *
   * The product decision, made once, here: a price that went UP beyond
   * tolerance, a room, board or cancellation substitution, or anything we could
   * not verify. A decrease never needs consent — the saving is passed on.
   */
  readonly requiresConsent: boolean;

  /**
   * Dimensions the supplier did not describe, so they could not be compared.
   *
   * Reported rather than assumed equal. A precheck that quietly treats an
   * unstated room as the expected one is the C-2 failure at the booking gate:
   * the customer approves a price for a room that silently changed.
   */
  readonly unverified: readonly ('room' | 'board' | 'cancellation')[];

  /** When the quote stops being resolvable at all. */
  readonly expiresAt?: Date;
  readonly attempt?: SupplierAttempt;
  readonly durationMs: number;
}

/** Outcomes that may proceed straight to booking with no further consent. */
export function proceedsWithoutConsent(report: RevalidationReport): boolean {
  return report.status === 'REVALIDATED' && !report.requiresConsent;
}
