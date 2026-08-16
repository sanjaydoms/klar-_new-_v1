import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  MapPin, 
  Plane, 
  Calendar, 
  ChevronDown, 
  Loader2 
} from 'lucide-react';
import { submitCharterQuote } from '@/api/charterService.api';
import ChartersContent from '../../Charters/ChartersContent';

const CATEGORIES = [
  'Private Jets',
  'Helicopter Charter',
  'Corporate Charter',
  'Group Charter',
] as const;

const BANNER_IMAGE = '/images/charters_mobile_banner_image.jpg';

const MobileChartersSearchSection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  useEffect(() => {
    const state = location.state as { charterCategory?: string } | null;
    const charterCategory = state?.charterCategory ?? new URLSearchParams(location.search).get('charterCategory');

    if (charterCategory && CATEGORIES.includes(charterCategory)) {
      setFormData((prev) => ({ ...prev, category: charterCategory }));
    }
  }, [location.state, location.search]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Real-time input handler with strict 10-digit rule for phone numbers
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'mobileNumber') {
      const cleanedDigits = value.replace(/\D/g, '');
      if (cleanedDigits.length > 10) return; // Limit to 10 digits max
      setFormData((prev) => ({ ...prev, [name]: cleanedDigits }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'passengers' ? Number(value) : value,
      }));
    }

    // Clear inline error on active typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Field validation matching backend/UI schema requirements
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
    <div className="w-full max-w-md mx-auto bg-white min-h-screen pb-10 flex flex-col font-sans">
      {/* Hero Section with Background Image */}
      <div className="relative w-full h-[380px] bg-slate-900 overflow-hidden">
        <img
          src={BANNER_IMAGE}
          alt="Charter Flight Banner"
          className="w-full h-full object-cover object-center brightness-[0.75]"
        />

        {/* Custom Blue Gradient Overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(2, 19, 86, 0.6) 6.3%, rgba(2, 19, 86, 0.2) 56.3%, rgba(2, 19, 86, 0.8) 106.3%)',
          }}
        />

        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between w-full z-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Go to home"
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <h1 className="text-white font-serif text-lg font-medium tracking-wide">
            Chartered Flights
          </h1>

          {/* Spacer div to keep the title perfectly centered */}
          <div className="w-10" />
        </div>

        {/* Hero Overlay Title */}
        <div className="absolute bottom-16 left-0 right-0 px-6 text-left z-10">
          <h2 className="text-white font-serif text-2xl sm:text-3xl font-semibold leading-tight tracking-wide drop-shadow-md">
            Fly Private. Travel Without Limits. <br />
            Experience the Freedom of Personalized Aviation.
          </h2>
        </div>
      </div>

      {/* Main Floating Form Card */}
      <div className="-mt-10 px-4 z-20">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-[#FAF5F5] border border-[#D4AF37]/40 rounded-3xl p-5 shadow-xl flex flex-col gap-4"
        >
          {/* From Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              From
            </label>
            <div className="relative flex items-center">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                name="from"
                value={formData.from}
                onChange={handleChange}
                placeholder="Source City/Airport"
                className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.from
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.from && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.from}
              </span>
            )}
          </div>

          {/* To Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              To
            </label>
            <div className="relative flex items-center">
              <Plane className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                name="to"
                value={formData.to}
                onChange={handleChange}
                placeholder="Destination City/Airport"
                className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.to
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.to && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.to}
              </span>
            )}
          </div>

          {/* Departure Date & Time Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              Departure Date & Time
            </label>
            <div className="relative flex items-center">
              <Calendar className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
              <input
                type="datetime-local"
                name="departureDateTime"
                value={formData.departureDateTime}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                  errors.departureDateTime
                    ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                    : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
                }`}
              />
            </div>
            {errors.departureDateTime && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.departureDateTime}
              </span>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              Category
            </label>
            <div className="relative flex items-center">
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-2.5 px-3 pr-8 text-sm text-gray-800 focus:outline-none transition appearance-none cursor-pointer ${
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
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
            </div>
            {errors.category && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.category}
              </span>
            )}
          </div>

          {/* Passengers Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              Passengers
            </label>
            <div className="relative flex items-center">
              <select
                name="passengers"
                value={formData.passengers}
                onChange={handleChange}
                className={`w-full bg-white border rounded-xl py-2.5 px-3 pr-8 text-sm text-gray-800 focus:outline-none transition appearance-none cursor-pointer ${
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
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 pointer-events-none" />
            </div>
            {errors.passengers && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.passengers}
              </span>
            )}
          </div>

          {/* Full Name Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className={`w-full bg-white border rounded-xl py-2.5 px-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.fullName
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.fullName && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.fullName}
              </span>
            )}
          </div>

          {/* Mobile Number Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              Mobile number
            </label>
            <input
              type="tel"
              name="mobileNumber"
              value={formData.mobileNumber}
              onChange={handleChange}
              placeholder="Mobile Number"
              className={`w-full bg-white border rounded-xl py-2.5 px-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.mobileNumber
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.mobileNumber && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.mobileNumber}
              </span>
            )}
          </div>

          {/* E-mail Field */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[#332233] font-serif font-bold text-xs tracking-wide">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-mail"
              className={`w-full bg-white border rounded-xl py-2.5 px-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition ${
                errors.email
                  ? 'border-red-500 text-red-900 focus:ring-1 focus:ring-red-500'
                  : 'border-gray-200 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]'
              }`}
            />
            {errors.email && (
              <span className="text-[11px] text-red-500 font-medium">
                {errors.email}
              </span>
            )}
          </div>

          {/* Status Alert Banner */}
          {statusMessage.text && (
            <div
              className={`text-center text-xs font-medium py-2 px-3 rounded-lg border ${
                statusMessage.type === 'success'
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4D0000] hover:bg-[#330000] active:scale-[0.99] text-white font-medium text-sm py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Request Quote</span>
              )}
            </button>
          </div>
        </form>
      </div>
      <ChartersContent />
    </div>
  );
};

export default MobileChartersSearchSection;