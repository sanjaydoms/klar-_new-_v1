// src/components/SeatSelection/SeatSelectionComponent.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Info, Armchair, Ticket, Plane, Users, ChevronRight, X, Check } from 'lucide-react';

interface Seat {
  id: string;
  row: number;
  column: string;
  columnNumber: number;
  status: 'available' | 'booked' | 'blocked' | 'free' | 'selected';
  price?: number;
  currency?: string;
  features?: string[];
  isLegroom?: boolean;
  isAisle?: boolean;
  isWindow?: boolean;
  isExitRow?: boolean;
}

interface SeatSelectionComponentProps {
  travelerCount: number;
  availableSegments: string[];
  currentSegmentId: string;
  setCurrentSegmentId: (segmentId: string) => void;
  seats: Seat[];
  setSeats: React.Dispatch<React.SetStateAction<Seat[]>>;
  allSegmentsSeatMaps: { [segmentId: string]: Seat[] };
  selectedSeatsPerTravelerPerSegment: { [travelerIndex: number]: { [segmentId: string]: string } };
  setSelectedSeatsPerTravelerPerSegment: React.Dispatch<
    React.SetStateAction<{ [travelerIndex: number]: { [segmentId: string]: string } }>
  >;
  selectedTravelerForSeat: number;
  setSelectedTravelerForSeat: (index: number) => void;
  showSeatLimitWarning: boolean;
  setShowSeatLimitWarning: (show: boolean) => void;
  showSeatDisclaimer: boolean;
  selectedSeatPrices: Array<{
    seatId: string;
    price: number;
    segmentId?: string;
    seatNumber?: string;
    uniqueKey?: string;
  }>;
  setSelectedSeatPrices: React.Dispatch<
    React.SetStateAction<
      Array<{
        seatId: string;
        price: number;
        segmentId?: string;
        seatNumber?: string;
        uniqueKey?: string;
      }>
    >
  >;
  flightDetails: any;
  setFlightDetails: React.Dispatch<React.SetStateAction<any>>;
  getFlightInfoBySegmentId: (
    segmentId: string,
  ) => { flightNumber: string; departure: string; arrival: string } | null;
  seatApiError: boolean;
}

