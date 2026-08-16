import React, { useState } from 'react';
import MultiCityRouteTabs from './MultiCityRouteTabs';
import InternationalFlightCard from '../ReturnTripFlightCard/InternationalFlightCard';
import MultiCityInternationalFlightCard from './MultiCityInternationalFlightCard';

interface InternationalCityAirport {
  city: string;
  airportCode: string;
  time: string;
  date: string;
  day: string;
}

interface InternationalFlightLeg {
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

interface InternationalItinerary {
  itineraryKey: string;
  totalPrice: number;
  legs: InternationalFlightLeg[];
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: any | null;
  selectedFareData: any | null;
  fareId: string | null;
  rulesAccepted: boolean;
  isComplete: boolean;
}

interface SearchParams {
  tripType: string;
  from?: string;
  to?: string;
  departureDate?: string;
  returnDate?: string;
  travelers: string;
  class: string;
  fareType: string;
  travelerDetails?: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
  segments?: Array<{
    from: string;
    fromCode: string;
    to: string;
    toCode: string;
    departureDate: string;
  }>;
}

interface InternationalMultiCityProps {
  itineraries: InternationalItinerary[];
  searchParams: SearchParams | null;
  cities: Array<{ from: string; to: string; date: string }>;
  routeStates: RouteSelectionState[];
  onBack: () => void;
  onSelectItinerary: (itinerary: InternationalItinerary) => void;
  isSelecting?: string | null;
  onRouteStateUpdate?: (states: RouteSelectionState[]) => void;
}

const InternationalMultiCity: React.FC<InternationalMultiCityProps> = ({
  itineraries,
  searchParams,
  cities,
  routeStates = [],
  onBack,
  onSelectItinerary,
  isSelecting,
  onRouteStateUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedItinerary, setExpandedItinerary] = useState<string | null>(null);

  const currentRouteState = routeStates.find((r) => r.routeIndex === activeTab);

  const isItinerarySelected = (itineraryKey: string) => {
    return currentRouteState?.selectedFlight?.itineraryKey === itineraryKey;
  };

  const isItineraryComplete = (itineraryKey: string) => {
    return currentRouteState?.isComplete === true &&
      currentRouteState?.selectedFlight?.itineraryKey === itineraryKey;
  };

  const isRouteComplete = currentRouteState?.isComplete || false;

  const getFilteredItineraries = () => {
    return itineraries.filter((it) => it.legs[0]?.legIndex === activeTab);
  };

  const toggleItineraryDetails = (itineraryKey: string) => {
    setExpandedItinerary(expandedItinerary === itineraryKey ? null : itineraryKey);
  };

  const currentItineraries = getFilteredItineraries();

  const flightCounts = cities.map((_, index) => {
    return itineraries.filter((it) => it.legs[0]?.legIndex === index).length;
  });

  return (
    <>
      {searchParams?.tripType?.toLowerCase() === 'domestic' && cities.length > 1 && (
        <MultiCityRouteTabs
          cities={cities}
          activeTab={activeTab}
          flightCounts={flightCounts}
          routeStates={routeStates}
          onTabChange={setActiveTab}
        />
      )}

      {searchParams?.tripType?.toLowerCase() === 'domestic' && (
        <div className="mb-4 flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Route {activeTab + 1}: {cities[activeTab]?.from} → {cities[activeTab]?.to}
            </span>
            {isRouteComplete && (
              <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Completed
              </span>
            )}
            {currentRouteState?.selectedFlight && !isRouteComplete && (
              <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                Flight selected
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400">
            {routeStates.filter((s) => s.isComplete).length} of {routeStates.length} complete
          </div>
        </div>
      )}

      <div className="space-y-3 sm:space-y-4">
        {currentItineraries.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-lg">
            <div className="text-4xl mb-3">🛫</div>
            <p className="text-gray-600">No flights available for this route</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different route or date</p>
          </div>
        ) : (
          currentItineraries.map((itinerary, index) => {
            const isExpanded = expandedItinerary === itinerary.itineraryKey;
            const selected = isItinerarySelected(itinerary.itineraryKey);
            const complete = isItineraryComplete(itinerary.itineraryKey);

            // Create a unique key using index, itineraryKey, and flight details
            const firstLeg = itinerary.legs?.[0];
            const uniqueKey = `${itinerary.itineraryKey}-${activeTab}-${index}-${firstLeg?.from?.airportCode || 'UNK'}-${firstLeg?.to?.airportCode || 'UNK'}-${firstLeg?.flightNumber || 'UNK'}`;

            // Check if this is a round-trip itinerary (exactly 2 legs)
            const isRoundTrip = itinerary.legs && itinerary.legs.length === 2;

            if (isRoundTrip) {
              // For round-trip, use InternationalFlightCard
              const onwardLeg = itinerary.legs[0];
              const returnLeg = itinerary.legs[1];

              // Ensure both legs exist before rendering
              if (!onwardLeg || !returnLeg) {
                return null;
              }

              // Map the leg data to match what InternationalFlightCard expects
              const onward = {
                airline: onwardLeg.airline,
                airlineCode: onwardLeg.airlineCode,
                flightNumber: onwardLeg.flightNumber,
                from: onwardLeg.from,
                to: onwardLeg.to,
                departureTime: onwardLeg.from?.time || '',
                arrivalTime: onwardLeg.to?.time || '',
                stops: onwardLeg.stops || 0,
                duration: onwardLeg.duration || '',
                price: onwardLeg.price || 0,
              };

              const returnFlight = {
                airline: returnLeg.airline,
                airlineCode: returnLeg.airlineCode,
                flightNumber: returnLeg.flightNumber,
                from: returnLeg.from,
                to: returnLeg.to,
                departureTime: returnLeg.from?.time || '',
                arrivalTime: returnLeg.to?.time || '',
                stops: returnLeg.stops || 0,
                duration: returnLeg.duration || '',
                price: returnLeg.price || 0,
              };

              return (
                <InternationalFlightCard
                  key={uniqueKey}
                  onward={onward}
                  return={returnFlight}
                  totalPrice={itinerary.totalPrice}
                  isExpanded={isExpanded}
                  isSelected={selected}
                  isComplete={complete}
                  isSelecting={isSelecting === itinerary.itineraryKey}
                  onToggleExpand={toggleItineraryDetails}
                  onSelect={() => onSelectItinerary(itinerary)}
                />
              );
            }

            // For multi-city (more than 2 legs or single leg), use MultiCityInternationalFlightCard
            return (
              <MultiCityInternationalFlightCard
                key={uniqueKey}
                itinerary={itinerary}
                isExpanded={isExpanded}
                isSelected={selected}
                isComplete={complete}
                isSelecting={isSelecting === itinerary.itineraryKey}
                onToggleExpand={toggleItineraryDetails}
                onSelect={onSelectItinerary}
              />
            );
          })
        )}
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        Showing {currentItineraries.length} flight{currentItineraries.length > 1 ? 's' : ''} for{' '}
        {cities[activeTab]?.from} → {cities[activeTab]?.to}
      </div>
    </>
  );
};

export default InternationalMultiCity;