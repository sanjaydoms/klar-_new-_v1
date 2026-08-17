import React from 'react';
import ChartersWhyChooseSection from './ChartersWhyChooseSection';
import ChartersCategoriesGridSection from './ChartersCategoriesGridSection';
import ChartersServiceHighlightsSection from './ChartersServiceHighlightsSection';
import ChartersFeatureOverviewSection from './ChartersFeatureOverviewSection';
import ChartersConciergeServicesSection from './ChartersConciergeServicesSection';
import ChartersDarkBannerSection from './ChartersDarkBannerSection';
import ChartersFaqAccordionSection from './ChartersFaqAccordionSection';
import ChartersCallToActionSection from './ChartersCallToActionSection';
import ChartersFooterSection from './ChartersFooterSection';

export const ChartersContent: React.FC = () => {
  return (
    <main className="w-full bg-white text-gray-900">
      {/* Standard Container for Consistent Section Widths */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-24 py-12">
        <ChartersWhyChooseSection />
        <ChartersCategoriesGridSection />
        <ChartersServiceHighlightsSection />
        <ChartersFeatureOverviewSection />
        <ChartersConciergeServicesSection />
      </div>

      {/* Full-width dark banner section */}
      <div className="w-full bg-[#3d0c11] text-white my-16 md:my-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <ChartersDarkBannerSection />
        </div>
      </div>

      {/* Remaining content inside bounded container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 md:space-y-24 pb-12">
        <ChartersFaqAccordionSection />
        <ChartersCallToActionSection />
      </div>

      {/* Footer */}
      <ChartersFooterSection />
    </main>
  );
};

export default ChartersContent;