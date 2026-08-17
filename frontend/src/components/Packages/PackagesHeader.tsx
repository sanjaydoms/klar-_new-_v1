import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Hotel, FileText, Shield, Calendar, Menu, User } from 'lucide-react';
import ProfileDropdown from '../ProfileComponents/ProfileDropdown';
import { useScroll } from '../../hooks/useScroll';

interface PackagesHeaderProps {
  activeService?: 'flights' | 'hotels' | 'visa' | 'insurance' | 'holiday';
}

const PackagesHeader = ({ activeService = 'visa' }: PackagesHeaderProps) => {
  const navigate = useNavigate();
  const { isVisible } = useScroll();
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

  const navigationItems = [
    { id: 'flights', label: 'Flights', icon: Plane, path: '/dashboard' },
    { id: 'hotels', label: 'Hotels', icon: Hotel, path: '/hotels/search' },
    { id: 'visa', label: 'Visa', icon: FileText, path: '/visa' },
    { id: 'insurance', label: 'Insurance', icon: Shield, path: '/insurance' },
    { id: 'holiday', label: 'Holiday', icon: Calendar, path: '/holiday' },
  ];

  return (
    <header
      className={`fixed top-[37px] left-0 right-0 z-50 flex justify-center pointer-events-none transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-[200%]'
      }`}
    >
      <div
        className="flex items-center pointer-events-auto"
        style={{
          width: '1215px',
          height: '58px',
          gap: '263px',
        }}
      >
        <div
          className="flex items-center cursor-pointer select-none"
          onClick={() => navigate('/dashboard')}
        >
          <img
            src="/images/logo.png"
            alt="Klar Travels"
            className="h-[40px] w-auto object-contain"
          />
        </div>

        {/* Main Navigation Pill */}
        <div className="flex-1 flex items-center justify-between">
          <nav className="bg-gray-400/80 backdrop-blur-md rounded-full px-2 py-1.5 flex items-center gap-1 shadow-inner h-full w-full max-w-[700px]">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeService === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-bold ${
                    isActive
                      ? 'bg-white text-gray-900 shadow-lg scale-105'
                      : 'text-gray-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-gray-900' : 'text-gray-200'}`} />
                  <span className="text-[14px]">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Pill */}
          <div
            className="bg-white rounded-full p-1.5 flex items-center gap-3 shadow-lg border border-gray-100 ml-auto h-full relative"
            ref={dropdownRef}
          >
            <div className="p-1.5 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
              <Menu className="w-5 h-5 text-gray-500" />
            </div>
            <div
              className="bg-gray-600 p-2 rounded-full cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              <User className="w-5 h-5 text-white" />
            </div>

            {showProfileDropdown && <ProfileDropdown />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PackagesHeader;
