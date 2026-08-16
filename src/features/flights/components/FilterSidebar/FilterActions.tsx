import { Printer, Sliders } from 'lucide-react';

interface FilterActionsProps {
  isApplying: boolean;
  isPrinting: boolean;
  hasChanges: boolean;
  onReset: () => void;
  onApply: () => void;
  onPrint: () => void;
}

export const FilterActions = ({
  isApplying,
  isPrinting,
  hasChanges,
  onReset,
  onApply,
  onPrint,
}: FilterActionsProps) => {
  return (
    <div className="mb-3 sm:mb-4 border-b border-gray-200 pb-3 sm:pb-4">
      
      {/* Title row */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Sliders className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
          <h2 className="text-sm sm:text-lg font-semibold text-gray-900">Filters</h2>
        </div>
      </div>

      {/* All three buttons in one row */}
      <div className="flex gap-1.5 sm:gap-2">
        {/* Print Button */}
        {/* <button
          onClick={onPrint}
          disabled={isPrinting}
          className="px-2 py-1.5 sm:py-2 text-[10px] xs:text-xs sm:text-sm font-medium bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-1"
          style={{ minWidth: '40px' }}
        >
          {isPrinting ? (
            <>
              <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-white"></div>
              <span className="hidden xs:inline">Printing...</span>
            </>
          ) : (
            <>
              <Printer className="w-2.5 h-2.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline">Print</span>
            </>
          )}
        </button> */}

        {/* Reset All Button */}
        <button
          onClick={onReset}
          disabled={isApplying}
          className="flex-1 px-2 py-1.5 sm:py-2 text-[10px] xs:text-xs sm:text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? 'Resetting...' : 'Reset All'}
        </button>

        {/* Apply Filters Button */}
        <button
          onClick={onApply}
          disabled={isApplying || !hasChanges}
          className="flex-[2] px-2 py-1.5 sm:py-2 text-[10px] xs:text-xs sm:text-sm font-medium bg-[#1A1F4D] text-white rounded-md hover:bg-[#2A2F6D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? (
            <div className="flex items-center justify-center gap-1.5">
              <div className="animate-spin rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 border-b-2 border-white"></div>
              <span>Applying...</span>
            </div>
          ) : (
            'Apply Filters'
          )}
        </button>
      </div>
    </div>
  );
};