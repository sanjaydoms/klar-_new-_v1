import React, { useState } from 'react';
import {
  ChevronLeft,
  MoreVertical,
  Search,
  ShieldCheck,
  Map,
  Headphones,
  AlertCircle,
  Home,
  Briefcase,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ToursAndPackagesFooter from './ToursAndPackagesFooter/ToursAndPackagesFooter';

export const MobileToursAndPackagesSearchSection: React.FC = () => {
  const navigate = useNavigate();

  // Selection state ('Domestic' | 'International' | null)
  const [selectedType, setSelectedType] = useState<'Domestic' | 'International' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (type: 'Domestic' | 'International') => {
    setSelectedType(type);
    setError(null);
  };

  const handleSearch = () => {
    if (!selectedType) {
      setError('Please select a destination type to proceed.');
      return;
    }

    // Pass chosen type to contact query page
    navigate(`/tours-contact-form?destinationType=${encodeURIComponent(selectedType)}`);
  };

  const packages = [
    {
      id: 1,
      title: 'Japan Discovery',
      tag: 'Best Seller',
      image: '/images/tours_mobile_content_img_1.jpg',
      inclusions: ['Flight', 'Hotel', 'Meals', 'Transfers'],
    },
    {
      id: 2,
      title: 'Swiss Adventure',
      tag: 'Best Seller',
      image: '/images/tours_mobile_content_img_2.jpg',
      inclusions: ['Flight', 'Hotel', 'Meals', 'Transfers'],
    },
    {
      id: 3,
      title: 'Turkey Explorer',
      tag: 'Best Seller',
      image: '/images/tours_mobile_content_img_3.jpg',
      inclusions: ['Flight', 'Hotel', 'Meals', 'Transfers'],
    },
    {
      id: 4,
      title: 'Greece Getaway',
      tag: 'Best Seller',
      image: '/images/tours_mobile_content_img_4.jpg',
      inclusions: ['Flight', 'Hotel', 'Meals', 'Transfers'],
    },
    {
      id: 5,
      title: 'Northern Lights',
      tag: 'Best Seller',
      image: '/images/tours_mobile_content_img_5.jpg',
      inclusions: ['Flight', 'Hotel', 'Meals', 'Transfers'],
    },
  ];

  return (
    <div className="max-w-[430px] mx-auto bg-slate-50 min-h-screen relative pb-28 font-sans overflow-x-hidden text-[#0F172A]">
      {/* 1. HERO BANNER SECTION */}
      <div
        className="relative h-60 bg-cover bg-center text-white px-5 pt-6 flex flex-col justify-between pb-8"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.5)), url('/images/tours_mobile_banner_img.jpg')`,
        }}
      >
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white active:scale-95 transition-transform"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-wide">Tours & Packages</h1>
          <button className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white active:scale-95 transition-transform">
            <MoreVertical size={20} />
          </button>
        </div>

        {/* Subtitle Message */}
        <div className="mb-2">
          <h2 className="text-2xl font-bold leading-tight mb-1">
            Where will your next story begin?
          </h2>
          <p className="text-xs text-gray-200 font-normal tracking-wide">
            Handcrafted experiences personalized for you
          </p>
        </div>
      </div>

      {/* 2. DESTINATION SELECTION SEARCH CARD */}
      <div className="px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-gray-100/80">
          {/* Card Title */}
          <div className="text-center mb-5">
            <h3 className="text-xl font-bold text-[#0F172A] tracking-tight">
              Where would you like to go?
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select your destination type to explore the best packages
            </p>
          </div>

          {/* Option 1: Domestic Travel */}
          <div
            onClick={() => handleSelect('Domestic')}
            className={`relative flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border mb-3 bg-white ${
              selectedType === 'Domestic'
                ? 'border-[#8B1D1D] ring-1 ring-[#8B1D1D] shadow-xs'
                : 'border-gray-200'
            }`}
          >
            {/* Custom Radio Circle */}
            <div className="absolute top-3.5 left-3.5">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedType === 'Domestic' ? 'border-[#8B1D1D]' : 'border-gray-300'
                }`}
              >
                {selectedType === 'Domestic' && (
                  <div className="w-2 h-2 rounded-full bg-[#8B1D1D]" />
                )}
              </div>
            </div>

            {/* Icon Wrapper (Light Pink Tint: #FEF2F2) */}
            <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0 ml-5">
              <img
                src="/logo/tours_tajmahal_icon.png"
                alt="Domestic"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Content Details */}
            <div className="flex flex-col justify-center min-w-0">
              <h4 className="text-base font-bold text-[#0F172A] leading-tight truncate">
                Domestic Travel
              </h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug truncate">
                Explore beautiful destinations across India
              </p>
            </div>
          </div>

          {/* Option 2: International Travel */}
          <div
            onClick={() => handleSelect('International')}
            className={`relative flex items-center gap-3.5 p-3.5 rounded-2xl cursor-pointer transition-all border mb-4 bg-white ${
              selectedType === 'International'
                ? 'border-[#1E293B] ring-1 ring-[#1E293B] shadow-xs'
                : 'border-gray-200'
            }`}
          >
            {/* Custom Radio Circle */}
            <div className="absolute top-3.5 left-3.5">
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  selectedType === 'International' ? 'border-[#1E293B]' : 'border-gray-300'
                }`}
              >
                {selectedType === 'International' && (
                  <div className="w-2 h-2 rounded-full bg-[#1E293B]" />
                )}
              </div>
            </div>

            {/* Icon Wrapper (Light Blue Tint: #EFF6FF) */}
            <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 ml-5">
              <img
                src="/logo/tours_global_icon.png"
                alt="International"
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Content Details */}
            <div className="flex flex-col justify-center min-w-0">
              <h4 className="text-base font-bold text-[#0F172A] leading-tight truncate">
                International Travel
              </h4>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug truncate">
                Discover amazing places around the world
              </p>
            </div>
          </div>

          {/* Validation Error Text */}
          {error && (
            <div className="mb-3 flex items-center justify-center gap-1.5 text-red-600 text-xs font-semibold">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSearch}
            className="w-full bg-[#800A0A] hover:bg-[#630606] active:scale-[0.98] text-white font-bold rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm shadow-md transition-all cursor-pointer"
          >
            <Search size={16} className="text-white" />
            <span>Search Packages</span>
          </button>

          {/* Micro Value Proposition Bar */}
          <div className="grid grid-cols-3 gap-1 mt-5 pt-3 border-t border-gray-100 text-center text-[10px] text-gray-500 font-medium">
            <div className="flex flex-col items-center gap-1">
              <ShieldCheck size={14} className="text-gray-400" />
              <span>Verified Assured</span>
            </div>
            <div className="flex flex-col items-center gap-1 border-x border-gray-100">
              <Map size={14} className="text-gray-400" />
              <span>Flexible Routing</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Headphones size={14} className="text-gray-400" />
              <span>Trusted Support</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TRENDING COLLECTIONS SECTION */}
      <div className="mt-8 mb-4 text-center">
        <h3 className="text-lg font-extrabold text-[#0F172A] inline-block relative pb-1">
          Trending Collections
          <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-yellow-500 rounded-full" />
        </h3>
      </div>

      <div className="px-4 space-y-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-100 p-3"
          >
            {/* Package Image */}
            <div
              className="relative rounded-xl overflow-hidden h-44 bg-gray-100"
              onClick={() => navigate('/tours-contact-form')}
            >
              <img
                src={pkg.image}
                alt={pkg.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/logo/tours_japan.png';
                }}
              />
              <span className="absolute top-2.5 left-2.5 bg-[#FB923C] text-white text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                {pkg.tag}
              </span>
            </div>

            {/* Package Information */}
            <div className="pt-3 px-1">
              <h4 className="text-base font-bold text-[#0F172A] leading-snug">{pkg.title}</h4>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {pkg.inclusions.map((item, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md mt-5 mb-5"
                  >
                    • {item}
                  </span>
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleSelect('Domestic')}
                className="w-full bg-[#0E1E45] hover:bg-[#071129] active:scale-[0.98] text-white text-xs font-bold py-3 rounded-xl tracking-wide transition-all shadow-xs"
              >
                Continue Send Query
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 5. FIXED BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 py-2.5 px-6 flex justify-between items-center z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex flex-col items-center gap-0.5 text-[#800A0A] cursor-pointer"
        >
          <Home size={18} className="stroke-[2.5]" />
          <span className="text-[10px] font-bold">Home</span>
        </button>
        <button
          onClick={() => navigate('/my-bookings')}
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <Briefcase size={18} />
          <span className="text-[10px] font-medium">Bookings</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <User size={18} />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
      <ToursAndPackagesFooter />
    </div>
  );
};
