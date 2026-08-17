import React from 'react';
import { Loader2 } from 'lucide-react';

interface AmountInputProps {
  amount: string;
  setAmount: (value: string) => void;
  onProceed: () => void;
  isProcessing: boolean;
  error: string | null;
}

const AmountInput: React.FC<AmountInputProps> = ({
  amount,
  setAmount,
  onProceed,
  isProcessing,
  error,
}) => {
  const quickAmounts = [20000, 50000, 100000, 2500000];

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setAmount(val);
  };

  const handleQuickSelect = (val: number) => {
    setAmount(val.toString());
  };

  return (
    <>
      {/* Amount Input */}
      <div className="flex flex-col items-center mb-10">
        <div className="flex items-center gap-4 border-b-2 border-gray-100 w-full pb-4 px-2">
          <span className="text-4xl font-black text-gray-300">₹</span>
          <input
            type="text"
            value={amount}
            onChange={handleAmountChange}
            placeholder="0"
            className="text-6xl font-black text-gray-900 bg-transparent border-none outline-none w-full"
            autoFocus
          />
        </div>
      </div>

      {/* Quick Select Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {quickAmounts.map((val) => (
          <button
            key={val}
            onClick={() => handleQuickSelect(val)}
            className="py-4 border border-gray-100 rounded-3xl hover:border-red-200 hover:bg-red-50/30 transition-all"
          >
            <span className="text-sm font-black text-gray-900">₹{val.toLocaleString()}</span>
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Pay Button */}
      <button
        onClick={onProceed}
        disabled={!amount || parseInt(amount) <= 0 || isProcessing}
        className="w-full h-20 bg-[#FF5A5F] text-white rounded-2xl text-xl font-black shadow-lg hover:bg-[#FF4046] transition-all disabled:opacity-50"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={24} />
            <span>Processing...</span>
          </div>
        ) : (
          `Pay ₹${parseInt(amount || '0').toLocaleString()}`
        )}
      </button>
    </>
  );
};

export default AmountInput;
