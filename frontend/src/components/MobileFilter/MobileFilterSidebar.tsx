import { useState, useRef, useEffect } from 'react';
import { X, Filter } from 'lucide-react';
import {
  searchOneWayFilterFlights,
  searchReturnFilterFlights,
  searchMultiCityFilterFlights,
} from '@/api/flightService.api';
import { MobilePriceRangeSection } from './MobilePriceRangeSection';
import { MobileStopsSection } from './MobileStopsSection';
import { MobileAirlinesSection } from './MobileAirlinesSection';
import { MobileFilterActions } from './MobileFilterActions';
import { useFilters } from '@/hooks/useFilterSidebar.hook';
import { MobileDepartureTimeFilterSection } from './MobileDepartureTimeFilterSection';
import { MobileArrivalTimeFilterSection } from './MobileArrivalTimeFilterSection';

interface MobileFilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: any;
  onFilterChange: (data: any) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (error: string) => void;
  flightType: string;
  availableAirlines: any[];
}

export default function MobileFilterSidebar({
  isOpen, // ✅ This comes from parent
  onClose, // ✅ This closes the filter
  searchQuery,
  onFilterChange,
  onLoadingChange,
  onError,
  flightType = 'oneway',
  availableAirlines = [],
}: MobileFilterSidebarProps) {
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
  const [initialDepartureTimes] = useState<string[]>([]);
  const [initialArrivalTimes] = useState<string[]>([]);

  const hasChanges = hookHasChanges ||
    selectedDepartureTimes.length !== initialDepartureTimes.length ||
    selectedDepartureTimes.some((t, i) => t !== initialDepartureTimes[i]) ||
    selectedArrivalTimesState.length !== initialArrivalTimes.length ||
    selectedArrivalTimesState.some((t, i) => t !== initialArrivalTimes[i]);

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
    onClose(); // ✅ Close filter after applying
  };

  const handleDepartureTimeChange = (timeId: string) => {
    setSelectedDepartureTimes((prev) => prev.includes(timeId) ? [] : [timeId]);
  };

  const handleArrivalTimeChange = (timeId: string) => {
    setSelectedArrivalTimesState((prev) => prev.includes(timeId) ? [] : [timeId]);
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
              case 'NON_STOP': return 0;
              case 'ONE_STOP': return 1;
              case 'TWO_PLUS_STOPS': return 2;
              default: return 0;
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

        if (selectedDepartureTimes.length > 0) {
          const timeRange = selectedDepartureTimes[0];
          let departureRange = null;
          switch (timeRange) {
            case 'MORNING': departureRange = { start: '06:00', end: '12:00' }; break;
            case 'AFTERNOON': departureRange = { start: '12:00', end: '18:00' }; break;
            case 'EVENING': departureRange = { start: '18:00', end: '21:00' }; break;
            case 'NIGHT': departureRange = { start: '21:00', end: '06:00' }; break;
          }
          if (departureRange) filters.departureTimeRange = departureRange;
        }

        if (selectedArrivalTimesState.length > 0) {
          const timeRange = selectedArrivalTimesState[0];
          let arrivalRange = null;
          switch (timeRange) {
            case 'MORNING': arrivalRange = { start: '06:00', end: '12:00' }; break;
            case 'AFTERNOON': arrivalRange = { start: '12:00', end: '18:00' }; break;
            case 'EVENING': arrivalRange = { start: '18:00', end: '21:00' }; break;
            case 'NIGHT': arrivalRange = { start: '21:00', end: '06:00' }; break;
          }
          if (arrivalRange) filters.arrivalTimeRange = arrivalRange;
        }
      }

      const filterPayload = {
        ...searchQuery,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      };

      let response;
      if (flightType === 'return') {
        response = await searchReturnFilterFlights(filterPayload, sortBy, sortOrder);
      } else if (flightType === 'multicity') {
        response = await searchMultiCityFilterFlights(filterPayload, sortBy, sortOrder);
      } else {
        response = await searchOneWayFilterFlights(filterPayload, sortBy, sortOrder);
      }

      if (response.success === true) {
        onFilterChange(response.data?.flights || []);
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

  const getFilterCount = () => {
    let count = 0;
    if (selectedAirlines.length > 0) count++;
    if (selectedStops.length > 0) count++;
    if (selectedDepartureTimes.length > 0) count++;
    if (selectedArrivalTimesState.length > 0) count++;
    if (minPrice > 0 || maxPrice < 100000) count++;
    return count;
  };

  // ✅ If isOpen is false, don't render anything
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white rounded-t-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#1A1F4D]" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {getFilterCount() > 0 && (
              <span className="text-xs bg-[#1A1F4D]/10 text-[#1A1F4D] px-2 py-0.5 rounded-full">
                {getFilterCount()} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <MobileFilterActions
            isApplying={isApplying}
            isPrinting={isPrinting}
            hasChanges={hasChanges}
            onReset={resetAllFilters}
            onApply={applyFilters}
            onPrint={() => {}}
          />

          <MobilePriceRangeSection
            isOpen={openSections.priceRange}
            onToggle={() => toggleSection('priceRange')}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onMinPriceChange={setMinPrice}
            onMaxPriceChange={setMaxPrice}
          />

          <MobileDepartureTimeFilterSection
            isOpen={openSections.departureTime}
            onToggle={() => toggleSection('departureTime')}
            selectedTimes={selectedDepartureTimes}
            onTimeChange={handleDepartureTimeChange}
          />

          <MobileArrivalTimeFilterSection
            isOpen={openSections.arrivalTime}
            onToggle={() => toggleSection('arrivalTime')}
            selectedTimes={selectedArrivalTimesState}
            onTimeChange={handleArrivalTimeChange}
          />

          <MobileStopsSection
            isOpen={openSections.stops}
            onToggle={() => toggleSection('stops')}
            selectedStops={selectedStops}
            onStopChange={handleStopChange}
          />

          <MobileAirlinesSection
            isOpen={openSections.airlines}
            onToggle={() => toggleSection('airlines')}
            selectedAirlines={selectedAirlines}
            availableAirlines={availableAirlines}
            onAirlineChange={handleAirlineChange}
          />
        </div>

        {/* Bottom Actions - Fixed at bottom */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex gap-2">
            <button
              onClick={resetAllFilters}
              disabled={isApplying}
              className="flex-1 px-4 py-3 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Reset All
            </button>
            <button
              onClick={applyFilters}
              disabled={isApplying || !hasChanges}
              className="flex-[2] px-4 py-3 text-sm font-medium bg-[#1A1F4D] text-white rounded-lg hover:bg-[#2A2F6D] transition-colors disabled:opacity-50"
            >
              {isApplying ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}