import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface ReturnFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  onConfirm: () => void;
  fareType: string;
  currency?: string;
  /** Selected fare's label; '' when it states none, and the banner is hidden. */
  refundable?: string;
}

/**
 * Domestic return (desktop) fare rules modal — shown once per leg by
 * ReturnFareDetailsCard after a fare is picked. Presentation comes from the
 * shared "Fare Rules & Policies" design; this file keeps only the flow's data
 * plumbing (the raw getFareRule response) and the parent-provided handlers.
 */
export default function ReturnFareRuleCard({
  isOpen,
  onClose,
  refundable = '',
  fareRuleData,
  onConfirm,
}: ReturnFareRuleCardProps) {
  if (!isOpen) return null;

  // Show error state if no fare rules came back for this option.
  if (!fareRuleData?.fareRule || Object.keys(fareRuleData.fareRule).length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold text-gray-900">
              No Fare Rules Available
            </h2>
            <p className="mb-6 text-gray-600">Fare rules not available for this option.</p>
            <Button onClick={onClose} className="h-10 rounded-lg px-6">
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // A domestic return fareRule response holds one route key per leg covered by
  // the selected fare (normally exactly one — this modal is mounted separately
  // for the departure and the return flight). Render every route so no leg's
  // rules are ever dropped.
  const fareRuleObj: Record<string, any> = fareRuleData.fareRule;
  const legs = Object.keys(fareRuleObj).map((routeKey) => ({
    routeKey,
    label: routeKey.split('-').filter(Boolean).join(' → '),
    tfr: fareRuleObj[routeKey]?.tfr as FareRulesTfr | undefined,
  }));

  // No fare object reaches this flow (only the refundable label), so the
  // Summary tab has nothing meaningful to show; refundability gets its own
  // banner above the policy tabs instead, matching today's coverage.
  const isRefundableGreen = refundable === 'Refundable';
  const isPartiallyRefundable = refundable === 'Partially Refundable';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[980px]"
        showCloseButton={false}
      >
        <FareRulesHeader onClose={onClose} />
        <div className="flex-1 overflow-y-auto">
          {refundable && (
            <div className="px-4 pt-5 sm:px-6">
              <div
                className={`rounded-xl border p-5 ${
                  isRefundableGreen
                    ? 'border-green-200 bg-green-50'
                    : isPartiallyRefundable
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {isRefundableGreen || isPartiallyRefundable ? (
                    <CheckCircle2
                      className={`mt-0.5 h-6 w-6 shrink-0 ${
                        isRefundableGreen ? 'text-green-600' : 'text-amber-600'
                      }`}
                    />
                  ) : (
                    <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                  )}
                  <div>
                    <p
                      className={`font-display text-lg font-bold ${
                        isRefundableGreen
                          ? 'text-green-700'
                          : isPartiallyRefundable
                            ? 'text-amber-700'
                            : 'text-red-700'
                      }`}
                    >
                      {refundable} Fare
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {isRefundableGreen
                        ? 'You can cancel your booking and get a refund as per policy.'
                        : isPartiallyRefundable
                          ? 'You may receive a partial refund on cancellation as per policy.'
                          : 'This fare is non-refundable. Cancellation charges apply as per policy.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {legs.map((leg, index) => (
            <div key={leg.routeKey} className={index > 0 ? 'border-t border-gray-200' : ''}>
              {legs.length > 1 && (
                <div className="px-4 pt-5 sm:px-6">
                  <h2 className="font-display text-lg font-bold text-gray-900">{leg.label}</h2>
                </div>
              )}
              <FareRulesPanel tfr={leg.tfr} showSummary={false} />
            </div>
          ))}
        </div>
        {/* Confirming a leg only stores the selection and returns to results —
            it never proceeds straight to booking — so keep the leg-neutral label. */}
        <FareRulesFooter onBack={onClose} onConfirm={onConfirm} confirmLabel="Confirm Selection" />
      </DialogContent>
    </Dialog>
  );
}
