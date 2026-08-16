import { Plane, Loader2 } from 'lucide-react';
import { Flight } from '../../types/types.returnFlight';
import FlightCard from './FlightCard';

interface FlightListProps {
  title: string;
  flights: Flight[];
  selectedFlight: Flight | null;
  onSelectFlight: (flight: Flight) => void;
  onDeselectFlight: () => void;
  onViewDetails: (flight: Flight) => void;
  fromCode: string;
  toCode: string;
  date: string | undefined;
  isLoading?: boolean;
  onFareRuleLoaded?: (fareRuleData: any, flightType: string, fareId: string) => void;
  isReturnFlight?: boolean;
  type?: 'departure' | 'return';
}

export default function FlightList({
  title,
  flights,
  selectedFlight,
  onSelectFlight,
  onDeselectFlight,
  onViewDetails,
  fromCode,
  toCode,
  date,
  isLoading = false,
  onFareRuleLoaded,
  isReturnFlight = false,
}: FlightListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-gray-500">Loading {title.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (!flights || flights.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 h-full flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <Plane className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No {title.toLowerCase()} found</p>
          <p className="text-xs text-gray-400 mt-1">Try different dates or destinations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">
            {fromCode} → {toCode}
          </p>
        </div>
        <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
          📅{' '}
          {date
            ? new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Date not set'}
        </div>
      </div>

      {/* Scrollable flight cards */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-hide">
        {flights.map((flight, index) => (
          <FlightCard
            key={`${flight.airlineCode}-${flight.flightNumber}-${flight.departure?.time}-${index}`}
            flight={flight}
            isSelected={
              selectedFlight?.flightId === flight.flightId || selectedFlight?.id === flight.id
            }
            onSelect={() => onSelectFlight(flight)}
            onDeselect={onDeselectFlight}
            onViewDetails={() => onViewDetails(flight)}
            type={title === 'Departure Flights' ? 'departure' : 'return'}
            onFareRuleLoaded={onFareRuleLoaded}
            isReturnFlightSearch={isReturnFlight}
          />
        ))}
      </div>
    </div>
  );
}
