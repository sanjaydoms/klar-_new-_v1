// components/PopularDestinations.tsx
import React from 'react';
import { Clock, Plane, Star } from 'lucide-react';
import Delhi from '/images/Delhi.jpg?url';
import Bangalore from '/images/Bangalore.jpg?url';
import Chennai from '/images/Chennai.jpg?url';
import Dubai from '/images/Dubai.png?url';
import Switzerland from '/images/Switzerland.png?url';
import Indonesia from '/images/Indonesia.png?url';
import Bali from '/images/Bali.png?url';

interface Route {
  from: string;
  to: string;
  type: string;
  duration: string;
  price: string;
  image: string;
}

interface Destination {
  name: string;
  price: string;
  image: string;
}

const PopularDestinations: React.FC = () => {
  const routes: Route[] = [
    {
      from: 'Delhi',
      to: 'Mumbai',
      type: 'Non-stop',
      duration: '2h 15m',
      price: '₹4,219',
      image: Delhi,
    },
    {
      from: 'Bangalore',
      to: 'Go',
      type: 'One-stop',
      duration: '3h 30m',
      price: '₹3,500',
      image: Bangalore,
    },
    {
      from: 'Chennai',
      to: 'Kolkata',
      type: 'Non-stop',
      duration: '2h 50m',
      price: '₹5,100',
      image: Chennai,
    },
  ];

  const destinations: Destination[] = [
    { name: 'Dubai', price: '8,299', image: Dubai },
    { name: 'Switzerland', price: '8,299', image: Switzerland },
    { name: 'Indonesia', price: '8,299', image: Indonesia },
    { name: 'Bali', price: '8,299', image: Bali },
  ];

  return (
    <div className="mt-6">
      <div className="space-y-3">
        {routes.map((route, index) => (
          <div
            key={index}
            onClick={() => {
              const searchSection = document.getElementById('search-section');
              if (searchSection) {
                searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center gap-3 cursor-pointer hover:border-[#CB1822]"
          >
            {/* Image on the left */}
            <img
              src={route.image}
              alt={route.from}
              className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
            />

            {/* Content */}
            <div className="flex-1">
              {/* Top row: Route */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800 text-sm">{route.from}</span>
                  <Plane size={14} className="text-[#D4AF37] rotate-45" />
                  <span className="font-semibold text-gray-800 text-sm">{route.to}</span>
                </div>
                <span className="text-xs text-gray-400">From</span>
              </div>

              {/* Bottom row: Flight type, duration and Price */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{route.type}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-gray-400" />
                    <span>{route.duration}</span>
                  </div>
                </div>
                <span className="font-bold text-sm" style={{ color: '#CB1822' }}>
                  {route.price}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8">
        {/* Divider with Star in middle */}
        <h2 className="text-xl font-bold text-black mb-3 text-center">Popular Destinations</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
          <Star size={16} className="text-[#D4AF37] fill-[#D4AF37]" />
          <div className="flex-1 h-[2px] bg-[#D4AF37]"></div>
        </div>
      </div>

      {/* Destination Cards */}
      <div className="grid grid-cols-2 gap-3">
        {destinations.map((destination, index) => (
          <div
            key={index}
            onClick={() => {
              const searchSection = document.getElementById('search-section');
              if (searchSection) {
                searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer relative"
          >
            {/* Image - Full card */}
            <img
              src={destination.image}
              alt={destination.name}
              className="w-full h-48 object-cover"
            />

            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

            {/* Content - Overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="font-semibold text-white text-sm">{destination.name}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/70">FROM</span>
                <span className="font-bold text-sm text-white">₹ {destination.price}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularDestinations;
