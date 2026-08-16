import { useState, useRef, useEffect } from 'react';
import {
  searchOneWayFilterFlights,
  searchReturnFilterFlights,
  searchMultiCityFilterFlights,
  searchReturnFlightsPrint,
  searchMultiCityFlightsPrint,
  searchOneWayFlightsPrint,
} from '@/api/flightService.api';

import { PriceRangeSection } from '../FilterSidebar/PriceRangeSection';
import { StopsSection } from '../FilterSidebar/StopsSection';
import { AirlinesSection } from '../FilterSidebar/AirlinesSection';
import { FilterActions } from '../FilterSidebar/FilterActions';
import { FlightFilterSidebarProps } from '@/types/filterSidebar.types';
import { useFilters } from '@/hooks/useFilterSidebar.hook';
import { DepartureTimeFilterSection } from '../FilterSidebar/DepartureTimeFilterSection';
import { ArrivalTimeFilterSection } from '../FilterSidebar/ArrivalTimeFilterSection';

export default function FlightFilterSidebar({
  priceBounds,
  searchQuery,
  onFilterChange,
  onLoadingChange,
  onError,
  flightType = 'oneway',
  availableAirlines = [],
}: FlightFilterSidebarProps) {
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [openSections, setOpenSections] = useState({
    priceRange: true,
    sortBy: true,
    stops: true,
    arrivalTime: true,
    airlines: true,
    departureTime: true,
  });

  const {
    primarySort,
    secondarySort,
    selectedStops,
    minPrice,
    maxPrice,
    selectedArrivalTimes,
    selectedAirlines,
    hasChanges: hookHasChanges,
    setMinPrice,
    setMaxPrice,
    handleStopChange,
    handleAirlineChange,
    resetFilters,
  } = useFilters();

  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([]);
  const [selectedArrivalTimesState, setSelectedArrivalTimesState] = useState<string[]>([]);

  // Track initial state for change detection
  const [initialDepartureTimes] = useState<string[]>([]);
  const [initialArrivalTimes] = useState<string[]>([]);

  // Compute hasChanges including departure and arrival times
  const hasChanges = hookHasChanges ||
    selectedDepartureTimes.length !== initialDepartureTimes.length ||
    selectedDepartureTimes.some((t, i) => t !== initialDepartureTimes[i]) ||
    selectedArrivalTimesState.length !== initialArrivalTimes.length ||
    selectedArrivalTimesState.some((t, i) => t !== initialArrivalTimes[i]);

  // Reset initial states when filters are reset
  useEffect(() => {
    if (selectedDepartureTimes.length === 0 && selectedArrivalTimesState.length === 0) {
      // Reset initial states to match
    }
  }, [selectedDepartureTimes, selectedArrivalTimesState]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const resetAllFilters = async () => {
    resetFilters();
    setSelectedDepartureTimes([]);
    setSelectedArrivalTimesState([]);
    await applyFilterLogic(true);
  };

  const applyFilters = async () => {
    await applyFilterLogic(false);
  };

  const handleDepartureTimeChange = (timeId: string) => {
    setSelectedDepartureTimes((prev) => {
      if (prev.includes(timeId)) {
        return [];
      } else {
        return [timeId];
      }
    });
  };

  const handleArrivalTimeChange = (timeId: string) => {
    setSelectedArrivalTimesState((prev) => {
      if (prev.includes(timeId)) {
        return [];
      } else {
        return [timeId];
      }
    });
  };

  const applyFilterLogic = async (isReset: boolean = false) => {
    if (!searchQuery) {
      onError?.('No search query available');
      return;
    }

    setIsApplying(true);
    onLoadingChange?.(true);

    try {
      let sortBy: string | undefined;
      let sortOrder: string | undefined;

      if (!isReset) {
        if (primarySort === 'PRICE') {
          sortBy = 'price';
          sortOrder = secondarySort === 'LOW_TO_HIGH' ? 'asc' : 'desc';
        } else if (primarySort === 'STOPS_MINIMUM') {
          sortBy = 'stops';
          sortOrder = 'asc';
        } else if (primarySort === 'DURATION_MINIMUM') {
          sortBy = 'duration';
          sortOrder = 'asc';
        } else if (primarySort === 'ARRIVAL_EARLIEST') {
          sortBy = 'arrivalTime';
          sortOrder = 'asc';
        } else if (primarySort === 'DEPARTURE_EARLIEST') {
          sortBy = 'departureTime';
          sortOrder = 'asc';
        } else if (primarySort === 'AIRLINE') {
          sortBy = 'airline';
          sortOrder = secondarySort === 'A_TO_Z' ? 'asc' : 'desc';
        }
      }

      const filters: any = {};

      if (!isReset) {
        if (selectedStops.length > 0) {
          const stopValues = selectedStops.map((stop) => {
            switch (stop) {
              case 'NON_STOP':
                return 0;
              case 'ONE_STOP':
                return 1;
              case 'TWO_PLUS_STOPS':
                return 2;
              default:
                return 0;
            }
          });
          filters.stops = stopValues;
        }

        if (minPrice > 0 || maxPrice < 100000) {
          filters.priceRange = { min: minPrice, max: maxPrice };
        }

        if (selectedAirlines.length > 0) {
          filters.airlines = selectedAirlines;
        }

        // Departure time filter
        if (selectedDepartureTimes.length > 0) {
          const timeRange = selectedDepartureTimes[0];
          let departureRange = null;

          switch (timeRange) {
            case 'MORNING':
              departureRange = { start: '06:00', end: '12:00' };
              break;
            case 'AFTERNOON':
              departureRange = { start: '12:00', end: '18:00' };
              break;
            case 'EVENING':
              departureRange = { start: '18:00', end: '21:00' };
              break;
            case 'NIGHT':
              departureRange = { start: '21:00', end: '06:00' };
              break;
          }

          if (departureRange) {
            filters.departureTimeRange = departureRange;
          }
        }

        // Arrival time filter
        if (selectedArrivalTimesState.length > 0) {
          const timeRange = selectedArrivalTimesState[0];
          let arrivalRange = null;

          switch (timeRange) {
            case 'MORNING':
              arrivalRange = { start: '06:00', end: '12:00' };
              break;
            case 'AFTERNOON':
              arrivalRange = { start: '12:00', end: '18:00' };
              break;
            case 'EVENING':
              arrivalRange = { start: '18:00', end: '21:00' };
              break;
            case 'NIGHT':
              arrivalRange = { start: '21:00', end: '06:00' };
              break;
          }

          if (arrivalRange) {
            filters.arrivalTimeRange = arrivalRange;
          }
        }
      }

      const filterPayload = {
        ...searchQuery,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };

      let response;
      if (flightType === 'return') {
        response = await searchReturnFilterFlights(filterPayload, sortBy, sortOrder);
        sessionStorage.setItem('returnFlightSessionId', response.data.sessionId);
      } else if (flightType === 'multicity') {
        response = await searchMultiCityFilterFlights(filterPayload, sortBy, sortOrder);
        sessionStorage.setItem('multiCitySessionId', response.data.sessionId);
      } else {
        response = await searchOneWayFilterFlights(filterPayload, sortBy, sortOrder);
        sessionStorage.setItem('onewayFlightSessionId', response.data.sessionId);
      }

      if (response.success === true) {
        if (
          response.data?.flights &&
          Array.isArray(response.data.flights) &&
          response.data.flights[0]?.itineraryKey
        ) {
          onFilterChange({
            type: 'international',
            data: {
              itineraries: response.data.flights,
              sessionId: response.data.sessionId,
            },
          });
        } else if (response.data?.flights?.roundTrips) {
          onFilterChange({
            type: 'international',
            data: {
              roundTrips: response.data.flights.roundTrips,
              sessionId: response.data.sessionId,
            },
          });
        } else if (flightType === 'return') {
          onFilterChange({
            type: 'domestic',
            data: {
              onwardFlights: response.data?.flights?.onward || [],
              returnFlights: response.data?.flights?.return || [],
            },
          });
        } else {
          onFilterChange(response.data?.flights || []);
        }
      } else {
        onError?.(response.message || 'Failed to apply filters');
      }
    } catch (error: any) {
      console.error('Error applying filters:', error);
      onError?.(error.message || 'An error occurred while applying filters');
    } finally {
      setIsApplying(false);
      onLoadingChange?.(false);
    }
  };

  const handlePrintData = async () => {
    if (!searchQuery) {
      onError?.('No search query available');
      return;
    }

    setIsPrinting(true);

    try {
      let response;

      if (flightType === 'return') {
        response = await searchReturnFlightsPrint(searchQuery);
      } else if (flightType === 'multicity') {
        response = await searchMultiCityFlightsPrint(searchQuery);
      } else {
        response = await searchOneWayFlightsPrint(searchQuery);
      }

      const blob = response?.data;

      if (blob && blob.size > 0) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flight-search-results-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        onError?.('Failed to generate PDF: Empty response');
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      onError?.(error.message || 'Failed to generate PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      ref={filterBarRef}
      className="w-full lg:w-72 xl:w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 h-fit sticky top-24 overflow-hidden min-w-0 max-w-full"
    >
      <div className="w-full overflow-x-hidden">
        <FilterActions
          isApplying={isApplying}
          isPrinting={isPrinting}
          hasChanges={hasChanges}
          onReset={resetAllFilters}
          onApply={applyFilters}
          onPrint={handlePrintData}
        />

        <PriceRangeSection
          isOpen={openSections.priceRange}
          onToggle={() => toggleSection('priceRange')}
          dataBounds={priceBounds}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
        />

        <DepartureTimeFilterSection
          isOpen={openSections.departureTime}
          onToggle={() => toggleSection('departureTime')}
          selectedTimes={selectedDepartureTimes}
          onTimeChange={handleDepartureTimeChange}
        />

        <ArrivalTimeFilterSection
          isOpen={openSections.arrivalTime}
          onToggle={() => toggleSection('arrivalTime')}
          selectedTimes={selectedArrivalTimesState}
          onTimeChange={handleArrivalTimeChange}
        />

        <StopsSection
          isOpen={openSections.stops}
          onToggle={() => toggleSection('stops')}
          selectedStops={selectedStops}
          onStopChange={handleStopChange}
        />

        <AirlinesSection
          isOpen={openSections.airlines}
          onToggle={() => toggleSection('airlines')}
          selectedAirlines={selectedAirlines}
          availableAirlines={availableAirlines}
          onAirlineChange={handleAirlineChange}
        />
      </div>
    </div>
  );
}