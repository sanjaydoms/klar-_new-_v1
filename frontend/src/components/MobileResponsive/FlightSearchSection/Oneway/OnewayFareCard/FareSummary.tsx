import { getFareRule } from '@/api/flightService.api';
import React, { useState } from 'react';
import {
  clearFareRules,
  isFareRuleResponseUsable,
  storeFareRules,
} from '@/features/flights/utils/fareRules';

interface FareSummaryProps {
  totalFare: string;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
  baseFare?: string;
  taxes?: string;
  onContinue?: () => void;
  fareId?: string;
  flowType?: string;
}

const FareSummary: React.FC<FareSummaryProps> = ({
  totalFare = '₹4,110',
  adultCount = 1,
  childCount = 0,
  infantCount = 0,
  baseFare = '₹3,500',
  taxes = '₹610',
  onContinue,
  fareId = '',
  flowType = 'oneway',
}) => {
  const [showPriceBreakup, setShowPriceBreakup] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPassengerText = () => {
    const parts = [];
    if (adultCount > 0) parts.push(`${adultCount} Adult${adultCount > 1 ? 's' : ''}`);
    if (childCount > 0) parts.push(`${childCount} Child${childCount > 1 ? 'ren' : ''}`);
    if (infantCount > 0) parts.push(`${infantCount} Infant${infantCount > 1 ? 's' : ''}`);
    return parts.join(' • ');
  };

  const handleContinue = async () => {
    if (!fareId) {
      console.error('No fareId provided');
      if (onContinue) onContinue();
      return;
    }

    setLoading(true);
    // Drop the previous fare's rules FIRST. Both failure paths below still
    // navigate, and the rules page used to render whatever was left in
    // storage — another fare's cancellation charges, presented as this one's.
    clearFareRules();
    try {
      const response = await getFareRule({
        flowType: 'SEARCH',
        id: fareId,
      });

      // TripJack answers 200 with status.success false; that is not a rule set.
      if (isFareRuleResponseUsable(response)) {
        storeFareRules(fareId, response);
      } else {
        console.warn('Fare rule response carried no rules', response?.status);
      }

      if (onContinue) {
        onContinue();
      }
    } catch (error) {
      console.error('Error fetching fare rule:', error);

      if (onContinue) {
        onContinue();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-input p-5 mb-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="text-sm text-gray-600">Total Fare ({getPassengerText()})</div>
        </div>
        <div className="text-2xl font-bold text-[#EF4444]">{totalFare}</div>
      </div>

      <button
        onClick={() => setShowPriceBreakup(!showPriceBreakup)}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors mb-3"
      >
        <span>Price Breakup</span>
        <svg
          className={`w-4 h-4 ml-1 transition-transform duration-200 ${showPriceBreakup ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showPriceBreakup && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-2 border border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare</span>
            <span className="text-gray-800 font-medium">{baseFare}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxes & Surcharges</span>
            <span className="text-gray-800 font-medium">{taxes}</span>
          </div>
          <div className="border-t border-gray-200 pt-2 mt-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-800">Total</span>
              <span className="text-[#EF4444]">{totalFare}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-medium text-center transition-colors text-sm sm:text-base flex items-center justify-center ${
          loading
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-primary hover:bg-primary text-white cursor-pointer'
        }`}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </>
        ) : (
          'Continue Booking'
        )}
      </button>
    </div>
  );
};

export default FareSummary;
