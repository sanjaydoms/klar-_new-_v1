import { useState, useRef, useEffect } from 'react';
import { FaUser, FaBars } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import ProfileDropdown from './ProfileComponents/ProfileDropdown';
import { useScroll } from '../hooks/useScroll';

const Header = () => {
  const navigate = useNavigate();
  const { isVisible } = useScroll();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  return (
    <header
      className={`bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50 transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Klar Logo */}
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/dashboard')}>
          <img src="/images/logo.png" alt="Klar" className="h-10 w-auto object-contain" />
        </div>

        {/* Right Side - Menu and Profile */}
        <div className="flex items-center gap-3 relative" ref={dropdownRef}>
          {/* Mobile Menu Button */}
          <button
            aria-label="Open navigation menu"
            className="md:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setMobileNavOpen((prev) => !prev)}
          >
            <FaBars size={20} />
          </button>

          {/* Profile Icon */}
          <button
            aria-label="Open profile menu"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors"
          >
            <FaUser size={14} className="text-gray-700" />
          </button>

          {showProfileDropdown && <ProfileDropdown />}
        </div>
      </div>

      {/* Mobile Navigation Panel */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 p-4 shadow-lg absolute w-full left-0 top-full flex flex-col gap-3">
          <button
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/dashboard');
            }}
            className="text-left font-semibold text-gray-800 hover:text-blue-600"
          >
            Home
          </button>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/my-bookings');
            }}
            className="text-left font-semibold text-gray-800 hover:text-blue-600"
          >
            My Bookings
          </button>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/cabs');
            }}
            className="text-left font-semibold text-gray-800 hover:text-blue-600"
          >
            Cabs
          </button>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/hotels');
            }}
            className="text-left font-semibold text-gray-800 hover:text-blue-600"
          >
            Hotels
          </button>
          <button
            onClick={() => {
              setMobileNavOpen(false);
              navigate('/flights');
            }}
            className="text-left font-semibold text-gray-800 hover:text-blue-600"
          >
            Flights
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
