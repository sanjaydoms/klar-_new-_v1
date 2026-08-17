import { describe, expect, it } from 'vitest';
import { countryCode, currencyCode, supplierCode } from '../shared/brand.js';
import { DomainError } from '../shared/errors.js';
import { money, sum, toMajor } from '../shared/money.js';
import { supplierCost, supplierCostFromTotal, isCostConsistent } from './supplier-cost.js';
import type { MarkupRule } from './markup.js';
import { deriveRegion } from './markup.js';
import { assertPriceIdentities, perNightLines, priceFromCost } from './customer-price.js';

const INR = currencyCode('INR');
const TJ = supplierCode('TJ');
const RG = supplierCode('RG');
const rs = (r: number) => money(Math.round(r * 100), INR);

const platform = (value: number, basis: 'NET' | 'GROSS' = 'NET'): MarkupRule => ({
  layer: 'PLATFORM',
  enabled: true,
  type: 'PERCENTAGE',
  value,
  region: 'ALL',
  basis,
});

const channel = (value: number): MarkupRule => ({
  layer: 'CHANNEL',
  enabled: true,
  type: 'PERCENTAGE',
  value,
  region: 'ALL',
  basis: 'NET',
});

const ctx = (rules: readonly MarkupRule[], supplier = TJ) => ({
  region: 'ALL' as const,
  channel: 'B2C' as const,
  rules,
  nights: 3,
  supplier,
});

describe('SupplierCost', () => {
  it('keeps base + taxes + fees === total', () => {
    const c = supplierCost({ base: rs(10_000), taxes: rs(1_800), fees: rs(200), taxesIncludedInBase: false });
    expect(toMajor(c.total)).toBe(12_000);
    expect(isCostConsistent(c)).toBe(true);
  });

  it('derives a base from a total without breaking the identity', () => {
    const c = supplierCostFromTotal({ total: rs(12_000), taxes: rs(1_800), taxesIncludedInBase: false });
    expect(toMajor(c.base)).toBe(10_200);
    expect(isCostConsistent(c)).toBe(true);
  });

  it('rejects a payload where taxes exceed the total', () => {
    expect(() =>
      supplierCostFromTotal({ total: rs(1_000), taxes: rs(2_000), taxesIncludedInBase: false }),
    ).toThrow(DomainError);
  });
});

describe('CustomerPrice identities', () => {
  it('holds displayBase + taxesAndFees === total', () => {
    const c = supplierCostFromTotal({ total: rs(12_000), taxes: rs(1_800), taxesIncludedInBase: false });
    const p = priceFromCost(c, ctx([platform(5), channel(3)]));
    expect(p.total.minor).toBe(p.displayBase.minor + p.taxesAndFees.minor);
    expect(() => assertPriceIdentities(p)).not.toThrow();
  });

  it('holds sum(breakdown) === total', () => {
    const c = supplierCostFromTotal({ total: rs(12_000), taxes: rs(1_800), fees: rs(500), taxesIncludedInBase: false });
    const p = priceFromCost(c, { ...ctx([platform(7.5), channel(2)]), platformFees: rs(99) });
    expect(sum(p.breakdown.map((l) => l.amount), INR).minor).toBe(p.total.minor);
  });

  it('applies channel margin on top of the platform-marked-up net', () => {
    // base 10,000 → +10% platform = 11,000 → +10% channel on 11,000 = 1,100
    const c = supplierCost({ base: rs(10_000), taxes: rs(0), taxesIncludedInBase: false });
    const p = priceFromCost(c, ctx([platform(10), channel(10)]));
    expect(toMajor(p.platformMarkup)).toBe(1_000);
    expect(toMajor(p.channelMarkup)).toBe(1_100);
    expect(toMajor(p.total)).toBe(12_100);
  });

  it('NET basis does not take margin on government taxes', () => {
    const c = supplierCostFromTotal({ total: rs(12_000), taxes: rs(2_000), taxesIncludedInBase: false });
    const net = priceFromCost(c, ctx([platform(10, 'NET')]));
    const gross = priceFromCost(c, ctx([platform(10, 'GROSS')]));
    expect(toMajor(net.platformMarkup)).toBe(1_000);
    expect(toMajor(gross.platformMarkup)).toBe(1_200);
  });

  it('treats a disabled rule as no margin, not as an error', () => {
    const c = supplierCost({ base: rs(10_000), taxesIncludedInBase: true });
    const p = priceFromCost(c, ctx([{ ...platform(10), enabled: false }]));
    expect(p.platformMarkup.minor).toBe(0);
    expect(toMajor(p.total)).toBe(10_000);
  });

  it('rejects a discount larger than the price', () => {
    const c = supplierCost({ base: rs(1_000), taxesIncludedInBase: true });
    expect(() => priceFromCost(c, { ...ctx([]), discount: rs(5_000) })).toThrow(DomainError);
  });

  it('per-night lines sum exactly to the total', () => {
    const c = supplierCost({ base: rs(1_000.01), taxesIncludedInBase: true });
    const p = priceFromCost(c, { ...ctx([]), nights: 7 });
    expect(sum(perNightLines(p), INR).minor).toBe(p.total.minor);
    expect(perNightLines(p)).toHaveLength(7);
  });
});

