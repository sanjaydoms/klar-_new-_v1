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
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { logout as reduxLogout } from '../../features/authentication/authSlice';

import { ROUTES } from '../../routes/routes.config';

interface ProfileDropdownProps2 {
  onLogout?: () => void;
}

export default function ProfileDropdown({ onLogout }: ProfileDropdownProps2) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      if (onLogout) {
        onLogout();
      } else {
        await logout();
        // Clear Redux state
        dispatch(reduxLogout());
        // Reload the page to clear any remaining state
        window.location.reload();
        // Navigate to login after reload
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 100);
      }
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if signOut fails, clear Redux state and reload
      dispatch(reduxLogout());
      window.location.reload();
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 100);
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
    { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard, active: true },
    { name: 'Bookings', path: ROUTES.MY_BOOKINGS, icon: BookOpen },
    // { name: 'Wallet', path: '/wallet', icon: Wallet },
    // { name: 'Customers', path: '/customers', icon: Users },
    // { name: 'Leads', path: '/leads', icon: FileText },
    // { name: 'Masters', path: '/masters', icon: Database },
    // { name: 'Reports', path: '/reports', icon: PieChart },
    // { name: 'Settings', path: ROUTES.SETTINGS, icon: Settings },
  ];

  return (
    <div className="absolute top-16 right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-5 duration-200">
      {/* User Header */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-bold text-gray-900">{getUserDisplayName()}</h3>
        <p className="text-sm text-gray-500">{user?.email || 'No email'}</p>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              item.name === 'Dashboard'
                ? 'bg-red-50 text-red-500'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <span className="flex-1">{item.name}</span>
            {item.name === 'Dashboard' && (
              <div className="w-5 h-5 rounded-full border border-red-500 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
              </div>
            )}
          </Link>
        ))}
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
  );
}
