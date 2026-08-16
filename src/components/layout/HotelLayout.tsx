import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../Footer/Footer2';
import MainNavbar from './Navbar/MainNavbar';

const HotelLayout = () => {
  return (
    <div className="flex flex-col min-h-screen pb-24 md:pb-0 bg-gray-50">
      <MainNavbar activeService="hotels" isRelative={true} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default HotelLayout;