/**
 * D-1 in the teardown: platform markup was applied to TripJack and not to
 * RateGain, so the "cheapest supplier" test compared TJ net + markup against RG
 * net. These lock the fix in place.
 */
describe('markup symmetry across suppliers (regression: D-1)', () => {
  const rules = [platform(5)];

  it('applies the same platform markup to every supplier', () => {
    const cost = supplierCostFromTotal({ total: rs(10_000), taxes: rs(0), taxesIncludedInBase: true });
    const tj = priceFromCost(cost, ctx(rules, TJ));
    const rg = priceFromCost(cost, ctx(rules, RG));
    expect(tj.platformMarkup.minor).toBe(rg.platformMarkup.minor);
    expect(tj.total.minor).toBe(rg.total.minor);
  });

  it('leaves the cheaper supplier cheaper after markup', () => {
    const tj = priceFromCost(
      supplierCostFromTotal({ total: rs(12_000), taxesIncludedInBase: true }),
      ctx(rules, TJ),
    );
    const rg = priceFromCost(
      supplierCostFromTotal({ total: rs(11_500), taxesIncludedInBase: true }),
      ctx(rules, RG),
    );
    expect(rg.total.minor).toBeLessThan(tj.total.minor);
  });
});

/**
 * RateGain's Smart Distribution spec carries a `sellingRate` alongside the net
 * `totalPrice`, and `isMandatory` marks the rates where the "partner must sell
 * at or above the MSP". Selling under it breaches the distribution agreement.
 */
describe('minimum selling price', () => {
  const cost = supplierCost({ base: rs(10_000), taxesIncludedInBase: true });

  it('raises a price that would fall below a mandatory floor', () => {
    const p = priceFromCost(cost, {
      ...ctx([]),
      minimumSellingPrice: { amount: rs(11_000), mandatory: true },
    });
    expect(toMajor(p.total)).toBe(11_000);
    expect(toMajor(p.mspUplift)).toBe(1_000);
  });

  it('leaves a price that already clears the floor alone', () => {
    const p = priceFromCost(cost, {
      ...ctx([platform(30)]),
      minimumSellingPrice: { amount: rs(11_000), mandatory: true },
    });
    expect(toMajor(p.total)).toBe(13_000);
    expect(p.mspUplift.minor).toBe(0);
  });

  it('records but does not enforce a non-mandatory floor', () => {
    const p = priceFromCost(cost, {
      ...ctx([]),
      minimumSellingPrice: { amount: rs(11_000), mandatory: false },
    });
    expect(toMajor(p.total)).toBe(10_000);
    expect(p.mspUplift.minor).toBe(0);
  });

  it('keeps both price identities intact after an uplift', () => {
    const withTax = supplierCostFromTotal({
      total: rs(10_000),
      taxes: rs(1_800),
      taxesIncludedInBase: false,
    });
    const p = priceFromCost(withTax, {
      ...ctx([platform(5)]),
      minimumSellingPrice: { amount: rs(12_000), mandatory: true },
    });
    expect(toMajor(p.total)).toBe(12_000);
    expect(p.total.minor).toBe(p.displayBase.minor + p.taxesAndFees.minor);
    expect(sum(p.breakdown.map((l) => l.amount), INR).minor).toBe(p.total.minor);
    expect(() => assertPriceIdentities(p)).not.toThrow();
  });

  it('puts the uplift on the base, not on the tax line', () => {
    // Folding margin into tax would misstate what the customer is taxed on.
    const withTax = supplierCostFromTotal({
      total: rs(10_000),
      taxes: rs(1_800),
      taxesIncludedInBase: false,
    });
    const before = priceFromCost(withTax, ctx([]));
    const after = priceFromCost(withTax, {
      ...ctx([]),
      minimumSellingPrice: { amount: rs(12_000), mandatory: true },
    });
    expect(after.taxesAndFees.minor).toBe(before.taxesAndFees.minor);
    expect(after.displayBase.minor).toBeGreaterThan(before.displayBase.minor);
  });

  it('ignores a floor quoted in another currency rather than mixing them', () => {
    const p = priceFromCost(cost, {
      ...ctx([]),
      minimumSellingPrice: { amount: money(9_999_00, currencyCode('USD')), mandatory: true },
    });
    expect(p.mspUplift.minor).toBe(0);
  });
});

describe('deriveRegion', () => {
  const HOME = countryCode('IN');

  it('returns ALL for an unknown country rather than guessing', () => {
    // Guessing INTERNATIONAL overcharges, DOMESTIC undercharges, and — the real
    // hazard — the quoting side and the charging side could guess differently.
    expect(deriveRegion(undefined, HOME)).toBe('ALL');
  });

  it('separates the home market from everywhere else', () => {
    expect(deriveRegion(countryCode('IN'), HOME)).toBe('DOMESTIC');
    expect(deriveRegion(countryCode('AE'), HOME)).toBe('INTERNATIONAL');
  });

  it('takes the home market from configuration, not a constant', () => {
    expect(deriveRegion(countryCode('AE'), countryCode('AE'))).toBe('DOMESTIC');
  });
});
