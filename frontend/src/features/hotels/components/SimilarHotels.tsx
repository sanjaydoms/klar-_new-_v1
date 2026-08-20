import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { searchHotels } from '../services/hotelSearchService';
import {
  formatHotelImageUrl,
  encodeRoomsToUrl,
  calculateNights,
  formatHotelAddress,
  NO_HOTEL_IMAGE,
} from '@/utils/hotelUtils';
import type { Hotel, RoomOccupancy } from '../types/hotelTypes';

interface SimilarHotelsProps {
  destinationCode?: string;
  city: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: RoomOccupancy[];
  currentHotelId: string;
  currentStarRating: number;
  currentPrice: number;
}

const getDfltDates = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return {
    checkIn: formatDate(tomorrow),
    checkOut: formatDate(dayAfter),
  };
};

export const SimilarHotels: React.FC<SimilarHotelsProps> = ({
  destinationCode,
  city,
  checkIn,
  checkOut,
  rooms,
  currentHotelId,
  currentStarRating,
  currentPrice,
}) => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Fetch immediately on mount to speed up visual rendering
  useEffect(() => {
    fetchSimilarHotels();
  }, [destinationCode, city, checkIn, checkOut, rooms]);

  const fetchSimilarHotels = async () => {
    setIsLoading(true);
    try {
      const dates = !checkIn || !checkOut ? getDfltDates() : { checkIn, checkOut };
      const searchRooms =
        rooms && rooms.length > 0 ? rooms : [{ Adults: 2, Children: 0, childrenAges: [] }];

      // Clean city string to search by city name and return both RG and TJ properties
      const cleanCity = city?.split(',')[0]?.trim() || city;

      const apiParams = {
        destination: cleanCity,
        checkin: dates.checkIn,
        checkout: dates.checkOut,
        rooms: searchRooms,
        countryCode: 'IN',
        currency: 'INR',
        pageNo: 1,
      };

      const response = await searchHotels(apiParams);

      if (response && response.hotels && response.hotels.length > 0) {
        // Filter out current hotel
        let filtered = response.hotels.filter((h) => h.id !== currentHotelId);

        // Score by similarity (rating & price)
        const scored = filtered.map((hotel) => {
          let score = 0;

          // Star rating similarity (max +100)
          const starDiff = Math.abs((hotel.starRating || 0) - currentStarRating);
          score += Math.max(0, 100 - starDiff * 30);

          // Price similarity (max +100)
          const hotelPrice = hotel.price || hotel.minPrice || 0;
          if (currentPrice > 0 && hotelPrice > 0) {
            const priceRatio =
              Math.min(hotelPrice, currentPrice) / Math.max(hotelPrice, currentPrice);
            score += priceRatio * 100;
          }

          return { ...hotel, similarityScore: score };
        });

        // Sort descending by score
        scored.sort((a, b) => b.similarityScore - a.similarityScore);

        // Limit to 4 hotels (as requested: "4 hotels is enuf")
        const top4 = scored.slice(0, 4);
        setHotels(top4);
      } else {
        setHotels([]);
      }
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching similar hotels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll visibility checks for navigation chevrons
  const checkScrollArrows = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    if (hotels.length > 0) {
      checkScrollArrows();
      // Add window resize handler to update arrow visibility
      window.addEventListener('resize', checkScrollArrows);
    }
    return () => window.removeEventListener('resize', checkScrollArrows);
  }, [hotels]);

  const handleScroll = () => {
    checkScrollArrows();
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      const target = direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: target, behavior: 'smooth' });
    }
  };

  const handleCardClick = (hotel: Hotel) => {
    const dates = !checkIn || !checkOut ? getDfltDates() : { checkIn, checkOut };
    const searchRooms =
      rooms && rooms.length > 0 ? rooms : [{ Adults: 2, Children: 0, childrenAges: [] }];
    const roomsStr = encodeRoomsToUrl(searchRooms);

    const targetSearchParams = {
      location: city,
      destinationCode: destinationCode || '',
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      rooms: searchRooms,
      bookForGroup: false,
    };

    navigate(
      `/hotels/${hotel.id}?city=${encodeURIComponent(city)}&checkin=${dates.checkIn}&checkout=${dates.checkOut}&rooms=${roomsStr}${destinationCode ? `&destCode=${destinationCode}` : ''}`,
      {
        state: {
          hotel: hotel,
          searchParams: targetSearchParams,
        },
      },
    );
    // Scroll page back to top when details change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (hasLoaded && hotels.length === 0) {
    return null; // Don't show the section if no similar hotels are available
  }

  return (
    <div className="mb-20 SimilarPropertiesSection w-full">
      <div className="mb-4">
        <h2
          className="font-bold text-[#3771D4]"
          style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', lineHeight: '100%' }}
        >
          Similar Properties
        </h2>
      </div>

      <div className="relative group/carousel w-full">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-gray-100 transition-all hover:scale-105 md:hidden"
            aria-label="Scroll left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 hover:bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-gray-100 transition-all hover:scale-105 md:hidden"
            aria-label="Scroll right"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Scrolling Track */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="w-full flex md:grid md:grid-cols-2 lg:grid-cols-4 overflow-x-auto md:overflow-x-visible gap-6 pb-4 scroll-smooth no-scrollbar snap-x snap-mandatory"
        >
          {isLoading
            ? // Skeleton Placeholders (4 cards)
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="shrink-0 md:shrink w-[292px] md:w-full overflow-hidden flex flex-col bg-white"
                  style={{
                    height: '371px',
                    borderRadius: '9.61px',
                    borderWidth: '0.46px',
                    borderTop: '0.46px solid #F3F4F6',
                    boxShadow: '0px 0.69px 1.37px -0.69px #0000001A, 0px 0.69px 2.06px 0px #0000001A'
                  }}
                >
                  <div className="h-[170px] bg-gray-100 animate-pulse w-full"></div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
                    </div>
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="space-y-1.5 w-1/2">
                        <div className="h-2 bg-gray-100 rounded animate-pulse"></div>
                        <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                      </div>
                      <div className="h-8 bg-gray-100 rounded-lg animate-pulse w-20"></div>
                    </div>
                  </div>
                </div>
              ))
            : // Real Hotel Cards
              (() => {
                const dates = !checkIn || !checkOut ? getDfltDates() : { checkIn, checkOut };
                const nights = calculateNights(dates.checkIn, dates.checkOut) || 1;
                return hotels.map((hotel) => {
                  // formatHotelImageUrl returns '' for anything unresolvable, so
                  // fall through to the neutral placeholder rather than a stock
                  // photo of an unrelated property.
                  const primaryImg =
                    (hotel.images && hotel.images.length > 0
                      ? formatHotelImageUrl(hotel.images[0])
                      : '') || NO_HOTEL_IMAGE;

                  const locationText = formatHotelAddress(hotel.address) || hotel.city || city;
                  const rating = hotel.starRating || 0;
                  const totalPrice = hotel.price || hotel.minPrice || 0;
                  const perNightPrice = Math.round(totalPrice / nights);

                  return (
                    <div
                      key={hotel.id}
                      onClick={() => handleCardClick(hotel)}
                      className="snap-start shrink-0 md:shrink w-[292px] md:w-full overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col group bg-white"
                      style={{
                        height: '371px',
                        borderRadius: '9.61px',
                        borderWidth: '0.46px',
                        borderTop: '0.46px solid #F3F4F6',
                        boxShadow: '0px 0.69px 1.37px -0.69px #0000001A, 0px 0.69px 2.06px 0px #0000001A'
                      }}
                    >
                      {/* Card Image */}
                      <div className="relative h-[160px] w-full overflow-hidden bg-gray-100">
                        <img
                          src={primaryImg}
                          alt={hotel.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Star Rating Badge on Card */}
                        {rating > 0 && (
                          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-bold text-gray-900 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm z-10">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            <span>{rating} Star</span>
                          </div>
                        )}

                      </div>

                      {/* Card Info Content */}
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-blue-900 transition-colors leading-snug">
                            {hotel.name}
                          </h3>

                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-2">
                            <MapPin size={11} className="shrink-0 text-gray-400" />
                            <span className="line-clamp-1">{locationText}</span>
                          </p>
                        </div>

                        {/* Pricing & CTA */}
                        <div className="pt-3 border-t border-gray-100 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] text-gray-400 font-medium leading-none mb-1">
                              {perNightPrice > 0 ? 'Starting from' : 'Price'}
                            </p>
                            {perNightPrice > 0 ? (
                              <>
                                <p className="text-base font-extrabold text-gray-900 leading-none">
                                  ₹{perNightPrice.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[9px] text-gray-400 font-medium mt-1">/ per night</p>
                              </>
                            ) : (
                              <p className="text-xs font-bold text-[#F22329E5] leading-none my-1">
                                Check Availability
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                            View Deal
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
        </div>
      </div>
    </div>
  );
};
