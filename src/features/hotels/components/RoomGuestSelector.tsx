import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { RoomOccupancy } from '../types/hotelTypes';

interface RoomGuestSelectorProps {
  rooms: RoomOccupancy[];
  onChange: (rooms: RoomOccupancy[]) => void;
  onApply?: (rooms: RoomOccupancy[]) => void;
  className?: string;
  style?: React.CSSProperties;
  maxRooms?: number;
}

const RoomGuestSelector = ({
  rooms,
  onChange,
  onApply,
  className = '',
  style,
  maxRooms = 9,
}: RoomGuestSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localRooms, setLocalRooms] = useState<RoomOccupancy[]>(rooms);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track when a native <select> is open so we suppress outside-click
  const selectOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setLocalRooms(rooms);
    }
  }, [isOpen, rooms]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      // If a native <select> popup is open, ignore this mousedown entirely
      if (selectOpenRef.current) return;

      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    // Use capture phase so we get it before anything else
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const getSummaryText = (r: RoomOccupancy[]) => {
    const totalRooms = r.length;
    const totalAdults = r.reduce((sum, room) => sum + room.Adults, 0);
    const totalChildren = r.reduce((sum, room) => sum + room.Children, 0);

    const parts = [`${totalRooms} Room${totalRooms > 1 ? 's' : ''}`];
    if (totalAdults > 0) parts.push(`${totalAdults} Adult${totalAdults > 1 ? 's' : ''}`);
    if (totalChildren > 0) parts.push(`${totalChildren} Child${totalChildren > 1 ? 'ren' : ''}`);
    return parts.join(', ');
  };

  const updateRoom = useCallback(
    (index: number, field: 'Adults' | 'Children', value: number) => {
      setLocalRooms((prevRooms) => {
        const newRooms = [...prevRooms];
        const room = newRooms[index];
        if (!room) return prevRooms;

        const updatedRoom: RoomOccupancy = {
          ...room,
          Adults: room.Adults,
          Children: room.Children,
          childrenAges: room.childrenAges || [],
          paxes: room.paxes || [],
        };

        if (field === 'Adults') updatedRoom.Adults = Math.max(1, value);
        if (field === 'Children') {
          const childCount = Math.max(0, value);
          updatedRoom.Children = childCount;
          const currentAges = room.childrenAges || [];
          updatedRoom.childrenAges =
            childCount > currentAges.length
              ? [...currentAges, ...Array(childCount - currentAges.length).fill(5)]
              : currentAges.slice(0, childCount);
        }

        newRooms[index] = updatedRoom;
        return newRooms;
      });
    },
    [],
  );

  const updateChildAge = useCallback(
    (roomIndex: number, childIndex: number, age: number) => {
      setLocalRooms((prevRooms) => {
        const newRooms = [...prevRooms];
        const room = newRooms[roomIndex];
        if (room && room.childrenAges) {
          const childrenAges = [...room.childrenAges];
          childrenAges[childIndex] = Math.max(0, Math.min(11, age));
          newRooms[roomIndex] = {
            ...room,
            childrenAges,
            Adults: room.Adults,
            Children: room.Children,
            paxes: room.paxes || [],
          };
        }
        return newRooms;
      });
    },
    [],
  );

  const addRoom = useCallback(() => {
    setLocalRooms((prevRooms) => {
      if (prevRooms.length < maxRooms) {
        return [...prevRooms, { Adults: 1, Children: 0, childrenAges: [], paxes: [] }];
      }
      return prevRooms;
    });
  }, [maxRooms]);

  const removeRoom = useCallback(
    (index: number) => {
      setLocalRooms((prevRooms) => {
        if (prevRooms.length > 1) {
          return prevRooms.filter((_, i) => i !== index);
        }
        return prevRooms;
      });
    },
    [],
  );

  /** Stop ALL events bubbling out of the dropdown panel */
  const stopAll = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    // Prevent the parent div's onClick from firing (search bar wrapper)
    e.nativeEvent?.stopImmediatePropagation?.();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full flex items-center text-left transition-all ${className}`}
        style={style}
      >
        <span className="truncate">{getSummaryText(rooms)}</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          onClick={stopAll}
          onMouseDown={stopAll}
          onPointerDown={stopAll}
          onTouchStart={stopAll}
          className={`
            absolute z-[9999] mt-2 bg-white border border-gray-200 rounded-2xl
            shadow-[0_8px_30px_rgb(0,0,0,0.14)] p-4
            transition-all duration-200
            /* Responsive width & position */
            left-1/2 -translate-x-1/2
            w-[calc(100vw-24px)]
            xs:w-[320px]
            sm:w-[360px]
            ${localRooms.length > 1 ? 'md:w-[580px]' : 'md:w-[340px]'}
          `}
          style={{
            maxWidth: 'calc(100vw - 24px)',
          }}
        >
          <div className="flex flex-col" style={{ maxHeight: '70vh' }}>
            {/* Scrollable rooms list */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div
                className={`grid gap-x-6 gap-y-5 ${
                  localRooms.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {localRooms.map((room, index) => (
                  <div key={index} className="relative">
                    {/* Room header */}
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900 text-sm tracking-wide">
                        ROOM {index + 1}
                      </h4>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { stopAll(e); removeRoom(index); }}
                          className="text-red-500 hover:text-red-600 text-xs font-semibold uppercase tracking-wider bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Adults row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">Adults</div>
                          <div className="text-[11px] text-gray-400">12+ yr</div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onMouseDown={stopAll}
                            onClick={(e) => { stopAll(e); updateRoom(index, 'Adults', room.Adults - 1); }}
                            disabled={room.Adults <= 1}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                       hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800 text-sm">
                            {room.Adults}
                          </span>
                          <button
                            type="button"
                            onMouseDown={stopAll}
                            onClick={(e) => { stopAll(e); updateRoom(index, 'Adults', room.Adults + 1); }}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                       hover:bg-gray-50 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {/* Children row */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-gray-900 text-sm">Children</div>
                            <div className="text-[11px] text-gray-400">0–11 yr</div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onMouseDown={stopAll}
                              onClick={(e) => { stopAll(e); updateRoom(index, 'Children', room.Children - 1); }}
                              disabled={room.Children <= 0}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                         hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <span className="w-6 text-center font-bold text-gray-800 text-sm">
                              {room.Children}
                            </span>
                            <button
                              type="button"
                              onMouseDown={stopAll}
                              onClick={(e) => { stopAll(e); updateRoom(index, 'Children', room.Children + 1); }}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center
                                         hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                          </div>
                        </div>

                        {/* Child age selects */}
                        {room.Children > 0 && (
                          <div className="mt-2 pt-3 border-t border-gray-100">
                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">
                              Child Ages
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {Array.from({ length: room.Children }).map((_, childIndex) => (
                                <div key={childIndex} className="flex flex-col">
                                  <label className="text-[10px] text-gray-500 mb-1">
                                    Child {childIndex + 1}
                                  </label>
                                  <select
                                    value={room.childrenAges?.[childIndex] ?? 5}
                                    onMouseDown={stopAll}
                                    onFocus={() => { selectOpenRef.current = true; }}
                                    onBlur={() => { selectOpenRef.current = false; }}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      selectOpenRef.current = false;
                                      updateChildAge(index, childIndex, parseInt(e.target.value));
                                    }}
                                    className="w-full px-2 py-1 text-xs border border-gray-200 rounded
                                               bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                               outline-none transition-all"
                                  >
                                    {Array.from({ length: 12 }, (_, i) => i).map((age) => (
                                      <option key={age} value={age}>
                                        {age} {age === 1 ? 'yr' : 'yrs'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col gap-2.5 shrink-0">
              {localRooms.length < maxRooms && (
                <button
                  type="button"
                  onMouseDown={stopAll}
                  onClick={(e) => { stopAll(e); addRoom(); }}
                  className="w-full py-2 text-blue-600 hover:bg-blue-50 border border-blue-200
                             rounded-lg font-bold text-sm transition-all"
                >
                  + ADD ANOTHER ROOM
                </button>
              )}
              <button
                type="button"
                onMouseDown={stopAll}
                onClick={(e) => { 
                  stopAll(e); 
                  onChange(localRooms);
                  setIsOpen(false); 
                  if (onApply) onApply(localRooms);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500
                           hover:from-blue-700 hover:to-blue-600 text-white py-2.5 rounded-lg
                           font-bold shadow-md hover:shadow-lg transition-all text-sm"
              >
                APPLY
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomGuestSelector;
