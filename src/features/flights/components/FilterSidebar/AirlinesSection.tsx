import { SectionHeader } from './SectionHeader';
import { Check } from 'lucide-react';

interface AirlinesSectionProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedAirlines: string[];
  availableAirlines: { airline: string; airlineCode: string; flights: number }[];
  onAirlineChange: (airline: string) => void;
}

export const AirlinesSection = ({
  isOpen,
  onToggle,
  selectedAirlines,
  availableAirlines,
  onAirlineChange,
}: AirlinesSectionProps) => {
  const getAirlineLogo = (airlineCode: string) => {
    try {
      return `/airline-logos/${airlineCode}.png`;
    } catch {
      return null;
    }
  };

  return (
    <div className="mb-5 sm:mb-6">
      <SectionHeader
        title="Airlines"
        isOpen={isOpen}
        onToggle={onToggle}
        count={selectedAirlines.length}
      />

      {isOpen && (
        <div className="space-y-1.5 w-full">
          {availableAirlines.length === 0 ? (
            <div className="w-full text-xs sm:text-sm text-gray-500 text-center py-2">
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
                    w-full flex items-center gap-2 sm:gap-3 
                    px-2 py-1.5 sm:py-2 
                    rounded-md transition-all duration-200
                    hover:bg-gray-50
                    ${isSelected ? 'bg-blue-50/50' : ''}
                  `}
                >
                  {/* Checkbox */}
                  <div className={`
                    flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 
                    rounded border-2 flex items-center justify-center
                    transition-all duration-200
                    ${isSelected 
                      ? 'bg-[#1A1F4D] border-[#1A1F4D]' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                    }
                  `}>
                    {isSelected && (
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                    )}
                  </div>

                  {/* Airline Logo */}
                  <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
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
                      <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-[8px] sm:text-[10px] font-bold text-gray-600">
                        {airlineData.airline.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Airline Name */}
                  <span className={`
                    flex-1 text-left text-xs sm:text-sm font-medium truncate
                    ${isSelected ? 'text-[#1A1F4D]' : 'text-gray-700'}
                  `}>
                    {airlineData.airline}
                  </span>

                  {/* Flight Count */}
                  <span className={`
                    flex-shrink-0 text-xs sm:text-sm font-medium
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