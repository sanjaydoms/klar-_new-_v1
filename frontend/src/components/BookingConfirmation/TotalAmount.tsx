// components/TotalAmount.tsx
import React from 'react';

interface TotalAmountProps {
  total: number;
}

export default function TotalAmount({ total }: TotalAmountProps) {
  const formatCurrency = (amount: number) => {
    return `INR ${amount.toFixed(2)}`;
  };

  return (
    <div className="border-b border-gray-200 pb-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700">Total Amount</h2>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
