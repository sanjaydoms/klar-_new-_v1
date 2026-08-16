import { Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PopularDestinationsProps {
    onViewAll?: () => void;
}

export default function PopularDestinations({ onViewAll }: PopularDestinationsProps) {
    const navigate = useNavigate();

    return (
        <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8">
          <div className="mb-8">
            <h2
              className="text-3xl font-bold text-gray-900 mb-4 text-center"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Popular Destinations
            </h2>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
              <Star size={20} className="text-[#D4AF37] fill-[#D4AF37]" />
              <div className="w-24 h-[2px] bg-[#D4AF37]"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
            {[
              {
                name: 'Italy',
                image: 'https://images.unsplash.com/photo-1542820229-081e0c12af0b?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'Greece',
                image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'South Korea',
                image: 'https://images.unsplash.com/photo-1570191913384-7b4ff11716e7?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'Japan',
                image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'United Arab Emirates',
                image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
              },
              {
                name: 'China',
                image: 'https://images.unsplash.com/photo-1584872589930-e99fe5bf4408?auto=format&fit=crop&w=800&q=80',
              },
            ].map((destination, index) => (
              <div
                key={index}
                onClick={() => navigate(`/destinations/${destination.name}`)}
                className="cursor-pointer group flex flex-col w-full"
              >
                <div className="w-full h-[386px] rounded-[16px] overflow-hidden mb-3">
                  <img
                    src={destination.image}
                    alt={destination.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="w-full text-center">
                  <h3
                    className="font-bold text-[#101828]"
                    style={{
                      fontFamily: "'Manrope', sans-serif",
                      fontSize: '18px',
                      lineHeight: '28px',
                    }}
                  >
                    {destination.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
    );
}