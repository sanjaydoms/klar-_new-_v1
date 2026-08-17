import { Plane } from 'lucide-react';
import { InternationalItinerary } from '../../types/types.multiCityFlight';
import InternationalMultiFlightComboCard from './InternationalMultiFlightComboCard';

interface InternationalMultiFLightComboListProps {
  itineraries: InternationalItinerary[];
  selectedItinerary: InternationalItinerary | null;
  onSelectItinerary: (itinerary: InternationalItinerary) => void;
  onDeselectItinerary: () => void;
  onFareRuleLoaded?: (fareRuleData: any, flightType: string, fareId: string) => void;
  isLoading?: boolean;
  isReturnFlightSearch?: boolean;
}

export default function InternationalMultiFlightComboList({
  itineraries,
  selectedItinerary,
  onSelectItinerary,
  onDeselectItinerary,
  onFareRuleLoaded,
  isReturnFlightSearch = false,
}: InternationalMultiFLightComboListProps) {
  if (!itineraries || itineraries.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center">
          <Plane className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No flight itineraries found</p>
          <p className="text-xs text-gray-400 mt-1">Try different dates or destinations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Available Itineraries</h2>
          <p className="text-sm text-gray-500">Each itinerary includes all flight legs</p>
        </div>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
          🛫 {itineraries.length} itineraries found
        </div>
      </div>

      <div className="space-y-3">
        {itineraries.map((itinerary) => (
          <InternationalMultiFlightComboCard
            key={itinerary.itineraryKey}
            itinerary={itinerary}
            isSelected={selectedItinerary?.itineraryKey === itinerary.itineraryKey}
            onSelect={() => onSelectItinerary(itinerary)}
            onDeselect={onDeselectItinerary}
            onFareRuleLoaded={onFareRuleLoaded || (() => {})}
            isReturnFlightSearch={isReturnFlightSearch}
          />
        ))}
      </div>
    </div>
  );
}
