import React, { useRef, useState, useEffect } from 'react';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useUserLocation } from '../../hooks/useUserLocation';
import { getStaticHotels } from '@/features/hotels/services/hotelSearchService';
import { useNavigate } from 'react-router-dom';
import { encodeRoomsToUrl, formatHotelImageUrl } from '@/utils/hotelUtils';

/**
 * The landing-page carousel.
 *
 * It used to run a *live* supplier search (`searchHotels`) behind the browser's
 * geolocation prompt, so the section stayed a grey skeleton until a permission
 * dialog was answered (up to 10s) and a supplier round-trip came back (10-14s on
 * RateGain). It reads from the locally synced catalogue instead: no dates, no
 * supplier, one indexed Mongo read. Prices are not part of static inventory, so
 * a card offers "Check Availability" and the detail page prices it for the dates
 * the traveller actually picks — which is what MakeMyTrip's browse rows do too.
 */

/** Shown instantly while (and whether or not) geolocation ever resolves. */
const DEFAULT_CITY = 'Goa';
/** Some synced properties carry no imagery; a grey card beats a broken one. */
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CARDS = 8;

const getDates = () => {
  const checkin = new Date();
  checkin.setDate(checkin.getDate() + 1);
  const checkout = new Date(checkin);
  checkout.setDate(checkout.getDate() + 1);
  return {
    ci: checkin.toISOString().split('T')[0],
    co: checkout.toISOString().split('T')[0],
  };
};

/** The synced catalogue stores cityName lowercased ("delhi"). */
const titleCase = (value: string) => value.replace(/\b[a-z]/g, (c) => c.toUpperCase());

const cacheKeyFor = (city: string) => `recommended_hotels_v2_${city.toLowerCase()}`;

const readCache = (city: string): any[] | null => {
  try {
    const raw = sessionStorage.getItem(cacheKeyFor(city));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.hotels?.length) return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed.hotels;
  } catch {
    return null;
  }
};

const RecommendedHotels: React.FC = () => {
  // Location is an *upgrade*, never a gate: the carousel renders the default
  // city immediately and swaps once (if) the browser hands us something better.
  const { city: locatedCity } = useUserLocation();
  const [city, setCity] = useState<string>(DEFAULT_CITY);
  const [hotels, setHotels] = useState<any[]>(() => readCache(DEFAULT_CITY) ?? []);
  const [loading, setLoading] = useState<boolean>(() => !readCache(DEFAULT_CITY));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (locatedCity && locatedCity.toLowerCase() !== city.toLowerCase()) {
      setCity(locatedCity);
    }
  }, [locatedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;

    const cached = readCache(city);
    if (cached) {
      setHotels(cached);
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const response = await getStaticHotels(city);
        if (cancelled) return;

        const mapped = (response.hotels || []).slice(0, MAX_CARDS).map((h: any) => ({
          ...h,
          id: h.id,
          name: h.name,
          location: titleCase(h.city || city),
          image: formatHotelImageUrl(h.images?.[0]) || FALLBACK_IMAGE,
          rating: h.starRating || 0,
        }));

        // An empty city (a typo from reverse-geocoding, or somewhere we hold no
        // inventory) must not blank a section that was already showing hotels.
        if (mapped.length) {
          setHotels(mapped);
          sessionStorage.setItem(
            cacheKeyFor(city),
            JSON.stringify({ at: Date.now(), hotels: mapped }),
          );
        }
      } catch (err) {
        console.error('Failed to fetch recommended hotels', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [city]);

  const handleCardClick = (hotel: any) => {
    const { ci, co } = getDates();
    const rooms = [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
    const roomsStr = encodeRoomsToUrl(rooms);
    const queryStr = `?city=${encodeURIComponent(hotel.location)}&checkin=${ci}&checkout=${co}&rooms=${roomsStr}`;

    navigate(`/hotels/${hotel.id}${queryStr}`, {
      state: {
        hotel,
        searchParams: {
          location: hotel.location,
          checkIn: ci,
          checkOut: co,
          rooms,
        },
      },
    });
  };

  const scrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  if (loading && !hotels.length) {
    return (
      <section className="mb-16 mt-8 max-w-7xl mx-auto px-4 md:px-0">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recommended Hotels</h2>
        </div>
        <div className="flex gap-5 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-none w-[300px] h-72 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (!hotels.length) return null;

  return (
    <section className="mb-16 mt-8">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900">
          Recommended Hotels{city ? ` in ${city}` : ''}
        </h2>
        <div className="hidden md:flex gap-2">
          <button
            onClick={scrollLeft}
            className="p-1.5 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors bg-white"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={scrollRight}
            className="p-1.5 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors bg-white"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-5 snap-x snap-mandatory scrollbar-hide pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              onClick={() => handleCardClick(hotel)}
              className="flex-none w-[300px] bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200 snap-start hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="relative h-48 md:h-52 bg-gray-100">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  Featured
                </div>
              </div>

              <div className="p-4 flex flex-col gap-2">
                <h3 className="font-bold text-gray-900 text-[15px] leading-snug line-clamp-2 min-h-[44px]">
                  {hotel.name}
                </h3>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < hotel.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'fill-gray-200 text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <MapPin className="w-3 h-3" />
                      {hotel.location}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-semibold text-[#F22329E5]">
                      Check Availability
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      Prices for your dates
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendedHotels;
