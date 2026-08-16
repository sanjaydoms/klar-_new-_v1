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
import CharterWhiteIcon from "/logo/charters_white_icon.png"
import CabIcon from '/logo/red_cabs.png';
import ToursIcon from '/logo/red_tours.png';
import InsuranceIcon from '/logo/red_insurance.png';
import VisaIcon from '/logo/red_visa.png';
import WhiteFlight from '/logo/white_flight.png';
import WhiteCab from '/logo/white_cabs.png';
import whiteHotel from '/logo/white_hotels.png';
import whiteTours from '/logo/white_tours.png';
import whiteInsurance from '/logo/white_insurance.png';
import whiteVisa from '/logo/white_visa.png';
import TravelPartner from '@/features/flights/components/TravelPartner';
import FlyFlight from '@/features/flights/components/FlyFlight';
import PopularDestinations from '@/features/flights/components/PopularDestinations';
import LimitedTimeOffer from '@/features/flights/components/HelpSection';
import ChooseYourSpace from '@/features/flights/components/ChooseYourSpace';
import FooterLinks from '@/components/Footer/FooterLinks';
import Footer2 from '@/components/Footer/Footer2';
import CruiseIcon from "/logo/cruise_img.png"
import CruiseWhiteIcon from "/logo/cruise_white_icon.png"
import PassportIcon from "/logo/passport_icon.png"
import PassportWhiteIcon from "/logo/passport_white_icon.png"


const Hero: React.FC = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Track hover status per index
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const services = [
    {
      label: 'FLIGHTS',
      path: '/mobile-flight-search',
      defaultIcon: FlifghtIcon,
      hoverIcon: WhiteFlight,
    },
    {
      label: 'HOTELS',
      path: '/mobile-hotel-search',
      defaultIcon: HotelIcon,
      hoverIcon: whiteHotel,
    },
    {
      label: 'CABS',
      path: '/mobile-cab-review',
      defaultIcon: CabIcon,
      hoverIcon: WhiteCab,
    },
    {
      label: 'TOURS & PACKAGES',
      path: '/mobile/tours-search',
      defaultIcon: ToursIcon,
      hoverIcon: whiteTours,
    },
    {
      label: 'INSURANCE',
      path: '/mobile-insurance-search',
      defaultIcon: InsuranceIcon,
      hoverIcon: whiteInsurance,
    },
    {
      label: 'VISA',
      path: '/Visa',
      defaultIcon: VisaIcon,
      hoverIcon: whiteVisa,
    },
    {
      label: 'CHARTERS',
      path: '/mobile-charters-search',
      defaultIcon: ChartersIcon,
      hoverIcon: CharterWhiteIcon,
    },
    {
      label: 'CRUISE',
      path: '/mobile-cruise-search',
      defaultIcon: CruiseIcon,
      hoverIcon: CruiseWhiteIcon,
    },
    {
      label: 'PASSPORT',
      path: '/mobile-passport-search',
      defaultIcon: PassportIcon,
      hoverIcon: PassportWhiteIcon,
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full text-center">
          <div className="text-left max-w-2xl ml-0 md:ml-8 lg:ml-16">
            <div className="inline-block text-[#1A1F4D] text-center px-4 py-1 rounded-full text-sm font-semibold mb-4">
              W E L C O M E , T R A V E L E R ! 👋
            </div>

            <h1
              className="text-[#2B0C0CF2] mb-4"
              style={{
                fontFamily: 'Playfair Display',
                fontWeight: 700,
                fontStyle: 'bold',
                fontSize: '28px',
                lineHeight: '35px',
                letterSpacing: '0px',
                verticalAlign: 'middle',
              }}
            >
              Extraordinary <span className="text-gray-400">Journeys</span>
              <br />
              <span className="text-primary">
                Unforgettable <em className="italic text-gray-400">Luxury.</em>
              </span>
            </h1>
          </div>

          <div className="mt-30 md:mt-12 ml-0 md:ml-8 lg:ml-16">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-6 sm:gap-8 max-w-3xl">
              {services.map((service, index) => {
                const isHovered = hoveredIndex === index;
                return (
                  <div
                    key={index}
                    onClick={() => handleServiceClick(service.path)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <div
                      className={`flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 border-white transition-all duration-300 transform group-hover:scale-110 ${
                        isHovered ? 'bg-primary' : 'bg-white'
                      }`}
                    >
                      <img
                        src={isHovered ? service.hoverIcon : service.defaultIcon}
                        alt={service.label}
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain transition-all duration-300"
                      />
                    </div>
                    <span className="text-[10px] sm:text-xs text-primary font-bold text-center tracking-wider transition-colors duration-300 group-hover:text-white">
                      {service.label}
                    </span>
                  </div>
                );
              })}
            </div>
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
