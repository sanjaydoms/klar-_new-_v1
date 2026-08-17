import { describe, it, expect } from 'vitest';

import { toFlightDetailsView } from './flightDetailsView';

/**
 * "View details" on return results opened nothing.
 *
 * It called getFlightDetailsBySegmentId, which posts to
 * `/api/flights/segment/:id` — a route no flight-service router registers. The
 * fetch 404s, and that function returns the Error from its own catch instead of
 * throwing, so the caller set the modal's data to an Error object. The modal's
 * `if (!data) return null` then rendered nothing: the button was inert while
 * looking live.
 *
 * No endpoint is required. Everything FlightDetailsModal renders is already in
 * the search result — which is what the one-way flow does
 * (OnewayFlightcard.tsx:293 is a bare setShowDetailsModal(true)).
 */

const flight = {
  flightId: 'f1',
  id: 'f1',
  airline: { code: '6E', name: 'IndiGo' },
  flightNumber: '6E-2043',
  departure: { code: 'DEL', time: '2026-09-15T06:10:00', city: 'Delhi' },
  arrival: { code: 'BOM', time: '2026-09-15T08:25:00', city: 'Mumbai' },
  duration: 135,
  stops: 0,
  price: 5312.5,
  currency: 'INR',
  isRefundable: true,
  fareOptions: [{ fareIdentifier: 'PUBLISHED', price: 5312.5 }],
} as any;

describe('toFlightDetailsView', () => {
  it('wraps in the { data } envelope the modal destructures', () => {
    // The modal does `const { data } = flightDetails` and bails when it is
    // missing — which is exactly how the Error object rendered as nothing.
    const view = toFlightDetailsView(flight);
    expect(view.data).toBeTruthy();
  });

  it('carries the fields the modal renders unguarded', () => {
    const { data } = toFlightDetailsView(flight);

    // formatDuration(totalDuration) and totalStops === 0 are read without a
    // guard, so these must always be present.
    expect(data.totalDuration).toBe(135);
    expect(data.totalStops).toBe(0);
    expect(data.departure).toBe(flight.departure);
    expect(data.arrival).toBe(flight.arrival);
  });

  it('turns the single airline into the list the modal maps over', () => {
    const { data } = toFlightDetailsView(flight);
    expect(data.airlines).toEqual([{ code: '6E', name: 'IndiGo' }]);
    // The modal reads airline.code off each entry.
    expect(data.airlines[0]?.code).toBe('6E');
  });

  it('turns the single flight number into a list', () => {
    expect(toFlightDetailsView(flight).data.flightNumbers).toEqual(['6E-2043']);
  });

  it('passes fare options through', () => {
    expect(toFlightDetailsView(flight).data.fareOptions).toHaveLength(1);
  });

  it('omits segments and tripInfo rather than faking them', () => {
    // Search results genuinely do not carry per-segment detail. The modal guards
    // both, so it degrades to the route summary — a real summary beats an
    // invented itinerary.
    const { data } = toFlightDetailsView(flight) as Record<string, any>;
    expect(data.segments).toBeUndefined();
    expect(data.tripInfo).toBeUndefined();
  });

  it('degrades safely when a flight is missing its airline or number', () => {
    const sparse = { ...flight, airline: undefined, flightNumber: undefined };
    const { data } = toFlightDetailsView(sparse);

    // Empty arrays, not undefined: the modal guards on `.length > 0`.
    expect(data.airlines).toEqual([]);
    expect(data.flightNumbers).toEqual([]);
    expect(data.totalDuration).toBe(135);
  });

  it('never yields undefined fareOptions', () => {
    const { data } = toFlightDetailsView({ ...flight, fareOptions: undefined });
    expect(data.fareOptions).toEqual([]);
  });
});
