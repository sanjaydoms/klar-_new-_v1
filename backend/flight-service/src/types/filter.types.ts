import { SortOption } from './sort.types';

export type FilterField =
    | 'airline'
    | 'cabinClass'
    | 'stops'
    | 'priceRange'
    | 'departureTimeRange'
    | 'arrivalTimeRange'
    | 'durationRange'
    | 'refundable'
    | 'fareType';

export interface AirlineFilter {
    type: 'airline';
    values: string[];
}

export interface CabinClassFilter {
    type: 'cabinClass';
    values: string[];
}

export interface StopsFilter {
    type: 'stops';
    values: number[];
}

export interface PriceRangeFilter {
    type: 'priceRange';
    min: number;
    max: number;
}

export interface TimeRangeFilter {
    type: 'departureTimeRange' | 'arrivalTimeRange';
    start: string;
    end: string;
}

/** Matches TripJack's rT, normalised to 'Refundable' | 'Non-Refundable' | 'Unknown'. */
export interface RefundableFilter {
    type: 'refundable';
    values: string[];
}

/** Matches the supplier's fareIdentifier: PUBLISHED, SME, ECO VALUE, NDC_Value, PROMO, … */
export interface FareTypeFilter {
    type: 'fareType';
    values: string[];
}

export interface DurationRangeFilter {
    type: 'durationRange';
    min: number;
    max: number;
}

export type Filter =
    | AirlineFilter
    | CabinClassFilter
    | StopsFilter
    | PriceRangeFilter
    | TimeRangeFilter
    | DurationRangeFilter
    | RefundableFilter
    | FareTypeFilter;

export interface FilterConfig {
    filters: Filter[];
    sortBy?: SortOption;
}


export interface FilterValidationResult {
    isValid: boolean;
    errors: string[];
}


export interface FilterStats {
    availableAirlines: string[];
    availableCabinClasses: string[];
    availableRefundableTypes: string[];
    availableFareTypes: string[];
    priceRange: { min: number; max: number };
    stopsRange: { min: number; max: number };
    durationRange: { min: number; max: number };
    totalFlights: number;
    filteredFlights: number;
}