// components/MobileMealItem.tsx
import React from 'react';

interface MealItemProps {
  name: string;
  price: string;
  onAdd?: () => void;
  isSelected?: boolean;
}

const MobileMealItem: React.FC<MealItemProps> = ({ name, price, onAdd, isSelected = false }) => {
  return (
    <div
      className={`block md:hidden lg:hidden rounded-lg p-3 sm:p-4 mb-2 transition-all duration-200 ${
        isSelected ? 'bg-blue-50 border border-primary' : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm sm:text-base font-semibold text-gray-800">{name}</span>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <span className="text-xs sm:text-sm font-bold text-gray-800">INR {price}</span>
          <button
            onClick={onAdd}
            className={`px-3 sm:px-4 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-primary text-white hover:bg-primary'
                : 'text-primary border border-[#ECBDBD] hover:bg-[#ECBDBD] hover:text-white'
            }`}
          >
            {isSelected ? '✓ ADDED' : '+ ADD'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMealItem;
