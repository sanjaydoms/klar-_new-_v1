import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Users,
  FileText,
  Settings,
  LogOut,
  PieChart,
  Database,
  Heart,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { logout as reduxLogout } from '../../features/authentication/authSlice';

import { ROUTES } from '../../routes/routes.config';

interface ProfileDropdownProps {
  onLogout?: () => void;
}

export default function ProfileDropdown({ onLogout }: ProfileDropdownProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // First, call the auth logout if available
      if (logout) {
        await logout();
      }

      // Clear Redux state
      dispatch(reduxLogout());

      // Clear all storage data
      localStorage.clear();
      sessionStorage.clear();

      // Clear all cookies - more comprehensive approach
      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');

        // Also clear with domain
        document.cookie = c
          .replace(/^ +/, '')
          .replace(
            /=.*/,
            '=;expires=' + new Date().toUTCString() + ';path=/;domain=' + window.location.hostname,
          );
      });

      // Force redirect to /b2b (not login)
      window.location.href = '/b2b';
    } catch (error) {
      console.error('Logout failed:', error);

      // Even if error, clear everything
      dispatch(reduxLogout());
      localStorage.clear();
      sessionStorage.clear();

      document.cookie.split(';').forEach(function (c) {
        document.cookie = c
          .replace(/^ +/, '')
          .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });

      // Force redirect to /b2b
      window.location.href = '/b2b';
    }
  };

  // Helper function to get user display name
  const getUserDisplayName = () => {
    if (!user) return 'User';

    // Try to get name from email (username part)
    if (user.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  };

  const menuItems = [
    { name: 'Profile', path: '/settings', icon: Users, active: true },
    // { name: 'Agent Dashboard', path: ROUTES.AGENT_DASHBOARD, icon: LayoutDashboard, active: true },
    { name: 'Bookings', path: ROUTES.MY_BOOKINGS, icon: BookOpen },
    { name: 'Wishlist', path: ROUTES.HOTEL_WISHLIST, icon: Heart },
    // { name: 'Wallet', path: '/b2b/wallet', icon: Wallet },
    // { name: 'Customers', path: '/customers', icon: Users },
    // { name: 'Leads', path: '/leads', icon: FileText },
    // { name: 'Masters', path: '/masters', icon: Database },
    // { name: 'Reports', path: '/reports', icon: PieChart },
    // { name: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
  ];

  return (
    <div className="absolute top-[calc(100%+4px)] right-0 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Upward Triangle/Caret */}
      <div className="absolute -top-[5px] right-4 w-3 h-3 bg-white border-t border-l border-gray-100 transform rotate-45 z-10" />
      
      {/* Dropdown Box */}
      <div className="relative w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-20">
        {/* User Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">{getUserDisplayName()}</h3>
          <p className="text-sm text-gray-500">{user?.email || 'No email'}</p>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="flex-1">{item.name}</span>
                {isActive && (
                  <div className="w-5 h-5 rounded-full border border-blue-500 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
