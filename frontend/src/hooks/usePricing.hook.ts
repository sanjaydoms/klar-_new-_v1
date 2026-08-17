import { useMemo } from 'react';

export function usePricing(
  reviewData: any,
  selectedSeatPrices: any[],
  selectedMealsPerTravelerPerSegment: any,
  selectedBaggagePerTravelerPerSegment: any,
  makedPrice: number,
) {
  return useMemo(() => {
    let totalFare = 0;
    let baseFare = 0;
    let currency = 'INR';

    let taxBreakdown = {
      AGST: 0,
      ManagementFee: 0,
      ManagementFeeTax: 0,
      OtherTaxes: 0,
      YQ: 0,
    };

    const fareDetail = reviewData?.data?.mappedData?.totalPriceInfo?.totalFareDetail;

    if (fareDetail) {
      totalFare = fareDetail.FareComponents?.TotalFare || 0;
      baseFare = fareDetail.FareComponents?.BaseFare || 0;

      const additional = fareDetail.AdditionalFareComponents?.TotalAdditionalFare || {};

      taxBreakdown = {
        AGST: additional.AGST || 0,
        ManagementFee: additional.ManagementFee || 0,
        ManagementFeeTax: additional.ManagementFeeTax || 0,
        OtherTaxes: additional.OtherTaxes || 0,
        YQ: additional.YQ || 0,
      };
    }

    const seatTotal = selectedSeatPrices.reduce((sum, item) => sum + (item.price || 0), 0);

    let mealTotal = 0;
    let baggageTotal = 0;

    const trips = reviewData?.data?.mappedData?.TripInformation || [];

    Object.values(selectedMealsPerTravelerPerSegment).forEach((travelerSelections: any) => {
      Object.entries(travelerSelections || {}).forEach(([segmentId, segmentMeals]: any) => {
        Object.entries(segmentMeals || {}).forEach(([mealId, quantity]: any) => {
          if (quantity <= 0) return;

          for (const trip of trips) {
            const segment = trip.SegmentInformation?.find((s: any) => s.SegmentID === segmentId);
            const mealOption = segment?.ssrInfo?.MEAL?.find(
              (m: any, idx: number) => `meal_${segmentId}_${idx}` === mealId,
            );
            if (mealOption) {
              mealTotal += (mealOption.amount || 0) * quantity;
              break;
            }
          }
        });
      });
    });

    Object.values(selectedBaggagePerTravelerPerSegment).forEach((travelerSelections: any) => {
      Object.entries(travelerSelections || {}).forEach(([segmentId, segmentBaggage]: any) => {
        Object.entries(segmentBaggage || {}).forEach(([baggageId, quantity]: any) => {
          if (quantity <= 0) return;

          for (const trip of trips) {
            const segment = trip.SegmentInformation?.find((s: any) => s.SegmentID === segmentId);
            const baggageOption = segment?.ssrInfo?.BAGGAGE?.find(
              (b: any, idx: number) => `baggage_${segmentId}_${idx}` === baggageId,
            );
            if (baggageOption) {
              baggageTotal += (baggageOption.amount || 0) * quantity;
              break;
            }
          }
        });
      });
    });

    const addonsTotal = seatTotal + mealTotal + baggageTotal;
    const grandTotal = totalFare + addonsTotal + (makedPrice || 0);

    return {
      totalFare,
      baseFare,
      currency,
      taxBreakdown,
      seatTotal,
      mealTotal,
      baggageTotal,
      addonsTotal,
      grandTotal,
    };
  }, [
    reviewData,
    selectedSeatPrices,
    selectedMealsPerTravelerPerSegment,
    selectedBaggagePerTravelerPerSegment,
    makedPrice,
  ]);
}
