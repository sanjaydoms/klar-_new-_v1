import React from 'react';

interface DestinationCardProps {
  rating: number;
  title: string;
  location: string;
  image: string;
  price?: string;
  reviews?: string;
  onClick?: () => void;
  className?: string;
}

const DestinationCard: React.FC<DestinationCardProps> = ({
  rating,
  title,
  location,
  image,
  price,
  onClick,
  className = '',
}) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl cursor-pointer w-full ${className}`}
      onClick={onClick}
      style={{ border: '1px solid #DEC0BC' }}
    >
      {/* Image container with aspect ratio */}
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: '60%' }}>
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
          style={{ backgroundImage: `url(${image})` }}
        />
        {/* Rating - Top Right Corner */}
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-white font-semibold text-sm">{rating}</span>
          </div>
        </div>
      </div>

      {/* Content - White Background below image */}
      <div className="bg-white rounded-b-2xl p-3 sm:p-4">
        {/* Title */}
        <h3 className="text-gray-900 text-base sm:text-lg font-bold mb-0.5 leading-snug">{title}</h3>

        {/* Location */}
        <p className="text-gray-600 text-sm flex items-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3.5 h-3.5 flex-shrink-0 text-gray-500"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="truncate">{location}</span>
        </p>

        {/* Price (optional) */}
        {price && <p className="text-gray-700 text-sm font-semibold mt-1">{price}</p>}
      </div>
    </div>
  );
};

export default DestinationCard;
