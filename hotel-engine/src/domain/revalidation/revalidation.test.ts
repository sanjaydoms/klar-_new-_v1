import { describe, expect, it } from 'vitest';
import { currencyCode, supplierCode } from '../shared/brand.js';
import { money, toMajor } from '../shared/money.js';
import { classifyBoard } from '../rate/board.js';
import { room } from '../rate/room.js';
import { deriveCancellationTerms, UNKNOWN_CANCELLATION } from '../rate/cancellation.js';
import { supplierCostFromTotal } from '../pricing/supplier-cost.js';
import { priceFromCost } from '../pricing/customer-price.js';
import { canProceedWithoutConsent, revalidate, type RevalidationInput } from './revalidation.js';

const INR = currencyCode('INR');
const rs = (r: number) => money(Math.round(r * 100), INR);

const price = (rupees: number) =>
  priceFromCost(supplierCostFromTotal({ total: rs(rupees), taxesIncludedInBase: true }), {
    region: 'ALL',
    channel: 'B2C',
    rules: [],
    nights: 3,
    supplier: supplierCode('TJ'),
  });

const base = (over: Partial<RevalidationInput> = {}): RevalidationInput => ({
  quoted: price(11_800),
  fresh: price(11_800),
  available: true,
  expectedRoom: room({ name: 'Deluxe Room' }),
  offeredRoom: room({ name: 'Deluxe Room' }),
  expectedBoard: classifyBoard('Breakfast'),
  offeredBoard: classifyBoard('Breakfast'),
  expectedCancellation: deriveCancellationTerms({ explicit: true }),
  offeredCancellation: deriveCancellationTerms({ explicit: true }),
  ...over,
});

describe('rate revalidation (brief §31)', () => {
  it('passes an unchanged quote through', () => {
    expect(revalidate(base()).kind).toBe('UNCHANGED');
  });

  it('passes a price drop on to the customer', () => {
    const o = revalidate(base({ fresh: price(11_000) }));
    expect(o.kind).toBe('PRICE_DECREASED');
    if (o.kind === 'PRICE_DECREASED') expect(toMajor(o.to)).toBe(11_000);
    expect(canProceedWithoutConsent(o)).toBe(true);
  });

  it('absorbs a rise inside tolerance without asking again', () => {
    // 0.5% of 11,800 = 59; a 50-rupee rise is inside it.
    const o = revalidate(base({ fresh: price(11_850) }));
    expect(o.kind).toBe('PRICE_INCREASED_WITHIN_TOLERANCE');
    expect(canProceedWithoutConsent(o)).toBe(true);
  });

  it('requires consent for a rise beyond tolerance', () => {
    const o = revalidate(base({ fresh: price(12_100) }));
    expect(o.kind).toBe('PRICE_INCREASED');
    if (o.kind === 'PRICE_INCREASED') {
      expect(toMajor(o.from)).toBe(11_800);
      expect(toMajor(o.to)).toBe(12_100);
    }
    expect(canProceedWithoutConsent(o)).toBe(false);
  });

  it('stops on sold out before looking at anything else', () => {
    expect(revalidate(base({ available: false, fresh: price(1) })).kind).toBe('SOLD_OUT');
  });

  it('reports a room substitution rather than just a price move', () => {
    // A customer must never approve a higher price for a room that also
    // silently changed.
    const o = revalidate(
      base({ offeredRoom: room({ name: 'Standard Room' }), fresh: price(15_000) }),
    );
    expect(o.kind).toBe('ROOM_CHANGED');
  });

  it('reports a board substitution', () => {
    expect(revalidate(base({ offeredBoard: classifyBoard('Room Only') })).kind).toBe(
      'BOARD_CHANGED',
    );
  });

  it('reports a cancellation-policy change', () => {
    const o = revalidate(base({ offeredCancellation: UNKNOWN_CANCELLATION }));
    expect(o.kind).toBe('CANCELLATION_CHANGED');
    expect(canProceedWithoutConsent(o)).toBe(false);
  });
});

