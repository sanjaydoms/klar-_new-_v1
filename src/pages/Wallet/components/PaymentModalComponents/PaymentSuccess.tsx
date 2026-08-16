import React from 'react';
import { Check } from 'lucide-react';

interface PaymentSuccessProps {
  amount: number;
  onClose: () => void;
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ amount, onClose }) => {
  return (
    <div className="py-8 text-center space-y-6">
      <div className="flex justify-center mb-6">
        <div className="w-28 h-28 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg">
          <Check className="text-white w-14 h-14" strokeWidth={3} />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-3xl font-black text-gray-900">Funds Added!</h3>
        <p className="text-gray-500">Your wallet has been topped up successfully.</p>
      </div>

      <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 max-w-sm mx-auto">
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold">Amount Added</span>
            <span className="text-xl font-black text-gray-900">₹{amount.toLocaleString()}</span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between">
            <span className="text-gray-400 font-bold">Transaction ID</span>
            <span className="font-mono font-bold text-gray-600">
              TXN{Date.now().toString().slice(-8)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full h-14 bg-[#111827] text-white rounded-2xl text-lg font-bold hover:bg-black transition-all"
      >
        Done
      </button>
    </div>
  );
};

export default PaymentSuccess;
