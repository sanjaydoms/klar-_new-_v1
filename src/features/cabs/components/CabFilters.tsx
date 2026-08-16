import React from 'react';

interface CabFiltersProps {
  activeFilter: any;
  onFilterChange: (filter: any) => void;
  totalCount: number;
}

export const CabFilters: React.FC<CabFiltersProps> = ({
  activeFilter,
  onFilterChange,
  totalCount,
}) => {
  return (
    <div className="cab-filters w-full md:w-64 bg-white p-4 border rounded shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Filters</h3>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => onFilterChange({})}
        >
          Reset All
        </button>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Vehicle Type</h4>
        {/* TODO: Implement filters: All / Sedan / SUV / Luxury */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" /> All Types
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> Sedan
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> SUV
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" /> Luxury
          </label>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Price Range</h4>
        {/* TODO: Implement max price slider */}
        <input type="range" className="w-full" min="0" max="10000" />
      </div>

      <div>
        <h4 className="font-semibold mb-2">Passenger Capacity</h4>
        {/* TODO: Implement passenger capacity filter */}
        <select className="w-full border rounded p-2">
          <option>Any</option>
          <option>1-3</option>
          <option>4-6</option>
          <option>7+</option>
        </select>
      </div>

      <div className="mt-4 text-sm text-gray-500">Showing {totalCount} results</div>
    </div>
  );
};
