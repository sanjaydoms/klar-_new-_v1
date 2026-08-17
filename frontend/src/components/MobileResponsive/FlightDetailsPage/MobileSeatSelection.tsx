import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Seat {
  seatNo: string;
  seatPosition: { row: number; column: number };
  isBooked: boolean;
  isLegroom: boolean;
  isAisle: boolean;
  isExitRow?: boolean;
  AirlineCode: string;
  amount: number;
  isEmdResynced: boolean;
  iswca: boolean;
}

interface SelectedSeatItem {
  segmentId: string;
  code: string;
  price: number;
  seatNo: string;
  isLegroom?: boolean;
  isAisle?: boolean;
  isExitRow?: boolean;
}

type SelectedSeatsMap = {
  [passengerKey: string]: {
    [segmentId: string]: SelectedSeatItem | null;
  };
};

interface SeatSelectionProps {
  seats?: { [segmentId: string]: Seat[] };
  onSelect?: (passengerKey: string, seat: Seat, segmentId: string) => void;
  passengerKeys?: string[];
  activePassenger?: number;
  setActivePassenger?: (index: number) => void;
  isPassengerComplete?: (index: number) => boolean;
  selectedSeats?: SelectedSeatsMap;
  segmentIds?: string[];
  currentSegmentId?: string;
  onSegmentChange?: (index: number) => void;
}

