import { useState, useEffect, useRef } from 'react';
import { Calendar, Search, Loader2, Users, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HotelAutocomplete from '@/features/hotels/components/HotelAutocomplete';
import DestinationAutocomplete from '@/features/hotels/components/DestinationAutocomplete';
import RoomGuestSelector from '@/features/hotels/components/RoomGuestSelector';
import { config } from '@/config/env.config';
import type { RoomOccupancy } from '@/features/hotels/types/hotelTypes';
import { searchHotels } from '@/features/hotels/services/hotelSearchService';
import { encodeRoomsToUrl, saveRecentSearch } from '@/utils/hotelUtils';
import HotelDateRangePicker from '@/features/hotels/components/HotelDateRangePicker';
import { notifyError } from '@/utils/notify';

export default function HotelSearchSection() {
  const navigate = useNavigate();

  // Default dates: Tomorrow and Day After
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

  /**
   * The field opens pre-filled, MMT-style: a real value, not a grey placeholder.
   * Hitting Search straight away must return hotels, so this has to be a name the
   * backend can resolve on its own — "Goa" text-resolves to the whole state.
   */
  const DEFAULT_LOCATION = 'Goa';
  const DEFAULT_LOCATION_SUBTITLE = 'India';

  const [hotelLocation, setHotelLocation] = useState(DEFAULT_LOCATION);
  const [hotelSubtitle, setHotelSubtitle] = useState(DEFAULT_LOCATION_SUBTITLE);
  const [hotelDestCode, setHotelDestCode] = useState('');
  const [hotelId, setHotelId] = useState<string | undefined>(undefined);
  const [checkIn, setCheckIn] = useState(getTomorrowStr());
  const [checkOut, setCheckOut] = useState(getDayAfterStr(getTomorrowStr()));
  const [bookForGroup] = useState(false);
  const [searching, setSearching] = useState(false);
  const [rooms, setRooms] = useState<RoomOccupancy[]>([
    { numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] },
  ]);

  const checkOutRefMobile = useRef<HTMLInputElement>(null);
  const checkOutRefDesktop = useRef<HTMLInputElement>(null);

  const handleAutocompleteChange = (loc: string, code: string, hId?: string, subtitle?: string) => {
    setHotelLocation(loc);
    setHotelDestCode(code);
    setHotelId(hId);
    // While the user is mid-type there is no context line yet; keep the field's
    // second row empty rather than showing the previous destination's country.
    setHotelSubtitle(subtitle ?? '');
  };

  const handleDateSelect = (newCheckIn: string, newCheckOut: string) => {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
  };

  const handleHotelSearch = async () => {
    if (!hotelLocation || !checkIn || !checkOut) {
      notifyError('Please fill all required fields (City/Location, Check-in, Check-out).');
      return;
    }

    // "Goa, Goa" (city == state) doesn't geocode on the search backend the way
    // "Goa" does — collapse duplicate "X, X" display text down to "X" for the
    // actual search/URL, while leaving the field's displayed text untouched.
    const searchLocation = (() => {
      const parts = hotelLocation.split(',').map((p) => p.trim());
      return parts.length === 2 && parts[0].toLowerCase() === parts[1].toLowerCase()
        ? parts[0]
        : hotelLocation;
    })();

    setSearching(true);
    const searchParams = {
      location: searchLocation,
      destinationCode: hotelDestCode,
      checkIn,
      checkOut,
      rooms,
      bookForGroup,
    };

    const apiParams: any = {
      destination: hotelId || searchLocation, // send TJ ID directly when hotel selected
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
      // Initiate background search to warm cache
      searchHotels(apiParams).catch((err) => console.error('Early search initiation failed:', err));

      saveRecentSearch({
        name: searchLocation,
        type: hotelId ? 'hotel' : 'city',
        checkIn,
        checkOut,
        rooms: rooms,
        destCode: hotelDestCode,
        hotelId: hotelId,
      });

      const roomsStr = encodeRoomsToUrl(rooms);
      const searchUrl = hotelId
        ? `/hotels/${hotelId}?city=${encodeURIComponent(searchLocation)}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`
        : `/hotels/search?city=${encodeURIComponent(searchLocation)}&destCode=${encodeURIComponent(hotelDestCode)}&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`;

      navigate(searchUrl, { state: { triggerSearch: true } });
    } catch (error) {
      console.error('Search failed:', error);
      setSearching(false);
    }
  };

  const mmtBoxClass =
    'bg-white rounded-[24px] px-5 py-2 relative hover:shadow-md transition-shadow cursor-pointer w-full min-h-[76px] flex flex-col justify-center shadow-sm';
  const mmtLabelClass =
    'text-[11px] sm:text-[12px] font-bold text-gray-500 tracking-wider mb-1 uppercase flex items-center gap-1';

  /** "19 Aug '26" — the OTA card's date format. */
  const formatCardDate = (d?: string) => {
    const dt = new Date(d ?? '');
    if (isNaN(dt.getTime())) return 'Select';
    return dt.getDate() + ' ' + dt.toLocaleString('en-US', { month: 'short' }) + " '" + dt.getFullYear().toString().slice(-2);
  };
  const weekdayOf = (d?: string) => {
    const dt = new Date(d ?? '');
    return isNaN(dt.getTime()) ? '\u00A0' : dt.toLocaleString('en-US', { weekday: 'long' });
  };

  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* MOBILE VIEW */}
      <div className="flex flex-col gap-2 relative lg:hidden mt-2 bg-white rounded-2xl shadow-lg p-5 mb-6 border border-gray-100">
        <div className="space-y-3">
          {/* Location */}
          <div className="relative">
            <div className="bg-white rounded-xl shadow-sm h-[52px] flex items-center relative w-full border border-gray-200 hover:border-blue-400 transition-colors duration-200">
              <HotelAutocomplete
                value={hotelLocation}
                onChange={handleAutocompleteChange}
                placeholder="City, Property or Location"
                className="w-full bg-transparent text-sm font-medium text-gray-700 focus:outline-none border-0 h-full !px-4 !pl-11 rounded-xl"
              />
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
            </div>
            <div className="text-xs text-gray-400 mt-1">e.g. Goa, Taj Palace</div>
          </div>

          {/* Dates */}
          <HotelDateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onSelect={handleDateSelect}
            isMobile={true}
            renderTrigger={(openCheckIn, openCheckOut) => (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div
                    className="bg-white rounded-xl shadow-sm h-[52px] flex items-center px-4 relative w-full border border-gray-200 hover:border-blue-400 transition-colors duration-200 cursor-pointer"
                    onClick={openCheckIn}
                  >
                    <Calendar className="w-5 h-5 text-gray-600 shrink-0 mr-3" />
                    <div className="w-full text-sm font-medium text-gray-700 bg-transparent flex items-center h-full">
                      {new Date(checkIn).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Check-In</div>
                </div>
                <div>
                  <div
                    className="bg-white rounded-xl shadow-sm h-[52px] flex items-center px-4 relative w-full border border-gray-200 hover:border-blue-400 transition-colors duration-200 cursor-pointer"
                    onClick={openCheckOut}
                  >
                    <Calendar className="w-5 h-5 text-gray-600 shrink-0 mr-3" />
                    <div className="w-full text-sm font-medium text-gray-700 bg-transparent flex items-center h-full">
                      {new Date(checkOut).toLocaleDateString('en-GB')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Check-Out</div>
                </div>
              </div>
            )}
          />

          {/* Rooms */}
          <div className="relative">
            <div
              className="bg-white rounded-xl shadow-sm h-[52px] flex items-center px-4 relative w-full border border-gray-200 hover:border-blue-400 transition-colors duration-200 cursor-pointer"
              onClick={(e) => {
                const btn = e.currentTarget.querySelector('button');
                if (btn && e.target !== btn && !btn.contains(e.target as Node)) {
                  btn.click();
                }
              }}
            >
              <Users className="w-5 h-5 text-gray-600 shrink-0 mr-3 pointer-events-none" />
              <div className="pointer-events-auto w-full">
                <RoomGuestSelector
                  rooms={rooms}
                  onChange={setRooms}
                  className="w-full text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer p-0 border-0 flex items-center"
                />
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1">Rooms & Guests</div>
          </div>
        </div>

        <div className="flex items-end justify-between mt-4">
          <div className="flex items-center gap-2 text-gray-500 text-[12px] font-medium tracking-wide">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Best deals guaranteed
          </div>
          <button
            onClick={handleHotelSearch}
            disabled={searching}
            className="bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white font-bold flex items-center gap-2 px-8 py-3.5 rounded-xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] whitespace-nowrap"
          >
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* DESKTOP VIEW — the OTA search card: icon badges, dotted
          underlines, dividers, maroon search button. */}
      <div className="hidden lg:flex flex-col w-full h-full justify-center mt-2">
        {/* Fields sit directly on the white search card, spanning its full
            width — no inner panel of their own. */}
        <div className="flex w-full items-center gap-5 py-3">
          {/* Location */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F6EBDC]">
              <MapPin className="h-5 w-5 text-[#8A5A16]" />
            </span>
            <div className="min-w-0 flex-1 border-b border-dotted border-gray-300 pb-1.5">
              <div className="whitespace-nowrap text-[11px] leading-tight text-gray-500">
                Select City, Location or Hotel Name
              </div>
              <HotelAutocomplete
                value={hotelLocation}
                onChange={handleAutocompleteChange}
                placeholder="City, Property or Location"
                className="h-auto w-full border-0 bg-transparent p-0 text-[17px] font-bold text-primary focus:outline-none"
              />
              <div className="truncate text-[11px] leading-tight text-gray-500">
                {hotelSubtitle || '\u00A0'}
              </div>
            </div>
          </div>

          <span className="h-14 w-px flex-shrink-0 bg-[#E9DFCF]" />

          {/* Check-in (anchors the range picker; the hidden button lets
              check-out open the same picker on its second step) */}
          <HotelDateRangePicker
            checkIn={checkIn}
            checkOut={checkOut}
            onSelect={handleDateSelect}
            isMobile={false}
            wrapperClassName="!w-auto flex-shrink-0"
            renderTrigger={(openCheckIn, openCheckOut) => (
              <>
                <button
                  className="hidden hotel-date-picker-trigger-checkout"
                  onClick={openCheckOut}
                />
                <div
                  className="flex flex-shrink-0 cursor-pointer items-center gap-3"
                  onClick={openCheckIn}
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F6EBDC]">
                    <Calendar className="h-5 w-5 text-[#8A5A16]" />
                  </span>
                  <div className="border-b border-dotted border-gray-300 pb-1.5">
                    <div className="text-[11px] leading-tight text-gray-500">Check-in Date</div>
                    <div className="whitespace-nowrap text-[17px] font-bold text-primary">
                      {formatCardDate(checkIn)}
                    </div>
                    <div className="text-[11px] leading-tight text-gray-500">
                      {weekdayOf(checkIn)}
                    </div>
                  </div>
                </div>
              </>
            )}
          />

          <span className="h-14 w-px flex-shrink-0 bg-[#E9DFCF]" />

          {/* Check-out */}
          <div
            className="flex flex-shrink-0 cursor-pointer items-center gap-3"
            onClick={() => {
              const picker = document.querySelector(
                '.hotel-date-picker-trigger-checkout',
              ) as HTMLElement;
              if (picker) picker.click();
            }}
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F6EBDC]">
              <Calendar className="h-5 w-5 text-[#8A5A16]" />
            </span>
            <div className="border-b border-dotted border-gray-300 pb-1.5">
              <div className="text-[11px] leading-tight text-gray-500">Check-out Date</div>
              <div className="whitespace-nowrap text-[17px] font-bold text-primary">
                {formatCardDate(checkOut)}
              </div>
              <div className="text-[11px] leading-tight text-gray-500">{weekdayOf(checkOut)}</div>
            </div>
          </div>

          <span className="h-14 w-px flex-shrink-0 bg-[#E9DFCF]" />

          {/* Rooms & Guests */}
          <div className="flex flex-shrink-0 items-center gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#F6EBDC]">
              <Users className="h-5 w-5 text-[#8A5A16]" />
            </span>
            <div
              className="cursor-pointer border-b border-dotted border-gray-300 pb-1.5"
              onClick={(e) => {
                const btn = e.currentTarget.querySelector('button');
                if (btn && e.target !== btn && !btn.contains(e.target as Node)) {
                  btn.click();
                }
              }}
            >
              <div className="text-[11px] leading-tight text-gray-500">Rooms &amp; Guests</div>
              <div className="pointer-events-auto">
                <RoomGuestSelector
                  rooms={rooms}
                  onChange={setRooms}
                  className="flex w-full cursor-pointer items-center border-0 bg-transparent p-0 text-[17px] font-bold text-primary focus:outline-none"
                />
              </div>
              <div className="text-[11px] leading-tight text-gray-500">
                {rooms.reduce((acc, room) => acc + room.Adults, 0)} Adults
              </div>
            </div>
          </div>

          {/* Search */}
          <button
            onClick={handleHotelSearch}
            disabled={searching}
            className="flex h-[52px] flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-red)] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-all duration-200 hover:bg-[var(--color-brand-red)]/90 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
}
