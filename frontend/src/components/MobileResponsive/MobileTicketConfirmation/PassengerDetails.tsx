// components/PassengerDetails.tsx
import React from 'react';

interface PassengerDetailsProps {
  passengerName?: string;
  agent?: string;
}

const PassengerDetails: React.FC<PassengerDetailsProps> = ({
  passengerName = 'Michael Chen',
  agent = 'Agent',
}) => {
  return (
    <div className="block md:hidden lg:hidden bg-white rounded-xl border border-[#E7E2D9] p-5 mb-4">
      <h3 className="text-sm font-semibold text-gray-600 mb-3">PASSENGER DETAILS</h3>
      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-gray-800">{passengerName}</span>
        <span className="text-sm text-gray-500">{agent}</span>
      </div>
    </div>
  );
};

export default PassengerDetails;
