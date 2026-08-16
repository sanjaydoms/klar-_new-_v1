export interface DashboardSearchCardProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onFlightSearch?:
    | ((params: {
        tripType: string;
        from?: string;
        to?: string;
        departureDate?: string;
        returnDate?: string;
        travelers: string;
        class: string;
        fareType: string;
        travelerDetails?: any;
        segments?: any[];
      }) => void)
    | undefined;
}

export interface TravelerDetails {
  adults: number;
  children: number;
  infants: number;
  total: number;
}

export interface FlightSearchState {
  tripType: string;
  fromLocation: string;
  toLocation: string;
  departureDate: string;
  returnDate: string;
  travelers: string;
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
  fareType: string;
  validationErrors: Record<string, string>;
  segments?: Array<{ from: string; to: string; date: string }>;
}

export const validateTravelerCounts = (details: TravelerDetails) => {
  const MAX_TRAVELERS = 9;

  if (details.total > MAX_TRAVELERS) {
    return { isValid: false, error: `Total travelers cannot exceed ${MAX_TRAVELERS}` };
  }
  if (details.infants > details.adults) {
    return { isValid: false, error: 'Number of infants cannot exceed number of adults' };
  }
  return { isValid: true, error: null };
};

export const validateFlightSearch = (state: FlightSearchState) => {
  const errors: Record<string, string> = {};

  if (state.tripType === 'multi-city' && state.segments) {
    state.segments.forEach((segment, index) => {
      if (!segment.from?.trim()) errors[`multi_from_${index}`] = 'Departure city is required';
      if (!segment.to?.trim()) errors[`multi_to_${index}`] = 'Arrival city is required';
      if (!segment.date) errors[`multi_date_${index}`] = 'Departure date is required';
      if (index > 0 && segment.date && state.segments?.[index - 1]?.date) {
        if (new Date(segment.date) < new Date(state.segments[index - 1].date)) {
          errors[`multi_date_${index}`] = 'Departure date cannot be before previous segment';
        }
      }
    });
  } else {
    if (!state.fromLocation?.trim()) errors.from = 'Departure city is required';
    if (!state.toLocation?.trim()) errors.to = 'Arrival city is required';
    if (!state.departureDate) errors.departure = 'Departure date is required';
    if (state.tripType === 'return' && !state.returnDate) {
      errors.return = 'Return date is required';
    }
    if (state.tripType === 'return' && state.departureDate && state.returnDate) {
      if (new Date(state.returnDate) < new Date(state.departureDate)) {
        errors.return = 'Return date cannot be before departure date';
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
