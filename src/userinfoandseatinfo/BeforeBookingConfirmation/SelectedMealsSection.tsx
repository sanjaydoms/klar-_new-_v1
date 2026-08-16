import { Utensils } from 'lucide-react';
import { TravelerMealSelection } from '@/types/beforeBooking.type';

interface SelectedMealsSectionProps {
  selectedMeals: string[];
  selectedMealsPerTravelerPerSegment: TravelerMealSelection;
  mealOptions: any[];
}

export default function SelectedMealsSection({
  selectedMeals,
  selectedMealsPerTravelerPerSegment,
  mealOptions,
}: SelectedMealsSectionProps) {
  const getMealDescription = (mealId: string) => {
    const meal = mealOptions.find((m) => m.id === mealId || m.code === mealId);
    if (meal?.description) {
      return meal.description;
    }
    return mealId;
  };

  const mealEntries = Object.values(selectedMealsPerTravelerPerSegment).flatMap((travelerMeals) =>
    Object.values(travelerMeals).flatMap((segmentMeals) =>
      Object.entries(segmentMeals).filter(([_, qty]) => qty > 0),
    ),
  );

  if (mealEntries.length === 0 && selectedMeals.length === 0) {
    return null;
  }

  const mealsToDisplay =
    selectedMeals.length > 0
      ? selectedMeals
      : mealEntries.map(([mealId]) => getMealDescription(mealId));

  if (mealsToDisplay.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Utensils className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Selected Meals</h2>
          <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
            {mealsToDisplay.length} meal{mealsToDisplay.length > 1 ? 's' : ''}
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

        {Object.keys(selectedMealsPerTravelerPerSegment).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(selectedMealsPerTravelerPerSegment).map(([travelerIndex, segments]) => {
              const mealEntries = Object.entries(segments).flatMap(([segmentId, meals]) =>
                Object.entries(meals)
                  .filter(([_, qty]) => qty > 0)
                  .map(([mealId, qty]) => ({
                    mealId,
                    qty,
                    description: getMealDescription(mealId),
                  })),
              );

              if (mealEntries.length === 0) return null;

              return (
                <div key={travelerIndex} className="text-sm text-gray-600">
                  <span className="font-medium">Traveler {parseInt(travelerIndex) + 1}:</span>
                  {mealEntries.map((item, idx) => (
                    <span key={idx} className="ml-2">
                      {item.description} {item.qty > 1 ? `(x${item.qty})` : ''}
                      {idx < mealEntries.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
