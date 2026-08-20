// src/components/InternationalMultiFareRuleCard.tsx

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { getReviewDetails } from '@/api/flightService.api';
import { useNavigate } from 'react-router-dom';
import { storeReviewData } from '@/utils/reviewSession';
import { cabinBaggageOf } from '@/features/flights/utils/flightDisplay';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
  type FareRulePolicyRule,
  type FareSummaryInfo,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface InternationalMultiFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  fareType: string;
  totalFare: number;
  currency: string;
  onSelect: (reviewData?: any) => void;
  onCancel: () => void;
  fromLocation?: { code: string; city: string } | undefined;
  toLocation?: { code: string; city: string } | undefined;
  selectedFareId: string;
  travelDate?: string | undefined;
  flightDetails?: any | undefined;
}

/**
 * The parent (InternationalMultiFareDetailsCard.transformFareRuleResponse)
 * flattens TripJack's tfr into structuredRules time windows, keeping the raw
 * FareComponentsSummary as `fcs`. Map each window back onto the shared
 * FareRulePolicyRule so the fee-tax breakdown rows render again.
 */
const toSharedRule = (window: any): FareRulePolicyRule => {
  const rule: FareRulePolicyRule = {};
  if (window?.st !== undefined && window?.st !== null) rule.st = String(window.st);
  if (window?.et !== undefined && window?.et !== null) rule.et = String(window.et);
  if (typeof window?.amount === 'number') rule.amount = window.amount;
  if (typeof window?.additionalFee === 'number') rule.additionalFee = window.additionalFee;
  if (window?.policyInfo) rule.policyInfo = window.policyInfo;
  const fcs = window?.fcs || window?.FareComponentsSummary;
  if (fcs) rule.FareComponentsSummary = fcs;
  return rule;
};

export default function InternationalMultiFareRuleCard({
  isOpen,
  onClose,
  fareRuleData,
  fareType,
  totalFare,
  onSelect,
  onCancel,
  fromLocation,
  toLocation,
  selectedFareId,
  travelDate,
  flightDetails,
}: InternationalMultiFareRuleCardProps) {
  const navigate = useNavigate();
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!isOpen) return null;

  const structuredRules = fareRuleData?.data?.fareRules?.[0]?.structuredRules;

  const tfr: FareRulesTfr = {
    CANCELLATION: (structuredRules?.cancellation?.timeWindows || []).map(toSharedRule),
    DATECHANGE: (structuredRules?.dateChange?.timeWindows || []).map(toSharedRule),
    NO_SHOW: (structuredRules?.noShow?.timeWindows || []).map(toSharedRule),
    SEAT_CHARGEABLE: (structuredRules?.seatCharges || []).map(toSharedRule),
  };

  // The parent hands over ids and the full flightDetails but not the selected
  // fare object itself — recover it the same way the parent resolves fare ids
  // so the Summary tab can show cabin/baggage/refundability details.
  const matchedFare = (flightDetails?.data?.fares || []).find(
    (fare: any) => (fare?.fareId || fare?.FareIdentifierType || fare?.id) === selectedFareId,
  );
  const adultFare =
    matchedFare?.FareDetails?.AdultFare || matchedFare?.passengerBreakup?.AdultFare || matchedFare;

  const summary: FareSummaryInfo = {
    fareType,
    totalAmount: totalFare,
    perPaxLabel: 'per adult',
    cabinClass: adultFare?.CabinClass,
    baseFare: adultFare?.FareComponents?.BaseFare ?? adultFare?.priceSummary?.AdultFare?.baseFare,
    tax:
      adultFare?.FareComponents?.TotalAdditionalFare ?? adultFare?.priceSummary?.AdultFare?.tax,
    refundableType: adultFare?.RefundableType,
    cabinBaggage: cabinBaggageOf(adultFare?.BaggageInfo),
    checkInBaggage: (adultFare?.BaggageInfo?.CheckInBaggage || '').trim(),
    mealIncluded: typeof adultFare?.MealIncluded === 'boolean' ? adultFare.MealIncluded : undefined,
    seatsRemaining: adultFare?.SeatsRemaining,
  };

  const handleSelectFare = async () => {
    setIsLoadingReview(true);
    setReviewError(null);

    try {
      const payload = {
        priceIds: [selectedFareId],
      };

      console.log('Calling review API with payload:', payload);

      const reviewResponse = await getReviewDetails(payload);

      console.log(
        '*************** Review API response:',
        JSON.stringify(reviewResponse.data.sessionId, null, 2),
      );
      storeReviewData(reviewResponse);

      sessionStorage.setItem('ancillarySessionId', reviewResponse?.data?.sessionId);
      sessionStorage.setItem('bookingId', reviewResponse?.data?.mappedData?.bookingId);

      if (flightDetails) {
        sessionStorage.setItem('selectedFlightDetails', JSON.stringify(flightDetails));
      }

      onSelect(reviewResponse);
      onClose();

      navigate('/booking/traveller-info');
    } catch (error: any) {
      console.error('Failed to get review details:', error);
      setReviewError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load review details. Please try again.',
      );
    } finally {
      setIsLoadingReview(false);
    }
  };

  const handleBack = () => {
    onCancel();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-w-[980px]">
        <FareRulesHeader onClose={onClose} />

        {/* Flow-specific route context under the shared header. */}
        <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-100 bg-slate-50/80 px-4 py-2.5 sm:px-6">
          {fromLocation && toLocation && (
            <p className="font-display text-sm font-bold text-gray-900">
              {fromLocation.city} ({fromLocation.code}) → {toLocation.city} ({toLocation.code})
            </p>
          )}
          {travelDate && (
            <p className="text-xs text-gray-500">
              {new Date(travelDate).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          )}
          <span className="ml-auto rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            {fareType}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {reviewError && (
            <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{reviewError}</span>
              <button
                onClick={() => setReviewError(null)}
                aria-label="Dismiss error"
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <FareRulesPanel tfr={tfr} summary={summary} />
        </div>

        <FareRulesFooter
          onBack={handleBack}
          onConfirm={handleSelectFare}
          isLoading={isLoadingReview}
        />
      </div>
    </div>
  );
}
