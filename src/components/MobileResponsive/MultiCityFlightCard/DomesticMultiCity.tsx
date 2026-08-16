import React, { useMemo, useState } from 'react';
import MultiCityRouteTabs from './MultiCityRouteTabs';
import DomesticFlightCard, { DomesticFlightSegment } from './DomesticFlightCard';
import { groupAndMap } from '@/features/flights/utils/groupFareVariants';

interface RouteData {
  legIndex: number;
  flights: DomesticFlightSegment[];
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: DomesticFlightSegment | null;
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

interface DomesticMultiCityProps {
  flightsData: RouteData[];
  searchParams: SearchParams | null;
  cities: Array<{ from: string; to: string; date: string }>;
  routeStates: RouteSelectionState[];
  onBack: () => void;
  onSelectFlight: (flight: DomesticFlightSegment, routeIndex: number) => void;
  isSelecting?: string | null;
  onRouteStateUpdate?: (states: RouteSelectionState[]) => void;
}

const DomesticMultiCity: React.FC<DomesticMultiCityProps> = ({
  flightsData,
  searchParams,
  cities,
  routeStates = [],
  onBack,
  onSelectFlight,
  isSelecting,
  onRouteStateUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);

  const currentRouteState = routeStates.find((r) => r.routeIndex === activeTab);

  const isFlightSelected = (flightKey: string) => {
    return currentRouteState?.selectedFlight?.flightKey === flightKey;
  };

  const isFlightComplete = (flightKey: string) => {
    return currentRouteState?.isComplete === true &&
      currentRouteState?.selectedFlight?.flightKey === flightKey;
  };

  const isRouteComplete = currentRouteState?.isComplete || false;

  // TripJack returns one entry per fare group, so each leg's list carries
  // near-duplicate cards until they are folded back together.
  const groupedByLeg = useMemo(() => {
    const byLeg = new Map<number, DomesticFlightSegment[]>();
    flightsData.forEach((route: any, index: number) => {
      const legIndex = route?.legIndex ?? index;
      byLeg.set(
        legIndex,
        groupAndMap<any, DomesticFlightSegment>(route?.flights ?? [], (f) => f),
      );
    });
    return byLeg;
  }, [flightsData]);

  const getFilteredFlights = () => groupedByLeg.get(activeTab) ?? [];

  const toggleFlightDetails = (flightKey: string) => {
    setExpandedFlight(expandedFlight === flightKey ? null : flightKey);
  };

  const currentFlights = getFilteredFlights();

  // Count what the tab will actually show, not the ungrouped fare rows.
  const flightCounts = cities.map((_, index) => (groupedByLeg.get(index) ?? []).length);

  return (
    <>
      <MultiCityRouteTabs
        cities={cities}
        activeTab={activeTab}
        flightCounts={flightCounts}
        routeStates={routeStates}
        onTabChange={setActiveTab}
      />

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

      <div className="space-y-3 sm:space-y-4">
        {currentFlights.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-lg">
            <div className="text-4xl mb-3">🛫</div>
            <p className="text-gray-600">No flights available for this route</p>
            <p className="text-xs text-gray-400 mt-1">Try selecting a different route or date</p>
          </div>
        ) : (
          currentFlights.map((flight) => {
            const isExpanded = expandedFlight === flight.flightKey;
            const uniqueKey = `${flight.flightKey}-${flight.airlineCode}-${flight.from.airportCode}-${flight.to.airportCode}-${flight.from.time}`;
            const selected = isFlightSelected(flight.flightKey);
            const complete = isFlightComplete(flight.flightKey);

            return (
              <DomesticFlightCard
                key={uniqueKey}
                flight={flight}
                isExpanded={isExpanded}
                isSelected={selected}
                isComplete={complete}
                isSelecting={isSelecting === flight.flightKey}
                onToggleExpand={toggleFlightDetails}
                onSelect={onSelectFlight}
                routeIndex={activeTab}
              />
            );
          })
        )}
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        Showing {currentFlights.length} flight{currentFlights.length > 1 ? 's' : ''} for{' '}
        {cities[activeTab]?.from} → {cities[activeTab]?.to}
      </div>
    </>
  );
};

export default DomesticMultiCity;
