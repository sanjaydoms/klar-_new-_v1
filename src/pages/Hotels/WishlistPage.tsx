import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ChevronRight, ArrowLeft } from 'lucide-react';
import { getWishlistHotels } from '@/utils/hotelUtils';
import HotelCard from '@/features/hotels/components/HotelCard';
import { ROUTES } from '@/routes/routes.config';

const mapWishlistToCardProps = (hotel: any) => {
  return {
    id: hotel.id,
    name: hotel.name,
    location: hotel.location || 'Location details unavailable',
    city: hotel.city || null,
    address: hotel.address || null,
    rating: hotel.rating || 0,
    price: hotel.price || 0,
    basePrice: hotel.basePrice || hotel.price || 0,
    image: hotel.image || '',
    images: hotel.images || [],
    source: hotel.source,
    distance: '',
    reviews: 0,
    reviewScore: '0.0',
    reviewLabel: '',
  };
};

export default function WishlistPage() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState<any[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setWishlist(getWishlistHotels());
  }, []);

  const handleWishlistToggle = (id: string, wishlisted: boolean) => {
    if (!wishlisted) {
      setWishlist((prev) => prev.filter((h) => h.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16">
      {/* Breadcrumb / Navigation */}
      <div className="bg-white border-b border-gray-100 py-4 shadow-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-medium">
            <button
              onClick={() => navigate('/')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              Home
            </button>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-gray-900 font-semibold">Hotels Wishlist</span>
          </div>
          
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 mt-8">
        <div className="flex flex-col gap-1 mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-2">
            My Hotel Wishlist
            <span className="text-lg font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {wishlist.length}
            </span>
          </h1>
          <p className="text-sm text-gray-500">
            Compare and manage your saved hotels for future bookings.
          </p>
        </div>

        {wishlist.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 max-w-4xl">
            {wishlist.map((hotel) => (
              <HotelCard
                key={hotel.id}
                {...mapWishlistToCardProps(hotel)}
                isExploreMode={true} // Wishlist holds static hotels, explore mode (Check Availability) is ideal
                onWishlistToggle={handleWishlistToggle}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-sm max-w-2xl mx-auto mt-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6 text-red-500 animate-pulse">
              <Heart className="w-8 h-8 fill-red-100" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mb-8">
              Explore your favorite destinations and click the heart icon on any hotel card to save it here for later.
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all text-sm"
            >
              Explore Hotels
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
