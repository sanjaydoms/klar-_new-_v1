import React, { useState, useEffect } from 'react';
import { CreditCardInfo } from '../types/booking.types';

interface CreditCardFormProps {
  onCardDetailsChange: (details: CreditCardInfo) => void;
  isValid: (valid: boolean) => void;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({ onCardDetailsChange, isValid }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    const isDetailsValid =
      cardNumber.length >= 15 &&
      cardHolderName.length > 0 &&
      /^\d{2}\/\d{2}$/.test(expiryDate) &&
      cvv.length >= 3;

    isValid(isDetailsValid);

    if (isDetailsValid) {
      onCardDetailsChange({
        cardNumber,
        cardHolderName,
        expiryDate,
        cvv,
      });
    }
  }, [cardNumber, cardHolderName, expiryDate, cvv, onCardDetailsChange, isValid]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
          Card Number
        </label>
        <input
          type="text"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
          placeholder="0000 0000 0000 0000"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
          autoComplete="cc-number"
        />
      </div>
      <div>
        <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
          Card Holder Name
        </label>
        <input
          type="text"
          value={cardHolderName}
          onChange={(e) => setCardHolderName(e.target.value)}
          placeholder="AS PER CARD"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
          autoComplete="cc-name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">
            Expiry Date
          </label>
          <input
            type="text"
            value={expiryDate}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '');
              if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
              setExpiryDate(val.slice(0, 5));
            }}
            placeholder="MM/YY"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
            autoComplete="cc-exp"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">CVV</label>
          <input
            type="password"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-400 outline-none"
            autoComplete="cc-csc"
          />
        </div>
      </div>
    </div>
  );
};

export default CreditCardForm;
