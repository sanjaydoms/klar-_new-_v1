import React from 'react';
import { useNavigate } from 'react-router-dom';
import VisaPlanCard from './VisaPlanCard';

interface VisaPlanModalProps {
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
  selectedPlanId?: string | null;
  onSelectPlan: (id: string) => void;
}

const PLANS = [
  {
    id: '1',
    title: '30-Day Single Entry Visa',
    stayPeriod: '30 days',
    validity: '60 days',
    price: '₹ 7,899',
    isRecommended: true,
  },
  {
    id: '2',
    title: '30-Day Multi Entry Visa',
    stayPeriod: '30 days',
    validity: '60 days',
    price: '₹ 14,760',
    isRecommended: false,
  },
  {
    id: '3',
    title: '60-Day Single Entry Visa',
    stayPeriod: '60 days',
    validity: '60 days',
    price: '₹ 14,460',
    isRecommended: false,
  },
  {
    id: '4',
    title: '60-Day Multi Entry Visa',
    stayPeriod: '60 days',
    validity: '60 days',
    price: '₹ 22,460',
    isRecommended: false,
  },
];

const VisaPlanModal = ({
  userName = 'Aditya panchadarla',
  isOpen,
  onClose,
  selectedPlanId,
  onSelectPlan,
}: VisaPlanModalProps) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSelect = (id: string) => {
    onSelectPlan(id);
    onClose();
    navigate('/visa/eligibility');
  };

  return (
    <>
      {/* Grey Dimmed Background */}
      <div
        className="fixed inset-0 z-[40] bg-[rgba(120,120,120,0.35)] cursor-pointer"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Content Wrapper */}
      <div
        className="absolute top-[295px] left-[222px] w-[824px] h-[1570px] flex flex-col gap-6 z-[50]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* User Header Section */}
        <div className="w-full h-[66px] bg-white rounded-[10px] flex items-center px-4 shadow-sm border border-gray-100">
          <span className="text-[#101828] font-bold text-base">{userName}</span>
        </div>

        {/* Plan Cards Stack */}
        <div className="flex flex-col gap-6">
          {PLANS.map((plan) => (
            <VisaPlanCard
              key={plan.id}
              title={plan.title}
              stayPeriod={plan.stayPeriod}
              validity={plan.validity}
              price={plan.price}
              processingTime="29 Dec"
              isRecommended={plan.isRecommended}
              isSelected={selectedPlanId === plan.id}
              onSelect={() => handleSelect(plan.id)}
            />
          ))}
        </div>

        {/* Footer Bar */}
        <div className="pt-4 border-t border-gray-300 flex items-center justify-between mt-auto mb-10 bg-transparent">
          <span className="text-gray-500 text-sm font-medium">Looking for something else?</span>
          <button
            onClick={onClose}
            className="text-[#2563EB] text-sm font-bold flex items-center gap-1 hover:underline"
          >
            View Fewer Plans ^
          </button>
        </div>
      </div>
    </>
  );
};

export default VisaPlanModal;
