import type { CountryCode } from '../shared/brand.js';
import type { Money } from '../shared/money.js';
import { percentOf, zero } from '../shared/money.js';
import { invariant } from '../shared/errors.js';

/**
 * Which market a stay falls in, for markup purposes.
 *
 * `ALL` is the catch-all and the only safe answer when the country is unknown:
 * guessing INTERNATIONAL overcharges, guessing DOMESTIC undercharges, and — the
 * reason the reference implementation documented this at length — the quoting
 * side and the charging side must reach the same answer or the customer is
 * quoted one price and billed another.
 *
 * Unlike the reference, the home market is configuration, not a module constant.
 */
export type MarkupRegion = 'DOMESTIC' | 'INTERNATIONAL' | 'ALL';

export function deriveRegion(
  country: CountryCode | undefined,
  homeCountry: CountryCode,
): MarkupRegion {
  if (!country) return 'ALL';
  return country === homeCountry ? 'DOMESTIC' : 'INTERNATIONAL';
}

/** Who the margin belongs to. */
export type MarkupLayer =
  /** KLAR's own margin on supplier net. Invisible to agents by design. */
  | 'PLATFORM'
  /** The selling channel's margin: B2C master margin, or a B2B agent's own. */
  | 'CHANNEL';

export interface MarkupRule {
  readonly layer: MarkupLayer;
  readonly enabled: boolean;
  readonly type: 'FIXED' | 'PERCENTAGE';
  /** Minor units when FIXED; a percentage (12.5 means 12.5%) when PERCENTAGE. */
  readonly value: number;
  readonly region: MarkupRegion;
  /**
   * What a percentage applies to.
   *
   * NET marks up the room rate only — most OTAs do not take margin on
   * government taxes. GROSS marks up the tax-inclusive total, which is what the
   * reference defaulted to. Made explicit because the two produce visibly
   * different prices and the choice is commercial, not technical.
   */
  readonly basis: 'NET' | 'GROSS';
  /** Optional per-supplier override, e.g. a richer margin on a cheaper feed. */
  readonly supplierOverrides?: Readonly<Record<string, number>>;
}

/**
 * A rule the operator has explicitly switched off. Distinct from "no rule
 * configured" — the reference implementation's markup config went to some
 * trouble to keep those apart, because collapsing them means an unreachable
 * config service silently sells at cost.
 */
export function disabledRule(layer: MarkupLayer, region: MarkupRegion = 'ALL'): MarkupRule {
  return { layer, enabled: false, type: 'FIXED', value: 0, region, basis: 'NET' };
}

/**
 * Amount a rule adds. Never negative, never a discount — discounts are a
 * separate, auditable line.
 */
export function markupAmount(
  rule: MarkupRule | undefined,
  net: Money,
  gross: Money,
  supplier?: string,
): Money {
  if (!rule || !rule.enabled) return zero(net.currency);

  invariant(
    net.currency === gross.currency,
    'MARKUP_CURRENCY_MISMATCH',
    'Net and gross must share a currency when applying markup',
    { net: net.currency, gross: gross.currency },
  );

  const override =
    supplier !== undefined ? rule.supplierOverrides?.[supplier] : undefined;
  const value = override ?? rule.value;
  if (value <= 0) return zero(net.currency);

  if (rule.type === 'FIXED') return { minor: Math.round(value), currency: net.currency };

  const basis = rule.basis === 'GROSS' ? gross : net;
  return percentOf(basis, value);
}

/**
 * Pick the rule that applies, preferring an exact region match over the
 * catch-all. Returns undefined when nothing is configured, which callers must
 * treat as "no margin", not as an error.
 */
export function resolveRule(
  rules: readonly MarkupRule[],
  layer: MarkupLayer,
  region: MarkupRegion,
): MarkupRule | undefined {
  return (
    rules.find((r) => r.layer === layer && r.region === region) ??
    rules.find((r) => r.layer === layer && r.region === 'ALL')
  );
}
