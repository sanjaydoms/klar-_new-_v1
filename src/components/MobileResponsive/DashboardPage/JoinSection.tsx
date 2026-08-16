import React from 'react';

interface JoinSectionProps {
  className?: string;
  backgroundImage?: string;
}

const JoinSection: React.FC<JoinSectionProps> = ({ className = '', backgroundImage }) => {
  return (
    <div className={`w-full ${className} pb-24`}>
      <div
        className="relative p-6 sm:p-10 md:p-16 text-center overflow-hidden"
        style={{
          backgroundColor: '#3B4191',
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay if background image exists */}
        {backgroundImage && <div className="absolute inset-0 bg-black/40"></div>}

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Badge */}
          <div className="inline-block mb-4">
            <span
              className="text-white text-sm font-semibold tracking-wider px-4 py-1.5 rounded-full"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              ✦ JOIN 10K+ HAPPY TRAVELERS
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3"
            style={{
              fontFamily: 'Playfair Display, serif',
              color: '#FFFFFF',
            }}
          >
            Ready to Start Your
            <br />
            <span style={{ color: '#FFFFFF' }}>Dream Journey?</span>
          </h2>

          {/* Description */}
          <p
            className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto mb-8"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              lineHeight: '1.6',
            }}
          >
            Start planning your dream getaway with exclusive offers, personalized service, and
            unforgettable experiences.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              className="text-[#3B4191] font-medium text-sm flex items-center justify-center gap-2 px-6 py-3 rounded-lg hover:opacity-80 transition"
              style={{
                backgroundColor: '#FFFFFF',
              }}
              onClick={() => console.log('Start Planning')}
            >
              Start Planning
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M5 12h14" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </button>

            <button
              className="font-medium text-sm flex items-center justify-center gap-2 px-6 py-3 rounded-lg hover:opacity-80 transition"
              style={{
                color: '#FFFFFF',
                border: '1px solid #FFFFFF',
                backgroundColor: 'transparent',
              }}
              onClick={() => console.log('Explore Offers')}
            >
              Explore Offers
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinSection;
