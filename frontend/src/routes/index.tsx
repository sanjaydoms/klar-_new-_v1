import { lazy, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../features/authentication/hooks/useAuth';
import { ROUTES } from './routes.config';
const InsuranceSearchPage = lazy(() => import('@/components/Insurance/InsuranceSearchPage'));
const KlarTravellerDossier = lazy(() => import('@/components/Insurance/KlarTravellerDossier'));
const InsuranceBookingConfirmationDossier = lazy(() => import('@/components/Insurance/InsuranceBookingConfirmationDossier'));
// import PackageBookingScreen from '@/pages/Packages/PackageBookingScreen';
// import PackagePaymentScreen from '@/pages/Packages/PackagePaymentScreen';
// import PackageBookingConfirmedScreen from '@/pages/Packages/PackageBookingConfirmedScreen';
// import PackageBookingCancellationScreen from '@/pages/Packages/PackageBookingCancellationScreen';
// import ExploreOffersPage from '@/components/MobileResponsive/DashboardPage/ExploreOffersPage';
const MobileInsuranceSearchSection = lazy(() => import('@/components/DashboardComponents/DashboardSearchCard/MobileInsuranceSearchSection'));
const InsuranceBeforeBookingConfirmation = lazy(() => import('@/components/Insurance/InsuranceBeforeBookingConfirmation'));
const TajMahalProperties = lazy(() => import('@/features/flights/components/TajMahalProperties'));
const MumbaiProperties = lazy(() => import('@/features/flights/components/MumbaiProperties'));
const GoaProperties = lazy(() => import('@/features/flights/components/GoaProperties'));
const ChennaiProperties = lazy(() => import('@/features/flights/components/ChennaiProperties'));

// Import specific components
const AuthContainer = lazy(() => import('../features/authentication/AuthContainer'));
const FlightBookingConfirmation = lazy(() => import('@/features/flights/components/OneWayFlights/bookingConfirmation'));
const SimpleBookingConfirmation = lazy(() => import('../userinfoandseatinfo/BookingConfirmation'));
const CookiePolicy = lazy(() => import('@/pages/Terms/CookiePolicy'));
import ScrollToTop from './ScrollToTop';
import HotelLayout from '../components/layout/HotelLayout';
const MobileHomePage = lazy(() => import('../components/MobileResponsive/DashboardPage/HomePage'));
import ResponsiveRedirect from '../components/ResponsiveRedirect';
const MobileFlightSearch = lazy(() => import('../components/MobileResponsive/FlightSearchSection'));
const MobileHotelSearch = lazy(() => import('../components/MobileResponsive/HotelSearchSection/HotelSearchPage'));
const HotelSearchPage = lazy(() => import('../pages/Hotels/HotelSearchPage'));
const CountryDestinationsPage = lazy(() => import('@/pages/Hotels/CountryDestinationsPage'));

const ReturnTripFlightcard = lazy(() => import('@/components/MobileResponsive/ReturnTripFlightCard/ReturnTripFlightcard'));
const MultiCityFlightcard = lazy(() => import('@/components/MobileResponsive/MultiCityFlightCard/MultiCityFlightcard'));

const MobilePaymentPage = lazy(() => import('@/components/MobileResponsive/MobileReview/MobilePaymentPage'));
const MobileTicketConfirmationPage = lazy(() => import('@/components/MobileResponsive/MobileTicketConfirmation/MobileTicketConfirmationPage'));
const OnewayFlightcard = lazy(() => import('@/components/MobileResponsive/FlightSearchSection/Oneway/OnewayFlightCard/OnewayFlightcard'));
const FareSelectionPage = lazy(() => import('@/components/MobileResponsive/FlightSearchSection/Oneway/OnewayFareCard/FareSelectionPage'));
const MobileFareRulesPage = lazy(() => import('@/components/MobileResponsive/FlightSearchSection/Oneway/OnewayFareCard/FareRulesPage'));
const MobileAncillaryDetailsPage = lazy(() => import('@/components/MobileResponsive/FlightDetailsPage/MobileFlightDetailsPage'));
const DomesticFareRulesPage = lazy(() => import('@/components/MobileResponsive/ReturnTripFlightCard/DomesticFareRulesPage'));
const DomesticFareSelectionPage = lazy(() => import('@/components/MobileResponsive/ReturnTripFlightCard/DomesticFareSelectionPage'));
const CabMobilePage = lazy(() => import('@/components/MobileResponsive/DashboardPage/mobile-cab-review'));
const MultiCityFareSelectionPage = lazy(() => import('@/components/MobileResponsive/MultiCityFlightCard/FareSection/MultiCityFareSelectionPage'));
const MultiCityFareRulesPage = lazy(() => import('@/components/MobileResponsive/MultiCityFlightCard/FareSection/MultiCityFareRulesPage'));
const ExploreOffersPage = lazy(() => import('@/components/MobileResponsive/ExploreOffersPage'));
const VisaPlans = lazy(() => import('@/features/visa/components/VisaPlans'));
const ToursContactForm = lazy(() => import('@/pages/Packages/ToursContactForm'));
const ToursBookingSuccess = lazy(() => import('@/pages/Packages/ToursBookingSuccess'));
const ToursBookingFailed = lazy(() => import('@/pages/Packages/ToursBookingFailed'));
const MobileToursSearchPage = lazy(() => import('@/pages/Packages/MobileToursSearchPage'));
const NationalTrips = lazy(() => import('@/components/TripFlight/NationalTrips'));
const InternationalTrips = lazy(() => import('@/components/TripFlight/InternationalTrips'));
// import MobileCruiseSearchSection from '@/components/DashboardComponents/DashboardSearchCard/MobileCruiseSearchSection';
const MobileChartersSearchSection = lazy(() => import('@/components/DashboardComponents/DashboardSearchCard/MobileChartersSearchSection'));
const MobilePassportServiceSearchSection = lazy(() => import('@/components/DashboardComponents/DashboardSearchCard/MobilePassportServiceSearchSection'));
const MobileCruiseSearch = lazy(() => import('@/features/cruise/MobileCruiseSearch'));


// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  </div>
);

