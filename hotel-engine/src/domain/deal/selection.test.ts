import { describe, expect, it } from 'vitest';
import { toMajor } from '../shared/money.js';
import { occupancySignature } from '../rate/occupancy.js';
import { selectFeaturedDeal, type SelectionRequest } from './selection.js';
import { dealEquivalenceKey, groupByEquivalence } from './equivalence.js';
import {
  PLATFORM_5_PERCENT,
  RG,
  SC,
  STANDARD_OCCUPANCY,
  TJ,
  makeDeal,
} from '../../../tests/fixtures.js';

const REQUEST: SelectionRequest = {
  policy: 'EQUIVALENT_CLASS_PREFERRED',
  requestedOccupancy: occupancySignature(STANDARD_OCCUPANCY),
};

/**
 * The Definition of Done from the brief: the engine is not finished because one
 * supplier works. It is finished when the cheaper one wins, whichever it is.
 */
describe('cheapest comparable deal wins (brief §52)', () => {
  it('scenario 1 — TripJack 10,000 vs RateGain 12,000 → TripJack', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: TJ, totalRupees: 10_000 }),
        makeDeal({ supplier: RG, totalRupees: 12_000 }),
      ],
      REQUEST,
    );
    expect(s.featured.supplier).toBe(TJ);
    expect(toMajor(s.featured.price.total)).toBe(10_000);
  });

  it('scenario 2 — TripJack 12,000 vs RateGain 10,000 → RateGain', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: TJ, totalRupees: 12_000 }),
        makeDeal({ supplier: RG, totalRupees: 10_000 }),
      ],
      REQUEST,
    );
    expect(s.featured.supplier).toBe(RG);
    expect(toMajor(s.featured.price.total)).toBe(10_000);
  });

  it('12,000 vs 11,500 → 11,500 RateGain', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: TJ, totalRupees: 12_000 }),
        makeDeal({ supplier: RG, totalRupees: 11_500 }),
      ],
      REQUEST,
    );
    expect([s.featured.supplier, toMajor(s.featured.price.total)]).toEqual([RG, 11_500]);
  });

  it('10,900 vs 11,500 → 10,900 TripJack', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: TJ, totalRupees: 10_900 }),
        makeDeal({ supplier: RG, totalRupees: 11_500 }),
      ],
      REQUEST,
    );
    expect([s.featured.supplier, toMajor(s.featured.price.total)]).toEqual([TJ, 10_900]);
  });

  it('compares AFTER markup, not before', () => {
    // Same supplier cost, same 5% markup: neither may drift ahead of the other.
    const deals = [
      makeDeal({ supplier: TJ, totalRupees: 12_000, rules: PLATFORM_5_PERCENT }),
      makeDeal({ supplier: RG, totalRupees: 11_500, rules: PLATFORM_5_PERCENT }),
    ];
    const s = selectFeaturedDeal(deals, REQUEST);
    expect(s.featured.supplier).toBe(RG);
    expect(toMajor(s.featured.price.total)).toBe(12_075);
  });

  it('a third supplier needs no change to the selection engine (brief §52 scenario 7)', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: TJ, totalRupees: 12_000 }),
        makeDeal({ supplier: RG, totalRupees: 11_500 }),
        makeDeal({ supplier: SC, totalRupees: 9_900 }),
      ],
      REQUEST,
    );
    expect(s.featured.supplier).toBe(SC);
    expect(s.alternatives).toHaveLength(0); // one comparable class, three offers
  });
});

/**
 * Brief §48: a cheaper non-refundable room-only rate is not a better deal than a
 * refundable breakfast rate — it is a different product. The reference
 * implementation compared on price alone (D-2).
 */
