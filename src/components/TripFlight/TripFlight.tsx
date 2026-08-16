import { Plane } from 'lucide-react';

interface TripFlightProps {
  destination: string;
  from?: string;
  fromCode?: string;
  price: number;
  currency?: string | undefined;     
  imageUrl?: string | undefined;      
  onClick?: (() => void) | undefined; 
  className?: string | undefined;    
  badge?: string | undefined;        
}

export default function TripFlight({ 
  destination, 
  from,
  fromCode,
  price, 
  currency = '₹',
  imageUrl,
  onClick,
  className = '',
  badge
}: TripFlightProps) {
  const formattedPrice = new Intl.NumberFormat('en-IN').format(price);

  return (
    <div 
      onClick={onClick}
      className={`
        group relative rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
        bg-white shadow-lg h-[400px]
        ${className}
      `}
    >
      {/* Image Section - 70% of card */}
      <div className="relative h-[70%] w-full">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={destination}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#6C1717] to-[#1A1F4D]" />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Badge (Optional) */}
        {badge && (
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-[#6C1717] text-white text-[8px] sm:text-[10px] font-bold rounded-full shadow-lg uppercase tracking-wider">
              {badge}
            </span>
          </div>
        )}

        {/* Plane Icon Badge */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-md">
            <Plane className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#6C1717] rotate-45" />
          </div>
        </div>

        {/* From Location Badge on Image */}
        {from && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-white text-[10px] sm:text-xs font-medium">
                {fromCode ? `${fromCode} →` : `From ${from}`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Content Section - 30% of card */}
      <div className="h-[30%] p-4 sm:p-5 md:p-6 flex flex-col justify-center">
        {/* Route Display */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {from && (
            <>
              <span 
                className="text-[10px] sm:text-xs font-medium text-gray-500 truncate max-w-[60px] sm:max-w-[80px]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {fromCode || from}
              </span>
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </>
          )}
          <h3 
            className="text-lg sm:text-xl md:text-2xl font-bold text-[#1A1F4D] truncate"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {destination}
          </h3>
        </div>

        <p 
          className="text-[10px] sm:text-xs text-gray-500 font-medium tracking-wider uppercase mb-1"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Starting From
        </p>

        <div className="flex items-baseline gap-1">
          <span 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-[#6C1717]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {currency}
          </span>
          <span 
            className="text-xl sm:text-2xl md:text-3xl font-bold text-[#6C1717]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {formattedPrice}
          </span>
        </div>

        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span 
            className="text-[10px] sm:text-xs text-[#6C1717] font-medium inline-flex items-center gap-1"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            View Details →
          </span>
        </div>
      </div>
    </div>
  );
}