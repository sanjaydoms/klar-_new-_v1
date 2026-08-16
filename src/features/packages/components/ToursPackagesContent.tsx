import React from 'react';

interface ToursPackagesContentProps {
  destination: string;
  departureDate: string;
  returnDate: string;
  onDestinationChange: (value: string) => void;
  onDepartureChange: (value: string) => void;
  onReturnChange: (value: string) => void;
  onSearch: () => void;
}

const ToursPackagesContent: React.FC<ToursPackagesContentProps> = ({
  destination,
  departureDate,
  returnDate,
  onDestinationChange,
  onDepartureChange,
  onReturnChange,
  onSearch,
}) => {
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Tours & Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Destination"
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="date"
          value={departureDate}
          onChange={(e) => onDepartureChange(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <input
          type="date"
          value={returnDate}
          onChange={(e) => onReturnChange(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>
      <button
        onClick={onSearch}
        className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        Search Packages
      </button>
    </div>
  );
};

export default ToursPackagesContent;
