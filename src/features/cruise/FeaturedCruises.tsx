import React from 'react';
import { Star, ImageIcon, CalendarDays } from 'lucide-react';

/** Gray placeholder shown until a real photo (imageSrc) is provided. */
const ImagePlaceholder = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${className}`}>
    <ImageIcon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
  </div>
);

type BadgeTone = 'bestseller' | 'new' | 'popular' | 'luxury';

interface Cruise {
  title: string;
  line: string;
  dateRange: string;
  route: string;
  rating: number;
  reviewCount: number;
  badge: string;
  badgeTone: BadgeTone;
  imageSrc?: string;
}

const cruises: Cruise[] = [
  {
    title: 'Norwegian Fjords',
    line: 'MSC Grandiosa',
    route: 'Bergen \u2192 Geiranger \u2192 Ireland',
    reviewCount: 128,
    badge: 'Best Seller',
    badgeTone: 'bestseller',
    imageSrc: '/Cruise_Imgs/Cruise (2).png',
    dateRange: '',
    rating: 0
  },
  {
    title: 'Caribbean Escape',
    line: 'Royal Caribbean Oasis',
    route: 'Miami \u2192 Nassau \u2192 Labadee',
    reviewCount: 210,
    badge: 'New',
    badgeTone: 'new',
    imageSrc: '/Cruise_Imgs/Cruise (3).png',
    dateRange: '',
    rating: 0
  },
  {
    title: ' Mediterranean',
    line: 'Celebrity Beyond',
    route: 'Rome \u2192 Santorini \u2192 Barcelona',
    reviewCount: 305,
    badge: 'Popular',
    badgeTone: 'popular',
    imageSrc: '/Cruise_Imgs/Cruise.png',
    dateRange: '',
    rating: 0
  },
  {
    title: 'Alaska Adventure',
    line: 'Princess Discovery',
    route: 'Vancouver \u2192 Ketchikan \u2192 Juneau',
    reviewCount: 168,
    badge: 'Luxury',
    badgeTone: 'luxury',
    imageSrc: '/Cruise_Imgs/Cruise (1).png',
    dateRange: '',
    rating: 0
  },
];

const badgeStyles: Record<BadgeTone, string> = {
  bestseller: 'bg-[#F5A524] text-white',
  new: 'bg-[#3B5BDB] text-white',
  popular: 'bg-[#F5761A] text-white',
  luxury: 'bg-[#7C3AED] text-white',
};

const CruiseCard = ({
  title,
  line,
  route,
  badge,
  badgeTone,
  imageSrc,
}: Cruise) => {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('cruiseDestinationSelected', { detail: title }));
  };

  return (
    <div 
      onClick={handleClick}
      className="cursor-pointer rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 bg-white"
    >
      {/* Image */}
      <div className="relative aspect-[4/3]">
        {imageSrc ? (
          <img src={imageSrc} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <ImagePlaceholder className="absolute inset-0 w-full h-full" />
        )}
        <span
          className={`absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-1 rounded-full ${badgeStyles[badgeTone]}`}
        >
          {badge}
        </span>
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="text-[14px] font-semibold text-[#1B2559] leading-snug" style={{ fontFamily: 'Playfair Display' }}>
          {title}
        </h3>
        <p className="text-[12px] text-[#9CA3AF] mt-0.5" style={{ fontFamily: 'Inter' }}>
          {line}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-1 truncate" style={{ fontFamily: 'Inter' }}>
          {route}
        </p>

      </div>
    </div>
  );
};

export const FeaturedCruises = () => {
  return (
    <section className="w-full bg-white py-14 sm:py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Handpicked divider */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="h-px w-16 sm:w-24 bg-[#D8B65C]" />
          <span
            style={{ fontFamily: 'Playfair Display', fontSize:"28px" }}
            className="italic text-base sm:text-lg text-[#7A1315]"
          >
            Handpicked
          </span>
          <span className="h-px w-16 sm:w-24 bg-[#D8B65C]" />
        </div>

        {/* Heading */}
        <div className="text-center mb-8 sm:mb-10">
          <h2
            style={{ fontFamily: 'Playfair Display', fontSize: '32px', lineHeight: '40px' }}
            className=" font-semibold text-[#1B2559] "
          >
            Featured Cruises
          </h2>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-sm sm:text-base text-gray-500 mt-2"
          >
            Curated voyages for unforgettable experiences
          </p>
        </div>

        {/* Cruise grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {cruises.map((c) => (
            <CruiseCard key={c.title} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCruises;