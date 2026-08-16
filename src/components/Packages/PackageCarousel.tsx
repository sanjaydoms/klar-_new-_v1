import React from 'react';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PackageCard from './PackageCard';

interface PackageItem {
  id: string;
  imageUrl: string;
  city: string;
  price: string;
}

interface PackageCarouselProps {
  title: string;
  subtitle: string;
  items: PackageItem[];
}

const PackageCarousel = ({ title, subtitle, items }: PackageCarouselProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // simple scroll handler
  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = 300; // approx one card width + gap
      if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="py-8 relative w-full">
      {/* Header */}
      <div className="mb-6 px-4">
        <h2 className="text-[24px] font-[700] text-black font-[Poppins] leading-tight mb-2">
          {title}
        </h2>
        <p className="text-[16px] font-[400] text-black font-[Poppins]">{subtitle}</p>
      </div>

      {/* Carousel Container */}
      <div className="relative group">
        {/* Navigation Buttons - Absolute positioned typically, but user spec: "buttons to move left to right... width 1235... height 40"
                   Maybe detailed below or separate?
                   Actually the standard is buttons on sides or top right.
                   The user provided coords: "top: 728px; left: 22px". 
                   Let's stick to standard convenient placement for now (absolute center-y sides) or 
                   custom placement if strictly requested.
                   
                   Re-reading user request: "buttons to move left to right and right to left: width: 1235; height: 40..."
                   This looks like a container width for the buttons? Or the track?
                   Let's put arrows on the sides for better UX.
                */}

        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 text-gray-700 hover:scale-105 transition-transform"
          aria-label="Scroll left"
        >
          <ChevronLeft size={20} />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-4 pb-4 snap-x"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div key={item.id} className="snap-start flex-shrink-0">
              <PackageCard imageUrl={item.imageUrl} city={item.city} price={item.price} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100 text-gray-700 hover:scale-105 transition-transform"
          aria-label="Scroll right"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Dots Indicator - Optional implementation based on "slider dots" spec */}
      <div className="flex justify-center mt-6 gap-2">
        <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
        <div className="w-2.5 h-2.5 rounded-full bg-gray-400"></div>
      </div>
    </div>
  );
};

export default PackageCarousel;
