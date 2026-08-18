import { SectionHeader } from './SectionHeader';

interface FareTypeSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedFareTypes: string[];
  onFareTypeChange: (value: string) => void;
  /**
   * Fare identifiers present in the current (unfiltered) result set. The list
   * is supplier-driven and open-ended — PUBLISHED, SME, ECO VALUE, PROMO,
   * SALE, SUPSAV and several NDC_* variants have all been seen on one route —
   * so it is never hardcoded.
   */
  availableFareTypes?: string[];
}

export const FareTypeSection = ({
  isOpen,
  onToggle,
  selectedFareTypes,
  onFareTypeChange,
  availableFareTypes = [],
}: FareTypeSectionProps) => {
  if (availableFareTypes.length === 0) return null;

  return (
    <div className="mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
      <SectionHeader
        title="Fare Type"
        isOpen={isOpen}
        onToggle={onToggle}
        count={selectedFareTypes.length}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M20.6 13.4 12 4.8V2H4v8l8.6 8.6a2 2 0 0 0 2.8 0l5.2-5.2a2 2 0 0 0 0-2.8Z"
              stroke="#3B82F6"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <circle cx="7.5" cy="6.5" r="1.3" fill="#3B82F6" />
          </svg>
        }
      />

      {isOpen && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {availableFareTypes.map((value) => {
            const isSelected = selectedFareTypes.includes(value);
            return (
              <button
                key={value}
                onClick={() => onFareTypeChange(value)}
                title={value}
                className={`max-w-full truncate rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-all duration-200 sm:text-xs ${
                  isSelected
                    ? 'bg-[#1A1F4D] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {value}
                {isSelected && <span className="ml-1 text-[10px]">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
