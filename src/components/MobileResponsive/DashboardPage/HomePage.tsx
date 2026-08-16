import React from 'react';
import Navbar from '../../../components/MobileResponsive/DashboardPage/Navbar';
import Hero from './Hero';

interface HomePageProps {
  onFlightSearch?: (params: {
    tripType: string;
    from?: string;
    to?: string;
    departureDate?: string;
    returnDate?: string;
    travelers: string;
    class: string;
    fareType: string;
    travelerDetails?: any;
    segments?: any[];
  }) => void;
}

// The search form and its submit handler were removed: the form had been
// commented out of the render, so the whole search path here was unreachable.
// The live mobile flight search is FlightSearchSection/FlightSearchPage.tsx,
// which carries the working copy of the same handler. onFlightSearch is kept
// only so existing call sites keep compiling.
const HomePage: React.FC<HomePageProps> = () => {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
      </main>
    </div>
  );
};

export default HomePage;
