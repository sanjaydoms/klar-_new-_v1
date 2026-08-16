export interface Flight {
  flightKey: string;
  isReturn: boolean;
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
    terminal?: string;
  };
  to: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
    terminal?: string;
  };
  duration: string;
  stops: number;
  stopDetails: {
    count: number;
    stopNames: string[];
    stopCodes: string[];
    stopCities: string[];
    stopoverDurations?: string[];
    details?: any[];
    displayString: string;
  };
  price?: number;
  /** Fare-group meta from the normalizer; absent means the fare stated none. */
  fareIdentifier?: string;
  refundable?: string;
  checkInBaggage?: string;
  cabinBaggage?: string;
  aircraftTypes?: string[];
  /** Other fare groups of the same physical flight, cheapest first. */
  variants?: Flight[];
}

export interface TripDetails {
  date: string;
  returnDate: string;
  travellers: Array<{
    type: 'adult' | 'child' | 'infant';
    count: number;
  }>;
  class: string;
}

export interface InternationalFlightPair {
  onward: Flight;
  return: Flight;
  totalPrice: number;
  onwardFareData?: any;
  returnFareData?: any;
}

export type FlightType = 'domestic' | 'international';

export interface SelectedFlight {
  flight: Flight;
  fareData?: any;
  price: number;
  segment: 'departure' | 'return';
  flightKey: string;
}
