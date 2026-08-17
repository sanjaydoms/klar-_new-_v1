import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

interface VerificationPendingProps {
  onGoToDashboard?: () => void;
}

export default function VerificationPending({ onGoToDashboard }: VerificationPendingProps) {
  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-full mb-6 border border-amber-100 shadow-sm">
          <Clock className="w-10 h-10 text-amber-500" strokeWidth={1.5} />
        </div>

        <h1
          className="text-gray-900 mb-2 text-center"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'var(--heading-font-size)',
            fontWeight: 700,
            lineHeight: 'var(--heading-line-height)',
            letterSpacing: 'var(--heading-letter-spacing)',
          }}
        >
          Verification Pending
        </h1>

        <p className="text-gray-600 mb-10 text-lg">
          Thank you for registering! Your business account is currently under review.
        </p>
      </div>

      <div className="border border-gray-100 bg-white shadow-sm rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wider">
          Next Steps
        </h2>

        <div className="space-y-6">
          {[
            'Our verification team will review your business details',
            "You'll receive an email notification (within 24-48 hours)",
            'Once approved, you can access your B2B dashboard',
            'Check your email for status updates',
          ].map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-6 h-6 bg-[#234977]/10 text-[#234977] rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-[#234977]/5">
                {index + 1}
              </div>
              <span className="text-gray-600 text-sm leading-tight">{step}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
        <p className="text-green-800 font-medium text-sm">
          Estimated approval: <span className="font-bold">24-48 hours</span>
        </p>
      </div>

      {onGoToDashboard && (
        <button
          onClick={onGoToDashboard}
          className="w-full mt-10 bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98]"
        >
          Go to Dashboard
        </button>
      )}
    </div>
  );
}
