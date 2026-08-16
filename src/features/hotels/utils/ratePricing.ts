/**
 * The single place the frontend reads a hotel rate's price.
 *
 * The backend is the only thing that prices a stay: it folds the master's B2C
 * margin into `basePrice` and guarantees `basePrice + taxesAndFees ===
 * totalPrice`. This module's whole job is to pick those fields out of a rate
 * and hand them back unchanged.
 *
 * WHY THIS EXISTS
 * ---------------
 * The search response carries several totals — `price`, `pricing.totalPrice`,
 * `pricing.supplierTotalPrice`, `pricing.finalTotalPrice` — and only some of
 * them include the markup. When each screen picked its own, the detail page
 * settled on the pre-markup `pricing.totalPrice` and the master's margin
 * silently vanished between the search card and the review page. Read the rate
 * through here and there is no field left to pick wrong.
 *
 * Do not add markup arithmetic to this file. If a number looks wrong, the fix
 * belongs in hotel-search-service's buildPublicPricing(), not here.
 */

export interface RatePricing {
  /** The sell price. The only number to display as the total or charge. */
  totalPrice: number;
  /** Room cost before taxes/fees. Already includes the master's B2C margin. */
  basePrice: number;
  /** Everything on top of basePrice. basePrice + taxesAndFees === totalPrice. */
  taxesAndFees: number;
  /** Sum of any offers on the rate. Display only. */
  discount: number;
  currency: string;
}

const num = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = Number(val.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The pricing block, wherever this particular payload happens to carry it. */
const pricingBlockOf = (rate: any): any =>
  rate?.pricing || rate?.pricingBreakdown || rate?.priceBreakup || {};

/**
 * Taxes/fees for payloads that predate `taxesAndFees` (older RateGain shapes,
 * cached responses). Kept only as a fallback — when the backend sends the
 * canonical field we use it verbatim, because a locally summed figure is
 * exactly what used to leave the breakdown short of the total.
 */
const legacyTaxesAndFees = (rate: any, p: any): number => {
  // TripJack: the block carries an explicit split.
  if (p && p.taxes != null) {
    return num(p.taxes) + num(p.mf) + num(p.mft);
  }
  if (rate?.taxAmount || rate?.tax || rate?.totalTax) {
    return num(rate.taxAmount || rate.tax || rate.totalTax);
  }
  // RateGain: only taxes marked included===false sit on top of the base; the
  // rest are already inside the total and must not be counted twice.
  if (Array.isArray(rate?.taxes?.taxes)) {
    return rate.taxes.taxes.reduce((sum: number, t: any) => {
      const isIncluded = t.included === true || t.included === 'true' || t.included === 1;
      return isIncluded ? sum : sum + num(t.clientAmount ?? t.amount);
    }, 0);
  }
  if (typeof rate?.taxes === 'number') return rate.taxes;
  return 0;
};

export const rateDiscount = (rate: any): number =>
  (rate?.offers || []).reduce((sum: number, offer: any) => {
    const val = parseFloat(offer?.value ?? offer?.amount ?? '0');
    return isNaN(val) ? sum : sum + Math.abs(val);
  }, 0);

/**
 * Reads a rate's canonical price block.
 *
 * `finalTotalPrice` and the top-level `price` are the markup-inclusive sell
 * price; `pricing.totalPrice` is only equal to them on the current backend and
 * is therefore the last resort, not the first choice.
 */
export function resolveRatePricing(rate: any, fallbackCurrency = 'INR'): RatePricing {
  const p = pricingBlockOf(rate);

  const totalPrice = round2(
    num(
      p.finalTotalPrice ??
        rate?.price ??
        p.totalPrice ??
        rate?.net ??
        rate?.rate ??
        rate?.totalPrice ??
        0,
    ),
  );

  const taxesAndFees = round2(
    p.taxesAndFees != null ? num(p.taxesAndFees) : legacyTaxesAndFees(rate, p),
  );

  // Prefer the backend's base; derive only when the payload has none, so the
  // identity base + taxesAndFees === totalPrice holds either way.
  const basePrice = round2(
    p.basePrice != null ? num(p.basePrice) : Math.max(0, totalPrice - taxesAndFees),
  );

  return {
    totalPrice,
    basePrice,
    taxesAndFees,
    discount: rateDiscount(rate),
    currency: p.currency || rate?.currency || fallbackCurrency,
  };
}
