import React from 'react';
import { useState, useEffect } from 'react';
import { Clock, HelpCircle, Lock, RefreshCcw, Key } from 'lucide-react';

interface TooManyAttemptsProps {
  reason?: string;
  onResetPassword: () => void;
  onHelp: () => void;
  retryAfterSeconds?: number;
}

export default function TooManyAttempts({
  reason,
  onResetPassword,
  onHelp,
  retryAfterSeconds = 300,
}: TooManyAttemptsProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfterSeconds);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="max-w-md mx-auto p-4 md:p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-50 rounded-full mb-8 border border-orange-100 shadow-sm">
        <Clock className="w-10 h-10 text-orange-500" strokeWidth={1.5} />
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
        Too Many Attempts
      </h1>

      <p className="text-gray-600 mb-10 text-lg">
        {reason ||
          "For your security, we've temporarily locked login attempts due to multiple failures."}
      </p>

      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 mb-10 text-left flex gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm self-start">
          <Lock className="w-4 h-4 text-orange-600" />
        </div>
        <p className="text-orange-900 text-sm leading-relaxed">
          Please wait for the cooldown period to complete before attempting to sign in again.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-3xl p-8 mb-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
          <div
            className="h-full bg-orange-400 transition-all duration-1000"
            style={{ width: `${(timeLeft / retryAfterSeconds) * 100}%` }}
          ></div>
        </div>

        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
          Security Cooldown
        </p>

        <div className="flex justify-center items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl w-20 py-4 shadow-inner">
              <span className="text-4xl font-black text-gray-900 tabular-nums">
                {minutes.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tighter">
              Minutes
            </span>
          </div>

          <span className="text-2xl text-gray-300 font-light mb-6">:</span>

          <div className="flex flex-col items-center">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl w-20 py-4 shadow-inner">
              <span className="text-4xl font-black text-gray-900 tabular-nums">
                {seconds.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-tighter">
              Seconds
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={onResetPassword}
          className="w-full bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Key className="h-4 w-4" />
          Reset Password
        </button>

        <button
          disabled={timeLeft > 0}
          className="w-full bg-white border border-gray-200 text-gray-400 py-4 px-4 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <button
          onClick={onHelp}
          className="group inline-flex items-center gap-2 text-gray-500 hover:text-[#234977] transition-colors"
        >
          <HelpCircle
            className="w-5 h-5 text-gray-300 group-hover:text-[#234977]"
            strokeWidth={1.5}
          />
          <span className="font-bold text-sm">Need Help with your account?</span>
        </button>
      </div>

      <p className="mt-8 text-[10px] text-gray-400 leading-relaxed">
        The cooldown period helps protect your account from brute-force attempts. <br />
        Multiple frequent blocks may lead to permanent account suspension.
      </p>
    </div>
  );
}
