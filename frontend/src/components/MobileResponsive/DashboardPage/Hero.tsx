import React, { useEffect, useState } from 'react';
import LandingBg from '/images/MobileBg.png';
import DestinationsPage from '../DashboardPage/DestinationsPage';
import LuxurySection from './LuxurySection';
import JoinSection from './JoinSection';
import BottomNav from './BottomNav';
import { useNavigate } from 'react-router-dom';
import HotelIcon from '/logo/red_hotels.png';
import FlifghtIcon from '/logo/red_flights.png';
import ChartersIcon from "/logo/charters_icon.png"
import CabIcon from '/logo/red_cabs.png';
import ToursIcon from '/logo/red_tours.png';
import InsuranceIcon from '/logo/red_insurance.png';
import VisaIcon from '/logo/red_visa.png';
import TravelPartner from '@/features/flights/components/TravelPartner';
import FlyFlight from '@/features/flights/components/FlyFlight';
import PopularDestinations from '@/features/flights/components/PopularDestinations';
import LimitedTimeOffer from '@/features/flights/components/HelpSection';
import ChooseYourSpace from '@/features/flights/components/ChooseYourSpace';
import FooterLinks from '@/components/Footer/FooterLinks';
import Footer2 from '@/components/Footer/Footer2';
import CruiseIcon from "/logo/cruise_img.png"
import PassportIcon from "/logo/passport_icon.png"


const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const services = [
    {
      label: 'FLIGHTS',
      path: '/mobile-flight-search',
      icon: FlifghtIcon,
    },
    {
      label: 'HOTELS',
      path: '/mobile-hotel-search',
      icon: HotelIcon,
    },
    {
      label: 'CABS',
      path: '/mobile-cab-review',
      icon: CabIcon,
    },
    {
      label: 'TOURS & PACKAGES',
      path: '/mobile/tours-search',
      icon: ToursIcon,
    },
    {
      label: 'INSURANCE',
      path: '/mobile-insurance-search',
      icon: InsuranceIcon,
    },
    {
      label: 'VISA',
      path: '/Visa',
      icon: VisaIcon,
    },
    {
      label: 'CHARTERS',
      path: '/mobile-charters-search',
      icon: ChartersIcon,
    },
    {
      label: 'CRUISE',
      path: '/mobile-cruise-search',
      icon: CruiseIcon,
    },
    {
      label: 'PASSPORT',
      path: '/mobile-passport-search',
      icon: PassportIcon,
    },
  ];

  // Handle window resize to detect mobile screen
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Clear session storage only on mobile screens
  useEffect(() => {
    if (!isMobile) {
      console.log('🖥️ Desktop detected - skipping session storage clear');
      return;
    }

    const currentPath = window.location.pathname;
    if (currentPath.includes('/b2b') || currentPath.includes('/login')) {
      console.log('🔒 On login page - skipping session storage clear');
      return;
    }

    const keysToKeep: string[] = [
      'redirectAfterLogin',
      'pendingTravellerData',
      'allTravellerDetails',
      'bookingPayload',
      'bookingId',
      'travelerInfo',
      'currentContactDetails',
      'travellerInfoValidated',
      'flightSearchParams',
      'tripType',
      'onewayReviewData',
      'reviewData',
      'priceAvailabilityResponse',
      'bookingTimer',
      'timerStartTime',
      'fullFlightDetails',
      'selectedFareIndex',
      'fareRuleData',
      'bookingInitResponse',
      'travellerIds',
    ];

    const allKeys = Object.keys(sessionStorage);

    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });

    console.log('📱 Session storage cleared on mobile Hero page load');
    console.log('📦 Remaining keys:', Object.keys(sessionStorage));
  }, [isMobile]);

  const handleServiceClick = (path: string) => {
    navigate(path);
  };

  return (
    <>
      {/* Hero Section */}
      <section
        className="pt-24 pb-12 md:pt-32 md:pb-20 relative min-h-screen flex items-start"
        style={{
          backgroundImage: `url(${LandingBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="relative z-10 mx-auto w-full max-w-3xl px-5">
          {/* 0.3em tracking is the desktop value, but 37 characters of it
              wrap at 375px; trimmed just enough to hold one line. */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
            Premium Travel Experiences Since 2000
          </p>

          <h1 className="font-display mt-4 text-[32px] leading-[1.12] font-medium text-primary">
            Extraordinary Journeys,
            <br />
            <span className="text-[var(--color-brand-red)]">Unforgettable Luxury.</span>
          </h1>

          <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-gray-600">
            Handpicked luxury travel experiences crafted around you.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {services.map((service) => (
              <button
                key={service.label}
                type="button"
                onClick={() => handleServiceClick(service.path)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white/85 px-2 py-4 shadow-[0_10px_30px_-14px_rgba(15,30,77,0.4)] backdrop-blur transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-red)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/70">
                  <img src={service.icon} alt="" className="h-6 w-6 object-contain" />
                </span>
                <span className="text-center text-[11px] font-semibold leading-tight text-primary">
                  {service.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations Section - Added below Hero */}
      <DestinationsPage />
      <FlyFlight />
      <PopularDestinations />
      <LimitedTimeOffer />
      <ChooseYourSpace />
      <TravelPartner />
      <FooterLinks />
      <Footer2 />
      {/* <LuxurySection /> */}
      {/* <JoinSection /> */}
      <BottomNav />
    </>
  );
};

export default Hero;
