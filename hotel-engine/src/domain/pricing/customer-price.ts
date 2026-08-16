import type { CurrencyCode, SupplierCode } from '../shared/brand.js';
import type { Money } from '../shared/money.js';
import { add, divide, equals, subtract, sum, zero } from '../shared/money.js';
import { invariant } from '../shared/errors.js';
import type { SupplierCost } from './supplier-cost.js';
import type { MarkupRule, MarkupRegion } from './markup.js';
import { markupAmount, resolveRule } from './markup.js';

export type PriceLineKind =
  | 'SUPPLIER_BASE'
  | 'SUPPLIER_TAX'
  | 'SUPPLIER_FEE'
  | 'PLATFORM_MARKUP'
  | 'CHANNEL_MARKUP'
  | 'PLATFORM_FEE'
  | 'DISCOUNT'
  /** Uplift to a supplier-mandated minimum selling price. See MinimumSellingPrice. */
  | 'MSP_UPLIFT';

/**
 * A floor the supplier contractually requires us to sell at or above.
 *
 * RateGain's Smart Distribution spec calls this the MSP: a rate carries a
 * `sellingRate` alongside its net `totalPrice`, and `isMandatory` marks the
 * ones where "partner must sell at or above the MSP". Selling under it is a
 * breach of the distribution agreement, not merely a thin margin — so the
 * pricing engine raises the price rather than the reviewer catching it later.
 *
 * A non-mandatory MSP is a recommendation and is recorded but not enforced.
 */
export interface MinimumSellingPrice {
  readonly amount: Money;
  readonly mandatory: boolean;
}

export interface PriceLine {
  readonly kind: PriceLineKind;
  readonly label: string;
  /** Signed. DISCOUNT lines are negative. */
  readonly amount: Money;
}

export interface FxConversion {
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  readonly rate: number;
  readonly asOf: Date;
  readonly source: string;
}

/**
 * What the customer pays. The ONLY number the comparison engine ever looks at.
 *
 * Two identities hold by construction and are asserted, not hoped for:
 *
 *   1. every line in `breakdown` sums exactly to `total`
 *   2. `displayBase + taxesAndFees === total`
 *
 * The second is inherited deliberately from the reference implementation's
 * `buildPublicPricing`, whose comment records why: when each screen summed its
 * own idea of the parts, the breakdown came up short of the total and the B2C
 * margin quietly disappeared between the search card and the review page.
 * Deriving one side of the identity makes it true rather than checked.
 */
export interface CustomerPrice {
  readonly currency: CurrencyCode;

  /** The supplier's own total, carried through for audit and reconciliation. */
  readonly supplierTotal: Money;
  readonly platformMarkup: Money;
  readonly channelMarkup: Money;
  readonly platformFees: Money;
  /** Positive magnitude; subtracted from the total. */
  readonly discount: Money;
  /** Raised to meet a supplier-mandated floor. Zero when none applied. */
  readonly mspUplift: Money;

  /** The number to display, charge, and compare. */
  readonly total: Money;

  /** Room cost as shown to the customer. Margins are folded in here. */
  readonly displayBase: Money;
  /** Everything shown on top of displayBase. Derived, never summed. */
  readonly taxesAndFees: Money;

  /** Indicative only — see `perNightLines` when the split must reconcile. */
  readonly perNight: Money;
  readonly nights: number;

  readonly breakdown: readonly PriceLine[];
  readonly fx?: FxConversion;
}

export interface PricingContext {
  readonly region: MarkupRegion;
  readonly channel: 'B2C' | 'B2B';
  readonly rules: readonly MarkupRule[];
  readonly nights: number;
  /** Enables per-supplier markup overrides. Never used to skip a markup. */
  readonly supplier: SupplierCode;
  readonly platformFees?: Money;
  readonly discount?: Money;
  readonly fx?: FxConversion;
  /** Supplier-mandated floor for this rate, when it declares one. */
  readonly minimumSellingPrice?: MinimumSellingPrice;
}

/**
 * Cost → price. The single place margin is added, for every supplier.
 *
 * Adapters cannot call this: they never hold a `PricingContext`, and their
 * return types have no field a `CustomerPrice` could occupy.
 */
