import React from 'react';
import { X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';

export default function ToursBookingFailed() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-white font-sans text-[#0F172A] flex flex-col justify-between">
      {/* Navbar Container */}
      <header className="w-full bg-white border-b border-gray-100 shadow-xs px-4 sm:px-8 py-3">
        <div className="w-full max-w-[1400px] mx-auto">
          <ToursAndPackagesNavbar />
        </div>
      </header>

      {/* Main Failed Section */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12 text-center flex-grow flex flex-col justify-center items-center">
        {/* Red Error Badge */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FEE2E2] rounded-full flex items-center justify-center mb-6 shadow-xs">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#FF5A5F] rounded-full flex items-center justify-center text-white">
            <X className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
          </div>
        </div>

        {/* Heading & Subtext */}
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mb-3">
          We couldn't get your Details
        </h1>
        <p className="text-sm sm:text-base text-gray-500 font-normal max-w-md mx-auto mb-8 leading-relaxed">
          It looks like something went wrong while submitting your request.<br />
          Please try again.
        </p>

        {/* Retry Button */}
        <button
          onClick={() => navigate("/tours-contact-form")}
          className="bg-[#1A2342] hover:bg-[#12182E] active:scale-[0.98] text-white font-bold text-base px-8 h-12 sm:h-13 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Retry Booking Again</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </main>
    </div>
  );
}