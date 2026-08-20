import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, Plane, Calendar, Users, ChevronDown, Loader2 } from 'lucide-react';
import { submitCharterQuote } from '@/api/charterService.api';

const CATEGORIES = [
  'Private Jets',
  'Helicopter Charter',
  'Corporate Charter',
  'Group Charter',
] as const;

const ChartersSearchSection = () => {
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    departureDateTime: '',
    passengers: 1,
    category: 'Private Jets',
    fullName: '',
    mobileNumber: '',
    email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { charterCategory?: string } | null;
    const charterCategory = state?.charterCategory ?? new URLSearchParams(location.search).get('charterCategory');

    if (charterCategory && CATEGORIES.includes(charterCategory)) {
      setFormData((prev) => ({ ...prev, category: charterCategory }));
    }
  }, [location.state, location.search]);

  // Real-time input handler with strict 10-digit rule for phone numbers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Strict 10-digit limit for mobile number (only allow digits)
    if (name === 'mobileNumber') {
      const cleanedDigits = value.replace(/\D/g, '');
      if (cleanedDigits.length > 10) return; // Ignore input past 10 digits
      setFormData((prev) => ({ ...prev, [name]: cleanedDigits }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'passengers' ? Number(value) : value,
      }));
    }

    // Clear inline error on user input
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Field validation logic matching UI screenshot requirements
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.from.trim() || formData.from.trim().length < 2) {
      newErrors.from = 'Please enter source city/airport (at least 2 characters)';
    }

    if (!formData.to.trim() || formData.to.trim().length < 2) {
      newErrors.to = 'Please enter destination city/airport (at least 2 characters)';
    }

    if (!formData.departureDateTime) {
      newErrors.departureDateTime = 'Please select departure date and time';
    }

    if (!formData.passengers || formData.passengers < 1) {
      newErrors.passengers = 'Please select number of passengers';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a charter category';
    }

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter full name (at least 2 characters)';
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!formData.mobileNumber) {
      newErrors.mobileNumber = 'Please enter mobile number';
    } else if (!mobileRegex.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Please enter email address';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!validateForm()) return;

    setLoading(true);

    try {
      const data = await submitCharterQuote({
        ...formData,
        departureDateTime: new Date(formData.departureDateTime).toISOString(),
        source: 'b2c',
      });

      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: 'Charter quote request submitted successfully!',
        });
        // Reset form values
        setFormData({
          from: '',
          to: '',
          departureDateTime: '',
          passengers: 1,
          category: 'Private Jets',
          fullName: '',
          mobileNumber: '',
          email: '',
        });
        setErrors({});
      }
    } catch (error: any) {
      const apiErrors = error?.response?.data?.errors;
      if (apiErrors && Array.isArray(apiErrors)) {
        const fieldErrors: Record<string, string> = {};
        apiErrors.forEach((err) => {
          if (err.field) fieldErrors[err.field] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        setStatusMessage({
          type: 'error',
          text: error?.response?.data?.message || 'Failed to submit quote.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-[#FAF5F5] border border-[#D4AF37]/60 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6"
      >
        {/* Top Row Inputs - 5 Grid Columns on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* From */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              From
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-5 h-5 text-gray-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                name="from"
                value={formData.from}
                onChange={handleChange}
                placeholder="Source City/Airport"
                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.from
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.from && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.from}
              </span>
            )}
          </div>

          {/* To */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              To
            </label>
            <div className="relative flex items-center">
              <Plane className="w-5 h-5 text-gray-500 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                name="to"
                value={formData.to}
                onChange={handleChange}
                placeholder="Destination City/Airport"
                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.to
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.to && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.to}
              </span>
            )}
          </div>

          {/* Departure Date & Time */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              Departure Date & Time
            </label>
            <div className="relative flex items-center">
              <Calendar className="w-5 h-5 text-gray-500 absolute left-3.5 pointer-events-none" />
              <input
                type="datetime-local"
                name="departureDateTime"
                value={formData.departureDateTime}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.departureDateTime
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.departureDateTime && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.departureDateTime}
              </span>
            )}
          </div>

          {/* Passengers */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              Passengers
            </label>
            <div className="relative flex items-center">
              <Users className="w-5 h-5 text-gray-500 absolute left-3.5 pointer-events-none" />
              <select
                name="passengers"
                value={formData.passengers}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-3 pl-10 pr-8 text-sm text-gray-800 focus:outline-none transition appearance-none cursor-pointer ${
                  errors.passengers
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              >
                {[...Array(20)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} Passenger{i > 0 ? 's' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
            </div>
            {errors.passengers && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.passengers}
              </span>
            )}
          </div>

          {/* Category Dropdown (Beside Passengers) */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              Category
            </label>
            <div className="relative flex items-center">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-3 px-4 pr-8 text-sm text-gray-800 focus:outline-none transition appearance-none cursor-pointer ${
                  errors.category
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 pointer-events-none" />
            </div>
            {errors.category && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.category}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Row Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Full Name */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className={`w-full bg-white border rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.fullName
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.fullName && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.fullName}
              </span>
            )}
          </div>

          {/* Mobile number */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              Mobile number
            </label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="Mobile Number"
              className={`w-full bg-white border rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.mobileNumber
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.mobileNumber && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.mobileNumber}
              </span>
            )}
          </div>

          {/* E-mail */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-sm tracking-wide mb-0.5">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email ID"
              className={`w-full bg-white border rounded-xl py-3 px-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.email
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.email && (
              <span className="text-xs text-red-500 font-medium mt-1">
                {errors.email}
              </span>
            )}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage.text && (
          <div
            className={`text-center text-sm font-medium py-2 px-4 rounded-lg ${
              statusMessage.type === 'success'
                ? ' text-emerald-700 border'
                : ' text-rose-700 border '
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Submit Button Inside Card Container */}
        <div className="flex justify-center pt-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white font-semibold px-8 py-3.5 rounded-xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Request Quote</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChartersSearchSection;