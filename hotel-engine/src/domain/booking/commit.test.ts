import { describe, expect, it } from 'vitest';
import { currencyCode, dealId, supplierCode } from '../shared/brand.js';
import { money } from '../shared/money.js';
import { classifyBoard } from '../rate/board.js';
import { room } from '../rate/room.js';
import { deriveCancellationTerms } from '../rate/cancellation.js';
import { supplierCostFromTotal } from '../pricing/supplier-cost.js';
import { priceFromCost } from '../pricing/customer-price.js';
import type { RevalidationReport } from '../revalidation/revalidation-report.js';
import type { Booking } from './booking.js';
import { canTransition, claimRefund, decideCommit, type CommitConsent } from './commit.js';

const INR = currencyCode('INR');
const USD = currencyCode('USD');
const TJ = supplierCode('TJ');
const rs = (r: number) => money(Math.round(r * 100), INR);

const price = (rupees: number, currency = INR) =>
  priceFromCost(
    supplierCostFromTotal({
      total: money(Math.round(rupees * 100), currency),
      taxesIncludedInBase: true,
    }),
    { region: 'ALL', channel: 'B2C', rules: [], nights: 3, supplier: TJ },
  );

const report = (over: Partial<RevalidationReport> = {}): RevalidationReport => ({
  status: 'REVALIDATED',
  dealId: dealId('DEAL-1'),
  supplier: TJ,
  outcome: { kind: 'UNCHANGED', price: price(11_800) },
  chargeable: price(11_800),
  requiresConsent: false,
  unverified: [],
  durationMs: 12,
  ...over,
});

