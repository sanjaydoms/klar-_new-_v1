import React from 'react';
import { useState } from 'react';
import { MapPin, FileText, Globe } from 'lucide-react';
import { SignupStep1Data } from '../types/signup.types';
import { b2bSignup } from '../../../api/auth.api';

interface SignupStep2Props {
  step1Data: SignupStep1Data;
  onSuccess: () => void;
}

export default function SignupStep2({ step1Data, onSuccess }: SignupStep2Props) {
  const [formData, setFormData] = useState({
    gstNumber: '',
    panNumber: '',
    businessAddress: '',
    city: '',
    country: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const countries = [
    'India',
    'United States',
    'United Kingdom',
    'Canada',
    'Australia',
    'Singapore',
    'UAE',
    'Other',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await b2bSignup({
        businessName: step1Data.businessName,
        businessType: step1Data.businessType,
        contactPerson: step1Data.contactPersonName,
        businessEmail: step1Data.businessEmail,
        businessMobile: step1Data.businessMobile,
        password: step1Data.password,

        gstNumber: formData.gstNumber || undefined,
        panNumber: formData.panNumber || undefined,
        address: formData.businessAddress,
        city: formData.city,
        country: formData.country,
      });

      onSuccess(); // navigate to "Verification Pending" screen
    } catch (err: any) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden md:block md:w-1/2 relative">
        <img
          src="https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Travel"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="mb-6">
            <h1 className="font-display mb-2 text-[34px] leading-[1.12] font-medium text-primary">Business Verification <span className="text-[var(--color-brand-red)]">Details</span></h1>
            <p className="text-gray-600">Provide your business information for verification</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                GST Number <span className="text-gray-500 font-normal">(Optional - India)</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) => updateField('gstNumber', e.target.value)}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">15-character GST identification number</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                PAN Number <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.panNumber}
                  onChange={(e) => updateField('panNumber', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">10-character alphanumeric PAN</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Business Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                <textarea
                  value={formData.businessAddress}
                  onChange={(e) => updateField('businessAddress', e.target.value)}
                  placeholder="Enter complete business address"
                  rows={3}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="Enter city"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Country <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none bg-white"
                >
                  <option value="">Select Country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-secondary border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">Verification Process</h3>
              <p className="text-sm text-primary">
                Our team will verify your business details within 24-48 hours. You'll receive an
                email notification once your account is approved.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-brand-red)] text-white py-3 rounded-xl font-semibold hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
