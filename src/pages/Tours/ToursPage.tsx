import React from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PackageFilters from '../../components/Packages/PackageFilters';
import PackageResultCard from '../../components/Packages/PackageResultCard';
import { Calendar, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';

const ToursPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = location.state || {};

  const [destination, setDestination] = useState(searchParams.destination || 'Andaman');
  const [departure, setDeparture] = useState(searchParams.departure || '02 Dec 25');
  const [pax, setPax] = useState(searchParams.pax || '2 Adults 0 child');
  const [filters, setFilters] = useState<any>({
    priceRange: [3000, 20000],
    nights: [1, 15],
    categories: [],
  });

  // Mock Data
  const allTours = [
    {
      id: '1',
      title: 'Amazing Andaman Tour',
      location: 'Included 3stars Hotels',
      duration: '3N/4D',
      stayDetails: '3N Port Blair',
      price: '11791',
      image: '/packages/package_2.png',
      stars: 3,
      priceVal: 11791,
    },
    {
      id: '2',
      title: 'Lakshadweep Getaway',
      location: 'Included 4stars Hotels',
      duration: '4N/5D',
      stayDetails: '4N Agatti',
      price: '15500',
      image: '/packages/package_2.png',
      stars: 4,
      priceVal: 15500,
    },
    {
      id: '3',
      title: 'Goa Beach Party',
      location: 'Included 3stars Hotels',
      duration: '2N/3D',
      stayDetails: '2N North Goa',
      price: '8500',
      image: '/packages/package_2.png',
      stars: 3,
      priceVal: 8500,
    },
    {
      id: '4',
      title: 'Kerala Backwaters',
      location: 'Included 5stars Hotels',
      duration: '5N/6D',
      stayDetails: '5N Alleppey',
      price: '22000',
      image: '/packages/package_2.png',
      stars: 5,
      priceVal: 22000,
    },
    {
      id: '5',
      title: 'Manali Snow Escape',
      location: 'Included 3stars Hotels',
      duration: '3N/4D',
      stayDetails: '3N Manali',
      price: '9500',
      image: '/packages/package_2.png',
      stars: 3,
      priceVal: 9500,
    },
    {
      id: '6',
      title: 'Shimla Summer Tour',
      location: 'Included 4stars Hotels',
      duration: '3N/4D',
      stayDetails: '3N Shimla',
      price: '12500',
      image: '/packages/package_2.png',
      stars: 4,
      priceVal: 12500,
    },
    {
      id: '7',
      title: 'Leh Ladakh Adventure',
      location: 'Included 3stars Hotels',
      duration: '6N/7D',
      stayDetails: '6N Leh',
      price: '28000',
      image: '/packages/package_2.png',
      stars: 3,
      priceVal: 28000,
    },
    {
      id: '8',
      title: 'Rajasthan Royal Tour',
      location: 'Included 4stars Hotels',
      duration: '4N/5D',
      stayDetails: '4N Jaipur',
      price: '18000',
      image: '/packages/package_2.png',
      stars: 4,
      priceVal: 18000,
    },
    {
      id: '9',
      title: 'Ooty Hills Escape',
      location: 'Included 3stars Hotels',
      duration: '2N/3D',
      stayDetails: '2N Ooty',
      price: '7500',
      image: '/packages/package_2.png',
      stars: 3,
      priceVal: 7500,
    },
  ];

  const filteredTours = allTours.filter((tour) => {
    const matchesCategory =
      filters.categories.length === 0 || filters.categories.includes(tour.stars.toString());
    const matchesPrice =
      tour.priceVal >= filters.priceRange[0] && tour.priceVal <= filters.priceRange[1];
    return matchesCategory && matchesPrice;
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="min-h-screen bg-gray-50 normal-case">
      {/* Blue Search Header */}
      <div className="bg-[#234977] h-[95px] flex items-center">
        <div className="max-w-[1280px] mx-auto w-full px-4">
          <div className="flex items-end gap-[63px] justify-center w-full">
            {/* Destination */}
            <div
              className="flex flex-col justify-end border-b border-white/50 px-[10px]"
              style={{ width: '272px', height: '57px' }}
            >
              <label className="block text-[10px] text-white/70 uppercase tracking-wider font-medium leading-none mb-1">
                Destination
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-transparent text-white pb-1 focus:outline-none placeholder-white/40 text-sm"
                placeholder="Destination"
              />
            </div>

            {/* Departure */}
            <div
              className="flex flex-col justify-end border-b border-white/50 px-[10px]"
              style={{ width: '229px', height: '57px' }}
            >
              <label className="block text-[10px] text-white/70 uppercase tracking-wider font-medium leading-none mb-1">
                Departure
              </label>
              <div className="flex items-center justify-between pb-1">
                <input
                  type="text"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="bg-transparent text-white text-sm focus:outline-none w-full"
                />
                <Calendar className="w-4 h-4 text-white shrink-0" />
              </div>
            </div>

            {/* Pax */}
            <div
              className="flex flex-col justify-end border-b border-white/50 px-[10px]"
              style={{ width: '236px', height: '57px' }}
            >
              <label className="block text-[10px] text-white/70 uppercase tracking-wider font-medium leading-none mb-1">
                Pax
              </label>
              <input
                type="text"
                value={pax}
                onChange={(e) => setPax(e.target.value)}
                className="bg-transparent text-white text-sm focus:outline-none w-full pb-1"
              />
            </div>

            {/* Search Button */}
            <div className="mb-[-2px]">
              <button className="bg-white text-[#234977] px-10 py-2.5 rounded-[10px] font-bold hover:bg-white/90 transition-colors h-[48px] flex items-center justify-center">
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-white py-6">
        <div className="pl-[29px]">
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <PackageFilters onFilterChange={handleFilterChange} filters={filters} />
          </div>

          <div className="col-span-9">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[#1A2B48] font-bold text-sm">
                Showing 17 Tours found in Andaman
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Sort By :</span>
                <select className="text-sm border-none bg-transparent font-medium focus:ring-0 cursor-pointer">
                  <option>Price (Low to High)</option>
                  <option>Price (High to Low)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {filteredTours.map((pkg, idx) => (
                <PackageResultCard
                  key={idx}
                  {...pkg}
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-end items-center mt-12 mb-8 pr-4">
              <div className="flex items-center gap-12 text-[14px] text-[#1A2B48] font-medium bg-white px-8 py-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="text-[#8995a1]">Items per page : </span>
                  <div className="border border-gray-200 rounded-[10px] px-6 py-2 bg-white min-w-[70px] text-center text-[#1A2B48] font-bold">
                    10
                  </div>
                </div>
                <span className="text-[#8995a1]">0 of 0</span>
                <div className="flex gap-6 items-center">
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
  );
};

export default ToursPage;
