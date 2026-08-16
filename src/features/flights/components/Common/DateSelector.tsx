import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateItem {
  dayName: string;
  monthName: string;
  day: number;
  price: number;
  dateStr: string;
  isSelected: boolean;
}

export interface DateSelectorProps {
  dates: DateItem[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export default function DateSelector({ dates, selectedDate, onSelectDate }: DateSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-6 mt-6 flex items-center justify-between">
      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors">
        <ChevronLeft size={20} />
      </button>

      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 overflow-x-auto">
        {dates.map((item, index) => (
          <div
            key={index}
            onClick={() => onSelectDate(item.dateStr)}
            className={`
              flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition-all
              ${
                item.isSelected
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : 'hover:bg-gray-50 text-gray-600'
              }
            `}
          >
            <span
              className={`text-[10px] font-bold uppercase mb-1 ${item.isSelected ? 'text-blue-100' : 'text-gray-400'}`}
            >
              {item.dayName}
            </span>
            <span className="text-sm font-bold mb-1">
              {item.day} {item.monthName}
            </span>
            <span className={`text-xs ${item.isSelected ? 'text-white' : 'text-gray-500'}`}>
              ₹ {item.price.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>

      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
