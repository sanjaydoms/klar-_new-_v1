import React from 'react';

interface PriceInformationProps {
  priceInfo?: {
    baseFare: number;
    totalFare: number;
    taxesFees: number;
    managementFee: number;
    managementFeeTax: number;
    totalAdditionalFare: number;
  };
  currency?: string;
}

const MobilePriceInformation: React.FC<PriceInformationProps> = ({
  priceInfo,
  currency = 'INR',
}) => {
  if (!priceInfo) {
    return (
      <div className="bg-white rounded-xl border border-[#E7E2D9] p-5">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Price Information</h3>
        <p className="text-sm text-gray-500 text-center py-4">No price information available</p>
      </div>
    );
  }

  const formatPrice = (amount: number) => {
    return amount.toFixed(2);
  };

  return (
    <div className="bg-white rounded-xl border border-[#E7E2D9] p-5">
      {/* <h3 className="text-lg font-bold text-gray-800 mb-4">Price Information</h3> */}

      {/* <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Base Fare</span>
          <span className="text-sm font-semibold text-gray-800">
            {currency} {formatPrice(priceInfo.baseFare)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Seat / Meal / Extra Baggage</span>
          <span className="text-sm font-semibold text-gray-800">{currency} 0.00</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Insurance</span>
          <span className="text-sm font-semibold text-gray-800">{currency} 0.00</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Taxes & Fees</span>
          <span className="text-sm font-semibold text-gray-800">
            {currency} {formatPrice(priceInfo.taxesFees)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Management Fee</span>
          <span className="text-sm font-semibold text-gray-800">
            {currency} {formatPrice(priceInfo.managementFee)}
          </span>
        </div>
      </div> */}

      <div className="border-t border-[#E7E2D9] my-4"></div>

      <div className="flex justify-between items-center">
        <span className="text-base font-bold text-gray-800">Total Amount</span>
        <span className="text-xl font-bold text-[#EF4444]">
          {currency} {formatPrice(priceInfo.totalFare)}
        </span>
      </div>
    </div>
  );
};

export default MobilePriceInformation;
