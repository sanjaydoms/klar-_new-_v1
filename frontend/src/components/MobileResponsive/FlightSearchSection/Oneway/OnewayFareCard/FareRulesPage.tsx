import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { readFareRules } from '@/features/flights/utils/fareRules';
import { cabinBaggageOf } from '@/features/flights/utils/flightDisplay';
import { getReviewDetails } from '@/api/flightService.api';
import { storeReviewData } from '@/utils/reviewSession';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
  type FareSummaryInfo,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface FareRulesPageProps {
  totalAmount?: string;
  cancellationPolicy?: string;
  dateChangePolicy?: string;
  noShowPolicy?: string;
  seatPolicy?: string;
  onContinue?: () => void;
  onBack?: () => void;
}

interface FareRuleData {
  fareRule: {
    [key: string]: {
      fr: any;
      tfr: FareRulesTfr;
    };
  };
  status: {
    success: boolean;
    httpStatus: number;
  };
}

/**
 * The mobile oneway fare (written to sessionStorage by the fare-selection
 * screens) keeps the passenger details under `passengerBreakup` rather than
 * the TripjackFieldMapper `FareDetails` shape, so the shared buildFareSummary
 * would miss everything but the price — map it by hand instead.
 */
function buildMobileOnewayFareSummary(selectedFare: any): FareSummaryInfo | undefined {
  if (!selectedFare) return undefined;
  const adult = selectedFare.passengerBreakup?.AdultFare ?? selectedFare.FareDetails?.AdultFare;
  const price = selectedFare.priceSummary?.AdultFare;
  return {
    fareType: selectedFare.FareIdentifierType,
    cabinClass: adult?.CabinClass,
    totalAmount: price?.total,
    baseFare: price?.baseFare,
    tax: price?.tax,
    perPaxLabel: 'per adult',
    refundableType: adult?.RefundableType,
    cabinBaggage: cabinBaggageOf(adult?.BaggageInfo),
    checkInBaggage: (adult?.BaggageInfo?.CheckInBaggage || '').trim(),
    mealIncluded: typeof adult?.MealIncluded === 'boolean' ? adult.MealIncluded : undefined,
    seatsRemaining: adult?.SeatsRemaining,
  };
}

const MobileFareRulesPage: React.FC<FareRulesPageProps> = ({
  totalAmount: propTotalAmount = '₹4,110',
  onBack,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecked, setIsChecked] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<FareRuleData | null>(null);
  const [selectedFare, setSelectedFare] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(propTotalAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadFareRuleData = () => {
      try {
        if (location.state) {
          const state = location.state as any;
          if (state.totalAmount) {
            setTotalAmount(state.totalAmount);
          }
        }

        // This flow's fare-selection screen writes 'selectedFare';
        // 'selectedFareData' belongs to the return/multi-city flows and can
        // hold a stale fare from an earlier search in the same session.
        const fareStr =
          sessionStorage.getItem('selectedFare') ?? sessionStorage.getItem('selectedFareData');
        const fare = fareStr ? JSON.parse(fareStr) : null;
        setSelectedFare(fare);

        // Only rules fetched for THIS fare. Anything else is a leftover from a
        // previous selection, and the shared empty state is the honest answer
        // instead.
        setFareRuleData(readFareRules(fare?.fareId));

        if (fare?.totalAmount) {
          setTotalAmount(fare.totalAmount);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFareRuleData();
  }, [location]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleContinue = async () => {
    if (!isChecked) return;

    setIsSubmitting(true);
    try {
      // Get price IDs from session storage
      let priceIds: string[] = [];

      // Try to get from selected fare data
      const selectedFareDataStr = sessionStorage.getItem('selectedFareData');
      if (selectedFareDataStr) {
        const fareData = JSON.parse(selectedFareDataStr);
        if (fareData.fareId) {
          priceIds = [fareData.fareId];
        }
      }

      // Also try to get from selected fare
      const selectedFareStr = sessionStorage.getItem('selectedFare');
      if (selectedFareStr) {
        const fare = JSON.parse(selectedFareStr);
        if (fare.fareId && !priceIds.includes(fare.fareId)) {
          priceIds.push(fare.fareId);
        }
      }

      // If still no price IDs, try to get from fareRuleData
      if (priceIds.length === 0 && fareRuleData) {
        const routeKeys = Object.keys(fareRuleData.fareRule);
        if (routeKeys.length > 0) {
          const routeKey = routeKeys[0];
          const routeData = routeKey ? fareRuleData.fareRule[routeKey] : undefined;
          if (routeData?.fr) {
            // Extract price ID from fr if available
            const frKeys = Object.keys(routeData.fr);
            if (frKeys.length > 0) {
              priceIds = frKeys;
            }
          }
        }
      }

      if (priceIds.length === 0) {
        console.error('No price IDs found');
        // Fallback: navigate with whatever data we have
        navigate('/mobile-ancillary-flight-details');
        return;
      }

      console.log('Calling review API with priceIds:', priceIds);
      const response = await getReviewDetails({
        priceIds: priceIds,
      });

      console.log('Review API response:', response);

      // Store review data in session storage
      storeReviewData(response);

      // Navigate to ancillary flight details page
      navigate('/mobile-ancillary-flight-details', {
        state: {
          reviewData: response,
          totalAmount: totalAmount,
        },
      });
    } catch (error) {
      console.error('Error calling review API:', error);
      // Even if API fails, navigate to next page
      navigate('/mobile-ancillary-flight-details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFareRules = () => {
    if (!fareRuleData || !fareRuleData.fareRule) return null;
    const routeKeys = Object.keys(fareRuleData.fareRule);
    if (routeKeys.length === 0) return null;
    const routeKey = routeKeys[0];
    return routeKey ? fareRuleData.fareRule[routeKey] : null;
  };

  const rules = getFareRules();
  const tfr = rules?.tfr;
  const summary = buildMobileOnewayFareSummary(selectedFare);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 md:hidden lg:hidden">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading fare rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-gray-50 md:hidden lg:hidden">
      <FareRulesHeader onBack={handleBack} />

      <div className="flex-1 overflow-y-auto">
        <FareRulesPanel tfr={tfr} summary={summary} showSummary={Boolean(summary)} />

        {/* Consent gate — this flow requires an explicit acknowledgement. */}
        <div className="px-4 pt-1 pb-6 sm:px-6">
          <label
            htmlFor="understand"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4"
          >
            <input
              type="checkbox"
              id="understand"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="text-primary focus:ring-primary mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">
              I have read and understand the fare rules and policies
            </span>
          </label>
        </div>
      </div>

      <FareRulesFooter
        onBack={handleBack}
        onConfirm={handleContinue}
        isLoading={isSubmitting}
        confirmDisabled={!isChecked}
        backLabel="Back"
        confirmLabel="I Understand, Continue"
      />
    </div>
  );
};

export default MobileFareRulesPage;
