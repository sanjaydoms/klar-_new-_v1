import { Sliders } from 'lucide-react';

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
    // The mobile results design puts the filter row on one line: the heading
    // on the left, Apply on the right. Print lived here and did not.
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-primary">Filters</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={isApplying}
          className="text-xs font-medium text-gray-500 transition-colors hover:text-primary disabled:opacity-50"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          disabled={isApplying || !hasChanges}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isApplying ? 'Applying...' : 'Apply Filters'}
        </button>
      </div>
    </div>
  );
};