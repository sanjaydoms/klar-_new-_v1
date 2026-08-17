import { Plane, Hotel, Utensils, Car, Heart } from 'lucide-react';

interface PackageResultCardProps {
  image: string;
  title: string;
  duration: string; // e.g., "6 Nights / 7 Days"
  price: string; // e.g., "89,999"
  isBestseller?: boolean;
  onClick?: () => void;
}

const PackageResultCard = ({
  image,
  title,
  duration,
  price,
  isBestseller = true,
  onClick,
}: PackageResultCardProps) => {
  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white cursor-pointer rounded-[24px] overflow-hidden transition-transform duration-300 hover:scale-[1.02] w-full"
    >
      {/* Top Banner Badges */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {isBestseller && (
          <span className="bg-[#FF9E44] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider scale-90 origin-left">
            Bestseller
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="pointer-events-auto p-1.5 rounded-full bg-black/10 backdrop-blur-md text-white/80 hover:text-red-500 transition-colors"
        >
          <Heart className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Image Container */}
      <div className="relative aspect-[340/220] w-full overflow-hidden rounded-[24px]">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Content Body Container (No Borders or Box Shadows) */}
      <div className="flex flex-col flex-grow pt-4 pb-2 px-1 bg-white">
        {/* Title and Duration */}
        <div className="mb-3">
          <h3 className="text-[#111111] font-bold text-[20px] tracking-tight leading-tight mb-1 font-serif">
            {title}
          </h3>
          <p className="text-gray-500 text-[13px] font-medium">{duration}</p>
        </div>

        {/* Amenity Icons Row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] font-medium mb-3 pt-1">
          <div className="flex items-center gap-1">
            <Plane className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-gray-500">Flights</span>
          </div>
          <div className="flex items-center gap-1">
            <Hotel className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-gray-500">Hotel</span>
          </div>
          <div className="flex items-center gap-1">
            <Utensils className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-gray-400 line-through">Meals</span>
          </div>
          <div className="flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-gray-500">Transfers</span>
          </div>
        </div>

        {/* Pricing Layout Block */}
        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-gray-400 text-[13px]">From</span>
          <span className="text-[#111111] font-extrabold text-[20px]">₹{price}</span>
          <span className="text-gray-400 text-[13px]">/ person</span>
        </div>
      </div>
    </div>
  );
};

export default PackageResultCard;
