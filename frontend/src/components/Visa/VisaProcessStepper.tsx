import { Check } from 'lucide-react';

interface VisaProcessStepperProps {
  currentStep?: 1 | 2 | 3 | 4;
  visaType?: string;
}

const VisaProcessStepper = ({
  currentStep = 1,
  visaType = 'Individual',
}: VisaProcessStepperProps) => {
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');
  const isFamily =
    visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('group');

  const steps = [
    {
      id: 1,
      label: isBusiness
        ? 'Business information'
        : isStudent
          ? 'personal details'
          : isFamily
            ? 'Primary Applicant Name'
            : 'Personal Information',
    },
    {
      id: 2,
      label: isBusiness
        ? 'Travel Details'
        : isStudent
          ? 'Visa Details'
          : isFamily
            ? 'Group Travel Details'
            : 'Travel Details',
    },
    { id: 3, label: 'Additional Information' },
    { id: 4, label: 'Review Your Information' },
  ];

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative max-w-[680px] mx-auto">
        {/* Background connector line */}
        <div className="absolute top-[18px] left-0 w-full h-[2px] bg-gray-200 z-0" />
        {/* Active connector line */}
        <div
          className="absolute top-[18px] left-0 h-[2px] bg-[#1F2A6B] z-0 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        />

        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-[#F7F8FA] px-1 z-10">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-200
                  ${
                    isCompleted
                      ? 'bg-[#00C261] border-[#00C261] text-white'
                      : isCurrent
                        ? 'bg-[#00C261] border-[#00C261] text-white ring-4 ring-green-100'
                        : 'bg-white border-gray-300 text-gray-400'
                  }`}
              >
                {isCompleted ? <Check size={16} /> : isCurrent ? <Check size={16} /> : step.id}
              </div>
              <span
                className={`text-[10px] font-medium text-center leading-tight max-w-[80px]
                  ${isCurrent ? 'text-[#101828]' : isCompleted ? 'text-[#101828]' : 'text-gray-400'}`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VisaProcessStepper;
