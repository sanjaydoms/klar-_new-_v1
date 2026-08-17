import React from 'react';

interface HotelVoucherProps {
  booking: any;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    (d.getHours()
      ? `, ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
      : '')
  );
};

const formatDateOnly = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const HotelVoucher: React.FC<HotelVoucherProps> = ({ booking }) => {
  if (!booking) return null;

  // Read the booking record, not a supplier's raw response.
  //
  // This component used to read `booking.tripJackResponse.*` /
  // `booking.rateGainRequest.*`. Neither reaches the browser: both endpoints
  // hand-map a DTO (bookings.service.ts:300-334, list.service.ts:49-75) and drop
  // the provider blobs, which the DB keeps for audit only. So EVERY voucher —
  // TripJack and RateGain alike — printed "Hotel Name", "Address not available",
  // "N/A", "N/A". The fields below are on the DTO and are written by both
  // suppliers' commit paths, which is why the backend PDF and the confirmation
  // email have always rendered correctly from exactly these.
  const hotelName = booking?.hotelName || 'Hotel Name';
  const address = [booking?.hotelAddress, booking?.city].filter(Boolean).join(', ');

  const checkIn = booking?.checkIn ? formatDateOnly(booking.checkIn) : 'N/A';
  const checkOut = booking?.checkOut ? formatDateOnly(booking.checkOut) : 'N/A';
  const bookingDate = booking?.createdAt ? formatDate(booking.createdAt) : 'N/A';
  const confirmationNumber = booking?.klarBookingId || booking?.confirmationNumber || booking?.reservationId || 'PENDING';

  // Contact details. `guestMobile` is written by both commit paths but is not on
  // either DTO, so the phone row is rendered only when it is actually present —
  // an empty row beats a confident "N/A" on a document a guest may hand to a
  // front desk.
  const email = booking?.guestEmail || '';
  const phone = booking?.guestMobile || '';

  const primaryGuest = booking?.guestName || 'Guest';

  const displayRooms = Array.isArray(booking?.rooms) ? booking.rooms : [];
  const totalRooms = displayRooms.length || 1;
  const roomType = displayRooms[0]?.roomType || '';

  // Meal plan and per-room guest counts are NOT reliable on the booking record:
  // commit.service.ts:909 reads `room.MealPlan` while the transformer emits
  // `BoardName`, and the TripJack branch reads a `payload.boardType` nothing
  // writes — so `boardType` arrives empty for both suppliers. RateGain also
  // hardcodes 2 guests. Both are backend write-path bugs; printing a confident
  // "Room Only" / "2 Adults" here would just launder them onto the voucher.
  const mealPlan = displayRooms[0]?.boardType || '';
  const guestCount = displayRooms.reduce(
    (acc: number, r: any) => acc + (Number(r?.guests) || 0),
    0,
  );

  // One honest number.
  //
  // Base fare and taxes are never persisted for either supplier — they are
  // computed in flight (rategain.adapter.ts:112, tripjack.adapter.ts:45, where
  // taxes are hardcoded 0) and dropped before the booking is written. The old
  // three-line "breakdown" filled the gap with `netAmount || totalAmount` and a
  // literal 0, so every voucher asserted base == total and zero tax. `netAmount`
  // is not even on the DTO, so it renders as NaN.
  //
  // The one figure we can stand behind is what the guest paid. The backend PDF
  // (hotel-pdf.service.ts:171-173) already shows exactly this.
  const totalFare = Number(booking?.totalAmount ?? 0);
  const currency = booking?.currencyCode || 'INR';

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-voucher-container, .print-voucher-container * {
            visibility: visible;
          }
          .print-voucher-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }
      `}</style>
      <div
        className="print-voucher-container bg-white text-black p-8 max-w-4xl mx-auto hidden print:block"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-black text-blue-900 tracking-tighter">Klar</h1>
            <p className="text-gray-500 text-sm mt-1">Premium Travel Services</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest">
              Hotel Voucher
            </h2>
            <p className="text-gray-600 font-medium mt-1">
              Booking ID: <span className="text-blue-600">{confirmationNumber}</span>
            </p>
            <p className="text-gray-500 text-sm">Issued On: {bookingDate}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-8 text-center font-bold">
          Status: CONFIRMED — PAID IN FULL
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Guest Details */}
          <div>
            <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-gray-800">
              Guest Information
            </h3>
            <p className="font-bold text-gray-800 text-xl mb-2">{primaryGuest}</p>
            {email && (
              <p className="text-gray-600 mb-1">
                <span className="font-semibold w-20 inline-block">Email:</span> {email}
              </p>
            )}
            {phone && (
              <p className="text-gray-600 mb-1">
                <span className="font-semibold w-20 inline-block">Phone:</span> {phone}
              </p>
            )}
            {guestCount > 0 && (
              <p className="text-gray-600">
                <span className="font-semibold w-20 inline-block">Guests:</span> {guestCount}
              </p>
            )}
          </div>

          {/* Hotel Details */}
          <div>
            <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-gray-800">
              Hotel Details
            </h3>
            <p className="font-bold text-blue-900 text-xl mb-2">{hotelName}</p>
            {address && <p className="text-gray-600 mb-4 leading-relaxed">{address}</p>}

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Check-in</p>
                <p className="font-bold text-gray-800">{checkIn}</p>
                <p className="text-sm text-gray-500">14:00 PM</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Check-out</p>
                <p className="font-bold text-gray-800">{checkOut}</p>
                <p className="text-sm text-gray-500">12:00 PM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Room Details Table */}
        <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-gray-800">
          Accommodation Details
        </h3>
        <table className="w-full mb-8 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Room Type</th>
              <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Rooms</th>
              {mealPlan && (
                <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Meal Plan</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-800 font-medium">{roomType || '—'}</td>
              <td className="py-3 px-4 text-gray-600">{totalRooms}</td>
              {mealPlan && <td className="py-3 px-4 text-gray-600">{mealPlan}</td>}
            </tr>
          </tbody>
        </table>

        {/* Pricing Breakdown */}
        <div className="flex justify-end mb-10">
          <div className="w-1/2 bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 border-b border-gray-200 pb-2">
              Payment
            </h3>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 text-lg">Total Amount Paid</span>
              <span className="font-bold text-blue-600 text-2xl">
                {currency}{' '}
                {totalFare.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-3">Inclusive of all taxes and fees.</p>
          </div>
        </div>

        {/* Important Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-md font-bold text-gray-800 mb-3">Important Information & Policies</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>
              Please present a valid photo ID (Passport/Aadhar/Driving License) at the time of
              check-in.
            </li>
            <li>
              Early check-in and late check-out are subject to availability and may incur additional
              charges.
            </li>
            <li>
              Any extra bed/person charges, if applicable, are to be paid directly to the hotel.
            </li>
            <li>
              For any cancellation, please refer to the cancellation policy provided at the time of
              booking.
            </li>
          </ul>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          This is an electronically generated voucher and does not require a signature. <br />
          For support, please contact Klar Travels at support@klartravels.com.
        </div>
      </div>
    </>
  );
};

export default HotelVoucher;
