import React, { useState } from 'react';
import { Building2, Users, Mail, Phone, Lock, Briefcase } from 'lucide-react';

interface CreateBusinessAccountProps {
  onSubmit: (data: BusinessAccountData) => void;
  onLoginClick: () => void;
}

interface BusinessAccountData {
  businessName: string;
  businessType: string;
  contactPersonName: string;
  businessEmail: string;
  businessMobile: string;
  password: string;
  confirmPassword: string;
}

export default function CreateBusinessAccount({
  onSubmit,
  onLoginClick,
}: CreateBusinessAccountProps) {
  const [formData, setFormData] = useState<BusinessAccountData>({
    businessName: 'aditya Tours',
    businessType: 'Travel Agency',
    contactPersonName: 'Rithwik',
    businessEmail: 'Rithwik@gmail.com',
    businessMobile: '4589764518',
    password: 'Rithwik@123.in',
    confirmPassword: 'Rithwik@123.in',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-md mx-auto p-4 md:p-8">
      <h1
        className="text-gray-900 mb-1 text-[30px]"
        style={{
          fontFamily: 'var(--font-playfair)',
          fontWeight: 700,
          lineHeight: 'var(--heading-line-height)',
          letterSpacing: 'var(--heading-letter-spacing)',
        }}
      >
        Create Business Account
      </h1>

      <p className="text-gray-600 mb-6 text-lg">Register as a B2B travel partner</p>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-8">
        <p className="text-amber-800 text-sm">
          <span className="font-bold">Note:</span> Account will be subject to verification before
          activation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Business Name <span className="text-red-500">*</span>
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
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter business name"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Business Type <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Briefcase
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <select
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors bg-transparent appearance-none cursor-pointer"
              required
            >
              <option value="Travel Agency">Travel Agency</option>
              <option value="Corporate">Corporate</option>
              <option value="Tour Operator">Tour Operator</option>
              <option value="Other">Other</option>
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

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Contact Person Name (Admin) <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Users
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="text"
              name="contactPersonName"
              value={formData.contactPersonName}
              onChange={handleChange}
              placeholder="Enter admin name"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Business Email <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Mail
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="email"
              name="businessEmail"
              value={formData.businessEmail}
              onChange={handleChange}
              placeholder="Enter business email"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Business Mobile <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Phone
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="tel"
              name="businessMobile"
              value={formData.businessMobile}
              onChange={handleChange}
              placeholder="Enter mobile number"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Lock
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create password"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-800">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-1 flex items-center pointer-events-none">
              <Lock
                className="h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors"
                strokeWidth={1.5}
              />
            </div>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              className="block w-full pl-9 pr-3 py-2 border-b border-gray-200 focus:border-primary focus:outline-none transition-colors placeholder-gray-400 bg-transparent"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#234977] hover:bg-[#1b3a5d] text-white py-4 px-4 rounded-lg font-bold shadow-lg transition-all active:scale-[0.98] mt-4"
        >
          Next Step
        </button>
      </form>

      <div className="mt-8 text-center space-y-2">
        <p className="text-gray-500 text-sm font-nunito">Already have an account?</p>
        <button
          onClick={onLoginClick}
          className="text-[#234977] hover:text-primary font-bold text-lg"
        >
          Login Now
        </button>
      </div>
    </div>
  );
}
