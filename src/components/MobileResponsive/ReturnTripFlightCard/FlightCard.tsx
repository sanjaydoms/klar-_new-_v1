import React from 'react';
import { PlaneTakeoff, PlaneLanding, Check } from 'lucide-react';
import { Flight } from '@/types/returnMobileFlight.type';

interface FlightCardProps {
  flight: Flight;
  label: string;
  isSelected?: boolean;
  onSelect?: (flight: Flight, label: string) => void;
}

const FlightCard: React.FC<FlightCardProps> = ({ flight, label, isSelected = false, onSelect }) => {
  const getStopDisplay = (flight: Flight) => {
    if (flight.stops === 0) return 'Non-stop';
    if (flight.stopDetails?.displayString) return flight.stopDetails.displayString;
    return `${flight.stops} Stop${flight.stops > 1 ? 's' : ''}`;
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined) return 'Price unavailable';
    return `₹ ${price.toLocaleString('en-IN')}`;
  };

  const getCabinDisplay = (cabinClass: string) => {
    const cabinMap: Record<string, string> = {
      ECONOMY: 'Economy',
      PREMIUM_ECONOMY: 'Premium Economy',
      BUSINESS: 'Business',
      FIRST: 'First Class',
    };
    return cabinMap[cabinClass] || cabinClass;
  };

  const handleSelectClick = () => {
    if (onSelect && !isSelected) {
      onSelect(flight, label);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border ${isSelected ? 'border-green-500 border-2' : 'border-[#0A2662]'} shadow-lg overflow-hidden hover:shadow-xl transition-all flex-1 relative`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Check size={10} />
          SELECTED
        </div>
      )}
      <div className="p-2 sm:p-2.5">
        <div className="text-[8px] sm:text-[10px] font-bold text-primary mb-0.5 uppercase">
          {label}
        </div>

        <div className="flex items-center justify-between mb-0.5">
          <div>
            <span className="font-semibold text-gray-800 text-[10px] sm:text-xs">
              {flight.airline}
            </span>
            <span className="text-[8px] sm:text-[9px] text-gray-500 ml-1">
              ({flight.airlineCode})
            </span>
          </div>
          <span className="text-[6px] sm:text-[7px] bg-blue-100 text-blue-700 px-1 sm:px-1.5 py-0.5 rounded-full font-medium">
            {getCabinDisplay(flight.cabinClass)}
          </span>
        </div>

        <div className="flex items-center space-x-1 mb-1 sm:mb-1.5">
          <span className="text-[8px] sm:text-[9px] text-gray-600">{flight.flightNumber}</span>
          <span className="text-gray-400 text-[8px] sm:text-[9px]">•</span>
          <span className="text-[8px] sm:text-[9px] text-gray-600">{flight.flightKey}</span>
        </div>

        <div className="mb-0.5">
          <div className="flex items-center gap-1">
            <PlaneTakeoff size={12} className="text-primary" />
            <div className="font-bold text-gray-800 text-xs sm:text-sm">{flight.from.time}</div>
          </div>
          <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pl-5">
            {flight.from.airportCode} • {flight.from.city}
          </div>
          <div className="text-[6px] sm:text-[7px] text-gray-400 pl-5">
            {flight.from.day}, {flight.from.date}
          </div>
        </div>

        <div className="relative my-0.5 sm:my-1">
          <div className="border-t border-gray-300"></div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 sm:px-1">
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] text-gray-400">{flight.duration}</div>
              <div className="text-[6px] sm:text-[7px] text-[#EF4444]">
                {getStopDisplay(flight)}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right mb-0.5 sm:mb-1">
          <div className="flex items-center justify-end gap-1">
            <div className="font-bold text-gray-800 text-xs sm:text-sm">{flight.to.time}</div>
            <PlaneLanding size={12} className="text-primary" />
          </div>
          <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pr-5">
            {flight.to.airportCode} • {flight.to.city}
          </div>
          <div className="text-[6px] sm:text-[7px] text-gray-400 pr-5">
            {flight.to.day}, {flight.to.date}
          </div>
        </div>

        <div className="border-t border-gray-200 my-0.5 sm:my-1"></div>

        <div className="flex items-center justify-end">
          <div className="text-right">
            <div className="font-bold text-[#EF4444] text-xs sm:text-sm">
              {formatPrice(flight.price)}
            </div>
            <div className="text-[6px] sm:text-[7px] text-gray-400">PER ADULT</div>
          </div>
        </div>

        <button
          onClick={handleSelectClick}
          disabled={isSelected}
          className={`w-full mt-0.5 sm:mt-1 ${isSelected ? 'bg-green-500 cursor-default' : 'bg-primary hover:bg-primary/90'} text-white py-0.5 rounded-md text-[8px] sm:text-[9px] font-medium transition-colors`}
        >
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
};

export default FlightCard;
