import { useState, useRef, useEffect } from 'react';
import FlightsContent from '../../features/flights/components/FlightsContent';
import HotelsContent from '../../features/hotels/components/HotelsContent';
import VisaContent from '../../features/visa/components/VisaContent';
import CabsContent from '../../features/cabs/components/CabsContent';
import DashboardSearchCard from '../../components/DashboardComponents/DashboardSearchCard/index';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { Menu, User, Luggage, Heart } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileDropdown from '@/components/ProfileComponents/ProfileDropdown';
import { ROUTES } from '../../routes/routes.config';
// NEW IMPORTS FOR MOBILE RESPONSIVENESS
import HomePage from '../../components/MobileResponsive/DashboardPage/HomePage';
import BottomNav from '@/components/MobileResponsive/DashboardPage/BottomNav';
import InsuranceConnect from '../Insurance/InsuranceConnect';
import { ToursContent } from '../Packages/ToursContent';
import { CruiseContent } from '@/features/cruise/CruiseContent';
import ChartersContent from '@/components/Charters/ChartersContent';
import type { SelectedPlanPayload } from '@/components/Passport/PassportPlans';
import PassportConternt from '@/components/Passport/PassportContent';

// import LuxuryFeatures from './LuxuryFeatures';
// import ToursAndPackagesContent from '@/features/flights/components/ToursAndPackage/ToursAndPackagesContent';

interface DashboardProps {
  onLogout: () => void;
  onFlightSearch?: (params: {
    tripType: string;
    from?: string;
    to?: string;
    departureDate?: string;
    returnDate?: string;
    travelers: string;
    class: string;
    fareType: string;
    travelerDetails?: any;
    segments?: any[];
  }) => void;
}

