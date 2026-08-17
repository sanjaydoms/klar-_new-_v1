import React from 'react';

interface CabVoucherProps {
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

export const CabVoucher: React.FC<CabVoucherProps> = ({ booking }) => {
  if (!booking) return null;

  const cabDetails =
    booking?.tripJackResponse?.cabDetails || booking?.tripJackResponse?.body?.cabDetails || {};
  const serviceName = cabDetails?.name || 'Premium Cab Service';

  const journeyDateStr = cabDetails?.pickupTime || booking?.createdAt;
  const journeyDate = journeyDateStr ? formatDate(journeyDateStr) : 'N/A';

  const bookingDate = booking?.createdAt ? formatDate(booking.createdAt) : 'N/A';
  const confirmationNumber = booking?.klarBookingId || booking?.confirmationNumber || booking?.bookingId || 'PENDING';

  // Extract User Details
  const deliveryInfo =
    booking?.tripJackResponse?.order?.deliveryInfo ||
    booking?.tripJackResponse?.body?.order?.deliveryInfo;
  const email = deliveryInfo?.emails?.[0] || 'N/A';
  const phone = deliveryInfo?.contacts?.[0]
    ? `${deliveryInfo?.code?.[0] || ''} ${deliveryInfo?.contacts?.[0]}`
    : 'N/A';

  const travellerInfo =
    booking?.tripJackResponse?.travellerInfo ||
    booking?.tripJackResponse?.body?.travellerInfo ||
    [];
  const primaryGuest = travellerInfo[0] ? `${travellerInfo[0].fN} ${travellerInfo[0].lN}` : 'Guest';

  // Pricing Breakdown
  const amount = booking?.netAmount || booking?.totalAmount || 0;

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
        <div className="flex justify-between items-center border-b-2 border-yellow-500 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Klar</h1>
            <p className="text-gray-500 text-sm mt-1">Premium Travel Services</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest">
              Cab Voucher
            </h2>
            <p className="text-gray-600 font-medium mt-1">
              Booking ID: <span className="text-yellow-600">{confirmationNumber}</span>
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
              Passenger Information
            </h3>
            <p className="font-bold text-gray-800 text-xl mb-2">{primaryGuest}</p>
            <p className="text-gray-600 mb-1">
              <span className="font-semibold w-20 inline-block">Email:</span> {email}
            </p>
            <p className="text-gray-600 mb-1">
              <span className="font-semibold w-20 inline-block">Phone:</span> {phone}
            </p>
          </div>

          {/* Cab Details */}
          <div>
            <h3 className="text-lg font-bold border-b border-gray-200 pb-2 mb-3 text-gray-800">
              Journey Details
            </h3>
            <p className="font-bold text-gray-900 text-xl mb-2">{serviceName}</p>

            <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Pickup Time</p>
                <p className="font-bold text-gray-800">{journeyDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Breakdown */}
        <div className="flex justify-end mb-10 mt-8">
          <div className="w-1/2 bg-gray-50 p-5 rounded-lg border border-gray-100">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 border-b border-gray-200 pb-2">
              Payment Breakdown
            </h3>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Base Fare & Taxes</span>
              <span className="font-medium text-gray-800">
                INR {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between mb-4 pb-4 border-b border-gray-200">
              <span className="text-gray-600">Extra Fees</span>
              <span className="font-medium text-gray-800">INR 0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 text-lg">Total Amount Paid</span>
              <span className="font-bold text-yellow-600 text-2xl">
                INR {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Important Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-md font-bold text-gray-800 mb-3">Important Information & Policies</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>Please present a valid photo ID to the driver at the time of boarding.</li>
            <li>Driver details will be shared via SMS/Email 2-4 hours prior to the journey.</li>
            <li>Waiting charges may apply if the passenger is delayed beyond the grace period.</li>
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

export default CabVoucher;
