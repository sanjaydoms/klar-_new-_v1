import React from 'react';
import { AlertTriangle, Mail, RefreshCw, Edit3, HelpCircle } from 'lucide-react';

interface AccountNotVerifiedProps {
  email: string;
  reason?: string;
  onResendLink: () => void;
  onChangeEmail: () => void;
  onContactSupport: () => void;
}

export default function AccountNotVerified({
  email,
  reason,
  onResendLink,
  onChangeEmail,
  onContactSupport,
}: AccountNotVerifiedProps) {
  return (
    <div className="max-w-md mx-auto p-4 md:p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-50 rounded-full mb-8 border border-amber-100 shadow-sm">
        <AlertTriangle className="w-10 h-10 text-amber-500" strokeWidth={1.5} />
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
        Account Not Verified
      </h1>

      <p className="text-gray-600 mb-10 text-lg">
        {reason || 'Your account security is important. Please verify your email to continue.'}
      </p>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-10 shadow-sm flex flex-col items-center gap-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Verification Email Sent To
        </span>
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-primary" strokeWidth={1.5} />
          <span className="text-gray-800 font-bold tracking-tight">{email}</span>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={onResendLink}
          className="w-full bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Resend Verification Link
        </button>

        <button
          onClick={onChangeEmail}
          className="w-full bg-white border border-gray-200 text-gray-600 py-4 px-4 rounded-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Edit3 className="h-4 w-4 text-gray-400" />
          Change Email / Phone
        </button>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <HelpCircle className="h-4 w-4" />
            <span>Need assistance?</span>
          </div>
          <button
            onClick={onContactSupport}
            className="text-[#234977] hover:text-primary font-bold underline underline-offset-4 text-sm"
          >
            Contact Support Team
          </button>
        </div>

        <p className="mt-8 text-[10px] text-gray-400 leading-relaxed">
          Didn't receive the email? Check your spam folder or try resending. <br />
          Verification links are valid for 24 hours.
        </p>
      </div>
    </div>
  );
}
