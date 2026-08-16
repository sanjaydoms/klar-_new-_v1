export interface BeforeBookingConfirmationProps {
  onBack?: () => void;
  onContinue?: () => void;
}

export interface SelectedSeatDetails {
  seatId: string;
  price: number;
  segmentId?: string;
  seatNumber?: string;
  uniqueKey?: string;
}

export interface TravelerSeatSelection {
  [travelerIndex: number]: {
    [segmentId: string]: string;
  };
}

export interface TravelerMealSelection {
  [travelerIndex: number]: {
    [segmentId: string]: {
      [mealId: string]: number;
    };
  };
}

export interface TravelerBaggageSelection {
  [travelerIndex: number]: {
    [segmentId: string]: {
      [baggageId: string]: number;
    };
  };
}

export interface FlightDetailsType {
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  airline: string;
  flightNumber: string;
  refundableType?: number;
  baggage?: {
    checkIn: string;
    cabin: string;
  };
}

export interface ContactDetailsType {
  email: string;
  phone: string;
}

export interface TravelerType {
  type: string;
  title: string;
  firstName: string;
  lastName: string;
  dob?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportNationality?: string;
}
