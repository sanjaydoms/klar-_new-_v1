import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { countries } from '../../../src/services/countries';

interface ContactDetailsFormProps {
  email: string;
  setEmail: (email: string) => void;
  countryCode: string;
  setCountryCode: (code: string) => void;
  mobileNumber: string;
  setMobileNumber: (number: string) => void;
  nameErrors: { [key: string]: string };
  setNameErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export default function ContactDetailsForm({
  email,
  setEmail,
  countryCode,
  setCountryCode,
  mobileNumber,
  setMobileNumber,
  nameErrors,
  setNameErrors,
}: ContactDetailsFormProps) {

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">
        Contact Details
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div>
          <Label htmlFor="contact-email" className="mb-1 text-xs text-gray-700">E-mail <span className="text-red-500">*</span></Label>
          <Input
            id="contact-email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.toLowerCase());
              if (nameErrors['email']) {
                setNameErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors['email'];
                  return newErrors;
                });
              }
            }}
            onBlur={(e) => {
              if (!e.target.value) {
                setNameErrors((prev) => ({ ...prev, email: 'Email is required' }));
              } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                setNameErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
              } else {
                setNameErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors['email'];
                  return newErrors;
                });
              }
            }}
            aria-invalid={!!(nameErrors['email'])}
              className="w-full h-9 text-xs sm:text-sm"
            placeholder="Enter email address"
          />
          {nameErrors['email'] && (
            <p className="text-xs text-red-500 mt-1">{nameErrors['email']}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-1">
            <Label htmlFor="contact-country-code" className="mb-1 text-xs text-gray-700">Country Code <span className="text-red-500">*</span></Label>
            <select
              id="contact-country-code"
              name="countryCode"
              autoComplete="tel-country-code"
              required
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                if (nameErrors['countryCode']) {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors['countryCode'];
                    return newErrors;
                  });
                }
              }}
              onBlur={() => {
                if (!countryCode) {
                  setNameErrors((prev) => ({ ...prev, countryCode: 'Country code is required' }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors['countryCode'];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors['countryCode'])}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.dialCode}>
                  {country.flag} {country.dialCode}
                </option>
              ))}
            </select>
            {nameErrors['countryCode'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['countryCode']}</p>
            )}
          </div>
          <div className="sm:col-span-3">
            <Label htmlFor="contact-mobile" className="mb-1 text-xs text-gray-700">Mobile Number <span className="text-red-500">*</span></Label>
            <Input
              id="contact-mobile"
              name="mobileNumber"
              autoComplete="tel-national"
              inputMode="numeric"
              required
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                setMobileNumber(e.target.value.replace(/\D/g, ''));
                if (nameErrors['mobileNumber']) {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors['mobileNumber'];
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  setNameErrors((prev) => ({ ...prev, mobileNumber: 'Mobile number is required' }));
                } else if (!/^\d{10}$/.test(e.target.value.replace(/\s/g, ''))) {
                  setNameErrors((prev) => ({
                    ...prev,
                    mobileNumber: 'Please enter a valid 10-digit mobile number',
                  }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors['mobileNumber'];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors['mobileNumber'])}
              className="w-full h-9 text-xs sm:text-sm"
              placeholder="Enter mobile number"
              maxLength={10}
            />
            {nameErrors['mobileNumber'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['mobileNumber']}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
