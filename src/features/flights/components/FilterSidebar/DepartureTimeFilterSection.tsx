import { SectionHeader } from './SectionHeader';
import { Clock } from 'lucide-react';

interface TimeFilterSectionProps {
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

export const DepartureTimeFilterSection = ({
    isOpen,
    onToggle,
    selectedTimes = [],
    onTimeChange,
}: TimeFilterSectionProps) => {
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
        <div className="mb-5 sm:mb-6 border-b border-gray-100 pb-3 sm:pb-4">
            <SectionHeader
                title="Departure Time"
                isOpen={isOpen}
                onToggle={onToggle}
                icon={<Clock className="w-4 h-4" />}
            />

            {isOpen && (
                <>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {timeOptions.map((option) => {
                            const isSelected = selectedTimes.includes(option.id);

                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleTimeClick(option.id)}
                                    className={`
                                        flex flex-col items-center justify-center p-2 rounded-md border transition-all duration-200
                                        ${isSelected
                                            ? 'border-[#1A1F4D] bg-[#1A1F4D]/5 shadow-sm ring-2 ring-[#1A1F4D]/20'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <span className="text-lg mb-0.5">{option.icon}</span>
                                    <span className={`text-[11px] font-medium ${isSelected ? 'text-[#1A1F4D]' : 'text-gray-700'}`}>
                                        {option.label}
                                    </span>
                                    <span className="text-[9px] text-gray-500 mt-0.5">
                                        {option.time}
                                    </span>
                                    {isSelected && (
                                        <div className="mt-1 w-4 h-0.5 rounded-full bg-[#1A1F4D]"></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {selectedTimes.length > 0 && (
                        <div className="mt-2 text-[10px] text-[#1A1F4D] font-medium text-center bg-[#1A1F4D]/5 py-1 rounded-md">
                            ✓ {timeOptions.find(t => t.id === selectedTimes[0])?.label} selected
                        </div>
                    )}
                </>
            )}
        </div>
    );
};