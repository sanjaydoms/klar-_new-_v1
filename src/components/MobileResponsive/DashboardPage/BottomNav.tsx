import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notifyInfo } from '@/utils/notify';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  path?: string;
}

interface BottomNavProps {
  items?: NavItem[];
  onItemClick?: (id: string) => void;
  className?: string;
  activeColor?: string;
  inactiveColor?: string;
  mobileBreakpoint?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({
  items,
  onItemClick,
  className = '',
  activeColor = '#1a1f4d',
  inactiveColor = '#9CA3AF',
  mobileBreakpoint = 768,
}) => {
  const [activeId, setActiveId] = useState('home');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= mobileBreakpoint);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileBreakpoint]);

  const defaultItems: NavItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
        </svg>
      ),
      activeIcon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1m-2 0h2" />
        </svg>
      ),
      path: '/',
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      activeIcon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
      path: '/my-bookings',
    },
    {
      id: 'offers',
      label: 'Offers',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      activeIcon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      path: '/offer-page',
    },
    {
      id: 'trips',
      label: 'Trips',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      activeIcon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      path: '/trips',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      activeIcon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      path: '/settings',
    },
  ];

  const navItems = items || defaultItems;

  const handleClick = (id: string) => {
    setActiveId(id);

    if (id === 'trips') {
      notifyInfo('Coming Soon!');
      return;
    }

    // Find the clicked item and navigate to its path
    const clickedItem = navItems.find(item => item.id === id);
    if (clickedItem?.path) {
      navigate(clickedItem.path);
    }

    if (onItemClick) {
      onItemClick(id);
    }
  };

  // Don't render anything if not on mobile
  if (!isMobile) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden ${className}`}
    >
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = activeId === item.id;
          const iconToShow = isActive && item.activeIcon ? item.activeIcon : item.icon;
          const color = isActive ? activeColor : inactiveColor;

          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200"
            >
              <div style={{ color }}>
                {iconToShow}
              </div>
              <span
                className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}
                style={{ color }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;