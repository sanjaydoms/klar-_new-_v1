import React from 'react';
import { IndianRupee } from 'lucide-react';

interface PriceInformationProps {
  price: {
    baseFare: number;
    taxesAndFees: number;
    commission: number;
    commissionTDS: number;
    total: number;
  };
}

export default function PriceInformation({ price }: PriceInformationProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="bg-white shadow-lg p-6 mt-4 rounded-b-lg">
      <h2 className="text-lg font-bold text-gray-800 mb-4">Price Information</h2>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Base Fare</span>
          <span className="font-semibold text-gray-800">{formatCurrency(price.baseFare)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Taxes & Fees</span>
          <span className="font-semibold text-gray-800">{formatCurrency(price.taxesAndFees)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Commission</span>
          <span className="font-semibold text-gray-800">{formatCurrency(price.commission)}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">Commission TDS</span>
          <span className="font-semibold text-gray-800">{formatCurrency(price.commissionTDS)}</span>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 mt-2 border-t-2 border-gray-200">
          <span className="text-lg font-bold text-gray-800">Total Amount</span>
          <span className="text-xl font-bold text-blue-600">{formatCurrency(price.total)}</span>
        </div>
      </div>
    </div>
  );
}
