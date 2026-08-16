import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface VisaCardProps {
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
  icon: LucideIcon;
}

const VisaCard = ({ title, description, isActive, onClick, icon: Icon }: VisaCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`
        relative flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all duration-300 ease-out group
        ${
          isActive
            ? 'bg-white border-[#1F2A6B] shadow-md ring-1 ring-[#1F2A6B] scale-[1.005]'
            : 'bg-white border-gray-200 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300'
        }
      `}
    >
      {/* Radio Button */}
      <div className="relative flex items-center justify-center mt-1">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200
            ${isActive ? 'border-[#1F2A6B]' : 'border-gray-400 group-hover:border-gray-500'}`}
        >
          {isActive && <div className="w-2.5 h-2.5 rounded-full bg-[#1F2A6B]" />}
        </div>
      </div>

      {/* Icon Container */}
      <div className="w-10 h-10 rounded-lg bg-[#E6F0FF] flex items-center justify-center shrink-0 text-[#4F8AFF]">
        <Icon size={20} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1 pr-4">
        <h3 className="text-[15px] font-bold text-[#101828]">{title}</h3>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{description}</p>
      </div>
    </div>
  );
};

export default VisaCard;