describe('the commit decision', () => {
  it('proceeds on an unchanged quote', () => {
    const decision = decideCommit(report());
    expect(decision.kind).toBe('PROCEED');
    if (decision.kind === 'PROCEED') expect(decision.chargeable.total.minor).toBe(1_180_000);
  });

  it('proceeds on a decrease, at the lower figure', () => {
    const decision = decideCommit(
      report({
        outcome: {
          kind: 'PRICE_DECREASED',
          from: rs(11_800),
          to: rs(11_000),
          price: price(11_000),
        },
        chargeable: price(11_000),
      }),
    );
    expect(decision.kind).toBe('PROCEED');
    if (decision.kind === 'PROCEED') expect(decision.chargeable.total.minor).toBe(1_100_000);
  });

  it('proceeds on a rise inside tolerance without asking', () => {
    const decision = decideCommit(
      report({
        outcome: {
          kind: 'PRICE_INCREASED_WITHIN_TOLERANCE',
          from: rs(11_800),
          to: rs(11_850),
          price: price(11_850),
        },
        chargeable: price(11_850),
      }),
    );
    expect(decision.kind).toBe('PROCEED');
  });

  describe('a rise beyond tolerance', () => {
    const increased = report({
      outcome: {
        kind: 'PRICE_INCREASED',
        from: rs(11_800),
        to: rs(12_400),
        price: price(12_400),
      },
      chargeable: price(12_400),
      requiresConsent: true,
    });

    it('is refused without consent', () => {
      const decision = decideCommit(increased);
      expect(decision.kind).toBe('CONSENT_REQUIRED');
      if (decision.kind === 'CONSENT_REQUIRED') {
        expect(decision.chargeable.total.minor).toBe(1_240_000);
      }
    });

    it('proceeds once the customer has accepted that figure', () => {
      const consent: CommitConsent = {
        acceptedTotal: rs(12_400),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
      };
      expect(decideCommit(increased, consent).kind).toBe('PROCEED');
    });

    /**
     * The consent is checked against what the supplier will honour NOW, not
     * against the figure that produced it. Comparing the consent with itself
     * would let a price that moved again between the review page and the commit
     * be charged on the strength of an approval for a smaller one.
     */
    it('asks again when the price moved further after the customer accepted', () => {
      const consent: CommitConsent = {
        acceptedTotal: rs(12_400),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
      };
      const movedAgain = report({
        outcome: {
          kind: 'PRICE_INCREASED',
          from: rs(11_800),
          to: rs(12_900),
          price: price(12_900),
        },
        chargeable: price(12_900),
        requiresConsent: true,
      });
      expect(decideCommit(movedAgain, consent).kind).toBe('CONSENT_REQUIRED');
    });

    it('treats the accepted figure as a ceiling, not an equality', () => {
      // Agreeing to pay 12,400 is plainly agreement to pay 12,100.
      const consent: CommitConsent = {
        acceptedTotal: rs(12_400),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
      };
      const cheaper = report({
        outcome: {
          kind: 'PRICE_INCREASED',
          from: rs(11_800),
          to: rs(12_100),
          price: price(12_100),
        },
        chargeable: price(12_100),
        requiresConsent: true,
      });
      expect(decideCommit(cheaper, consent).kind).toBe('PROCEED');
    });

    /**
     * C-1 at the commit gate. A consent of 12,400 INR against a charge of 140
     * USD compares 1,240,000 minor units with 14,000 and reads as an enormous
     * saving — proceeding, and charging dollars for a rupee agreement.
     */
    it('does not read a consent in one currency as covering another', () => {
      const consent: CommitConsent = {
        acceptedTotal: rs(12_400),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
      };
      const inDollars = report({
        outcome: {
          kind: 'PRICE_INCREASED',
          from: money(1_180_000, INR),
          to: money(14_000, USD),
          price: price(140, USD),
        },
        chargeable: price(140, USD),
        requiresConsent: true,
      });
      expect(decideCommit(inDollars, consent).kind).toBe('CONSENT_REQUIRED');
    });
  });

  describe('a substituted product', () => {
    /**
     * Not consentable at any price. The reference had a
     * `STRICT_ROOM_VALIDATION=false` switch that downgraded this to a warning,
     * and a customer who agreed to a number for a Deluxe King has not agreed to
     * a Deluxe Twin at the same number.
     */
    it.each([
      ['ROOM_CHANGED', { kind: 'ROOM_CHANGED', expected: room({ name: 'Deluxe King' }), offered: room({ name: 'Deluxe Twin' }) }],
      ['BOARD_CHANGED', { kind: 'BOARD_CHANGED', expected: classifyBoard('Breakfast'), offered: classifyBoard('Room Only') }],
      ['CANCELLATION_CHANGED', {
        kind: 'CANCELLATION_CHANGED',
        expected: deriveCancellationTerms({ explicit: true }),
        offered: deriveCancellationTerms({ explicit: false }),
      }],
    ] as const)('refuses %s even with consent to the price', (reason, outcome) => {
      const consent: CommitConsent = {
        acceptedTotal: rs(99_999),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
      };
      const decision = decideCommit(
        report({ outcome, requiresConsent: true }),
        consent,
      );
      expect(decision.kind).toBe('REFUSED');
      if (decision.kind === 'REFUSED') expect(decision.reason).toBe(reason);
    });
  });

  it('refuses a sold-out room', () => {
    const decision = decideCommit(
      report({ outcome: { kind: 'SOLD_OUT' }, chargeable: null, requiresConsent: true }),
    );
    expect(decision).toEqual({ kind: 'REFUSED', reason: 'SOLD_OUT' });
  });

  it.each(['DEAL_NOT_FOUND', 'SUPPLIER_UNAVAILABLE', 'INCOMPLETE'] as const)(
    'refuses a %s report',
    (status) => {
      const decision = decideCommit(
        report({ status, outcome: undefined, chargeable: null, requiresConsent: true }),
      );
      expect(decision).toEqual({ kind: 'REFUSED', reason: status });
    },
  );

  describe('what the supplier would not confirm', () => {
    /**
     * A supplier that does not restate the cancellation policy has not agreed to
     * the one we quoted. Charging on the assumption it is unchanged is the C-2
     * defect one layer out.
     */
    it('needs the customer to acknowledge it, even when the price held', () => {
      const decision = decideCommit(report({ unverified: ['cancellation'], requiresConsent: true }));
      expect(decision.kind).toBe('CONSENT_REQUIRED');
      if (decision.kind === 'CONSENT_REQUIRED') {
        expect(decision.unverified).toEqual(['cancellation']);
      }
    });

    it('proceeds once acknowledged', () => {
      const decision = decideCommit(report({ unverified: ['cancellation'], requiresConsent: true }), {
        acceptedTotal: rs(11_800),
        acceptedAt: new Date('2026-08-14T10:00:00Z'),
        acknowledgedUnverified: ['cancellation'],
      });
      expect(decision.kind).toBe('PROCEED');
    });

    it('is not covered by acknowledging a different dimension', () => {
      const decision = decideCommit(
        report({ unverified: ['room', 'cancellation'], requiresConsent: true }),
        {
          acceptedTotal: rs(11_800),
          acceptedAt: new Date('2026-08-14T10:00:00Z'),
          acknowledgedUnverified: ['room'],
        },
      );
      expect(decision.kind).toBe('CONSENT_REQUIRED');
      if (decision.kind === 'CONSENT_REQUIRED') expect(decision.unverified).toEqual(['cancellation']);
    });
  });
});

