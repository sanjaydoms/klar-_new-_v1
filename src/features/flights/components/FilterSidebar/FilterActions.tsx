import { Printer, RotateCcw, Sliders } from 'lucide-react';

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
    <div className="mb-4 border-b border-border pb-4">
      {/* Title row — Reset sits beside the heading in the results design. */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 shrink-0 text-primary" />
          <h2 className="text-lg font-semibold text-primary">Filters</h2>
        </div>
        <button
          onClick={onReset}
          disabled={isApplying}
          className="flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-primary disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isApplying ? 'Resetting...' : 'Reset All'}
        </button>
      </div>

      <div className="flex gap-2">
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

        {/* Apply Filters Button */}
        <button
          onClick={onApply}
          disabled={isApplying || !hasChanges}
          className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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