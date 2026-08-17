import { FlightOption } from '../../types/types.multiCityFlight';

interface FlightSummaryFooterProps {
  selectedFlights: Map<number, FlightOption>;
  totalPrice: number;
  currentSegment: number;
  totalSegments: number;
  onNext: () => void;
  onBook: () => void;
  getFlightPrice: (flight: FlightOption) => number;
}

export default function FlightSummaryFooter({
  selectedFlights,
  totalPrice,
  currentSegment,
  totalSegments,
  onNext,
  onBook,
  getFlightPrice,
}: FlightSummaryFooterProps) {
  if (selectedFlights.size === 0) return null;

  const currentSelection = selectedFlights.get(currentSegment);
  const isLastSegment = currentSegment >= totalSegments - 1;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-md text-white shadow-2xl z-50 animate-in slide-in-from-bottom duration-500">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-6 overflow-x-auto no-scrollbar py-1">
          {Array.from(selectedFlights.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([idx, flight]) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest truncate">
                    {flight.departure.airportCode} → {flight.arrival.airportCode}
                  </div>
                  <div className="text-sm font-black whitespace-nowrap">
                    ₹{getFlightPrice(flight).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
        </div>

        <div className="flex items-center gap-8 pl-8 border-l border-white/10 ml-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Total Amount
            </div>
            <div className="text-2xl font-black text-blue-400">₹{totalPrice.toLocaleString()}</div>
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
              Incl. Taxes & Fees
            </div>
          </div>

          {!isLastSegment ? (
            <button
              onClick={onNext}
              disabled={!currentSelection}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-white/20 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold tracking-widest transition-all shadow-xl shadow-blue-900/40 hover:-translate-y-0.5"
            >
              NEXT FLIGHT
            </button>
          ) : (
            <button
              onClick={onBook}
              className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-xl font-bold tracking-widest transition-all shadow-xl shadow-green-900/40 hover:-translate-y-0.5"
            >
              PROCEED TO BOOK
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
