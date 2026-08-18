import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { readFareRules } from '@/features/flights/utils/fareRules';
import { cabinBaggageOf } from '@/features/flights/utils/flightDisplay';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  type FareRulesTfr,
  type FareSummaryInfo,
} from '@/features/flights/components/FareRules/fareRulesShared';

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
 * The mobile domestic-return fare (written by DomesticFareSelectionPage) keeps
 * the passenger details under `passengerBreakup` rather than the
 * TripjackFieldMapper `FareDetails` shape, so the shared buildFareSummary
 * would miss everything but the price — map it by hand instead.
 */
function buildMobileReturnFareSummary(selectedFare: any): FareSummaryInfo | undefined {
  if (!selectedFare) return undefined;
  const adult = selectedFare.passengerBreakup?.AdultFare;
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

const DomesticFareRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<FareRuleData | null>(null);
  const [selectedFare, setSelectedFare] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFareRuleData = () => {
      try {
        // The fare this screen is about: the leg's own selection first, since
        // 'selectedFareData' is only written on the fallback path.
        const segment = sessionStorage.getItem('selectedSegment');
        const selectedFareStr =
          (segment === 'ONWARD' && sessionStorage.getItem('selectedDepartureFare')) ||
          (segment === 'RETURN' && sessionStorage.getItem('selectedReturnFare')) ||
          sessionStorage.getItem('selectedFareData');
        const fare = selectedFareStr ? JSON.parse(selectedFareStr) : null;
        setSelectedFare(fare);

        // Rules belonging to a different fare are not this fare's terms.
        setFareRuleData(readFareRules(fare?.fareId));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFareRuleData();
  }, []);

  const handleBack = () => {
    navigate('/mobile_return_fare_card');
  };

  const handleContinue = () => {
    if (!isChecked) return;

    // Get the selected segment
    const selectedSegment = sessionStorage.getItem('selectedSegment');
    const selectedFareDataStr = sessionStorage.getItem('selectedFareData');

    // Store the fare data based on segment
    if (selectedSegment === 'ONWARD') {
      sessionStorage.setItem('selectedDepartureFare', selectedFareDataStr || '');
    } else if (selectedSegment === 'RETURN') {
      sessionStorage.setItem('selectedReturnFare', selectedFareDataStr || '');
    }

    // Navigate back to flight card
    navigate('/mobile-return-card');
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
  const summary = buildMobileReturnFareSummary(selectedFare);

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
        <FareRulesPanel tfr={tfr} summary={summary} />

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
        confirmDisabled={!isChecked}
        backLabel="Back"
        confirmLabel="I Understand, Continue"
      />
    </div>
  );
};

export default DomesticFareRulesPage;
