import type { CountryCode, SupplierCode } from '../../domain/shared/brand.js';
import type { CustomerPrice, PricingContext } from '../../domain/pricing/customer-price.js';
import { priceFromCost } from '../../domain/pricing/customer-price.js';
import type { SupplierCost } from '../../domain/pricing/supplier-cost.js';
import type { MarkupRegion, MarkupRule } from '../../domain/pricing/markup.js';
import { deriveRegion } from '../../domain/pricing/markup.js';
import type { SupplierRate } from '../../suppliers/contract/dto.js';
import type { MarkupProvider } from '../ports.js';

/**
 * The only place a supplier cost becomes a customer price.
 *
 * Everything in the pipeline that needs a comparable number gets it from here,
 * with the same rules, in the same order, for every supplier. Defect D-1 in the
 * teardown — platform markup applied to TripJack and not to RateGain, making
 * the cheapest-supplier comparison meaningless — was possible because each
 * adapter priced its own results. Adapters now return cost and cannot reach
 * this service.
 */
export interface PricingScope {
  readonly channel: 'B2C' | 'B2B';
  /** Where the property is. Decides which region's markup applies. */
  readonly destinationCountry?: CountryCode;
  readonly homeCountry: CountryCode;
  readonly nights: number;
}

export interface ResolvedPricing {
  readonly region: MarkupRegion;
  readonly rules: readonly MarkupRule[];
  readonly markupVersion: string;
}

/**
 * Which country prices a property: its own, else the one the caller resolved
 * for the request as a whole.
 *
 * One function, used by search and by detail, because the failure it prevents
 * is the two of them reaching different answers for the same hotel.
 */
export function pricingCountryOf(
  hotelCountry: CountryCode | undefined,
  fallback: CountryCode | undefined,
): CountryCode | undefined {
  return hotelCountry ?? fallback;
}

/** Map key for a resolved country, with a stable slot for "unknown". */
export const pricingCountryKey = (country: CountryCode | undefined): string =>
  country === undefined ? '' : String(country);

export class PricingService {
  readonly #markup: MarkupProvider;

  constructor(markup: MarkupProvider) {
    this.#markup = markup;
  }

  /**
   * The markup generation in force.
   *
   * Part of the dynamic cache key (ADR-0005 §4), so an operator's margin edit
   * takes effect on the next search rather than waiting out a TTL.
   */
  markupVersion(): string {
    return this.#markup.version();
  }

  /**
   * Resolve the rules once per search, not once per rate.
   *
   * The region is derived from the destination and passed explicitly from here
   * on. The reference computed a region, stored it as a diagnostic, and then
   * called the markup function with no region at all — so region-aware pricing
   * existed, was tested, and was never actually applied (D-5).
   */
  async resolve(scope: PricingScope): Promise<ResolvedPricing> {
    const region = deriveRegion(scope.destinationCountry, scope.homeCountry);
    const rules = await this.#markup.rulesFor(region, scope.channel);
    return { region, rules, markupVersion: this.#markup.version() };
  }

  /**
   * Rules per property, resolved once per distinct country.
   *
   * A property's own country decides its region; the search-level country is
   * the fallback for the many catalogue records that carry none. Both screens
   * must apply that precedence identically — a search that prices a hotel
   * `DOMESTIC` from its destination while the detail page prices the same hotel
   * `ALL` from its blank country is D-1 again, quoting with margin on one screen
   * and at cost on the next.
   *
   * Resolution is memoised per country rather than per hotel: a page of forty
   * results in one country asks the markup provider once.
   */
  async resolveByCountry(
    countries: Iterable<CountryCode | undefined>,
    scope: PricingScope,
  ): Promise<Map<string, ResolvedPricing>> {
    const out = new Map<string, ResolvedPricing>();
    for (const country of countries) {
      const key = pricingCountryKey(country);
      if (out.has(key)) continue;
      out.set(key, await this.resolve({ ...scope, ...(country !== undefined ? { destinationCountry: country } : {}) }));
    }
    return out;
  }

  /** Price a bookable rate, honouring any supplier-mandated selling floor. */
  priceRate(rate: SupplierRate, supplier: SupplierCode, scope: PricingScope, resolved: ResolvedPricing): CustomerPrice {
    return priceFromCost(rate.cost, this.#context(supplier, scope, resolved, rate.minimumSellingPrice));
  }

  /**
   * Price a lead-in figure from a supplier that has not quoted a bookable rate.
   *
   * Same engine, same markup — otherwise an indicative price and a real one
   * could not be ranked against each other, which is the whole reason for
   * carrying it.
   */
  priceIndicative(cost: SupplierCost, supplier: SupplierCode, scope: PricingScope, resolved: ResolvedPricing): CustomerPrice {
    return priceFromCost(cost, this.#context(supplier, scope, resolved, undefined));
  }

  #context(
    supplier: SupplierCode,
    scope: PricingScope,
    resolved: ResolvedPricing,
    msp: SupplierRate['minimumSellingPrice'],
  ): PricingContext {
    return {
      region: resolved.region,
      channel: scope.channel,
      rules: resolved.rules,
      nights: scope.nights,
      supplier,
      ...(msp !== undefined ? { minimumSellingPrice: msp } : {}),
    };
  }
}
