import React from 'react';
import { ToursInfoContent } from './ToursInfoContent';
import { ToursDestinationsGrid } from './ToursDestinationsGrid';
import { FooterSocialMediaLinks } from '@/components/Insurance/InsuranceFooter/FooterSocialMediaLinks';

export const ToursAndPackagesFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#f8f8f8] border-t border-gray-200 py-10 sm:py-14 px-4 sm:px-8 md:px-12 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Part 1: Top Informational & Planning Guides */}
        <ToursInfoContent />

        {/* Part 2: Bottom Destination Guides & Places to Visit Grid */}
        <ToursDestinationsGrid />

        {/* Reusable Social Links Component */}
        <div className="pt-8 border-t border-gray-300">
          <FooterSocialMediaLinks />
        </div>
      </div>
    </footer>
  );
};

export default ToursAndPackagesFooter;