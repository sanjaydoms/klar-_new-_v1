import React from 'react';
import { Calendar, Utensils, Package } from 'lucide-react';
import {
  SelectedSeatDetails,
  TravelerSeatSelection,
  TravelerMealSelection,
  TravelerBaggageSelection,
} from '@/types/beforeBooking.type';

interface SelectedAddonsSectionProps {
  // Seats
  selectedSeats: string[];
  selectedSeatsPerTravelerPerSegment: TravelerSeatSelection;
  selectedSeatPrices: SelectedSeatDetails[];

  // Meals
  selectedMeals: string[];
  selectedMealsPerTravelerPerSegment: TravelerMealSelection;
  mealOptions: any[];

  // Baggage
  selectedBaggage: string[];
  selectedBaggagePerTravelerPerSegment: TravelerBaggageSelection;
  baggageOptions: any[];
}

export default function SelectedAddonsSection({
  selectedSeats,
  selectedSeatsPerTravelerPerSegment,
  selectedSeatPrices,
  selectedMeals,
  selectedMealsPerTravelerPerSegment,
  mealOptions,
  selectedBaggage,
  selectedBaggagePerTravelerPerSegment,
  baggageOptions,
}: SelectedAddonsSectionProps) {
  // Get seat label from seat ID
  const getSeatLabel = (seatId: string) => {
    const seatDetail = selectedSeatPrices.find(
      (s) => s.seatId === seatId || s.seatNumber === seatId,
    );
    if (seatDetail?.seatNumber) {
      return seatDetail.seatNumber;
    }
    return seatId;
  };

  // Get meal description from meal ID
  const getMealDescription = (mealId: string) => {
    const meal = mealOptions.find((m) => m.id === mealId || m.code === mealId);
    if (meal?.description) {
      return meal.description;
    }
    return mealId;
  };

  // Get baggage description from baggage ID
  const getBaggageDescription = (baggageId: string) => {
    const baggage = baggageOptions.find((b) => b.id === baggageId || b.code === baggageId);
    if (baggage?.description) {
      return baggage.description;
    }
    return baggageId;
  };

  // Check if there's any data to display
  const hasSeats =
    selectedSeats.length > 0 || Object.keys(selectedSeatsPerTravelerPerSegment).length > 0;
  const hasMeals =
    selectedMeals.length > 0 || Object.keys(selectedMealsPerTravelerPerSegment).length > 0;
  const hasBaggage =
    selectedBaggage.length > 0 || Object.keys(selectedBaggagePerTravelerPerSegment).length > 0;

  if (!hasSeats && !hasMeals && !hasBaggage) {
    return null;
  }

  // Get seats to display
  const seatsToDisplay =
    selectedSeats.length > 0
      ? selectedSeats
      : Object.values(selectedSeatsPerTravelerPerSegment).flatMap((travelerSeats) =>
          Object.values(travelerSeats).filter(Boolean),
        );

  // Get meals to display
  const mealEntries = Object.values(selectedMealsPerTravelerPerSegment).flatMap((travelerMeals) =>
    Object.values(travelerMeals).flatMap((segmentMeals) =>
      Object.entries(segmentMeals).filter(([_, qty]) => qty > 0),
    ),
  );
  const mealsToDisplay =
    selectedMeals.length > 0
      ? selectedMeals
      : mealEntries.map(([mealId]) => getMealDescription(mealId));

  // Get baggage to display
  const baggageEntries = Object.values(selectedBaggagePerTravelerPerSegment).flatMap(
    (travelerBaggage) =>
      Object.values(travelerBaggage).flatMap((segmentBaggage) =>
        Object.entries(segmentBaggage).filter(([_, qty]) => qty > 0),
      ),
  );
  const baggageToDisplay =
    selectedBaggage.length > 0
      ? selectedBaggage
      : baggageEntries.map(([baggageId]) => getBaggageDescription(baggageId));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Add-ons</h2>

        <div className="space-y-4">
          {/* Seats Row */}
          {hasSeats && seatsToDisplay.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Seats</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {seatsToDisplay.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {seatsToDisplay.map((seat, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                  >
                    {getSeatLabel(seat)}
                  </span>
                ))}
              </div>
              {/* Show per-traveler seat details if available */}
              {Object.keys(selectedSeatsPerTravelerPerSegment).length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {Object.entries(selectedSeatsPerTravelerPerSegment).map(
                    ([travelerIndex, segments]) => {
                      const seatEntries = Object.entries(segments).filter(([_, seatId]) => seatId);
                      if (seatEntries.length === 0) return null;
                      return (
                        <span key={travelerIndex} className="mr-3">
                          Traveler {parseInt(travelerIndex) + 1}:{' '}
                          {seatEntries
                            .map(([_, seatId]) => getSeatLabel(seatId as string))
                            .join(', ')}
                        </span>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}

          {/* Meals Row */}
          {hasMeals && mealsToDisplay.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Meals</span>
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  {mealsToDisplay.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mealsToDisplay.map((meal, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200"
                  >
                    {meal}
                  </span>
                ))}
              </div>
              {/* Show per-traveler meal details if available */}
              {Object.keys(selectedMealsPerTravelerPerSegment).length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {Object.entries(selectedMealsPerTravelerPerSegment).map(
                    ([travelerIndex, segments]) => {
                      const mealEntries = Object.entries(segments).flatMap(([segmentId, meals]) =>
                        Object.entries(meals)
                          .filter(([_, qty]) => qty > 0)
                          .map(([mealId, qty]) => ({
                            description: getMealDescription(mealId),
                            qty,
                          })),
                      );
                      if (mealEntries.length === 0) return null;
                      return (
                        <span key={travelerIndex} className="mr-3">
                          Traveler {parseInt(travelerIndex) + 1}:{' '}
                          {mealEntries
                            .map(
                              (item) =>
                                `${item.description}${item.qty > 1 ? `(x${item.qty})` : ''}`,
                            )
                            .join(', ')}
                        </span>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}

          {/* Baggage Row */}
          {hasBaggage && baggageToDisplay.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Baggage</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                  {baggageToDisplay.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {baggageToDisplay.map((baggage, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                  >
                    {baggage}
                  </span>
                ))}
              </div>
              {/* Show per-traveler baggage details if available */}
              {Object.keys(selectedBaggagePerTravelerPerSegment).length > 0 && (
                <div className="mt-1 text-xs text-gray-500">
                  {Object.entries(selectedBaggagePerTravelerPerSegment).map(
                    ([travelerIndex, segments]) => {
                      const baggageEntries = Object.entries(segments).flatMap(
                        ([segmentId, baggage]) =>
                          Object.entries(baggage)
                            .filter(([_, qty]) => qty > 0)
                            .map(([baggageId, qty]) => ({
                              description: getBaggageDescription(baggageId),
                              qty,
                            })),
                      );
                      if (baggageEntries.length === 0) return null;
                      return (
                        <span key={travelerIndex} className="mr-3">
                          Traveler {parseInt(travelerIndex) + 1}:{' '}
                          {baggageEntries
                            .map(
                              (item) =>
                                `${item.description}${item.qty > 1 ? `(x${item.qty})` : ''}`,
                            )
                            .join(', ')}
                        </span>
                      );
                    },
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
