import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Ship, Anchor, Compass, Sparkles, ArrowLeft } from 'lucide-react';
import { notifyInfo } from '@/utils/notify';

const MobileCruiseSearchSection = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full max-w-md mx-auto bg-[#FAF5F5] border border-[#D4AF37]/50 rounded-2xl p-4 sm:p-6 flex flex-col items-center text-center shadow-xs my-2">
      {/* Top Bar with Back Button */}
      <div className="w-full flex items-center justify-start mb-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-medium shadow-xs hover:bg-gray-50 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#7F0909]" />
          <span>Back</span>
        </button>
      </div>

      {/* Main Icon Badge */}
      <div className="relative my-2 flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border border-[#D4AF37] shadow-sm">
        <Ship className="w-7 h-7 sm:w-8 sm:h-8 text-[#7F0909]" />
        <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37] absolute -top-1 -right-1 animate-pulse" />
      </div>

      {/* Heading */}
      <h3 className="text-lg sm:text-xl font-serif font-bold text-gray-900 tracking-wide mb-1.5">
        Where would you like to sail?
      </h3>

      {/* Subheading / Paragraph */}
      <p className="text-xs sm:text-sm text-gray-600 max-w-xs sm:max-w-md mb-5 leading-relaxed px-2">
        Our luxury cruise bookings are launching soon! Select your preferred voyage style to get notified first.
      </p>

      {/* Selection Cards */}
      <div className="flex flex-col gap-3 w-full mb-6">
        {/* Card 1: Ocean Cruises */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3.5 text-left shadow-xs active:bg-gray-50 border-l-4 border-l-[#7F0909] transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-[#7F0909]/10 flex items-center justify-center shrink-0">
            <Anchor className="w-5 h-5 text-[#7F0909]" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-gray-900 text-sm">Ocean Cruises</h4>
            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Explore grand ocean liners and international waters</p>
          </div>
        </div>

        {/* Card 2: River Cruises */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3.5 text-left shadow-xs active:bg-gray-50 border-l-4 border-l-blue-900 transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-blue-900" />
          </div>
          <div>
            <h4 className="font-serif font-bold text-gray-900 text-sm">River Cruises</h4>
            <p className="text-[11px] text-gray-500 leading-tight mt-0.5">Discover historic cities along iconic scenic waterways</p>
          </div>
        </div>
      </div>

      {/* Full-width CTA Button on Mobile */}
      <button 
        type="button" 
        onClick={() => notifyInfo("We'll notify you when cruise bookings are live!")}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#7F0909] text-white text-xs sm:text-sm font-semibold hover:bg-[#630707] transition-all shadow-md active:scale-98"
      >
        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
        Notify Me When Ready
      </button>
    </div>
  );
};

export default MobileCruiseSearchSection;