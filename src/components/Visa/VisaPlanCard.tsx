import React from 'react';
import { Info } from 'lucide-react';

interface VisaPlanCardProps {
  title: string;
  stayPeriod: string;
  validity: string;
  price: string;
  processingTime: string;
  isRecommended?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const VisaPlanCard = ({
  title,
  stayPeriod,
  validity,
  price,
  processingTime,
  isRecommended,
  isSelected = false,
  onSelect,
}: VisaPlanCardProps) => {
  return (
    <div
      className={`w-[824px] h-[333px] bg-white rounded-[10px] p-5 border shadow-sm flex flex-col gap-4 font-sans
            ${isSelected ? 'border-[#1F2A6B] ring-1 ring-[#1F2A6B]' : 'border-gray-200'}
        `}
    >
      {/* Top Title */}
      <h3 className="text-[#101828] font-bold text-base">Plan Details</h3>

      {/* Blue Info Box */}
      <div className="bg-[#EFF6FF] rounded-lg p-4 relative h-[146px] flex flex-col justify-center">
        {isRecommended && (
          <div className="absolute top-0 right-0 bg-[#E0EAFF] text-[#2563EB] text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg uppercase tracking-wide">
            Recommended for you
          </div>
        )}

        <h4 className="text-[#101828] font-bold text-base mb-3 leading-snug">{title}</h4>

        <ol className="text-sm text-[#101828] space-y-1.5 list-decimal list-inside font-medium">
          <li>
            Stay Period: {stayPeriod} & Validity: {validity}.
          </li>
          <li>Child has to be accompanied only by their parent(s).</li>
        </ol>
      </div>

      {/* Bottom Section */}
      <div className="flex items-end justify-between pt-2">
        {/* Left Info */}
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[#101828] text-[15px]">Regular Visa</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
            <span>
              Get your visa by <span className="font-semibold text-gray-700">{processingTime}</span>
            </span>
            <Info size={13} className="text-gray-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-[#101828]">{price}</span>
            <span className="text-xs text-gray-500 font-medium">per Adult</span>
          </div>
        </div>

        {/* Right Button */}
        <button
          onClick={onSelect}
          className={`px-6 py-2.5 rounded-md text-xs font-bold tracking-wide uppercase transition-all duration-200 border
                        ${
                          isSelected
                            ? 'bg-white border-[#2563EB] text-[#2563EB]'
                            : 'bg-white border-[#2563EB] text-[#2563EB] hover:bg-blue-50'
                        }`}
        >
          {isSelected ? 'SELECTED' : 'SELECT'}
        </button>
      </div>
    </div>
  );
};

export default VisaPlanCard;
