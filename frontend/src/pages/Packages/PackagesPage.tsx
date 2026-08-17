import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PackageFilters from '../../components/Packages/PackageFilters';
import PackageResultCard from '../../components/Packages/PackageResultCard';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';
import ToursSearchPageHeader from './ToursSearchPageHeader';

const PackagesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = location.state || {};

  const [destination, setDestination] = useState(searchParams.destination || 'Andaman');
  const [departure, setDeparture] = useState(searchParams.departure || '02 Dec 25');
  const [pax, setPax] = useState(searchParams.pax || '2 Adults 0 child');

  // Tab states for Explore by Collection bar
  const [activeCollection, setActiveCollection] = useState('All Collections');

  // Mobile responsive filter sidebar panel toggle state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [filters, setFilters] = useState<any>({
    priceRange: [3000, 100000],
    nights: [1, 15],
    categories: [],
  });

  const collections = [
    { id: 'All Collections', label: 'All Collections' },
    { id: 'Luxury Escapes', label: 'Luxury Escapes', icon: '👑' },
    { id: 'Adventure', label: 'Adventure', icon: '🏔️' },
    { id: 'Beach Holidays', label: 'Beach Holidays', icon: '🏖️' },
    { id: 'Cultural Trails', label: 'Cultural Trails', icon: '🕌' },
  ];

  const allPackages = [
    {
      id: '1',
      title: 'Maldives Paradise',
      duration: '6 Nights / 7 Days',
      price: '89,999',
      priceVal: 89999,
      image: '/images/tours_cards_image_1.jpg',
      stars: 5,
    },
    {
      id: '2',
      title: 'Swiss Adventure',
      duration: '6 Nights / 7 Days',
      price: '60,000',
      priceVal: 60000,
      image: '/images/tours_cards_image_2.jpg',
      stars: 4,
    },
    {
      id: '3',
      title: 'Northern Lights',
      duration: '6 Nights / 7 Days',
      price: '74,999',
      priceVal: 74999,
      image: '/images/tours_cards_image_3.jpg',
      stars: 5,
    },
    {
      id: '4',
      title: 'Japan Discovery',
      duration: '6 Nights / 7 Days',
      price: '50,000',
      priceVal: 50000,
      image: '/images/tours_cards_image_4.jpg',
      stars: 4,
    },
    {
      id: '5',
      title: 'Turkey Explorer',
      duration: '6 Nights / 7 Days',
      price: '35,000',
      priceVal: 35000,
      image: '/images/tours_cards_image_5.jpg',
      stars: 3,
    },
    {
      id: '6',
      title: 'Greece Getaway',
      duration: '6 Nights / 7 Days',
      price: '68,000',
      priceVal: 68000,
      image: '/images/tours_cards_image_6.jpg',
      stars: 4,
    },
    {
      id: '7',
      title: 'Swiss Adventure',
      duration: '6 Nights / 7 Days',
      price: '60,000',
      priceVal: 60000,
      image: '/images/tours_cards_image_7.jpg',
      stars: 4,
    },
    {
      id: '8',
      title: 'Northern Lights',
      duration: '6 Nights / 7 Days',
      price: '74,999',
      priceVal: 74999,
      image: '/images/tours_cards_image_8.jpg',
      stars: 4,
    },
    {
      id: '9',
      title: 'Turkey Explorer',
      duration: '6 Nights / 7 Days',
      price: '35,000',
      priceVal: 35000,
      image: '/images/tours_cards_image_9.jpg',
      stars: 4,
    },
  ];

  const filteredPackages = allPackages.filter((pkg) => {
    const matchesCategory =
      filters.categories.length === 0 || filters.categories.includes(pkg.stars.toString());
    const matchesPrice =
      pkg.priceVal >= filters.priceRange[0] && pkg.priceVal <= filters.priceRange[1];
    return matchesCategory && matchesPrice;
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-[#111111]">
      <ToursAndPackagesNavbar />
      <ToursSearchPageHeader />

      {/* Breadcrumbs */}
      <div className="bg-white py-4 md:py-6 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-[15px] text-sm h-[22px]">
            <ChevronLeft
              className="w-4 h-4 cursor-pointer text-black"
              onClick={() => navigate('/dashboard')}
            />
            <span
              className="cursor-pointer text-[#60a5fa] hover:text-blue-600 font-medium whitespace-nowrap"
              onClick={() => navigate('/dashboard')}
            >
              Home
            </span>
            <span className="text-black font-medium">›</span>
            <span className="font-medium text-black whitespace-nowrap">Tours & Packages</span>
          </div>
        </div>
      </div>

      {/* Hero Banner Section */}
      <section className="w-full font-sans relative">
        <div className="relative w-full h-[320px] sm:h-[460px] md:h-[600px] lg:h-[650px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url("/images/tours_banner_image.jpg")',
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-black/50 lg:from-black/50 lg:via-transparent lg:to-black/40"></div>
          </div>

          <div className="relative z-10 w-full h-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 flex items-center">
            <div className="w-full flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-0">
              <div className="max-w-2xl lg:max-w-xl text-white pt-4 lg:pt-0">
                <style>
                  {`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap');`}
                </style>
                <h1
                  className="text-2xl sm:text-4xl md:text-5xl lg:text-[4rem] leading-[1.2] lg:leading-[1.1] font-medium tracking-tight"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Experiences that <br />
                  stay with you.
                </h1>
                <p className="mt-3 lg:mt-5 text-sm sm:text-base md:text-xl text-white/90 font-light max-w-lg leading-relaxed">
                  Handpicked journeys crafted with care for unforgettable memories
                </p>
              </div>

              <div className="w-full sm:w-[320px] md:w-[380px] lg:w-[340px] xl:w-[380px] shrink-0">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-2xl">
                  <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-white/80 uppercase">
                    Not sure where to go ?
                  </h3>
                  <p className="mt-2 sm:mt-3 text-xs sm:text-base font-medium leading-relaxed text-gray-100">
                    Discover handpicked journeys crafted around unforgettable experiences.
                  </p>
                  <hr className="my-4 sm:my-5 border-white/30" />
                  <button
                    className="group flex items-center gap-2 text-white font-medium text-sm sm:text-base transition-colors hover:text-gray-200"
                  >
                    <span>Explore Journeys</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Explore by Collection Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-gray-200 pb-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <span className="text-[#111111] font-bold text-base whitespace-nowrap">
              Explore by Collection
            </span>

            {/* Horizontal scrolling tabs wrapper for better responsive handling */}
            <div className="flex flex-row items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none w-full max-w-full -mx-4 px-4 sm:mx-0 sm:px-0">
              {collections.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCollection(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold tracking-wide border transition-all whitespace-nowrap ${
                    activeCollection === tab.id
                      ? 'bg-[#1e2a4a] text-white border-[#1e2a4a]'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.icon && <span>{tab.icon}</span>}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action Grid Switcher Controls + Mobile Filter Toggle button */}
          <div className="flex items-center justify-between md:justify-end gap-3 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
            </button>

            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
              <button className="p-1.5 bg-gray-100 rounded text-[#111111]">
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-gray-400 hover:text-gray-600">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Responsive Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Desktop Filters Sidebar (Hidden on mobile/tablet) */}
          <div className="hidden lg:block lg:col-span-3 sticky top-6">
            <PackageFilters onFilterChange={handleFilterChange} filters={filters} />
          </div>

          {/* Mobile Filters Drawer Panel Bottom Sheet Overlay */}
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
              <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileFilterOpen(false)}
              />
              <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-slideLeft">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-bold text-gray-900 text-lg">Filters</h3>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <PackageFilters
                    onFilterChange={(newFilters: any) => {
                      handleFilterChange(newFilters);
                    }}
                    filters={filters}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Content Grid Block */}
          <div className="col-span-12 lg:col-span-9">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-3">
              <h2 className="text-gray-900 font-bold text-sm">
                Showing {filteredPackages.length} Properties
              </h2>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-sm text-gray-500">Sort By :</span>
                <select className="text-sm border-none bg-transparent font-medium focus:ring-0 cursor-pointer text-gray-900 p-0 pr-6">
                  <option>Price (Low to High)</option>
                  <option>Price (High to Low)</option>
                </select>
              </div>
            </div>

            {/* Layout Cards Mapping Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {filteredPackages.map((pkg) => (
                <PackageResultCard
                  key={pkg.id}
                  image={pkg.image}
                  title={pkg.title}
                  duration={pkg.duration}
                  price={pkg.price}
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                />
              ))}
            </div>

            {/* Pagination Controls Wrapper */}
            <div className="flex justify-center sm:justify-end items-center mt-12 mb-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-12 text-[14px] text-[#1A2B48] font-medium bg-white px-6 py-4 rounded-xl border border-gray-100 shadow-sm w-full sm:w-auto justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-[#8995a1]">Items per page:</span>
                  <div className="border border-gray-200 rounded-[10px] px-4 py-1.5 bg-white min-w-[60px] text-center text-[#1A2B48] font-bold">
                    10
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-6">
                  <span className="text-[#8995a1]">0 of 0</span>
                  <div className="flex gap-4 items-center">
                    <ChevronsLeft className="w-5 h-5 cursor-pointer text-[#8995a1] hover:text-[#0b4a8e] transition-colors" />
                    <ChevronLeft className="w-5 h-5 cursor-pointer text-[#8995a1] hover:text-[#0b4a8e] transition-colors" />
                    <ChevronRight className="w-5 h-5 cursor-pointer text-[#8995a1] hover:text-[#0b4a8e] transition-colors" />
                    <ChevronsRight className="w-5 h-5 cursor-pointer text-[#8995a1] hover:text-[#0b4a8e] transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackagesPage;
