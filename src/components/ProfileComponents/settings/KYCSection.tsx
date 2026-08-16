import React from 'react';

import { useKYCStatus } from '../ProfileSections/useKYCStatus';
import KYCDocumentsForm from './KYCDocumentsForm';
// import KYCSummarySubmit from '../flights/KycVerificiton/KYCSummarySubmit';
// import KYCSubmissionSuccess from '../flights/KycVerificiton/KYCSubmissionSuccess';
// import KYCApproved from '../flights/KycVerificiton/KYCApproved';
// import KYCProcessing from '../flights/KycVerificiton/KYCProcessing';

export default function KYCSection() {
  const {
    status,
    isLoading,
    uploadDocument,
    setStatusToReadyToSubmit,
    submitKYC,
    goBack,
    documents,
  } = useKYCStatus();

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100 italic text-gray-400">
        Loading KYC Status...
      </div>
    );
  }

  // ──────────────────────────────────────────────
  //  Main decision tree
  // ──────────────────────────────────────────────

  // If KYC is approved, show the approved congratulations screen
  if (status === 'approved') {
    return (
      <div className="p-8 text-center bg-green-50 text-green-700 rounded-xl border border-green-200 font-bold">
        KYC Approved! Congratulations.
      </div>
    );
  }

  // If documents are submitted and pending review
  if (status === 'pending_review') {
    return (
      <div className="p-8 text-center bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
        KYC Submitted Successfully & Pending Review.
      </div>
    );
  }

  // Default: show upload form (not_started or uploading)
  // If ready_to_submit, we still show the form but with the modal on top
  return (
    <div className="relative">
      <KYCDocumentsForm
        uploadDocument={uploadDocument}
        setStatusToReadyToSubmit={setStatusToReadyToSubmit}
      />
      {status === 'ready_to_submit' && (
        <div className="mt-6 p-6 bg-white rounded-xl border-t-4 border-red-500 shadow-lg">
          <h3 className="text-lg font-bold mb-4 text-gray-900 text-center">Summary & Submission</h3>
          <p className="text-sm text-gray-600 mb-6 text-center">
            Please review your documents and then click Submit for verification.
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={goBack}
              className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={submitKYC}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
