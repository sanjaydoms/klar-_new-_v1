import { useEffect, useState, useRef } from 'react';
import { Star, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatHotelImageUrl, encodeRoomsToUrl } from '@/utils/hotelUtils';
import { getCountryCities } from '@/features/hotels/services/hotelSearchService';
import Footer from '@/components/layout/Footer';
import RecommendedHotels from '@/components/RecommendedHotels/RecommendedHotels';
import { HotelFooter } from './HotelFooter';
import WhyTravelWithKlar from '../../flights/components/WhyTravelWithKlar';

/**
 * Imagery for the "Trending in India" row, plus the row we fall back to before
 * the live list lands (or if the catalogue is cold). Which cities actually
 * render, and in what order, comes from our inventory — so every tile leads to
 * a results page with hotels on it.
 */
const TRENDING_FALLBACK = [
  {
    name: 'Goa',
    label: 'Top beach destination',
    image: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Lonavala',
    label: 'Trending this weekend',
    image: 'https://images.pexels.com/photos/733100/pexels-photo-733100.jpeg?auto=compress&cs=tinysrgb&w=800',
  },
  { name: 'Ooty', label: 'Popular for couples', image: '/ooaty.avif' },
  { name: 'Darjeeling', label: 'Top mountain escape', image: '/darjleeing.avif' },
  {
    name: 'Jaipur',
    label: 'Heritage & Culture',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
  },
  { name: 'Manali', label: 'Adventure getaway', image: '/manali.avif' },
];

const TRENDING_GENERIC_IMAGE =
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80';

interface TrendingTile {
  name: string;
  label: string;
  image: string;
  hotelCount?: number;
}

