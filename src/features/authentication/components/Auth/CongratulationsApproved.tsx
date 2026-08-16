import React from 'react';
import { CheckCircle2, Zap, ShieldCheck, Users, CreditCard, ArrowRight } from 'lucide-react';

interface CongratulationsApprovedProps {
  onGoToDashboard: () => void;
  onContactSupport: () => void;
}

export default function CongratulationsApproved({
  onGoToDashboard,
  onContactSupport,
}: CongratulationsApprovedProps) {
  const features = [
    { title: 'B2B Pricing & Commission', desc: 'Exclusive rates for your business', icon: Zap },
    { title: 'Wallet & Credit Limit', desc: 'Flexible payment options', icon: CreditCard },
    { title: 'Multi-Client Booking', desc: 'Manage multiple clients seamlessly', icon: Users },
    { title: 'Priority Support', desc: 'Dedicated 24/7 support team', icon: ShieldCheck },
  ];

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-6 border border-green-100 shadow-sm animate-bounce-subtle">
          <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={1.5} />
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
          Congratulations!
        </h1>

        <div className="inline-flex items-center px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold ring-1 ring-green-200 uppercase tracking-wider">
          Account Approved & Active
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">
          Your B2B Access Features
        </h2>

        <div className="grid grid-cols-1 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-4 border border-gray-100 bg-white rounded-2xl shadow-sm hover:border-blue-200 transition-all flex items-start gap-4 group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center transition-colors group-hover:bg-[#234977] group-hover:text-white">
                <feature.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm mb-0.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 leading-normal">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#234977] shadow-xl shadow-blue-900/10 rounded-3xl p-6 text-white mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 -m-8 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-200">
              Exclusive Welcome Bonus
            </span>
          </div>

          <h3 className="text-3xl font-bold mb-1">10% Commission</h3>
          <p className="text-sm text-blue-100 border-l-2 border-blue-400/30 pl-3 py-1">
            On your first 5 bookings! Start earning today.
          </p>

          <button
            onClick={onGoToDashboard}
            className="w-full mt-6 bg-white text-[#234977] hover:bg-gray-100 font-bold py-4 px-6 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm shadow-md"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="text-center pb-4">
        <p className="text-gray-500 text-xs font-nunito">
          Need help getting started?{' '}
          <button
            onClick={onContactSupport}
            className="text-[#234977] hover:text-blue-900 font-bold underline underline-offset-4"
          >
            Contact Support
          </button>
        </p>
      </div>
    </div>
  );
}
