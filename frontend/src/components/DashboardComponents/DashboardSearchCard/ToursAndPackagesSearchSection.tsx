import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ToursAndPackagesSearchSectionProps {
  onToursSearch?: (params: any) => void;
}

export default function ToursAndPackagesSearchSection({
  onToursSearch,
}: ToursAndPackagesSearchSectionProps) {
  const navigate = useNavigate();

  // Selected Type State ('Domestic' | 'International' | null)
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

    const searchParams = {
      destinationType: selectedType,
    };

    // Store parameters in session storage if needed across application views
    sessionStorage.setItem('toursSearchParams', JSON.stringify(searchParams));

    if (onToursSearch) {
      onToursSearch(searchParams);
    }

    navigate(`/tours-contact-form?destinationType=${encodeURIComponent(selectedType)}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 font-sans">
      {/* Outer Card Container */}
      <div className="w-full bg-[#FAF8F6] border border-[#E5D2B3] rounded-[28px] shadow-sm p-6 sm:p-10 md:p-12 text-center transition-all duration-200">
        
        {/* Title & Subtitle */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight">
          Where would you like to go?
        </h2>
        <p className="text-sm sm:text-base text-gray-500 mt-2 mb-8 sm:mb-10 font-normal">
          Select your destination type to explore the best packages
        </p>

        {/* Option Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto text-left">
          
          {/* Domestic Card Option */}
          <div
            onClick={() => handleSelect('Domestic')}
            className={`relative flex items-center gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200 border bg-white ${
              selectedType === 'Domestic'
                ? 'border-[#8B1D1D] ring-1 ring-[#8B1D1D] shadow-sm'
                : 'border-gray-200 hover:border-gray-300 shadow-xs'
            }`}
          >
            {/* Custom Radio Button Indicator */}
            <div className="absolute top-4 left-4 sm:top-5 sm:left-5">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedType === 'Domestic'
                    ? 'border-[#8B1D1D]'
                    : 'border-gray-300'
                }`}
              >
                {selectedType === 'Domestic' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#8B1D1D]" />
                )}
              </div>
            </div>

            {/* Icon Wrapper (Light Pink Background: #FEF2F2) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0 ml-7 sm:ml-8">
              <img
                src="/logo/tours_tajmahal_icon.png"
                alt="Domestic Travel"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Text Details */}
            <div className="flex flex-col justify-center">
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                Domestic
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-snug">
                Explore beautiful destinations across India
              </p>
            </div>
          </div>

          {/* International Card Option */}
          <div
            onClick={() => handleSelect('International')}
            className={`relative flex items-center gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl cursor-pointer transition-all duration-200 border bg-white ${
              selectedType === 'International'
                ? 'border-[#1E293B] ring-1 ring-[#1E293B] shadow-sm'
                : 'border-gray-200 hover:border-gray-300 shadow-xs'
            }`}
          >
            {/* Custom Radio Button Indicator (Navy Blue for International) */}
            <div className="absolute top-4 left-4 sm:top-5 sm:left-5">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedType === 'International'
                    ? 'border-[#1E293B]'
                    : 'border-gray-300'
                }`}
              >
                {selectedType === 'International' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1E293B]" />
                )}
              </div>
            </div>

            {/* Icon Wrapper (Light Blue Background: #EFF6FF) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0 ml-7 sm:ml-8">
              <img
                src="/logo/tours_global_icon.png"
                alt="International Travel"
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            {/* Text Details */}
            <div className="flex flex-col justify-center">
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                International
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-snug">
                Discover amazing places around the world
              </p>
            </div>
          </div>

        </div>

        {/* Inline Error Message (Non-popup) */}
        {error && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-red-600 text-sm font-medium animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 sm:mt-10 flex justify-center">
          <button
            onClick={handleSearch}
            className="bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white font-semibold flex items-center justify-center gap-2 px-8 sm:px-10 h-12 sm:h-13 rounded-xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-all duration-200 active:scale-[0.98] text-sm sm:text-base select-none cursor-pointer min-w-[200px]"
          >
            <Search className="w-4 h-4 text-white opacity-95" />
            <span>Continue Send Query</span>
          </button>
        </div>

      </div>
    </div>
  );
}