const MobileSeatSelection: React.FC<SeatSelectionProps> = ({
  seats = {},
  onSelect,
  passengerKeys = [],
  activePassenger = 0,
  setActivePassenger,
  isPassengerComplete,
  selectedSeats = {},
  segmentIds = [],
  currentSegmentId = segmentIds[0] || '',
  onSegmentChange,
}) => {
  const currentPassenger = passengerKeys[activePassenger] || 'P1';
  const passengerSeats = selectedSeats[currentPassenger] || {};
  const currentSelection = passengerSeats[currentSegmentId] || null;
  const selectedSegmentId = currentSegmentId;

  const getSeatColor = (seat: Seat, segmentId: string) => {
    let isSelectedByAnyone = false;
    for (const key of passengerKeys) {
      const passengerSeatMap = selectedSeats[key] || {};
      const selectedSeat = passengerSeatMap[segmentId];
      if (selectedSeat && selectedSeat.code === seat.seatNo) {
        isSelectedByAnyone = true;
        break;
      }
    }

    if (seat.isBooked) return 'bg-gray-200 border-gray-300 cursor-not-allowed opacity-50';
    if (isSelectedByAnyone) return 'bg-blue-500 border-blue-500 text-white';  // ✅ Use this instead
    if (seat.isLegroom || seat.isExitRow)
      return 'bg-green-100 border-green-400 hover:border-green-600';
    if (seat.isAisle) return 'bg-yellow-50 border-yellow-300 hover:border-yellow-500';
    return 'bg-white border-[#DAC1BF] hover:border-primary';
  };

  const handleSeatClick = (seat: Seat, segmentId: string) => {
    if (seat.isBooked) return;

    let isSelectedByOther = false;
    for (const key of passengerKeys) {
      if (key === currentPassenger) continue;
      const passengerSeatMap = selectedSeats[key] || {};
      const selectedSeat = passengerSeatMap[segmentId];
      if (selectedSeat && selectedSeat.code === seat.seatNo) {
        isSelectedByOther = true;
        break;
      }
    }

    if (isSelectedByOther) {
      // Seat is taken by another passenger - prevent selection
      return;
    }

    const isAlreadySelected = passengerSeats[segmentId]?.code === seat.seatNo;

    if (isAlreadySelected) {
      const seatToRemove: Seat = {
        seatNo: passengerSeats[segmentId]!.seatNo,
        seatPosition: { row: 0, column: 0 },
        isBooked: true,
        isLegroom: passengerSeats[segmentId]!.isLegroom || false,
        isAisle: passengerSeats[segmentId]!.isAisle || false,
        isExitRow: passengerSeats[segmentId]!.isExitRow || false,
        AirlineCode: passengerSeats[segmentId]!.code,
        amount: passengerSeats[segmentId]!.price,
        isEmdResynced: false,
        iswca: false,
      };
      onSelect?.(currentPassenger, seatToRemove, segmentId);
      return;
    }

    onSelect?.(currentPassenger, seat, segmentId);
  };

  const getSeatPrice = (seat: Seat) => {
    if (seat.amount === 0) return 'Free';
    return `₹${seat.amount}`;
  };

  const handlePassengerClick = (index: number) => {
    setActivePassenger?.(index);
  };

  const handleRemoveSelectedSeat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSelection) {
      const seatToRemove: Seat = {
        seatNo: currentSelection.seatNo,
        seatPosition: { row: 0, column: 0 },
        isBooked: true,
        isLegroom: currentSelection.isLegroom || false,
        isAisle: currentSelection.isAisle || false,
        isExitRow: currentSelection.isExitRow || false,
        AirlineCode: currentSelection.code,
        amount: currentSelection.price,
        isEmdResynced: false,
        iswca: false,
      };
      onSelect?.(currentPassenger, seatToRemove, currentSelection.segmentId);
    }
  };

  // Check if there are any seats available (not booked)
  const hasAnyAvailableSeats = () => {
    for (const segmentId of segmentIds) {
      const seatArray = seats[segmentId];
      if (seatArray && seatArray.length > 0) {
        const availableSeats = seatArray.filter(seat => !seat.isBooked);
        if (availableSeats.length > 0) {
          return true;
        }
      }
    }
    return false;
  };

  // Check if any seats exist at all
  const hasAnySeats = Object.values(seats).some((seatArray) => seatArray && seatArray.length > 0);

  // Check if seats are available for the current segment
  const hasSeatsForCurrentSegment = () => {
    const currentSeats = seats[currentSegmentId];
    return currentSeats && currentSeats.length > 0 && currentSeats.some(seat => !seat.isBooked);
  };

  const getSelectedCount = () => {
    let count = 0;
    for (const passengerKey of passengerKeys) {
      const passengerSeatMap = selectedSeats[passengerKey] || {};
      for (const segId of segmentIds) {
        if (passengerSeatMap[segId]) {
          count++;
        }
      }
    }
    return count;
  };

  const getPassengerCompletedSegments = (passengerKey: string) => {
    const passengerSeatMap = selectedSeats[passengerKey] || {};
    let completed = 0;
    for (const segId of segmentIds) {
      if (passengerSeatMap[segId]) {
        completed++;
      }
    }
    return completed;
  };

  const isPassengerFullyComplete = (passengerKey: string) => {
    const passengerSeatMap = selectedSeats[passengerKey] || {};
    for (const segId of segmentIds) {
      if (!passengerSeatMap[segId]) {
        return false;
      }
    }
    return true;
  };

  const selectedCount = getSelectedCount();
  const totalSeatsNeeded = passengerKeys.length * segmentIds.length;

  // If no seats exist at all
  if (!hasAnySeats) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Seat Selection</h3>
          <span className="text-sm text-gray-500">
            {selectedCount}/{totalSeatsNeeded} selected
          </span>
        </div>

        {/* Passenger buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {passengerKeys.map((key, index) => {
            const isActive = activePassenger === index;
            const isComplete = isPassengerFullyComplete(key);
            const completedSegments = getPassengerCompletedSegments(key);

            return (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePassengerClick(index);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${isActive
                  ? 'bg-primary text-white shadow-md'
                  : isComplete
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {key}
                {completedSegments > 0 && !isComplete && (
                  <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {completedSegments}/{segmentIds.length}
                  </span>
                )}
                {isComplete && <CheckCircle className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">
            Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
          </p>
        </div>

        {/* No seats available message */}
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-gray-700 mb-1">No Seats Available</p>
          <p className="text-sm text-gray-500 text-center">
            Seat selection is currently not available for this flight.
            <br />
            Please proceed with your booking.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-sm text-gray-600">Booked</span>
          </div>
        </div>
      </div>
    );
  }

  // If no seats available for the current segment (all booked)
  if (!hasSeatsForCurrentSegment()) {
    // Check if there are seats in other segments
    const hasSeatsInOtherSegments = segmentIds.some(id => {
      if (id === currentSegmentId) return false;
      const seatsForSegment = seats[id];
      return seatsForSegment && seatsForSegment.length > 0 && seatsForSegment.some(seat => !seat.isBooked);
    });

    return (
      <div onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Seat Selection</h3>
          <span className="text-sm text-gray-500">
            {selectedCount}/{totalSeatsNeeded} selected
          </span>
        </div>

        {/* Passenger buttons */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {passengerKeys.map((key, index) => {
            const isActive = activePassenger === index;
            const isComplete = isPassengerFullyComplete(key);
            const completedSegments = getPassengerCompletedSegments(key);

            return (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePassengerClick(index);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${isActive
                  ? 'bg-primary text-white shadow-md'
                  : isComplete
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                {key}
                {completedSegments > 0 && !isComplete && (
                  <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full">
                    {completedSegments}/{segmentIds.length}
                  </span>
                )}
                {isComplete && <CheckCircle className="w-3 h-3" />}
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">
            Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
          </p>
        </div>

        {/* Segment tabs */}
        {segmentIds.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {segmentIds.map((segId, index) => {
              const hasSeatInSegment = passengerSeats[segId] !== null && passengerSeats[segId] !== undefined;
              const isActiveSegment = selectedSegmentId === segId;

              return (
                <button
                  key={segId}
                  onClick={() => onSegmentChange?.(index)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${isActiveSegment
                    ? 'bg-primary text-white'
                    : hasSeatInSegment
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  Segment {index + 1}
                  {hasSeatInSegment && <CheckCircle className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        )}

        {/* No seats available for this segment message */}
        <div className="flex flex-col items-center justify-center py-8 px-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
            <svg
              className="w-7 h-7 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-yellow-800 mb-1">No Seats Available for This Segment</p>
          <p className="text-xs text-yellow-700 text-center">
            All seats are booked for this segment.
            {hasSeatsInOtherSegments && (
              <span className="block mt-1">
                Please select a different segment to choose a seat.
              </span>
            )}
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-400"></div>
            <span className="text-sm text-gray-600">Booked</span>
          </div>
        </div>
      </div>
    );
  }

  // Render the seat map when seats are available
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">Seat Selection</h3>
        <span className="text-sm text-gray-500">
          {selectedCount}/{totalSeatsNeeded} selected
        </span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {passengerKeys.map((key, index) => {
          const isActive = activePassenger === index;
          const isComplete = isPassengerFullyComplete(key);
          const completedSegments = getPassengerCompletedSegments(key);

          return (
            <button
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                handlePassengerClick(index);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${isActive
                ? 'bg-primary text-white shadow-md'
                : isComplete
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {key}
              {completedSegments > 0 && !isComplete && (
                <span className="text-xs bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full">
                  {completedSegments}/{segmentIds.length}
                </span>
              )}
              {isComplete && <CheckCircle className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700">
          Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
        </p>
        {currentSelection && (
          <p className="text-xs text-green-600 mt-1">
            Selected: Seat {currentSelection.seatNo} (Segment {currentSelection.segmentId})
          </p>
        )}
        {!currentSelection && (
          <p className="text-xs text-gray-500 mt-1">
            Click on a seat to select it for this segment
          </p>
        )}
      </div>

      {segmentIds.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {segmentIds.map((segId, index) => {
            const hasSeatInSegment = passengerSeats[segId] !== null && passengerSeats[segId] !== undefined;

            return (
              <button
                key={segId}
                onClick={() => onSegmentChange?.(index)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${selectedSegmentId === segId
                  ? 'bg-primary text-white'
                  : hasSeatInSegment
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Segment {index + 1}
                {hasSeatInSegment && <CheckCircle className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-4 overflow-x-auto max-h-[320px] overflow-y-auto">
        <div className="min-w-[300px]">
          {Object.entries(seats).map(([segmentId, seatArray]) => {
            if (segmentId !== selectedSegmentId) return null;
            if (!seatArray || seatArray.length === 0) return null;

            const maxRow = Math.max(...seatArray.map((s) => s.seatPosition.row));
            const minRow = Math.min(...seatArray.map((s) => s.seatPosition.row));
            const maxCol = Math.max(...seatArray.map((s) => s.seatPosition.column));
            const minCol = Math.min(...seatArray.map((s) => s.seatPosition.column));
            const columnLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

            return (
              <div key={segmentId}>
                <div className="text-xs text-gray-500 mb-2">Segment {segmentId}</div>
                <div className="grid grid-cols-6 gap-2 mb-2 sticky top-0 bg-white z-10 py-2">
                  {columnLabels.slice(minCol - 1, maxCol).map((col) => (
                    <div key={col} className="text-center text-sm font-semibold text-gray-500">
                      {col}
                    </div>
                  ))}
                </div>

                {Array.from({ length: maxRow - minRow + 1 }, (_, i) => minRow + i).map((row) => {
                  const rowSeats = seatArray.filter((s) => s.seatPosition.row === row);
                  const sortedSeats = rowSeats.sort(
                    (a, b) => a.seatPosition.column - b.seatPosition.column,
                  );

                  return (
                    <div key={row} className="grid grid-cols-6 gap-2 mb-2">
                      {sortedSeats.map((seat) => {
                        // Check if this seat is selected by ANY passenger
                        let isSelectedByAnyone = false;
                        for (const key of passengerKeys) {
                          const passengerSeatMap = selectedSeats[key] || {};
                          const selectedSeat = passengerSeatMap[segmentId];
                          if (selectedSeat && selectedSeat.code === seat.seatNo) {
                            isSelectedByAnyone = true;
                            break;
                          }
                        }

                        return (
                          <button
                            key={seat.seatNo}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSeatClick(seat, segmentId);
                            }}
                            disabled={seat.isBooked}
                            className={`
        w-full aspect-square rounded-lg border-2 text-xs font-medium transition-all duration-200 flex flex-col items-center justify-center
        ${getSeatColor(seat, segmentId)}
        ${!seat.isBooked && 'hover:scale-105 hover:shadow-md'}
      `}
                          >
                            <span>{seat.seatNo}</span>
                            {seat.amount > 0 && !seat.isBooked && (
                              <span className="text-[8px] font-normal">
                                {isSelectedByAnyone ? '✓' : `₹${seat.amount}`}  {/* ✅ Use the correct variable */}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-6 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span className="text-sm text-gray-600">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-gray-600">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-400"></div>
          <span className="text-sm text-gray-600">Booked</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-400"></div>
          <span className="text-sm text-gray-600">Extra Legroom</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-50 border border-yellow-300"></div>
          <span className="text-sm text-gray-600">Aisle</span>
        </div>
      </div>

      {currentSelection && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
          <div>
            <span className="text-sm text-gray-600">Selected Seat:</span>
            <span className="text-lg font-bold text-green-700 ml-2">{currentSelection.seatNo}</span>
            <span className="text-sm text-gray-500 ml-2">₹{currentSelection.price}</span>
            <span className="text-xs text-gray-400 ml-2">
              {currentSelection.isLegroom && 'Extra Legroom'}
              {currentSelection.isExitRow && 'Exit Row'}
              {currentSelection.isAisle && 'Aisle'}
            </span>
            <span className="text-xs text-gray-400 ml-2">Segment {currentSelection.segmentId}</span>
          </div>
          <button
            onClick={handleRemoveSelectedSeat}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Remove
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <span className="text-sm text-gray-500">Seat Price</span>
          <div className="text-2xl font-bold text-[#EF4444]">
            {currentSelection ? `₹${currentSelection.price}` : 'Select a seat'}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {currentSelection ? 'Seat selected' : 'Click a seat to select'}
        </div>
      </div>
    </div>
  );
};

export default MobileSeatSelection;