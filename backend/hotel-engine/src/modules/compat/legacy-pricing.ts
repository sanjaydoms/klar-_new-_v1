import { toMajor } from '../../domain/shared/money.js';
import type { CustomerPrice } from '../../domain/pricing/customer-price.js';

/**
 * LEGACY. The pricing block the existing frontend reads.
 *
 * **Expiry: deleted when the last reader of `pricing{}` is gone** (teardown §08).
 * Nothing inside the engine may import from this module — it exists at the API
 * edge to translate canonical values outward, and every field here is shaped by
 * a consumer we did not write.
 *
 * The consumer is `features/hotels/utils/ratePricing.ts`, and its own comment
 * records why it exists: the search response carried several totals —
 * `price`, `pricing.totalPrice`, `pricing.supplierTotalPrice`,
 * `pricing.finalTotalPrice` — and only some included the markup. Each screen
 * picked its own; the detail page settled on the pre-markup `pricing.totalPrice`
 * and the B2C margin silently vanished between the card and the review page.
 *
 * Two rules follow, and both are load-bearing:
 *
 *  1. **Every total this block exposes is the sell price.** The resolver reads
 *     `finalTotalPrice ?? price ?? totalPrice` in that order, so a payload where
 *     those differ has a wrong branch waiting in it. They are all the same
 *     number here, which is what makes the read order stop mattering.
 *  2. **`taxesAndFees` is emitted, not left to be summed.** The resolver falls
 *     back to reconstructing it from supplier-shaped fields when absent, and a
 *     locally summed figure is exactly what used to leave the breakdown short of
 *     the total. `CustomerPrice` already derives it, so the identity
 *     `basePrice + taxesAndFees === totalPrice` is carried, not recomputed.
 */
export interface LegacyPricingBlock {
  /** The sell price. First field the resolver reads. */
  readonly finalTotalPrice: number;
  /**
   * Equal to `finalTotalPrice`, deliberately.
   *
   * This is the field that used to hold the pre-markup total and is the last
   * one the resolver falls back to. Making the two identical closes the branch
   * rather than relying on nobody taking it.
   */
  readonly totalPrice: number;
  /** Room cost as displayed, margins folded in. */
  readonly basePrice: number;
  /** Everything on top of `basePrice`. Derived by the engine, never summed. */
  readonly taxesAndFees: number;
  readonly currency: string;
  /** Positive magnitude, display only — the resolver reports it separately. */
  readonly discount: number;
  /**
   * What KLAR is invoiced. Named so no price resolver can mistake it for one:
   * the old `supplierTotalPrice` sat next to the sell price and got picked.
   */
  readonly supplierNetForAudit: number;
}

export function legacyPricingBlock(price: CustomerPrice): LegacyPricingBlock {
  const total = toMajor(price.total);
  return {
    finalTotalPrice: total,
    totalPrice: total,
    basePrice: toMajor(price.displayBase),
    taxesAndFees: toMajor(price.taxesAndFees),
    currency: String(price.currency),
    discount: toMajor(price.discount),
    supplierNetForAudit: toMajor(price.supplierTotal),
  };
}
