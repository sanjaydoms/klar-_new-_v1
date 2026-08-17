import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileDropdown from '@/components/ProfileComponents/ProfileDropdown';
import {
  User,
  Plane,
  Building2,
  Palmtree,
  Car,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface InsuranceNavbarProps {
  activeService?: 'flights' | 'hotels' | 'visa' | 'insurance' | 'tours' | 'cabs';
}

interface NavItem {
  id: 'flights' | 'hotels' | 'tours' | 'cabs' | 'insurance' | 'visa';
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const InsuranceNavbar: React.FC<InsuranceNavbarProps> = ({
  activeService = 'insurance',
}) => {
  const navigate = useNavigate();
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

  const navItems: NavItem[] = [
    { id: 'flights', name: 'Flights', path: '/', icon: Plane },
    { id: 'hotels', name: 'Hotels', path: '/dashboard', icon: Building2 },
    { id: 'tours', name: 'Tours & Packages', path: '/dashboard', icon: Palmtree },
    { id: 'cabs', name: 'Cabs', path: '/dashboard', icon: Car },
    { id: 'insurance', name: 'Insurance', path: '/insurance', icon: ShieldCheck },
    { id: 'visa', name: 'Visas', path: '/dashboard', icon: FileText },
  ];

  return (
    <nav className="w-full bg-white p-3 z-50 flex justify-center border-b border-gray-100 font-sans sticky top-0 shadow-sm">
      <div
        className="flex items-center bg-white px-2 sm:px-4 lg:px-6 w-full justify-between"
        style={{
          maxWidth: '1215px',
          height: '58px',
        }}
      >
        {/* --- Logo Area --- */}
        <Link to="/" className="flex-shrink-0 flex items-center gap-2 group mr-auto">
          <img
            src="/logo/KLARBlue.png"
            alt="Klar Travel Logo"
            className="h-7 sm:h-8 lg:h-10 xl:h-12 w-auto transition-transform duration-500 group-hover:scale-105 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/images/logo.png';
            }}
          />
        </Link>

        {/* --- Desktop Navigation - Center Pill --- */}
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="bg-gray-100/60 backdrop-blur-md rounded-full px-2 lg:px-3 py-1 lg:py-1.5 flex items-center gap-1 lg:gap-1.5 shadow-inner ring-1 ring-black/5 overflow-x-auto scrollbar-hide">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeService === item.id;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-1.5 lg:gap-2 px-3 lg:px-5 py-2 rounded-full transition-all duration-300 font-semibold group whitespace-nowrap ${
                    isActive
                      ? 'text-white shadow-md scale-105'
                      : 'text-gray-600 hover:text-[#0B153D] hover:bg-[#0B153D]/10'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#0B153D' : 'transparent',
                    fontSize: 'clamp(0.75rem, 1vw, 0.875rem)',
                  }}
                >
                  <IconComponent
                    size={16}
                    className={`transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#0B153D]'
                    }`}
                  />
                  <span className="tracking-wide hidden sm:inline">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* --- Right Action - Profile Dropdown Button --- */}
        <div className="relative flex items-center justify-end flex-shrink-0" ref={dropdownRef}>
          <div
            className="bg-[#0B153D] p-2 rounded-full cursor-pointer hover:bg-[#070e2b] transition-colors shadow-sm"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            title="User Profile"
          >
            <User size={18} className="text-white" />
          </div>

          {showProfileDropdown && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-[60]">
              <ProfileDropdown />
            </div>
          )}
        </div>
      </div>

      {/* --- Mobile Navigation - Bottom Floating Bar --- */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 pointer-events-auto z-50">
        <div className="bg-white/95 backdrop-blur-xl border border-gray-200/80 rounded-2xl shadow-2xl flex justify-around items-center h-14 px-1.5 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = activeService === item.id;
            const IconComponent = item.icon;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-shrink-0 px-2 h-full rounded-2xl transition-all duration-300 ${
                  isActive ? 'text-white scale-105' : 'text-gray-400 hover:text-[#0B153D]'
                }`}
                style={{
                  backgroundColor: isActive ? '#0B153D' : 'transparent',
                  minWidth: '52px',
                }}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-white/10' : ''}`}>
                  <IconComponent size={18} />
                </div>
                <span className="text-[9px] font-semibold mt-0.5 uppercase tracking-wider whitespace-nowrap">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .scrollbar-hide {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </nav>
  );
};

export default InsuranceNavbar;