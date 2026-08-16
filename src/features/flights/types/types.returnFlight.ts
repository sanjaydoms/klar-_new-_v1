export interface FlightDepartureArrival {
  airportCode: string;
  airport: string;
  city?: string;
  time: string;
  date: string;
  day?: string | number;
  datetime?: string;
  terminal?: string;
}

export interface FlightFareOption {
  id: string;
  fareId: string;
  totalFare: number;
  cabinClass: string;
  priceId?: string;
}

export interface FlightBaggage {
  cabin?: string;
  checkin?: string;
}

export interface Flight {
  flightId: string;
  id: string;
  airline: {
    code: string;
    name: string;
  };
  flightNumber: string;
  departure: FlightDepartureArrival;
  arrival: FlightDepartureArrival;
  duration: number;
  stops: number;
  price: number;
  currency: string;
  airlineCode?: string;
  class?: string;
  searchId?: string;
  segmentId?: string;
  flightKey?: string;
  isRefundable: boolean;
  baggage?: FlightBaggage | null;
  fareOptions?: FlightFareOption[];
  stopDetails?: {
    count: number;
    stopCities?: string[];
  };
  /** Fare-group meta from the normalizer (one entry per TripJack fare group). */
  fareId?: string;
  fareIdentifier?: string;
  refundable?: string;
  seatsRemaining?: number;
  checkInBaggage?: string;
  cabinBaggage?: string;
  /** Other fare groups of the same physical flight, cheapest first. */
  variants?: Flight[];
}

export interface TravelerDetails {
  adults?: number;
  children?: number;
  infants?: number;
}

export interface PaxInfo {
  ADULT?: number;
  CHILD?: number;
  INFANT?: number;
}

export interface ReturnFlightSearchParams {
  from: string;
  to: string;
  departure: string;
  departureDate?: string;
  returnDate?: string;
  travelers: string;
  cabinClass?: string;
  travelerDetails?: TravelerDetails;
  paxInfo?: PaxInfo;
}

export interface ReturnFlightProps {
  searchParams: ReturnFlightSearchParams;
  onBack: () => void;
  onBookNow?: () => void;
}

export interface LocationInfo {
  city: string;
  code: string;
  country: string;
}

export interface SearchParams {
  from: string;
  to: string;
  departure: string;
  returnDate: string;
  travelers: string;
}

export interface PairedFlight {
  combinationId?: string;
  totalFare?: number;
  currency?: string;
  departure?: Flight;
  return: Flight;
  onward: Flight;
  totalPrice: number;
  isRefundable?: boolean;
}

export interface ReturnFlightResponse {
  success: boolean;
  data: {
    sessionId: string;
    flights: {
      onward?: Flight[];
      return?: Flight[];
      roundTrips?: PairedFlight[];
    };
    onwardNextCursor?: string | null;
    returnNextCursor?: string | null;
    onwardHasMore?: boolean;
    returnHasMore?: boolean;
  };
}

export interface ExtractDatePartsResult {
  time?: string;
  date?: string;
  day?: string | number;
}

export type RawFlightData = {
  flightKey?: string;
  id?: string;
  airline?: {
    code: string;
    name: string;
  };
  airlineCode?: string;
  flightNumber?: string;
  datetime?: string;
  duration?: number;
  stops?: number;
  price?: number;
  cabinClass?: string;
  searchId?: string;
  priceId?: string;
  departure?: {
    datetime?: string;
    dateTime?: string;
    airportCode?: string;
    airport?: string;
    time?: string;
    date?: string;
    day?: string | number;
    terminal?: string;
  };
  arrival?: {
    datetime?: string;
    dateTime?: string;
    airportCode?: string;
    airport?: string;
    time?: string;
    date?: string;
    day?: string | number;
    terminal?: string;
  };
  from?: {
    airportCode?: string;
    city?: string;
    time?: string;
    date?: string;
    terminal?: string;
  };
  to?: {
    airportCode?: string;
    city?: string;
    time?: string;
    date?: string;
    terminal?: string;
  };
  fareOptions?: FlightFareOption[];
};

export interface FareOption {
  priceId?: string;
  id?: string;
  fareId?: string;
  totalFare?: number;
  cabinClass?: string;
}

export type FlightTripType = 'onward' | 'return';
export type FlightResponseType = 'domestic' | 'international';
declare function extractDateParts(dateTime?: string): ExtractDatePartsResult;
