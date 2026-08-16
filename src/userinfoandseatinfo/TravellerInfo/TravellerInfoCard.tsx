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
    flightNumber: string;
    refundableType?: number;
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

export default function TravellerInfoCard({
  flightSegments,
  tripType = 'oneway',
  passengerCount,
}: TravellerInfoCardProps) {
  if (!flightSegments || flightSegments.length === 0) {
    return null;
  }

  // Group segments by trip
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

  const getTripLabel = (tripIndex: number) => {
    switch (tripType) {
      case 'roundtrip':
        return tripIndex === 0 ? '✈️ Outbound' : '🔄 Return';
      case 'multicity':
        return `Trip ${tripIndex + 1}`;
      default:
        return 'Flight';
    }
  };

  const getTripLabelShort = () => {
    switch (tripType) {
      case 'oneway':
        return 'One Way';
      case 'roundtrip':
        return 'Round Trip';
      case 'multicity':
        return 'Multi City';
      default:
        return 'Flight';
    }
  };

  // const getBadgeConfig = (refundableType: number = 0) => {
  //   switch (refundableType) {
  //     case 1:
  //       return {
  //         text: 'REFUNDABLE',
  //         className: 'bg-green-500 text-white',
  //       };
  //     case 2:
  //       return {
  //         text: 'PARTIAL REFUND',
  //         className: 'bg-yellow-500 text-white',
  //       };
  //     default:
  //       return {
  //         text: 'NON-REFUNDABLE',
  //         className: 'bg-red-500 text-white',
  //       };
  //   }
  // };

  const getSegmentLabel = (segment: any, index: number, total: number) => {
    if (total > 1) {
      return `Segment ${index + 1} of ${total}`;
    }
    return '';
  };

  return (
    <div className="w-full space-y-6">
      {/* Render each segment as an independent card */}
      {Object.entries(groupedSegments).map(([tripKey, segments]) => {
        const tripIndex = parseInt(tripKey) - 1;

        return (
          <div key={tripKey} className="space-y-6">
            {/* Trip Header */}
            {Object.keys(groupedSegments).length > 1 && (
              <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
                  {getTripLabel(tripIndex)}
                </span>
                <span className="text-xs text-gray-500">
                  {segments.length} {segments.length === 1 ? 'Segment' : 'Segments'}
                </span>
              </div>
            )}

            {/* Each segment as an INDEPENDENT CARD */}
            {segments.map((flight, index) => {
              // const badge = getBadgeConfig(flight.refundableType);
              const segmentLabel = getSegmentLabel(flight, index, segments.length);

              return (
                <div
                  key={`${tripKey}-${index}`}
                  className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
                >
                  {/* Card Top Header - With gradient color */}
                  <div
                    className="px-5 py-3 border-b border-gray-200"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(250, 197, 93, 0.25) 11.01%, rgba(203, 139, 12, 0.25) 59.57%)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-700 font-medium">
                        ✈️ Your Flight departs from {flight.originAirport}, {flight.origin}, India
                      </p>
                      {passengerCount &&
                        passengerCount.ADULT + passengerCount.CHILD + passengerCount.INFANT > 0 && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                            {passengerCount.ADULT + passengerCount.CHILD + passengerCount.INFANT}{' '}
                            Pax
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Segment Label for multiple segments in same trip */}
                    {segments.length > 1 && segmentLabel && (
                      <div className="text-xs font-semibold text-blue-600 mb-3">{segmentLabel}</div>
                    )}

                    {/* Flight Route and Airline Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h1 className="text-xl font-bold text-gray-800">
                          {flight.origin} To {flight.destination}
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm font-semibold text-gray-700">
                            {flight.airline}
                          </span>
                          <span className="text-xs text-gray-500">
                            {flight.airline} {flight.flightNumber} Economy
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{flight.departureDate}</p>
                      </div>
                      {/* {badge && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      )} */}
                    </div>

                    {/* Flight Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Departure</p>
                        <p className="text-base font-bold text-gray-800">{flight.departureTime}</p>
                        <p className="text-xs text-gray-500">{flight.departureDate}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-medium">Stops</p>
                        <p className="text-base font-bold text-gray-800">
                          {flight.stops === 0
                            ? 'Non-stop'
                            : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`}
                        </p>
                        <p className="text-xs text-gray-500">{flight.duration}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-medium">Arrival</p>
                        <p className="text-base font-bold text-gray-800">{flight.arrivalTime}</p>
                        <p className="text-xs text-gray-500">{flight.arrivalDate}</p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 font-medium">Baggage</p>
                        <p className="text-base font-bold text-gray-800">Adult</p>
                        <p className="text-xs text-gray-500">
                          {flight.baggage?.checkIn
                            ? `Check in ${flight.baggage.checkIn}`
                            : 'Check in N/A'}
                          {flight.baggage?.cabin ? ` & Cabin ${flight.baggage.cabin}` : ''}
                        </p>
                      </div>
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
