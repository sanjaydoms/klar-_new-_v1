import React from 'react';
import { useNavigate } from 'react-router-dom';
import BackgroundImage from '/images/FlightBg.png?url';
import Arrow from '/logo/Icon.png?url';

const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  const handleArrowClick = () => {
    navigate('/');
  };

  return (
    <section
      className="w-full relative overflow-hidden -mx-4"
      style={{
        backgroundImage: `url(${BackgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: '180px',
        width: '100vw',
        position: 'relative',
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
      }}
    >
      <div className="relative z-10 p-6 max-w-7xl mx-auto">
        <div
          className="flex items-center gap-4 mb-6 cursor-pointer group"
          onClick={handleArrowClick}
        >
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 group-hover:bg-white/40 transition-all duration-300 group-hover:scale-110">
            <img src={Arrow} alt="Arrow" className="w-5 h-5" />
          </div>
          <h1
            className="text-primary uppercase tracking-wider group-hover:text-primary transition-colors duration-300"
            style={{
              fontFamily: 'Playfair Display',
              fontWeight: 700,
              fontStyle: 'bold',
              fontSize: '30px',
              lineHeight: '50px',
              letterSpacing: '0px',
              verticalAlign: 'middle',
            }}
          >
            Flights
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-primary leading-tight">
          Where to next?
          <br />
        </h2>
        <p className="text-primary mt-2 text-md">
          Let's make your journey comfortable and memorable.
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
