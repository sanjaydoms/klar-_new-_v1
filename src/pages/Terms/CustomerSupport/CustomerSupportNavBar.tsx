import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import ProfileDropdown from '@/components/ProfileComponents/ProfileDropdown';
import { Menu, User, Luggage, Heart } from 'lucide-react';
import { ROUTES } from '@/routes/routes.config';

interface CustomerSupportNavBarProps {
  onLogout?: () => void;
}

const CustomerSupportNavBar: React.FC<CustomerSupportNavBarProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close profile dropdown on click outside
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

  return (
    <header className="w-full bg-white relative z-50 border-b border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-3.5 flex items-center justify-between">
        
        {/* Logo Container */}
        <div 
          className="flex items-center cursor-pointer select-none" 
          onClick={() => navigate('/')}
        >
          <img 
            src="/public/images/logo.png" 
            alt="Klar Logo" 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]" 
          /> 
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8">
          {user ? (
            <>
              {/* My Bookings */}
              <button
                onClick={() => navigate('/my-bookings')}
                className="text-[#1A1F4D] hover:text-[#B68D40] transition-colors font-semibold text-sm lg:text-base cursor-pointer"
              >
                My Bookings
              </button>

              {/* Wishlist */}
              <button
                onClick={() => navigate(ROUTES.HOTEL_WISHLIST)}
                className="text-[#1A1F4D] hover:text-[#B68D40] transition-colors font-semibold text-sm lg:text-base cursor-pointer"
              >
                Wishlist
              </button>

              {/* Contact Us */}
              <button
                onClick={() => navigate('/contact-us')}
                className="text-[#1A1F4D] hover:text-[#B68D40] transition-colors font-semibold text-sm lg:text-base cursor-pointer"
              >
                Contact Us
              </button>

              {/* Profile Dropdown Container */}
              <div className="relative z-[100]" ref={dropdownRef}>
                <div
                  className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 pr-2 sm:pr-3 bg-gray-50 border border-gray-200 rounded-full cursor-pointer hover:bg-white hover:shadow-md transition-all duration-300 group"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="bg-gray-600 p-1.5 sm:p-2 rounded-full hover:bg-gray-700 transition-colors">
                    <User size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                </div>

                {showProfileDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 z-[100]">
                    <ProfileDropdown onLogout={onLogout || (() => {})} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4">
              {/* My Trips */}
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                <div className="w-[42px] h-[42px] bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shadow-xs">
                  <Luggage className="w-5 h-5 text-red-500" strokeWidth={2} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[#210202] font-semibold text-xs sm:text-sm leading-tight">My Trips</span>
                  <span className="text-gray-500 text-[10px]">Manage Your bookings</span>
                </div>
              </div>

              {/* Separator */}
              <div className="w-px h-[24px] border-l border-dashed border-gray-300 mx-1"></div>

              {/* Wishlist */}
              <div 
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => navigate(ROUTES.HOTEL_WISHLIST)}
              >
                <div className="w-[42px] h-[42px] bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shadow-xs">
                  <Heart className="w-5 h-5 text-red-500 fill-current" strokeWidth={0} />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="text-[#210202] font-semibold text-xs sm:text-sm leading-tight">Wishlist</span>
                  <span className="text-gray-500 text-[10px]">Save favourites</span>
                </div>
              </div>

              {/* Contact Us */}
              <button
                onClick={() => navigate('/contact-us')}
                className="text-[#1A1F4D] hover:text-[#B68D40] transition-colors font-semibold text-sm lg:text-base px-2 cursor-pointer"
              >
                Contact Us
              </button>

              {/* Login / Sign Up Button */}
              <button
                onClick={() => navigate(ROUTES.LOGIN)}
                className="hover:opacity-90 transition-opacity flex items-center justify-center text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-[0px_3.44px_5.17px_-0.86px_rgba(0,0,0,0.1)] cursor-pointer ml-2"
                style={{
                  background: 'linear-gradient(90deg, #431718 0%, #4B1B1C 44.23%, #5B2525 91.83%)',
                }}
              >
                Login / Sign Up
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={toggleMobileMenu}
            type="button"
            className="p-2 rounded-md text-[#1A1F4D] hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 pt-4 pb-6 space-y-4 shadow-lg animate-fadeIn">
          {user ? (
            <>
              <button 
                onClick={() => { navigate('/my-bookings'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                My Bookings
              </button>
              
              <button 
                onClick={() => { navigate(ROUTES.HOTEL_WISHLIST); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                Wishlist
              </button>

              <button 
                onClick={() => { navigate('/contact-us'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                Contact Us
              </button>

              <button 
                onClick={() => { 
                  if (onLogout) onLogout(); 
                  setIsMobileMenuOpen(false); 
                }}
                className="w-full text-white py-2.5 rounded-full text-base font-semibold bg-[#3D0C10] active:scale-95 transition-transform"
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => { navigate(ROUTES.LOGIN); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                My Trips
              </button>

              <button 
                onClick={() => { navigate(ROUTES.HOTEL_WISHLIST); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                Wishlist
              </button>

              <button 
                onClick={() => { navigate('/contact-us'); setIsMobileMenuOpen(false); }}
                className="block w-full text-left font-semibold text-[#1A1F4D] text-base py-2 hover:text-[#B68D40]"
              >
                Contact Us
              </button>

              <button 
                onClick={() => { navigate(ROUTES.LOGIN); setIsMobileMenuOpen(false); }}
                className="w-full text-white py-2.5 rounded-full text-base font-semibold shadow-md active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(90deg, #431718 0%, #4B1B1C 44.23%, #5B2525 91.83%)',
                }}
              >
                Login / Sign Up
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default CustomerSupportNavBar;