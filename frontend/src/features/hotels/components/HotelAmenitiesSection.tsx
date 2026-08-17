import React, { useState } from 'react';

interface HotelAmenitiesSectionProps {
  amenities: string[];
}

export const HotelAmenitiesSection: React.FC<HotelAmenitiesSectionProps> = ({ amenities }) => {
  const [showAll, setShowAll] = useState(false);

  const displayedAmenities = showAll ? amenities : amenities.slice(0, 8);

  return (
    <div className="hotel-amenities-section py-4 border-b">
      <h3 className="text-xl font-bold mb-4">Amenities</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedAmenities.map((amenity, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-gray-500">•</span> {/* Placeholder for icon */}
            <span>{amenity}</span>
          </div>
        ))}
      </div>
      {amenities.length > 8 && (
        <button
          className="mt-4 text-blue-600 font-semibold hover:underline"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Show less' : `Show all ${amenities.length} amenities`}
        </button>
      )}
    </div>
  );
};