describe('rate equivalence (brief §48)', () => {
  const refundableBreakfast = makeDeal({
    supplier: TJ,
    totalRupees: 12_000,
    board: 'Bed and Breakfast',
    refundable: true,
    freeUntil: '2026-09-05T00:00:00Z',
    id: 'tj-bb-ref',
  });
  const cheaperNonRefRoomOnly = makeDeal({
    supplier: RG,
    totalRupees: 11_500,
    board: 'Room Only',
    refundable: false,
    id: 'rg-ro-nonref',
  });

  it('does not let a non-comparable cheaper rate take the headline', () => {
    const s = selectFeaturedDeal([refundableBreakfast, cheaperNonRefRoomOnly], {
      ...REQUEST,
      preferredBoard: 'BB',
    });
    expect(s.featured.dealId).toBe('tj-bb-ref');
    expect(toMajor(s.featured.price.total)).toBe(12_000);
  });

  it('keeps the non-comparable rate as a real, bookable alternative', () => {
    const s = selectFeaturedDeal([refundableBreakfast, cheaperNonRefRoomOnly], {
      ...REQUEST,
      preferredBoard: 'BB',
    });
    expect(s.alternatives.map((d) => d.dealId)).toEqual(['rg-ro-nonref']);
    // Not a {source, price} stub — the whole deal survives (regression: D-4).
    const alt = s.alternatives[0];
    expect(alt?.token.dealId).toBeDefined();
    expect(alt?.cost.total.minor).toBeGreaterThan(0);
    expect(alt?.cancellation.tier).toBe('NON_REFUNDABLE');
  });

  it('ABSOLUTE_CHEAPEST is available, but only when explicitly chosen', () => {
    const s = selectFeaturedDeal([refundableBreakfast, cheaperNonRefRoomOnly], {
      ...REQUEST,
      policy: 'ABSOLUTE_CHEAPEST',
    });
    expect(s.featured.dealId).toBe('rg-ro-nonref');
    expect(s.policy).toBe('ABSOLUTE_CHEAPEST');
  });

  it('separates board, refund tier and room category into distinct classes', () => {
    const groups = groupByEquivalence([
      makeDeal({ supplier: TJ, totalRupees: 10_000, board: 'Room Only', id: 'a' }),
      makeDeal({ supplier: TJ, totalRupees: 10_000, board: 'Breakfast', id: 'b' }),
      makeDeal({ supplier: TJ, totalRupees: 10_000, board: 'Room Only', refundable: false, id: 'c' }),
      makeDeal({ supplier: TJ, totalRupees: 10_000, board: 'Room Only', roomName: 'Suite', id: 'd' }),
    ]);
    expect(groups).toHaveLength(4);
  });

  it('treats two identical offers from different suppliers as one class', () => {
    const a = makeDeal({ supplier: TJ, totalRupees: 10_000, id: 'a' });
    const b = makeDeal({ supplier: RG, totalRupees: 11_000, id: 'b' });
    expect(dealEquivalenceKey(a)).toBe(dealEquivalenceKey(b));
  });
});

describe('determinism', () => {
  it('breaks an exact price tie the same way every time', () => {
    const deals = [
      makeDeal({ supplier: RG, totalRupees: 10_000, id: 'rg-1' }),
      makeDeal({ supplier: TJ, totalRupees: 10_000, id: 'tj-1' }),
    ];
    const first = selectFeaturedDeal(deals, REQUEST).featured.dealId;
    const reversed = selectFeaturedDeal([...deals].reverse(), REQUEST).featured.dealId;
    expect(first).toBe(reversed);
  });

  it('prefers the more reliable supplier on an exact tie', () => {
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: RG, totalRupees: 10_000, id: 'rg-1' }),
        makeDeal({ supplier: TJ, totalRupees: 10_000, id: 'tj-1' }),
      ],
      { ...REQUEST, supplierReliability: { TJ: 90, RG: 10 } },
    );
    expect(s.featured.supplier).toBe(TJ);
  });

  it('prefers the refundable rate on an exact tie within a class', () => {
    // Same board and room; refundability differs, so these are different
    // classes — but ABSOLUTE_CHEAPEST puts them head to head.
    const s = selectFeaturedDeal(
      [
        makeDeal({ supplier: RG, totalRupees: 10_000, refundable: false, id: 'nonref' }),
        makeDeal({
          supplier: TJ,
          totalRupees: 10_000,
          refundable: true,
          freeUntil: '2026-09-05T00:00:00Z',
          id: 'ref',
        }),
      ],
      { ...REQUEST, policy: 'ABSOLUTE_CHEAPEST' },
    );
    expect(s.featured.dealId).toBe('ref');
  });

  it('featured is a reference into deals, never a copy (regression: D-4)', () => {
    const deals = [
      makeDeal({ supplier: TJ, totalRupees: 12_000, id: 'tj' }),
      makeDeal({ supplier: RG, totalRupees: 11_000, id: 'rg' }),
    ];
    const s = selectFeaturedDeal(deals, REQUEST);
    expect(deals.some((d) => d === s.featured)).toBe(true);
  });
});
