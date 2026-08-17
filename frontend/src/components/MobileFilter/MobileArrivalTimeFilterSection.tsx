import { MobileSectionHeader } from './MobileSectionHeader';
import { Clock } from 'lucide-react';

interface MobileArrivalTimeFilterSectionProps {
    isOpen: boolean;
    onToggle: () => void;
    selectedTimes?: string[];
    onTimeChange?: (time: string) => void;
}

interface TimeOption {
    id: string;
    label: string;
    icon: string;
    time: string;
}

export const MobileArrivalTimeFilterSection = ({
    isOpen,
    onToggle,
    selectedTimes = [],
    onTimeChange,
}: MobileArrivalTimeFilterSectionProps) => {
    const timeOptions: TimeOption[] = [
        { id: 'MORNING', label: 'Morning', icon: '🌅', time: '6:00 AM - 12:00 PM' },
        { id: 'AFTERNOON', label: 'Afternoon', icon: '☀️', time: '12:00 PM - 6:00 PM' },
        { id: 'EVENING', label: 'Evening', icon: '🌆', time: '6:00 PM - 9:00 PM' },
        { id: 'NIGHT', label: 'Night', icon: '🌙', time: '9:00 PM - 6:00 AM' },
    ];

    const handleTimeClick = (timeId: string) => {
        if (onTimeChange) {
            onTimeChange(timeId);
        }
    };

    return (
        <div className="mb-4 pb-4 border-b border-gray-100">
            <MobileSectionHeader
                title="Arrival Time"
                isOpen={isOpen}
                onToggle={onToggle}
                icon={<Clock className="w-4 h-4" />}
            />

            {isOpen && (
                <>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {timeOptions.map((option) => {
                            const isSelected = selectedTimes.includes(option.id);

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleTimeClick(option.id)}
                                    className={`
                                        flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 touch-manipulation
                                        ${isSelected
                                            ? 'border-[#1A1F4D] bg-[#1A1F4D]/5 shadow-sm ring-2 ring-[#1A1F4D]/20'
                                            : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className="text-2xl mb-1">{option.icon}</span>
                                    <span className={`text-sm font-medium ${isSelected ? 'text-[#1A1F4D]' : 'text-gray-700'}`}>
                                        {option.label}
                                    </span>
                                    <span className="text-[10px] text-gray-500 mt-0.5">
                                        {option.time}
                                    </span>
                                    {isSelected && (
                                        <div className="mt-1.5 w-6 h-0.5 rounded-full bg-[#1A1F4D]"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {selectedTimes.length > 0 && (
                        <div className="mt-2 text-xs text-[#1A1F4D] font-medium text-center bg-[#1A1F4D]/5 py-1.5 rounded-lg">
                            ✓ {timeOptions.find(t => t.id === selectedTimes[0])?.label} selected
                        </div>
                    )}
                </>
            )}
        </div>
    );
};