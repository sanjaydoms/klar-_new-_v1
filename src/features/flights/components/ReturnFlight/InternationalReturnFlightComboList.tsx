import { Plane, Loader2 } from 'lucide-react';
import { PairedFlight } from '../../types/types.returnFlight';
import InternationalReturnFlightComboCard from './InternationalReturnFlightComboCard';

interface InternationalReturnFlightComboListProps {
  combos: PairedFlight[];
  selectedCombo: PairedFlight | null;
  onSelectCombo: (combo: PairedFlight) => void;
  onDeselectCombo: () => void;
  onOnwardFareRuleLoaded:
    | ((fareRuleData: any, flightType: string, fareId: string) => void)
    | undefined;
  onReturnFareRuleLoaded:
    | ((fareRuleData: any, flightType: string, fareId: string) => void)
    | undefined;
  isLoading?: boolean;
  isReturnFlightSearch?: boolean;
}

export default function InternationalReturnFlightComboList({
  combos,
  selectedCombo,
  onSelectCombo,
  onDeselectCombo,
  onOnwardFareRuleLoaded,
  onReturnFareRuleLoaded,
  isLoading = false,
  isReturnFlightSearch = false,
}: InternationalReturnFlightComboListProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-gray-500">Loading flight combinations...</p>
        </div>
      </div>
    );
  }

  if (!combos || combos.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <Plane className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No flight combinations found</p>
          <p className="text-xs text-gray-400 mt-1">Try different dates or destinations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {combos.map((combo, index) => (
          <InternationalReturnFlightComboCard
            key={`${combo.onward.flightId}-${combo.return.flightId}-${index}`}
            comboFlight={combo}
            isSelected={
              selectedCombo?.onward.flightId === combo.onward.flightId &&
              selectedCombo?.return.flightId === combo.return.flightId
            }
            onSelect={() => onSelectCombo(combo)}
            onDeselect={onDeselectCombo}
            onwardFareRuleLoaded={onOnwardFareRuleLoaded}
            returnFareRuleLoaded={onReturnFareRuleLoaded}
            isReturnFlightSearch={isReturnFlightSearch}
          />
        ))}
      </div>
    </div>
  );
}
