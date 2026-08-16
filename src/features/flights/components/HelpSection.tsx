import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LimitedTimeOfferProps {
  className?: string;
  onBookNow?: () => void;
}

// Optional: Add type for route state
interface RouteState {
  from: string;
  to: string;
  departureDate?: string;
  tripType: 'oneway' | 'roundtrip' | 'multicity';
  adults?: string;
  children?: string;
  infants?: string;
}

export default function LimitedTimeOffer({ className = '', onBookNow }: LimitedTimeOfferProps) {
  const navigate = useNavigate();

  const clearSessionStorage = () => {
    const keysToKeep = ['footerRouteData'];
    const allKeys = Object.keys(sessionStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const handleBookNow = () => {
    if (onBookNow) {
      onBookNow();
      return;
    }

    // Calculate departure date (30 days from today)
    const departureDate = new Date();
    departureDate.setDate(departureDate.getDate() + 30);
    const formattedDate = departureDate.toISOString().split('T')[0];

    // Clear session storage (similar to footer logic)
    clearSessionStorage();

    // Check if it's mobile screen (width < 768px)
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      // Redirect to mobile flight search page
      navigate('/mobile-flight-search', {
        state: {
          from: 'Delhi',
          to: 'Dubai',
          departureDate: formattedDate,
          tripType: 'oneway',
          adults: '1',
          children: '0',
          infants: '0'
        }
      });
    } else {
      // Desktop/Tablet: Navigate to flights page directly
      navigate('/flights/oneway', {
        state: {
          from: 'Delhi',
          to: 'Dubai',
          departureDate: formattedDate,
          tripType: 'oneway',
          adults: '1',
          children: '0',
          infants: '0'
        }
      });
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className="relative rounded-2xl overflow-hidden p-4 md:p-6 lg:p-8 min-h-[200px] flex items-center"
        style={{
          backgroundImage: 'url("/images/Sky.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--color-brand-red)]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[var(--color-brand-red)]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        {/* Gradient Overlay*/}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0) 100%)'
          }}
        ></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-start text-left max-w-2xl">
          {/* Limited Time Offer Badge */}
          <div className="inline-flex items-center gap-2 backdrop-blur-sm rounded-full px-3 py-1 mb-2 border border-[var(--color-brand-red)]/30" style={{ backgroundColor: '#e0242f' }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
            </span>
            <span
              className="text-[10px] font-semibold text-white uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Limited Time Offer
            </span>
          </div>

          {/* Heading */}
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1.5"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            Fly to Dubai
          </h2>

          {/* Description */}
          <p
            className="text-gray-300 text-xs md:text-sm max-w-xl mb-4"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Enjoy exclusive flight deals that combine the best prices with a seamless, premium booking experience.
          </p>
          <button
            onClick={handleBookNow}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-xs md:text-sm"
            style={{
              fontFamily: "'Inter', sans-serif",
              backgroundColor: '#FFFFFF',
              color: '#1a1f4d'
            }}
          >
            Book Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}