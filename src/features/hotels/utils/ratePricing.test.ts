import { describe, it, expect } from 'vitest';

import { resolveRatePricing } from './ratePricing';

/**
 * The B2C markup was configured and applied correctly by the backend, and still
 * never reached the customer: the detail page read `pricing.totalPrice` — the
 * pre-markup supplier total — as "what the customer pays", and the ₹100 margin
 * vanished between the search card and the review page.
 *
 * These lock in which field wins. If one fails, a screen is about to show a
 * price we will not honour at checkout.
 */

/** The real Fabhotel S Continental "Deluxe Room / Room Only" rate, B2C. */
const B2C_RATE = {
  price: 2108.81,
  netPrice: 1985.21,
  pricing: {
    basePrice: 2085.21, // api net + the ₹100 master margin
    taxesAndFees: 23.6,
    totalPrice: 2108.81,
    currency: 'INR',
    taxes: 0,
    mf: 20,
    mft: 3.6,
    markupAmount: 100,
    supplierTotalPrice: 2008.81, // pre-markup — must never be shown
    finalTotalPrice: 2108.81,
  },
};

describe('resolveRatePricing', () => {
  it('reads the markup-inclusive figures for a B2C rate', () => {
    const p = resolveRatePricing(B2C_RATE);

    expect(p.totalPrice).toBe(2108.81);
    expect(p.basePrice).toBe(2085.21);
    expect(p.taxesAndFees).toBe(23.6);
  });

  it('keeps the breakdown adding up to the total', () => {
    const p = resolveRatePricing(B2C_RATE);
    expect(p.basePrice + p.taxesAndFees).toBeCloseTo(p.totalPrice, 2);
  });

  it('never returns the pre-markup supplier total as the price', () => {
    const p = resolveRatePricing(B2C_RATE);
    // 2008.81 is the exact number the review page used to display.
    expect(p.totalPrice).not.toBe(2008.81);
  });

  it('prefers finalTotalPrice when a stale payload disagrees with it', () => {
    // A cached/older payload whose pricing.totalPrice predates the markup.
    const stale = {
      ...B2C_RATE,
      pricing: { ...B2C_RATE.pricing, totalPrice: 2008.81 },
    };
    expect(resolveRatePricing(stale).totalPrice).toBe(2108.81);
  });

  it('falls back to the top-level price when the block has no finalTotalPrice', () => {
    const noFinal: any = { ...B2C_RATE, pricing: { ...B2C_RATE.pricing } };
    delete noFinal.pricing.finalTotalPrice;

    expect(resolveRatePricing(noFinal).totalPrice).toBe(2108.81);
  });

  it('derives taxes/fees for legacy RateGain payloads without taxesAndFees', () => {
    const rgLegacy: any = {
      price: 4720,
      pricing: { basePrice: 4000, totalPrice: 4720, currency: 'INR' },
      // Only taxes marked included===false sit on top of the base; counting the
      // included one too would overstate the fees.
      taxes: {
        taxes: [
          { clientAmount: 720, included: false },
          { clientAmount: 300, included: true },
        ],
      },
    };

    const p = resolveRatePricing(rgLegacy);
    expect(p.taxesAndFees).toBe(720);
    expect(p.basePrice + p.taxesAndFees).toBeCloseTo(p.totalPrice, 2);
  });

  it('sums TripJack taxes + mf + mft when taxesAndFees is absent', () => {
    const legacyTj: any = { ...B2C_RATE, pricing: { ...B2C_RATE.pricing } };
    delete legacyTj.pricing.taxesAndFees;

    expect(resolveRatePricing(legacyTj).taxesAndFees).toBe(23.6);
  });

  it('reads a pricingBreakdown block, as the review page passes it', () => {
    const { pricing, ...rest } = B2C_RATE;
    const p = resolveRatePricing({ ...rest, pricingBreakdown: pricing });

    expect(p.totalPrice).toBe(2108.81);
    expect(p.basePrice).toBe(2085.21);
  });

  it('survives an empty rate without inventing a price', () => {
    const p = resolveRatePricing({});
    expect(p.totalPrice).toBe(0);
    expect(p.basePrice).toBe(0);
    expect(p.taxesAndFees).toBe(0);
  });

  it('sums offers into discount', () => {
    const p = resolveRatePricing({
      ...B2C_RATE,
      offers: [{ value: '-50' }, { amount: 25 }],
    });
    expect(p.discount).toBe(75);
  });
});
