import { MapPin, Calendar, Users, Building2, Search } from 'lucide-react';

export default function ToursSearchPageHeader() {
  return (
    <div className="w-full bg-white py-6 px-4 md:px-8 font-sans">
      {/* Removed max-w-[1200px] constraint to allow full width on laptops */}
      <div className="w-full mx-auto">
        {/* Main Container with Border */}
        <div className="w-full border border-gray-300 rounded-xl p-3 md:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white flex flex-col lg:flex-row items-stretch lg:items-center gap-3 lg:gap-4">
          {/* --- Location --- */}
          <div className="flex-1 min-w-[140px] flex flex-col justify-center px-3 py-2 bg-white rounded-lg border border-gray-100 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <label className="text-[10px] uppercase font-bold text-gray-700 tracking-wider mb-0.5">
              Location
            </label>
            <div className="flex items-center gap-2 text-gray-800 w-full">
              <MapPin className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search destination"
                defaultValue="Goa"
                className="w-full bg-transparent text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none border-0 p-0"
              />
            </div>
          </div>

          {/* Vertical Divider (Hidden on small screens) */}
          <div className="hidden lg:block w-[1px] h-10 bg-gray-200 shrink-0"></div>

          {/* --- Check In Date --- */}
          <div className="flex-1 min-w-[140px] flex flex-col justify-center px-3 py-2 bg-white rounded-lg border border-gray-100 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <label className="text-[10px] uppercase font-bold text-gray-700 tracking-wider mb-0.5">
              Check In Date
            </label>
            <div className="flex items-center gap-2 text-gray-800 w-full">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="date"
                defaultValue="2026-05-08"
                className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none border-0 p-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50"
              />
            </div>
          </div>

          {/* Vertical Divider (Hidden on small screens) */}
          <div className="hidden lg:block w-[1px] h-10 bg-gray-200 shrink-0"></div>

          {/* --- Check Out Date --- */}
          <div className="flex-1 min-w-[140px] flex flex-col justify-center px-3 py-2 bg-white rounded-lg border border-gray-100 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <label className="text-[10px] uppercase font-bold text-gray-700 tracking-wider mb-0.5">
              Check Out Date
            </label>
            <div className="flex items-center gap-2 text-gray-800 w-full">
              <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="date"
                defaultValue="2026-05-10"
                className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none border-0 p-0 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-50"
              />
            </div>
          </div>

          {/* Vertical Divider (Hidden on small screens) */}
          <div className="hidden lg:block w-[1px] h-10 bg-gray-200 shrink-0"></div>

          {/* --- No of Guests --- */}
          <div className="flex-1 min-w-[140px] flex flex-col justify-center px-3 py-2 bg-white rounded-lg border border-gray-100 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <label className="text-[10px] uppercase font-bold text-gray-700 tracking-wider mb-0.5">
              No of Guests
            </label>
            <div className="flex items-center gap-2 text-gray-800 w-full">
              <Users className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="number"
                min="1"
                defaultValue="1"
                className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none border-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm font-medium text-gray-800 ml-[-4px]">Adult</span>
            </div>
          </div>

          {/* Vertical Divider (Hidden on small screens) */}
          <div className="hidden lg:block w-[1px] h-10 bg-gray-200 shrink-0"></div>

          {/* --- Stay Type --- */}
          <div className="flex-1 min-w-[140px] flex flex-col justify-center px-3 py-2 bg-white rounded-lg border border-gray-100 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
            <label className="text-[10px] uppercase font-bold text-gray-700 tracking-wider mb-0.5">
              Stay Type
            </label>
            <div className="flex items-center gap-2 text-gray-800 w-full">
              <Building2 className="w-4 h-4 text-gray-500 shrink-0" />
              <select
                defaultValue="Hotels"
                className="w-full bg-transparent text-sm font-medium text-gray-800 focus:outline-none border-0 p-0 cursor-pointer appearance-none"
              >
                <option value="Hotels">Hotels</option>
                <option value="Villas">Villas</option>
                <option value="Resorts">Resorts</option>
                <option value="Apartments">Apartments</option>
              </select>
            </div>
          </div>

          {/* --- Search Button --- */}
          <div className="flex-1 lg:flex-none w-full lg:w-auto shrink-0">
            <button className="w-full lg:w-auto flex items-center justify-center gap-2 bg-[#F7D16B] hover:bg-[#E5C05A] text-gray-900 font-semibold text-sm px-8 py-3.5 rounded-lg shadow-sm transition-colors duration-200 whitespace-nowrap">
              <Search className="w-4 h-4" />
              Search Properties
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
