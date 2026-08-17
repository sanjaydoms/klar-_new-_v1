import React from 'react';
import Header from '../../components/AboutUS/Header';
import AboutUsHeading from '@/components/AboutUS/AboutUsHeading';
import AboutUsContent from '@/components/AboutUS/AboutUsContent';
import ServicesSection from '@/components/AboutUS/ServicesSection';
import Footer from '@/components/layout/Footer';

const AboutUS: React.FC = () => {
  return (
    <div className="w-full min-h-screen m-0 p-0 font-sans">
      <Header />
      <AboutUsHeading />
      <AboutUsContent />
      <ServicesSection />
      <Footer />
    </div>
  );
};

export default AboutUS;
