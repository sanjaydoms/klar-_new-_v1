import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeTripType, flightSearchRoute, storedTripType } from './tripType';

describe('normalizeTripType folds every observed dialect', () => {
  it.each([
    // desktop
    ['oneway', 'oneway'],
    ['return', 'return'],
    ['multicity', 'multicity'],
    // mobile
    ['round', 'return'],
    ['multi', 'multicity'],
    // BookingPage's dead dialect
    ['one-way', 'oneway'],
    ['multi-city', 'multicity'],
    // mobile review internal
    ['roundtrip', 'return'],
    // backend searchQuery.searchType
    ['RETURN', 'return'],
    ['MULTICITY', 'multicity'],
    ['ONEWAY', 'oneway'],
  ])('%s -> %s', (raw, canonical) => {
    expect(normalizeTripType(raw)).toBe(canonical);
  });

  it('defaults junk and absence to oneway', () => {
    expect(normalizeTripType(undefined)).toBe('oneway');
    expect(normalizeTripType(null)).toBe('oneway');
    expect(normalizeTripType('')).toBe('oneway');
    expect(normalizeTripType('cruise')).toBe('oneway');
  });
});

describe('storage and routing helpers', () => {
  beforeEach(() => sessionStorage.clear());

  it('flightSearchRoute maps any dialect to its search page', () => {
    expect(flightSearchRoute('round')).toBe('/flights/return');
    expect(flightSearchRoute('multi-city')).toBe('/flights/multicity');
    expect(flightSearchRoute(undefined)).toBe('/flights/oneway');
  });

  it('storedTripType reads mobile-dialect storage', () => {
    sessionStorage.setItem('flightSearchParams', JSON.stringify({ tripType: 'round' }));
    expect(storedTripType()).toBe('return');
  });

  it('storedTripType survives a corrupt key', () => {
    sessionStorage.setItem('flightSearchParams', 'not json');
    expect(storedTripType()).toBe('oneway');
  });
});
