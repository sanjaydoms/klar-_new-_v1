import React, { useState } from 'react';
import { PlaneTakeoff, PlaneLanding, Luggage, Loader } from 'lucide-react';
import FareVariantRows from '@/features/flights/components/FareVariantRows';

/** Defined here and imported by the list, so the two cannot drift apart. */
export interface Flight {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabin: string;
  departure: string;
  origin: string;
  originTerminal: string;
  duration: string;
  stops: string;
  arrival: string;
  destination: string;
  destinationTerminal: string;
  aircraft: string;
  /** Normalizer label ("Refundable" / "Non-Refundable"), '' when unstated. */
  refundable: string;
  baggage: string;
  price: string;
  priceValue: number;
  fareIdentifier?: string | undefined;
  perAdult: string;
  flightKey?: string | undefined;
  /** Other fare groups of the same physical flight, cheapest first. */
  variants?: Flight[];
}

interface FlightCardProps {
  flight: Flight;
  onSelect: (flight: Flight) => void;
  renderAirlineLogo: (airlineCode: string, airline: string) => React.ReactNode;
  isSelecting?: boolean;
}

const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  onSelect,
  renderAirlineLogo,
  isSelecting = false,
}) => {
  const fares = flight.variants && flight.variants.length > 0 ? flight.variants : [flight];
  const [fareIndex, setFareIndex] = useState(0);
  // The chosen fare drives the price shown and the flightKey the fare page loads.
  const activeFare = fares[Math.min(fareIndex, fares.length - 1)] ?? flight;

  return (
    <div className="bg-white rounded-xl border border-[#0A2662] shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <div className="p-3 sm:p-5">
        {/* Airline Info */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {renderAirlineLogo(flight.airlineCode, flight.airline)}
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-800 text-sm sm:text-base">
                {flight.airline}
              </span>
              <span className="text-xs text-gray-500">
                {flight.flightNumber} • {flight.cabin}
                {flight.aircraft && ` • ${flight.aircraft}`}
              </span>
            </div>
          </div>

          {/* Absent means the fare stated none — say nothing rather than guess. */}
          {activeFare.refundable && (
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium ${
                /non-refundable/i.test(activeFare.refundable)
                  ? 'bg-red-100 text-red-700'
                  : /partially/i.test(activeFare.refundable)
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700'
              }`}
            >
              {activeFare.refundable}
            </span>
          )}
        </div>

        {/* Flight Route */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div>
            <div className="flex items-center space-x-1">
              <PlaneTakeoff className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <div className="font-bold text-gray-800 text-lg sm:text-xl">{flight.departure}</div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-700 mt-0.5 ml-5 sm:ml-6">
              {flight.origin}
              {flight.originTerminal && (
                <span className="ml-1 text-[10px] font-medium text-gray-500">
                  {flight.originTerminal}
                </span>
              )}
            </div>
          </div>

          <div className="text-center flex-1 px-2 sm:px-4">
            <div className="text-[10px] sm:text-xs text-gray-400">{flight.duration}</div>
            <div className="relative my-1 sm:my-1.5">
              <div className="border-t border-gray-300"></div>
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
              </div>
            </div>
            <div className="text-[10px] sm:text-xs text-[#EF4444]">{flight.stops}</div>
          </div>

          <div>
            <div className="flex items-center space-x-1">
              <PlaneLanding className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <div className="font-bold text-gray-800 text-lg sm:text-xl">{flight.arrival}</div>
            </div>
            <div className="text-base sm:text-lg font-bold text-gray-700 mt-0.5 ml-5 sm:ml-6">
              {flight.destination}
              {flight.destinationTerminal && (
                <span className="ml-1 text-[10px] font-medium text-gray-500">
                  {flight.destinationTerminal}
                </span>
              )}
            </div>
          </div>
        </div>

        <FareVariantRows
          fares={fares.map((f) => ({ ...f, price: f.priceValue }))}
          activeIndex={fareIndex}
          onSelectFare={setFareIndex}
        />

        <div className="border-t border-gray-200 my-2 sm:my-3"></div>

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div>
            {activeFare.baggage && (
              <div className="flex items-center space-x-1.5">
                <Luggage className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600" />
                <span className="text-xs sm:text-sm text-gray-600">{activeFare.baggage}</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right">
              <div className="font-bold text-[#EF4444] text-lg sm:text-xl">{activeFare.price}</div>
              <div className="text-[10px] sm:text-xs text-gray-400">{flight.perAdult}</div>
            </div>
            <button
              onClick={() => onSelect(activeFare)}
              disabled={isSelecting}
              className={`bg-primary hover:bg-primary/90 text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                isSelecting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSelecting ? (
                <div className="flex items-center space-x-1">
                  <Loader className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : (
                'Select'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
