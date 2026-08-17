import { MobileSectionHeader } from './MobileSectionHeader';

interface MobileStopsSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedStops: string[];
  onStopChange: (stop: string) => void;
}

interface StopOption {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export const MobileStopsSection = ({
  isOpen,
  onToggle,
  selectedStops,
  onStopChange,
}: MobileStopsSectionProps) => {
  const stopOptions: StopOption[] = [
    { 
      key: 'NON_STOP', 
      label: 'Non-stop',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#10B981" opacity="0.2" />
          <circle cx="12" cy="12" r="6" fill="#10B981" />
          <path d="M8 12H16" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    { 
      key: 'ONE_STOP', 
      label: '1 Stop',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#3B82F6" opacity="0.2" />
          <circle cx="12" cy="12" r="6" fill="#3B82F6" />
          <circle cx="12" cy="12" r="2" fill="white" />
        </svg>
      )
    },
    { 
      key: 'TWO_PLUS_STOPS', 
      label: '2+ Stops',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" fill="#8B5CF6" opacity="0.2" />
          <circle cx="12" cy="12" r="6" fill="#8B5CF6" />
          <circle cx="9" cy="10" r="1.5" fill="white" />
          <circle cx="15" cy="10" r="1.5" fill="white" />
          <circle cx="12" cy="14" r="1.5" fill="white" />
        </svg>
      )
    },
  ];

  return (
    <div className="mb-4 pb-4 border-b border-gray-100">
      <MobileSectionHeader
        title="Stops"
        isOpen={isOpen}
        onToggle={onToggle}
        count={selectedStops.length}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
              fill="url(#stopGradient)" stroke="#8B5CF6" strokeWidth="1.5" />
            <defs>
              <linearGradient id="stopGradient" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
        }
      />

      {isOpen && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          {stopOptions.map((option) => {
            const isSelected = selectedStops.includes(option.key);
            
            return (
              <button
                key={option.key}
                onClick={() => onStopChange(option.key)}
                className={`
                  flex items-center justify-center gap-2
                  px-3 py-3 
                  text-sm font-medium 
                  rounded-lg transition-all duration-200 
                  touch-manipulation
                  ${isSelected
                    ? 'bg-[#1A1F4D] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }
                `}
              >
                <span className={`${isSelected ? 'text-white' : ''} flex-shrink-0`}>
                  {option.icon}
                </span>
                <span>{option.label}</span>
                {isSelected && (
                  <span className="text-sm text-white">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};