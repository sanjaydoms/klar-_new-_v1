import React from 'react';
import { ImageIcon } from 'lucide-react';

/** Gray placeholder shown until a real photo (imageSrc) is provided. */
const ImagePlaceholder = ({ className = '' }: { className?: string }) => (
  <div className={`flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 ${className}`}>
    <ImageIcon className="w-6 h-6 text-gray-400" strokeWidth={1.5} />
  </div>
);

interface Destination {
  name: string;
  tagline: string;
  badge: string;
  imageSrc?: string;
}

const destinations: Destination[] = [
  {
    name: 'Mediterranean',
    tagline: 'Sun, culture & history',
    badge: '80+ Cruises',
    imageSrc: '/Cruise_Imgs/Mediterranean.png',
  },
  {
    name: 'Norwegian Fjords',
    tagline: "Nature's masterpiece",
    badge: '60+ Cruises',
    imageSrc: '/Cruise_Imgs/Fjords.png',
  },
  {
    name: 'Caribbean',
    tagline: 'Tropical paradise',
    badge: '90+ Cruises',
    imageSrc: '/Cruise_Imgs/Caribbean.png',
  },
  {
    name: 'Alaska',
    tagline: 'Wild beauty',
    badge: '50+ Cruises',
    imageSrc: '/Cruise_Imgs/Alaska.png',
  },
  {
    name: 'Asia',
    tagline: 'Timeless splendors',
    badge: '90+ Cruises',
    imageSrc: '/Cruise_Imgs/Asia.png',
  },
];

const DestinationCard = ({ name, tagline, badge, imageSrc }: Destination) => {
  const handleClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('cruiseDestinationSelected', { detail: name }));
  };

  return (
    <div
      onClick={handleClick}
      className="relative group rounded-[20px] overflow-hidden cursor-pointer w-full aspect-[3/4] sm:aspect-[3/5] mx-auto shadow-sm"
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <ImagePlaceholder className="absolute inset-0 w-full h-full transition-transform duration-300 group-hover:scale-105" />
      )}

      {/* Bottom gradient scrim so the white text stays legible over any photo */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Badge */}
      <span className="absolute top-4 left-4 sm:top-4 sm:left-auto sm:right-4 bg-[#1B2559] sm:bg-white/30 sm:backdrop-blur-md text-[10px] font-bold text-white px-3 py-1.5 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-wider">
        {badge}
      </span>

      {/* Title / tagline */}
      <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-5">
        <h3 className="text-white text-[24px] sm:text-[22px] font-bold sm:font-semibold leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
          {name}
        </h3>
        <p className="text-white/90 text-[13px] sm:text-[13px] mt-1 sm:mt-1.5" style={{ fontFamily: 'Inter' }}>
          {tagline}
        </p>
      </div>
    </div>
  );
};

export const TopDestinations = () => {
  return (
    <section className="w-full bg-[#FAFAFA] sm:bg-white py-12 sm:py-16 px-4">
      <div className="max-w-7xl mx-auto flex flex-col relative">
        <div className="text-center mb-10 sm:mb-12">
          <h2
            className="text-[#1B2559] text-[32px] sm:text-[32px] font-bold mb-3 sm:mb-4"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            Top Destinations
          </h2>
          <p className="text-[#6B7280] text-[15px] sm:text-base font-medium" style={{ fontFamily: 'Inter' }}>
            Sail to some of the world's most breathtaking places
          </p>
        </div>

        {/* Destination grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 sm:gap-4 w-full px-1">
          {destinations.map((d) => (
            <DestinationCard key={d.name} {...d} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopDestinations;