import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundImage from '/images/MobileBg.png?url'; // Using MobileBg for now
import Arrow from '/logo/Icon.png?url';
import { MoreHorizontal } from 'lucide-react';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const handleArrowClick = () => {
    navigate('/mobile-home');
  };

  return (
    <section
      className="w-full relative overflow-hidden -mx-4"
      style={{
        backgroundImage: `url(${BackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '350px',
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30"></div>

      <div className="relative z-10 p-6 max-w-7xl mx-auto h-full flex flex-col justify-between">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mt-4">
          <div
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/40 transition-all duration-300"
            onClick={handleArrowClick}
          >
            <img src={Arrow} alt="Back" className="w-4 h-4 brightness-0 invert" />
          </div>

          <h1
            className="text-white tracking-wider"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 700,
              fontSize: '24px',
            }}
          >
            Hotels
          </h1>

          <div className="w-10 h-10" aria-hidden="true" />
        </div>

        {/* Text Content */}
        <div className="mt-20">
          <h2
            className="text-white leading-tight mb-2"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 700,
              fontSize: '28px',
            }}
          >
            Find your perfect stay
          </h2>
          <p className="text-white/90 text-sm font-medium">Luxury stays personalized for you</p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
