import React from 'react';

interface LuxurySectionProps {
  className?: string;
}

const LuxurySection: React.FC<LuxurySectionProps> = ({ className = '' }) => {
  const features = [
    {
      id: 1,
      icon: '/logo/Diamond.png',
      title: 'Hand Picked Luxury',
      description: 'Every stay and experience is personally selected by our travel experts.',
    },
    {
      id: 2,
      icon: '/logo/HeadSet2.png',
      title: 'Concierge Support',
      description: '24/7 dedicated support for a seamless and stress-free journey.',
    },
    {
      id: 3,
      icon: '/logo/Star.png',
      title: 'Verified Experience',
      description: 'We partner only with top-rated, trusted luxury providers.',
    },
  ];

  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="rounded-2xl p-6 text-center"
            style={{
              backgroundColor: '#FAF5E7',
              border: '1px solid #DEC0BC',
            }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white">
                <img src={feature.icon} alt={feature.title} className="w-8 h-8 object-contain" />
              </div>
            </div>

            {/* Title */}
            <h3
              className="text-lg font-bold mb-2"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: '#1A1A1A',
              }}
            >
              {feature.title}
            </h3>

            {/* Description */}
            <p
              className="text-sm text-gray-600"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                lineHeight: '1.6',
              }}
            >
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LuxurySection;
