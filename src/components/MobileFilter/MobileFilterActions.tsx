import { Printer, Sliders, Filter } from 'lucide-react';

interface MobileFilterActionsProps {
  isApplying: boolean;
  isPrinting: boolean;
  hasChanges: boolean;
  onReset: () => void;
  onApply: () => void;
  onPrint: () => void;
}

export const MobileFilterActions = ({
  isApplying,
  isPrinting,
  hasChanges,
  onReset,
  onApply,
  onPrint,
}: MobileFilterActionsProps) => {
  return (
    <div className="mb-4 pb-4 border-b border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">Filter Options</span>
        </div>
        <button
          onClick={onPrint}
          disabled={isPrinting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPrinting ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>Printing...</span>
            </>
          ) : (
            <>
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};