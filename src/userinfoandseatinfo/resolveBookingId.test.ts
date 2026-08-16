import { describe, it, expect, beforeEach } from 'vitest';

import { resolveBookingId } from './resolveBookingId';

/**
 * The confirmation screen is the last thing a customer sees after paying, and it
 * used to lose the booking on a single refresh: the id came from
 * `searchParams || location.state`, the page is navigated to with router state
 * only, and router state does not survive a reload.
 */

const BOOKING_ID = 'KLAR-FLT-99120';
const params = (qs = '') => new URLSearchParams(qs);

describe('resolveBookingId', () => {
  beforeEach(() => sessionStorage.clear());

  it('takes the query string when present', () => {
    expect(resolveBookingId(params(`bookingId=${BOOKING_ID}`), null)).toBe(BOOKING_ID);
  });

  it('takes router state when there is no query string', () => {
    expect(resolveBookingId(params(), { bookingId: BOOKING_ID })).toBe(BOOKING_ID);
  });

  it('survives a refresh — falls back to sessionStorage', () => {
    // Exactly what a reload looks like: no query string, router state dropped,
    // sessionStorage still holding what the payment step wrote.
    sessionStorage.setItem('bookingId', BOOKING_ID);
    expect(resolveBookingId(params(), null)).toBe(BOOKING_ID);
  });

  it('prefers an explicit link over whatever this tab booked last', () => {
    // Without this ordering, opening someone else's confirmation link would show
    // the recipient their OWN previous booking.
    sessionStorage.setItem('bookingId', 'STALE-ID');
    expect(resolveBookingId(params(`bookingId=${BOOKING_ID}`), null)).toBe(BOOKING_ID);
  });

  it('prefers a fresh navigation over stale storage', () => {
    sessionStorage.setItem('bookingId', 'STALE-ID');
    expect(resolveBookingId(params(), { bookingId: BOOKING_ID })).toBe(BOOKING_ID);
  });

  it('returns undefined when there is genuinely no id', () => {
    expect(resolveBookingId(params(), null)).toBeUndefined();
  });

  it('treats a blank stored id as no id', () => {
    // sessionStorage yields '' rather than null once a key has been blanked;
    // fetching with '' would hit the API with an empty path segment.
    sessionStorage.setItem('bookingId', '   ');
    expect(resolveBookingId(params(), null)).toBeUndefined();
  });

  it('ignores a non-string bookingId in router state', () => {
    expect(resolveBookingId(params(), { bookingId: { id: BOOKING_ID } })).toBeUndefined();
  });

  it('does not throw when sessionStorage is unavailable', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError');
      },
    });

    expect(() => resolveBookingId(params(), null)).not.toThrow();
    expect(resolveBookingId(params(`bookingId=${BOOKING_ID}`), null)).toBe(BOOKING_ID);

    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
  });
});