export default function SeatSelectionComponent({
  travelerCount,
  availableSegments,
  currentSegmentId,
  setCurrentSegmentId,
  seats: externalSeats,
  setSeats: setExternalSeats,
  allSegmentsSeatMaps,
  selectedSeatsPerTravelerPerSegment,
  setSelectedSeatsPerTravelerPerSegment,
  selectedTravelerForSeat,
  setSelectedTravelerForSeat,
  showSeatLimitWarning,
  setShowSeatLimitWarning,
  showSeatDisclaimer,
  selectedSeatPrices,
  setSelectedSeatPrices,
  flightDetails,
  setFlightDetails,
  getFlightInfoBySegmentId,
  seatApiError,
}: SeatSelectionComponentProps) {
  const [seatRows, setSeatRows] = useState<
    { row: number; leftSeats: (Seat | null)[]; rightSeats: (Seat | null)[] }[]
  >([]);
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedPriceSeat, setSelectedPriceSeat] = useState<Seat | null>(null);
  const [selectedSeatType, setSelectedSeatType] = useState<string>('all');

  // Helper function to get aisle position based on total columns
  const getAislePosition = useCallback((totalColumns: number): number => {
    // For 6 columns: aisle after column 3 (C)
    // For 8 columns: aisle after column 4 (D)
    // For 10 columns: aisle after column 5 (E)
    if (totalColumns === 6) return 3;
    if (totalColumns === 8) return 4;
    if (totalColumns === 10) return 5;
    return Math.floor(totalColumns / 2); // Default to middle
  }, []);

  // Get sorted unique columns from seat data
  const getSortedColumns = useCallback((): string[] => {
    const columns = new Set<string>();
    externalSeats.forEach((seat) => {
      columns.add(seat.column);
    });
    return Array.from(columns).sort();
  }, [externalSeats]);

  const getExitRows = (): number[] => {
    return externalSeats
      .filter((seat) => seat.isExitRow)
      .map((seat) => seat.row)
      .filter((value, index, self) => self.indexOf(value) === index);
  };

  const exitRows = getExitRows();

  // Group seats by row for display (left and right sections)
  useEffect(() => {
    if (externalSeats.length === 0) return;

    const rowsMap = new Map<number, Map<string, Seat>>();

    // First, group all seats by row and column
    externalSeats.forEach((seat) => {
      if (!rowsMap.has(seat.row)) {
        rowsMap.set(seat.row, new Map());
      }
      const rowMap = rowsMap.get(seat.row)!;
      rowMap.set(seat.column, seat);
    });

    const allColumns = getSortedColumns();

    // Convert to array format for rendering
    const sortedRows = Array.from(rowsMap.keys())
      .sort((a, b) => a - b)
      .map((row) => {
        const rowMap = rowsMap.get(row)!;
        const seatsInOrder = allColumns.map((col) => rowMap.get(col) || null);

        // Dynamic splitting
        const aislePos = getAislePosition(allColumns.length);
        const leftSeats = seatsInOrder.slice(0, aislePos);
        const rightSeats = seatsInOrder.slice(aislePos);

        return {
          row,
          leftSeats,
          rightSeats,
        };
      });

    setSeatRows(sortedRows);
  }, [externalSeats, getSortedColumns, getAislePosition]);

  const renderColumnHeaders = () => {
    const columns = getSortedColumns();
    const aislePos = getAislePosition(columns.length);

    return (
      <div className="flex items-center justify-center gap-4 mb-2">
        <div className="w-8"></div> {/* Spacer for row numbers */}
        <div className="flex gap-2">
          {columns.slice(0, aislePos).map((col) => (
            <div key={col} className="w-14 text-center text-xs font-semibold text-gray-500">
              {col}
            </div>
          ))}
        </div>
        <div className="w-12"></div> {/* Aisle spacer */}
        <div className="flex gap-2">
          {columns.slice(aislePos).map((col) => (
            <div key={col} className="w-14 text-center text-xs font-semibold text-gray-500">
              {col}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Update selected seat prices when selections change
  useEffect(() => {
    const prices: Array<{
      seatId: string;
      price: number;
      segmentId?: string;
      seatNumber?: string;
      uniqueKey?: string;
    }> = [];

    Object.entries(selectedSeatsPerTravelerPerSegment).forEach(([travelerIdx, segments]) => {
      Object.entries(segments).forEach(([segmentId, seatId]) => {
        if (seatId) {
          const seat = allSegmentsSeatMaps[segmentId]?.find((s) => s.id === seatId);
          if (seat) {
            prices.push({
              seatId: seat.id,
              price: seat.price || 0,
              segmentId: segmentId,
              seatNumber: seat.id,
              uniqueKey: `${travelerIdx}_${segmentId}_${seat.id}`,
            });
          }
        }
      });
    });

    setSelectedSeatPrices(prices);
  }, [selectedSeatsPerTravelerPerSegment, allSegmentsSeatMaps, setSelectedSeatPrices]);

  const getSeatClassName = (
    seat: Seat | null,
    isSelectedForCurrentTraveler: boolean,
    isSelectedByOther: boolean,
  ): string => {
    const baseClasses =
      'relative w-full aspect-square rounded-lg transition-all duration-200 flex flex-col items-center justify-center text-xs font-medium';

    if (!seat) {
      return 'relative w-full aspect-square rounded-lg invisible';
    }

    let displayStatus = seat.status;
    if (isSelectedForCurrentTraveler) {
      displayStatus = 'selected';
    } else if (isSelectedByOther && seat.status !== 'booked' && seat.status !== 'blocked') {
      displayStatus = 'booked';
    }

    if (displayStatus === 'selected') {
      return `${baseClasses} bg-green-500 text-white ring-2 ring-green-400 ring-offset-1 cursor-pointer shadow-md`;
    }

    if (displayStatus === 'booked') {
      return `${baseClasses} bg-gray-300 border border-gray-400 text-gray-500 cursor-not-allowed`;
    }

    if (displayStatus === 'blocked') {
      return `${baseClasses} bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed`;
    }

    if (displayStatus === 'free') {
      return `${baseClasses} bg-green-100 border-2 border-green-400 text-green-700 hover:bg-green-200 cursor-pointer`;
    }

    return `${baseClasses} bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:bg-blue-50 cursor-pointer hover:shadow-md`;
  };

  const getSeatIcon = (
    seat: Seat | null,
    isSelectedForCurrentTraveler: boolean,
    isSelectedByOther: boolean,
  ) => {
    if (!seat) return null;

    if (seat.status === 'booked') {
      return <X className="w-5 h-5 text-gray-500" strokeWidth={1.5} />;
    }

    if (seat.status === 'blocked') {
      return <X className="w-5 h-5 text-gray-400" strokeWidth={1.5} />;
    }

    if (isSelectedForCurrentTraveler) {
      return <Check className="w-4 h-4 absolute top-1 right-1 text-white" />;
    }

    return <Armchair className="w-5 h-5" strokeWidth={1.5} />;
  };

  const getSeatTypeBadge = (seat: Seat | null): string => {
    if (!seat) return '';
    const badges = [];
    if (seat.isLegroom) badges.push('✨');
    if (seat.isExitRow) badges.push('🚪');
    if (seat.isWindow) badges.push('🪟');
    if (seat.isAisle) badges.push('🔄');
    return badges.join(' ');
  };

  const getSeatTypeLabel = (seat: Seat | null): string => {
    if (!seat) return '';
    const labels = [];
    if (seat.isLegroom) labels.push('Extra Legroom');
    if (seat.isExitRow) labels.push('Exit Row');
    if (seat.isWindow) labels.push('Window');
    if (seat.isAisle) labels.push('Aisle');
    return labels.join(' • ');
  };

  const isSeatDisabled = (seat: Seat | null): boolean => {
    if (!seat) return true;
    return seat.status === 'booked' || seat.status === 'blocked';
  };

  const handleSeatClick = (seat: Seat | null) => {
    if (!seat || isSeatDisabled(seat)) {
      if (seat?.status === 'booked') {
        const toast = document.createElement('div');
        toast.className =
          'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
        toast.innerText = 'This seat is already booked';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      }
      return;
    }

    const currentSelection =
      selectedSeatsPerTravelerPerSegment[selectedTravelerForSeat]?.[currentSegmentId];

    if (currentSelection === seat.id) {
      setSelectedSeatsPerTravelerPerSegment((prev) => ({
        ...prev,
        [selectedTravelerForSeat]: {
          ...prev[selectedTravelerForSeat],
          [currentSegmentId]: '',
        },
      }));
    } else {
      setSelectedSeatsPerTravelerPerSegment((prev) => ({
        ...prev,
        [selectedTravelerForSeat]: {
          ...prev[selectedTravelerForSeat],
          [currentSegmentId]: seat.id,
        },
      }));
    }
  };

  const getCurrentSegmentFlightInfo = () => {
    if (!currentSegmentId) return null;
    return getFlightInfoBySegmentId(currentSegmentId);
  };

  const flightInfo = getCurrentSegmentFlightInfo();

  const getSeatPriceDisplay = (seat: Seat | null): string => {
    if (!seat) return '';
    if (seat.price === 0) return 'Free';
    if (seat.price && seat.price > 0) return `₹${seat.price}`;
    return '';
  };

  const handlePriceClick = (seat: Seat | null, e: React.MouseEvent) => {
    if (!seat) return;
    e.stopPropagation();
    setSelectedPriceSeat(seat);
    setShowPriceModal(true);
  };

  const occupiedSeats = externalSeats.filter((s) => s.status === 'booked').length;
  const availableSeatsCount = externalSeats.filter(
    (s) => s.status === 'available' || s.status === 'free',
  ).length;

  // Filter seats based on selected type
  const getFilteredSeatRows = () => {
    if (selectedSeatType === 'all') return seatRows;

    return seatRows
      .map((row) => ({
        ...row,
        leftSeats: row.leftSeats.map((seat) => {
          if (!seat) return null;
          if (selectedSeatType === 'window' && !seat.isWindow) return null;
          if (selectedSeatType === 'aisle' && !seat.isAisle) return null;
          if (selectedSeatType === 'extralegroom' && !seat.isLegroom) return null;
          return seat;
        }),
        rightSeats: row.rightSeats.map((seat) => {
          if (!seat) return null;
          if (selectedSeatType === 'window' && !seat.isWindow) return null;
          if (selectedSeatType === 'aisle' && !seat.isAisle) return null;
          if (selectedSeatType === 'extralegroom' && !seat.isLegroom) return null;
          return seat;
        }),
      }))
      .filter(
        (row) => row.leftSeats.some((s) => s !== null) || row.rightSeats.some((s) => s !== null),
      );
  };

  const filteredSeatRows = getFilteredSeatRows();

  if (seatApiError) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
          <Info className="w-10 h-10 text-amber-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Seat Map Unavailable</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Seat selection is currently not available for this flight.
        </p>
      </div>
    );
  }

  if (externalSeats.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6">
          <Armchair className="w-10 h-10 text-gray-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-3">No Seat Map Available</h3>
        <p className="text-gray-600">Seat map data is not available for this flight.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Price Modal */}
      {showPriceModal && selectedPriceSeat && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowPriceModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Seat {selectedPriceSeat.id}</h3>
              <button
                onClick={() => setShowPriceModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Seat Type</span>
                <span className="font-medium">
                  {getSeatTypeLabel(selectedPriceSeat) || 'Standard'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Price</span>
                <span
                  className={`font-semibold text-lg ${selectedPriceSeat.price === 0 ? 'text-green-600' : 'text-blue-600'}`}
                >
                  {getSeatPriceDisplay(selectedPriceSeat)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Status</span>
                <span className="capitalize font-medium">{selectedPriceSeat.status}</span>
              </div>
            </div>
            <button
              onClick={() => {
                handleSeatClick(selectedPriceSeat);
                setShowPriceModal(false);
              }}
              disabled={isSeatDisabled(selectedPriceSeat)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Select This Seat
            </button>
          </div>
        </div>
      )}

      {/* Stats Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{availableSeatsCount}</div>
              <div className="text-xs text-gray-500">Available Seats</div>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{occupiedSeats}</div>
              <div className="text-xs text-gray-500">Booked Seats</div>
            </div>
            <div className="w-px h-10 bg-gray-300"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{travelerCount}</div>
              <div className="text-xs text-gray-500">Passengers</div>
            </div>
          </div>
        </div>
      </div>

      {/* Segment Selection */}
      {availableSegments.length > 1 && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {availableSegments.map((segmentId, idx) => {
              const segmentFlightInfo = getFlightInfoBySegmentId(segmentId);
              return (
                <button
                  key={segmentId}
                  onClick={() => setCurrentSegmentId(segmentId)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    currentSegmentId === segmentId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {segmentFlightInfo ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{segmentFlightInfo.flightNumber}</span>
                      <span>•</span>
                      <span>{segmentFlightInfo.departure}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{segmentFlightInfo.arrival}</span>
                    </div>
                  ) : (
                    `Segment ${idx + 1}`
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Flight Info */}
      {flightInfo && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-xs text-gray-500">Flight</div>
                <div className="font-semibold">{flightInfo.flightNumber}</div>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div>
                <div className="text-xs text-gray-500">From</div>
                <div className="font-medium">{flightInfo.departure}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div>
                <div className="text-xs text-gray-500">To</div>
                <div className="font-medium">{flightInfo.arrival}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Traveler {selectedTravelerForSeat + 1} of {travelerCount}
            </div>
          </div>
        </div>
      )}

      {/* Traveler Selection */}
      <div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: travelerCount }).map((_, idx) => {
            const hasSeat = selectedSeatsPerTravelerPerSegment[idx]?.[currentSegmentId];
            return (
              <button
                key={idx}
                onClick={() => setSelectedTravelerForSeat(idx)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${
                    selectedTravelerForSeat === idx
                      ? 'bg-blue-600 text-white'
                      : hasSeat
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                Passenger {idx + 1}
                {hasSeat && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Warnings */}
      {showSeatLimitWarning && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ You can only select one seat per passenger per flight segment.
          </p>
        </div>
      )}

      {showSeatDisclaimer && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            ℹ️ No seats are currently available for selection on this segment.
          </p>
        </div>
      )}

      {/* Seat Type Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Show seat type</label>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedSeatType('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedSeatType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Seats
          </button>
          <button
            onClick={() => setSelectedSeatType('window')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedSeatType === 'window'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🪟 Window
          </button>
          <button
            onClick={() => setSelectedSeatType('aisle')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedSeatType === 'aisle'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔄 Aisle
          </button>
          <button
            onClick={() => setSelectedSeatType('extralegroom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              selectedSeatType === 'extralegroom'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ✨ Extra Legroom
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg border border-gray-200 p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Legend</h4>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-300 border border-gray-400 rounded flex items-center justify-center">
              <X className="w-3 h-3 text-gray-500" />
            </div>
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 border border-gray-300 rounded flex items-center justify-center">
              <X className="w-3 h-3 text-gray-400" />
            </div>
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border-2 border-green-400 rounded"></div>
            <span>Free</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🪟</span>
            <span>Window</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <span>Aisle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span>Extra Legroom</span>
          </div>
        </div>
      </div>

      {/* Seat Map */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5" />
              <span className="font-semibold">Aircraft Seat Map</span>
            </div>
            <div className="text-xs opacity-75">Front → Rear</div>
          </div>
        </div>

        {/* Column Headers */}
        <div className="px-4 pt-4">{renderColumnHeaders()}</div>

        {/* Seat Map Body */}
        <div className="p-4 overflow-x-auto">
          <div className="min-w-[600px]">
            {filteredSeatRows.map((rowData) => {
              const isExitRow = exitRows.includes(rowData.row);

              return (
                <div key={rowData.row} className="mb-4">
                  {/* Exit Row Label */}
                  {isExitRow && (
                    <div className="mb-2 text-center">
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-0.5 rounded-full">
                        EXIT ROW
                      </span>
                    </div>
                  )}

                  {/* Price Row */}
                  <div className="flex items-center justify-center mb-1">
                    <div className="flex gap-4 w-full max-w-md">
                      <div className="flex-1 text-center text-[10px] font-medium text-blue-600">
                        {rowData.leftSeats.map((seat, idx) => {
                          if (!seat) return null;
                          if (
                            seat.price &&
                            seat.price > 0 &&
                            seat.status !== 'selected' &&
                            !isSeatDisabled(seat)
                          ) {
                            return <span key={idx}>₹{seat.price}</span>;
                          }
                          if (seat.price === 0 && !isSeatDisabled(seat)) {
                            return (
                              <span key={idx} className="text-green-600">
                                Free
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      <div className="w-12"></div>
                      <div className="flex-1 text-center text-[10px] font-medium text-blue-600">
                        {rowData.rightSeats.map((seat, idx) => {
                          if (!seat) return null;
                          if (
                            seat.price &&
                            seat.price > 0 &&
                            seat.status !== 'selected' &&
                            !isSeatDisabled(seat)
                          ) {
                            return <span key={idx}>₹{seat.price}</span>;
                          }
                          if (seat.price === 0 && !isSeatDisabled(seat)) {
                            return (
                              <span key={idx} className="text-green-600">
                                Free
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Row Number and Seats */}
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-sm font-bold text-gray-400 w-8">{rowData.row}</span>

                    {/* Left side seats */}
                    <div className="flex gap-2">
                      {rowData.leftSeats.map((seat, idx) => {
                        if (!seat) return <div key={idx} className="w-14 h-14"></div>;

                        const isSelectedForCurrentTraveler =
                          selectedSeatsPerTravelerPerSegment[selectedTravelerForSeat]?.[
                            currentSegmentId
                          ] === seat.id;

                        const isSelectedByOther = Object.entries(
                          selectedSeatsPerTravelerPerSegment,
                        ).some(
                          ([travelerIdx, segments]) =>
                            travelerIdx !== selectedTravelerForSeat.toString() &&
                            segments?.[currentSegmentId] === seat.id,
                        );

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            onMouseEnter={() => setHoveredSeat(seat)}
                            onMouseLeave={() => setHoveredSeat(null)}
                            onDoubleClick={(e) => handlePriceClick(seat, e)}
                            disabled={isSeatDisabled(seat) || isSelectedByOther}
                            title={
                              seat.status === 'booked'
                                ? 'Already Booked'
                                : seat.status === 'blocked'
                                  ? 'Blocked'
                                  : `Seat ${seat.id}`
                            }
                            className={`w-14 h-14 ${getSeatClassName(seat, isSelectedForCurrentTraveler, isSelectedByOther)}`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              {getSeatIcon(seat, isSelectedForCurrentTraveler, isSelectedByOther)}
                              <span className="text-sm font-bold mt-1">{seat.id}</span>
                              {seat.price !== undefined &&
                                seat.price > 0 &&
                                !isSelectedForCurrentTraveler &&
                                seat.status !== 'selected' && (
                                  <span className="text-[10px] text-blue-600 mt-0.5">
                                    ₹{seat.price}
                                  </span>
                                )}
                            </div>
                            <div className="absolute -top-1 -right-1 text-xs">
                              {getSeatTypeBadge(seat)}
                            </div>
                            {!isSelectedForCurrentTraveler && seat.status === 'free' && (
                              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-green-600 whitespace-nowrap">
                                FREE
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Aisle */}
                    <div className="w-12 text-center">
                      <div className="text-xs text-gray-400">AISLE</div>
                    </div>

                    {/* Right side seats */}
                    <div className="flex gap-2">
                      {rowData.rightSeats.map((seat, idx) => {
                        if (!seat) return <div key={idx} className="w-14 h-14"></div>;

                        const isSelectedForCurrentTraveler =
                          selectedSeatsPerTravelerPerSegment[selectedTravelerForSeat]?.[
                            currentSegmentId
                          ] === seat.id;

                        const isSelectedByOther = Object.entries(
                          selectedSeatsPerTravelerPerSegment,
                        ).some(
                          ([travelerIdx, segments]) =>
                            travelerIdx !== selectedTravelerForSeat.toString() &&
                            segments?.[currentSegmentId] === seat.id,
                        );

                        return (
                          <button
                            key={seat.id}
                            onClick={() => handleSeatClick(seat)}
                            onMouseEnter={() => setHoveredSeat(seat)}
                            onMouseLeave={() => setHoveredSeat(null)}
                            onDoubleClick={(e) => handlePriceClick(seat, e)}
                            disabled={isSeatDisabled(seat) || isSelectedByOther}
                            title={
                              seat.status === 'booked'
                                ? 'Already Booked'
                                : seat.status === 'blocked'
                                  ? 'Blocked'
                                  : `Seat ${seat.id}`
                            }
                            className={`w-14 h-14 ${getSeatClassName(seat, isSelectedForCurrentTraveler, isSelectedByOther)}`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              {getSeatIcon(seat, isSelectedForCurrentTraveler, isSelectedByOther)}
                              <span className="text-sm font-bold mt-1">{seat.id}</span>
                              {seat.price !== undefined &&
                                seat.price > 0 &&
                                !isSelectedForCurrentTraveler &&
                                seat.status !== 'selected' && (
                                  <span className="text-[10px] text-blue-600 mt-0.5">
                                    ₹{seat.price}
                                  </span>
                                )}
                            </div>
                            <div className="absolute -top-1 -right-1 text-xs">
                              {getSeatTypeBadge(seat)}
                            </div>
                            {!isSelectedForCurrentTraveler && seat.status === 'free' && (
                              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-green-600 whitespace-nowrap">
                                FREE
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-sm font-bold text-gray-400 w-8"></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>✈️ Front</span>
            <span>🪟 Window Seat</span>
            <span>🔄 Aisle Seat</span>
            <span>✨ Extra Legroom</span>
          </div>
          <div>Double-click seat for details</div>
        </div>
      </div>

      {/* Hover Info */}
      {hoveredSeat && !isSeatDisabled(hoveredSeat) && hoveredSeat.status !== 'selected' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl px-4 py-2 flex items-center gap-3 text-sm">
            <Armchair className="w-4 h-4" />
            <span className="font-semibold">Seat {hoveredSeat.id}</span>
            {hoveredSeat.price !== undefined && (
              <span className="text-green-400">{getSeatPriceDisplay(hoveredSeat)}</span>
            )}
            {getSeatTypeLabel(hoveredSeat) && (
              <span className="text-gray-300 text-xs">{getSeatTypeLabel(hoveredSeat)}</span>
            )}
            <span className="text-gray-400 text-xs">⚡ Double-click for details</span>
          </div>
        </div>
      )}

      {/* Selected Seats Summary */}
      {Object.values(selectedSeatsPerTravelerPerSegment).some((segments) =>
        Object.values(segments).some((seatId) => seatId),
      ) && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            Selected Seats
          </h4>
          <div className="space-y-1.5">
            {Object.entries(selectedSeatsPerTravelerPerSegment).map(([travelerIdx, segments]) => {
              const selectedForSegment = segments[currentSegmentId];
              if (!selectedForSegment) return null;

              const seat = allSegmentsSeatMaps[currentSegmentId]?.find(
                (s) => s.id === selectedForSegment,
              );

              return (
                <div key={travelerIdx} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-900">
                      Passenger {parseInt(travelerIdx) + 1}
                    </span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-semibold text-green-700">Seat {selectedForSegment}</span>
                    {seat && getSeatTypeLabel(seat) && (
                      <span className="ml-2 text-xs text-gray-500">({getSeatTypeLabel(seat)})</span>
                    )}
                  </div>
                  <div className="font-semibold">
                    {seat?.price !== undefined && seat.price > 0 && (
                      <span className="text-blue-600">₹{seat.price}</span>
                    )}
                    {seat?.price === 0 && <span className="text-green-600">Free</span>}
                  </div>
                </div>
              );
            })}
            {selectedSeatPrices.filter((p) => p.segmentId === currentSegmentId).length > 0 && (
              <div className="pt-2 mt-2 border-t border-green-200 flex justify-between">
                <span className="font-semibold text-gray-900">Total for this segment</span>
                <span className="font-bold text-blue-600">
                  ₹
                  {selectedSeatPrices
                    .filter((p) => p.segmentId === currentSegmentId)
                    .reduce((sum, p) => sum + p.price, 0)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        @keyframes fade-in-out {
          0% { opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out;
        }
        
        .animate-fade-in-out {
          animation: fade-in-out 2s ease-out;
        }
      `}</style>
    </div>
  );
}
