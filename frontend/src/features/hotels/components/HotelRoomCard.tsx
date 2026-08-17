import React from 'react';

interface HotelRoomCardProps {
  room: any; // RoomProduct
  nights: number;
  onSelect: (room: any) => void;
}

export const HotelRoomCard: React.FC<HotelRoomCardProps> = ({ room, nights, onSelect }) => {
  return (
    <div className="hotel-room-card border rounded p-4 shadow-sm flex flex-col gap-2">
      {/* 
        TODO: Shows room name, board type, beds, max occupancy, refundable badge, price per night + total 
      */}
      <h3 className="font-bold text-lg">Room Name Placeholder</h3>
      <div>Price and Details Placeholder</div>
      <button
        className="bg-blue-600 text-white py-2 px-4 rounded mt-auto hover:bg-blue-700"
        onClick={() => onSelect(room)}
      >
        Select Room
      </button>
    </div>
  );
};
