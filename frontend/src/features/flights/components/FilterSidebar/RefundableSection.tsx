import { SectionHeader } from './SectionHeader';

interface RefundableSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedRefundable: string[];
  onRefundableChange: (value: string) => void;
  /**
   * Labels present in the current (unfiltered) result set. Only these are
   * offered — showing an option no fare carries gives the customer a filter
   * that can only ever return nothing.
   */
  availableRefundable?: string[];
}

/**
 * Refundability, straight from the supplier's normalised label.
 *
 * "Unknown" is deliberately selectable rather than folded into
 * "Non-Refundable": the supplier omitted the flag, and telling a customer a
 * fare is non-refundable when nobody said so is the more expensive mistake.
 */
export const RefundableSection = ({
  isOpen,
  onToggle,
  selectedRefundable,
  onRefundableChange,
  availableRefundable = [],
}: RefundableSectionProps) => {
  const dotFor = (value: string) =>
    value === 'Refundable' ? '#10B981' : value === 'Non-Refundable' ? '#EF4444' : '#9CA3AF';

  if (availableRefundable.length === 0) return null;

  return (
    <div className="mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
      <SectionHeader
        title="Refundable"
        isOpen={isOpen}
        onToggle={onToggle}
        count={selectedRefundable.length}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      {isOpen && (
        <div className="flex flex-col gap-1.5 sm:gap-2">
          {availableRefundable.map((value) => {
            const isSelected = selectedRefundable.includes(value);
            return (
              <button
                key={value}
                onClick={() => onRefundableChange(value)}
                className={`flex items-center justify-between rounded-md px-2.5 py-2 text-[11px] font-medium transition-all duration-200 sm:text-sm ${
                  isSelected
                    ? 'bg-[#1A1F4D] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: dotFor(value) }}
                  />
                  <span className="truncate">{value}</span>
                </span>
                {isSelected && <span className="text-[10px] sm:text-xs">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
