import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plane,
  Hotel,
  Package,
  Car,
  Shield,
  MapPin,
  Calendar,
  ChevronDown,
  Clock,
  CalendarDays,
  Briefcase,
  Users,
  GraduationCap,
} from 'lucide-react';
import VisaFooter from '../VisaFooter/VisaFooter';

// ─── SEARCH COMPONENT (Always Visible) ─────────────────────────────────────

interface SearchComponentProps {
  onSearch?: (data: SearchData) => void;
  className?: string;
}

interface SearchData {
  destination: string;
  visaType: string;
  travelDate: string;
  returnDate: string;
}

const SearchComponent: React.FC<SearchComponentProps> = ({ 
  onSearch,
  className = ""
}) => {
  const navigate = useNavigate();
  const [showVisaDropdown, setShowVisaDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchData, setSearchData] = useState<SearchData>({
    destination: '',
    visaType: 'Tourist Visa',
    travelDate: '',
    returnDate: '',
  });

  const visaOptions = ['Tourist Visa', 'Business Visa', 'Student Visa', 'Work Visa', 'Family Visa'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVisaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    console.log('🔍 Search data:', searchData);
    if (onSearch) {
      onSearch(searchData);
    }
    
    sessionStorage.setItem('searchData', JSON.stringify(searchData));
    
    navigate('/visa/form', {
      state: {
        visaType: searchData.visaType || 'Tourist Visa',
        destinationCountry: searchData.destination || '',
        searchData: searchData,
      },
    });
  };

  const handleVisaSelect = (type: string) => {
    setSearchData(prev => ({ ...prev, visaType: type }));
    setShowVisaDropdown(false);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-4 md:p-6 sm:hidden ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* DESTINATION */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            DESTINATION
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchData.destination}
              onChange={(e) => setSearchData(prev => ({ ...prev, destination: e.target.value }))}
              placeholder="Where are you going?"
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B]"
            />
          </div>
        </div>

        {/* VISA TYPE */}
        <div ref={dropdownRef}>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            VISA TYPE
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowVisaDropdown(!showVisaDropdown)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B]"
            >
              <span className="text-gray-800">
                {searchData.visaType}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showVisaDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showVisaDropdown && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {visaOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleVisaSelect(option)}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TRAVEL DATE */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            TRAVEL DATE
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={searchData.travelDate}
              onChange={(e) => setSearchData(prev => ({ ...prev, travelDate: e.target.value }))}
              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B]"
            />
          </div>
        </div>

        {/* RETURN DATE + BUTTON */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            RETURN DATE
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={searchData.returnDate}
                onChange={(e) => setSearchData(prev => ({ ...prev, returnDate: e.target.value }))}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B]"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#1F2A6B] hover:bg-[#162055] text-white font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap text-sm"
            >
              Search Visa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── POPULAR DESTINATIONS ────────────────────────────────────────────────────

const popularDestinations = [
  {
    id: 'usa',
    country: 'USA',
    image: 'https://wallpapercave.com/wp/wp3228275.jpg',
    processingTime: '7-15 Days',
    types: ['Tourist', 'Business'],
    visaType: 'Tourist Visa',
  },
  {
    id: 'uk',
    country: 'UNITED KINGDOM',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=250&fit=crop',
    processingTime: '7-15 Days',
    types: ['Tourist', 'Business'],
    visaType: 'Tourist Visa',
  },
  {
    id: 'canada',
    country: 'CANADA',
    image: 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=400&h=250&fit=crop',
    processingTime: '7-15 Days',
    types: ['Tourist', 'Business'],
    visaType: 'Tourist Visa',
  },
  {
    id: 'australia',
    country: 'AUSTRALIA',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=400&h=250&fit=crop',
    processingTime: '7-15 Days',
    types: ['Tourist', 'Business'],
    visaType: 'Tourist Visa',
  },
];

// ─── VISA CATEGORIES DATA ───────────────────────────────────────────────────

const visaCategoriesTop = [
  {
    id: 'tourist',
    title: 'Tourist Visa',
    subtitle: 'Leisure & Holidays',
    icon: Users,
    visaType: 'Tourist Visa',
  },
  {
    id: 'business',
    title: 'Business Visa',
    subtitle: 'Business & Events',
    icon: Briefcase,
    visaType: 'Business Visa',
  },
  {
    id: 'student',
    title: 'Student Visa',
    subtitle: 'Study Abroad',
    icon: GraduationCap,
    visaType: 'Student Visa',
  },
  {
    id: 'work',
    title: 'Work Visa',
    subtitle: 'Employment',
    icon: Briefcase,
    visaType: 'Work Visa',
  },
];

const visaCategoriesBottom = [
  {
    id: 'transit',
    title: 'Transit Visa',
    subtitle: 'Layover Travel',
    icon: Plane,
    visaType: 'Transit Visa',
  },
  {
    id: 'family',
    title: 'Family Visa',
    subtitle: 'Family Visit',
    icon: Users,
    visaType: 'Family/Group',
  },
  {
    id: 'longterm',
    title: 'Long-term Visa',
    subtitle: 'Extended Stay',
    icon: Calendar,
    visaType: 'Long-term Visa',
  },
];

// ─── MAIN VISA CONTENT ─────────────────────────────────────────────────────

