// components/PaymentSummary.tsx
import React from 'react';

interface PaymentSummaryProps {
  years?: string[];
  paymentMethod?: string;
  amount?: string;
  transactionId?: string;
}

const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  paymentMethod = 'RazorPay Submitted',
  amount = '₹11,787.72',
  transactionId = 'TXN-2026-02-10-001',
}) => {
  return (
    <div
      className="block md:hidden lg:hidden rounded-xl border border-[#E7E2D9] p-5 mb-4"
      style={{ background: '#00875A0D' }}
    >
      <div className="flex items-center gap-2 mb-3">
        {/* Success Icon */}
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#00875A' }}
        >
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold" style={{ color: '#00875A' }}>
          Payment Successful
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment Method</span>
          <span className="font-medium" style={{ color: '#464650' }}>
            {paymentMethod}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Amount Paid</span>
          <span className="font-bold" style={{ color: '#00875A' }}>
            {amount}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Transaction ID</span>
          <span className="font-medium" style={{ color: '#464650' }}>
            {transactionId}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummary;
