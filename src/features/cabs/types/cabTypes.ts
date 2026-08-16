export interface CabSearchParams {
  from: string;
  to: string;
  originCoords?: { lat: number; lng: number };
  destCoords?: { lat: number; lng: number };
  pickupDate: string;
  returnDate?: string;
  passengers: number;
  bags?: number;
  tripType: 'one-way' | 'round-trip';
  journeyType?: string;
}

export interface CabQuote {
  quotationId: string;
  vehicleType: string;
  vehicleCategory: string;
  model: string;
  price: number;
  tax: number;
  policies: any[];
  vendorId: string;
}

export interface MappedCab {
  cabId: string;
  vehicleName: string;
  seats: number;
  bags: number;
  price: number;
  image: string;
  features: string[];
  rawQuote: CabQuote;
}

export interface CabTraveller {
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pan?: string;
  specialRequest?: string;
}

export interface CabBookingPayload {
  journeyInfo: any;
  routeDetail: any;
  quotationInfo: any;
  pricingInfo: any;
  passengerDetail: any;
  agentEmail?: string;
  userId?: string;
  consent: boolean;
}

export interface CabBookingResponse {
  id: string;
  bookingId?: string;
  status: string;
  additionalInfo?: any;
}

export interface CabBooking {
  bookingId: string;
  route: string;
  date: string;
  fare: number;
  status: string;
  vehicleName: string;
  passengerName: string;
}

export interface FeaturedRoute {
  city: string;
  country: string;
  from: string;
  to: string;
  coords: { lat: number; lng: number };
  image: string;
}
