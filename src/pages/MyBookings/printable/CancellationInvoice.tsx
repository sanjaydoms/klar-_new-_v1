import React from 'react';

interface CancellationInvoiceProps {
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

export const CancellationInvoice: React.FC<CancellationInvoiceProps> = ({ booking }) => {
  if (!booking) return null;

  const isCab = booking?.serviceType?.toLowerCase() === 'cab' || booking?.bookingType === 'CAB';
  const serviceName = isCab
    ? booking?.tripJackResponse?.cabDetails?.name ||
      booking?.tripJackResponse?.body?.cabDetails?.name ||
      'Cab Booking'
    : booking?.tripJackResponse?.itemInfos?.HOTEL?.hInfo?.name ||
      booking?.tripJackResponse?.body?.itemInfos?.HOTEL?.hInfo?.name ||
      'Hotel Booking';

  const bookingDate = booking?.createdAt ? formatDate(booking.createdAt) : 'N/A';
  const cancellationDate = booking?.updatedAt
    ? formatDate(booking.updatedAt)
    : formatDate(new Date().toISOString());
  const confirmationNumber =
    booking?.klarBookingId || booking?.confirmationNumber || booking?.reservationId || booking?.bookingId || 'UNKNOWN';

  // Extract User Details
  const deliveryInfo =
    booking?.tripJackResponse?.order?.deliveryInfo ||
    booking?.tripJackResponse?.body?.order?.deliveryInfo;
  const email = deliveryInfo?.emails?.[0] || 'N/A';
  const phone = deliveryInfo?.contacts?.[0]
    ? `${deliveryInfo?.code?.[0] || ''} ${deliveryInfo?.contacts?.[0]}`
    : 'N/A';

  const travellerInfo = isCab
    ? booking?.tripJackResponse?.travellerInfo ||
      booking?.tripJackResponse?.body?.travellerInfo ||
      []
    : booking?.tripJackResponse?.itemInfos?.HOTEL?.roomTravellerInfo ||
      booking?.tripJackResponse?.body?.itemInfos?.HOTEL?.roomTravellerInfo ||
      [];

  let primaryGuest = booking?.guestName || 'Guest';
  if (!booking?.guestName) {
    if (isCab && travellerInfo[0]) {
      primaryGuest = `${travellerInfo[0]?.fN || ''} ${travellerInfo[0]?.lN || ''}`;
    } else if (!isCab && travellerInfo[0]?.travellerInfo?.[0]) {
      const ft = travellerInfo[0].travellerInfo[0];
      primaryGuest = `${ft.fN} ${ft.lN}`;
    }
  }

  // Pricing Breakdown
  const tjItemInfo =
    booking?.tripJackResponse?.itemInfos?.HOTEL ||
    booking?.tripJackResponse?.body?.itemInfos?.HOTEL ||
    {};
  const firstRoomRis = tjItemInfo.ops?.[0]?.ris?.[0] || {};
  const tfcs = firstRoomRis?.tfcs || firstRoomRis?.fc || {};
  const totalPaid = Number(tfcs.TF || booking?.netAmount || booking?.totalAmount || 0);

  // Extract cancellation penalty
  let penaltyAmount = 0;
  if (booking?.cancelChargesInfo?.totalCharge !== undefined) {
    penaltyAmount = booking.cancelChargesInfo.totalCharge;
  } else if (booking?.cancelCharge !== undefined) {
    penaltyAmount = booking.cancelCharge;
  } else if (booking?.tripJackResponse?.order?.cancellationCharges !== undefined) {
    penaltyAmount = booking.tripJackResponse.order.cancellationCharges;
  } else if (booking?.tripJackResponse?.cancellationCharges !== undefined) {
    penaltyAmount = booking.tripJackResponse.cancellationCharges;
  }

  const refundAmount = Math.max(0, totalPaid - penaltyAmount);

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-invoice-container, .print-invoice-container * {
            visibility: visible;
          }
          .print-invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
        }
      `}</style>
      <div
        className="print-invoice-container bg-white text-black p-8 max-w-4xl mx-auto hidden print:block"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-red-900 pb-6 mb-6">
          <div>
            <h1 className="text-4xl font-black text-red-900 tracking-tighter">Klar</h1>
            <p className="text-gray-500 text-sm mt-1">Premium Travel Services</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-800 uppercase tracking-widest">
              Cancellation Invoice
            </h2>
            <p className="text-gray-600 font-medium mt-1">
              Original Booking ID: <span className="text-red-600">{confirmationNumber}</span>
            </p>
            <p className="text-gray-500 text-sm">Cancelled On: {cancellationDate}</p>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-8 text-center font-bold">
          Status: CANCELLED
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8 border-b border-gray-200 pb-8">
          {/* Guest Details */}
          <div>
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">Billed To</h3>
            <p className="font-bold text-gray-800 text-xl mb-1">{primaryGuest}</p>
            <p className="text-gray-600 mb-1">{email}</p>
            <p className="text-gray-600">{phone}</p>
          </div>

          {/* Service Details */}
          <div className="text-right">
            <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">Service Details</h3>
            <p className="font-bold text-blue-900 text-xl mb-1">{serviceName}</p>
            <p className="text-gray-600 mb-1">Booked On: {bookingDate}</p>
          </div>
        </div>

        {/* Financial Breakdown Table */}
        <h3 className="text-lg font-bold pb-2 mb-3 text-gray-800">Financial Breakdown</h3>
        <table className="w-full mb-8 border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-bold text-gray-700">Description</th>
              <th className="text-right py-3 px-4 text-sm font-bold text-gray-700">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-3 px-4 text-gray-800 font-medium">
                Original Booking Total Paid (Base Fare + Taxes)
              </td>
              <td className="py-3 px-4 text-gray-800 text-right">
                {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
            <tr className="border-b border-gray-100 bg-red-50/30">
              <td className="py-3 px-4 text-red-800 font-medium">
                Cancellation Penalty / Provider Fees
              </td>
              <td className="py-3 px-4 text-red-800 text-right">
                - {penaltyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Refund Summary */}
        <div className="flex justify-end mb-10">
          <div className="w-1/2 bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-800 text-lg uppercase tracking-wide">
                Final Refund Amount
              </span>
              <span className="font-bold text-green-600 text-2xl">
                INR {refundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-right">
              Refunds are processed back to the original source (Klar Wallet) within 1-2 hours.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400 border-t border-gray-100 pt-4">
          This is a computer-generated invoice and does not require a signature. <br />
          For support, please contact Klar Travels at support@klartravels.com.
        </div>
      </div>
    </>
  );
};

export default CancellationInvoice;
