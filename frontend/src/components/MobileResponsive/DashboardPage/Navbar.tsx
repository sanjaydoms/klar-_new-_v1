import React, { useEffect, useState } from 'react';
import Logo from '/images/logo.png?url';
import Profile from '/logo/nav_profile.png';
import hamburger from '/logo/nav_hamburger.png';
import KlarLogoDark from '/logo/KLARBlue.png?url';
import { useNavigate } from 'react-router-dom';

import { useDispatch } from 'react-redux';
import { logout as reduxLogout } from '../../../features/authentication/authSlice';
import { useAuth } from '@/features/authentication/hooks/useAuth';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    setIsLoggedIn(!!(token || userData));
  }, []);

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }

      dispatch(reduxLogout());

      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');

        document.cookie = c
          .replace(/^ +/, '')
          .replace(
            /=.*/,
            '=;expires=' + new Date().toUTCString() + ';path=/;domain=' + window.location.hostname,
          );
      });

      setIsLoggedIn(false);
      window.location.href = '/b2b';
    } catch (error) {
      console.error('Logout failed:', error);

      dispatch(reduxLogout());
      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      setIsLoggedIn(false);
      window.location.href = '/b2b';
    }
  };

  return (
    <nav
      className={`bg-transparent backdrop-blur-sm shadow-none fixed w-full z-50 transition-colors duration-300 ${
        // isMenuOpen ? 'bg-white !important' : ''
        isMenuOpen 
      ? 'bg-slate-900 text-white' 
      : 'bg-indigo-600/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <img
              src={isMenuOpen ? KlarLogoDark : Logo}
              alt="Klar Logo"
              className="h-12 w-auto md:h-10 transition-all duration-300"
            />
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-white hover:text-indigo-300 transition">
              Home
            </a>
            <a href="#" className="text-white hover:text-indigo-300 transition">
              Destinations
            </a>
            <a href="#" className="text-white hover:text-indigo-300 transition">
              About
            </a>
            <a href="#" className="text-white hover:text-indigo-300 transition">
              Contact
            </a>

            {!isLoggedIn && (
              <div
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition cursor-pointer"
                onClick={() => navigate('/b2b')}
              >
                <img src={Profile} alt="Profile" className="w-5 h-5 object-contain" />
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-4">
            {!isLoggedIn && (
              <div
                className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition cursor-pointer ${
                  isMenuOpen ? 'bg-gray-100' : 'bg-white'
                }`}
                onClick={() => navigate('/b2b')}
              >
                <img src={Profile} alt="Profile" className="w-5 h-5 object-contain" />
              </div>
            )}

            <div
              className={`w-9 h-9 rounded-full backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition ${
                isMenuOpen ? 'bg-gray-100' : 'bg-white'
              }`}
            >
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`focus:outline-none flex items-center justify-center ${
                  isMenuOpen ? 'text-gray-800' : 'text-white'
                }`}
              >
                
                  {isMenuOpen ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                     </svg>
                  ) : (
                    <img src={hamburger} alt="Open Menu" className="h-5 w-5 object-contain" />
                  )}
               
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 bg-white rounded-b-lg shadow-lg">
            <div className="flex flex-col space-y-3">
              {/* <a
                href="#"
                className="text-gray-800 hover:text-indigo-600 transition px-2 font-medium"
              >
                Destinations
              </a> */}
              <a
                href="/about-us"
                className="text-gray-800 hover:text-indigo-600 transition px-2 font-medium"
              >
                About
              </a>
              <a
                href="/contact-us"
                className="text-gray-800 hover:text-indigo-600 transition px-2 font-medium"
              >
                Contact
              </a>

              {isLoggedIn && (
                <button
                  onClick={handleLogout}
                  className="text-left px-2 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 transition font-medium border-t border-gray-200 mt-2 pt-3"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
