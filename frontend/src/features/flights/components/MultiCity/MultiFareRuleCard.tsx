// MultiFareRuleCard.tsx – multi-city domestic fare rules on the shared
// "Fare Rules & Policies" design. The parent (MultiFareDetailsCard) feeds a
// transformed rule payload (structuredRules/timeWindows with `fcs`); this maps
// it back onto the TripJack tfr shape the shared panel renders.
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
  type FareRulePolicyRule,
  type FareSummaryInfo,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface MultiFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  fareType: string;
  totalFare?: number;
  currency?: string;
  onSelect: () => void;
  onCancel: () => void;
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  selectedFareId?: string;
}

/** Transformed timeWindow ({st, et, amount, additionalFee, policyInfo, fcs}) -> tfr rule. */
const restoreRule = (item: any): FareRulePolicyRule => ({
  st: item?.st,
  et: item?.et,
  amount: item?.amount,
  additionalFee: item?.additionalFee,
  policyInfo: item?.policyInfo,
  // `fcs` is the flattened FareComponentsSummary — restore it so the shared
  // cards can surface the airline/platform fee taxes.
  FareComponentsSummary: item?.fcs,
});

/** Inverse of refundableLabelFromType — the parent only hands us the label. */
const refundableTypeFromLabel = (label?: string): number | undefined => {
  if (!label) return undefined;
  if (/^non/i.test(label)) return 0;
  if (/^partially/i.test(label)) return 2;
  if (/^refundable$/i.test(label)) return 1;
  return undefined;
};

export default function MultiFareRuleCard({
  isOpen,
  onClose,
  fareRuleData,
  fareType,
  totalFare,
  currency = 'INR',
  onSelect,
  onCancel,
  fromLocation,
  toLocation,
  selectedFareId,
}: MultiFareRuleCardProps) {
  if (!isOpen) return null;
  if (!fareRuleData?.data) return null;

  const ruleData = fareRuleData.data;
  const structuredRules = ruleData.fareRules?.[0]?.structuredRules;
  const summaryData = ruleData.summary?.summaries?.[0];

  // Map the parent's flattened shape back to the TripJack tfr keys.
  const tfr: FareRulesTfr = {
    CANCELLATION: (structuredRules?.cancellation?.timeWindows ?? []).map(restoreRule),
    DATECHANGE: (structuredRules?.dateChange?.timeWindows ?? []).map(restoreRule),
    NO_SHOW: (structuredRules?.noShow?.timeWindows ?? []).map(restoreRule),
    SEAT_CHARGEABLE: (structuredRules?.seatCharges ?? []).map(restoreRule),
  };

  const refundableType = refundableTypeFromLabel(summaryData?.refundable);

  // This flow only carries the fare type, per-adult total and refundability —
  // baggage/meal/seat details never reach this card, so the summary stays lean.
  const summary: FareSummaryInfo | undefined =
    fareType || (totalFare && totalFare > 0) || refundableType !== undefined
      ? {
          ...(fareType ? { fareType } : {}),
          ...(totalFare && totalFare > 0
            ? { totalAmount: totalFare, perPaxLabel: 'per adult' }
            : {}),
          ...(refundableType !== undefined ? { refundableType } : {}),
        }
      : undefined;

  const handleBack = () => {
    onCancel();
    onClose();
  };

  const handleConfirm = () => {
    const newSelection = {
      fromLocation,
      toLocation,
      selectedFareId,
      fareType,
      totalFare,
      currency,
    };

    // Get existing selections
    const raw = sessionStorage.getItem('selectedMultiCityFares');
    let selections: any[] = raw ? JSON.parse(raw) : [];

    // Remove existing selection for this route if any
    if (fromLocation && toLocation) {
      selections = selections.filter(
        (s: any) =>
          !(
            s.fromLocation?.code === fromLocation.code && s.toLocation?.code === toLocation.code
          ),
      );
    }

    // Add new selection
    selections.push(newSelection);

    // Store back to sessionStorage
    sessionStorage.setItem('selectedMultiCityFares', JSON.stringify(selections));

    // Also store just the fare IDs separately for easy access
    const fareIds = selections.map((s) => s.selectedFareId);
    sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));

    // Dispatch event to notify other components
    window.dispatchEvent(new Event('selectedFaresUpdated'));
    window.dispatchEvent(new CustomEvent('fareIdsUpdated', { detail: fareIds }));

    onSelect();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[980px]"
        showCloseButton={false}
      >
        <FareRulesHeader onClose={onClose} />
        <div className="flex-1 overflow-y-auto">
          {/* Multi-city picks fares segment by segment — name the leg these rules apply to. */}
          {fromLocation && toLocation && (
            <div className="border-b border-gray-100 px-4 pt-5 pb-4 sm:px-6">
              <h2 className="font-display text-lg font-bold text-gray-900">
                {fromLocation.code} → {toLocation.code}
                <span className="ml-2 align-middle text-sm font-medium text-gray-500">
                  {fromLocation.city} to {toLocation.city}
                </span>
              </h2>
            </div>
          )}
          <FareRulesPanel tfr={tfr} summary={summary} />
        </div>
        <FareRulesFooter
          onBack={handleBack}
          onConfirm={handleConfirm}
          backLabel="Back to Fares"
          confirmLabel="Select This Fare"
        />
      </DialogContent>
    </Dialog>
  );
}
