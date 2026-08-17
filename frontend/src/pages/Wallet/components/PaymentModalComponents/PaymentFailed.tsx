import React from 'react';
import { X, AlertCircle } from 'lucide-react';

interface PaymentFailedProps {
  errorMessage: string | null;
  onRetry: () => void;
  onClose: () => void;
}

const PaymentFailed: React.FC<PaymentFailedProps> = ({ errorMessage, onRetry, onClose }) => {
  return (
    <div className="py-8 text-center space-y-6">
      <div className="flex justify-center mb-6">
        <div className="w-28 h-28 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
          <X className="text-white w-14 h-14" strokeWidth={3} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-3xl font-black text-gray-900">Transaction Failed</h3>
        <p className="text-gray-500">
          {errorMessage || "We couldn't process your payment. Please try again."}
        </p>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3 text-left">
        <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
        <div>
          <h4 className="text-sm font-bold text-red-900">Payment Issue</h4>
          <p className="text-xs text-red-700 mt-0.5">
            No money has been deducted from your account. Please try again.
          </p>
        </div>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          onClick={onClose}
          className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-lg font-bold hover:bg-gray-50"
        >
          Close
        </button>
        <button
          onClick={onRetry}
          className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-2xl text-lg font-bold hover:bg-[#FF4046] flex items-center justify-center gap-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default PaymentFailed;
