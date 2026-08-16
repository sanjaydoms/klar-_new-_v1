import { invariant } from './errors.js';
import type { CurrencyCode } from './brand.js';

/**
 * Money in integer MINOR units (paise, cents, fils).
 *
 * The reference implementation carried prices as JS floats through markup
 * arithmetic, rounding with `Math.round(n*100)/100` at a dozen call sites. That
 * is survivable for display and not survivable for a comparison engine: two
 * suppliers whose totals differ by a rounding artefact of 0.004 would pick a
 * "cheapest" that flips between requests, and a breakdown that fails to sum is
 * exactly how the B2C margin went missing before.
 *
 * Integers remove the class of bug entirely. Conversion to major units happens
 * once, at the presentation boundary.
 */
export interface Money {
  /** Integer. Negative is legal (discounts, refunds, penalties). */
  readonly minor: number;
  readonly currency: CurrencyCode;
}

/** Minor units per major unit. Currencies not listed use 2. */
const EXPONENT_OVERRIDES: Readonly<Record<string, number>> = {
  JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, XAF: 0, XOF: 0, XPF: 0,
  BHD: 3, IQD: 3, JOD: 3, KWD: 3, OMR: 3, TND: 3,
};

export function exponentOf(currency: CurrencyCode): number {
  return EXPONENT_OVERRIDES[currency] ?? 2;
}

export function money(minor: number, currency: CurrencyCode): Money {
  invariant(
    Number.isSafeInteger(minor),
    'MONEY_NOT_INTEGER',
    'Money must be constructed from an integer number of minor units',
    { minor, currency },
  );
  return { minor, currency };
}

export function zero(currency: CurrencyCode): Money {
  return { minor: 0, currency };
}

/**
 * Shift a decimal point without going through a binary multiply.
 *
 * `1.005 * 100` is `100.49999999999999`, because the double nearest to 1.005 is
 * a shade below it — so the naive scale-then-round loses the half and rounds
 * DOWN. Re-parsing the decimal literal `1.005e2` instead yields exactly 100.5,
 * because the shift happens in the decimal text rather than in binary.
 *
 * The mantissa/exponent split is there for values whose `toString` is already
 * exponential (`1e-7`), where naive concatenation would produce `1e-7e2`.
 */
function shiftDecimal(value: number, places: number): number {
  const [mantissa, exponent] = value.toString().split('e');
  const shifted = (exponent === undefined ? 0 : Number(exponent)) + places;
  return Number(`${mantissa as string}e${shifted}`);
}

/**
 * Build from a major-unit amount (11800.50 → 1180050 paise).
 *
 * Rounds half away from zero, which is what a human expects and what supplier
 * invoices do — and does so for genuine decimal halves such as 1.005, which a
 * float multiply silently rounds the wrong way. Only for parsing supplier
 * payloads and user input; internal arithmetic stays in minor units throughout.
 */
export function fromMajor(major: number, currency: CurrencyCode): Money {
  invariant(
    Number.isFinite(major),
    'MONEY_NOT_FINITE',
    'Cannot build Money from a non-finite amount',
    { major, currency },
  );
  const scaled = shiftDecimal(major, exponentOf(currency));
  const rounded = scaled < 0 ? -Math.round(-scaled) : Math.round(scaled);
  return money(rounded, currency);
}

/** For display and for wire formats that expect decimals. */
export function toMajor(m: Money): number {
  return m.minor / 10 ** exponentOf(m.currency);
}

// ── Arithmetic ──────────────────────────────────────────────────────────────

function assertSameCurrency(a: Money, b: Money, op: string): void {
  invariant(
    a.currency === b.currency,
    'CURRENCY_MISMATCH',
    `Cannot ${op} amounts in different currencies — convert first`,
    { left: a.currency, right: b.currency, op },
  );
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'add');
  return money(a.minor + b.minor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'subtract');
  return money(a.minor - b.minor, a.currency);
}

export function sum(amounts: readonly Money[], currency: CurrencyCode): Money {
  let total = 0;
  for (const a of amounts) {
    invariant(
      a.currency === currency,
      'CURRENCY_MISMATCH',
      'Cannot sum amounts in different currencies',
      { expected: currency, found: a.currency },
    );
    total += a.minor;
  }
  return money(total, currency);
}

/** Percentage of an amount, e.g. `percentOf(total, 12.5)`. Rounds half up. */
export function percentOf(m: Money, percent: number): Money {
  invariant(
    Number.isFinite(percent),
    'PERCENT_NOT_FINITE',
    'Percentage must be finite',
    { percent },
  );
  const raw = (m.minor * percent) / 100;
  return money(raw < 0 ? -Math.round(-raw) : Math.round(raw), m.currency);
}

/** Integer division for per-night figures. Display only — see divideEvenly. */
export function divide(m: Money, divisor: number): Money {
  invariant(divisor > 0, 'DIVIDE_BY_ZERO', 'Divisor must be positive', { divisor });
  const raw = m.minor / divisor;
  return money(raw < 0 ? -Math.round(-raw) : Math.round(raw), m.currency);
}

/**
 * Split an amount into `parts` pieces that sum EXACTLY back to the original.
 * The remainder is distributed one minor unit at a time from the front, so
 * per-night lines always reconcile with the total.
 */
export function divideEvenly(m: Money, parts: number): Money[] {
  invariant(
    Number.isSafeInteger(parts) && parts > 0,
    'INVALID_SPLIT',
    'Split count must be a positive integer',
    { parts },
  );
  const sign = m.minor < 0 ? -1 : 1;
  const abs = Math.abs(m.minor);
  const base = Math.floor(abs / parts);
  let remainder = abs - base * parts;

  const out: Money[] = [];
  for (let i = 0; i < parts; i++) {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    out.push(money(sign * (base + extra), m.currency));
  }
  return out;
}

// ── Comparison ──────────────────────────────────────────────────────────────

export function compare(a: Money, b: Money): number {
  assertSameCurrency(a, b, 'compare');
  return a.minor - b.minor;
}

export const isZero = (m: Money): boolean => m.minor === 0;
export const isNegative = (m: Money): boolean => m.minor < 0;
export const equals = (a: Money, b: Money): boolean =>
  a.currency === b.currency && a.minor === b.minor;

export function min(a: Money, b: Money): Money {
  return compare(a, b) <= 0 ? a : b;
}

/** Stable debug form. Not a presentation formatter — that is a UI concern. */
export function debugFormat(m: Money): string {
  return `${m.currency} ${toMajor(m).toFixed(exponentOf(m.currency))}`;
}
