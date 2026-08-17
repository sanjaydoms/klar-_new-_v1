import type { Flight } from '../../types/types.returnFlight';

/**
 * Shape a search-result flight for FlightDetailsModal, which expects the
 * `{ data: … }` envelope of an API response.
 *
 * "View details" on return results used to call `getFlightDetailsBySegmentId`,
 * which posts to `/api/flights/segment/:id`. **That route does not exist** — no
 * flight-service router registers it — so the fetch always 404s. Worse, the
 * function returns the Error from its own catch (flights.api.ts:127) instead of
 * throwing, so the caller set the modal's data to an Error object, the modal hit
 * `if (!data) return null`, and the button opened nothing at all.
 *
 * No endpoint is needed: everything the modal actually renders is already in the
 * search result. The one-way flow figured this out — its handleViewDetails is a
 * bare `setShowDetailsModal(true)` with no fetch (OnewayFlightcard.tsx:293).
 *
 * `segments` and `tripInfo` are genuinely absent from search results, so they are
 * left undefined rather than faked; the modal guards both (`segments && …` at
 * :463) and degrades to the route summary. Better a real summary than a button
 * that does nothing.
 */
export function toFlightDetailsView(flight: Flight) {
  return {
    data: {
      departure: flight.departure,
      arrival: flight.arrival,
      totalDuration: flight.duration,
      totalStops: flight.stops,
      airlines: flight.airline ? [flight.airline] : [],
      flightNumbers: flight.flightNumber ? [flight.flightNumber] : [],
      fareOptions: flight.fareOptions ?? [],
    },
  };
}