export default function VisaContent(): React.ReactElement {
  const navigate = useNavigate();

  const handleApplyNow = (visaType: string, country: string) => {
    console.log('🔑 Applying for:', visaType, 'to', country);
    navigate('/visa/form', {
      state: {
        visaType: visaType,
        destinationCountry: country,
      },
    });
  };

  const handleCategoryClick = (visaType: string, title: string) => {
    console.log('🔑 Category clicked:', title, '→', visaType);
    navigate('/visa/form', {
      state: {
        visaType: visaType,
      },
    });
  };

  const handlePlanMyJourney = () => {
    console.log('🔑 Plan My Journey clicked');
    navigate('/visa/form', {
      state: {
        visaType: 'Tourist Visa',
      },
    });
  };

  return (
    /* Outer full-width container */
    <div className="w-full bg-gray-50 min-h-screen flex flex-col justify-between">
      
      {/* Inner centered container for main page content */}
      <div className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        
        <SearchComponent />
        
        {/* ─── HERO SECTION ─── */} 
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            <span className="text-[#1F2A6B]">VISA</span>
          </h1>
          <div className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Extraordinary Journeys, <span className="text-[#1F2A6B]">Unforgettable Journeys.</span>
          </div>
          <p className="text-gray-500 text-sm md:text-base max-w-2xl mx-auto">
            Your journey starts with the <span className="font-semibold text-[#1F2A6B]">Right Visa</span>
          </p>
          <div className="mt-4 inline-block bg-[#1F2A6B]/10 text-[#1F2A6B] px-6 py-2 rounded-full text-sm font-semibold">
            VISAS AVAILABLE FOR ANY COUNTRY
          </div>
        </div>

        {/* ─── POPULAR VISA DESTINATIONS ─── */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-8 text-[#1a2355]">
            <span className="text-yellow-500 text-lg">✨</span>
            <h2 className="text-lg md:text-xl font-bold tracking-wider uppercase text-center">
              POPULAR VISA DESTINATIONS
            </h2>
            <span className="text-yellow-500 text-lg">✨</span>
          </div>
          
          {/* 2-column grid for tablet, laptop, and desktop views */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {popularDestinations.map((dest) => (
              <div
                key={dest.id}
                style={{
                  background: 'linear-gradient(90deg, #1F262E 0%, rgba(30, 58, 138, 0.96) 100%)',
                }}
                className="text-white rounded-2xl overflow-hidden shadow-lg border border-gray-800 flex flex-col justify-between hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image Section */}
                <div className="h-52 w-full bg-gray-800 overflow-hidden">
                  <img
                    src={dest.image}
                    alt={dest.country}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                
                {/* Content Section - Strict Left Alignment */}
                <div className="p-6 flex-1 flex flex-col justify-between text-left">
                  <div>
                    <h3 className="font-bold text-xl mb-4 uppercase text-white tracking-wide text-left">
                      {dest.country}
                    </h3>
                    
                    <div className="space-y-2.5 text-xs text-gray-300 mb-6 text-left">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="text-gray-300">Processing Time</span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <CalendarDays className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="font-semibold text-white">{dest.processingTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-yellow-500 shrink-0" />
                        <span className="font-medium text-gray-300">{dest.types.join(' - ')}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <button
                    onClick={() => handleApplyNow(dest.visaType, dest.country)}
                    className="w-full bg-[#e5b842] hover:bg-[#d4a731] text-[#1a2355] text-xs font-bold py-3 rounded-xl transition-colors duration-200 uppercase tracking-wider"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── VISA CATEGORIES ─── */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2 text-[#1F2A6B]">
              <span className="text-yellow-500 text-sm">✨</span>
              <span className="text-xs font-bold tracking-widest uppercase">
                VISA CATEGORIES
              </span>
              <span className="text-yellow-500 text-sm">✨</span>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 font-serif">
              Visa by Category
            </h2>
            <p className="text-sm text-gray-500">
              Find the right visa for your travel purpose
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto space-y-4">
            {/* Top Row: 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {visaCategoriesTop.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategoryClick(category.visaType, category.title)}
                    className="group bg-white border border-gray-200 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 hover:bg-[#1a2355] hover:border-[#1a2355] hover:shadow-xl flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <Icon className="w-6 h-6 text-yellow-500 group-hover:text-white transition-colors duration-300 mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-white transition-colors duration-300">
                      {category.title}
                    </h3>
                    <p className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 mt-1">
                      {category.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: 3 Cards Centered */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {visaCategoriesBottom.map((category) => {
                const Icon = category.icon;
                return (
                  <div
                    key={category.id}
                    onClick={() => handleCategoryClick(category.visaType, category.title)}
                    className="group bg-white border border-gray-200 rounded-xl p-6 text-center cursor-pointer transition-all duration-300 hover:bg-[#1a2355] hover:border-[#1a2355] hover:shadow-xl flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <Icon className="w-6 h-6 text-yellow-500 group-hover:text-white transition-colors duration-300 mb-3" />
                    <h3 className="font-bold text-gray-900 text-sm group-hover:text-white transition-colors duration-300">
                      {category.title}
                    </h3>
                    <p className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 mt-1">
                      {category.subtitle}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── PLAN MY JOURNEY ─── */}
        <div className="bg-gradient-to-r from-[#1F2A6B] to-[#2A3B8A] rounded-2xl p-8 text-center text-white mb-12">
          <h3 className="text-xl font-bold mb-2">Not sure where to go?</h3>
          <p className="text-white/80 text-sm mb-6">
            Let our travel experts curate the perfect destination based on your preferences.
          </p>
          <button
            onClick={handlePlanMyJourney}
            className="bg-white text-[#1F2A6B] hover:bg-gray-100 font-semibold px-8 py-2.5 rounded-lg transition-colors duration-200 inline-flex items-center gap-2"
          >
            Plan My Journey
            <span>→</span>
          </button>
        </div>

      </div>

      <VisaFooter />

    </div>
  );
}