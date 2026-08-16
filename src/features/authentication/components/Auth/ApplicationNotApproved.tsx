import React, { useState } from 'react';
import { XCircle, ChevronDown, Mail, Phone, AlertCircle, FileX } from 'lucide-react';

interface ApplicationNotApprovedProps {
  onResubmit?: () => void;
  onContactSupport?: () => void;
}

export default function ApplicationNotApproved({
  onResubmit,
  onContactSupport,
}: ApplicationNotApprovedProps) {
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6 border border-red-100 shadow-sm">
          <FileX className="w-10 h-10 text-red-500" strokeWidth={1.5} />
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
          Application Not Approved
        </h1>
      </div>

      <div className="space-y-6 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800 uppercase tracking-wider">Status:</span>
          <div className="inline-flex px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-bold ring-1 ring-red-200">
            Verification Declined
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h3 className="font-bold text-red-900 text-sm">Primary Reason</h3>
          </div>
          <p className="text-sm text-red-800/80 leading-relaxed">
            Incomplete business documentation - Missing trade license and GST certificate.
          </p>
        </div>

        <div>
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="w-full flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm group transition-all hover:border-blue-200"
          >
            <span className="font-bold text-gray-800 text-sm">Detailed Feedback</span>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${showFeedback ? 'rotate-180' : ''}`}
            />
          </button>

          {showFeedback && (
            <div className="mt-2 p-5 bg-gray-50 border border-gray-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
              <ul className="space-y-3">
                {[
                  'Trade license document is missing or not uploaded',
                  'GST certificate is required for Indian businesses',
                  'Business address verification failed',
                ].map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-gray-600 leading-tight"
                  >
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-100 bg-white shadow-sm rounded-2xl p-6 mb-8">
        <h2 className="text-sm font-bold text-gray-800 mb-5 uppercase tracking-wider">
          Next Steps
        </h2>

        <div className="space-y-6">
          {[
            { title: 'Review Feedback', desc: 'Check the detailed feedback points above' },
            {
              title: 'Update Documents',
              desc: 'Gather and prepare current versions of missing files',
            },
            {
              title: 'Resubmit Application',
              desc: 'Start the verification process again with updates',
            },
          ].map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-blue-50/50">
                {index + 1}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">{step.title}</h3>
                <p className="text-xs text-gray-500">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {onResubmit && (
          <button
            onClick={onResubmit}
            className="w-full bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98]"
          >
            Resubmit Application
          </button>
        )}

        <div className="pt-4 space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
            Need Assistance?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <a
              href="mailto:support@example.com"
              className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Mail className="h-5 w-5 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500">Email us at</span>
              <span className="text-xs font-bold text-gray-700 truncate w-full text-center">
                support@example.com
              </span>
            </a>
            <a
              href="tel:+1234567890"
              className="flex flex-col items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Phone className="h-5 w-5 text-gray-400 mb-1" />
              <span className="text-[10px] text-gray-500">Call support</span>
              <span className="text-xs font-bold text-gray-700">+1 (234) 567-890</span>
            </a>
          </div>
        </div>

        {onContactSupport && (
          <button
            onClick={onContactSupport}
            className="w-full bg-white border border-gray-200 text-gray-600 py-4 px-4 rounded-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98]"
          >
            Open Support Ticket
          </button>
        )}
      </div>

      <p className="mt-8 text-center text-[10px] text-gray-400">
        Average resubmission approval time: 2-3 business days
      </p>
    </div>
  );
}
