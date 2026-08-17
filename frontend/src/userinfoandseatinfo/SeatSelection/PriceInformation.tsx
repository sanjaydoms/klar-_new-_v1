import React from 'react';
import { Button } from '@/components/ui/button';

interface PriceInformationProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  reviewData: any;
  selectedSeatPrices: { seatId: string; price: number; segmentId?: string; seatNumber?: string }[];
  selectedMealsPerTravelerPerSegment: {
    [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
  };
  selectedBaggagePerTravelerPerSegment: {
    [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
  };
  makedPrice: any;
  setMakedPrice: (price: number) => void;
  bookingError: string | React.ReactNode | null;
  isProcessing: boolean;
  handleContinue: () => void;
  getFlightInfoBySegmentId: (segmentId: string) => { flightNumber: string } | null;
  walletData: any;
  holdBooking: boolean;
  setHoldBooking: (value: boolean) => void;
  isConfirmationPage?: boolean;
  // Add new prop for pre-calculated markup
  preCalculatedMarkup?: number;
  totalAmount?: {
    baseFare: number;
    seatTotal: number;
    markup: number;
    total: number;
  };
  adultFare?: any;
  childFare?: any;
  infantFare?: any;
  adultCount?: number;
  childCount?: number;
  infantCount?: number;
}

export default function PriceInformation({
  timeLeft,
  formatTime,
  reviewData,
  selectedSeatPrices,
  selectedMealsPerTravelerPerSegment,
  selectedBaggagePerTravelerPerSegment,
  makedPrice,
  bookingError,
  isProcessing,
  handleContinue,
  walletData,
  holdBooking,
  setHoldBooking,
  isConfirmationPage,
  preCalculatedMarkup,
  totalAmount: propsTotalAmount,
  adultFare,
  childFare,
  infantFare,
  adultCount = 0,
  childCount = 0,
  infantCount = 0,
}: PriceInformationProps) {
  const calculateMarkup = (totalFare: number) => {
    if (!makedPrice || !makedPrice?.services?.length) {
      return 0;
    }

    const flightService = makedPrice.services.find((s: any) => s.serviceType === 'FLIGHTS');

    if (!flightService) return 0;

    const percentage = flightService.percentageMarkup || 0;
    const fixed = flightService.fixedMarkup || 0;

    if (percentage > 0) {
      return (totalFare * percentage) / 100;
    }

    if (fixed > 0) {
      return fixed;
    }

    return 0;
  };

  const getPricingInfo = () => {
    let totalFare = 0;
    let baseFare = 0;
    let currency = '₹';

    let taxBreakdown = {
      AirlineGSTComponent: 0,
      ManagementFee: 0,
      ManagementFeeTax: 0,
      OtherTaxes: 0,
      FuelSurcharge: 0,
    };

    const fareDetail = reviewData?.mappedData?.totalPriceInfo?.totalFareDetail;

    if (fareDetail) {
      totalFare = fareDetail.FareComponents?.TotalFare || 0;
      baseFare = fareDetail.FareComponents?.BaseFare || 0;

      const additional = fareDetail.AdditionalFareComponents?.TotalAdditionalFare || {};

      taxBreakdown = {
        AirlineGSTComponent: additional.AirlineGSTComponent || additional.AGST || 0,
        ManagementFee: additional.ManagementFee || 0,
        ManagementFeeTax: additional.ManagementFeeTax || 0,
        OtherTaxes: additional.OtherTaxes || 0,
        FuelSurcharge: additional.FuelSurcharge || additional.YQ || 0,
      };
    }

    return { totalFare, baseFare, currency, taxBreakdown };
  };

  const renderPassengerFare = (title: string, fareData: any, count: number) => {
    if (!fareData || count === 0) return null;

    const baseFare = fareData?.FareComponents?.BaseFare || 0;
    const totalFare = fareData?.FareComponents?.TotalFare || 0;
    const taxes =
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.AirlineGSTComponent || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.FuelSurcharge || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.OtherTaxes || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.ManagementFee || 0) +
      (fareData?.AdditionalFareComponents?.TotalAdditionalFare?.ManagementFeeTax || 0);

    // Multiply by count
    const totalBaseFare = baseFare * count;
    const totalTaxes = taxes * count;
    const totalTotalFare = totalFare * count;

    // Get baggage info
    const baggageInfo = fareData?.BaggageInfo?.CheckInBaggage || '';
    const formattedBaggage = baggageInfo ? baggageInfo.replace('Kilograms', 'Kg') : '';

    return (
      <div className="mt-2 pt-2 border-t border-gray-200 first:border-t-0 first:mt-0 first:pt-0">
        <h4 className="text-xs font-semibold text-gray-600 mb-1.5">
          {title} {count > 1 ? `× ${count}` : ''}
        </h4>
        <div className="space-y-1 pl-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Fare</span>
            <span className="font-medium">{currency} {totalBaseFare.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Taxes & Surcharges</span>
            <span className="font-medium text-green-600">{currency} {totalTaxes.toFixed(2)}</span>
          </div>
          {formattedBaggage && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>Baggage</span>
              <span>{formattedBaggage}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-medium">
            <span className="text-gray-700">Total {title}</span>
            <span className="font-semibold">{currency} {totalTotalFare.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const seatTotal = selectedSeatPrices.reduce((sum, item) => sum + (item.price || 0), 0);

  // Helper function to get meal price from meal options
  const getMealPrice = (segmentId: string, mealId: string): number => {
    const mealsBySegment = JSON.parse(sessionStorage.getItem('mealsBySegment') || '{}');
    const segmentMeals = mealsBySegment[segmentId] || [];

    const match = mealId.match(/meal_.*_(\d+)$/);
    if (match && match[1]) {
      const index = parseInt(match[1]);
      if (
        segmentMeals[index] &&
        (segmentMeals[index].price !== undefined || segmentMeals[index].amount !== undefined)
      ) {
        return segmentMeals[index].price || segmentMeals[index].amount || 0;
      }
    }

    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const flights = priceData?.data?.flights || [];
    for (const flight of flights) {
      const meals = flight?.fareOptions?.[0]?.meals?.[segmentId];
      if (meals && match && match[1]) {
        const index = parseInt(match[1]);
        if (
          meals[index] &&
          (meals[index].price !== undefined || meals[index].amount !== undefined)
        ) {
          return meals[index].price || meals[index].amount || 0;
        }
      }
    }

    return 0;
  };

  const getBaggagePrice = (segmentId: string, baggageId: string): number => {
    const baggageBySegment = JSON.parse(sessionStorage.getItem('baggageBySegment') || '{}');
    const segmentBaggage = baggageBySegment[segmentId] || [];

    const match = baggageId.match(/baggage_.*_(\d+)$/);
    if (match && match[1]) {
      const index = parseInt(match[1]);
      if (
        segmentBaggage[index] &&
        (segmentBaggage[index].price !== undefined || segmentBaggage[index].amount !== undefined)
      ) {
        return segmentBaggage[index].price || segmentBaggage[index].amount || 0;
      }
    }

    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const flights = priceData?.data?.flights || [];
    for (const flight of flights) {
      const baggage = flight?.fareOptions?.[0]?.baggageOptions?.[segmentId];
      if (baggage && match && match[1]) {
        const index = parseInt(match[1]);
        if (
          baggage[index] &&
          (baggage[index].price !== undefined || baggage[index].amount !== undefined)
        ) {
          return baggage[index].price || baggage[index].amount || 0;
        }
      }
    }

    return 0;
  };

  let mealTotal = 0;
  let totalMealItems = 0;

  Object.entries(selectedMealsPerTravelerPerSegment).forEach(
    ([travelerIndex, travelerSelections]) => {
      Object.entries(travelerSelections || {}).forEach(([segmentId, segmentMeals]) => {
        Object.entries(segmentMeals || {}).forEach(([mealId, quantity]) => {
          if (quantity <= 0) return;
          totalMealItems += quantity;

          const pricePerItem = getMealPrice(segmentId, mealId);
          mealTotal += pricePerItem * quantity;
        });
      });
    },
  );

  let baggageTotal = 0;
  let totalBaggageItems = 0;

  Object.entries(selectedBaggagePerTravelerPerSegment).forEach(
    ([travelerIndex, travelerSelections]) => {
      Object.entries(travelerSelections || {}).forEach(([segmentId, segmentBaggage]) => {
        Object.entries(segmentBaggage || {}).forEach(([baggageId, quantity]) => {
          if (quantity <= 0) return;
          totalBaggageItems += quantity;

          const pricePerItem = getBaggagePrice(segmentId, baggageId);
          baggageTotal += pricePerItem * quantity;
        });
      });
    },
  );

  const { totalFare, baseFare, currency, taxBreakdown } = getPricingInfo();
  const addonsTotal = seatTotal + mealTotal + baggageTotal;

  // 🔥 FIX: Calculate markup amount correctly
  let markupAmount = 0;

  // If on confirmation page and totalAmount is provided, use it
  if (propsTotalAmount) {
    markupAmount = propsTotalAmount.markup || 0;
  }
  // If preCalculatedMarkup is provided, use it
  else if (preCalculatedMarkup) {
    markupAmount = preCalculatedMarkup;
  }
  // Otherwise calculate it from the total fare (including addons)
  else {
    // Calculate markup on totalFare + addonsTotal (same as SeatSelection)
    markupAmount = calculateMarkup(totalFare + addonsTotal);
  }

  // 🔥 FIX: Use pre-calculated total if provided, otherwise calculate it
  const grandTotal = propsTotalAmount
    ? propsTotalAmount.total
    : totalFare + addonsTotal + markupAmount;

  /**
   * DISPLAY ONLY. Do not feed this into any arithmetic.
   *
   * `propsTotalAmount.baseFare` is misnamed: SeatSelection.tsx:1214 sets it from
   * TripJack's TotalFare, taxes already included. Rendering it as "Base Fare"
   * beside a separate "Tax Amount" row double-counted tax on screen — the three
   * rows never added up to what the customer was charged.
   *
   * The value itself must NOT be corrected: BeforeBookingConfirmation.tsx:811
   * computes the amount sent to the supplier as `baseFare + seatTotal`, which is
   * right precisely because that field is a total. Making it a real base there
   * would undercharge by the tax.
   *
   * So take the genuine base from the fare detail the backend already maps
   * (TripJack BF -> FareComponents.BaseFare). Then base + tax == TotalFare, and
   * + add-ons == the grand total, which is what the customer pays.
   */
  const hasRealBaseFare = baseFare > 0;
  const displayBaseFare = hasRealBaseFare
    ? baseFare
    : propsTotalAmount
      ? propsTotalAmount.baseFare
      : baseFare;

  const displayAddonsTotal = propsTotalAmount ? propsTotalAmount.seatTotal : addonsTotal;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <span className="text-sm text-gray-600">Time Left:</span>
        <span
          className={`text-sm font-semibold ${timeLeft < 120 ? 'text-red-600' : 'text-orange-600'}`}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">Price Information</h3>

      <div className="space-y-3 mb-4">
        {/* Fare. Labelled for what the number actually is: only a genuine
            BaseFare from the supplier earns the "Base Fare" label and a separate
            tax row beneath it. Without one we show the fare inclusive rather than
            invent a split that does not reconcile. */}
        <div className="flex justify-between text-sm">
          <span>{hasRealBaseFare ? 'Base Fare' : 'Fare (incl. taxes)'}</span>
          <span>
            {currency} {displayBaseFare.toFixed(2)}
          </span>
        </div>

        {/* Tax Amount — only alongside a real base, or it double-counts. */}
        {hasRealBaseFare && (
          <div className="flex justify-between text-sm">
            <span>Tax Amount</span>
            <span>
              {currency}{' '}
              {(
                taxBreakdown.AirlineGSTComponent +
                taxBreakdown.FuelSurcharge +
                taxBreakdown.OtherTaxes +
                taxBreakdown.ManagementFee +
                taxBreakdown.ManagementFeeTax
              ).toFixed(2)}
            </span>
          </div>
        )}

        {/* Passenger-wise Breakdown - ADD THIS SECTION */}
        {(adultFare || childFare || infantFare) && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <h4 className="text-xs font-semibold text-gray-600 mb-2">Passenger-wise Breakdown</h4>
            {renderPassengerFare('Adult Fare', adultFare, adultCount)}
            {renderPassengerFare('Child Fare', childFare, childCount)}
            {renderPassengerFare('Infant Fare', infantFare, infantCount)}
          </div>
        )}

        {/* Total Fare - Show only on SeatSelection page or when not on confirmation */}
        {!isConfirmationPage && (
          <div className="flex justify-between text-sm font-medium pt-2 border-t">
            <span>Total Fare</span>
            <span>
              {currency} {totalFare.toFixed(2)}
            </span>
          </div>
        )}

        {/* Add-ons */}
        {seatTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>
              Seats ({selectedSeatPrices.length} item{selectedSeatPrices.length !== 1 ? 's' : ''})
            </span>
            <span>
              {currency} {seatTotal.toFixed(2)}
            </span>
          </div>
        )}

        {mealTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>
              Meals ({totalMealItems} item{totalMealItems !== 1 ? 's' : ''})
            </span>
            <span>
              {currency} {mealTotal.toFixed(2)}
            </span>
          </div>
        )}

        {baggageTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span>
              Baggage ({totalBaggageItems} item{totalBaggageItems !== 1 ? 's' : ''})
            </span>
            <span>
              {currency} {baggageTotal.toFixed(2)}
            </span>
          </div>
        )}

        {/* Add-ons Total */}
        <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
          <span className="font-medium">Add-ons Total</span>
          <span className="font-medium">
            {currency} {displayAddonsTotal.toFixed(2)}
          </span>
        </div>

        {/* 🔥 FIX: Markup - Now prominently displayed with better styling */}
        {markupAmount > 0 && (
          <>
            <div className="flex justify-between text-sm py-2 bg-amber-50 px-3 rounded-lg border border-amber-200">
              <span className="font-semibold text-amber-700">✨ Service Fee (Markup)</span>
              <span className="font-semibold text-amber-700">
                {currency} {markupAmount.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-400 italic text-center">
              Service fee includes platform charges and processing fees
            </div>
          </>
        )}
      </div>

      {/* Grand Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between mb-4">
          <span className="font-bold text-lg">Total Amount</span>
          <span className="text-xl font-bold text-blue-600">
            {currency} {grandTotal.toFixed(2)}
          </span>
        </div>

        {/* {walletData && (
          <div className="mt-3 mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700 font-medium">Wallet Balance</span>
              <span className="text-sm font-semibold text-green-600">
                {currency} {(walletData?.balance || 0).toFixed(2)}
              </span>
            </div>
          </div>
        )} */}

        {bookingError && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{bookingError}</p>
          </div>
        )}

        {/* Hold Booking Checkbox */}
        {/* {!isConfirmationPage && (
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={holdBooking}
                            onChange={(e) => setHoldBooking(e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <span className="font-medium text-gray-900">Hold Booking</span>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Confirm booking without immediate payment. Payment can be completed later.
                            </p>
                        </div>
                    </label>
                )} */}

        <Button
          onClick={handleContinue}
          disabled={isProcessing}
          className="mt-6 h-11 w-full px-6 font-semibold"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Processing...
            </span>
          ) : isConfirmationPage ? (
            'Confirm & Book'
          ) : (
            'Continue to Payment'
          )}
        </Button>
      </div>
    </div>
  );
}
