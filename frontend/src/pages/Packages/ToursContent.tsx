import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import ToursAndPackagesFooter from './ToursAndPackagesFooter/ToursAndPackagesFooter';

interface OfferCard {
  id: string;
  tag: 'LIMITED DEAL' | 'EXCLUSIVE' | 'SUPER DEALS';
  rating: string;
  discount: string;
  title: string;
  description: string;
  image: string;
}

interface DestinationCard {
  id: string;
  title: string;
  region: string;
  description: string;
  image: string;
  badge: 'POPULAR' | 'TRENDING' | 'FEATURED';
}

export const ToursContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Sample static data simulating the destinations grid in your image
  const destinations: DestinationCard[] = [
    {
      id: '1',
      title: 'Maldives',
      region: 'Indian Ocean',
      description: 'Overwater villas, turquoise lagoons, and unparalleled serenity.',
      image: '/images/tours_iconic_destinations_1.jpg',
      badge: 'POPULAR',
    },
    {
      id: '2',
      title: 'Santorini, Greece',
      region: 'Europe',
      description: 'Cliffside luxury, wine tastings, and timeless Mediterranean views.',
      image: '/images/tours_iconic_destinations_2.jpg',
      badge: 'TRENDING',
    },
    {
      id: '3',
      title: 'Bali, Indonesia',
      region: 'Asia',
      description: 'Terraced temples, lush landscapes, and rich cultural experiences.',
      image: '/images/tours_iconic_destinations_3.jpg',
      badge: 'FEATURED',
    },
    {
      id: '4',
      title: 'Dubai, UAE',
      region: 'Middle East',
      description: 'Ultra-modern luxury, desert adventures, and world-class amenities.',
      image: '/images/tours_iconic_destinations_4.jpg',
      badge: 'POPULAR',
    },
    {
      id: '5',
      title: 'Swiss Alps, Switzerland',
      region: 'Europe',
      description: 'Majestic mountains, exclusive resorts, and refined mountain experiences.',
      image: '/images/tours_iconic_destinations_5.jpg',
      badge: 'FEATURED',
    },
    {
      id: '6',
      title: 'Amalfi Coast, Italy',
      region: 'Europe',
      description: 'Coastal elegance, scenic drives, and authentic Mediterranean living.',
      image: '/images/tours_iconic_destinations_6.jpg',
      badge: 'TRENDING',
    },
    {
      id: '7',
      title: 'Paris, France',
      region: 'Europe',
      description: 'Iconic architecture, world-class cuisine, and timeless elegance.',
      image: '/images/tours_iconic_destinations_7.jpg',
      badge: 'POPULAR',
    },
    {
      id: '8',
      title: 'Tokyo, Japan',
      region: 'Asia',
      description: 'Ancient traditions meets modern luxury, culinary excellence, and innovation.',
      image: '/images/tours_iconic_destinations_8.png',
      badge: 'FEATURED',
    },
    {
      id: '9',
      title: 'Bora Bora, Polynesia',
      region: 'Oceania',
      description: 'Crystal waters, overwater bungalows, and ultimate island paradise.',
      image: '/images/tours_iconic_destinations_9.jpg',
      badge: 'TRENDING',
    },
  ];

  const offers: OfferCard[] = [
    {
      id: '1',
      tag: 'LIMITED DEAL',
      rating: '4.9',
      discount: '50% OFF',
      title: 'Luxury Escapes',
      description: 'Curated villas and private stays in the world\'s most sought-after destinations.',
      image: '/images/tours_luxury_offers_1.jpg',
    },
    {
      id: '2',
      tag: 'EXCLUSIVE',
      rating: '4.9',
      discount: '35 % OFF',
      title: 'First Class Journeys',
      description: 'Experience premium air travel with exclusive first and business class offers.',
      image: '/images/tours_luxury_offers_2.jpg',
    },
    {
      id: '3',
      tag: 'SUPER DEALS',
      rating: '4.9',
      discount: '65 % OFF',
      title: 'Peak Season Offers',
      description: 'Access iconic destinations at their finest, with carefully curated seasonal offers.',
      image: '/images/tours_luxury_offers_3.jpg',
    },
    {
      id: '4',
      tag: 'EXCLUSIVE',
      rating: '4.9',
      discount: '35 % OFF',
      title: 'Private Island Deals',
      description: 'Secluded luxury stays designed for complete privacy and unparalleled experiences.',
      image: '/images/tours_luxury_offers_4.jpg',
    },
    {
      id: '5',
      tag: 'SUPER DEALS',
      rating: '4.9',
      discount: '35 % OFF',
      title: 'Cultural Immersions',
      description: 'Authentic experiences crafted with local experts, blending culture and luxury.',
      image: '/images/tours_luxury_offers_5.jpg',
    },
    {
      id: '6',
      tag: 'EXCLUSIVE',
      rating: '4.9',
      discount: '35 % OFF',
      title: 'Adventure Escape',
      description: 'Thrilling journeys paired with premium stays in the world\'s most extraordinary landscapes.',
      image: '/images/tours_luxury_offers_6.png',
    },
  ];

  const getTagStyles = (tag: string) => {
    switch (tag) {
      case 'LIMITED DEAL':
        return 'bg-blue-600/80';
      case 'EXCLUSIVE':
        return 'bg-indigo-900/80';
      case 'SUPER DEALS':
        return 'bg-blue-900/80';
      default:
        return 'bg-black/60';
    }
  };

  // Colors mapping for the badge tags
  const getBadgeStyles = (badge: string) => {
    switch (badge) {
      case 'POPULAR':
        return 'bg-[#2B3B66]/80 text-white';
      case 'TRENDING':
        return 'bg-[#E5A93C]/90 text-white';
      case 'FEATURED':
        return 'bg-[#D6A248]/90 text-white';
      default:
        return 'bg-black/60 text-white';
    }
  };

  return (
    <section className="w-full bg-white px-4 py-16 font-sans text-[#111111]">
      <div className="max-w-[1400px] mx-auto">
        
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col items-center text-center mb-12">
          {/* Accent Mini-Badge */}
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-500 px-3 py-1 border border-gray-200 rounded-full bg-gray-50 mb-4">
            🔍 Explore Destinations
          </span>
          
          {/* Main Typography Header */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#1F2B4D] mb-4 tracking-wide">
            Explore Iconic Destinations 
          </h2>
          
          {/* Subtext description */}
          <p className="text-sm md:text-base text-gray-500 max-w-2xl font-light">
            Discover the world's most sought-after locations, handpicked for unforgettable luxury experiences.
          </p>
          
          {/* Subtle Graphic Divider */}
          <div className="mt-6 relative w-48 h-[1px] bg-gray-200">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#D6A248] rotate-45"></div>
          </div>
        </div>

        {/* --- UTILITIES BAR --- */}
        <div className="flex justify-between items-center text-xs text-gray-400 font-medium mb-8 border-b border-gray-100 pb-4 px-1">
          <div>
            Showing <span className="text-gray-700 font-semibold">1-12</span> of <span className="text-gray-700 font-semibold">72 destinations</span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-gray-600 transition-colors">
            <span>Choose option</span>
            <div className="w-7 h-4 bg-gray-200 rounded-full relative p-0.5">
              <div className="w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>

        {/* --- GRID MAPPING BLOCK --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-x-6 gap-y-6">
          {destinations.map((dest) => (
            <div 
              key={dest.id} 
              className="relative group rounded-xl overflow-hidden aspect-[3/2] w-full shadow-md bg-gray-900 cursor-pointer"
            >
              {/* Image Layout */}
              <img 
                src={dest.image} 
                alt={dest.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
              />
              
              {/* Soft Gradient Mask overlay overlaying text details */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
              
              {/* Top Corner Dynamic Badge Tag */}
              <span className={`absolute top-4 right-4 text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded ${getBadgeStyles(dest.badge)}`}>
                {dest.badge}
              </span>

              {/* Bottom Text Core Descriptions */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex flex-col justify-end text-white">
                <h3 className="text-2xl md:text-3xl font-serif font-bold mb-1 tracking-wide">
                  {dest.title}
                </h3>
                
                <div className="flex items-center gap-1.5 text-xs text-[#D6A248] font-medium mb-3">
                  <span className="text-[10px]">📍</span>
                  <span>{dest.region}</span>
                </div>
                
                <p className="text-xs md:text-sm text-gray-300 font-light max-w-xl mb-4 line-clamp-2 leading-relaxed">
                  {dest.description}
                </p>

                {/* Animated Call-to-action anchor tag */}
                <div className="flex items-center gap-1 text-xs font-semibold tracking-wider uppercase text-white/90 group-hover:text-[#D6A248] transition-colors">
                  <span>Explore Destination</span>
                  <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">›</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* --- PAGINATION CONTROL CONTROLS --- */}
        <div className="flex justify-center items-center gap-2 mt-16 text-xs font-medium text-gray-400">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          
          <button 
            onClick={() => setCurrentPage(1)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === 1 ? 'bg-[#1F2B4D] text-white font-bold' : 'hover:bg-gray-50'}`}
          >
            1
          </button>
          
          <button 
            onClick={() => setCurrentPage(2)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === 2 ? 'bg-[#1F2B4D] text-white font-bold' : 'hover:bg-gray-50'}`}
          >
            2
          </button>
          
          <button 
            onClick={() => setCurrentPage(3)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === 3 ? 'bg-[#1F2B4D] text-white font-bold' : 'hover:bg-gray-50'}`}
          >
            3
          </button>
          
          <span className="px-1 text-gray-300">...</span>
          
          <button 
            onClick={() => setCurrentPage(8)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${currentPage === 8 ? 'bg-[#1F2B4D] text-white font-bold' : 'hover:bg-gray-50'}`}
          >
            8
          </button>

          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, 8))}
            className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

      </div>
      <div className="w-full bg-white px-4 py-16 font-sans text-[#111111] border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto">
        
        {/* --- SECTION HEADER --- */}
        <div className="flex flex-col items-center text-center mb-12">
          <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-gray-500 px-3 py-1 border border-gray-200 rounded-full bg-gray-50 mb-4">
            🏷️ Handpicked Deals
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-[#1F2B4D] mb-4 tracking-wide">
            Curated Luxury Offers
          </h2>
          <p className="text-sm md:text-base text-gray-500 max-w-2xl font-light">
            Exclusive limited time experiences crafted just for you
          </p>
          <div className="mt-6 relative w-48 h-[1px] bg-gray-200">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#D6A248] rotate-45"></div>
          </div>
        </div>

        {/* --- OFFERS GRID MAPPING --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-6 mb-20">
          {offers.map((offer) => (
            <div 
              key={offer.id} 
              className="relative group rounded-2xl overflow-hidden aspect-[4/3] w-full shadow-md bg-gray-900 cursor-pointer"
            >
              {/* Image Layout */}
              <img 
                src={offer.image} 
                alt={offer.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-85"
              />
              
              {/* Dynamic Gradient Overlay Layer */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10"></div>
              
              {/* Top Left Tag */}
              <span className={`absolute top-4 left-4 text-[8px] uppercase font-bold tracking-widest px-2.5 py-1 rounded text-white ${getTagStyles(offer.tag)}`}>
                {offer.tag}
              </span>

              {/* Top Right Rating pill */}
              <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-black text-[10px] font-bold shadow-sm">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span>{offer.rating}</span>
              </div>

              {/* Bottom Content Area */}
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white">
                <span className="text-xs font-light text-gray-300 uppercase tracking-wider block mb-0.5">
                  UPTO
                </span>
                
                <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-1">
                  {offer.discount}
                </h3>
                
                <h4 className="text-lg md:text-xl font-serif font-bold tracking-wide mb-3 text-gray-100">
                  {offer.title}
                </h4>
                
                <p className="text-xs md:text-sm text-gray-300 font-light max-w-xl line-clamp-2 leading-relaxed">
                  {offer.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* --- CTA FOOTER CONTAINER --- */}
        <div className="flex flex-col items-center text-center border-t border-gray-100 pt-16 pb-6">
          <h3 className="text-xl md:text-2xl font-serif font-bold text-[#1F2B4D] mb-2 tracking-wide">
            Not sure where to go?
          </h3>
          <p className="text-xs md:text-sm text-gray-400 font-light mb-6">
            Let our travel experts curate the perfect destination based on your preferences.
          </p>
          <Link to="/">
            <button className="bg-[#1C2434] hover:bg-[#2C3951] text-white text-xs font-semibold tracking-wider uppercase px-6 py-3 rounded-lg transition-colors shadow-sm">
            Plan My Journey
          </button>
          </Link>
        </div>

      </div>
          <ToursAndPackagesFooter />

    </div>
    </section>
  );
};