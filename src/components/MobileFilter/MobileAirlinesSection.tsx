import { MobileSectionHeader } from './MobileSectionHeader';
import { Check } from 'lucide-react';

interface MobileAirlinesSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedAirlines: string[];
  availableAirlines: { airline: string; airlineCode: string; flights: number }[];
  onAirlineChange: (airline: string) => void;
}

export const MobileAirlinesSection = ({
  isOpen,
  onToggle,
  selectedAirlines,
  availableAirlines,
  onAirlineChange,
}: MobileAirlinesSectionProps) => {
  const getAirlineLogo = (airlineCode: string) => {
    try {
      return `/airline-logos/${airlineCode}.png`;
    } catch {
      return null;
    }
  };

  return (
    <div className="mb-2">
      <MobileSectionHeader
        title="Airlines"
        isOpen={isOpen}
        onToggle={onToggle}
        count={selectedAirlines.length}
      />

      {isOpen && (
        <div className="space-y-1.5 mt-2">
          {availableAirlines.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-3">
              No airlines available
            </div>
          ) : (
            availableAirlines.map((airlineData) => {
              const logoPath = getAirlineLogo(airlineData.airlineCode);
              const isSelected = selectedAirlines.includes(airlineData.airline);

              return (
                <button
                  key={airlineData.airline}
                  onClick={() => onAirlineChange(airlineData.airline)}
                  className={`
                    w-full flex items-center gap-3 
                    px-3 py-3 
                    rounded-lg transition-all duration-200
                    active:bg-gray-50 touch-manipulation
                    ${isSelected ? 'bg-blue-50/50' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    flex-shrink-0 w-5 h-5 
                    rounded border-2 flex items-center justify-center
                    transition-all duration-200
                    ${isSelected 
                      ? 'bg-[#1A1F4D] border-[#1A1F4D]' 
                      : 'border-gray-300 bg-white'
                    }
                  `}>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>

                  {/* Airline Logo */}
                  <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
                    {logoPath ? (
                      <img
                        src={logoPath}
                        alt={airlineData.airline}
                        className="w-full h-full object-contain rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {airlineData.airline.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Airline Name */}
                  <span className={`
                    flex-1 text-left text-sm font-medium truncate
                    ${isSelected ? 'text-[#1A1F4D]' : 'text-gray-700'}
                  `}>
                    {airlineData.airline}
                  </span>

                  {/* Flight Count */}
                  <span className={`
                    flex-shrink-0 text-sm font-medium
                    ${isSelected ? 'text-[#1A1F4D]' : 'text-gray-500'}
                  `}>
                    {airlineData.flights}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};