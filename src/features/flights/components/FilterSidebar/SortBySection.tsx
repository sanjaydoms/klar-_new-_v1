import { SectionHeader } from './SectionHeader';

interface SortBySectionProps {
  isOpen: boolean;
  onToggle: () => void;
  primarySort: string;
  secondarySort: string;
  onSortSelect: (sortKey: string) => void;
  onSecondarySortSelect: (value: string) => void;
}

export const SortBySection = ({
  isOpen,
  onToggle,
  primarySort,
  secondarySort,
  onSortSelect,
  onSecondarySortSelect,
}: SortBySectionProps) => {
  const sortOptions = [
    { key: 'PRICE', label: 'Price' },
    { key: 'STOPS_MINIMUM', label: 'Stops' },
    { key: 'DURATION_MINIMUM', label: 'Duration' },
    { key: 'ARRIVAL_EARLIEST', label: 'Arrival' },
    { key: 'DEPARTURE_EARLIEST', label: 'Departure' },
    { key: 'AIRLINE', label: 'Airline' },
  ];

  return (
    <div className="mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
      <SectionHeader title="Sort By" isOpen={isOpen} onToggle={onToggle} />

      {isOpen && (
        <div className="space-y-3 w-full">
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5 sm:gap-2 w-full">
            {sortOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onSortSelect(option.key)}
                className={`px-1.5 py-1.5 sm:px-3 sm:py-2 text-[9px] xs:text-[10px] sm:text-sm font-medium rounded-md transition-colors truncate min-w-0 ${
                  primarySort === option.key
                    ? 'bg-[#1A1F4D] text-white hover:bg-[#2A2F6D]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label} {primarySort === option.key && '✓'}
              </button>
            ))}
          </div>

          {primarySort === 'PRICE' && (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
                {['LOW_TO_HIGH', 'HIGH_TO_LOW'].map((value) => (
                  <button
                    key={value}
                    onClick={() => onSecondarySortSelect(value)}
                    className={`flex-1 min-w-[60px] px-1.5 py-1 sm:px-4 sm:py-1.5 text-[9px] xs:text-[10px] sm:text-xs font-medium rounded-md transition-colors ${
                      secondarySort === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="truncate block">
                      {value === 'LOW_TO_HIGH' ? 'Low→High' : 'High→Low'}
                      {secondarySort === value && '✓'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {primarySort === 'AIRLINE' && (
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-1.5 sm:gap-2 w-full">
                {['A_TO_Z', 'Z_TO_A'].map((value) => (
                  <button
                    key={value}
                    onClick={() => onSecondarySortSelect(value)}
                    className={`flex-1 min-w-[60px] px-1.5 py-1 sm:px-4 sm:py-1.5 text-[9px] xs:text-[10px] sm:text-xs font-medium rounded-md transition-colors ${
                      secondarySort === value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="truncate block">
                      {value === 'A_TO_Z' ? 'A→Z' : 'Z→A'}
                      {secondarySort === value && '✓'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
