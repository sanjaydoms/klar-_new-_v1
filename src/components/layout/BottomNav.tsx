import { Home, Bookmark, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../routes/routes.config';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Home', icon: Home, path: ROUTES.DASHBOARD },
    { label: 'Bookings', icon: Bookmark, path: ROUTES.MY_BOOKINGS },
    { label: 'Profile', icon: User, path: ROUTES.PROFILE },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-10 py-2.5 pb-[max(env(safe-area-inset-bottom),10px)] flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        // Consider both exactly DASHBOARD and root '/' as Home
        const isActive =
          location.pathname === item.path ||
          (item.path === ROUTES.DASHBOARD && location.pathname === '/');

        return (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
          >
            <item.icon
              className={`w-[22px] h-[22px] ${isActive ? 'text-[#5b191a]' : 'text-gray-500'}`}
              fill={isActive ? 'currentColor' : 'none'}
            />
            <span
              className={`text-[10px] ${isActive ? 'font-bold text-[#5b191a]' : 'font-medium text-gray-500'}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
