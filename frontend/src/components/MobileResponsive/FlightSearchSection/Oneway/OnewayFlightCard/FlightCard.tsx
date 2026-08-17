import React, { useState } from 'react';
import { Heart, Loader, Luggage, PlaneTakeoff } from 'lucide-react';
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
  originCity?: string | undefined;
  departureDate?: string | undefined;
  duration: string;
  stops: string;
  arrival: string;
  destination: string;
  destinationTerminal: string;
  destinationCity?: string | undefined;
  arrivalDate?: string | undefined;
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
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_-24px_rgba(15,30,77,0.5)] transition-shadow hover:shadow-md">
      <button
        type="button"
        aria-label="Save to wishlist"
        className="absolute right-3 top-3 text-gray-300 transition-colors hover:text-[var(--color-brand-red)]"
      >
        <Heart className="h-4.5 w-4.5" />
      </button>
      <div className="p-4">
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

        </div>

        {/* Flight Route */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-primary">{flight.departure}</div>
              <div className="mt-0.5 text-sm font-semibold text-primary">
                {flight.origin}
                {flight.originTerminal && (
                  <span className="ml-1 text-[10px] font-medium text-gray-400">
                    {flight.originTerminal}
                  </span>
                )}
              </div>
              {flight.originCity && (
                <div className="text-[11px] text-gray-500">{flight.originCity}</div>
              )}
              {flight.departureDate && (
                <div className="text-[11px] text-gray-500">{flight.departureDate}</div>
              )}
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-primary">{flight.arrival}</div>
              <div className="mt-0.5 text-sm font-semibold text-primary">
                {flight.destination}
                {flight.destinationTerminal && (
                  <span className="ml-1 text-[10px] font-medium text-gray-400">
                    {flight.destinationTerminal}
                  </span>
                )}
              </div>
              {flight.destinationCity && (
                <div className="text-[11px] text-gray-500">{flight.destinationCity}</div>
              )}
              {flight.arrivalDate && (
                <div className="text-[11px] text-gray-500">{flight.arrivalDate}</div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-col items-center">
            <div className="text-[11px] text-gray-500">{flight.duration}</div>
            <div className="mt-1 flex w-full items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="flex-1 border-t border-dashed border-gray-300" />
              <PlaneTakeoff className="mx-1 h-3.5 w-3.5 rotate-45 text-primary" />
              <span className="flex-1 border-t border-dashed border-gray-300" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
            <div className="mt-1 text-[11px] font-medium text-[var(--color-brand-red)]">
              {flight.stops}
            </div>
          </div>
        </div>

        <FareVariantRows
          fares={fares.map((f) => ({ ...f, price: f.priceValue }))}
          activeIndex={fareIndex}
          onSelectFare={setFareIndex}
        />

        <div className="my-3 border-t border-border"></div>

        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            {activeFare.refundable && (
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  /non-refundable/i.test(activeFare.refundable)
                    ? 'bg-red-50 text-red-700'
                    : /partially/i.test(activeFare.refundable)
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-green-50 text-green-700'
                }`}
              >
                {activeFare.refundable}
              </span>
            )}
            {activeFare.baggage && (
              <div className="flex items-center gap-1.5">
                <Luggage className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-600">{activeFare.baggage}</span>
              </div>
            )}
          </div>

          <div className="flex w-[46%] flex-col items-end gap-2">
            <div className="text-right">
              <div className="text-lg font-bold text-primary">{activeFare.price}</div>
              <div className="text-[10px] text-gray-500">{flight.perAdult}</div>
            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-border py-2 text-xs font-medium text-primary transition-colors hover:bg-secondary"
            >
              View Details
            </button>
            <button
              onClick={() => onSelect(activeFare)}
              disabled={isSelecting}
              className={`w-full rounded-lg bg-primary py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 ${
                isSelecting ? 'cursor-not-allowed opacity-70' : ''
              }`}
            >
              {isSelecting ? (
                <span className="flex items-center justify-center gap-1">
                  <Loader className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
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
