import type { CurrencyCode } from '../shared/brand.js';
import type { Money } from '../shared/money.js';
import { add, equals, sum, zero } from '../shared/money.js';
import { invariant } from '../shared/errors.js';

/**
 * What a supplier will invoice KLAR for a stay.
 *
 * This type exists so that supplier adapters have no way to express a customer
 * price. Defect D-1 in the teardown — platform markup applied to TripJack and
 * not to RateGain, making the cheapest-supplier comparison meaningless — was
 * possible because each adapter owned its own pricing and could add margin
 * wherever it liked. Adapters now return cost; exactly one engine turns cost
 * into price. There is no code path in which the old bug can reappear.
 *
 * `taxesIncludedInBase` is EXPLICIT, never inferred. The reference code
 * inferred it from `taxAmount === 0` on one supplier and hardcoded a value
 * contradicting its own comment on the other (D-3). A supplier adapter that
 * genuinely cannot tell must say so at ingest, not guess here.
 */
export interface SupplierCost {
  readonly currency: CurrencyCode;
  /** Room cost excluding taxes and fees. */
  readonly base: Money;
  /** Government and local taxes. */
  readonly taxes: Money;
  /** Supplier and property fees (resort fee, service charge, management fee). */
  readonly fees: Money;
  /** Always base + taxes + fees. Asserted at construction. */
  readonly total: Money;
  /**
   * True when the supplier's quoted base already contains the tax amount — i.e.
   * `taxes` is informational rather than additive. The engine uses `total`
   * regardless; this drives the customer-facing breakdown only.
   */
  readonly taxesIncludedInBase: boolean;
  /** Commission the supplier pays KLAR, when disclosed. Never added to price. */
  readonly commission?: Money;
}

export function supplierCost(input: {
  base: Money;
  taxes?: Money;
  fees?: Money;
  taxesIncludedInBase: boolean;
  commission?: Money;
}): SupplierCost {
  const currency = input.base.currency;
  const taxes = input.taxes ?? zero(currency);
  const fees = input.fees ?? zero(currency);

  invariant(
    taxes.currency === currency && fees.currency === currency,
    'COST_CURRENCY_MISMATCH',
    'Every component of a supplier cost must share one currency',
    { base: currency, taxes: taxes.currency, fees: fees.currency },
  );
  invariant(
    input.base.minor >= 0 && taxes.minor >= 0 && fees.minor >= 0,
    'COST_NEGATIVE',
    'Supplier cost components cannot be negative',
    { base: input.base.minor, taxes: taxes.minor, fees: fees.minor },
  );

  const total = add(add(input.base, taxes), fees);

  return {
    currency,
    base: input.base,
    taxes,
    fees,
    total,
    taxesIncludedInBase: input.taxesIncludedInBase,
    ...(input.commission !== undefined ? { commission: input.commission } : {}),
  };
}

/**
 * Build from a supplier that quotes a total and a tax figure but no clean base
 * — the common RateGain shape. Keeps the identity intact rather than letting
 * each adapter subtract by hand.
 */
export function supplierCostFromTotal(input: {
  total: Money;
  taxes?: Money;
  fees?: Money;
  taxesIncludedInBase: boolean;
  commission?: Money;
}): SupplierCost {
  const currency = input.total.currency;
  const taxes = input.taxes ?? zero(currency);
  const fees = input.fees ?? zero(currency);
  const baseMinor = input.total.minor - taxes.minor - fees.minor;

  invariant(
    baseMinor >= 0,
    'COST_TAXES_EXCEED_TOTAL',
    'Supplier taxes and fees exceed the supplier total — the payload is inconsistent',
    { total: input.total.minor, taxes: taxes.minor, fees: fees.minor },
  );

  return supplierCost({
    base: { minor: baseMinor, currency },
    taxes,
    fees,
    taxesIncludedInBase: input.taxesIncludedInBase,
    ...(input.commission !== undefined ? { commission: input.commission } : {}),
  });
}

/** Guard used by tests and by the ingest boundary. */
export function isCostConsistent(c: SupplierCost): boolean {
  return equals(c.total, sum([c.base, c.taxes, c.fees], c.currency));
}
