// InsuranceBookingDetailsModal.tsx
import React, { useState } from 'react';
import InsuranceCancellationModal from './InsuranceCancellationModal';
import InsuranceCancellationChargesModal from './InsuranceCancellationChargesModal';

const getStatusColor = (status) => {
  const statusString = typeof status === 'string' ? status : '';
  const colors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    success: 'bg-green-100 text-green-800',
    SUCCESS: 'bg-green-100 text-green-800',
    initiated: 'bg-yellow-100 text-yellow-800',
    INITIATED: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  };
  return colors[statusString] || colors[statusString?.toUpperCase()] || 'bg-gray-100 text-gray-800';
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'N/A';
  return new Date(dateTimeString).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹ 0.00';
  return `₹ ${amount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const InsuranceBookingDetailsModal = ({ booking, onClose, onCancelSuccess }) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancellationCharges, setShowCancellationCharges] = useState(false);
  const [cancellationData, setCancellationData] = useState(null);
  const [cancellationRemarks, setCancellationRemarks] = useState('');
  const [cancellationPayload, setCancellationPayload] = useState(null);

  console.log('Modal received booking:', booking);

  if (!booking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full p-12 text-center">
          <p className="text-gray-600">No booking details available</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  // Extract policy benefits
  //   const tjDetails = booking?.tjBookingDetailsResponse;
  const tjDetails = booking?.tjBookingDetailsResponse?.order || booking?.order;
  const insuranceInfo = booking?.tjBookingDetailsResponse?.itemInfos?.INSURANCE?.iinfo;
  const policyData = insuranceInfo?.pli?.[0]?.pi?.[0];
  const policyBenefits = policyData?.pbft || [];

  // Extract data from booking object
  //   const travellers = booking?.travellers || [];
  const travellers = tjDetails?.travellerInfo || booking?.travellers || [];
  //   const totalAmount = booking?.amount || 0;
  const totalAmount = tjDetails?.amount || booking?.amount || 0;
  const bookingStatus = booking?.status || tjDetails?.status || 'Unknown';
  const bookingId = booking?.bookingId || booking?._id;
  const createdAt = booking?.createdAt;

  const insuranceBenefits = policyBenefits.filter((b) => b.type === 'INSURANCE_BENEFIT');
  const assistanceBenefits = policyBenefits.filter((b) => b.type === 'ASSISTANCE_BENEFIT');
  const policyName = policyData?.pn || policyData?.pi || 'Travel Insurance';
  const coverageRegion = policyData?.rname || 'Worldwide';

  const handleOpenCancelModal = () => {
    setShowCancelModal(true);
  };

  const handleProceedToCharges = (data) => {
    setCancellationData(data.charges);
    setCancellationRemarks(data.remarks);
    setCancellationPayload(data.cancellationPayload);
    setShowCancelModal(false);
    setShowCancellationCharges(true);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Insurance Booking Details</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Status Banner */}
            <div className="mb-6 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <span className="text-gray-800 font-semibold">Travel Insurance</span>
              </div>
              <div className="absolute top-24 right-6">
                <span
                  className={`inline-block px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${getStatusColor(bookingStatus)}`}
                >
                  {bookingStatus}
                </span>
              </div>
            </div>

            {/* Booking ID and Passenger Info Grid - Similar to Flight Modal */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Policy ID</p>
                <p className="font-semibold text-sm">{bookingId}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Status</p>
                <p className={`font-semibold capitalize text-sm ${getStatusColor(bookingStatus)}`}>
                  {bookingStatus}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Number of Insured</p>
                <p className="font-semibold">{travellers?.length || 0} Person(s)</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Contact Email</p>
                <p className="font-semibold truncate text-sm">{travellers[0]?.eid || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Contact Phone</p>
                <p className="font-semibold">{travellers[0]?.pnum || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Policy Name</p>
                <p className="font-semibold text-sm">{policyName}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Coverage Region</p>
                <p className="font-semibold text-sm">{coverageRegion}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Total Premium Paid</p>
                <p className="font-semibold text-lg text-green-600">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            {/* Insured Person Details */}
            {travellers && travellers.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Insured Person Details</h4>
                <div className="space-y-3">
                  {travellers.map((person, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-semibold">
                        {person.fn || person.firstName} {person.ln || person.lastName}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                        <p className="text-gray-600">
                          Age: <span className="text-gray-900">{person.age || 'N/A'}</span>
                        </p>
                        <p className="text-gray-600">
                          Gender:{' '}
                          <span className="text-gray-900">
                            {person.gen || person.gender || 'N/A'}
                          </span>
                        </p>
                        <p className="text-gray-600 col-span-2">
                          DOB: <span className="text-gray-900">{formatDate(person.dob)}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Benefits Section */}
            {insuranceBenefits.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Key Insurance Benefits</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {insuranceBenefits.slice(0, 6).map((benefit, idx) => (
                    <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                      <p className="font-semibold text-sm text-blue-800">{benefit.name}</p>
                      {benefit.sumins && (
                        <p className="text-xs text-blue-600 mt-1">Coverage: {benefit.sumins}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-gray-200 pt-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
              {bookingStatus !== 'cancelled' && bookingStatus !== 'CANCELLED' && (
                <button
                  onClick={handleOpenCancelModal}
                  className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  Cancel Policy
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modals */}
      {showCancelModal && (
        <InsuranceCancellationModal
          booking={booking}
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onProceed={handleProceedToCharges}
        />
      )}

      {showCancellationCharges && cancellationData && (
        <InsuranceCancellationChargesModal
          isOpen={showCancellationCharges}
          onClose={() => setShowCancellationCharges(false)}
          cancellationData={cancellationData}
          bookingDetails={booking}
          onCancelSuccess={onCancelSuccess}
          remarks={cancellationRemarks}
          bookingId={bookingId}
          cancellationPayload={cancellationPayload}
        />
      )}
    </>
  );
};

export default InsuranceBookingDetailsModal;
