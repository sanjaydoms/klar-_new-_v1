import klar from '/logo/KLARBlue.png';
import { Link } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import ProfileDropdown from '@/components/ProfileComponents/ProfileDropdown';
import { Menu, User, Plane, Hotel, FileText, Shield, Calendar, Car } from 'lucide-react';

interface MainNavbarProps {
  activeService?: 'flights' | 'hotels' | 'visa' | 'insurance' | 'holiday' | 'cabs';
  isRelative?: boolean;
}

const MainNavbar: React.FC<MainNavbarProps> = ({ activeService = 'flights', isRelative = false }) => {
  // const location = useLocation();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const navItems = [
    { id: 'flights', name: 'Flights', path: '/dashboard?tab=flights', icon: Plane },
    { id: 'hotels', name: 'Hotels', path: '/dashboard?tab=hotels', icon: Hotel },
    { id: 'visa', name: 'Visa', path: '/dashboard?tab=visa', icon: FileText },
    { id: 'insurance', name: 'Insurance', path: '/dashboard?tab=insurance', icon: Shield },
    { id: 'holiday', name: 'Holiday', path: '/dashboard?tab=tours', icon: Calendar },
    { id: 'cabs', name: 'Cabs', path: '/dashboard?tab=cabs', icon: Car },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full bg-white z-[100] flex justify-center pointer-events-none transition-transform duration-300 `}
    >
      <div
        className="flex items-center pointer-events-auto bg-white/90 backdrop-blur-md px-4 md:px-8 xl:px-12 py-2 sm:py-3"
        style={{
          width: '100%',
          minHeight: '64px',
          height: 'auto',
        }}
      >
        {/* Logo */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2 group mr-auto">
          <img
            src={klar}
            alt="Klar Travel"
            className="h-6 xs:h-7 sm:h-8 md:h-10 lg:h-12 w-auto transition-transform duration-500 group-hover:scale-110"
          />
        </Link>

        {/* Desktop Navigation - Center Pill */}
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="bg-gray-100/50 backdrop-blur-md rounded-full px-1.5 sm:px-2 lg:px-3 py-1 lg:py-1.5 flex items-center gap-0.5 sm:gap-1 lg:gap-1.5 shadow-inner ring-1 ring-black/5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeService === item.id;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-2.5 md:py-3 rounded-full transition-all duration-500 font-semibold group text-xs sm:text-sm ${active
                    ? 'text-white shadow-lg scale-105'
                    : 'text-gray-500 hover:text-[#1A1F4D] hover:bg-[#1A1F4D]/10'
                    }`}
                  style={{
                    backgroundColor: active ? '#1A1F4D' : 'transparent',
                  }}
                >
                  <Icon
                    size={16}
                    className={`transition-colors duration-500 sm:w-[18px] sm:h-[18px] ${active ? 'text-white' : 'text-gray-500 group-hover:text-[#1A1F4D]'
                      }`}
                  />
                  <span className="tracking-wide hidden sm:inline">{item.name}</span>
                  <span className="tracking-wide sm:hidden">{item.name.charAt(0)}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right Action Pill & Dropdown */}
        <div className="relative flex items-center justify-end flex-shrink-0" ref={dropdownRef}>
          <div
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 pr-2 sm:pr-3 bg-gray-50 border border-gray-200 rounded-full cursor-pointer hover:bg-white hover:shadow-md transition-all duration-300 group"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <div className="bg-gray-600 p-1.5 sm:p-2 rounded-full cursor-pointer hover:bg-gray-700 transition-colors">
              <User size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            </div>
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-gray-900 transition-colors" />
          </div>

          {/* ProfileDropdown self-positions (absolute top-full right-0) against
              this relative container — do NOT wrap it in another absolutely
              positioned box or it double-offsets and floats away misaligned. */}
          {showProfileDropdown && <ProfileDropdown />}
        </div>
      </div>

      {/* Mobile Navigation - Bottom Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 pointer-events-auto z-50">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex justify-between items-center h-[65px] sm:h-[70px] px-1.5 gap-0.5 sm:gap-1">
          {navItems.map((item) => {
            const active = activeService === item.id;
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`relative flex flex-col items-center justify-center flex-1 h-[52px] sm:h-[58px] rounded-[18px] transition-all duration-300 ease-out ${active
                  ? 'bg-[#1A1F4D] text-white shadow-lg shadow-[#1A1F4D]/20 transform -translate-y-1'
                  : 'text-gray-400 hover:text-gray-600 bg-transparent'
                  }`}
              >
                <Icon size={active ? 18 : 20} strokeWidth={active ? 2.5 : 2} className="mb-0.5 sm:mb-1" />
                <span className={`text-[7px] xs:text-[8px] sm:text-[8.5px] font-bold uppercase tracking-wider ${active ? 'opacity-100' : 'opacity-80'
                  }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out forwards;
        }
        
        @media (max-width: 320px) {
          .xs\\:h-7 { height: 1.75rem; }
          .xs\\:text-\\[8px\\] { font-size: 8px; }
        }
      `}</style>
    </nav>
  );
};

export default MainNavbar;