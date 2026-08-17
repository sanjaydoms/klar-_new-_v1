import { describe, it, expect } from 'vitest';
import { extractFlightDetailsFromOnewayReview } from './beforeBooking.util';

/**
 * The review screen showed "Check in N/A & Cabin N/A" while the traveller page
 * showed 15 Kg / 7 Kg from the SAME payload: the extractor read TotalPriceList
 * from the segment, but the review payload carries it on the trip. It also
 * used BaggageInfo.ClassCode (a cabin-class code) as "cabin baggage".
 * Shape mirrors the live UAT review payload seen in the E2E walk.
 */
const reviewPayload = {
  mappedData: {
    searchQuery: { paxInfo: { ADULT: 1, CHILD: 0, INFANT: 0 } },
    TripInformation: [
      {
        TotalPriceList: [
          {
            FareDetails: {
              AdultFare: {
                BaggageInfo: { CheckInBaggage: '15 Kilograms', CabinBaggage: '7 Kilograms' },
                FareComponents: { BaseFare: 6659, TotalFare: 7932.5 },
                RefundableType: 1,
              },
            },
          },
        ],
        SegmentInformation: [
          {
            DepartureAirport: { city: 'Delhi', code: 'DEL' },
            ArrivalAirport: { city: 'Mumbai', code: 'BOM' },
            FlightDetails: { AirlineName: 'SpiceJet', FlightNumber: '476' },
            DepartureTime: '2026-08-28T16:30:00',
            ArrivalTime: '2026-08-28T18:40:00',
            Duration: 130,
          },
        ],
      },
    ],
  },
};

describe('review-screen flight extraction', () => {
  it('resolves baggage from the trip-level TotalPriceList', () => {
    const extracted = extractFlightDetailsFromOnewayReview(reviewPayload);

    expect(extracted).toBeTruthy();
    expect(extracted.baggage.checkIn).toContain('15');
    expect(extracted.baggage.checkIn).not.toBe('N/A');
    expect(extracted.baggage.cabin).toContain('7');
    expect(extracted.baggage.cabin).not.toBe('N/A');
  });
});

describe('real UAT return payload (captured fixture)', () => {
  // Captured 14 Aug 2026 from a live /review call with a DEL-BOM + BOM-DEL pair.
  // Guards the indexed extraction path the review screen uses per trip.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fixture = require('./__fixtures__/return-review.json');

  it('resolves baggage for BOTH trips via the indexed path', () => {
    for (const tripIndex of [0, 1]) {
      const extracted = extractFlightDetailsFromOnewayReview(fixture, tripIndex, 0);
      expect(extracted, `trip ${tripIndex}`).toBeTruthy();
      expect(extracted.baggage.checkIn, `trip ${tripIndex} checkIn`).not.toBe('N/A');
      expect(extracted.baggage.cabin, `trip ${tripIndex} cabin`).not.toBe('N/A');
    }
  });
});
