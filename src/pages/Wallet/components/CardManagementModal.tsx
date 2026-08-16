import React, { useState } from 'react';
import { X, Landmark, Plus, Check, CreditCard, Info } from 'lucide-react';

interface CardManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CardManagementModal: React.FC<CardManagementModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(2);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  if (!isOpen) return null;

  const savedBanks = [
    {
      id: 'bank1',
      name: 'HDFC Bank',
      number: '**** **** **** 8821',
      type: 'Savings',
      icon: Landmark,
    },
    {
      id: 'bank2',
      name: 'ICICI Bank',
      number: '**** **** **** 5643',
      type: 'Current',
      icon: Landmark,
    },
    {
      id: 'bank3',
      name: 'Axis Bank',
      number: '**** **** **** 9012',
      type: 'Savings',
      icon: Landmark,
    },
  ];

  const handleBack = () => {
    if (step > 2) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  const handleContinue = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onClose();
      setStep(2);
    }
  };

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g);
    return groups ? groups.join(' ') : digits;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-8 pb-4 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-[#111827]">
              {step === 4 ? 'Card Linked' : 'add new card'}
            </h2>
            {step < 4 && <p className="text-gray-400 font-bold mt-1">Step {step} of 4</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X size={28} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-8 mb-6">
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[#FF5A5F]' : 'bg-gray-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {step === 2 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-[#111827]">Select Bank Account</h3>
              <div className="space-y-4">
                {savedBanks.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => {
                      setSelectedBank(bank.id);
                      setIsAddMode(false);
                    }}
                    className={`w-full flex items-center justify-between p-5 border-2 rounded-3xl transition-all ${
                      selectedBank === bank.id && !isAddMode
                        ? 'border-[#3B82F6]/20 bg-blue-50/10 shadow-lg shadow-blue-500/5'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                        <bank.icon className="text-[#3B82F6]" size={24} />
                      </div>
                      <div className="text-left">
                        <h4 className="text-lg font-black text-[#111827]">{bank.name}</h4>
                        <p className="text-sm font-bold text-gray-400 mt-0.5">
                          {bank.number} • {bank.type}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedBank === bank.id && !isAddMode
                          ? 'border-[#3B82F6]'
                          : 'border-gray-200'
                      }`}
                    >
                      {selectedBank === bank.id && !isAddMode && (
                        <div className="w-4 h-4 bg-[#3B82F6] rounded-full" />
                      )}
                    </div>
                  </button>
                ))}

                <button
                  onClick={() => {
                    setIsAddMode(true);
                    setSelectedBank(null);
                  }}
                  className={`w-full flex items-center gap-6 p-5 border-2 rounded-3xl transition-all ${
                    isAddMode
                      ? 'border-[#FF5A5F]/20 bg-red-50/10 shadow-lg shadow-red-500/5'
                      : 'border-gray-100 hover:border-gray-200 bg-white'
                  }`}
                >
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <Plus className="text-gray-900" size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-lg font-black text-[#111827]">Add New Card</h4>
                    <p className="text-sm font-bold text-gray-400 mt-0.5">
                      Add a debit or credit card
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : step === 3 ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {/* Card Details Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-black text-[#111827]">Add New Card</h3>
                  <p className="text-gray-400 text-sm font-bold mt-1">
                    Enter your card details below
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="text-gray-500 font-bold hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Visual Card Preview */}
              <div className="relative h-56 w-full bg-[#111827] rounded-[2rem] p-8 text-white shadow-2xl mb-8 flex flex-col justify-between overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16" />

                <div className="flex justify-between items-start relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                    Debit Card
                  </span>
                  <CreditCard size={32} strokeWidth={1.5} className="opacity-80" />
                </div>

                <div className="relative z-10">
                  <p className="text-2xl font-mono tracking-[0.2em] mb-8">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </p>
                </div>

                <div className="flex justify-between items-end relative z-10">
                  <div className="max-w-[180px]">
                    <p className="text-[8px] uppercase font-black opacity-40 tracking-wider mb-1">
                      Cardholder
                    </p>
                    <p className="text-sm font-bold tracking-wide truncate">
                      {cardholderName || 'YOUR NAME'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase font-black opacity-40 tracking-wider mb-1">
                      Expires
                    </p>
                    <p className="text-sm font-bold tracking-wide">{expiryDate || 'MM/YY'}</p>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5">
                <div>
                  <label className="text-sm font-black text-gray-700 block mb-2">Card Number</label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value).slice(0, 19))}
                    className="w-full h-16 px-6 bg-white border-2 border-gray-100 rounded-2xl text-lg font-bold focus:border-[#FF5A5F]/20 focus:ring-4 focus:ring-[#FF5A5F]/5 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value.slice(0, 5))}
                      className="w-full h-16 px-6 bg-white border-2 border-gray-100 rounded-2xl text-lg font-bold focus:border-[#FF5A5F]/20 focus:ring-4 focus:ring-[#FF5A5F]/5 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-black text-gray-700 block mb-2">CVV</label>
                    <input
                      type="password"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.slice(0, 3))}
                      className="w-full h-16 px-6 bg-white border-2 border-gray-100 rounded-2xl text-lg font-bold focus:border-[#FF5A5F]/20 focus:ring-4 focus:ring-[#FF5A5F]/5 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-black text-gray-700 block mb-2">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="JOHN DOE"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                    className="w-full h-16 px-6 bg-white border-2 border-gray-100 rounded-2xl text-lg font-bold focus:border-[#FF5A5F]/20 focus:ring-4 focus:ring-[#FF5A5F]/5 outline-none transition-all placeholder:text-gray-300"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50/50 rounded-2xl border border-blue-50">
                  <Info className="text-blue-500" size={20} />
                  <p className="text-sm font-bold text-blue-700/80">
                    Your card details are encrypted and secure.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 animate-in zoom-in duration-500">
              {/* Success Icon */}
              <div className="w-24 h-24 bg-[#00FF85] rounded-full flex items-center justify-center text-white shadow-xl shadow-green-100 mb-8">
                <Check size={48} strokeWidth={4} />
              </div>

              <div className="text-center mb-10">
                <h3 className="text-3xl font-black text-[#111827]">Card Added Successfully!</h3>
                <p className="text-gray-400 font-bold mt-2">Your card has been securely saved</p>
              </div>

              {/* Card Summary Box */}
              <div className="w-full bg-[#E6FFF2] border-2 border-[#00FF85]/10 rounded-[2rem] p-6 flex items-center justify-between mb-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-[#1A1A1A] rounded-2xl flex items-center justify-center text-white">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[#111827]">
                      •••• •••• •••• {cardNumber.slice(-4) || '7777'}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-bold text-gray-500">
                        {cardholderName.toLowerCase() || 'aditya'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs font-bold text-gray-400">
                        Expires: {expiryDate || '10/27'}
                      </p>
                      <span className="text-[10px] font-black text-[#00C853] uppercase tracking-wider">
                        CARD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#E6FFF2] border-2 border-[#00C853] flex items-center justify-center text-[#00C853]">
                  <Check size={16} strokeWidth={4} />
                </div>
              </div>

              {/* Verification Box */}
              <div className="w-full bg-[#F0FFF7] border-2 border-[#D1FAE5] rounded-[2rem] p-6 flex items-start gap-4">
                <div className="mt-1">
                  <Info className="text-[#059669]" size={24} />
                </div>
                <div>
                  <p className="text-lg font-black text-[#065F46]">Card Verified</p>
                  <p className="text-sm font-bold text-[#047857] leading-relaxed mt-1">
                    Your card has been verified and is now available for withdrawals and payments.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-8 pt-0 flex gap-4">
          {step < 4 ? (
            <>
              <button
                onClick={handleBack}
                className="flex-1 h-20 bg-gray-50 text-gray-700 rounded-[2rem] text-xl font-black transition-all hover:bg-gray-100 active:scale-[0.98]"
              >
                {step === 3 ? 'Cancel' : 'Back'}
              </button>
              <button
                onClick={handleContinue}
                disabled={
                  step === 2
                    ? !selectedBank && !isAddMode
                    : step === 3
                      ? !cardNumber || !expiryDate || !cvv || !cardholderName
                      : false
                }
                className="flex-1 h-20 bg-[#FF5A5F] text-white rounded-[2rem] text-xl font-black shadow-lg shadow-red-200 transition-all hover:bg-[#FF4046] hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:shadow-none"
              >
                {step === 2 ? 'Continue' : 'Add Card'}
              </button>
            </>
          ) : (
            <button
              onClick={handleContinue}
              className="w-full h-20 bg-[#00C853] text-white rounded-[2rem] text-xl font-black shadow-lg shadow-green-200 transition-all hover:bg-[#00B248] hover:shadow-xl active:scale-[0.98]"
            >
              Done
            </button>
          )}
        </div>
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #e2e2e2;
                }
            `,
        }}
      />
    </div>
  );
};

export default CardManagementModal;
