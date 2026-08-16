import React from 'react';
import { CheckCircle } from 'lucide-react';

const RequirementCard = () => {
  return (
    <div className="sticky top-8 w-full bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit">
      {/* Title */}
      <h3 className="text-[#1F2A6B] font-semibold text-lg mb-4">Key Requirements:</h3>

      {/* Requirements List */}
      <div className="space-y-3 mb-6">
        <RequirementItem label="Company letter" />
        <RequirementItem label="Invitation letter" />
        <RequirementItem label="Business documents" />
        <RequirementItem label="Conference details" />
      </div>

      {/* Processing Time */}
      <div className="mb-4">
        <p className="text-gray-500 text-sm mb-1">Processing Time</p>
        <p className="text-[#0D6EFD] text-lg font-bold">10-20 days</p>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <p className="text-gray-500 text-lg mb-1">Starting from</p>
        <p className="text-[#101828] text-4xl font-bold">$149</p>
      </div>

      {/* Button */}
      <button className="w-full bg-[#1F2A6B] text-white font-medium py-3 rounded-lg hover:bg-[#162055] transition-colors duration-200 shadow-sm cursor-pointer">
        Apply Now
      </button>
    </div>
  );
};

const RequirementItem = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3">
    <CheckCircle size={18} className="text-green-500 shrink-0" />
    <span className="text-gray-600 text-sm">{label}</span>
  </div>
);

export default RequirementCard;
