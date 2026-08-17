// components/PriceInformation.tsx
import React from 'react';

interface PriceInformationProps {
  pricing: {
    baseFare: number;
    taxes: number;
    commission: number;
    commissionTDS: number;
    total: number;
  };
}

export default function PriceInformation({ pricing }: PriceInformationProps) {
  const formatCurrency = (amount: number) => {
    return `INR ${amount.toFixed(2)}`;
  };

  return (
    <div className="border-b border-gray-200 pb-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-3 ml-4">Price Information</h2>
      <div className="rounded-xl p-4 space-y-2 max-w-sm ml-4">
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Base Fare</span>
          <span className="font-medium">{formatCurrency(pricing.baseFare)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Taxes & Fees</span>
          <span className="font-medium">{formatCurrency(pricing.taxes)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Commission</span>
          <span className="font-medium text-green-600">{formatCurrency(pricing.commission)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-gray-600">Commission TDS</span>
          <span className="font-medium text-red-600">-{formatCurrency(pricing.commissionTDS)}</span>
        </div>

        {/* Total Amount Section */}
        <div className="mt-4 pt-4 ">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 -mx-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-700">Total Amount</h2>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(pricing.total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
