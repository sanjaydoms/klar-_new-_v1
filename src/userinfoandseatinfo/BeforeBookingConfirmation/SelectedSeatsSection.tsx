import { Calendar } from 'lucide-react';
import { SelectedSeatDetails, TravelerSeatSelection } from '@/types/beforeBooking.type';

interface SelectedSeatsSectionProps {
  selectedSeats: string[];
  selectedSeatsPerTravelerPerSegment: TravelerSeatSelection;
  selectedSeatPrices: SelectedSeatDetails[];
}

export default function SelectedSeatsSection({
  selectedSeats,
  selectedSeatsPerTravelerPerSegment,
  selectedSeatPrices,
}: SelectedSeatsSectionProps) {
  if (selectedSeats.length === 0 && Object.keys(selectedSeatsPerTravelerPerSegment).length === 0) {
    return null;
  }

  const getSeatLabel = (seatId: string) => {
    const seatDetail = selectedSeatPrices.find(
      (s) => s.seatId === seatId || s.seatNumber === seatId,
    );
    if (seatDetail?.seatNumber) {
      return seatDetail.seatNumber;
    }
    return seatId;
  };

  const seatsToDisplay =
    selectedSeats.length > 0
      ? selectedSeats
      : Object.values(selectedSeatsPerTravelerPerSegment).flatMap((travelerSeats) =>
          Object.values(travelerSeats).filter(Boolean),
        );

  if (seatsToDisplay.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-6">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Selected Seats</h2>
          <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
            {seatsToDisplay.length} seat{seatsToDisplay.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {seatsToDisplay.map((seat, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
            >
              {getSeatLabel(seat)}
            </span>
          ))}
        </div>

        {Object.keys(selectedSeatsPerTravelerPerSegment).length > 0 && (
          <div className="mt-3 space-y-2">
            {Object.entries(selectedSeatsPerTravelerPerSegment).map(([travelerIndex, segments]) => {
              const seatEntries = Object.entries(segments).filter(([_, seatId]) => seatId);
              if (seatEntries.length === 0) return null;

              return (
                <div key={travelerIndex} className="text-sm text-gray-600">
                  <span className="font-medium">Traveler {parseInt(travelerIndex) + 1}:</span>
                  {seatEntries.map(([segmentId, seatId], idx) => (
                    <span key={idx} className="ml-2">
                      Seat {getSeatLabel(seatId as string)}
                      {idx < seatEntries.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
