import React from 'react';
import HeroSection from './HeroSection';
import SearchForm from './SearchForm';
import PopularDestinations from './PopularDestinations';
import BottomNav from '../DashboardPage/BottomNav';
import RecommendedHotels from '@/components/RecommendedHotels/RecommendedHotels';

const HotelSearchPage: React.FC = () => {
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative overflow-y-auto">
      <div className="pb-20">
        <HeroSection />
        <div id="search-section">
          <SearchForm />
        </div>
        <RecommendedHotels />
        <PopularDestinations />
      </div>
      <BottomNav />
    </div>
  );
};

export default HotelSearchPage;
