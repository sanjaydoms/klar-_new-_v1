export interface FlightSegment {
  from: string;
  to: string;
  date: string;
  legNumber?: number;
  legKey?: string;
}

export interface PassengerFare {
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  netFare: number;
  baggage?: {
    checked?: string;
    cabin?: string;
  };
}

export interface FareOption {
  id: string;
  fareIdentifier: string;
  cabinClass: string;
  bookingClass: string;
  fareBasis: string;
  baseFare: number;
  taxesAndFees: number;
  totalFare: number;
  netFare: number;
  refundable: boolean;
  baggage: {
    checked?: string;
    cabin?: string;
  };
  seatAvailability: number;
  passengerFares?: {
    adult: PassengerFare;
    child?: PassengerFare;
    infant?: PassengerFare;
  };
  adultTotal: number;
  childTotal: number;
  isCorporateFare?: boolean;
  fareBreakdown?: {
    managementFee?: number;
    otherTax?: number;
    serviceTax?: number;
    airportTax?: number;
    fuelSurcharge?: number;
  };
  isRecommended?: boolean;
}

export interface FlightOption {
  selectedFareIdentifier: string;
  operatingAirline: any;
  id: string;
  flightId: string;
  segmentId?: string;
  tripType?: string;
  legNumber?: number;
  legIndex?: number;
  legKey?: string;
  airline: {
    code: string;
    name: string;
    isLcc: boolean;
  };
  flightNumber: string;
  aircraftType?: string;
  departure: {
    airportCode: string;
    airportName?: string;
    cityCode?: string;
    city?: string;
    terminal?: string;
    time: string;
    date: string;
    datetime?: string;
  };
  arrival: {
    airportCode: string;
    airportName?: string;
    cityCode?: string;
    city?: string;
    terminal?: string;
    time: string;
    date: string;
    datetime?: string;
  };
  duration: number;
  stops: number;
  price?: number;
  fareOptions: FareOption[];
  isInternational?: boolean;
  isRedEye?: boolean;
  searchId?: string;
  airlineCode?: string;
}

export interface FlightLeg {
  legNumber: number;
  legKey: string;
  flights: FlightOption[];
}

export interface MultiCityFlightResponse {
  success: boolean;
  message?: string;
  data: {
    searchType: string;
    routeCount: number;
    flights: FlightLeg[];
    totalFlights: number;
    searchParams: {
      from: string;
      to: string;
      travelDate: string;
      returnDate: string;
      passengers: {
        ADULT: number;
        CHILD: number;
        INFANT: number;
      };
      cabinClass: string;
    };
    appliedSort?: any;
    appliedFilters?: any;
    filterSummary?: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
      nextPage: number | null;
      prevPage: number | null;
    };
  };
}

export interface InternationalFlightLeg {
  legIndex: number;
  flightKey: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  from: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  to: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
  };
  stops: number;
  duration: string;
  price: number;
}

export interface InternationalItinerary {
  itineraryKey: string;
  totalPrice: number;
  legs: InternationalFlightLeg[];
}

export interface InternationalFlightsResponse {
  success: boolean;
  data: {
    sessionId: string;
    flights: InternationalItinerary[];
  };
}
