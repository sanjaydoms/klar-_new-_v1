import React, { useState, useEffect } from 'react';
import {
  X,
  Info,
  Landmark,
  Loader2,
  Check,
  Download,
  AlertCircle,
  Printer,
  Mail,
  Share2,
  Send,
  Copy,
  QrCode,
  FileText,
  Image,
  MessageSquare,
  Smartphone,
} from 'lucide-react';

interface WithdrawMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance: number;
  onContinue?: (amount: number, bankId: string) => void;
  withdrawalStatus?: 'idle' | 'processing' | 'success' | 'error';
  transactionData?: any;
  error?: string | null;
}

const WithdrawMoneyModal: React.FC<WithdrawMoneyModalProps> = ({
  isOpen,
  onClose,
  availableBalance,
  onContinue,
  withdrawalStatus = 'idle',
  transactionData,
  error,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (withdrawalStatus === 'processing' && step !== 4) {
      setStep(4);
    } else if (withdrawalStatus === 'success' && step === 4) {
      setStep(6); // Go straight to approved for real success
    } else if (withdrawalStatus === 'error' && step === 4) {
      setStep(7);
    }
  }, [withdrawalStatus, step]);

  if (!isOpen) return null;

  const quickAmounts = [1000, 5000, 10000];
  const bankAccounts = [
    { id: 'hdfc', name: 'HDFC Bank', number: '**** **** **** 8821', type: 'Savings' },
    { id: 'icici', name: 'ICICI Bank', number: '**** **** **** 5643', type: 'Current' },
    { id: 'axis', name: 'Axis Bank', number: '**** **** **** 9012', type: 'Savings' },
    { id: 'sbi', name: 'SBI Bank', number: '**** **** **** 3456', type: 'Savings' },
  ];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    if ((val.match(/\./g) || []).length > 1) return;
    setAmount(val);
  };

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
  };

  const handleContinue = () => {
    if (onContinue && amount && selectedBank) {
      onContinue(parseFloat(amount), selectedBank);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div
        className={`bg-white w-full ${step >= 9 ? 'max-w-[896px]' : 'max-w-lg'} ${step === 10 ? 'h-[978px]' : 'max-h-[90vh]'} overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] rounded-2xl p-10 shadow-2xl relative animate-in zoom-in-95 duration-300 transition-all ease-in-out`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-[#111827]">
              {step === 8
                ? 'Withdrawal Receipt'
                : step === 9
                  ? 'Email Receipt'
                  : step === 10
                    ? 'Share Receipt'
                    : 'Withdraw Money'}
            </h2>
            {step <= 7 && (
              <p className="text-gray-400 font-bold mt-1">Step {step >= 5 ? 4 : step} of 4</p>
            )}
            {step === 8 && (
              <p className="text-gray-400 font-bold mt-1">Official transaction document</p>
            )}
            {step === 9 && (
              <p className="text-gray-400 font-bold mt-1">Send transaction receipt via email</p>
            )}
            {step === 10 && (
              <p className="text-gray-400 font-bold mt-1">Share transaction receipt with others</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        {step <= 6 && (
          <div className="flex gap-3 mb-10">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= (step >= 5 ? 4 : step) ? 'bg-[#FF5A5F]' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step Content */}
        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-black text-gray-900 mb-3">
                Withdrawal Amount
              </label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400 group-focus-within:text-gray-900">
                  ₹
                </div>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-full h-20 pl-12 pr-6 bg-white border-2 border-gray-100 rounded-3xl outline-none text-2xl font-black text-gray-900 focus:border-red-100 focus:ring-4 focus:ring-red-50 transition-all placeholder:text-gray-200"
                />
              </div>
              <p className="text-sm font-bold text-gray-400 mt-3">
                Available balance: ₹{availableBalance.toLocaleString()}
              </p>
            </div>

            {/* Quick Amounts */}
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                Quick amounts:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {quickAmounts.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleQuickSelect(val)}
                    className="h-16 flex items-center justify-center border-2 border-gray-50 rounded-2xl hover:border-red-100 hover:bg-red-50/30 transition-all active:scale-95 group"
                  >
                    <span className="text-lg font-black text-gray-900 group-hover:text-red-500">
                      ₹{val.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-[#EEF6FF] border border-[#D0E7FF] rounded-3xl p-6 flex gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Info className="text-[#3B82F6] w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1D4ED8]">Withdrawal Information</h4>
                <p className="text-xs font-bold text-[#3B82F6] mt-1 opacity-80">
                  Minimum withdrawal: ₹100 • Processing fee: 1%
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => setStep(2)}
              disabled={
                !amount || parseFloat(amount) < 100 || parseFloat(amount) > availableBalance
              }
              className="w-full h-20 bg-[#FF5A5F] text-white rounded-[2rem] text-xl font-black shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none mt-4"
            >
              Continue
            </button>
          </div>
        ) : step === 2 ? (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-900 mb-2">Select Bank Account</h3>

            <div className="space-y-4">
              {bankAccounts.map((bank) => (
                <button
                  key={bank.id}
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full flex items-center justify-between p-6 border-2 rounded-3xl transition-all ${
                    selectedBank === bank.id
                      ? 'border-[#FF5A5F] bg-red-50/10 shadow-lg shadow-red-500/5'
                      : 'border-gray-50 hover:border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                        selectedBank === bank.id ? 'bg-red-100/50' : 'bg-blue-50'
                      }`}
                    >
                      <Landmark
                        className={selectedBank === bank.id ? 'text-[#FF5A5F]' : 'text-[#3B82F6]'}
                        size={24}
                      />
                    </div>
                    <div className="text-left">
                      <h4 className="text-base font-black text-gray-900">{bank.name}</h4>
                      <p className="text-xs font-bold text-gray-400 mt-1">
                        {bank.number} • {bank.type}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedBank === bank.id ? 'border-[#FF5A5F]' : 'border-gray-200'
                    }`}
                  >
                    {selectedBank === bank.id && (
                      <div className="w-3 h-3 bg-[#FF5A5F] rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Buttons Footer */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 h-20 bg-gray-100 text-gray-900 rounded-[2rem] text-xl font-black transition-all hover:bg-gray-200 active:scale-[0.98]"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedBank}
                className="flex-1 h-20 bg-[#FF5A5F] text-white rounded-[2rem] text-xl font-black shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none"
              >
                Continue
              </button>
            </div>
          </div>
        ) : step === 3 ? (
          <div className="space-y-6">
            <h3 className="text-lg font-black text-gray-900 mb-2">Review Details</h3>

            <div className="space-y-3">
              {/* Bank Info Card */}
              <div className="bg-gray-50/50 rounded-3xl p-6 flex justify-between items-center border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-400 mb-2">Bank Account</p>
                  <p className="text-xs font-bold text-gray-400">
                    {bankAccounts.find((b) => b.id === selectedBank)?.number}
                  </p>
                </div>
                <p className="text-sm font-black text-gray-900">
                  {bankAccounts.find((b) => b.id === selectedBank)?.name}
                </p>
              </div>

              {/* Amount Card */}
              <div className="bg-gray-50/50 rounded-3xl p-6 flex justify-between items-center border border-gray-100">
                <p className="text-sm font-bold text-gray-400">Withdrawal Amount</p>
                <p className="text-sm font-black text-gray-900">
                  ₹{parseFloat(amount).toLocaleString()}
                </p>
              </div>

              {/* Fee Card */}
              <div className="bg-gray-50/50 rounded-3xl p-6 flex justify-between items-center border border-gray-100">
                <p className="text-sm font-bold text-gray-400">Processing Fee (1%)</p>
                <p className="text-sm font-black text-gray-900">
                  ₹{(parseFloat(amount) * 0.01).toFixed(2).toLocaleString()}
                </p>
              </div>

              {/* Total Deduction Card */}
              <div className="bg-red-50/50 rounded-3xl p-6 flex justify-between items-center border border-red-100 shadow-sm">
                <p className="text-sm font-black text-gray-900">Total Deduction</p>
                <p className="text-lg font-black text-[#FF5A5F]">
                  ₹{(parseFloat(amount) * 1.01).toFixed(2).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Important Alert */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-3xl p-6 flex gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <Info className="text-orange-500 w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-orange-700">Important</h4>
                <p className="text-xs font-bold text-orange-600 mt-1 opacity-80">
                  Withdrawal will be processed within 1-3 business days
                </p>
              </div>
            </div>

            {/* Buttons Footer */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(2)}
                className="flex-1 h-20 bg-gray-100 text-gray-900 rounded-[2rem] text-xl font-black transition-all hover:bg-gray-200 active:scale-[0.98]"
              >
                Back
              </button>
              <button
                onClick={() => {
                  handleContinue();
                }}
                className="flex-1 h-20 bg-[#FF5A5F] text-white rounded-[2rem] text-xl font-black shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98]"
              >
                Confirm Withdrawal
              </button>
            </div>
          </div>
        ) : step === 4 ? (
          <div className="py-12 flex flex-col items-center text-center space-y-8">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <div className="absolute inset-0 bg-red-50 rounded-full animate-pulse opacity-50" />
              <Loader2 className="w-16 h-16 text-[#FF5A5F] animate-spin-slow stroke-[3px]" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-black text-[#111827]">Processing Withdrawal</h2>
              <p className="text-gray-500 font-bold text-lg">
                Please wait while we process your request...
              </p>
            </div>
          </div>
        ) : step === 5 ? (
          <div className="py-8 text-center space-y-8">
            {/* Success Icon */}
            <div className="flex justify-center">
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-20" />
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                  <Check className="text-white w-7 h-7 stroke-[3px]" />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#111827]">Withdrawal Initiated!</h2>
              <p className="text-gray-500 font-medium">
                Your withdrawal request has been submitted successfully
              </p>
            </div>

            {/* Details Card */}
            <div className="bg-gray-50/50 rounded-3xl p-6 space-y-4 border border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Amount</span>
                <span className="text-gray-900 font-black text-lg">
                  ₹{parseFloat(amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Bank</span>
                <span className="text-gray-900 font-black">
                  {bankAccounts.find((b) => b.id === selectedBank)?.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-bold">Status</span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                  Processing
                </span>
              </div>
            </div>
          </div>
        ) : step === 6 ? (
          <div className="py-8 text-center space-y-6">
            {/* Wrapper for slight scale up animation */}
            <div className="animate-in zoom-in-95 duration-500">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-28 h-28 bg-[#10B981] rounded-full flex items-center justify-center shadow-lg shadow-green-200 shadow-xl">
                  <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                    <Check className="text-white w-10 h-10 stroke-[3px]" />
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-black text-[#111827]">Withdrawal Approved!</h2>
                <p className="text-gray-500 font-medium">Your money is on its way</p>
              </div>

              {/* Receipt Card */}
              <div className="bg-[#ECFDF5] rounded-3xl p-6 space-y-4 border border-green-100 text-left">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Transaction ID</span>
                  <span className="text-gray-900 font-bold">
                    {transactionData?.referenceId ||
                      transactionData?._id ||
                      'TXN' + Math.floor(Math.random() * 100000000)}
                  </span>
                </div>
                <div className="h-px bg-green-200/50" />
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Amount</span>
                  <span className="text-[#15803D] font-black text-xl">
                    ₹{parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Bank Account</span>
                  <span className="text-gray-900 font-bold">
                    {bankAccounts.find((b) => b.id === selectedBank)?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Account Number</span>
                  <span className="text-gray-600 font-medium tracking-wider">
                    {bankAccounts.find((b) => b.id === selectedBank)?.number}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Processing Fee</span>
                  <span className="text-gray-900 font-bold">
                    ₹{(parseFloat(amount) * 0.01).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-green-200/50" />
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span className="bg-[#15803D] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                    <Check size={12} className="stroke-[3px]" /> Approved
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Expected Credit</span>
                  <span className="text-gray-900 font-bold">
                    {new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-[#ECFDF5] border border-green-200 rounded-2xl p-4 flex gap-3 text-left mt-6">
                <Info className="text-[#15803D] w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#15803D]">Funds will be credited soon</h4>
                  <p className="text-xs text-[#166534] mt-1 leading-relaxed">
                    The amount will be credited to your bank account within 1-3 business days.
                    You'll receive a confirmation email once completed.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 mt-8 pt-4">
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-gray-100 text-gray-700 rounded-xl text-lg font-bold transition-all hover:bg-gray-200 active:scale-[0.98]"
              >
                Close
              </button>
              <button
                onClick={() => setStep(8)}
                className="flex-1 h-14 bg-[#10B981] text-white rounded-xl text-lg font-bold shadow-lg shadow-green-200 transition-all hover:bg-[#059669] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Download Receipt
              </button>
            </div>
          </div>
        ) : step === 7 ? (
          <div className="py-8 text-center space-y-6">
            {/* Wrapper for slight scale up animation */}
            <div className="animate-in zoom-in-95 duration-500">
              {/* Failed Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-28 h-28 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-200 shadow-xl">
                  <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                    <X className="text-white w-10 h-10 stroke-[3px]" />
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-2 mb-8">
                <h2 className="text-3xl font-black text-[#111827]">Withdrawal Declined</h2>
                <p className="text-gray-500 font-medium">
                  We couldn't process your withdrawal request
                </p>
              </div>

              {/* Receipt Card */}
              <div className="bg-red-50 rounded-3xl p-6 space-y-4 border border-red-100 text-left">
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Transaction ID</span>
                  <span className="text-gray-900 font-bold">
                    {transactionData?.referenceId ||
                      transactionData?._id ||
                      'TXN' + Math.floor(Math.random() * 100000000)}
                  </span>
                </div>
                <div className="h-px bg-red-200/50" />
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Amount</span>
                  <span className="text-[#EF4444] font-black text-xl">
                    ₹{parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Bank Account</span>
                  <span className="text-gray-900 font-bold">
                    {bankAccounts.find((b) => b.id === selectedBank)?.name}
                  </span>
                </div>
                <div className="h-px bg-red-200/50" />
                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-600 font-medium">Status</span>
                  <span className="bg-[#EF4444] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                    <X size={12} className="stroke-[3px]" /> Declined
                  </span>
                </div>
              </div>

              {/* Reason for Decline Card */}
              <div className="bg-red-50 border border-red-100 rounded-3xl p-6 text-left space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-[#EF4444] w-5 h-5" />
                  <h4 className="text-sm font-bold text-[#991B1B]">Error Details</h4>
                </div>
                <p className="text-xs text-[#991B1B] leading-relaxed">
                  {error ||
                    'Insufficient verification or invalid bank account details. Please check your information and try again.'}
                </p>

                <div className="bg-white rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">Possible reasons:</p>
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      Bank account verification pending
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      Incorrect bank account details
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      KYC documents not verified
                    </li>
                    <li className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      Withdrawal limit exceeded
                    </li>
                  </ul>
                </div>
              </div>

              {/* Help Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3 text-left">
                <Info className="text-[#3B82F6] w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-[#1D4ED8]">Need Help?</h4>
                  <p className="text-xs text-[#1E40AF] mt-1 leading-relaxed">
                    Contact our support team for assistance or verify your bank account details in
                    Settings.
                  </p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-4 mt-8 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 h-14 bg-gray-100 text-gray-700 rounded-xl text-lg font-bold transition-all hover:bg-gray-200 active:scale-[0.98]"
                >
                  Close
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-xl text-lg font-bold shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        ) : step === 9 ? (
          <div className="space-y-8">
            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Column: Form */}
              <div className="flex-1 space-y-6">
                {/* Recipient Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-gray-700 mb-2">
                    <Mail className="w-4 h-4 text-gray-400" /> Recipient Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    className="w-full h-14 px-4 bg-white border-2 border-gray-100 rounded-xl outline-none text-gray-900 font-medium focus:border-blue-100 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    Enter the email address to send the receipt to
                  </p>
                </div>

                {/* Send Copy Button */}
                <button className="w-full h-12 bg-blue-50 text-blue-600 rounded-xl font-bold hover:bg-blue-100 transition-colors flex items-center justify-center border border-blue-100">
                  Also send a copy to myself (admin@klar.com)
                </button>

                {/* Custom Message */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-gray-700 mb-2">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400 flex items-center justify-center text-[10px] font-bold text-gray-400">
                      ?
                    </div>
                    Custom Message (Optional)
                  </label>
                  <textarea
                    placeholder="Add a personal message to include with the receipt..."
                    className="w-full h-32 p-4 bg-white border-2 border-gray-100 rounded-xl outline-none text-gray-900 font-medium focus:border-blue-100 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-gray-300 resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-2 font-medium">
                    This message will appear in the email body
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="text-orange-600 w-4 h-4" />
                    <h4 className="text-sm font-black text-orange-800">Email Details</h4>
                  </div>
                  <ul className="space-y-2">
                    <li className="flex gap-2 text-xs text-orange-800 font-medium">
                      <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      Receipt will be attached as a PDF file
                    </li>
                    <li className="flex gap-2 text-xs text-orange-800 font-medium">
                      <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      Email will be sent from noreply@klar.com
                    </li>
                    <li className="flex gap-2 text-xs text-orange-800 font-medium">
                      <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                      Delivery may take a few minutes
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Preview */}
              <div className="flex-1">
                <label className="flex items-center gap-2 text-sm font-black text-gray-700 mb-4">
                  <div className="w-4 h-4 rounded bg-gray-100 flex items-center justify-center">
                    <div className="w-2 h-2 border-2 border-gray-400 rounded-sm" />
                  </div>
                  Email Preview
                </label>
                <div className="border-2 border-gray-100 rounded-3xl p-6 bg-gray-50/30">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Mock Email Header */}
                    <div className="p-8 space-y-6">
                      {/* Logo */}
                      <div className="text-2xl font-black text-[#1D4ED8] flex items-center gap-1">
                        Klar<span className="text-[#FF5A5F] text-xl">✦</span>
                      </div>

                      <h3 className="text-lg font-black text-gray-900">Withdrawal Receipt</h3>

                      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
                        <p>Hi there,</p>
                        <p>
                          Your withdrawal has been approved! Please find attached your transaction
                          receipt.
                        </p>
                      </div>

                      {/* Transaction Summary Box */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-xs font-bold text-gray-500">Transaction ID:</span>
                          <span className="text-xs font-black text-gray-900">TXN31924407</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-gray-500">Amount:</span>
                          <span className="text-sm font-black text-[#15803D]">
                            ₹{parseFloat(amount || '0').toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 pt-4 border-t border-gray-100">
                        <p>
                          If you have any questions, please don't hesitate to contact our support
                          team.
                        </p>
                      </div>

                      <div className="text-[10px] text-center text-gray-400 pt-2">
                        © 2026 Klar. All rights reserved.
                      </div>
                    </div>
                  </div>

                  {/* Attachment Indicator */}
                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium px-2">
                    <Check className="text-green-500 w-3 h-3" />
                    PDF attachment: receipt-TXN31924407.pdf
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(8)}
                className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-700 rounded-xl text-lg font-bold transition-all hover:bg-gray-50 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <X size={20} /> Cancel
              </button>
              <button
                onClick={onClose}
                className="flex-1 h-14 bg-[#FF5A5F] text-white rounded-xl text-lg font-bold shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Send size={20} /> Send Email
              </button>
            </div>
          </div>
        ) : step === 10 ? (
          <div className="space-y-8">
            {/* Two Column Layout */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Column: Share Options */}
              <div className="flex-1 space-y-8">
                {/* Share via Grid */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Share via</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="h-24 bg-white border-2 border-green-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-green-200 hover:bg-green-50/30 transition-all group">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageSquare className="text-green-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">WhatsApp</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-blue-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-200 hover:bg-blue-50/30 transition-all group">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="text-blue-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">Email</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-sky-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
                      <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send className="text-sky-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">Telegram</span>
                    </button>
                    <button className="h-24 bg-white border-2 border-purple-50 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Smartphone className="text-purple-600 w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-700">SMS</span>
                    </button>
                  </div>
                </div>

                {/* Receipt Link */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Receipt Link</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-xl flex items-center px-4 overflow-hidden">
                      <span className="text-xs text-gray-500 font-mono truncate">
                        https://klar.com/receipt/TXN{Math.floor(Math.random() * 100000000)}
                      </span>
                    </div>
                    <button className="h-12 px-6 bg-[#111827] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
                      <Copy size={16} /> Copy
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2">
                    Share this link with anyone to view the receipt
                  </p>
                </div>

                {/* Secure Sharing Info */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                  <Info className="text-blue-500 w-5 h-5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-blue-700">Secure Sharing</h4>
                    <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">
                      The receipt link is secure and can only be accessed by those with the link. It
                      will remain valid for 90 days.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: QR & Downloads */}
              <div className="flex-1 space-y-8">
                {/* QR Code */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">QR Code</h4>
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 flex flex-col items-center text-center">
                    <div className="bg-white p-4 rounded-2xl shadow-sm mb-4">
                      <QrCode className="w-40 h-40 text-gray-900" />
                    </div>
                    <h5 className="text-sm font-black text-gray-900 mb-1">QR Code</h5>
                    <p className="text-xs text-gray-400 font-medium mb-6">Scan to view receipt</p>
                    <div className="bg-white/50 px-4 py-2 rounded-lg border border-gray-100">
                      <p className="text-[10px] whitespace-nowrap text-gray-400 font-bold uppercase tracking-wider">
                        Transaction:
                      </p>
                      <p className="text-xs font-black text-gray-900 font-mono">TXN32468733</p>
                    </div>
                  </div>
                </div>

                {/* Download Options */}
                <div>
                  <h4 className="text-sm font-black text-gray-900 mb-4">Download Options</h4>
                  <div className="space-y-3">
                    <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-red-100 hover:bg-red-50/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                          <FileText className="text-red-500 w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h5 className="text-sm font-black text-gray-900">Download as PDF</h5>
                          <p className="text-xs text-gray-400 font-medium">
                            Save receipt as PDF file
                          </p>
                        </div>
                      </div>
                      <Download className="text-gray-300 w-5 h-5 group-hover:text-red-500 transition-colors" />
                    </button>
                    <button className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-purple-100 hover:bg-purple-50/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                          <Image className="text-purple-500 w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <h5 className="text-sm font-black text-gray-900">Download QR Code</h5>
                          <p className="text-xs text-gray-400 font-medium">
                            Save QR code as PNG image
                          </p>
                        </div>
                      </div>
                      <Download className="text-gray-300 w-5 h-5 group-hover:text-purple-500 transition-colors" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => setStep(8)}
                className="w-full h-14 bg-[#111827] text-white rounded-xl text-lg font-bold shadow-lg shadow-gray-200 transition-all hover:bg-black hover:shadow-xl active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Company Header */}
            <div className="flex justify-between items-start">
              <div>
                <div className="text-2xl font-black text-[#1D4ED8] flex items-center gap-1">
                  Klar<span className="text-[#FF5A5F] text-xl">✦</span>
                </div>
                <div className="mt-4 space-y-1 text-xs text-gray-500 font-medium">
                  <p>123 Business Avenue, Mumbai</p>
                  <p>Maharashtra 400001, India</p>
                  <p>GSTIN: 27AABCU9603R1Z5</p>
                  <p>Email: support@klar.com</p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide mb-2 ${step === 6 || true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  Approved
                </span>
                <p className="text-xs font-bold text-gray-900">Receipt #TXN31577668</p>
                <p className="text-xs text-gray-500 mt-1">2 January 2026</p>
                <p className="text-xs text-gray-500">10:56 am</p>
              </div>
            </div>

            {/* Transaction Details Table */}
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-4">Transaction Details</h3>
              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-100 p-3 flex justify-between text-xs font-black text-gray-500 uppercase tracking-wider">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                {/* Withdrawal Amount */}
                <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
                  <div>
                    <p className="text-sm font-black text-gray-900">Withdrawal Amount</p>
                    <p className="text-xs text-gray-500 mt-0.5">Requested for bank transfer</p>
                  </div>
                  <span className="text-sm font-black text-gray-900">
                    ₹{parseFloat(amount).toLocaleString()}
                  </span>
                </div>
                {/* Processing Fee */}
                <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white">
                  <div>
                    <p className="text-sm font-black text-gray-900">Processing Fee (1%)</p>
                    <p className="text-xs text-gray-500 mt-0.5">Standard withdrawal charges</p>
                  </div>
                  <span className="text-sm font-black text-gray-900">
                    ₹{(parseFloat(amount) * 0.01).toFixed(2)}
                  </span>
                </div>
                {/* Total Deducted */}
                <div className="p-4 flex justify-between items-center bg-red-50/50">
                  <div>
                    <p className="text-sm font-black text-gray-900">Total Deducted</p>
                    <p className="text-xs text-gray-500 mt-0.5">From wallet balance</p>
                  </div>
                  <span className="text-lg font-black text-[#FF5A5F]">
                    ₹{(parseFloat(amount) * 1.01).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Bank Details */}
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Landmark className="text-blue-500 w-4 h-4" />
                  <h4 className="text-sm font-black text-gray-900">Bank Account Details</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Bank Name:</span>
                    <span className="text-gray-900 font-bold">
                      {bankAccounts.find((b) => b.id === selectedBank)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Account Number:</span>
                    <span className="text-gray-900 font-bold tracking-wider">
                      {bankAccounts.find((b) => b.id === selectedBank)?.number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">IFSC Code:</span>
                    <span className="text-gray-900 font-bold font-mono">ICIC0002345</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Account Type:</span>
                    <span className="text-gray-900 font-bold">
                      {bankAccounts.find((b) => b.id === selectedBank)?.type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="text-green-500 w-4 h-4" />
                  <h4 className="text-sm font-black text-gray-900">Transaction Status</h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Transaction ID:</span>
                    <span className="text-gray-900 font-bold">TXN31577668</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">Status:</span>
                    <span className="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      Approved
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Date:</span>
                    <span className="text-gray-900 font-bold">2 January 2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Time:</span>
                    <span className="text-gray-900 font-bold">10:56 am</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Expected Credit:</span>
                    <span className="text-gray-900 font-bold">4 Jan 2026</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-orange-600 w-4 h-4" />
                <h4 className="text-sm font-black text-orange-800">Important Information</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex gap-2 text-xs text-orange-800 font-medium">
                  <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  The withdrawal amount will be credited to your bank account within 1-3 business
                  days.
                </li>
                <li className="flex gap-2 text-xs text-orange-800 font-medium">
                  <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  Please verify your bank account details are correct to avoid any delays.
                </li>
                <li className="flex gap-2 text-xs text-orange-800 font-medium">
                  <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  A confirmation email has been sent to your registered email address.
                </li>
                <li className="flex gap-2 text-xs text-orange-800 font-medium">
                  <span className="block w-1 h-1 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  For any queries, please contact our support team with the transaction ID.
                </li>
              </ul>
            </div>

            {/* Footer Disclaimer */}
            <div className="text-center space-y-1 py-2">
              <p className="text-xs text-gray-500">
                This is a computer-generated receipt and does not require a signature.
              </p>
              <p className="text-sm font-black text-gray-700">Thank you for choosing Klar!</p>
              <p className="text-[10px] text-gray-400">© 2026 Klar. All rights reserved.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="flex-[0.8] h-12 bg-white border-2 border-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
              >
                <X size={16} /> Close
              </button>
              <button className="flex-1 h-12 bg-white border-2 border-gray-900 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <Printer size={16} /> Print
              </button>
              <button
                onClick={() => setStep(9)}
                className="flex-1 h-12 bg-[#2563EB] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#1D4ED8] transition-colors shadow-lg shadow-blue-100"
              >
                <Mail size={16} /> Email
              </button>
              <button
                onClick={() => setStep(10)}
                className="flex-1 h-12 bg-[#FF5A5F] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#FF4046] transition-colors shadow-lg shadow-red-100"
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawMoneyModal;
