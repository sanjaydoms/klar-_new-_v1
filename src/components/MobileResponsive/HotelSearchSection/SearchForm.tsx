import React, { useState, useRef } from 'react';
import {
  MapPin,
  Calendar,
  Users,
  Building,
  ShieldCheck,
  CalendarCheck,
  CreditCard,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HotelAutocomplete from '@/features/hotels/components/HotelAutocomplete';
import RoomGuestSelector from '@/features/hotels/components/RoomGuestSelector';
import type { RoomOccupancy } from '@/features/hotels/types/hotelTypes';
import { searchHotels } from '@/features/hotels/services/hotelSearchService';
import { encodeRoomsToUrl, saveRecentSearch } from '@/utils/hotelUtils';
import HotelDateRangePicker from '@/features/hotels/components/HotelDateRangePicker';
import { notifyError } from '@/utils/notify';

const SearchForm: React.FC = () => {
  const navigate = useNavigate();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
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

  const [hotelLocation, setHotelLocation] = useState('');
  const [hotelDestCode, setHotelDestCode] = useState('');
  const [hotelId, setHotelId] = useState<string | undefined>(undefined);

  // Default check-in tomorrow, check-out day after
  const [checkIn, setCheckIn] = useState(getTomorrowStr());
  const [checkOut, setCheckOut] = useState(getDayAfterStr(getTomorrowStr()));
  const [searching, setSearching] = useState(false);
  const [rooms, setRooms] = useState<RoomOccupancy[]>([
    { numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] },
  ]);

  const checkOutRef = useRef<HTMLInputElement>(null);

  const handleAutocompleteChange = (loc: string, code: string, hId?: string) => {
    setHotelLocation(loc);
    setHotelDestCode(code);
    setHotelId(hId);
  };

  const handleDateSelect = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
  };

  const handleSearch = async () => {
    if (!hotelLocation || !checkIn || !checkOut) {
      notifyError('Please fill all required fields');
      return;
    }

    setSearching(true);
    const searchParams = {
      location: hotelLocation,
      destinationCode: hotelDestCode,
      checkIn,
      checkOut,
      rooms,
      bookForGroup: false,
    };

    const apiParams: any = {
      destination: hotelId || hotelLocation,
      hotelId: hotelId || undefined,
      destinationCode: hotelDestCode,
      checkin: checkIn,
      checkout: checkOut,
      rooms: rooms,
      countryCode: 'IN',
      currency: 'INR',
    };

    sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
    sessionStorage.removeItem('hotelSearchResults');

    try {
      searchHotels(apiParams).catch((err) => console.error('Early search initiation failed:', err));

      saveRecentSearch({
        name: hotelLocation,
        type: hotelId ? 'hotel' : 'city',
        checkIn,
        checkOut,
        rooms: rooms,
        destCode: hotelDestCode,
        hotelId: hotelId,
      });

      const roomsStr = encodeRoomsToUrl(rooms);
      const searchUrl = hotelId
        ? `/hotels/${hotelId}?city=${encodeURIComponent(hotelLocation)}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`
        : `/hotels/search?city=${encodeURIComponent(hotelLocation)}&destCode=${encodeURIComponent(hotelDestCode)}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`;

      setTimeout(() => {
        navigate(searchUrl, { state: { triggerSearch: true } });
      }, 800);
    } catch (error) {
      console.error('Search failed:', error);
      setSearching(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div className="relative -mt-10 px-4 z-20 pb-4">
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
        {/* Destination */}
        <div className="border border-gray-200 rounded-xl p-3 mb-3 flex items-center gap-3 relative z-50">
          <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 w-full relative">
            <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mb-0.5">
              Destination
            </p>
            <HotelAutocomplete
              value={hotelLocation}
              onChange={handleAutocompleteChange}
              placeholder="Where are you going?"
              className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none p-0 border-0 h-auto"
            />
          </div>
        </div>

        {/* Dates */}
        <HotelDateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onSelect={handleDateSelect}
          isMobile={true}
          renderTrigger={(openCheckIn, openCheckOut) => (
            <div className="flex gap-3 mb-3">
              <div
                className="flex-1 border border-gray-200 rounded-xl p-3 flex items-center justify-between relative overflow-hidden cursor-pointer"
                onClick={openCheckIn}
              >
                <div className="flex items-center gap-3 pointer-events-none w-full">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mb-0.5">
                      Check In
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(checkIn)}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              <div
                className="flex-1 border border-gray-200 rounded-xl p-3 flex items-center justify-between relative overflow-hidden cursor-pointer"
                onClick={openCheckOut}
              >
                <div className="flex items-center gap-3 pointer-events-none w-full">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mb-0.5">
                      Check Out
                    </p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(checkOut)}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        />

        {/* Guests */}
        <div
          className="border border-gray-200 rounded-xl p-3 mb-4 flex items-center justify-between relative cursor-pointer"
          onClick={(e) => {
            const btn = e.currentTarget.querySelector('button');
            if (btn && e.target !== btn && !btn.contains(e.target as Node)) {
              btn.click();
            }
          }}
        >
          <div className="flex items-center gap-3 pointer-events-none w-full">
            <Users className="w-5 h-5 text-gray-500" />
            <div className="flex-1">
              <p className="text-[10px] text-gray-400 font-bold tracking-wider uppercase mb-0.5">
                No of Guests
              </p>
              <div className="pointer-events-auto">
                <RoomGuestSelector
                  rooms={rooms}
                  onChange={setRooms}
                  className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none p-0 border-0 h-auto text-left"
                />
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none absolute right-3" />
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          disabled={searching}
          className="w-full bg-primary text-white rounded-xl py-3.5 flex items-center justify-center gap-2 font-semibold text-base shadow-md hover:bg-[#600505] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : 'Search Hotels'}
          {searching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Building className="w-4 h-4" />
          )}
        </button>

        {/* Features footer */}
        <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4 px-2">
          <div className="flex flex-col items-center text-center gap-1">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-gray-600 leading-tight">
              Best Price
              <br />
              Guarantee
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-gray-600 leading-tight">
              Flexible
              <br />
              Booking
            </span>
          </div>
          <div className="flex flex-col items-center text-center gap-1">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-[10px] text-gray-600 leading-tight">
              Secure
              <br />
              Payments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchForm;
