import React, { useState } from 'react';

interface HotelImageGalleryProps {
  images: string[];
  hotelName: string;
  initialIndex?: number;
}

export const HotelImageGallery: React.FC<HotelImageGalleryProps> = ({
  images,
  hotelName,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <div className="hotel-image-gallery">
      {/* 
        TODO: Full image gallery / lightbox for hotel detail page
        Thumbnail strip + enlarged main image with prev/next arrows
        Keyboard navigation (left/right), close on Escape or outside click
      */}
      <div className="main-image-container mb-4">
        {images.length > 0 ? (
          <img
            src={images[currentIndex]}
            alt={`${hotelName} - ${currentIndex + 1}`}
            className="w-full h-auto rounded"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded">
            No Images Available
          </div>
        )}
      </div>
      <div className="thumbnails flex gap-2 overflow-x-auto">
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img}
            alt={`Thumbnail ${idx + 1}`}
            className={`w-20 h-20 object-cover cursor-pointer rounded ${idx === currentIndex ? 'border-2 border-blue-500' : ''}`}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
};