export default function HotelsContent() {
  const navigate = useNavigate();
  const [recentHotels, setRecentHotels] = useState<any[]>([]);
  const [trending, setTrending] = useState<TrendingTile[]>(TRENDING_FALLBACK);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    getCountryCities('India', 6).then((cities) => {
      if (cancelled || !cities.length) return;
      setTrending(
        cities.map((c) => {
          const curated = TRENDING_FALLBACK.find(
            (t) => t.name.toLowerCase() === c.name.toLowerCase(),
          );
          return {
            name: c.name,
            label: curated?.label ?? 'Popular right now',
            image: curated?.image ?? TRENDING_GENERIC_IMAGE,
            hotelCount: c.hotelCount,
          };
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('recentHotels');
    if (stored) {
      try {
        setRecentHotels(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent hotels', e);
      }
    }
  }, []);

  const handleClearAll = () => {
    localStorage.removeItem('recentHotels');
    setRecentHotels([]);
  };

  const handleHotelClick = (hotelEntry: any) => {
    let queryStr = '';
    const params = hotelEntry.searchParams;
    if (params) {
      const roomsStr = encodeRoomsToUrl(params.rooms || []);
      queryStr = `?city=${encodeURIComponent(params.location || '')}&destCode=${encodeURIComponent(params.destinationCode || '')}&checkin=${params.checkIn || ''}&checkout=${params.checkOut || ''}&rooms=${roomsStr}`;
    }
    navigate(`/hotels/${hotelEntry.id}${queryStr}`, {
      state: {
        hotel: hotelEntry.hotel,
        searchParams: hotelEntry.searchParams,
      },
    });
  };

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300; // width of card + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

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

  const handlePopularDestinationClick = (destName: string) => {
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

    const searchUrl = `/hotels/search?city=${encodeURIComponent(destName)}&destCode=&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`;
    navigate(searchUrl, { state: { triggerSearch: true } });
  };

  return (
    <div className="bg-white">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 py-16">
        <WhyTravelWithKlar />

        {recentHotels.length > 0 ? (
          <section
            className="mb-16 -mx-4 sm:-mx-6 lg:-mx-12 flex flex-col"
            style={{
              width: 'auto',
              padding: '32px 16px',
              gap: '24px',
              background:
                'radial-gradient(96.6% 598.45% at 94.87% 19.11%, #7182FF 6.38%, #8694FF 37.13%, #94A0FF 58.95%, #919DFF 73.66%, #9BA7FF 100%), linear-gradient(0deg, rgba(98, 98, 98, 0.2), rgba(98, 98, 98, 0.2))',
            }}
          >
            <div
              className="flex flex-col mx-auto w-full px-4 sm:px-6 lg:px-12"
              style={{ gap: '44px' }}
            >
              <div className="flex items-center justify-between" style={{ height: '36px' }}>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 600,
                    fontSize: '28px',
                    lineHeight: '31.5px',
                    color: '#FFFFFF',
                    margin: 0,
                  }}
                >
                  Recent searches
                </h2>
                <div className="flex items-center" style={{ gap: '24px', height: '40px' }}>
                  <button
                    onClick={handleClearAll}
                    className="font-medium hover:opacity-80"
                    style={{
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 600,
                      textDecoration: 'underline',
                    }}
                  >
                    Clear all
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={() => scrollCarousel('left')}
                      className="w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    >
                      <span className="text-[#7182FF] text-lg font-bold">&lt;</span>
                    </button>
                    <button
                      onClick={() => scrollCarousel('right')}
                      className="w-10 h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center transition-colors shadow-sm"
                    >
                      <span className="text-[#7182FF] text-lg font-bold">&gt;</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex overflow-x-auto snap-x scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                style={{ gap: '24px' }}
              >
                {recentHotels.slice(0, 7).map((hotel, index) => (
                  <div
                    key={index}
                    onClick={() => handleHotelClick(hotel)}
                    className="cursor-pointer shrink-0 snap-start flex flex-col group relative"
                    style={{ width: '275px', height: '341px', borderRadius: '16px' }}
                  >
                    <img
                      src={formatHotelImageUrl(hotel.image)}
                      alt={hotel.name}
                      className="w-full object-cover group-hover:opacity-90 transition-opacity"
                      style={{
                        height: '210px',
                        borderTopLeftRadius: '16px',
                        borderTopRightRadius: '16px',
                      }}
                    />

                    <div
                      className="flex flex-col bg-white w-full"
                      style={{
                        height: '131px' /* 341 - 210 = 131 */,
                        padding: '12px 15px',
                        borderBottomRightRadius: '16px',
                        borderBottomLeftRadius: '16px',
                        borderWidth: '0px 0px 1px 0px',
                        borderStyle: 'solid',
                        borderColor: '#E5E7EB',
                      }}
                    >
                      <h3 className="font-semibold text-gray-900 text-sm truncate mb-0.5">
                        {hotel.name}
                      </h3>
                      <div className="flex items-center text-yellow-400 text-[10px] mb-0.5">
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                        <Star className="w-3 h-3 fill-current" />
                      </div>
                      <p className="text-xs text-gray-500 mb-2 truncate">{hotel.location}</p>

                      <div className="mt-auto">
                        {hotel.price && hotel.price > 0 ? (
                          <>
                            <span className="text-[11px] text-gray-500">From </span>
                            <span className="text-sm font-bold text-gray-900">
                              ₹{hotel.price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-gray-500"> per night</span>
                          </>
                        ) : (
                          <span className="text-xs font-semibold text-[#F22329E5]">
                            Check Availability
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}
        {/* 
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular Destinations</h2>
          {isDestinationsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-gray-500 italic">Discovering amazing places for you...</p>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {popularDestinations.map((destination, index) => (
                <div
                  key={index}
                  onClick={() => handleDestinationClick(destination)}
                  className="relative rounded-2xl overflow-hidden h-64 group cursor-pointer"
                >
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{destination.name}</h3>
                    <div className="flex items-center gap-1 text-sm">
                      <span>{destination.properties} Properties</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                  <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section> */}

        <section className="mb-16 -mx-4 sm:-mx-6 lg:-mx-12">
          <div className="relative overflow-hidden h-80 w-full">
            <img
              src="/images/grand-beaufort.jpg"
              alt="Luxury Hotel Lobby"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-center px-16">
              <span className="inline-block bg-white/10 backdrop-blur-md border border-white/30 text-white text-sm font-semibold px-4 py-1.5 rounded-full w-fit mb-4">
                Get 15% OFF
              </span>
              <h2 className="text-5xl font-bold text-white mb-4">Book your stay with us</h2>
              <p className="text-lg text-white/90 mb-8 max-w-2xl font-light">
                Reserve your stay with us and take advantage of special hotel
                <br />
                discounts. This limited-time offer applies to select accommodations.
              </p>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="bg-white hover:bg-gray-100 text-gray-900 px-8 py-3 rounded-lg font-semibold w-fit transition-colors"
              >
                Book Now
              </button>
            </div>
          </div>
        </section>

        <RecommendedHotels />

        <section className="mb-16">
          <div className="mb-8">
            <h2
              className="text-3xl font-bold text-gray-900 mb-4 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Popular Destinations
            </h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
              <Star size={20} className="text-[#D4AF37] fill-[#D4AF37]" />
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
            {[
              {
                name: 'Italy',
                image: 'https://images.unsplash.com/photo-1542820229-081e0c12af0b?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'Greece',
                image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'South Korea',
                image: 'https://images.unsplash.com/photo-1570191913384-7b4ff11716e7?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'Japan',
                image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'United Arab Emirates',
                image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'China',
                image: 'https://images.unsplash.com/photo-1584872589930-e99fe5bf4408?auto=format&fit=crop&w=800&q=80',
              },
            ].map((destination, index) => (
              <div
                key={index}
                onClick={() => navigate(`/destinations/${destination.name}`)}
                className="cursor-pointer group flex flex-col w-full"
              >
                <div className="w-full h-[386px] rounded-[16px] overflow-hidden mb-3">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="w-full">
                  <h3
                    className="font-bold text-[#101828]"
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '18px',
                      lineHeight: '28px',
                    }}
                  >
                    {destination.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="mb-16">
          <div className="mb-8">
            <h2
              className="text-3xl font-bold text-gray-900 mb-4 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Trending in India
            </h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
              <Star size={20} className="text-[#D4AF37] fill-[#D4AF37]" />
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
            </div>
            <p className="text-center text-gray-500 mt-2">
              See what other travelers are booking right now.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trending.map((destination, index) => (
              <div
                key={index}
                onClick={() => handlePopularDestinationClick(destination.name)}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer relative group h-72"
              >
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 z-10">
                  <span className="bg-[#008cff] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md uppercase tracking-wider">
                    {destination.label}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="font-bold text-white text-3xl mb-1">{destination.name}</h3>
                  <p className="text-white/80 text-sm flex items-center gap-1">
                    <Heart size={14} className="fill-current" />
                    {destination.hotelCount
                      ? `${destination.hotelCount.toLocaleString('en-IN')} properties`
                      : 'Highly loved destination'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <HotelFooter />
    </div>
  );
}
