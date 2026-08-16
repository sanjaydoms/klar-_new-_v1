import React from 'react';

interface PackageCardProps {
  imageUrl: string;
  city: string;
  price: string;
}

const PackageCard = ({ imageUrl, city, price }: PackageCardProps) => {
  return (
    <div className="flex-shrink-0 relative group cursor-pointer" style={{ width: '231px' }}>
      <div className="flex flex-col gap-4">
        {/* Image Container with Gradient */}
        <div
          className="relative overflow-hidden rounded-[12px]"
          style={{ width: '231px', height: '256px' }}
        >
          <img
            src={imageUrl}
            alt={city}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          {/* Gradient Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(0, 0, 0, 0) 53.85%, rgba(0, 0, 0, 0.8) 90.87%)',
            }}
          />
        </div>

        {/* Text Content */}
        <div className="flex flex-col w-[148px]">
          <h3 className="text-[#000000] font-medium text-base font-[Poppins] leading-tight">
            {city}
          </h3>
          <p className="text-[#000000] font-bold text-sm font-[Poppins] mt-1">{price}</p>
        </div>
      </div>
    </div>
  );
};

export default PackageCard;
