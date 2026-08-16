import { Plane, Luggage, Briefcase } from 'lucide-react';
import { Flight, LocationInfo } from '../../types/types.returnFlight';

interface PairedFlightCardProps {
  flight: Flight;
  type: 'onward' | 'return';
  isSelected: boolean;
  onSelect: () => void;
  onViewDetails: (flight: Flight) => void;
  fromLocation: LocationInfo;
  toLocation: LocationInfo;
  departureDate?: string;
  returnDate?: string;
  onSelectFlight?: (flight: Flight, type: 'onward' | 'return') => void;
}

export default function FlightCard({
  flight,
  type,
  isSelected,
  onSelect,
  onViewDetails,
  fromLocation,
  toLocation,
  departureDate,
  returnDate,
  onSelectFlight,
}: PairedFlightCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}H${mins}M`;
  };

  const getStopsText = (stops: number) => {
    if (stops === 0) return 'Non-stop';
    if (stops === 1) return '1 Stop';
    return `${stops} Stops`;
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const travelDate = type === 'onward' ? departureDate : returnDate;

  return (
    <div
      onClick={() => onSelect()}
      className={`bg-white rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-md ${
        isSelected ? 'border-2 border-blue-500 bg-blue-50' : 'border border-gray-200'
      }`}
    >
      {/* Main Content */}
      <div className="p-4">
        {/* Route Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{fromLocation.city}</span>
            <span className="text-gray-400">→</span>
            <span className="font-bold text-gray-900">{toLocation.city}</span>
          </div>
          {/* <div className="text-xs text-gray-500">
                        {travelDate && formatDate(travelDate)}
                    </div> */}
        </div>

        {/* Airline and Basic Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="font-bold text-gray-900">{flight.airline}</div>
            <div className="text-xs text-gray-500">{flight.flightNumber}</div>
          </div>
          <div className="text-xs text-gray-500">{flight.class}</div>
        </div>

        {/* Flight Route */}
        <div className="flex items-center justify-between mb-3">
          {/* Departure */}
          <div className="flex-1">
            <div className="text-xl font-bold text-gray-900">
              {formatTime(flight.departure.time)}
            </div>
            <div className="text-sm text-gray-600">{flight.departure.airport}</div>
          </div>

          {/* Duration & Stops */}
          <div className="flex-1 text-center">
            <div className="text-xs text-gray-500 mb-1">{formatDuration(flight.duration)}</div>
            <div className="text-xs font-medium text-gray-600">{getStopsText(flight.stops)}</div>
          </div>

          {/* Arrival */}
          <div className="flex-1 text-right">
            <div className="text-xl font-bold text-gray-900">{formatTime(flight.arrival.time)}</div>
            <div className="text-sm text-gray-600">{flight.arrival.airport}</div>
          </div>
        </div>

        {/* Price and Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <div className="text-xs text-gray-500">Price</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">
                {flight.currency || '₹'} {flight.price?.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400">PER ADULT</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(flight);
              }}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-all"
            >
              Flight Details
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();

                // A call to getFlightDetailsBySegmentId sat here. Its result was
                // logged and thrown away, and it hit /api/flights/segment/:id —
                // a route no flight-service router registers — so it only ever
                // delayed selection by a failed round trip.

                // Call the onSelect function to update UI
                onSelect();

                // Call the API function if provided
                if (onSelectFlight) {
                  onSelectFlight(flight, type);
                }
              }}
              className={`px-4 py-1.5 text-sm font-medium rounded transition-all cursor-pointer ${
                isSelected ? 'bg-gray-800 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          </div>
        </div>

        {/* Baggage Info */}
        {(flight.baggage?.cabin || flight.baggage?.checkin) && (
          <div className="flex items-center gap-3 mt-3 pt-2 border-t border-gray-100">
            {flight.baggage?.cabin && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Briefcase size={12} />
                {flight.baggage.cabin}
              </div>
            )}
            {flight.baggage?.checkin && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Luggage size={12} />
                {flight.baggage.checkin}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
