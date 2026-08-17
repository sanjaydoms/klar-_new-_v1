import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Filter,
  Car,
  IndianRupee,
  Clock,
  Info,
  ShieldCheck,
  Search,
  Loader2,
  Star,
  Users,
  Briefcase,
  Check,
} from 'lucide-react';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import CabResultCard from '@/features/cabs/components/CabResultCard';
import { getCabQuotes } from '@/api/cabs.api';
import { useAuth } from '@/features/authentication/hooks/useAuth';

export default function CabSearchResultsPage() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [cabs, setCabs] = useState<any[]>([]);
  const [filteredCabs, setFilteredCabs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState<any>(null);
  const [activePax, setActivePax] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recommended');
  const [priceMin, setPriceMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(50000);
  const [absPriceMin, setAbsPriceMin] = useState<number>(0);
  const [absPriceMax, setAbsPriceMax] = useState<number>(50000);
  
  // Dynamic filter options
  const [availablePax, setAvailablePax] = useState<number[]>([]);
  const [availableVehicleTypes, setAvailableVehicleTypes] = useState<string[]>([]);

  useEffect(() => {
    let result = cabs;

    if (activePax) {
      result = result.filter((c) => (c.seats || 4) >= parseInt(activePax));
    }

    if (activeFilter !== 'all') {
      result = result.filter((c) => c.vehicleType?.toLowerCase() === activeFilter.toLowerCase());
    }

    result = result.filter((c) => c.price >= priceMin && c.price <= priceMax);

    // Sort — 'recommended' keeps the supplier's returned order.
    result = [...result];
    if (sortBy === 'price_asc') result.sort((a, b) => (a.price || 0) - (b.price || 0));
    else if (sortBy === 'price_desc') result.sort((a, b) => (b.price || 0) - (a.price || 0));
    else if (sortBy === 'rating_desc') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortBy === 'capacity_desc') result.sort((a, b) => (b.seats || 0) - (a.seats || 0));

    setFilteredCabs(result);
  }, [cabs, activePax, activeFilter, priceMin, priceMax, sortBy]);


  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;

    const storedParams = sessionStorage.getItem('cabSearchParams');
    if (storedParams) {
      const parsed = JSON.parse(storedParams);
      setSearchParams(parsed);
      fetchQuotes(parsed);
      hasFetched.current = true;
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  // Bug 1.43 fix: update document title to reflect search context
  useEffect(() => {
    if (!searchParams) return;
    const from =
      typeof searchParams.from === 'string'
        ? searchParams.from.split(',')[0]
        : searchParams.from?.city || 'Origin';
    const to =
      typeof searchParams.to === 'string'
        ? searchParams.to.split(',')[0]
        : (searchParams.to as any)?.city || 'Destination';
    document.title = `Cabs from ${from} to ${to} | Klar`;
    return () => {
      document.title = 'Klar Travels';
    };
  }, [searchParams]);

  const fetchQuotes = async (params: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getCabQuotes(params);

      // TripJack v2 returns { success: true, data: { quotesInfo: [ { quotes: [...] } ] } }
      const quotesInfo = result?.data?.quotesInfo || [];
      const allQuotes: any[] = [];

      quotesInfo.forEach((category: any) => {
        const categoryQuotes = category.quotes || [];
        categoryQuotes.forEach((q: any) => {
          allQuotes.push({
            ...q,
            vehicleType: category.vehicleType,
            vehicleCategory: category.vehicleCategory,
            paxCapacity: category.paxCapacity,
            luggageCapacity: category.luggageCapacity,
            vehicleImages: category.vehicleImages,
            similarType: category.similarType,
            label: category.label,
          });
        });
      });

      const mappedCabs = allQuotes.map((q: any, index: number) => {
        const cabId = q.quotationId
          ? `${q.quotationId}-${q.quoteChildId || ''}-${index}`
          : `cab-${index}`;
        return {
          cabId,
          vehicleName:
            q.model || q.similarType || q.label || `${q.vehicleType} ${q.vehicleCategory}`,
          vehicleType: q.vehicleType || 'Sedan',
          vehicleCategory: q.vehicleCategory || 'Standard',
          provider: q.vendorName || `Partner ${q.vendorId || ''}`.trim() || 'Klar Partner',
          rating: q.vendorRating ?? q.rating ?? null,
          seats: q.paxCount || q.paxCapacity || 4,
          bags: q.luggageCount || q.luggageCapacity || 2,
          price: Number(q.fareBreakup?.totalFare || q.pricing?.totalAmount || q.totalAmount || 0),
          tax: Number(q.fareBreakup?.totalTax || q.pricing?.totalTax || 0),
          image: q.vehicleImages && q.vehicleImages.length > 0 ? q.vehicleImages[0] : '',
          features: q.policies?.inclusions || [],
          cancellationPolicy:
            q.policies?.cancellationPolicy?.[0]?.description || 'Cancellation policy applies',
          waitingTime: q.policies?.waitingTime || '',
          fuelType: q.fuelType || '',
          rawQuote: q,
        };
      });

      setCabs(mappedCabs);
      // setFilteredCabs(mappedCabs); // Now handled by useEffect

      // Extract dynamic filter values
      const prices = mappedCabs.map((c: any) => c.price);
      const minP = prices.length ? Math.floor(Math.min(...prices)) : 0;
      const maxP = prices.length ? Math.ceil(Math.max(...prices)) : 50000;
      setAbsPriceMin(minP);
      setAbsPriceMax(maxP);
      setPriceMin(minP);
      setPriceMax(maxP);

      const paxSet = new Set<number>();
      const vehicleTypeSet = new Set<string>();
      mappedCabs.forEach((c: any) => {
        if (c.seats) paxSet.add(Number(c.seats));
        if (c.vehicleType) vehicleTypeSet.add(c.vehicleType);
      });
      setAvailablePax(Array.from(paxSet).sort((a, b) => a - b));
      setAvailableVehicleTypes(Array.from(vehicleTypeSet).sort());
    } catch (err: any) {
      console.error('Failed to fetch cab quotes:', err);
      setError("We couldn't find any cabs for your selection. Please try another route or time.");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = (filter: string) => {
    setActiveFilter(filter);
  };
  
  const resetFilters = () => {
    setActiveFilter('all');
    setActivePax(null);
    setPriceMin(absPriceMin);
    setPriceMax(absPriceMax);
    // "Reset All" left the sort applied, so the list stayed reordered after a
    // reset that visually cleared every control.
    setSortBy('recommended');
  };

  const handleSelectCab = (cab: any) => {
    sessionStorage.setItem('selectedCab', JSON.stringify(cab));
    navigate('/cabs/review');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-16">
      <MainNavbar activeService="cabs" />

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 overflow-x-hidden">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
        navigate('/mobile-cab-review'); // Mobile: go to MobileCabReview page
    } else {
        navigate('/dashboard'); // Desktop: go to dashboard
    }
}}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-tight">Modify Search</span>
          </button>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-1 flex items-center gap-3">
                Cabs in{' '}
                {typeof searchParams?.to === 'string'
                  ? searchParams.to.split(',')[0]
                  : (searchParams?.to as any)?.city ||
                  (searchParams?.to as any)?.address?.city ||
                  'Destination'}
                <span className="text-sm font-bold px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                  {filteredCabs.length} Options Found
                </span>
              </h1>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {searchParams?.pickupDate || '—'} •{' '}
                {searchParams?.passengers || 1} Passenger
              </p>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none">
                  Safe Journey Promise
                </p>
                <p className="text-[11px] font-medium text-blue-700 leading-tight">
                  All cabs are sanitized professionally
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 overflow-x-hidden">
          {/* Filters Sidebar */}
          <button
            className="lg:hidden flex justify-center items-center gap-2 w-full p-3 bg-blue-600 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-blue-700 transition-colors"
            onClick={() => {
              const sidebar = document.getElementById('filter-sidebar');
              if (sidebar) {
                sidebar.classList.toggle('hidden');
                sidebar.classList.toggle('block');
              }
            }}
          >
            <Filter className="w-5 h-5 text-white" /> Filters
          </button>
          <aside
            id="filter-sidebar"
            className="hidden lg:block w-full lg:w-72 shrink-0 mt-0"
            onClick={(e) => {
              const sidebar = document.getElementById('filter-sidebar');
              if (sidebar && window.innerWidth < 1024) {
                sidebar.classList.add('hidden');
                sidebar.classList.remove('block');
              }
            }}
          >
            <div
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 top-24 mt-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filters
                </h2>
                <button
                  onClick={resetFilters}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                {/* PRICE RANGE SLIDER - UI ONLY */}
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Price
                  </h3>

                  <div className="relative px-1 py-2">
                    <div className="relative h-1 bg-gray-200 rounded-full">
                      {/* Selected Range Display */}
                      <div
                        className="absolute h-1 bg-blue-600 rounded-full"
                        style={{
                          left: `${absPriceMax > absPriceMin ? ((priceMin - absPriceMin) / (absPriceMax - absPriceMin)) * 100 : 0}%`,
                          right: `${absPriceMax > absPriceMin ? 100 - ((priceMax - absPriceMin) / (absPriceMax - absPriceMin)) * 100 : 0}%`,
                        }}
                      ></div>

                      {/* Min Handle */}
                      <input
                        type="range"
                        min={absPriceMin}
                        max={absPriceMax}
                        value={priceMin}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val < priceMax) {
                            setPriceMin(val);
                          }
                        }}
                        className="absolute top-1/2 -translate-y-1/2 w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                      />

                      {/* Max Handle */}
                      <input
                        type="range"
                        min={absPriceMin}
                        max={absPriceMax}
                        value={priceMax}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > priceMin) {
                            setPriceMax(val);
                          }
                        }}
                        className="absolute top-1/2 -translate-y-1/2 w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Price Display */}
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-bold text-gray-900">
                      ₹{priceMin.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-400">—</span>
                    <span className="text-sm font-bold text-gray-900">
                      ₹{priceMax.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="border-t border-gray-200 my-3"></div>
                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                    Pax
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {availablePax.map((pax) => (
                      <button
                        key={pax}
                        onClick={() => setActivePax(activePax === String(pax) ? null : String(pax))}
                        className={`py-1.5 px-0.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 text-center w-full ${activePax === String(pax)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                      >
                        {pax} Pax
                      </button>
                    ))}
                  </div>
                </div>
                {/* END PAX FILTER */}
                <div className="border-t border-gray-200 my-2"></div>

                <div>
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                    Vehicle Type
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableVehicleTypes.map((vt) => (
                      <button
                        key={vt}
                        onClick={() => applyFilter(activeFilter === vt ? 'all' : vt)}
                        className={`py-2.5 px-1 rounded-xl border text-[13px] font-semibold transition-all duration-200 text-center break-words leading-tight min-h-[44px] flex items-center justify-center ${activeFilter === vt
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                          }`}
                      >
                        {vt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-blue-500 shrink-0" />
                    <p className="text-[11px] font-medium text-gray-600 leading-relaxed">
                      Prices shown are inclusive of all taxes, toll, and state permits. No hidden
                      charges!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Results Section */}
          <main className="flex-1 min-w-0">
            {isLoading ? (
              <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
                <h2 className="text-xl font-black text-gray-900 mb-2">Fetching Best Deals...</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto font-medium">
                  We're polling our partners for the most affordable and comfortable cabs for your
                  route.
                </p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">No Cabs Available</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8 font-medium">{error}</p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all"
                >
                  Try Another Search
                </button>
              </div>
            ) : filteredCabs.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Filter className="w-10 h-10 text-blue-400" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">No Matching Cabs</h2>
                <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8 font-medium">
                  Try clearing your filters to see more vehicle options.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-blue-600 font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Sort bar (MMT-style) */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 overflow-x-auto">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest shrink-0">
                    Sort by
                  </span>
                  {[
                    { id: 'recommended', label: 'Recommended' },
                    { id: 'price_asc', label: 'Price: Low to High' },
                    { id: 'price_desc', label: 'Price: High to Low' },
                    { id: 'rating_desc', label: 'Rating' },
                    { id: 'capacity_desc', label: 'Capacity' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-semibold border transition-all duration-200 ${
                        sortBy === opt.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-100'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {filteredCabs.map((cab) => (
                  <CabResultCard key={cab.cabId} cab={cab} onSelect={handleSelectCab} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
