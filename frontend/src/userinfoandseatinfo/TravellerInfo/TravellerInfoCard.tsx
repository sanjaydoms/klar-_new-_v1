import FlightCardRoute from '@/features/flights/components/FlightCardRoute';
import FlightCardFooter from '@/features/flights/components/FlightCardFooter';

/**
 * The itinerary summary atop the traveller-details page: one card per segment,
 * on the results-card design language (shared FlightCardRoute block), showing
 * the fare's own data — cabin class, terminals, refundability, baggage, meal —
 * instead of the old hardcoded "Economy"/"India"/check-in-only strip.
 */
interface TravellerInfoCardProps {
  flightSegments?: Array<{
    origin: string;
    destination: string;
    originAirport: string;
    destinationAirport: string;
    departureDate: string;
    departureTime: string;
    arrivalDate: string;
    arrivalTime: string;
    duration: string;
    stops: number;
    airline: string;
    airlineCode?: string;
    flightNumber: string;
    refundableType?: number;
    refundableLabel?: string;
    cabinClass?: string;
    fareName?: string;
    mealIncluded?: boolean;
    aircraft?: string[];
    departureISO?: string;
    arrivalISO?: string;
    departureTerminal?: string;
    arrivalTerminal?: string;
    originCityCode?: string;
    destinationCityCode?: string;
    originCountry?: string;
    baggage: {
      checkIn: string;
      cabin: string;
    };
    segmentType?: 'outbound' | 'return' | 'multicity';
    tripNumber?: number;
    segmentNumber?: number;
    totalSegmentsInTrip?: number;
    priceDetails?: any;
  }>;
  tripType?: string;
  passengerCount?: {
    adult: number;
    child: number;
    infant: number;
    ADULT: number;
    CHILD: number;
    INFANT: number;
  };
  onContinue?: (travellerData: any) => void;
}

const timeOf = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toTimeString().slice(0, 5);
};

/** "10:45 pm" (the extractors' display format) -> "22:45"; else undefined. */
const from12h = (t?: string) => {
  const m = t?.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!m) return undefined;
  let h = parseInt(m[1]!, 10) % 12;
  if (/pm/i.test(m[3]!)) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

const dateOf = (iso?: string) => {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? undefined
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TravellerInfoCard({
  flightSegments,
  tripType = 'oneway',
  passengerCount,
}: TravellerInfoCardProps) {
  if (!flightSegments || flightSegments.length === 0) {
    return null;
  }

  const groupedSegments = flightSegments.reduce(
    (acc, segment) => {
      const tripKey = segment.tripNumber || 1;
      if (!acc[tripKey]) {
        acc[tripKey] = [];
      }
      acc[tripKey].push(segment);
      return acc;
    },
    {} as Record<number, typeof flightSegments>,
  );

  const totalPax = passengerCount
    ? passengerCount.ADULT + passengerCount.CHILD + passengerCount.INFANT
    : 0;

  const getTripLabel = (tripIndex: number) => {
    switch (tripType) {
      case 'roundtrip':
        return tripIndex === 0 ? 'Outbound' : 'Return';
      case 'multicity':
        return `Trip ${tripIndex + 1}`;
      default:
        return 'One Way';
    }
  };

  return (
    <div className="w-full space-y-4">
      {Object.entries(groupedSegments).map(([tripKey, segments]) => {
        const tripIndex = parseInt(tripKey) - 1;

        return (
          <div key={tripKey} className="space-y-4">
            {segments.map((flight, index) => {
              const segmentLabel =
                segments.length > 1 ? ` · Segment ${index + 1} of ${segments.length}` : '';
              const departsLine = [flight.originAirport, flight.origin, flight.originCountry]
                .filter(Boolean)
                .join(', ');

              return (
                <div
                  key={`${tripKey}-${index}`}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-slate-50 px-5 py-2.5">
                    <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-gray-500">
                      {getTripLabel(tripIndex)}
                      {segmentLabel}
                      {departsLine && (
                        <span className="ml-2 normal-case tracking-normal font-normal text-gray-500">
                          Departs {departsLine}
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {flight.fareName && (
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          {flight.fareName}
                        </span>
                      )}
                      {totalPax > 0 && (
                        <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                          {totalPax} Pax
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pt-4">
                    <FlightCardRoute
                      airline={flight.airline}
                      airlineCode={flight.airlineCode}
                      flightNumber={flight.flightNumber}
                      cabinClass={flight.cabinClass}
                      aircraftTypes={flight.aircraft}
                      from={{
                        time: timeOf(flight.departureISO) ?? from12h(flight.departureTime),
                        airportCode: flight.originCityCode || flight.origin,
                        city: flight.origin,
                        date: dateOf(flight.departureISO) || flight.departureDate,
                        terminal: flight.departureTerminal,
                      }}
                      to={{
                        time: timeOf(flight.arrivalISO) ?? from12h(flight.arrivalTime),
                        airportCode: flight.destinationCityCode || flight.destination,
                        city: flight.destination,
                        date: dateOf(flight.arrivalISO) || flight.arrivalDate,
                        terminal: flight.arrivalTerminal,
                      }}
                      duration={flight.duration}
                      stopsLabel={
                        flight.stops === 0
                          ? 'Non-stop'
                          : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`
                      }
                    />
                  </div>

                  <div className="px-5">
                    <div className="flex items-center justify-between">
                      <FlightCardFooter
                        refundable={flight.refundableLabel}
                        checkInBaggage={flight.baggage?.checkIn}
                        cabinBaggage={flight.baggage?.cabin}
                      />
                      {flight.mealIncluded && (
                        <span className="pt-3 pb-4 text-xs font-medium text-green-600">
                          Meal included
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
