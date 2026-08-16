export interface FlightData {
  flightKey: string;
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  cabinClass: string;
  duration: string;
  price: number;
  stops: number;
  stopDetails?: {
    count: number;
    stopNames: string[];
    stopCodes: string[];
    stopCities: string[];
    displayString: string;
  };
  from: {
    airportCode: string;
    city: string;
    date: string;
    day: string;
    time: string;
  };
  to: {
    airportCode: string;
    city: string;
    date: string;
    day: string;
    time: string;
  };
  flightId?: string;
  segmentId?: string;
  aircraftType?: string;
  isInternational?: boolean;
  isOutbound?: boolean;
  isRedEye?: boolean;
  refundable?: boolean;
  departure?: {
    airportCode: string;
    airportName?: string;
    city: string;
    cityCode?: string;
    date: string;
    datetime?: string;
    time: string;
    terminal?: string;
  };
  arrival?: {
    airportCode: string;
    airportName?: string;
    city: string;
    cityCode?: string;
    date: string;
    datetime?: string;
    time: string;
    terminal?: string;
  };
  airline_obj?: {
    code: string;
    name: string;
    isLcc: boolean;
  };
  fareOptions?: Array<{
    id: string;
    totalFare: number;
    baseFare: number;
    netFare: number;
    taxesAndFees: number;
    fareIdentifier: string;
    cabinClass: string;
    bookingClass: string;
    fareBasis: string;
    refundable: boolean;
    isCorporateFare: boolean;
    seatAvailability: number;
    baggage: {
      checked: string;
      cabin: string;
    };
  }>;
  id?: string;
  from_legacy?: string;
  to_legacy?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureDate?: string;
  arrivalDate?: string;
  class?: string;
  baggage?: string;

  // Add this property
  fareRuleData?: {
    fareRule?: {
      [key: string]: {
        tfr?: {
          CANCELLATION?: Array<{
            st?: string;
            et?: string;
            amount?: number;
            additionalFee?: number;
            policyInfo?: string;
          }>;
          DATECHANGE?: Array<{
            st?: string;
            et?: string;
            amount?: number;
            additionalFee?: number;
            policyInfo?: string;
          }>;
          NO_SHOW?: Array<{
            policyInfo?: string;
          }>;
          SEAT_CHARGEABLE?: Array<{
            policyInfo?: string;
          }>;
        };
      };
    };
  };
}

export interface SearchParams {
  tripType: string;
  from: string;
  to: string;
  departureDate: string;
  travelers: number | string;
  class: string;
  fareType: string;
  travelerDetails?: {
    adults: number;
    children: number;
    infants: number;
    total: number;
  };
}

export interface ApiResponse {
  sessionId: string;
  flights: FlightData[];
}
