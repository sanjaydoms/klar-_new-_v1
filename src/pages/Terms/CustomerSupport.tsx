import React, { useEffect } from 'react';
import CustomerSupportNavBar from './CustomerSupport/CustomerSupportNavBar';
import Footer from '@/components/layout/Footer';

// Section Components
import SupportHeroSection from './CustomerSupport/SupportHeroSection';
import SupportCategoriesSection from './CustomerSupport/SupportCategoriesSection';
import ContactWaysSection from './CustomerSupport/ContactWaysSection';
import SupportCenterSection from './CustomerSupport/SupportCenterSection';
import TravelAssistanceSection from './CustomerSupport/TravelAssistanceSection';
import FAQSection from './CustomerSupport/FAQSection';

const CustomerSupport: React.FC = () => {
  useEffect(() => {
    document.title = '24/7 Customer Support | Klar Travels';
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1A1F4D] flex flex-col font-sans w-full">
      {/* Global Header/Navbar */}
      <CustomerSupportNavBar />

      <main className="flex-grow w-full">
        <SupportHeroSection />

        <SupportCategoriesSection />

        <ContactWaysSection />

        <SupportCenterSection />

        {/* <TravelAssistanceSection /> */}

        <FAQSection />
      </main>

      <Footer />
    </div>
  );
};

export default CustomerSupport;