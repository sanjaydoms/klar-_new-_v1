import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ResponsiveRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // Redirect based on screen size
      if (mobile && location.pathname === '/mobile-home') {
        navigate('/');
      } else if (!mobile && location.pathname === '/mobile-home') {
        navigate('/');
      } else if (!mobile && location.pathname === '/mobile-cruise-search') {
        navigate('/', { state: { activeTab: 'cruise' } });
      } else if (mobile && location.pathname === '/' && sessionStorage.getItem('lastMobileRoute') === '/mobile-cruise-search') {
        // Optional: redirect back to mobile cruise if that was the last page, but it's simpler just to navigate back to mobile home or stay on / which may not be mobile optimized.
        // Let's just handle the desktop redirect for now as requested.
      }
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, location]);

  return <>{children}</>;
};

export default ResponsiveRedirect;
