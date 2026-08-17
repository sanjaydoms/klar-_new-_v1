import { ArrowRight } from 'lucide-react';

interface TravelPartnerProps {
  className?: string;
  onBookNow?: () => void;
}

export default function TravelPartner({ className = '', onBookNow }: TravelPartnerProps) {
  return (
    <div className={`w-full ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        {/* Removed flex gap entirely to control spacing manually */}
        <div className="flex flex-col w-full">
          
          {/* Top Section - Text Content */}
          <div className="text-center max-w-2xl mx-auto">
            {/* Heading */}
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2"
              style={{ 
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              Your complete travel booking
            </h2>

            {/* Description - Tightened margin below text */}
            <p
              className="text-gray-600 text-sm md:text-base max-w-lg mx-auto mb-3"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Simple, secure bookings for flights, stays, visas, and insurance.
            </p>

            {/* Book Now Button - Redirects to '/' */}
            <button
              onClick={() => {
                // Call onBookNow callback if provided
                if (onBookNow) {
                  onBookNow();
                }
                // Redirect to root path using window.location
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-sm md:text-base"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Book Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Section - Image Container */}
          {/* Added mt-4 / mt-6 for micro-controlled spacing between button and image */}
          {/* <div className="w-full relative rounded-3xl overflow-hidden aspect-[21/9] min-h-[200px] md:min-h-[300px] mt-4 md:mt-6">
            <img 
              src="/images/Paris.png" 
              alt="Paris Travel" 
              className="w-full h-full object-cover"
            />
          </div> */}

        </div>
      </div>
    </div>
  );
}