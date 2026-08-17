import React, { useEffect } from 'react';

interface FlightSegment {
  id: string;
  fromCity: string;
  toCity: string;
  date: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
  baggage: string;
  checkIn: string;
  airline: string;
  flightNumber: string;
  cabin: string;
  isRefundable: boolean;
  duration?: number;
  stops?: number;
  fromAirportCode?: string;
  toAirportCode?: string;
  departureAirport?: any;
  arrivalAirport?: any;
  segmentInfo?: any;
}

interface PaymentHeaderProps {
  segments?: FlightSegment[];
  tripType?: 'oneway' | 'roundtrip' | 'multicity';
  // Keep old props for backward compatibility
  fromCity?: string;
  toCity?: string;
  date?: string;
  departureTime?: string;
  departureDate?: string;
  arrivalTime?: string;
  arrivalDate?: string;
  baggage?: string;
  checkIn?: string;
  airline?: string;
  flightNumber?: string;
  cabin?: string;
  isRefundable?: boolean;
}

const PaymentHeader: React.FC<PaymentHeaderProps> = ({
  segments = [],
  tripType = 'oneway',
  // Old props with defaults
  fromCity = 'Bengaluru',
  toCity = 'Goa',
  date = '8th May 2026',
  departureTime = '02:45 PM',
  departureDate = 'Fri, 05-12-2025',
  arrivalTime = '04:45 PM',
  arrivalDate = 'Fri, 05-12-2025',
  baggage = 'Adult 20 Kg',
  checkIn = '20 Kg',
  airline = 'Indigo',
  flightNumber = '6E-6045',
  cabin = 'Economy',
  isRefundable = true,
}) => {
  useEffect(() => {
    console.log('✈️ PaymentHeader mounted with:', {
      segmentsCount: segments.length,
      tripType,
      segments,
    });
  }, [segments, tripType]);

  // Helper function to calculate layover
  const calculateLayover = (arrivalTimeStr: string, departureTimeStr: string): string => {
    try {
      const arrival = new Date(arrivalTimeStr);
      const departure = new Date(departureTimeStr);
      const diffMs = departure.getTime() - arrival.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffHrs > 0) {
        return `${diffHrs}h ${diffMins}m`;
      }
      return `${diffMins}m`;
    } catch {
      return 'N/A';
    }
  };

  // Helper to format duration
  const formatDuration = (minutes: number): string => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Render a single flight card
  const renderFlightCard = (segment: FlightSegment, index: number, totalSegments: number) => {
    const isLast = index === totalSegments - 1;
    const isMultiCity = tripType === 'multicity';
    const isRoundTrip = tripType === 'roundtrip';

    return (
      <div
        key={segment.id || index}
        className="bg-white rounded-xl border border-[#E7E2D9] p-4 sm:p-5 mb-4"
      >
        {/* Flight departs from... with Gradient Background */}
        <div
          className="flex justify-between items-center -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 p-3 sm:p-4 rounded-t-xl mb-4"
          style={{
            background:
              'linear-gradient(90deg, rgba(219, 122, 123, 0.5) 0%, rgba(213, 127, 129, 0.5) 100%)',
            borderBottom: '1px solid #E7E2D9',
          }}
        >
          <div className="text-xs sm:text-sm text-gray-700 font-medium">
            Flight departs from {segment.fromCity || 'N/A'}
          </div>
          {segment.isRefundable ? (
            <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
              REFUNDABLE
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-red-100 text-red-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
              NON-REFUNDABLE
            </span>
          )}
        </div>

        {/* Segment Label for Multi-City */}
        {isMultiCity && (
          <div className="flex items-center mb-2">
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
              Segment {index + 1} of {totalSegments}
            </span>
            {!isLast && (
              <div className="flex-1 ml-3 text-xs text-gray-400 border-t border-gray-200"></div>
            )}
          </div>
        )}

        {/* Round Trip Labels */}
        {isRoundTrip && index === 0 && (
          <div className="mb-2 text-xs font-semibold text-blue-600">✈️ Departure Flight</div>
        )}
        {isRoundTrip && index === 1 && (
          <div className="mb-2 text-xs font-semibold text-green-600">🛬 Return Flight</div>
        )}

        {/* Connection Info (for multi-city, between segments) */}
        {isMultiCity && index > 0 && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center text-gray-500">
                <svg
                  className="w-3 h-3 mr-1 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Connection at <span className="font-medium">{segment.fromCity}</span>
                </span>
              </div>
              {segments[index - 1]?.arrivalTime && segment.departureTime && (
                <span className="text-gray-400">
                  Layover:{' '}
                  {calculateLayover(segments[index - 1].arrivalTime, segment.departureTime)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Route */}
        <div className="flex justify-between items-start mb-1">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">
            {segment.fromCity} {segment.fromAirportCode && `(${segment.fromAirportCode})`} To{' '}
            {segment.toCity} {segment.toAirportCode && `(${segment.toAirportCode})`}
          </h2>
          <div className="text-right">
            <div className="text-xs sm:text-sm font-semibold text-gray-800">{segment.airline}</div>
            <div className="flex items-center justify-end space-x-1 sm:space-x-2 text-[10px] sm:text-xs text-gray-500">
              <span>{segment.flightNumber}</span>
              <span className="text-gray-400">•</span>
              <span>{segment.cabin}</span>
            </div>
          </div>
        </div>

        {/* Date */}
        <p className="text-xs sm:text-sm text-gray-500 mb-4">{segment.date}</p>

        {/* Duration and Stops */}
        {(segment.duration || segment.stops !== undefined) && (
          <div className="flex items-center space-x-3 text-xs text-gray-500 mb-3">
            {segment.duration && <span>⏱️ {formatDuration(segment.duration)}</span>}
            {segment.stops !== undefined && (
              <span>
                •{' '}
                {segment.stops === 0
                  ? 'Direct'
                  : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`}
              </span>
            )}
          </div>
        )}

        {/* Flight Times */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-800">
              {segment.departureTime}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-400">{segment.departureDate}</div>
          </div>
          <div className="text-gray-400 text-sm sm:text-base">→</div>
          <div className="text-right">
            <div className="text-lg sm:text-xl font-bold text-gray-800">{segment.arrivalTime}</div>
            <div className="text-[10px] sm:text-xs text-gray-400">{segment.arrivalDate}</div>
          </div>
        </div>

        {/* Baggage & Check-in */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">BAGGAGE</div>
            <div className="text-xs sm:text-sm font-semibold text-gray-700">{segment.baggage}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] sm:text-xs text-gray-400 font-medium">CHECK-IN</div>
            <div className="text-xs sm:text-sm font-semibold text-gray-700">{segment.checkIn}</div>
          </div>
        </div>
      </div>
    );
  };

  // If we have segments, render all of them
  if (segments && segments.length > 0) {
    return (
      <div className="block md:hidden lg:hidden">
        {/* Trip Type Badge */}
        <div className="flex items-center space-x-2 mb-3">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${tripType === 'oneway' ? 'bg-blue-100 text-blue-700' :
              tripType === 'roundtrip' ? 'bg-green-100 text-green-700' :
                'bg-purple-100 text-purple-700'
            }`}>
            {tripType === 'oneway' ? 'One Way' :
              tripType === 'roundtrip' ? 'Round Trip' :
                'Multi-City'}
          </span>
          {tripType === 'multicity' && (
            <span className="text-xs text-gray-500">{segments.length} Segments</span>
          )}
          {tripType === 'roundtrip' && <span className="text-xs text-gray-500">2 Flights</span>}
        </div>

        {/* Render all segments */}
        {segments.map((segment, index) => renderFlightCard(segment, index, segments.length))}
      </div>
    );
  }

  // Fallback: Render single flight using old props (backward compatibility)
  return (
    <div className="block md:hidden lg:hidden bg-white rounded-xl border border-[#E7E2D9] p-4 sm:p-5 mb-4">
      {/* Flight departs from... with Gradient Background */}
      <div
        className="flex justify-between items-center -mx-4 sm:-mx-5 -mt-4 sm:-mt-5 p-3 sm:p-4 rounded-t-xl mb-4"
        style={{
          background:
            'linear-gradient(90deg, rgba(219, 122, 123, 0.5) 0%, rgba(213, 127, 129, 0.5) 100%)',
          borderBottom: '1px solid #E7E2D9',
        }}
      >
        <div className="text-xs sm:text-sm text-gray-700 font-medium">
          Flight departs from {fromCity || 'N/A'}
        </div>
        {isRefundable ? (
          <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
            REFUNDABLE
          </span>
        ) : (
          <span className="text-[10px] sm:text-xs bg-red-100 text-red-700 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full font-medium">
            NON-REFUNDABLE
          </span>
        )}
      </div>

      {/* Route */}
      <div className="flex justify-between items-start mb-1">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">
          {fromCity} To {toCity}
        </h2>
        <div className="text-right">
          <div className="text-xs sm:text-sm font-semibold text-gray-800">{airline}</div>
          <div className="flex items-center justify-end space-x-1 sm:space-x-2 text-[10px] sm:text-xs text-gray-500">
            <span>{flightNumber}</span>
            <span className="text-gray-400">•</span>
            <span>{cabin}</span>
          </div>
        </div>
      </div>

      {/* Date */}
      <p className="text-xs sm:text-sm text-gray-500 mb-4">{date}</p>

      {/* Flight Times */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-lg sm:text-xl font-bold text-gray-800">{departureTime}</div>
          <div className="text-[10px] sm:text-xs text-gray-400">{departureDate}</div>
        </div>
        <div className="text-gray-400 text-sm sm:text-base">→</div>
        <div className="text-right">
          <div className="text-lg sm:text-xl font-bold text-gray-800">{arrivalTime}</div>
          <div className="text-[10px] sm:text-xs text-gray-400">{arrivalDate}</div>
        </div>
      </div>

      {/* Baggage & Check-in */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <div className="text-[10px] sm:text-xs text-gray-400 font-medium">BAGGAGE</div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">{baggage}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] sm:text-xs text-gray-400 font-medium">CHECK-IN</div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">{checkIn}</div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHeader;