describe('booking status transitions', () => {
  it('never advances a terminal booking', () => {
    expect(canTransition('CANCELLED', 'CONFIRMED')).toBe(false);
    expect(canTransition('FAILED', 'CONFIRMED')).toBe(false);
    // A poller that revived a FAILED booking after its refund had been paid
    // would leave the customer with a room they were refunded for.
    expect(canTransition('FAILED', 'SUPPLIER_PENDING')).toBe(false);
  });

  it('allows the paths a booking actually takes', () => {
    expect(canTransition('DRAFT', 'PRECHECK_PASSED')).toBe(true);
    expect(canTransition('PRECHECK_PASSED', 'PAYMENT_HELD')).toBe(true);
    expect(canTransition('PAYMENT_HELD', 'SUPPLIER_PENDING')).toBe(true);
    expect(canTransition('SUPPLIER_PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLATION_PENDING')).toBe(true);
    expect(canTransition('CANCELLATION_PENDING', 'CANCELLED')).toBe(true);
  });

  it('treats a repeat of the same status as a no-op, not a violation', () => {
    // The status poller writes what it found; finding the same thing twice is
    // the common case, not an error.
    expect(canTransition('SUPPLIER_PENDING', 'SUPPLIER_PENDING')).toBe(true);
  });

  it('does not let a confirmed booking go back to pending', () => {
    expect(canTransition('CONFIRMED', 'SUPPLIER_PENDING')).toBe(false);
  });
});

describe('refund claims', () => {
  type Payable = Pick<Booking, 'payment' | 'refund'>;
  const paid = (over: Partial<Payable> = {}): Payable => ({
    payment: {
      provider: 'RAZORPAY',
      capturedAmount: rs(11_800),
      verifiedAt: new Date('2026-08-14T09:00:00Z'),
    },
    ...over,
  });

  const request = {
    kind: 'FAILED_BOOKING' as const,
    method: 'GATEWAY' as const,
    amount: rs(11_800),
    referenceId: 'KLR-1',
    now: new Date('2026-08-14T09:05:00Z'),
  };

  it('lets the first caller claim it', () => {
    const claim = claimRefund(paid(), request);
    expect(claim.ok).toBe(true);
    if (claim.ok) expect(claim.record.status).toBe('PROCESSING');
  });

  /**
   * The in-request path, the status poller and the reconciliation worker all
   * race to refund the same failed booking. Only one may move money.
   */
  it('refuses a second claim on a refund already in flight', () => {
    const first = claimRefund(paid(), request);
    if (!first.ok) throw new Error('the first claim should have succeeded');

    const second = claimRefund(paid({ refund: first.record }), request);
    expect(second).toEqual({ ok: false, reason: 'ALREADY_CLAIMED' });
  });

  it('refuses a claim on a refund that already completed', () => {
    const done = claimRefund(
      paid({
        refund: {
          kind: 'FAILED_BOOKING',
          status: 'COMPLETED',
          method: 'GATEWAY',
          amount: rs(11_800),
          referenceId: 'KLR-1',
        },
      }),
      request,
    );
    expect(done).toEqual({ ok: false, reason: 'ALREADY_CLAIMED' });
  });

  it('lets a failed refund be claimed again', () => {
    // A refund that could not be paid still has to be paid.
    const retry = claimRefund(
      paid({
        refund: {
          kind: 'FAILED_BOOKING',
          status: 'FAILED',
          method: 'GATEWAY',
          amount: rs(11_800),
          referenceId: 'KLR-1',
          error: 'gateway timeout',
        },
      }),
      request,
    );
    expect(retry.ok).toBe(true);
  });

  it('refuses to refund a booking nobody paid for', () => {
    const unpaid = claimRefund(paid({ payment: undefined }), request);
    expect(unpaid).toEqual({ ok: false, reason: 'NOTHING_WAS_PAID' });
  });
});
