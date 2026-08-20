export interface Pax {
  type: 'Child' | 'Adult';
  age: number;
}

export interface RoomOccupancy {
  numberOfRoom?: number;
  Adults: number;
  Children: number;
  childrenAges?: number[];
  paxes?: Pax[];
}

export interface CancellationPolicy {
  amount: number | string;
  from: string;
  to: string;
  currency?: string;
  description?: string;
}

export interface HotelFiltersState {
  starRatings?: number[];
  priceRange?: [number, number];
  mealTypes?: string[];
  propertyTypes?: string[];
  amenities?: string[];
  searchText?: string;
  showOnlyAltDeals?: boolean;
  providers?: string[];
  selectedLocations?: string[];
}

// Hotel search request parameters
export interface HotelSearchParams {
  destination: string;
  hotelId?: string; // TJ hotel ID when searching by hotel name (e.g. "TJ:100000001234")
  destinationCode?: string; // RateGain destination code
  checkin: string; // Format: YYYY-MM-DD
  checkout: string; // Format: YYYY-MM-DD
  rooms: RoomOccupancy[];
  countryCode?: string;
  currency?: string;
  pageNo?: number;
  providers?: string[];
  filters?: HotelFiltersState;
  sortBy?: string;
}

// Destination from API
export interface Destination {
  code: string;
  name: string;
  city?: string;
  country?: string;
}

export interface HotelSuggestion {
  id: string;
  name: string;
  type: 'city' | 'hotel' | 'recent' | 'popular' | 'state';
  city?: string;
  country?: string;
  hotelId?: string;
  destCode?: string;
  /** Display form disambiguated by city, e.g. "Taj Mahal Palace, Mumbai" */
  label?: string;
  /** Short subtitle shown below the name, e.g. "City in India" */
  subtitle?: string;
  /** Sub-city suggestions nested under a primary region result (MMT-style) */
  subSuggestions?: Array<{
    id: string;
    name: string;
    destCode: string;
    subtitle?: string;
    tag?: 'POPULAR' | 'TRENDING';
  }>;
  // For recent searches
  checkIn?: string;
  checkOut?: string;
  rooms?: RoomOccupancy[];
}

// Hotel from search results
export interface Hotel {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  /**
   * Star classification, 1-5. There is deliberately no sibling `rating`:
   * the two were separate fields holding the same scale for different things,
   * and every `rating || starRating` fallback that grew between them read a
   * review score as a star count. One field, one meaning.
   */
  starRating?: number;
  images?: string[];
  amenities?: string[];
  minPrice?: number;
  currency?: string;
  propertyCode?: string;
  brandCode?: string;
  // Display properties
  distance?: string;
  /*
   * No `reviews`, `reviewScore` or `reviewLabel`.
   *
   * Neither TripJack nor RateGain returns a guest review score, and no neutral
   * content source is licensed, so the canonical model has no such field. The
   * absent field is the point: a nullable one invites a fallback, and the
   * fallback that existed here read `starRating` and rendered it on a 0-10
   * review scale. See docs/UX-CAPABILITY-CONTRACT.md Part B and D-2.
   */
  price?: number; // Total stay price (base + taxes)
  basePrice?: number; // Base net price (room cost without taxes) — use for per-night display
  taxAmount?: number; // Taxes & fees on top of base (0 if taxes included)
  taxesIncluded?: boolean; // true = price already incl. all taxes; false = taxes added on top
  originalPrice?: number;
  discount?: string;
  features?: string[];
  badges?: string[];
  description?: string;
  latitude?: number;
  longitude?: number;
  allotment?: number;
  /** Supplier registry code from the backend ("RG", "TJ", …). Not a union of
   *  today's codes — adding a supplier is a backend registration, not a type edit. */
  source?: string;
  isRefundable?: boolean;
  /** Display-ready label from the backend, e.g. "Free cancellation till 06 Jul".
   *  Undefined when no supplier signal was available at search time. */
  refundableLabel?: string;
  onHoldAllowed?: boolean;
  mealBasis?: string;
  hotelSegment?: string;
  hotelSegments?: string[];
  hotelBoards?: string[];
  accTypeDesc?: string;
  accMultiDesc?: string;
  accomodationType?: string;
  cancellationPolicy?: string | null;
  cancellationPolicies?: CancellationPolicy[];
  rateComments?: string;
  inclusions?: string[];
  checkInTime?: string;
  checkOutTime?: string;
  altDeal?: { source: string; price: number };
}

// Hotel search response
export interface HotelSearchResponse {
  hotels: Hotel[];
  meta?: { rgCount: number; tjCount: number; errors: string[] };
  /** Hotels on this page, not a grand total. Accumulate across pages. */
  total?: number;
  /** Authoritative "another page exists" flag from the suppliers. */
  hasMore?: boolean;
  /** Properties held for this destination. Display only — never drives paging. */
  inventoryCount?: number;
  facets?: any;
}

// Room product details
export interface RoomProduct {
  roomTypeCode: string;
  roomTypeName: string;
  boardName: string;
  rate: number;
  rateKey: string;
  numberOfRooms: number;
  adults: number;
  children: number;
  rateComments?: string;
  cancellationPolicies?: CancellationPolicy[];
  taxes?: number;
  totalPrice?: number;
}

// Hotel product response
export interface HotelProductResponse {
  propertyId: string;
  propertyCode: string;
  brandCode: string;
  rooms?: RoomProduct[];
  // RateGain raw structures
  body?: any;
  products?: any[];
}