export default function Dashboard({ onLogout, onFlightSearch }: DashboardProps) {
  const location = useLocation();
  const { user } = useAuth();
  // const [activeTab, setActiveTab] = useState((location.state as any)?.activeTab || 'flights');
  // const [activeTab, setActiveTab] = useState('flights');
  const [activeTab, setActiveTab] = useState<string>(() => {
    const locationStateTab = (location.state as { activeTab?: string })?.activeTab;
    const savedTab = localStorage.getItem('activeDashboardTab');
    return locationStateTab || savedTab || 'flights';
  });
  const [selectedPassportPlan, setSelectedPassportPlan] = useState<SelectedPlanPayload | undefined>();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const pendingSearch = sessionStorage.getItem('pendingFlightSearch');
      if (pendingSearch) {
        try {
          const { params } = JSON.parse(pendingSearch);
          onFlightSearch?.(params);
          sessionStorage.removeItem('pendingFlightSearch');
        } catch (error) {
          console.error('Error recovering pending search:', error);
          sessionStorage.removeItem('pendingFlightSearch');
        }
      }
    }
  }, [user, onFlightSearch]);

  // Automatically redirect to mobile route if we are on the cruise tab and resize to mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && activeTab === 'cruise') {
        navigate('/mobile-cruise-search');
      }
    };
    window.addEventListener('resize', handleResize);
    // Also check on mount/update
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  useEffect(() => {
    const navStateTab = (location.state as { activeTab?: string })?.activeTab;
    if (navStateTab) {
      setActiveTab(navStateTab);
    }
  }, [location.state]);

  useEffect(() => {
    if (activeTab !== 'passport' && location.hash) {
      navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  }, [activeTab, location.hash, location.pathname, location.search, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (activeTab !== 'charters' && params.has('charterCategory')) {
      params.delete('charterCategory');
      const nextSearch = params.toString();
      const nextPath = `${location.pathname}${nextSearch ? `?${nextSearch}` : ''}${location.hash}`;
      navigate(nextPath, { replace: true });
    }
  }, [activeTab, location.search, location.pathname, location.hash, navigate]);

  // Persist activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('activeDashboardTab', activeTab);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ========== MOBILE VIEW ========== */}
      <div className="md:hidden">
        <HomePage />
      </div>

      {/* ========== DESKTOP VIEW ========== */}
      <div className="hidden md:block">
        {/* Main Content */}
        <div>
          {/* Header Section with Airplane Wing Background */}
          <div className="relative">
            {/* Background Image - Airplane Wing Sunset */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: 'url(/images/B2CLandingPage.png)',
              }}
            />
            {/* Gradient overlay for better text readability */}
            {/* <div className="absolute inset-0 bg-gradient-to-b from-[#8E8B88]/40 via-[#8E8B88]/28 to-[#8E8B88]/40" /> */}

            <div className="relative z-10">
              {/* --- DESKTOP VIEW (Untouched) --- */}
              <div className="hidden md:block">
                {/* Elevated nav stacking context to ensure dropdown displays above search card */}
                <nav className="relative z-50 bg-transparent">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                      <div className="flex items-center gap-12"></div>

                      <div className="absolute left-[10%] transform -translate-x-1/2">
                        <img src="/logo/KLARBlue.png" alt="Klar Travel" className="h-16 w-auto" />
                      </div>

                      <div className="flex items-center gap-4 sm:gap-5 lg:gap-8">
                        {user ? (
                          <>
                            {/* My Bookings - per design spec */}
                            <button
                              className="hover:opacity-70 transition-opacity whitespace-nowrap"
                              style={{
                                color: '#000000',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                fontSize: 'clamp(13px, 1.2vw, 15px)',
                                lineHeight: '20px',
                                letterSpacing: '0px',
                              }}
                              onClick={() => navigate('/my-bookings')}
                            >
                              My Bookings
                            </button>
                            <button
                              className="hover:opacity-70 transition-opacity whitespace-nowrap"
                              style={{
                                color: '#000000',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                fontSize: 'clamp(13px, 1.2vw, 15px)',
                                lineHeight: '20px',
                                letterSpacing: '0px',
                              }}
                              onClick={() => navigate(ROUTES.HOTEL_WISHLIST)}
                            >
                              Wishlist
                            </button>
                            <button
                              className="hover:opacity-70 transition-opacity whitespace-nowrap"
                              style={{
                                color: '#000000',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                fontSize: 'clamp(13px, 1.2vw, 15px)',
                                lineHeight: '20px',
                                letterSpacing: '0px',
                              }}
                              onClick={() => navigate('/contact-us')}
                            >
                              Contact Us
                            </button>

                            {/* Profile Dropdown - Single Popup Container with High Stacking Context */}
                            <div className="relative z-50" ref={dropdownRef}>
                              <div
                                className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 pr-2 sm:pr-3 bg-gray-50 border border-gray-200 rounded-full cursor-pointer hover:bg-white hover:shadow-md transition-all duration-300 group"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                              >
                                <div className="bg-gray-600 p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-gray-700 transition-colors">
                                  <User size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                                </div>
                                <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                              </div>

                              {/* Profile Dropdown - shown when user is logged in and dropdown is open */}
                              {showProfileDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-64 z-50">
                                  <ProfileDropdown onLogout={onLogout} />
                                </div>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center relative" style={{ width: '569.01px', height: '45.41px', gap: '12.06px' }}>
                            {/* My Trips */}
                            <div className="flex items-center gap-3 cursor-pointer" style={{ width: '201px' }} onClick={() => navigate(ROUTES.LOGIN)}>
                              <div className="w-[44.78px] h-[44.78px] bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Luggage className="w-6 h-6 text-red-500" strokeWidth={2} />
                              </div>
                              <div className="flex flex-col justify-center h-full">
                                <span className="text-[#210202] font-medium" style={{ fontFamily: 'Inter', fontSize: '13.78px', lineHeight: '100%' }}>My Trips</span>
                                <span className="text-[#210202] mt-1" style={{ fontFamily: 'Inter', fontSize: '10px' }}>Manage Your bookings</span>
                              </div>
                            </div>

                            {/* Vertical line separator */}
                            <div className="w-px h-[25px] border-l border-dashed border-gray-400 mx-1"></div>

                            {/* Wishlist */}
                            <div className="flex items-center gap-3 cursor-pointer" style={{ width: '201px' }} onClick={() => navigate(ROUTES.HOTEL_WISHLIST)}>
                              <div className="w-[44.78px] h-[44.78px] bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Heart className="w-6 h-6 text-red-500 fill-current" strokeWidth={0} />
                              </div>
                              <div className="flex flex-col justify-center h-full">
                                <span className="text-[#210202] font-medium" style={{ fontFamily: 'Inter', fontSize: '13.78px', lineHeight: '100%' }}>Wishlist</span>
                                <span className="text-[#210202] mt-1" style={{ fontFamily: 'Inter', fontSize: '10px' }}>Save favourites</span>
                              </div>
                            </div>

                            {/* Login or Create Account Button */}
                            <button
                              onClick={() => navigate(ROUTES.LOGIN)}
                              className="hover:opacity-90 transition-opacity flex items-center justify-center ml-2"
                              style={{
                                width: '178.22px',
                                height: '44.78px',
                                background: 'linear-gradient(90deg, #431718 0%, #4B1B1C 44.23%, #5B2525 91.83%)',
                                border: 'none',
                                borderRadius: '6.89px',
                                cursor: 'pointer',
                                boxShadow: '0px 3.44px 5.17px -0.86px #0000001A',
                              }}
                            >
                              <span style={{
                                width: '161px',
                                height: '18px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 500,
                                fontSize: '13.78px',
                                lineHeight: '17.22px',
                                letterSpacing: '0px',
                                textAlign: 'center',
                                color: '#FFFFFF',
                              }}>
                                Login / Sign Up
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </nav>

                <div className="max-w-full mx-auto px-0 pt-0 pb-0">
                  <div className="text-center mb-0">
                    <p className="mb-4 -mt-6 text-center text-[11px] font-medium tracking-[0.35em] uppercase text-[#b68d40]">
                      Premium Travel Experiences Since 2000
                    </p>
                    <h1 className="font-display mb-3 text-center text-[40px] leading-[46px] font-medium text-primary">
                      Extraordinary Journeys,{' '}
                      <em className="italic text-[#b68d40]">Unforgettable Luxury.</em>
                    </h1>
                    <div className="mx-auto mb-4 h-0.5 w-16 bg-gradient-to-r from-transparent via-accent to-transparent"></div>
                    <p className="text-center text-base text-muted-foreground">
                      Handpicked luxury travel experiences crafted around you
                    </p>
                    <div className="mt-8 pb-5 pt-5">
                      {/* <LuxuryFeatures /> */}
                    </div>
                  </div>

                  <DashboardSearchCard
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    onFlightSearch={onFlightSearch}
                    selectedPassportPlan={selectedPassportPlan}
                  />
                  <div className="relative z-10">
                    <div
                      className="h-20 w-full"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #F9FAFB 100%)'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* --- MOBILE VIEW (REMOVED - Now handled at top level) --- */}
            </div>
          </div>

          {/* Body Section - Results/Content */}
          <div
            className=""
            style={{
              background: 'linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)',
              marginTop: '-40px',
              paddingTop: '40px',
            }}
          >
            {activeTab === 'flights' && <FlightsContent />}
            {activeTab === 'hotels' && <HotelsContent />}
            {activeTab === 'visa' && <VisaContent />}
            {activeTab === 'cabs' && <CabsContent />}
            {activeTab === 'tours' && <ToursContent />}
            {activeTab === 'insurance' && <InsuranceConnect />}
            {activeTab === 'cruise' && <CruiseContent/>}
            {activeTab === 'charters' && <ChartersContent />}
            {activeTab === 'passport' && (
              <PassportConternt onSelectPlan={setSelectedPassportPlan} />
            )}
          </div>
        </div>
      </div>

      {/* ========== BOTTOM NAVIGATION (Mobile) ========== */}
      <BottomNav />
    </div>
  );
}