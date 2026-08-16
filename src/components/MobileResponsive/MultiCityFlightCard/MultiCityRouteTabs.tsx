// MultiCityRouteTabs.tsx
import React from 'react';

interface MultiCityRouteTabsProps {
  cities: Array<{ from: string; to: string; date: string }>;
  activeTab: number;
  flightCounts: number[];
  routeStates?: RouteSelectionState[];
  onTabChange: (index: number) => void;
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: any | null;
  selectedFareData: any | null;
  fareId: string | null;
  rulesAccepted: boolean;
  isComplete: boolean;
}

interface RouteSelectionState {
  routeIndex: number;
  selectedFlight: any | null;
  selectedFareData: any | null;
  fareId: string | null;
  rulesAccepted: boolean;
  isComplete: boolean;
}

const MultiCityRouteTabs: React.FC<MultiCityRouteTabsProps> = ({
  cities,
  activeTab,
  flightCounts,
  routeStates = [],
  onTabChange,
}) => {
  return (
    <div className="flex flex-nowrap gap-1 sm:gap-2 mb-4 overflow-x-auto pb-1">
      {cities.map((city, index) => {
        const flightCount = flightCounts[index] || 0;
        const isComplete = routeStates[index]?.isComplete || false;
        const isActive = activeTab === index;

        return (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
              isActive
                ? 'bg-primary text-white shadow-md'
                : isComplete // NEW condition
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
            }`}
          >
            <span className="font-semibold">{city.from}</span>
            <span className={isActive ? 'text-white' : 'text-gray-400'}>→</span>
            <span className="font-semibold">{city.to}</span>
            <span className="text-[10px] opacity-75">({flightCount})</span>
            {isComplete && ( // NEW
              <span className="text-green-600 text-xs">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default MultiCityRouteTabs;
