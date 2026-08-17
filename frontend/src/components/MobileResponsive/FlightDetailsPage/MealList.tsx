// components/MobileMealList.tsx
import React from 'react';
import MobileMealItem from './MealItem';

interface MealListProps {
  meals?: Array<{ name: string; price: string }>;
  onMealAdd?: (mealName: string) => void;
}

const MobileMealList: React.FC<MealListProps> = ({
  meals = [
    { name: 'Pizza', price: '2730' },
    { name: 'Burger', price: '2730' },
    { name: 'Biryani', price: '2730' },
    { name: 'Sandwich', price: '2730' },
  ],
  onMealAdd,
}) => {
  return (
    <div>
      <h3 className="text-lg font-bold text-gray-800 mb-3">Meals</h3>
      {meals.map((meal, index) => (
        <MobileMealItem
          key={index}
          name={meal.name}
          price={meal.price}
          onAdd={() => onMealAdd?.(meal.name)}
        />
      ))}
    </div>
  );
};

export default MobileMealList;
