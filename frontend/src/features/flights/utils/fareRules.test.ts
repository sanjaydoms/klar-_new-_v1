import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearFareRules,
  storeFareRules,
  readFareRules,
  isFareRuleResponseUsable,
} from './fareRules';

const rules = { status: { success: true }, fareRule: { 'DEL-BOM': { tfr: { CANCELLATION: [] } } } };

beforeEach(() => sessionStorage.clear());

describe('fare rules are tied to the fare they describe', () => {
  it('hands back rules for the fare they were fetched for', () => {
    storeFareRules('FARE_A', rules);
    expect(readFareRules('FARE_A')).toEqual(rules);
  });

  it('refuses another fare’s rules — the bug this exists to stop', () => {
    storeFareRules('FARE_A', rules);
    // The screen is now showing FARE_B, whose fetch failed; the page must fall
    // back to generic wording rather than present A's cancellation charges.
    expect(readFareRules('FARE_B')).toBeNull();
  });

  it('treats rules written without an owner as stale', () => {
    sessionStorage.setItem('fareRuleData', JSON.stringify(rules));
    expect(readFareRules('FARE_A')).toBeNull();
  });

  it('forgets everything on clear, and answers null without a fare id', () => {
    storeFareRules('FARE_A', rules);
    clearFareRules();
    expect(readFareRules('FARE_A')).toBeNull();
    expect(readFareRules(undefined)).toBeNull();
  });

  it('survives a corrupt payload', () => {
    sessionStorage.setItem('fareRuleData', '{not json');
    sessionStorage.setItem('fareRuleFareId', 'FARE_A');
    expect(readFareRules('FARE_A')).toBeNull();
  });
});

describe('isFareRuleResponseUsable', () => {
  it('rejects a 200 that carries no rules', () => {
    expect(isFareRuleResponseUsable(rules)).toBe(true);
    expect(isFareRuleResponseUsable({ status: { success: false }, fareRule: {} })).toBe(false);
    expect(isFareRuleResponseUsable({ status: { success: true } })).toBe(false);
    expect(isFareRuleResponseUsable(undefined)).toBe(false);
  });
});
