import { Globe, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FlyFlightProps {
    onViewFlights?: (type: 'domestic' | 'international') => void;
}

export default function FlyFlight({ onViewFlights }: FlyFlightProps) {

    const navigate = useNavigate();
    const handleFlightClick = (type: 'domestic' | 'international') => {
        if (type === 'international') {
            navigate('/international-card');  
        } else if (type === 'domestic') {
            navigate('/national-card');
        }
    };

    return (
        <div className="hidden md:block w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
            {/* Header Section */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12">
                <h2
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-[#6C1717] mb-2 sm:mb-3"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                >
                    Book Your Flights
                </h2>
                <p
                    className="text-gray-500 text-xs sm:text-sm md:text-base leading-relaxed px-4 sm:px-0"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                >
                    Choose your trip. Find the best flights and experience the journey in comfort
                </p>
            </div>

            {/* Flight Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">

                {/* 1. International Flights Card */}
                <div
                    onClick={() => handleFlightClick('international')}
                    className="group relative rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden min-h-[320px] sm:min-h-[380px] md:min-h-[420px] lg:min-h-[460px] flex flex-col justify-between p-5 sm:p-6 md:p-8 lg:p-10 cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300"
                >
                    {/* Background Image */}
                    <img
                        src="/images/book_your_flight_img_1.jpg"
                        alt="International Flights"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Gradient Overlay for Text Contrast */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent md:w-3/4" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Content Section */}
                    <div className="relative z-10 max-w-[200px] sm:max-w-xs md:max-w-sm mt-auto">
                        <span
                            className="text-[#6C1717] font-semibold text-xs sm:text-sm md:text-base tracking-wide block mb-1 sm:mb-2"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            International Flights
                        </span>

                        <h3
                            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#1A1F4D] mb-2 sm:mb-3 leading-tight"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            Travel Beyond Borders
                        </h3>

                        <p
                            className="text-gray-700 text-[10px] sm:text-xs md:text-sm leading-relaxed mb-4 sm:mb-5 md:mb-6 font-medium hidden xs:block"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Fly to the world's most iconic destinations with exclusive international offers and trusted airline partners.
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFlightClick('international');
                            }}
                            className="inline-flex items-center gap-2 bg-[#520909] hover:bg-[#6C1717] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-medium transition-all shadow-md group-hover:gap-3"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            <span>View International Flights</span>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>

                {/* 2. Domestic Flights Card */}
                <div
                    onClick={() => handleFlightClick('domestic')}
                    className="group relative rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden min-h-[320px] sm:min-h-[380px] md:min-h-[420px] lg:min-h-[460px] flex flex-col justify-between p-5 sm:p-6 md:p-8 lg:p-10 cursor-pointer shadow-md hover:shadow-2xl transition-all duration-300"
                >
                    {/* Background Image */}
                    <img
                        src="/images/book_your_flight_img_2.jpg"
                        alt="Domestic Flights"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* Gradient Overlay for Text Contrast */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent md:w-3/4" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    {/* Content Section */}
                    <div className="relative z-10 max-w-[200px] sm:max-w-xs md:max-w-sm mt-auto">
                        <span
                            className="text-[#6C1717] font-semibold text-xs sm:text-sm md:text-base tracking-wide block mb-1 sm:mb-2"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Domestic Flights
                        </span>

                        <h3
                            className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-[#1A1F4D] mb-2 sm:mb-3 leading-tight"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                            Explore India
                        </h3>

                        <p
                            className="text-gray-700 text-[10px] sm:text-xs md:text-sm leading-relaxed mb-4 sm:mb-5 md:mb-6 font-medium hidden xs:block"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            Discover the beauty of India with affordable domestic flights and seamless travel experiences across the country.
                        </p>

                        {/* Action Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleFlightClick('domestic');
                            }}
                            className="inline-flex items-center gap-2 bg-[#520909] hover:bg-[#6C1717] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs md:text-sm font-medium transition-all shadow-md group-hover:gap-3"
                            style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                            <span>View Domestic Flights</span>
                            <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}