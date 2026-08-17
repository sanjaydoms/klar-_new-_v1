import React from 'react';
import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { encodeRoomsToUrl } from '@/utils/hotelUtils';

import Dubai from '/images/Dubai.png?url';
import Switzerland from '/images/Switzerland.png?url';
import Indonesia from '/images/Indonesia.png?url';
import Bali from '/images/Bali.png?url';

interface Destination {
  name: string;
  price: string;
  image: string;
}

const PopularDestinations: React.FC = () => {
  const navigate = useNavigate();

  const destinations: Destination[] = [
    { name: 'Dubai', price: '8,299', image: Dubai },
    { name: 'Switzerland', price: '8,299', image: Switzerland },
    { name: 'Indonesia', price: '8,299', image: Indonesia },
    { name: 'Bali', price: '8,299', image: Bali },
  ];

  const getTomorrowStr = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const getDayAfterStr = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return getTomorrowStr();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const handleDestinationClick = (destName: string) => {
    const checkIn = getTomorrowStr();
    const checkOut = getDayAfterStr(checkIn);
    const rooms = [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
    const roomsStr = encodeRoomsToUrl(rooms);

    const searchParams = {
      location: destName,
      destinationCode: '',
      checkIn,
      checkOut,
      rooms,
      bookForGroup: false,
    };

    sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
    sessionStorage.removeItem('hotelSearchResults');

    // Simulate save recent search so it shows up in history
    const recentSearchStr = localStorage.getItem('recentHotelSearches');
    let recentSearches = recentSearchStr ? JSON.parse(recentSearchStr) : [];
    const newSearch = {
      name: destName,
      type: 'city',
      checkIn,
      checkOut,
      rooms,
      destCode: '',
      timestamp: Date.now(),
    };
    recentSearches = [newSearch, ...recentSearches.filter((s: any) => s.name !== destName)].slice(
      0,
      5,
    );
    localStorage.setItem('recentHotelSearches', JSON.stringify(recentSearches));

    const searchUrl = `/hotels/search?city=${encodeURIComponent(destName)}&destCode=&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`;

    navigate(searchUrl, { state: { triggerSearch: true } });
  };

  return (
    <div className="mt-2 px-4 pb-6">
      <div className="mb-4">
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
            onClick={() => handleDestinationClick(destination.name)}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer relative group"
          >
            {/* Image - Full card */}
            <img
              src={destination.image}
              alt={destination.name}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

            {/* Content - Overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="font-semibold text-white text-lg">{destination.name}</h3>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PopularDestinations;
