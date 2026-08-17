// extracter.helper.ts

export const extractSeatPrice = (seatId: string, segmentId: string): number => {
  const seatMapData = JSON.parse(sessionStorage.getItem('seatMapResponse') || '{}');

  // Try new API structure first
  if (seatMapData?.data?.tripSeatMap?.tripSeat) {
    const tripSeat = seatMapData.data.tripSeatMap.tripSeat;
    const segmentData = tripSeat[segmentId];
    if (segmentData?.sInfo && Array.isArray(segmentData.sInfo)) {
      const seat = segmentData.sInfo.find((s: any) => s.seatNo === seatId);
      if (seat) {
        const price = seat.amount || 0;
        console.log(`Seat ${seatId} on segment ${segmentId}: ₹${price}`);
        return price;
      }
    }
  }

  // Fallback to old structure
  const flights = seatMapData?.data?.flights || [];
  for (const flight of flights) {
    if (flight.segmentId !== segmentId) continue;
    const rows = flight.seatMap?.rows || [];
    for (const row of rows) {
      const seat = row.seats?.find((s: any) => s.seatNo === seatId);
      if (seat) {
        const price = seat.price || seat.amount || 0;
        console.log(`Seat ${seatId} on segment ${segmentId}: ₹${price}`);
        return price;
      }
    }
  }
  console.warn(`Seat ${seatId} on segment ${segmentId} not found, using 0`);
  return 0;
};

export const extractMealPrice = (mealId: string, segmentId: string, priceData: any): number => {
  // First try to get from mealsBySegment in sessionStorage (set by getMealsAndBaggages API)
  const mealsBySegment = JSON.parse(sessionStorage.getItem('mealsBySegment') || '{}');
  const segmentMeals = mealsBySegment[segmentId] || [];

  // Extract index from mealId (format: meal_segmentId_index)
  const match = mealId.match(/meal_.*_(\d+)$/);
  if (match && match[1]) {
    const index = parseInt(match[1]);
    if (segmentMeals[index]) {
      const price = segmentMeals[index].price || segmentMeals[index].amount || 0;
      console.log(`Meal ${mealId} on segment ${segmentId} from mealsBySegment: ₹${price}`);
      return price;
    }
  }

  // Fallback to priceData (for backward compatibility)
  const flights = priceData?.data?.flights || [];
  for (const flight of flights) {
    if (flight.segmentId !== segmentId) continue;
    const fareOptions = flight.fareOptions?.[0];
    if (!fareOptions?.meals) continue;
    const segmentMealsData = fareOptions.meals[segmentId];
    if (!segmentMealsData) continue;

    if (match && match[1]) {
      const idx = parseInt(match[1]);
      if (segmentMealsData[idx]) {
        const price = segmentMealsData[idx].amount || segmentMealsData[idx].price || 0;
        console.log(`Meal ${mealId} on segment ${segmentId} from priceData: ₹${price}`);
        return price;
      }
    }
  }

  console.warn(`Meal ${mealId} on segment ${segmentId} not found in any source, using 0`);
  return 0;
};

export const extractBaggagePrice = (
  baggageId: string,
  segmentId: string,
  priceData: any,
): number => {
  // First try to get from baggageBySegment in sessionStorage (set by getMealsAndBaggages API)
  const baggageBySegment = JSON.parse(sessionStorage.getItem('baggageBySegment') || '{}');
  const segmentBaggage = baggageBySegment[segmentId] || [];

  // Extract index from baggageId (format: baggage_segmentId_index)
  const match = baggageId.match(/baggage_.*_(\d+)$/);
  if (match && match[1]) {
    const index = parseInt(match[1]);
    if (segmentBaggage[index]) {
      const price = segmentBaggage[index].price || segmentBaggage[index].amount || 0;
      console.log(`Baggage ${baggageId} on segment ${segmentId} from baggageBySegment: ₹${price}`);
      return price;
    }
  }

  // Fallback to priceData (for backward compatibility)
  const flights = priceData?.data?.flights || [];
  for (const flight of flights) {
    if (flight.segmentId !== segmentId) continue;
    const fareOptions = flight.fareOptions?.[0];
    if (!fareOptions?.baggageOptions) continue;
    const segmentBaggageData = fareOptions.baggageOptions[segmentId];
    if (!segmentBaggageData) continue;

    if (match && match[1]) {
      const idx = parseInt(match[1]);
      if (segmentBaggageData[idx]) {
        const price = segmentBaggageData[idx].amount || segmentBaggageData[idx].price || 0;
        console.log(`Baggage ${baggageId} on segment ${segmentId} from priceData: ₹${price}`);
        return price;
      }
    }
  }

  console.warn(`Baggage ${baggageId} on segment ${segmentId} not found, using 0`);
  return 0;
};

