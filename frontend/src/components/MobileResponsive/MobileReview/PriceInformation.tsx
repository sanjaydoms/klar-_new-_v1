import React, { useState, useEffect } from 'react';

interface PriceInformationProps {
  baseFare?: string;
  seatMealBaggage?: string;
  insurance?: string;
  taxesFees?: string;
  additionalMarkup?: string;
  additionalDiscount?: string;
  totalAmount?: string;
  payAmount?: string;
  currency?: string;
}

const PriceInformation: React.FC<PriceInformationProps> = ({
  baseFare = '',
  seatMealBaggage = '',
  insurance = '',
  taxesFees = '',
  totalAmount = '',
  payAmount = '',
  currency = 'INR',
}) => {
  const [markup, setMarkup] = useState(0);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    console.log('💰 PriceInformation component mounted');
    console.log('💰 Props received:', {
      baseFare,
      seatMealBaggage,
      insurance,
      taxesFees,
      totalAmount,
      payAmount,
      currency,
    });
  }, []);

  const handleMarkupChange = (newMarkup: number) => {
    console.log('💰 Markup changed:', newMarkup);
    setMarkup(newMarkup);
    // Store markup in session storage for use in payment page
    sessionStorage.setItem('markupPrice', JSON.stringify(newMarkup));
  };

  const handleDiscountChange = (newDiscount: number) => {
    console.log('💰 Discount changed:', newDiscount);
    setDiscount(newDiscount);
  };

  return (
    <div className="block md:hidden lg:hidden bg-white rounded-xl border border-[#E7E2D9] p-4 sm:p-5 mb-4">
      <h3 className="text-xs sm:text-sm font-semibold text-gray-600 mb-3">Price Information</h3>

      {/* <div className="space-y-2">
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500">Base Fare</span>
          <span className="text-gray-800 font-medium">
            {currency} {baseFare}
          </span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500">Seat / Meal / Baggage</span>
          <span className="text-gray-800 font-medium">
            {currency} {seatMealBaggage}
          </span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500">Insurance</span>
          <span className="text-gray-800 font-medium">
            {currency} {insurance}
          </span>
        </div>
        <div className="flex justify-between text-xs sm:text-sm">
          <span className="text-gray-500">Taxes & Fees</span>
          <span className="text-gray-800 font-medium">
            {currency} {taxesFees}
          </span>
        </div>
      </div> */}

      {/* Additional Markup */}
      {/* <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs sm:text-sm text-gray-500">Additional Markup</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMarkupChange(Math.max(0, markup - 1))}
            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold">-</span>
          </button>
          <span className="text-sm font-medium text-gray-800 w-4 text-center">{markup}</span>
          <button
            onClick={() => handleMarkupChange(markup + 1)}
            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold">+</span>
          </button>
        </div>
      </div> */}

      {/* Additional Discount */}
      {/* <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs sm:text-sm text-gray-500">Additional Discount</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDiscountChange(Math.max(0, discount - 1))}
            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold">-</span>
          </button>
          <span className="text-sm font-medium text-gray-800 w-4 text-center">{discount}</span>
          <button
            onClick={() => handleDiscountChange(discount + 1)}
            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-bold">+</span>
          </button>
        </div>
      </div> */}

      {/* Total Amount */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
        <span className="text-sm sm:text-base font-bold text-gray-800">Total Amount</span>
        <span className="text-lg sm:text-xl font-bold text-[#EF4444]">
          {currency} {totalAmount}
        </span>
      </div>

      {/* Pay Amount - Optional */}
      {payAmount && (
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-dashed border-gray-200">
          <span className="text-xs sm:text-sm font-semibold text-gray-700">Pay Amount</span>
          <span className="text-base sm:text-lg font-bold text-primary">
            {currency} {payAmount}
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceInformation;
