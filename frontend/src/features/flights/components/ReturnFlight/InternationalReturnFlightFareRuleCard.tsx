import { useState } from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { getReviewDetails } from '@/api/flightService.api';
import { storeReviewData } from '@/utils/reviewSession';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface InternationalReturnFlightFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  onConfirm: () => void;
  fareType: string;
  currency?: string;
  selectedFareId?: string | null;
  /** Selected fare's label; '' hides the banner rather than guessing. */
  refundable?: string;
}

/** "DEL-BOM" / "DEL_BOM" -> "DEL → BOM"; anything else is shown as-is. */
const formatRouteKey = (key: string) => {
  const match = key.match(/^([A-Za-z]{3})[-_]([A-Za-z]{3})$/);
  return match ? `${(match[1] || '').toUpperCase()} → ${(match[2] || '').toUpperCase()}` : key;
};

const legLabel = (index: number, count: number) => {
  if (count === 2) return index === 0 ? 'Onward' : 'Return';
  return `Leg ${index + 1}`;
};

export default function InternationalReturnFlightFareRuleCard({
  refundable = '',
  isOpen,
  onClose,
  fareRuleData,
  onConfirm,
  selectedFareId,
}: InternationalReturnFlightFareRuleCardProps) {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  if (!fareRuleData?.fareRule || Object.keys(fareRuleData.fareRule).length === 0) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
            <p className="text-center text-gray-600">Fare rules not available for this option.</p>
            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary/90 mt-4 rounded-lg px-4 py-2 text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const fareRuleObj = fareRuleData.fareRule;
  // The TripJack fare-rule block is keyed by route. International round-trip
  // fares usually carry one combined key, but when the airline states each
  // leg separately every key gets its own panel — never drop a leg.
  const legEntries: Array<[string, any]> = Object.entries(fareRuleObj);

  // The review call writes sessionStorage and navigates when it resolves, so
  // the modal must not be dismissable while it is in flight (the old design
  // disabled both dismissal controls during processing).
  const handleDismiss = () => {
    if (!isProcessing) onClose();
  };

  const handleConfirmAndContinue = async () => {
    if (!selectedFareId) {
      setError('No fare selected. Please try again.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reviewResponse = await getReviewDetails({
        priceIds: [selectedFareId],
      });

      if (reviewResponse?.data?.mappedData?.status?.success === false) {
        setError(
          reviewResponse?.data?.mappedData?.status?.message ||
            'Unable to get review details. Please try again.',
        );
        setIsProcessing(false);
        return;
      }

      storeReviewData(reviewResponse);

      sessionStorage.setItem('ancillarySessionId', reviewResponse?.data?.sessionId);
      sessionStorage.setItem('bookingId', reviewResponse?.data?.mappedData?.bookingId);

      if (reviewResponse?.data) {
        sessionStorage.setItem('reviewDetails', JSON.stringify(reviewResponse.data));
      }

      onConfirm();
      onClose();

      navigate('/booking/traveller-info');
    } catch (err: any) {
      console.error('Error getting review details:', err);
      setError(
        err?.response?.data?.message || err?.message || 'Failed to confirm fare. Please try again.',
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-[980px]">
        <FareRulesHeader onClose={handleDismiss} />

        <div className="flex-1 overflow-y-auto">
          {/* The chooser hands this flow only the fare's refundable label —
              no price/baggage summary — so the Summary tab stays off and the
              refundability verdict is kept as a banner above the policies. */}
          {refundable && (
            <div
              className={`mx-4 mt-5 rounded-xl border p-4 sm:mx-6 ${
                refundable === 'Refundable'
                  ? 'border-green-200 bg-green-50'
                  : refundable === 'Partially Refundable'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {refundable === 'Refundable' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : refundable === 'Partially Refundable' ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                )}
                <p
                  className={`font-display text-base font-bold ${
                    refundable === 'Refundable'
                      ? 'text-green-700'
                      : refundable === 'Partially Refundable'
                        ? 'text-amber-700'
                        : 'text-red-700'
                  }`}
                >
                  {refundable} Fare
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-4 mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 sm:mx-6">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {legEntries.map(([routeKey, routeData], index) => (
            <div key={routeKey}>
              {legEntries.length > 1 && (
                <div className="px-4 pt-5 sm:px-6">
                  <h2 className="font-display text-lg font-bold text-gray-900">
                    {formatRouteKey(routeKey)}
                    <span className="text-gray-400"> · </span>
                    {legLabel(index, legEntries.length)}
                  </h2>
                </div>
              )}
              <FareRulesPanel tfr={routeData?.tfr as FareRulesTfr | undefined} showSummary={false} />
            </div>
          ))}
        </div>

        <FareRulesFooter
          onBack={handleDismiss}
          onConfirm={handleConfirmAndContinue}
          isLoading={isProcessing}
        />
      </div>
    </div>
  );
}
