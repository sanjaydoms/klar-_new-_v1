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
  };
  to: {
    city: string;
    airportCode: string;
    time: string;
    date: string;
    day: string;
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
}

export interface FlightPair {
  departure: Flight;
  return: Flight;
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
