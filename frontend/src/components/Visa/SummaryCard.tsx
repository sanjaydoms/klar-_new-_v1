import React from 'react';

interface SummaryCardProps {
  onContinue?: () => void;
  destination?: string;
  travellerCount?: number;
  dates?: string;
  basePrice?: number;
  feePrice?: number;
  currency?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  onContinue,
  destination = 'United Arab Emirates',
  travellerCount = 1,
  dates = '13 Jan - 31 Jan',
  basePrice = 6900,
  feePrice = 999,
  currency = '₹',
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 sticky top-8">
      <h2 className="text-xl font-bold text-[#101828] mb-6">Summary</h2>

      {/* Destination Info */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 rounded-lg border border-gray-100 flex items-center justify-center shrink-0 p-1">
          {/* Placeholder for Airline/Country Logo - Using a generic plane icon for now or text */}
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Emirates_logo.svg"
            alt="Emirates"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              ((e.target as HTMLImageElement).parentElement as HTMLElement).innerText = '🇦🇪';
            }}
          />
        </div>
        <div>
          <h3 className="font-bold text-[#101828] text-base">{destination}</h3>
          <p className="text-gray-500 text-sm mt-1">
            {travellerCount} Traveller • {dates}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-200 my-6"></div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-[#101828]">
            {currency} {basePrice.toLocaleString()}
          </span>
          <span className="text-gray-500 text-sm font-medium">
            + {currency} {feePrice} service fees
          </span>
        </div>
        <p className="text-gray-500 text-xs">Final Price for {travellerCount} Adult</p>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="w-full bg-[#8EA3B7] hover:bg-[#7D91A5] text-white font-bold py-3.5 rounded-lg text-sm transition-colors uppercase tracking-wide"
      >
        Continue
      </button>
    </div>
  );
};

export default SummaryCard;
