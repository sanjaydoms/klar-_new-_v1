import React from 'react';
import { FooterSeoLinks } from './FooterSeoLinks';
import { FooterGuideGrid } from './FooterGuideGrid';
import { FooterFaqAndLegal } from './FooterFaqAndLegal';
import { FooterSocialMediaLinks } from './FooterSocialMediaLinks';

export const InsuranceFooter: React.FC = () => {
  return (
    <footer className="w-full bg-white mt-12 sm:mt-16 pt-10 sm:pt-14 font-sans border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-12">
        <FooterSeoLinks />
        <FooterGuideGrid />
      </div>

      <div className="mt-12 sm:mt-16">
        <FooterFaqAndLegal />
      </div>
      
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FooterSocialMediaLinks />
      </div> 
     
    </footer>
  );
};

export default InsuranceFooter;