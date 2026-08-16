import React from 'react';

export interface DomesticFlightSegment {
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  to: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  stops: number;
  duration: string;
  price: number;
}

interface DomesticFlightCardProps {
  flight: DomesticFlightSegment;
  isExpanded: boolean;
  isSelected: boolean;
  isComplete: boolean;
  isSelecting: boolean;
  routeIndex: number;
  onToggleExpand: (flightKey: string) => void;
  onSelect: (flight: DomesticFlightSegment, routeIndex: number) => void;
}

const DomesticFlightCard: React.FC<DomesticFlightCardProps> = ({
  flight,
  isExpanded,
  isSelecting,
  isSelected,
  isComplete,
  routeIndex,
  onToggleExpand,
  onSelect,
}) => {
  const stopsText =
    flight.stops === 0 ? 'Non-stop' : `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`;

  const renderAirlineLogo = (airlineCode: string, airline: string) => {
    const airlineLogo = airlineCode ? `/airline-logos/${airlineCode}.png` : null;

    if (airlineLogo) {
      return (
        <img
          src={airlineLogo}
          alt={airline}
          className="w-10 h-10 object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.className = 'text-sm font-bold text-blue-600';
              fallback.textContent = airlineCode || airline?.substring(0, 2) || 'NA';
              parent.appendChild(fallback);
            }
          }}
        />
      );
    }

    return (
      <span className="text-sm font-bold text-blue-600">
        {airlineCode || airline?.substring(0, 2) || 'NA'}
      </span>
    );
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
        isSelected ? 'border-green-500' : isComplete ? 'border-green-300' : 'border-gray-200'
      }`}
    >
      <div className="p-3 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {renderAirlineLogo(flight.airlineCode, flight.airline)}
            <div>
              <div className="font-semibold text-gray-800 text-sm sm:text-base">
                {flight.airline}
              </div>
              <div className="text-xs text-gray-500">{flight.flightNumber}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] sm:text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
              {flight.cabinClass}
            </span>
            {flight.stops === 0 && (
              <span className="text-[10px] sm:text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full font-medium">
                Direct
              </span>
            )}
            {isSelected && isComplete && (
              <span className="text-[10px] sm:text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                ✓ Complete
              </span>
            )}
            {isSelected && !isComplete && (
              <span className="text-[10px] sm:text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                Selected
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="font-bold text-gray-800 text-lg sm:text-xl">{flight.from.time}</div>
            <div className="text-xs text-gray-600 font-medium">{flight.from.airportCode}</div>
            <div className="text-[10px] text-gray-400">{flight.from.city}</div>
            <div className="text-[10px] text-gray-400">{flight.from.date}</div>
          </div>

          <div className="flex-1 text-center px-2">
            <div className="text-xs text-gray-500 font-medium">{flight.duration}</div>
            <div className="relative my-2">
              <div className="border-t border-gray-300 w-full"></div>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-2 h-2 bg-[#EF4444] rounded-full"></div>
              </div>
            </div>
            <div className="text-[10px] text-[#EF4444] font-medium">{stopsText}</div>
          </div>

          <div className="flex-1 text-right">
            <div className="font-bold text-gray-800 text-lg sm:text-xl">{flight.to.time}</div>
            <div className="text-xs text-gray-600 font-medium">{flight.to.airportCode}</div>
            <div className="text-[10px] text-gray-400">{flight.to.city}</div>
            <div className="text-[10px] text-gray-400">{flight.to.date}</div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onToggleExpand(flight.flightKey)}
              className="text-xs text-[#B01616] hover:underline flex items-center"
            >
              {isExpanded ? 'Hide Details ▲' : 'Flight Details ▼'}
            </button>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="font-bold text-[#EF4444] text-lg sm:text-xl">
                  ₹ {flight.price.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400">PER ADULT</div>
              </div>
              <button
                onClick={() => onSelect(flight, routeIndex)}
                disabled={isSelecting || isComplete}
                className={`px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors shadow-md hover:shadow-lg ${
                  isComplete
                    ? 'bg-green-500 text-white cursor-default'
                    : isSelecting
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary hover:bg-primary/85 text-white'
                }`}
              >
                {isComplete ? '✓ Done' : isSelecting ? 'Selecting...' : 'Select'}
              </button>
            </div>
          </div>

          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Flight Key:</span>
                  <span className="ml-1 text-gray-700">{flight.flightKey}</span>
                </div>
                <div>
                  <span className="text-gray-500">Airline Code:</span>
                  <span className="ml-1 text-gray-700">{flight.airlineCode}</span>
                </div>
                <div>
                  <span className="text-gray-500">Departure Day:</span>
                  <span className="ml-1 text-gray-700">{flight.from.day}</span>
                </div>
                <div>
                  <span className="text-gray-500">Arrival Day:</span>
                  <span className="ml-1 text-gray-700">{flight.to.day}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Route:</span>
                  <span className="ml-1 text-gray-700">
                    {flight.from.city} ({flight.from.airportCode}) → {flight.to.city} (
                    {flight.to.airportCode})
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DomesticFlightCard;
