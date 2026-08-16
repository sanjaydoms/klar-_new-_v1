// src/features/authentication/components/SignupStep1.tsx
import React, { useState } from 'react';
import { User, Building2, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { SignupStep1Data, SignupStep1Props } from '../types/signup.types';

export default function SignupStep1({ onNext, onNavigateToLogin }: SignupStep1Props) {
  const [formData, setFormData] = useState<SignupStep1Data>({
    businessName: '',
    businessType: '',
    contactPersonName: '',
    businessEmail: '',
    businessMobile: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const businessTypes = [
    'Travel Agency',
    'Tour Operator',
    'Corporate',
    'Hotel Chain',
    'Hotel Partner'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    // Validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    if (formData.password.length < 6) {
      newErrors.push('Password must be at least 6 characters');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.businessEmail)) {
      newErrors.push('Please enter a valid email address');
    }

    // Mobile validation (basic)
    const mobileRegex = /^[0-9+\-\s]{10,15}$/;
    if (!mobileRegex.test(formData.businessMobile)) {
      newErrors.push('Please enter a valid mobile number');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    // Call the onNext prop with the form data
    onNext(formData);
  };

  const updateField = (field: keyof SignupStep1Data, value: string) => {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Business Account</h1>
            <p className="text-gray-600">Register as a B2B travel partner</p>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-6">
            <p className="text-sm text-orange-800">
              <span className="font-semibold">Note:</span> Account will be subject to verification
              before activation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="Enter business name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={formData.businessType}
                  onChange={(e) => updateField('businessType', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none bg-white"
                  required
                >
                  <option value="">Select business type</option>
                  {businessTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
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

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Contact Person Name (Admin) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.contactPersonName}
                  onChange={(e) => updateField('contactPersonName', e.target.value)}
                  placeholder="Enter name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Business Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={formData.businessEmail}
                  onChange={(e) => updateField('businessEmail', e.target.value)}
                  placeholder="business@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Business Mobile <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="tel"
                  value={formData.businessMobile}
                  onChange={(e) => updateField('businessMobile', e.target.value)}
                  placeholder="+91 1234567890"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Create password"
                  className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-700">
                    {error}
                  </p>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-900 text-white py-3 rounded-lg font-medium hover:bg-blue-800 transition-colors"
            >
              Next
            </button>

            <div className="text-center">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="text-blue-700 font-medium hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}