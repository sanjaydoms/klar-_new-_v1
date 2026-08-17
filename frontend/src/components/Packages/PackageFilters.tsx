import { Search } from 'lucide-react';

interface PackageFiltersProps {
  onFilterChange: (filters: any) => void;
  filters?: any;
}

const PackageFilters = ({ onFilterChange, filters }: PackageFiltersProps) => {
  return (
    <div className="flex flex-col gap-[15px] w-full max-w-[280px] animate-fadeIn">
      {/* Show Offer Price Card */}
      <div
        className="bg-white rounded-[10px] p-[15px] flex items-center gap-[10px]"
        style={{ boxShadow: '0px 0px 8px 0px rgba(0, 0, 0, 0.15)' }}
      >
        <label className="flex items-center gap-[10px] cursor-pointer w-full">
          <input
            type="checkbox"
            className="w-[18px] h-[18px] border-[1.5px] border-[#1A2B48] rounded-[2px]"
            checked={filters?.showOfferPrice}
            onChange={(e) => onFilterChange({ showOfferPrice: e.target.checked })}
          />
          <span className="text-[#1A2B48] font-medium text-[16px]">Show Offer Price</span>
        </label>
      </div>

      {/* Main Filters Container */}
      <div
        className="bg-white rounded-[7.5px] p-[18px] flex flex-col gap-[20px]"
        style={{ boxShadow: '0px 0px 8px 0px rgba(0, 0, 0, 0.15)' }}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-[#1A2B48] text-[16px]">Filters</h3>
          <button
            className="text-[13px] text-[#234977] font-medium hover:underline"
            onClick={() =>
              onFilterChange({ categories: [], priceRange: [3000, 20000], nights: [1, 15] })
            }
          >
            Clear All
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-[15px] top-1/2 transform -translate-y-1/2 text-[#1A2B48] w-[18px] h-[18px]" />
          <input
            type="text"
            placeholder="location / hotel name"
            className="w-full pl-[45px] pr-[15px] py-[12px] bg-white border border-[#D9D9D9] rounded-[7.5px] text-[14px] outline-none focus:border-[#234977] transition-all"
          />
        </div>

        <div className="h-[1px] bg-[#E5E7EB] w-full" />

        {/* Popular Section */}
        <div>
          <h3 className="font-bold text-[#1A2B48] mb-[15px] text-[18px]">Popular</h3>
          <div className="space-y-[12px]">
            {[
              { label: 'Price Low To High', count: 1 },
              { label: 'Price High To Low', count: 4 },
              { label: 'Nights Low To High', count: 10 },
              { label: 'Nights High To Low', count: 2 },
            ].map((item, idx) => (
              <label key={idx} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-[12px]">
                  <input
                    type="checkbox"
                    className="w-[18px] h-[18px] border-[1.5px] border-[#1A2B48]/30 rounded-[2px]"
                  />
                  <span className="text-[14px] text-[#1A2B48] font-medium">{item.label}</span>
                </div>
                <span className="text-[14px] text-[#1A2B48] font-medium">({item.count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Meal Type Section */}
        {/* <div>
          <h3 className="font-bold text-[#1A2B48] mb-[15px] text-[18px]">Meal Type</h3>
          <div className="space-y-[12px]">
            {[
              { label: 'Room Only', count: 1 },
              { label: 'Bed and Breakfast', count: 4 },
              { label: 'Half Board', count: 10 },
              { label: 'Full Board', count: 2 },
              { label: 'All Inclusive', count: 4 },
            ].map((item, idx) => (
              <label key={idx} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-[12px]">
                  <input
                    type="checkbox"
                    className="w-[18px] h-[18px] border-[1.5px] border-[#1A2B48]/30 rounded-[2px]"
                  />
                  <span className="text-[14px] text-[#1A2B48] font-medium">{item.label}</span>
                </div>
                <span className="text-[14px] text-[#1A2B48] font-medium">({item.count})</span>
              </label>
            ))}
          </div>
        </div> */}

        {/* Price Range Slider */}
        <div>
          <div className="flex justify-between items-center mb-[15px]">
            <h3 className="font-bold text-[#1A2B48] text-[16px]">Price Range</h3>
            <button
              className="text-[11px] text-black font-bold uppercase hover:underline"
              onClick={() => onFilterChange({ priceRange: [3000, 20000] })}
            >
              Reset
            </button>
          </div>
          <div className="px-2">
            <input
              type="range"
              min="3000"
              max="30000"
              value={filters?.priceRange?.[1] || 20000}
              onChange={(e) =>
                onFilterChange({
                  priceRange: [filters?.priceRange?.[0] || 3000, parseInt(e.target.value)],
                })
              }
              className="w-full h-1 bg-black appearance-none cursor-pointer accent-black"
            />
          </div>
          <div className="flex justify-between mt-[10px]">
            <span className="text-[11px] text-[#1A2B48] font-medium">
              INR {filters?.priceRange?.[0] || 3433}
            </span>
            <span className="text-[11px] text-[#1A2B48] font-medium">
              INR {filters?.priceRange?.[1] || 10400}
            </span>
          </div>
        </div>

        {/* Nights Slider */}
        <div>
          <div className="flex justify-between items-center mb-[15px]">
            <h3 className="font-bold text-[#1A2B48] text-[16px]">Nights</h3>
            <button
              className="text-[11px] text-black font-bold uppercase hover:underline"
              onClick={() => onFilterChange({ nights: [1, 15] })}
            >
              Reset
            </button>
          </div>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="15"
              value={filters?.nights?.[1] || 15}
              onChange={(e) =>
                onFilterChange({ nights: [filters?.nights?.[0] || 1, parseInt(e.target.value)] })
              }
              className="w-full h-1 bg-black appearance-none cursor-pointer accent-black"
            />
          </div>
          <div className="flex justify-between mt-[10px]">
            <span className="text-[11px] text-[#1A2B48] font-medium">
              {filters?.nights?.[0] || 1} Night
            </span>
            <span className="text-[11px] text-[#1A2B48] font-medium">
              {filters?.nights?.[1] || 15} Nights
            </span>
          </div>
        </div>

        {/* Hotel Category */}
        <div>
          <h3 className="font-bold text-[#1A2B48] mb-[15px] text-[18px]">Hotel Category</h3>
          <div className="space-y-[12px]">
            {[
              { label: 'All', count: 17, value: 'all' },
              { label: '3', stars: true, count: 17, value: '3' },
              { label: '4', stars: true, count: 17, value: '4' },
              { label: '5', stars: true, count: 17, value: '5' },
            ].map((item, idx) => (
              <label key={idx} className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-[12px]">
                  <input
                    type="checkbox"
                    className="w-[18px] h-[18px] border-[1.5px] border-[#1A2B48]/30 rounded-[2px]"
                    checked={
                      item.value === 'all'
                        ? (filters?.categories?.length || 0) === 0
                        : filters?.categories?.includes(item.value)
                    }
                    onChange={(e) => {
                      const currentCats = filters?.categories || [];
                      if (item.value === 'all') {
                        onFilterChange({ categories: [] });
                      } else {
                        const newCats = e.target.checked
                          ? [...currentCats, item.value]
                          : currentCats.filter((c: string) => c !== item.value);
                        onFilterChange({ categories: newCats });
                      }
                    }}
                  />
                  <span className="text-[14px] text-[#1A2B48] font-medium flex items-center gap-1">
                    {item.label} {item.stars && <span className="text-black text-xs">☆</span>}
                  </span>
                </div>
                <span className="text-[14px] text-[#1A2B48] font-medium">({item.count})</span>
              </label>
            ))}
          </div>
          <button className="mt-[20px] text-[14px] text-[#60a5fa] font-medium hover:underline">
            Show 5 More
          </button>
        </div>

        {/* Scroll to Top Button */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-full mt-[10px] py-[15px] border-[1.5px] border-[#234977]/30 rounded-[10px] text-[#234977] text-[16px] font-bold flex items-center justify-center gap-[10px] hover:bg-[#234977]/5 transition-all"
          style={{ color: '#5476a0', borderColor: '#5476a0' }}
        >
          SCROLL TO TOP
          <span className="text-[20px] mb-1">↑</span>
        </button>
      </div>
    </div>
  );
};

export default PackageFilters;
