import React, { useState } from 'react';
import { FileText, MapPin, Globe, CreditCard, Building2 } from 'lucide-react';

interface BusinessVerificationDetailsProps {
  onSubmit: (data: VerificationData) => void;
  onBack: () => void;
}

interface VerificationData {
  gstNumber: string;
  panNumber: string;
  businessAddress: string;
  city: string;
  country: string;
}

export default function BusinessVerificationDetails({
  onSubmit,
  onBack,
}: BusinessVerificationDetailsProps) {
  const [formData, setFormData] = useState<VerificationData>({
    gstNumber: '22AAAAA0000A125',
    panNumber: 'ABCDE1234F',
    businessAddress: '',
    city: '',
    country: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const countries = [
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Germany',
    'France',
  ];

  return (
    <div className="max-w-md m-auto p-4 md:p-8">
      <h1
        className="text-gray-900 mb-1 text-[30px]"
        style={{
          fontFamily: 'var(--font-playfair)',
          fontWeight: 700,
          lineHeight: 'var(--heading-line-height)',
          letterSpacing: 'var(--heading-letter-spacing)',
        }}
      >
        Business Verification Details
      </h1>

      <p className="text-gray-600 mb-8 text-lg">
        Provide your business information for verification
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            GST Number <span className="text-gray-500 font-normal">(Optional - India)</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <FileText
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="text"
              name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
              placeholder="22AAAAA0000A125"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">15-Character GST identification number</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            PAN Number <span className="text-gray-500 font-normal">(Optional)</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <CreditCard
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="text"
              name="panNumber"
              value={formData.panNumber}
              onChange={handleChange}
              placeholder="ABCDE1234F"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">10-Character alphanumeric PAN</p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Business Address <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <MapPin
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="text"
              name="businessAddress"
              value={formData.businessAddress}
              onChange={handleChange}
              placeholder="Enter complete business address"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            City <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Building2
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Country <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Globe
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <select
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors bg-transparent appearance-none cursor-pointer"
              required
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-secondary border border-border rounded-lg p-4 mt-8">
          <h3 className="font-bold text-primary text-sm mb-1">Verification Process</h3>
          <p className="text-xs leading-relaxed text-primary/80">
            Our team will verify your business details within 24-48 hours. You'll receive an email
            notification once your account is approved.
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 px-4 rounded-lg font-bold transition-all active:scale-[0.98]"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98]"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
