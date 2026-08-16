import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Users,
  FileText,
  Pencil,
  ArrowRight,
  Plane,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import ToursAndPackagesNavbar from './ToursAndPackagesNavbar';
import { submitTourQuery } from '@/api/tourApi.service';

export default function ToursContactForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialDestinationType =
    searchParams.get('destinationType') ||
    JSON.parse(sessionStorage.getItem('toursSearchParams') || '{}')?.destinationType ||
    'Domestic';

  const initialDestinationName = searchParams.get('destinationName') || '';

  // Form State
  const [formData, setFormData] = useState({
    destinationType: initialDestinationType,
    fullName: '',
    contactNumber: '',
    email: '',
    destinationName: initialDestinationName,
    travelDate: '',
    numberOfTravellers: '',
    specialRequirements: '',
    source: 'B2C', 
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEditingDestination, setIsEditingDestination] = useState(false);

  useEffect(() => {
    const typeFromUrl = searchParams.get('destinationType');
    const nameFromUrl = searchParams.get('destinationName');

    setFormData((prev) => ({
      ...prev,
      ...(typeFromUrl && { destinationType: typeFromUrl }),
      ...(nameFromUrl && { destinationName: nameFromUrl }),
    }));
  }, [searchParams]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // 1. Restrict contact number to numbers only & max 10 digits
    if (name === 'contactNumber') {
      formattedValue = value.replace(/\D/g, '').slice(0, 10);
    }

    // 2. Force email input to lower case automatically
    if (name === 'email') {
      formattedValue = value.toLowerCase();
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Form validation handler
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required';
    }
    if (!formData.contactNumber.trim()) {
      newErrors.contactNumber = 'Contact Number is required';
    } else if (!/^[0-9]{10,15}$/.test(formData.contactNumber.trim())) {
      newErrors.contactNumber = 'Enter a valid contact number (10-15 digits)';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.destinationName.trim()) {
      newErrors.destinationName = 'Destination Name is required';
    }
    if (!formData.travelDate) {
      newErrors.travelDate = 'Travel Date is required';
    }
    if (!formData.numberOfTravellers) {
      newErrors.numberOfTravellers = 'Number of Travellers is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        destinationType: formData.destinationType.toLowerCase().includes('domestic')
          ? 'Domestic Travel'
          : 'International Travel',
        numberOfTravellers: Number(formData.numberOfTravellers),
        source: 'B2C',
      };

      const data = await submitTourQuery(payload);

      if (data && data.success) {
        navigate('/tours-booking-success');
      } else {
        navigate('/tours-booking-failed');
      }
    } catch (error: any) {
      console.error('Submit Error:', error);
      navigate('/tours-booking-failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const isDomestic = formData.destinationType.toLowerCase().includes('domestic');

  return (
<div className="w-full min-h-screen bg-[#F8FAFC] pb-28 sm:pb-8 font-sans text-[#0F172A]">
    <header className="w-full bg-white border-b border-gray-100 shadow-xs mb-6 sm:mb-10 px-4 sm:px-8 py-3">
        <div className="w-full max-w-[1400px] mx-auto">
          <ToursAndPackagesNavbar />
        </div>
      </header>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6">
        <div className="w-full bg-white rounded-[28px] sm:rounded-[36px] shadow-xl border border-gray-100 p-6 sm:p-12 md:p-14 relative overflow-hidden">
          <div className="text-center relative mb-10 sm:mb-12">
            <div className="hidden sm:block absolute -top-2 right-4 text-gray-300">
              <Plane className="w-9 h-9 text-gray-300 transform rotate-45" />
            </div>

            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="h-[2px] w-10 bg-gray-300 rounded-full inline-block" />
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-[#0F172A]">
                Let's Plan Your <span className="text-[#8B1D1D]">Perfect Journey</span>
              </h1>
              <span className="h-[2px] w-10 bg-gray-300 rounded-full inline-block" />
            </div>
            <p className="text-sm sm:text-base text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              Share your details and our travel expert will get in touch with you to craft the best
              experience.
            </p>
          </div>

          {/* <div
            className={`w-full rounded-2xl p-5 sm:p-6 mb-10 border transition-all ${
              isDomestic ? 'bg-[#FEF2F2] border-[#FEE2E2]' : 'bg-[#EFF6FF] border-[#DBEAFE]'
            }`}
          >
            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase block mb-3">
              Selected Destination Type
            </span>

            <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
                    isDomestic ? 'bg-[#FEF2F2]' : 'bg-[#EFF6FF]'
                  }`}
                >
                  <img
                    src={
                      isDomestic ? '/logo/tours_tajmahal_icon.png' : '/logo/tours_global_icon.png'
                    }
                    alt="Destination Icon"
                    className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>

                <span className="text-lg sm:text-xl font-extrabold text-[#0F172A]">
                  {isDomestic ? 'Domestic Travel' : 'International Travel'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isDomestic ? 'text-red-700 hover:bg-red-50' : 'text-blue-700 hover:bg-blue-50'
                }`}
                title="Change Destination Type"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
          </div> */}
          {/* Selected Destination Type Card with Inline Edit Mode */}
<div
  className={`w-full rounded-2xl p-5 sm:p-6 mb-10 border transition-all ${
    isDomestic ? 'bg-[#FEF2F2] border-[#FEE2E2]' : 'bg-[#EFF6FF] border-[#DBEAFE]'
  }`}
>
  <span className="text-xs font-bold tracking-wider text-gray-500 uppercase block mb-3">
    Selected Destination Type
  </span>

  {isEditingDestination ? (
    /* Inline Destination Selector */
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Domestic Button */}
      <button
        type="button"
        onClick={() => {
          setFormData((prev) => ({ ...prev, destinationType: 'Domestic Travel' }));
          setIsEditingDestination(false);
        }}
        className={`flex items-center gap-3 p-3.5 rounded-xl border bg-white cursor-pointer transition-all ${
          isDomestic
            ? 'border-[#8B1D1D] ring-2 ring-[#8B1D1D]/20 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#FEF2F2] flex items-center justify-center shrink-0">
          <img
            src="/logo/tours_tajmahal_icon.png"
            alt="Domestic"
            className="w-5 h-5 object-contain"
          />
        </div>
        <span className="text-base font-bold text-[#0F172A]">Domestic Travel</span>
      </button>

      {/* International Button */}
      <button
        type="button"
        onClick={() => {
          setFormData((prev) => ({ ...prev, destinationType: 'International Travel' }));
          setIsEditingDestination(false);
        }}
        className={`flex items-center gap-3 p-3.5 rounded-xl border bg-white cursor-pointer transition-all ${
          !isDomestic
            ? 'border-[#1E293B] ring-2 ring-[#1E293B]/20 shadow-sm'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <div className="w-10 h-10 rounded-full bg-[#EFF6FF] flex items-center justify-center shrink-0">
          <img
            src="/logo/tours_global_icon.png"
            alt="International"
            className="w-5 h-5 object-contain"
          />
        </div>
        <span className="text-base font-bold text-[#0F172A]">International Travel</span>
      </button>
    </div>
  ) : (
    /* Selected Destination Display Badge */
<div className="bg-white border border-gray-100 rounded-2xl p-3 sm:p-5 flex items-center justify-between shadow-xs">
  <div className="flex items-center gap-2 sm:gap-4 min-w-0 overflow-hidden">
    
    {/* 1. HIDE ICON ON MOBILE: Added 'hidden sm:flex' */}
    <div
      className={`hidden sm:flex w-12 h-12 sm:w-14 sm:h-14 rounded-full items-center justify-center shrink-0 ${
        isDomestic ? 'bg-[#FEF2F2]' : 'bg-[#EFF6FF]'
      }`}
    >
      <img
        src={
          isDomestic ? '/logo/tours_tajmahal_icon.png' : '/logo/tours_global_icon.png'
        }
        alt="Destination Icon"
        className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>

    {/* 2. SINGLE LINE TEXT: Added 'whitespace-nowrap' and responsive text scaling */}
    <span className="text-base sm:text-xl font-extrabold text-[#0F172A] whitespace-nowrap truncate">
      {isDomestic ? 'Domestic Travel' : 'International Travel'}
    </span>
  </div>

  {/* Pencil Edit Button */}
  <button
    type="button"
    onClick={() => setIsEditingDestination(true)}
    className={`p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer shrink-0 ml-2 ${
      isDomestic ? 'text-red-700 hover:bg-red-50' : 'text-blue-700 hover:bg-blue-50'
    }`}
    title="Edit Destination Type"
  >
    <Pencil className="w-4 h-4 sm:w-5 sm:h-5" />
  </button>
</div>
  )}
</div>

          {/* Success Banner Notification */}
          {submitSuccess && (
            <div className="mb-8 p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-base font-medium animate-fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <span>
                Thank you! Your travel query has been submitted successfully. Our team will contact
                you shortly.
              </span>
            </div>
          )}

          {/* Form Inputs */}
          <form onSubmit={handleSubmit} className="space-y-7">
            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                <User className="w-4 h-4 text-red-800 shrink-0" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium placeholder-gray-400 focus:outline-none transition-all ${
                  errors.fullName
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                    : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                }`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.fullName}</span>
                </p>
              )}
            </div>

            {/* Contact Number & Email Address (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Contact Number */}
              <div>
                <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                  <Phone className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Contact Number</span>
                </label>
                <input
                  type="tel"
                  name="contactNumber"
                  maxLength={10}
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="Enter your contact number"
                  className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium placeholder-gray-400 focus:outline-none transition-all ${
                    errors.contactNumber
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                  }`}
                />
                {errors.contactNumber && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.contactNumber}</span>
                  </p>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                  <Mail className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium placeholder-gray-400 focus:outline-none transition-all ${
                    errors.email
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                  }`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.email}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Destination Name */}
            <div>
              <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                <MapPin className="w-4 h-4 text-red-800 shrink-0" />
                <span>Destination Name</span>
              </label>
              <input
                type="text"
                name="destinationName"
                value={formData.destinationName}
                onChange={handleChange}
                placeholder="Enter your destination"
                className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium placeholder-gray-400 focus:outline-none transition-all ${
                  errors.destinationName
                    ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                    : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                }`}
              />
              {errors.destinationName && (
                <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errors.destinationName}</span>
                </p>
              )}
            </div>

            {/* Travel Date & Number of Travellers (2 Columns) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              {/* Travel Date */}
              <div>
                <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                  <Calendar className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Travel Date</span>
                </label>
                <input
                  type="date"
                  name="travelDate"
                  min={getTodayDate()}
                  value={formData.travelDate}
                  onChange={handleChange}
                  className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium focus:outline-none transition-all appearance-none cursor-pointer ${
                    errors.travelDate
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                  }`}
                />
                {errors.travelDate && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.travelDate}</span>
                  </p>
                )}
              </div>

              {/* Number of Travellers */}
              <div>
                <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                  <Users className="w-4 h-4 text-red-800 shrink-0" />
                  <span>Number of Travellers</span>
                </label>
                <select
                  name="numberOfTravellers"
                  value={formData.numberOfTravellers}
                  onChange={handleChange}
                  className={`w-full h-13 sm:h-14 px-4 sm:px-5 rounded-2xl border bg-white text-base font-medium focus:outline-none transition-all appearance-none cursor-pointer ${
                    errors.numberOfTravellers
                      ? 'border-red-500 focus:ring-2 focus:ring-red-500'
                      : 'border-gray-200 focus:border-red-800 focus:ring-2 focus:ring-red-800/20'
                  }`}
                >
                  <option value="" disabled>
                    Enter number of travellers
                  </option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'Traveller' : 'Travellers'}
                    </option>
                  ))}
                </select>
                {errors.numberOfTravellers && (
                  <p className="text-red-500 text-xs sm:text-sm mt-2 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errors.numberOfTravellers}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Special Requirements (Optional) */}
            <div>
              <label className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-800 mb-2.5 tracking-wide">
                <FileText className="w-4 h-4 text-red-800 shrink-0" />
                <span>Special Requirements (Optional)</span>
              </label>
              <textarea
                name="specialRequirements"
                rows={4}
                value={formData.specialRequirements}
                onChange={handleChange}
                placeholder="Enter any special requirements or preferences"
                className="w-full p-4 sm:p-5 rounded-2xl border border-gray-200 bg-white text-base font-medium placeholder-gray-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 bg-[#1A2342] hover:bg-[#12182E] active:scale-[0.99] text-white font-bold text-base sm:text-lg rounded-2xl transition-all shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Submitting Query...</span>
                  </>
                ) : (
                  <>
                    <span>Send Query</span>
                    <ArrowRight className="w-5 h-5 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
