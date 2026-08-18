export interface FlightFilterSidebarProps {
  /** Real fare bounds from the current result set. */
  priceBounds?: { min: number; max: number } | undefined;
  searchQuery: any;
  onFilterChange: (filteredFlights: any) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  onError?: (error: string) => void;
  flightType?: 'oneway' | 'return' | 'multicity';
  availableAirlines?: { airline: string; airlineCode: string; flights: number }[];
  /** Facet lists from the UNFILTERED result set (search stats). */
  availableRefundable?: string[];
  availableFareTypes?: string[];
}

export interface FilterState {
  primarySort: string;
  secondarySort: string;
  selectedStops: string[];
  minPrice: number;
  maxPrice: number;
  selectedArrivalTimes: string[];
  selectedAirlines: string[];
  selectedRefundable: string[];
  selectedFareTypes: string[];
}