export function priceFromCost(cost: SupplierCost, ctx: PricingContext): CustomerPrice {
  const currency = cost.currency;
  const platformFees = ctx.platformFees ?? zero(currency);
  const discount = ctx.discount ?? zero(currency);

  invariant(
    platformFees.currency === currency && discount.currency === currency,
    'PRICE_CURRENCY_MISMATCH',
    'Fees and discounts must be in the supplier cost currency',
    { currency, fees: platformFees.currency, discount: discount.currency },
  );
  invariant(
    ctx.nights >= 1,
    'PRICE_INVALID_NIGHTS',
    'A priced stay must be at least one night',
    { nights: ctx.nights },
  );
  invariant(
    discount.minor >= 0,
    'PRICE_NEGATIVE_DISCOUNT',
    'Discount is a positive magnitude; it is subtracted, not added',
    { discount: discount.minor },
  );

  const platformRule = resolveRule(ctx.rules, 'PLATFORM', ctx.region);
  const channelRule = resolveRule(ctx.rules, 'CHANNEL', ctx.region);

  const platformMarkup = markupAmount(platformRule, cost.base, cost.total, ctx.supplier);
  // Channel margin sits on top of the platform-marked-up net, matching the
  // reference chain: supplier net → api net → sell price.
  const channelNet = add(cost.base, platformMarkup);
  const channelGross = add(cost.total, platformMarkup);
  const channelMarkup = markupAmount(channelRule, channelNet, channelGross, ctx.supplier);

  const taxesAndFees = add(add(cost.taxes, cost.fees), platformFees);
  const baseBeforeFloor = subtract(
    add(add(cost.base, platformMarkup), channelMarkup),
    discount,
  );

  /**
   * Honour a mandatory floor by raising the price, not by flagging it.
   *
   * The uplift lands on the base rather than on taxes: it is margin, and
   * folding it into the tax line would misstate what the customer is being
   * charged tax on.
   */
  const totalBeforeFloor = add(baseBeforeFloor, taxesAndFees);
  const msp = ctx.minimumSellingPrice;
  const mspUplift =
    msp !== undefined && msp.mandatory && msp.amount.currency === currency
      ? { minor: Math.max(0, msp.amount.minor - totalBeforeFloor.minor), currency }
      : zero(currency);

  const displayBase = add(baseBeforeFloor, mspUplift);
  const total = add(displayBase, taxesAndFees);

  invariant(
    total.minor >= 0,
    'PRICE_NEGATIVE_TOTAL',
    'A discount cannot exceed the total price',
    { total: total.minor, discount: discount.minor },
  );

  const breakdown: PriceLine[] = [
    { kind: 'SUPPLIER_BASE', label: 'Room', amount: cost.base },
  ];
  if (cost.taxes.minor !== 0)
    breakdown.push({ kind: 'SUPPLIER_TAX', label: 'Taxes', amount: cost.taxes });
  if (cost.fees.minor !== 0)
    breakdown.push({ kind: 'SUPPLIER_FEE', label: 'Property fees', amount: cost.fees });
  if (platformMarkup.minor !== 0)
    breakdown.push({ kind: 'PLATFORM_MARKUP', label: 'Platform margin', amount: platformMarkup });
  if (channelMarkup.minor !== 0)
    breakdown.push({ kind: 'CHANNEL_MARKUP', label: 'Channel margin', amount: channelMarkup });
  if (platformFees.minor !== 0)
    breakdown.push({ kind: 'PLATFORM_FEE', label: 'Service fee', amount: platformFees });
  if (discount.minor !== 0)
    breakdown.push({
      kind: 'DISCOUNT',
      label: 'Discount',
      amount: { minor: -discount.minor, currency },
    });
  if (mspUplift.minor !== 0)
    breakdown.push({
      kind: 'MSP_UPLIFT',
      label: 'Minimum selling price adjustment',
      amount: mspUplift,
    });

  const price: CustomerPrice = {
    currency,
    supplierTotal: cost.total,
    platformMarkup,
    channelMarkup,
    platformFees,
    discount,
    mspUplift,
    total,
    displayBase,
    taxesAndFees,
    perNight: divide(total, ctx.nights),
    nights: ctx.nights,
    breakdown,
    ...(ctx.fx !== undefined ? { fx: ctx.fx } : {}),
  };

  assertPriceIdentities(price);
  return price;
}

/**
 * Both identities, checked. Called on every construction rather than left to
 * tests: a price whose parts do not add up must never reach a customer, and the
 * failure mode it guards against is silent.
 */
export function assertPriceIdentities(p: CustomerPrice): void {
  invariant(
    equals(p.total, add(p.displayBase, p.taxesAndFees)),
    'PRICE_SPLIT_MISMATCH',
    'displayBase + taxesAndFees must equal total',
    {
      displayBase: p.displayBase.minor,
      taxesAndFees: p.taxesAndFees.minor,
      total: p.total.minor,
    },
  );
  invariant(
    equals(p.total, sum(p.breakdown.map((l) => l.amount), p.currency)),
    'PRICE_BREAKDOWN_MISMATCH',
    'Price breakdown lines must sum to the total',
    {
      breakdown: p.breakdown.map((l) => [l.kind, l.amount.minor]),
      total: p.total.minor,
    },
  );
}

/**
 * Per-night amounts that sum exactly to the total.
 *
 * `perNight` alone is rounded, so `perNight × nights` can miss the total by a
 * few minor units. Anywhere the split is itemised — an invoice, a nightly
 * breakdown — use this instead.
 */
export function perNightLines(p: CustomerPrice): Money[] {
  const base = Math.floor(p.total.minor / p.nights);
  let remainder = p.total.minor - base * p.nights;
  const out: Money[] = [];
  for (let i = 0; i < p.nights; i++) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    out.push({ minor: base + extra, currency: p.currency });
  }
  return out;
}

/**
 * The comparison primitive.
 *
 * Throws on a currency mismatch rather than falling back to raw numbers — two
 * prices in different currencies are not comparable, and silently comparing
 * them is how an OTA shows a customer the wrong "cheapest".
 */
export function comparePrices(a: CustomerPrice, b: CustomerPrice): number {
  invariant(
    a.currency === b.currency,
    'PRICE_CURRENCY_MISMATCH',
    'Prices must be converted to one currency before comparison',
    { left: a.currency, right: b.currency },
  );
  return a.total.minor - b.total.minor;
}
