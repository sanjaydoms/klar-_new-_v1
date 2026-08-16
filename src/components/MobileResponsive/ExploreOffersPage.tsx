import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plane, Hotel, Car, ArrowRight } from 'lucide-react';

// Import your local images
import FlightBg from '/images/FlightOffers.png';
import HotelBg from '/images/HotelOffer.png';
import CabBg from '/images/CabOffer.png';
import BottomNav from './DashboardPage/BottomNav';
// import BottomNav from '../layout/BottomNav';

const ExploreOffersPage: React.FC = () => {
  const navigate = useNavigate();

  const offers = [
    {
      id: 'flights',
      icon: Plane,
      title: 'FLIGHTS',
      subtitle: 'Take Off to Great Savings',
      description: 'Exclusive deals on domestic and international flights',
      bgImage: FlightBg,
    },
    {
      id: 'hotels',
      icon: Hotel,
      title: 'HOTELS',
      subtitle: 'Stay More, Pay Less',
      description: 'Premium stays. Exclusive offers. Unforgettable experiences.',
      bgImage: HotelBg,
    },
    {
      id: 'cabs',
      icon: Car,
      title: 'CABS',
      subtitle: 'Reliable Rides, Better Deals',
      description: 'Airport transfers, city rides and customization of cab services',
      bgImage: CabBg,
    },
  ];

  const handleExploreClick = () => {
    navigate('/');
  };

  // ✅ Add this function
  const handleLogoClick = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/KLARBlue.png"
              alt="Klar Travels"
              className="h-8 sm:h-10 md:h-12 w-auto object-contain"
            />
          </button>
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900">
            Explore Offers
          </h1>
          <p className="text-base sm:text-lg text-gray-600 mt-2">
            Handpicked offers for your next journey
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const Icon = offer.icon;
            return (
              <div
                key={offer.id}
                className="group relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                onClick={handleExploreClick}
              >
                {/* Background Image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{ backgroundImage: `url(${offer.bgImage})` }}
                />
                
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-all duration-500" />

                {/* Content */}
                <div className="relative p-6 sm:p-8 flex flex-col min-h-[280px] sm:min-h-[300px]">
                  <div className="flex-1">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {offer.title}
                    </h2>
                    <h3 className="text-xl font-semibold text-white/90 mb-2">
                      {offer.subtitle}
                    </h3>
                    <p className="text-white/80 text-sm leading-relaxed">
                      {offer.description}
                    </p>
                  </div>

                  <button 
                    className="mt-4 inline-flex items-center gap-2 text-white/90 hover:text-white font-medium text-sm group/btn transition-all"
                    onClick={handleExploreClick}
                  >
                    <span className="border-b-2 border-white/30 group-hover/btn:border-white pb-1">
                      Explore Now
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Features */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 mb-10">
          {[
            { icon: '💰', label: 'Best Price' },
            { icon: '🎯', label: 'Exclusive Deals' },
            { icon: '📅', label: 'Flexible Booking' },
            { icon: '⭐', label: 'Trusted by 10K+' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-5 text-center shadow-md hover:shadow-lg transition-shadow border border-gray-100"
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <p className="font-semibold text-gray-800 text-sm sm:text-base">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
      <BottomNav/>
    </div>
  );
};

export default ExploreOffersPage;