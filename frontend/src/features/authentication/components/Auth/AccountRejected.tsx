import React from 'react';
import { Ban, XCircle, ArrowLeft, Mail, Info } from 'lucide-react';

interface AccountRejectedProps {
  reason?: string;
  onContactSupport: () => void;
  onBackToLogin: () => void;
}

export default function AccountRejected({
  reason,
  onContactSupport,
  onBackToLogin,
}: AccountRejectedProps) {
  return (
    <div className="max-w-md mx-auto p-4 md:p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-8 border border-red-100 shadow-sm">
        <Ban className="w-10 h-10 text-red-500" strokeWidth={1.5} />
      </div>

      <h1
        className="text-gray-900 mb-2"
        style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: 'var(--heading-font-size)',
          fontWeight: 700,
          lineHeight: 'var(--heading-line-height)',
          letterSpacing: 'var(--heading-letter-spacing)',
        }}
      >
        Account Application Rejected
      </h1>

      <p className="text-gray-600 mb-10 text-lg">
        We regret to inform you that your partner account application has been rejected.
      </p>

      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-10 text-left">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-red-900 font-bold text-sm">Application Status: Rejected</h3>
            <p className="text-red-800 text-[10px] font-medium uppercase tracking-wider">
              Reference: Business Verification Protocol
            </p>
          </div>
        </div>

        <p className="text-red-800/80 text-sm leading-relaxed mb-6">
          {reason ||
            'Your application did not meet the required criteria for our B2B partner program at this time.'}
        </p>

        <div className="bg-white/60 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-red-700 text-sm font-bold">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <span>Status:</span>
          </div>
          <span className="text-red-900 font-black tracking-tight">Final Decision</span>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        <button
          onClick={onContactSupport}
          className="w-full bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Appeal or Contact Support
        </button>

        <button
          onClick={onBackToLogin}
          className="w-full bg-white border border-gray-200 text-gray-600 py-4 px-4 rounded-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4 text-gray-400" />
          Return to Login
        </button>
      </div>

      <div className="text-left pt-8 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-gray-400" />
          <h4 className="text-gray-900 font-bold text-xs uppercase tracking-widest">
            Common Reasons for Rejection
          </h4>
        </div>
        <ul className="space-y-3">
          {[
            'Incomplete or invalid business documentation',
            'Business entity verification failure',
            'Inconsistent contact or address information',
            'Service area outside current operating zones',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-gray-500 leading-tight">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mt-1 flex-shrink-0"></div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-10 text-[10px] text-gray-400 text-center uppercase tracking-[0.2em]">
        Ref ID: B2B-REJ-{new Date().getFullYear()}-RE01
      </p>
    </div>
  );
}
