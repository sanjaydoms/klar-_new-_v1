import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateStripProps {
  onSelectDate?: () => void;
}

const DateStrip: React.FC<DateStripProps> = ({ onSelectDate }) => {
  const dates = [
    { day: 'Mon', date: 'Dec 1', price: '₹ 9,499' },
    { day: 'Tue', date: 'Dec 2', price: '₹ 7,899' },
    { day: 'Wed', date: 'Dec 3', price: '₹ 6,299', active: true },
    { day: 'Thu', date: 'Dec 4', price: '₹ 7,199' },
    { day: 'Fri', date: 'Dec 5', price: '₹ 9,999' },
    { day: 'Sat', date: 'Dec 6', price: '₹ 11,299' },
    { day: 'Sun', date: 'Dec 7', price: '₹ 8,799' },
  ];

  const handleDateClick = () => {
    if (onSelectDate) onSelectDate();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 mb-6 flex items-center justify-between">
      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full">
        <ChevronLeft size={20} />
      </button>

      <div className="flex-1 grid grid-cols-7 gap-2">
        {dates.map((item, index) => (
          <div
            key={index}
            onClick={handleDateClick}
            className={`
                            flex flex-col items-center justify-center py-3 rounded-lg cursor-pointer transition-all
                            ${
                              item.active
                                ? 'bg-black text-white shadow-md transform scale-105'
                                : 'hover:bg-gray-50 text-gray-600'
                            }
                        `}
          >
            <span
              className={`text-[10px] font-bold uppercase mb-1 ${item.active ? 'text-gray-300' : 'text-gray-400'}`}
            >
              {item.day}
            </span>
            <span className="text-sm font-bold mb-1">{item.date}</span>
            <span className={`text-xs ${item.active ? 'text-yellow-400' : 'text-gray-500'}`}>
              {item.price}
            </span>
          </div>
        ))}
      </div>

      <button className="p-2 text-gray-400 hover:text-gray-800 hover:bg-gray-50 rounded-full">
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

export default DateStrip;
