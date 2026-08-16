import React from 'react';

interface OnewayFlightSearchEditSectionProps {
  tripDetails: {
    date: string;
    travellers: Array<{ type: 'adult' | 'child' | 'infant'; count: number }>;
    class: string;
  };
  from: string;
  to: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTravellerChange: (type: 'adult' | 'child' | 'infant', value: number) => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const OnewayFlightSearchEditSection: React.FC<OnewayFlightSearchEditSectionProps> = ({
  tripDetails,
  from,
  to,
  onDateChange,
  onTravellerChange,
  onClassChange,
  onFromChange,
  onToChange,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      {/* From and To Inputs */}
      <div className="flex items-center space-x-2 flex-wrap">
        <div className="flex items-center space-x-1">
          <label className="text-[10px] sm:text-xs text-gray-600 font-medium">From:</label>
          <input
            type="text"
            value={from}
            onChange={onFromChange}
            placeholder="Departure city"
            className="text-xs sm:text-sm text-gray-700 border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 w-20 sm:w-28 focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-gray-400 text-sm">→</span>
        <div className="flex items-center space-x-1">
          <label className="text-[10px] sm:text-xs text-gray-600 font-medium">To:</label>
          <input
            type="text"
            value={to}
            onChange={onToChange}
            placeholder="Arrival city"
            className="text-xs sm:text-sm text-gray-700 border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 w-20 sm:w-28 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Date Input */}
      <div className="flex items-center space-x-2 flex-wrap">
        <input
          type="date"
          value={tripDetails.date}
          onChange={onDateChange}
          className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 w-32 sm:w-40 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Travellers and Class */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
        {tripDetails.travellers.map((traveller) => (
          <div key={traveller.type} className="flex items-center space-x-1">
            <label className="text-[10px] sm:text-xs text-gray-600 capitalize">
              {traveller.type}s:
            </label>
            <select
              value={traveller.count}
              onChange={(e) => onTravellerChange(traveller.type, Number(e.target.value))}
              className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1 sm:px-2 py-0.5 sm:py-1 w-12 sm:w-16 focus:outline-none focus:border-blue-500"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        ))}
        <span className="text-gray-400">•</span>
        <select
          value={tripDetails.class}
          onChange={onClassChange}
          className="text-xs sm:text-sm text-gray-500 border border-gray-300 rounded px-1 sm:px-2 py-0.5 sm:py-1 w-24 sm:w-32 focus:outline-none focus:border-blue-500"
        >
          <option value="Economy">Economy</option>
          <option value="Premium Economy">Premium Economy</option>
          <option value="Business">Business</option>
          <option value="First Class">First Class</option>
        </select>
      </div>
    </div>
  );
};

export default OnewayFlightSearchEditSection;
