// Route configuration constants
export const ROUTES = {
  // Public routes
  LOGIN: '/b2b',
  SIGNUP: '/signup',

  // Protected routes
  DASHBOARD: '/dashboard',

  // Flight routes
  FLIGHT_SEARCH: '/flights/search',
  FLIGHT_ONEWAY: '/flights/oneway',
  FLIGHT_RETURN: '/flights/return',
  FLIGHT_MULTICITY: '/flights/multicity',

  // Hotel routes
  HOTEL_SEARCH: '/hotels/search',
  HOTEL_DETAILS: '/hotels/:id',
  HOTEL_REVIEW_BOOKING: '/hotels/review-booking',
  HOTEL_BOOKING_CONFIRMED: '/hotels/booking-confirmed',
  COUNTRY_DESTINATIONS: '/destinations/:country',
  HOTEL_WISHLIST: '/hotels/wishlist',

  // Booking routes
  TRAVELLER_INFO: '/booking/traveller-info',
  SEAT_SELECTION: '/booking/seat-selection',
  BEFORE_BOOKING: '/before/booking',
  PAYMENT: '/booking/payment',
  BOOKING_CONFIRMATION: '/book/confirm',

  // Visa routes
  VISA_SELECTION: '/visa-plans',
  VISA_FORM: '/visa/form',

  // Profile routes
  PROFILE: '/profile',
  MY_BOOKINGS: '/my-bookings',
  INSURANCE_BOOKINGS: '/insurance/bookings',
  SETTINGS: '/settings',
  CONTACT_US: '/contact-us',
  ABOUT_US: '/about-us',
  TERMS_AND_CONDITIONS: '/terms-and-conditions',
  PRIVACY_POLICY: '/privacy-policy',
  CUSTOMER_SUPPORT: '/customer-support',
  PAYMENT_SECURITY: '/payment-security',
  COOKIE_POLICY: '/cookie-policy',
  ESCALATION: '/escalation',
  REPORT_SECURITY: '/report-security',

  // Cab routes
  CAB_SEARCH: '/cabs/search',
  CAB_REVIEW: '/cabs/review',

  //Mobile Responsive for flight
  MOBILE_HOME: '/mobile-home',
  MOBILE_FLIGHT_SEARCH: '/mobile-flight-search',
  MOBILE_HOTEL_SEARCH: '/mobile-hotel-search',

  ONEWAY_FLIGHT_CARD: '/mobile-oneway-card',
  ONEWAY_FARE_CARD: '/mobile-oneway-fare-card',
  ONEWAY_FARE_RULE: '/mobile-oneway-fare-rule',

  RETURN_FLIGHT_CARD: '/mobile-return-card',
  RETURN_FLIGHT_FARE_CARD: '/mobile_return_fare_card',
  RETURN_FLIGHT_FARE_RULE_CARD: '/mobile_return_fare_rule_card',

  MULTICITY_FLIGHT_CARD: '/mobile-multicity-card',
  MULTICITY_FARE_CARD: '/multi-city-fare-details',
  MULTICITY_FARE_RULES: '/multi-city-fare-rules',

  MOBILE_ANCILLARY_FLIGHT_DETAILS: '/mobile-ancillary-flight-details',

  MOBILE_CONFIRMATION: '/mobile-confirmation',

  MOBILE_CAB_REVIEW: '/mobile-cab-review',

  NATIONAL_CARD: '/national-card',
  INTERNATIONAL_CARD: '/international-card',
  MOBILE_CRUISE_SEARCH: '/mobile-cruise-search',


  OFFER_PAGE: '/offer-page',

  // Error routes
  NOT_FOUND: '/404',
  ERROR: '/error',
} as const;

export type RouteKey = keyof typeof ROUTES;
export type RoutePath = (typeof ROUTES)[RouteKey];