describe('cancellation terms', () => {
  it('returns UNKNOWN when the supplier said nothing', () => {
    // The reference implementation returned isRefundable:false alongside an
    // "unknown" flag, and every caller that missed the flag rendered a hard
    // "Non-Refundable" the supplier never stated.
    const t = deriveCancellationTerms({});
    expect(t.refundable).toBe('UNKNOWN');
    expect(t.tier).toBe('UNKNOWN');
  });

  it('reads a non-refundable note in free text', () => {
    const t = deriveCancellationTerms({ notes: 'NON-REFUNDABLE RATE' });
    expect(t.tier).toBe('NON_REFUNDABLE');
  });

  it('derives a free window from zero-penalty policies', () => {
    const t = deriveCancellationTerms({
      windows: [
        { from: '2026-08-01T00:00:00Z', penalty: rs(0) },
        { from: '2026-09-05T00:00:00Z', penalty: rs(11_800) },
      ],
    });
    expect(t.tier).toBe('REFUNDABLE');
    expect(t.freeUntil).toBe('2026-09-05T00:00:00Z');
  });

  it("lets the supplier's own flag win over inference", () => {
    const t = deriveCancellationTerms({ explicit: false, windows: [{ from: 'x', penalty: rs(0) }] });
    expect(t.refundable).toBe('FALSE');
  });
});

// ═══ Regressions from the second cross-check ════════════════════════════════

describe('revalidation refuses to compare across currencies', () => {
  const usd = (dollars: number) =>
    priceFromCost(
      supplierCostFromTotal({
        total: money(Math.round(dollars * 100), currencyCode('USD')),
        taxesIncludedInBase: true,
      }),
      {
        region: 'ALL',
        channel: 'B2C',
        rules: [],
        nights: 3,
        supplier: supplierCode('TJ'),
      },
    );

  /**
   * `delta` is a raw subtraction of minor units. INR 11,800 is 1,180,000 paise
   * and USD 140 is 14,000 cents, so a currency switch read as a 1,166,000-unit
   * *decrease* — an outcome that proceeds without consent and charges the fresh
   * figure. `comparePrices` throws on exactly this; the last gate before a
   * charge cannot be laxer than the search that led to it.
   */
  it('throws rather than reading a currency switch as a price cut', () => {
    expect(() => revalidate(base({ fresh: usd(140) }))).toThrow(/currency/i);
  });

  it('still compares normally within one currency', () => {
    expect(revalidate(base({ fresh: price(11_000) })).kind).toBe('PRICE_DECREASED');
  });
});

describe('revalidation detects a room substitution below category level', () => {
  /**
   * `classifyRoom` returns UNKNOWN for every name that misses its keyword list
   * — "Garden View Room", "King Room", "Family Room" — so a category-only check
   * passed any substitution between two of them. That is a large share of real
   * inventory, silently swapped at the booking gate.
   */
  it('catches a swap between two rooms that both classify as UNKNOWN', () => {
    const expected = room({ name: 'Garden View Room' });
    const offered = room({ name: 'Pool Facing Room' });
    expect(expected.category).toBe('UNKNOWN');
    expect(offered.category).toBe('UNKNOWN');

    expect(revalidate(base({ expectedRoom: expected, offeredRoom: offered })).kind).toBe(
      'ROOM_CHANGED',
    );
  });

  it('catches a swap within one category', () => {
    const outcome = revalidate(
      base({
        expectedRoom: room({ name: 'Deluxe King' }),
        offeredRoom: room({ name: 'Deluxe Twin' }),
      }),
    );
    expect(outcome.kind).toBe('ROOM_CHANGED');
  });

  it('prefers the supplier room code when both sides carry one', () => {
    // Same room, renamed between search and precheck. The code is the identity.
    const outcome = revalidate(
      base({
        expectedRoom: room({ name: 'Deluxe Room', code: 'DBL.ST' }),
        offeredRoom: room({ name: 'Deluxe Room - Sea View', code: 'DBL.ST' }),
      }),
    );
    expect(outcome.kind).toBe('UNCHANGED');
  });

  it('does not manufacture a substitution out of spacing or case', () => {
    const outcome = revalidate(
      base({
        expectedRoom: room({ name: 'Deluxe  Room' }),
        offeredRoom: room({ name: 'DELUXE ROOM' }),
      }),
    );
    expect(outcome.kind).toBe('UNCHANGED');
  });
});
