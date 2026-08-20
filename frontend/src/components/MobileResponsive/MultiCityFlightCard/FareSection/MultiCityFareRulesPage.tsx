import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { readFareRules } from '@/features/flights/utils/fareRules';
import { cabinBaggageOf } from '@/features/flights/utils/flightDisplay';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  formatFareCurrency,
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
 * The stored multi-city fare ('multiCitySelectedFare') is the fare-selection
 * page's FareData shape: priceSummary.AdultFare + passengerBreakup.AdultFare.
 * That differs from the TripjackFieldMapper shape buildFareSummary expects
 * (FareDetails.AdultFare), so the summary is mapped manually here.
 */
function buildMultiCityFareSummary(selectedFare: any): FareSummaryInfo | undefined {
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

/** "DEL-BOM" (TripJack route key) -> "DEL → BOM" for the leg heading. */
const formatRouteKey = (key: string) => key.split('-').filter(Boolean).join(' → ');

const MultiCityFareRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecked, setIsChecked] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<FareRuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeIndex, setRouteIndex] = useState<number>(0);
  const [selectedFare, setSelectedFare] = useState<any>(null);

  useEffect(() => {
    const loadFareRuleData = () => {
      try {
        const state = location.state as { routeIndex?: number } | null;
        const index = state?.routeIndex ?? 0;
        setRouteIndex(index);

        // Guarded read: rules only count when they were fetched for the fare
        // this screen is about. 'multiCityFareRules' remains the raw copy.
        const data = readFareRules(sessionStorage.getItem('multiCityFareId') || undefined);

        if (data) {
          setFareRuleData(data);
        }

        const selectedFareStr = sessionStorage.getItem('multiCitySelectedFare');
        if (selectedFareStr) {
          setSelectedFare(JSON.parse(selectedFareStr));
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
    navigate('/multi-city-fare-selection', {
      state: { routeIndex },
    });
  };

  const handleContinue = () => {
    if (!isChecked) return;

    try {
      const storedStates = sessionStorage.getItem('multiCityRouteStates');
      if (storedStates) {
        const routeStates = JSON.parse(storedStates);
        if (Array.isArray(routeStates) && routeStates[routeIndex]) {
          routeStates[routeIndex] = {
            ...routeStates[routeIndex],
            rulesAccepted: true,
            isComplete: true,
          };
          sessionStorage.setItem('multiCityRouteStates', JSON.stringify(routeStates));
          navigate('/mobile-multicity-card', {
            state: {
              fromFareRules: true,
              routeIndex,
              timestamp: Date.now(),
            },
          });
          return;
        }
      }
      navigate('/mobile-multicity-card', {
        state: { fromFareRules: true, routeIndex },
      });
    } catch (error) {
      console.error('Error updating route state:', error);
      navigate('/mobile-multicity-card', {
        state: { fromFareRules: true, routeIndex },
      });
    }
  };

  const summary = buildMultiCityFareSummary(selectedFare);
  const routeKeys = fareRuleData?.fareRule ? Object.keys(fareRuleData.fareRule) : [];
  const totalFare = selectedFare?.priceSummary?.AdultFare?.total;
  const fareType = selectedFare?.FareIdentifierType;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 md:hidden lg:hidden">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="mt-4 text-gray-600">Loading fare rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen min-h-screen flex-col bg-gray-50 md:hidden lg:hidden">
      <FareRulesHeader onBack={handleBack} />

      <div className="flex-1 overflow-y-auto">
        {/* Route context strip — which multi-city route these rules belong to. */}
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
          <span className="font-display text-base font-bold text-gray-900">
            Route {routeIndex + 1}
          </span>
          {typeof totalFare === 'number' && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-primary text-sm font-semibold">
                {formatFareCurrency(totalFare)}
              </span>
            </>
          )}
          {fareType && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {fareType}
            </span>
          )}
        </div>

        {routeKeys.length === 0 ? (
          // No usable rules for this fare — the panel renders its own
          // "No Information Available" empty states per tab.
          <FareRulesPanel tfr={undefined} summary={summary} />
        ) : (
          routeKeys.map((key, index) => (
            <div key={key}>
              {routeKeys.length > 1 && (
                <h2 className="font-display px-4 pt-5 text-lg font-bold text-gray-900 sm:px-6">
                  {formatRouteKey(key)}
                </h2>
              )}
              <FareRulesPanel
                tfr={fareRuleData?.fareRule?.[key]?.tfr}
                summary={index === 0 ? summary : undefined}
                showSummary={index === 0}
              />
            </div>
          ))
        )}

        {/* Consent gate for this route — kept from the original flow. */}
        <div className="px-4 pb-6 sm:px-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="understand"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="text-primary focus:ring-primary mt-1 h-4 w-4 cursor-pointer rounded border-gray-300"
              />
              <label htmlFor="understand" className="cursor-pointer text-sm text-gray-600">
                I have read and understand the fare rules and policies for this route
              </label>
            </div>
          </div>
        </div>
      </div>

      <FareRulesFooter
        onBack={handleBack}
        onConfirm={handleContinue}
        backLabel="Back"
        confirmLabel={isChecked ? '✓ Complete Route' : 'Please accept to continue'}
        confirmDisabled={!isChecked}
      />
    </div>
  );
};

export default MultiCityFareRulesPage;
