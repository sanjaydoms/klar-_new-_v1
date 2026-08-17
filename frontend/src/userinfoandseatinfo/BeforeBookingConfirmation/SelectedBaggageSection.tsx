import { Package } from 'lucide-react';
import { TravelerBaggageSelection } from '@/types/beforeBooking.type';

interface SelectedBaggageSectionProps {
  selectedBaggage: string[];
  selectedBaggagePerTravelerPerSegment: TravelerBaggageSelection;
  baggageOptions: any[];
}

export default function SelectedBaggageSection({
  selectedBaggage,
  selectedBaggagePerTravelerPerSegment,
  baggageOptions,
}: SelectedBaggageSectionProps) {
  const getBaggageDescription = (baggageId: string) => {
    const baggage = baggageOptions.find((b) => b.id === baggageId || b.code === baggageId);
    if (baggage?.description) {
      return baggage.description;
    }
    return baggageId;
  };

  const baggageEntries = Object.values(selectedBaggagePerTravelerPerSegment).flatMap(
    (travelerBaggage) =>
      Object.values(travelerBaggage).flatMap((segmentBaggage) =>
        Object.entries(segmentBaggage).filter(([_, qty]) => qty > 0),
      ),
  );

  if (baggageEntries.length === 0 && selectedBaggage.length === 0) {
    return null;
  }

  const baggageToDisplay =
    selectedBaggage.length > 0
      ? selectedBaggage
      : baggageEntries.map(([baggageId]) => getBaggageDescription(baggageId));

  if (baggageToDisplay.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Selected Baggage</h2>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
            {baggageToDisplay.length} item{baggageToDisplay.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {baggageToDisplay.map((baggage, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
            >
              {baggage}
            </span>
          ))}
        </div>

        {Object.keys(selectedBaggagePerTravelerPerSegment).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(selectedBaggagePerTravelerPerSegment).map(
              ([travelerIndex, segments]) => {
                const baggageEntries = Object.entries(segments).flatMap(([segmentId, baggage]) =>
                  Object.entries(baggage)
                    .filter(([_, qty]) => qty > 0)
                    .map(([baggageId, qty]) => ({
                      baggageId,
                      qty,
                      description: getBaggageDescription(baggageId),
                    })),
                );

                if (baggageEntries.length === 0) return null;

                return (
                  <div key={travelerIndex} className="text-sm text-gray-600">
                    <span className="font-medium">Traveler {parseInt(travelerIndex) + 1}:</span>
                    {baggageEntries.map((item, idx) => (
                      <span key={idx} className="ml-2">
                        {item.description} {item.qty > 1 ? `(x${item.qty})` : ''}
                        {idx < baggageEntries.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
