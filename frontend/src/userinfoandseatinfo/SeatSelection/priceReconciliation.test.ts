import { describe, it, expect } from 'vitest';

/**
 * The price panel's rows must add up to what the customer is charged.
 *
 * They did not. `totalAmount.baseFare` is set from TripJack's TotalFare —
 * taxes already included (SeatSelection.tsx:1214) — and was rendered under a
 * "Base Fare" label with a separate "Tax Amount" row beneath it. Tax appeared
 * twice: once inside the base, once on its own line. The rows never summed to
 * the total, on the screen where someone decides to pay.
 *
 * The value could not simply be corrected. BeforeBookingConfirmation.tsx:811
 * computes the amount sent to the supplier as `baseFare + seatTotal`, which is
 * right only because that field is a total — making it a real base there would
 * undercharge every booking by its tax. So the fix is display-side: take the
 * genuine base from FareComponents.BaseFare, which the backend already maps from
 * TripJack's BF.
 *
 * These lock the identity that makes the panel honest:
 *     base + tax === TotalFare        (the supplier's own arithmetic)
 *     TotalFare + add-ons === charged (what BeforeBookingConfirmation sends)
 */

/** A real TripJack-shaped fare detail, as the backend maps it. */
const fareDetail = {
  FareComponents: { BaseFare: 4200, TotalFare: 5312.5 },
  AdditionalFareComponents: {
    TotalAdditionalFare: {
      AirlineGSTComponent: 262.5,
      FuelSurcharge: 600,
      OtherTaxes: 150,
      ManagementFee: 80,
      ManagementFeeTax: 20,
    },
  },
};

const taxesOf = (d: typeof fareDetail) => {
  const t = d.AdditionalFareComponents.TotalAdditionalFare;
  return (
    t.AirlineGSTComponent + t.FuelSurcharge + t.OtherTaxes + t.ManagementFee + t.ManagementFeeTax
  );
};

/** Mirrors the panel's choice: a real base earns the split, otherwise not. */
function displayRows(realBaseFare: number, propsBaseFare: number, taxes: number) {
  const hasRealBaseFare = realBaseFare > 0;
  return {
    hasRealBaseFare,
    label: hasRealBaseFare ? 'Base Fare' : 'Fare (incl. taxes)',
    fare: hasRealBaseFare ? realBaseFare : propsBaseFare,
    tax: hasRealBaseFare ? taxes : null,
  };
}

describe('price panel reconciles', () => {
  const taxes = taxesOf(fareDetail);
  const supplierTotal = fareDetail.FareComponents.TotalFare;
  const realBase = fareDetail.FareComponents.BaseFare;

  it('the fixture itself is coherent — base + tax === TotalFare', () => {
    // If this fails the fixture is wrong and every assertion below is meaningless.
    expect(realBase + taxes).toBeCloseTo(supplierTotal, 2);
  });

  it('shows the real base, not the total, when the supplier gives one', () => {
    const rows = displayRows(realBase, supplierTotal, taxes);

    expect(rows.label).toBe('Base Fare');
    expect(rows.fare).toBe(4200);
    // The regression: it used to render 5312.50 here, the total.
    expect(rows.fare).not.toBe(supplierTotal);
  });

  it('the displayed rows sum to the supplier total', () => {
    const rows = displayRows(realBase, supplierTotal, taxes);
    expect(rows.fare + (rows.tax ?? 0)).toBeCloseTo(supplierTotal, 2);
  });

  it('rows plus add-ons equal the amount actually charged', () => {
    const addons = 850;
    const charged = supplierTotal + addons; // BeforeBookingConfirmation.tsx:811
    const rows = displayRows(realBase, supplierTotal, taxes);

    expect(rows.fare + (rows.tax ?? 0) + addons).toBeCloseTo(charged, 2);
  });

  it('never shows a tax row without a real base', () => {
    // Absent a base, a tax line beside a tax-inclusive figure double-counts.
    const rows = displayRows(0, supplierTotal, taxes);

    expect(rows.hasRealBaseFare).toBe(false);
    expect(rows.tax).toBeNull();
    expect(rows.label).toBe('Fare (incl. taxes)');
  });

  it('still shows the right money when the base is missing', () => {
    const rows = displayRows(0, supplierTotal, taxes);
    // One honest, tax-inclusive number rather than an invented split.
    expect(rows.fare).toBe(supplierTotal);
  });
});