export const calculateTotalBaseFare = (priceData: any, reviewData?: any): number => {
  // Try priceData first
  let totalFare =
    priceData?.data?.totalPrice?.totalFare ||
    priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare ||
    0;

  // If not found in priceData, try reviewData
  if (totalFare === 0 && reviewData) {
    totalFare =
      reviewData?.mappedData?.totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare || 0;
  }

  console.log(`Total Base Fare: ₹${totalFare}`);
  return totalFare;
};

export const calculateSeatTotal = (
  selectedSeatPrices: Array<{
    seatId: string;
    price: number;
    segmentId?: string;
    seatNumber?: string;
  }>,
): number => {
  let total = 0;
  for (const seat of selectedSeatPrices) {
    total += seat.price || 0;
  }
  console.log(`Seat Total from selectedSeatPrices: ₹${total}`);
  return total;
};

export const calculateMealTotal = (
  selectedMealsPerTravelerPerSegment: any,
  priceData: any,
): { total: number; itemCount: number } => {
  let total = 0;
  let itemCount = 0;

  console.log(
    'Calculating meal total with data:',
    JSON.stringify(selectedMealsPerTravelerPerSegment, null, 2),
  );

  Object.values(selectedMealsPerTravelerPerSegment).forEach((travelerSelections: any) => {
    Object.entries(travelerSelections || {}).forEach(([segmentId, segmentMeals]: [string, any]) => {
      Object.entries(segmentMeals || {}).forEach(([mealId, quantity]: [string, any]) => {
        if (quantity <= 0) return;
        const price = extractMealPrice(mealId, segmentId, priceData);
        if (price > 0) {
          const itemTotal = price * quantity;
          total += itemTotal;
          itemCount += quantity;
          console.log(`  Added ${mealId}: ₹${price} x ${quantity} = ₹${itemTotal}`);
        } else {
          console.warn(`  No price found for ${mealId}, skipping`);
        }
      });
    });
  });

  console.log(`Meal Total: ₹${total} (${itemCount} items)`);
  return { total, itemCount };
};

export const calculateBaggageTotal = (
  selectedBaggagePerTravelerPerSegment: any,
  priceData: any,
): { total: number; itemCount: number } => {
  let total = 0;
  let itemCount = 0;

  console.log(
    'Calculating baggage total with data:',
    JSON.stringify(selectedBaggagePerTravelerPerSegment, null, 2),
  );

  Object.values(selectedBaggagePerTravelerPerSegment).forEach((travelerSelections: any) => {
    Object.entries(travelerSelections || {}).forEach(
      ([segmentId, segmentBaggage]: [string, any]) => {
        Object.entries(segmentBaggage || {}).forEach(([baggageId, quantity]: [string, any]) => {
          if (quantity <= 0) return;
          const price = extractBaggagePrice(baggageId, segmentId, priceData);
          if (price > 0) {
            const itemTotal = price * quantity;
            total += itemTotal;
            itemCount += quantity;
            console.log(`  Added ${baggageId}: ₹${price} x ${quantity} = ₹${itemTotal}`);
          } else {
            console.warn(`  No price found for ${baggageId}, skipping`);
          }
        });
      },
    );
  });

  console.log(`Baggage Total: ₹${total} (${itemCount} items)`);
  return { total, itemCount };
};
