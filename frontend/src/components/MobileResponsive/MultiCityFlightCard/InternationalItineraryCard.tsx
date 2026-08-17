// InternationalItineraryCard.tsx
import React from 'react';
import { PlaneTakeoff, PlaneLanding } from 'lucide-react';

export interface InternationalCityAirport {
  city: string;
  airportCode: string;
  time: string;
  date: string;
  day: string;
}

export interface InternationalFlightLeg {
  legIndex: number;
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: InternationalCityAirport;
  to: InternationalCityAirport;
  stops: number;
  duration: string;
  price: number;
}

export interface InternationalItinerary {
  itineraryKey: string;
  totalPrice: number;
  legs: InternationalFlightLeg[];
}

interface InternationalItineraryCardProps {
  itinerary: InternationalItinerary;
  isSelecting: boolean;
  onSelect: (itinerary: InternationalItinerary) => void;
}

const InternationalItineraryCard: React.FC<InternationalItineraryCardProps> = ({
  itinerary,
  isSelecting,
  onSelect,
}) => {
  const getStopDisplay = (stops: number) => {
    if (stops === 0) return 'Non-stop';
    return `${stops} Stop${stops > 1 ? 's' : ''}`;
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

  const formatPrice = (price: number) => {
    return `₹ ${price.toLocaleString('en-IN')}`;
  };

  const renderAirlineLogo = (airlineCode: string, airline: string) => {
    const airlineLogo = airlineCode ? `/airline-logos/${airlineCode}.png` : null;

    if (airlineLogo) {
      return (
        <img
          src={airlineLogo}
          alt={airline}
          className="w-6 h-6 sm:w-8 sm:h-8 object-contain rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.className = 'text-xs font-bold text-blue-600';
              fallback.textContent = airlineCode || airline?.substring(0, 2) || 'NA';
              parent.appendChild(fallback);
            }
          }}
        />
      );
    }

    return (
      <span className="text-xs font-bold text-blue-600">
        {airlineCode || airline?.substring(0, 2) || 'NA'}
      </span>
    );
  };

  const renderFlightLeg = (
    leg: InternationalFlightLeg,
    legIndex: number,
    showDivider: boolean = true,
  ) => {
    return (
      <div className="flex-1" key={leg.flightKey || legIndex}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <span className="text-[8px] sm:text-[10px] font-bold text-primary uppercase">
              Leg {legIndex + 1}
            </span>
            {renderAirlineLogo(leg.airlineCode, leg.airline)}
            <span className="font-semibold text-gray-800 text-[10px] sm:text-xs">
              {leg.airline}
            </span>
          </div>
          <span className="text-[6px] sm:text-[7px] bg-blue-100 text-blue-700 px-1 sm:px-1.5 py-0.5 rounded-full font-medium">
            {getCabinDisplay(leg.cabinClass)}
          </span>
        </div>

        <div className="flex items-center space-x-1 mb-1 sm:mb-1.5">
          <span className="text-[8px] sm:text-[9px] text-gray-600">{leg.flightNumber}</span>
          <span className="text-gray-400 text-[8px] sm:text-[9px]">•</span>
          <span className="text-[8px] sm:text-[9px] text-gray-500">{leg.flightKey}</span>
        </div>

        <div className="mb-0.5">
          <div className="flex items-center gap-1">
            <PlaneTakeoff size={12} className="text-primary" />
            <div className="font-bold text-gray-800 text-xs sm:text-sm">{leg.from.time}</div>
          </div>
          <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pl-5">
            {leg.from.airportCode} • {leg.from.city}
          </div>
          <div className="text-[6px] sm:text-[7px] text-gray-400 pl-5">
            {leg.from.day}, {leg.from.date}
          </div>
        </div>

        <div className="relative my-0.5 sm:my-1">
          <div className="border-t border-gray-300"></div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-0.5 sm:px-1">
            <div className="text-center">
              <div className="text-[8px] sm:text-[9px] text-gray-400">{leg.duration}</div>
              <div className="text-[6px] sm:text-[7px] text-[#EF4444]">
                {getStopDisplay(leg.stops)}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right mb-0.5 sm:mb-1">
          <div className="flex items-center justify-end gap-1">
            <div className="font-bold text-gray-800 text-xs sm:text-sm">{leg.to.time}</div>
            <PlaneLanding size={12} className="text-primary" />
          </div>
          <div className="text-[8px] sm:text-[9px] text-gray-500 font-medium pr-5">
            {leg.to.airportCode} • {leg.to.city}
          </div>
          <div className="text-[6px] sm:text-[7px] text-gray-400 pr-5">
            {leg.to.day}, {leg.to.date}
          </div>
        </div>

        {showDivider && <div className="border-t border-gray-200 my-2 sm:my-3"></div>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-[#0A2662] shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-2 sm:p-3">
        {itinerary.legs.map((leg, index) => (
          <React.Fragment key={leg.flightKey || index}>
            {renderFlightLeg(leg, index, index < itinerary.legs.length - 1)}
          </React.Fragment>
        ))}

        <div className="border-t border-gray-200 my-1 sm:my-2"></div>

        <div className="flex items-center justify-between">
          <div className="text-[8px] sm:text-[9px] text-gray-500">Total Price</div>
          <div className="text-right">
            <div className="font-bold text-[#EF4444] text-sm sm:text-base">
              {formatPrice(itinerary.totalPrice)}
            </div>
            <div className="text-[6px] sm:text-[7px] text-gray-400">PER ADULT</div>
          </div>
        </div>

        <button
          onClick={() => onSelect(itinerary)}
          disabled={isSelecting}
          className={`w-full mt-1 sm:mt-2 ${
            isSelecting ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
          } text-white py-1 sm:py-1.5 rounded-md text-[8px] sm:text-[9px] font-medium transition-colors`}
        >
          {isSelecting ? 'Selecting...' : 'Select'}
        </button>
      </div>
    </div>
  );
};

export default InternationalItineraryCard;
