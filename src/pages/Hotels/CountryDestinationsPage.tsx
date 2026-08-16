import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { encodeRoomsToUrl } from '@/utils/hotelUtils';
import { getCountryCities } from '@/features/hotels/services/hotelSearchService';

/**
 * Curated imagery, keyed by country then city. It is *only* a picture library:
 * which cities appear comes from our inventory, so a country we never curated
 * still renders a working grid, and a curated city we hold no hotels in no
 * longer sends the traveller to an empty results page.
 */
const destinationData: Record<string, { name: string; image: string }[]> = {
  'Italy': [
    { name: 'Rome', image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80' },
    { name: 'Venice', image: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=800&q=80' },
    { name: 'Florence', image: 'https://images.unsplash.com/photo-1542820229-081e0c12af0b?auto=format&fit=crop&w=800&q=80' },
    { name: 'Milan', image: '/PopularDestinations/Italy/milan.avif' },
    { name: 'Amalfi Coast', image: '/PopularDestinations/Italy/amalfi%20coast.avif' },
    { name: 'Lake Como', image: '/PopularDestinations/Italy/lake%20como.avif' },
    { name: 'Cinque Terre', image: 'https://images.unsplash.com/photo-1498307833015-e7b400441eb8?auto=format&fit=crop&w=800&q=80' },
    { name: 'Pisa', image: '/PopularDestinations/Italy/pisa.avif' },
  ],
  'Greece': [
    { name: 'Santorini', image: '/PopularDestinations/Greece/Santorini.avif' },
    { name: 'Athens', image: 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=800&q=80' },
    { name: 'Mykonos', image: '/PopularDestinations/Greece/Mykonos.avif' },
    { name: 'Crete', image: '/PopularDestinations/Greece/Crete.avif' },
    { name: 'Rhodes', image: '/PopularDestinations/Greece/Rhodes.avif' },
    { name: 'Zakynthos', image: '/PopularDestinations/Greece/Zakynthos.avif' },
    { name: 'Meteora', image: '/PopularDestinations/Greece/Meteora.avif' },
  ],
  'South Korea': [
    { name: 'Seoul', image: 'https://images.unsplash.com/photo-1570191913384-7b4ff11716e7?auto=format&fit=crop&w=800&q=80' },
    { name: 'Busan', image: 'https://images.unsplash.com/photo-1638591751482-1a7d27fcea15?auto=format&fit=crop&w=800&q=80' },
    { name: 'Jeju Island', image: 'https://images.unsplash.com/photo-1612977512598-3b8d6a498bbb?auto=format&fit=crop&w=800&q=80' },
    { name: 'Gyeongju', image: '/PopularDestinations/Korea/Gyeongju.avif' },
    { name: 'Incheon', image: '/PopularDestinations/Korea/Incheon.avif' },
  ],
  'Japan': [
    { name: 'Tokyo', image: '/PopularDestinations/japan/Tokyo.avif' },
    { name: 'Kyoto', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80' },
    { name: 'Osaka', image: '/PopularDestinations/japan/Osaka.avif' },
    { name: 'Mount Fuji', image: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=80' },
    { name: 'Nara', image: '/PopularDestinations/japan/Nara.avif' },
    { name: 'Hiroshima', image: '/PopularDestinations/japan/Hiroshima.avif' },
    { name: 'Hakone', image: '/PopularDestinations/japan/Hakone.avif' },
  ],
  'United Arab Emirates': [
    { name: 'Dubai', image: 'https://images.unsplash.com/photo-1679899608908-2e9536b14617?auto=format&fit=crop&w=800&q=80' },
    { name: 'Abu Dhabi', image: 'https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=800&q=80' },
    { name: 'Sharjah', image: 'https://images.unsplash.com/photo-1683471546843-3dd6eace89b5?auto=format&fit=crop&w=800&q=80' },
    { name: 'Ras Al Khaimah', image: 'https://images.unsplash.com/photo-1542878447-e2b6df2526fa?auto=format&fit=crop&w=800&q=80' },
  ],
  'China': [
    { name: 'Beijing', image: '/PopularDestinations/China/Beijing.avif' },
    { name: 'Shanghai', image: '/PopularDestinations/China/Shanghai.avif' },
    { name: "Xi'an", image: "/PopularDestinations/China/Xi'an.avif" },
    { name: 'Guilin', image: '/PopularDestinations/China/Guilin.avif' },
    { name: 'Zhangjiajie', image: '/PopularDestinations/China/Zhangjiajie.avif' },
    { name: 'Chengdu', image: '/PopularDestinations/China/Chengdu.avif' },
    { name: 'Hangzhou', image: '/PopularDestinations/China/Hangzhou.avif' },
    { name: 'Hong Kong', image: '/PopularDestinations/China/Hong Kong.avif' },
  ],
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

const GENERIC_CITY_IMAGE =
  'https://images.unsplash.com/photo-1496395031280-4201b0e022ca?auto=format&fit=crop&w=800&q=80';

export default function CountryDestinationsPage() {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [cities, setCities] = useState<{ name: string; image: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!country) return;

    let cancelled = false;
    const curated = destinationData[country] ?? [];

    // Curated tiles paint first so the page is never empty, then the live list
    // replaces them. Ordering is by inventory, so the busiest city leads.
    setCities(curated);
    setLoading(!curated.length);

    getCountryCities(country, 12)
      .then((live) => {
        if (cancelled || !live.length) return;
        const imageFor = (name: string) =>
          curated.find((c) => c.name.toLowerCase() === name.toLowerCase())?.image ??
          GENERIC_CITY_IMAGE;
        setCities(live.map((c) => ({ name: c.name, image: imageFor(c.name) })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [country]);

  const handleCityClick = (cityName: string) => {
    const checkIn = getTomorrowStr();
    const checkOut = getDayAfterStr(checkIn);
    const rooms = [{ numberOfRoom: 1, Adults: 2, Children: 0, childrenAges: [], paxes: [] }];
    const roomsStr = encodeRoomsToUrl(rooms);

    const searchParams = {
      location: cityName,
      destinationCode: '',
      checkIn,
      checkOut,
      rooms,
      bookForGroup: false,
    };

    sessionStorage.setItem('hotelSearchParams', JSON.stringify(searchParams));
    sessionStorage.removeItem('hotelSearchResults');

    const searchUrl = `/hotels/search?city=${encodeURIComponent(cityName)}&destCode=&checkin=${checkIn}&checkout=${checkOut}&rooms=${roomsStr}`;
    navigate(searchUrl, { state: { triggerSearch: true } });
  };

  return (
    <div className="bg-white min-h-screen">


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1
          className="text-3xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Where to stay in {country}
        </h1>
        <p className="text-gray-500 mb-8">Pick a city to see available hotels.</p>

        {loading && !cities.length && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 md:h-72 rounded bg-gray-200 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !cities.length && (
          <p className="text-gray-500">
            We don't have hotels in {country} yet. Try another destination.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {cities.map((city, index) => (
            <div
              key={index}
              onClick={() => handleCityClick(city.name)}
              className="group cursor-pointer rounded overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative h-64 md:h-72"
            >
              <img
                src={city.image}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-transparent"></div>

              <div className="absolute top-0 left-0 p-4">
                <h3 className="text-sm font-medium text-white">
                  {city.name}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
