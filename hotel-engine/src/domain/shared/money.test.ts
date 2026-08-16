import { describe, expect, it } from 'vitest';
import { currencyCode } from './brand.js';
import { DomainError } from './errors.js';
import {
  add,
  divideEvenly,
  fromMajor,
  money,
  percentOf,
  subtract,
  sum,
  toMajor,
} from './money.js';

const INR = currencyCode('INR');
const USD = currencyCode('USD');
const JPY = currencyCode('JPY');

describe('Money', () => {
  it('rejects non-integer minor units', () => {
    expect(() => money(10.5, INR)).toThrow(DomainError);
  });

  it('round-trips major units', () => {
    expect(toMajor(fromMajor(11_800.5, INR))).toBe(11_800.5);
  });

  it('honours zero-decimal currencies', () => {
    expect(fromMajor(1500, JPY).minor).toBe(1500);
    expect(fromMajor(1500, INR).minor).toBe(150_000);
  });

  it('refuses arithmetic across currencies', () => {
    expect(() => add(money(100, INR), money(100, USD))).toThrow(DomainError);
    expect(() => subtract(money(100, INR), money(100, USD))).toThrow(DomainError);
    expect(() => sum([money(100, INR), money(100, USD)], INR)).toThrow(DomainError);
  });

  /**
   * The reason for integer minor units. In floats,
   * 0.1 + 0.2 !== 0.3, and a price built from a hundred such additions drifts
   * far enough to flip a cheapest-supplier comparison.
   */
  it('does not drift over repeated addition', () => {
    let total = money(0, INR);
    for (let i = 0; i < 1000; i++) total = add(total, fromMajor(0.1, INR));
    expect(total.minor).toBe(100_00);
    expect(toMajor(total)).toBe(100);
  });

  it('rounds percentages half away from zero', () => {
    expect(percentOf(money(1000, INR), 12.5).minor).toBe(125);
    expect(percentOf(money(1005, INR), 50).minor).toBe(503);
  });

  it('splits an amount so the parts sum exactly back', () => {
    const parts = divideEvenly(money(1000, INR), 3);
    expect(parts.map((p) => p.minor)).toEqual([334, 333, 333]);
    expect(sum(parts, INR).minor).toBe(1000);
  });

  it('splits negative amounts without losing a unit', () => {
    const parts = divideEvenly(money(-1000, INR), 3);
    expect(sum(parts, INR).minor).toBe(-1000);
  });

  /**
   * `fromMajor` documents "rounds half away from zero", and a float multiply
   * does not deliver it: the double nearest 1.005 is a shade below, so
   * `1.005 * 100` is 100.49999999999999 and rounds DOWN. Every value here is an
   * exact decimal half at the minor-unit boundary, which is precisely the case
   * a scale-then-round loses.
   */
  it('rounds decimal halves away from zero, as documented', () => {
    expect(fromMajor(1.005, INR).minor).toBe(101);
    expect(fromMajor(2.675, INR).minor).toBe(268);
    expect(fromMajor(8.165, INR).minor).toBe(817);
    expect(fromMajor(-1.005, INR).minor).toBe(-101);
  });

  it('still handles ordinary and exponential amounts', () => {
    expect(fromMajor(11_800.5, INR).minor).toBe(1_180_050);
    expect(fromMajor(0, INR).minor).toBe(0);
    expect(fromMajor(1e-7, INR).minor).toBe(0);
    expect(fromMajor(1.0049, INR).minor).toBe(100);
    expect(toMajor(fromMajor(12_650, INR))).toBe(12_650);
  });

  it('keeps zero-decimal currencies whole', () => {
    const JPY = currencyCode('JPY');
    expect(fromMajor(1500.5, JPY).minor).toBe(1501);
    expect(fromMajor(1500.4, JPY).minor).toBe(1500);
  });
});