// Common Pages
const ContactInfo = lazy(() => import('../pages/ContactUS/index'));
const AboutUS = lazy(() => import('../pages/AboutUS/index'));

// Lazy load pages for code splitting
const HomePage = lazy(() => import('../pages/Home'));
const SearchResultsPage = lazy(() => import('../pages/Search'));
const BeforeBooking = lazy(() => import('../userinfoandseatinfo/BeforeBookingConfirmation'));
const BookingPage = lazy(() => import('../pages/Booking'));
const PaymentPage = lazy(() => import('../pages/Payment'));
const ProfilePage = lazy(() => import('../pages/Profile'));
const SettingsPage = lazy(() => import('../pages/Profile/SettingsPage'));
const MyBookingsPage = lazy(() => import('../pages/MyBookings'));
const InsuranceBookingsPage = lazy(() => import('../pages/Insurance/InsuranceBookingsPage'));
const NotFoundPage = lazy(() => import('../pages/Error'));
const TermsAndConditions = lazy(() => import('../pages/Terms/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('../pages/Terms/PrivacyPolicy'));
const FareRulesPage = lazy(
  () => import('../features/flights/components/OneWayFlights/FareRuleDetails'),
);
const CustomerSupport = lazy(() => import('../pages/Terms/CustomerSupport'));
const PaymentSecurity = lazy(() => import('../pages/Terms/PaymentSecurity'));
const EscalationPage = lazy(() => import('../pages/Terms/Escalation'));
const ReportSecurityIssue = lazy(() => import('../pages/Terms/Report&SecurityIssue'));

// Visa Pages
const VisaApplicationForm = lazy(() => import('../pages/Visa/VisaApplicationForm'));

const HotelDetailPage = lazy(() => import('../pages/Hotels/HotelDetailPage'));
const HotelReviewBooking = lazy(() => import('../pages/Hotels/HotelReviewBooking'));
const HotelBookingConfirmed = lazy(() => import('../pages/Hotels/HotelBookingConfirmed'));
const WishlistPage = lazy(() => import('../pages/Hotels/WishlistPage'));
const BlogDetailPage = lazy(() => import('../pages/BlogDetailPage'));

// Tour & Package Pages
// const PackagesPage = lazy(() => import('../pages/Packages/PackagesPage'));
// const ToursPage = lazy(() => import('../pages/Tours/ToursPage'));
// const PackageDetailPage = lazy(() => import('../pages/Packages/PackageDetailPage'));

// Cab Pages
const CabSearchResultsPage = lazy(() => import('../pages/Cabs/CabSearchResultsPage'));
const CabReviewPage = lazy(() => import('../features/cabs/components/CabReviewPage'));

/**
 * Chooses the review screen once, at mount, and does not change its mind.
 *
 * These two are NOT responsive variants of one screen — they are separate
 * implementations that read DIFFERENT sessionStorage keys. `BeforeBooking` reads
 * `onewayReviewData` / `seatSelection`; `MobilePaymentPage` reads `reviewData` /
 * `selectedItems`. A resize listener used to swap between them whenever the
 * window crossed 768px, so dragging a browser narrower on the review screen
 * unmounted the populated component and mounted one whose keys were never
 * written — a blank summary and ₹0.00 rows, one step before payment.
 *
 * Keeping the variant the session started on is the conservative choice: a
 * rotated tablet keeps a slightly wide layout, which is a far smaller problem
 * than losing the booking. Layout within each screen is CSS's job.
 *
 * The real fix is to converge both on one set of keys; until then, do not
 * reintroduce the listener.
 */
const BeforeBookingView: React.FC = () => {
  // Review data now lives under ONE key (see utils/reviewSession.ts), but the
  // two screens still read different SELECTION keys, so pick the screen by
  // which funnel actually wrote state — the viewport is only the tiebreak for
  // a fresh session. A desktop funnel in a narrow window must still get the
  // desktop screen, or it reads selections that were never written.
  const [screen] = useState<'desktop' | 'mobile'>(() => {
    if (sessionStorage.getItem('seatSelection')) return 'desktop';
    if (sessionStorage.getItem('selectedItems') || sessionStorage.getItem('bookingData'))
      return 'mobile';
    return window.innerWidth < 768 ? 'mobile' : 'desktop';
  });

  return screen === 'mobile' ? <MobilePaymentPage /> : <BeforeBooking />;
};

/**
 * Main Application Router
 * Implements React Router v6 with code splitting - All routes are public
 */
export const AppRouter = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        {/* <ErrorBoundary> */}
        <Suspense fallback={<PageLoader />}>
          <ResponsiveRedirect>
            <Routes>
              {/* Root redirect or Home */}
              <Route path="/" element={<HomePage />} />

              {/* Auth Routes - Public */}
              <Route path={ROUTES.LOGIN} element={<AuthContainer />} />
              <Route path={ROUTES.SIGNUP} element={<AuthContainer />} />

              {/* Dashboard */}
              <Route path={ROUTES.DASHBOARD} element={<HomePage />} />

              {/* Flight Search Routes */}
              <Route path={ROUTES.FLIGHT_SEARCH} element={<SearchResultsPage />} />
              <Route path={ROUTES.FLIGHT_ONEWAY} element={<SearchResultsPage />} />
              <Route path={ROUTES.FLIGHT_RETURN} element={<SearchResultsPage />} />
              <Route path={ROUTES.FLIGHT_MULTICITY} element={<SearchResultsPage />} />
              <Route path={ROUTES.MULTICITY_FARE_CARD} element={<MultiCityFareSelectionPage />} />
              <Route path={ROUTES.MULTICITY_FARE_RULES} element={<MultiCityFareRulesPage />} />

              {/* Booking Routes */}
              <Route path={ROUTES.TRAVELLER_INFO} element={<BookingPage />} />
              <Route path={ROUTES.SEAT_SELECTION} element={<BookingPage />} />
              <Route path={ROUTES.BEFORE_BOOKING} element={<BeforeBookingView />} />
              <Route path={ROUTES.PAYMENT} element={<PaymentPage />} />

              {/* Visa Routes */}
              <Route path={ROUTES.VISA_SELECTION} element={<VisaPlans />} />
              <Route path={ROUTES.VISA_FORM} element={<VisaApplicationForm />} />

              {/* Profile & Bookings */}
              <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
              <Route path={ROUTES.MY_BOOKINGS} element={<MyBookingsPage />} />
              <Route path={ROUTES.INSURANCE_BOOKINGS} element={<InsuranceBookingsPage />} />
              <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
              <Route path={ROUTES.BOOKING_CONFIRMATION} element={<FlightBookingConfirmation />} />
              <Route path="/booking-confirmation" element={<SimpleBookingConfirmation />} />

              {/* Tour & Package Routes */}
              <Route path="/tours-contact-form" element={<ToursContactForm />} />
              <Route path="/mobile/tours-search" element={<MobileToursSearchPage />} />
              <Route path="/tours-booking-success" element={<ToursBookingSuccess />} />
              <Route path="/tours-booking-failed" element={<ToursBookingFailed />} />

              {/* <Route path="/packages/search" element={<PackagesPage />} />
              <Route path="/tours/search" element={<ToursPage />} />
              <Route path="/packages/:id" element={<PackageDetailPage />} />
              <Route path="/package/booking" element={<PackageBookingScreen />} />
              <Route path="/package/payment" element={<PackagePaymentScreen />} />
              <Route path="/package/booking_confirmed" element={<PackageBookingConfirmedScreen />} />
              <Route path="/package/booking_cancellation" element={<PackageBookingCancellationScreen />} /> */}

              {/* Cab Routes */}
              <Route path={ROUTES.CAB_SEARCH} element={<CabSearchResultsPage />} />
              <Route path={ROUTES.CAB_REVIEW} element={<CabReviewPage />} />

              {/* Hotel Pages */}
              <Route element={<HotelLayout />}>
                <Route path={ROUTES.HOTEL_SEARCH} element={<HotelSearchPage />} />
                <Route path={ROUTES.HOTEL_DETAILS} element={<HotelDetailPage />} />
                <Route path={ROUTES.HOTEL_REVIEW_BOOKING} element={<HotelReviewBooking />} />
                <Route path={ROUTES.HOTEL_BOOKING_CONFIRMED} element={<HotelBookingConfirmed />} />
                <Route path={ROUTES.HOTEL_WISHLIST} element={<WishlistPage />} />
                <Route path="/destinations/:country" element={<CountryDestinationsPage />} />
              </Route>

              {/* Insurance Routes */}
              <Route path="/mobile-insurance-search" element={<MobileInsuranceSearchSection />} />
              <Route path="/insurance/search" element={<InsuranceSearchPage />} />
              <Route path="/insurance/dossier" element={<KlarTravellerDossier />} />
              <Route path="/insurance/before-booking-confirmation" element={<InsuranceBeforeBookingConfirmation />} />
              <Route path="/insurance/confirmation" element={<InsuranceBookingConfirmationDossier />} />

              {/* Static Pages */}
              <Route path={ROUTES.CONTACT_US} element={<ContactInfo />} />
              <Route path="/blog/:slug" element={<BlogDetailPage />} />
              <Route path={ROUTES.ABOUT_US} element={<AboutUS />} />
              <Route path={ROUTES.TERMS_AND_CONDITIONS} element={<TermsAndConditions />} />
              <Route path={ROUTES.PRIVACY_POLICY} element={<PrivacyPolicy />} />
              <Route path="/fare-rules" element={<FareRulesPage />} />
              <Route path={ROUTES.CUSTOMER_SUPPORT} element={<CustomerSupport />} />
              <Route path={ROUTES.PAYMENT_SECURITY} element={<PaymentSecurity />} />
              <Route path={ROUTES.COOKIE_POLICY} element={<CookiePolicy />} />
              <Route path={ROUTES.ESCALATION} element={<EscalationPage />} />
              <Route path={ROUTES.REPORT_SECURITY} element={<ReportSecurityIssue />} />
              <Route path="/tajmahal-properties" element={<TajMahalProperties />} />
              <Route path="/mumbai-properties" element={<MumbaiProperties />} />
              <Route path="/goa-properties" element={<GoaProperties />} />
              <Route path="/chennai-properties" element={<ChennaiProperties />} />

              {/* Mobile Responsive routes */}
              <Route path={ROUTES.MOBILE_HOME} element={<MobileHomePage />} />
              <Route path={ROUTES.MOBILE_FLIGHT_SEARCH} element={<MobileFlightSearch />} />
              <Route path={ROUTES.MOBILE_HOTEL_SEARCH} element={<MobileHotelSearch />} />
              <Route path={ROUTES.ONEWAY_FLIGHT_CARD} element={<OnewayFlightcard />} />
              <Route path={ROUTES.RETURN_FLIGHT_CARD} element={<ReturnTripFlightcard />} />
              <Route path={ROUTES.MULTICITY_FLIGHT_CARD} element={<MultiCityFlightcard />} />
              <Route path={ROUTES.ONEWAY_FARE_CARD} element={<FareSelectionPage />} />
              <Route path={ROUTES.ONEWAY_FARE_RULE} element={<MobileFareRulesPage />} />
              <Route path={ROUTES.MOBILE_ANCILLARY_FLIGHT_DETAILS} element={<MobileAncillaryDetailsPage />} />
              <Route path={ROUTES.MOBILE_CONFIRMATION} element={<MobileTicketConfirmationPage />} />
              <Route path={ROUTES.RETURN_FLIGHT_FARE_CARD} element={<DomesticFareSelectionPage />} />
              <Route path={ROUTES.RETURN_FLIGHT_FARE_RULE_CARD} element={<DomesticFareRulesPage />} />
              <Route path={ROUTES.MOBILE_CAB_REVIEW} element={<CabMobilePage />} />
              <Route path={ROUTES.OFFER_PAGE} element={<ExploreOffersPage />} />
              <Route path={ROUTES.NATIONAL_CARD} element={<NationalTrips />} />
              <Route path={ROUTES.INTERNATIONAL_CARD} element={<InternationalTrips />} />

              {/* Charters Routes  */}
              <Route path="/mobile-charters-search" element={<MobileChartersSearchSection />} />

                {/* Cruise Routes  */}
                <Route path={ROUTES.MOBILE_CRUISE_SEARCH} element={<MobileCruiseSearch />} />

              {/* Passport Service Routes  */}
              <Route path="/mobile-passport-search" element={<MobilePassportServiceSearchSection />} />

              {/* Error Routes */}
              <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ResponsiveRedirect>
        </Suspense>
        {/* </ErrorBoundary> */}
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRouter;