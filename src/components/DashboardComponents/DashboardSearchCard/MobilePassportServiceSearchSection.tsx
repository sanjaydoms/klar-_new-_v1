import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Search } from 'lucide-react';
import { PassportQuotePayload, submitPassportQuote } from '@/api/passportService.api';
import PassportContent from '@/components/Passport/PassportContent';

interface PassportFormData {
  service: 'New passport' | 'Renewal' | 'Reissue' | 'Police Clearance Certificate' | '';
  applicant: 'Adult' | 'Minor' | '';
  city: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
}

interface PassportErrors {
  service?: string;
  applicant?: string;
  city?: string;
  fullName?: string;
  mobileNumber?: string;
  emailId?: string;
}

interface MobilePassportServiceSearchSectionProps {
  source?: 'b2c';
  bannerImageUrl?: string; 
}

const MobilePassportServiceSearchSection: React.FC<MobilePassportServiceSearchSectionProps> = ({
  source = 'b2c',
  bannerImageUrl = '/images/passort_mobile_banner_img.jpg',
}) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<PassportFormData>({
    service: '',
    applicant: '',
    city: '',
    fullName: '',
    mobileNumber: '',
    emailId: '',
  });

  const [fieldErrors, setFieldErrors] = useState<PassportErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const location = useLocation();

  useEffect(() => {
    const storedPlan = sessionStorage.getItem('passportSelectedPlan');
    if (storedPlan) {
      try {
        const plan = JSON.parse(storedPlan) as { service: PassportFormData['service']; applicant: PassportFormData['applicant'] };
        setFormData((prev) => ({
          ...prev,
          service: plan.service,
          applicant: plan.applicant,
        }));
        setFieldErrors((prev) => ({ ...prev, service: '', applicant: '' }));
      } catch {
        // ignore invalid stored plan
      } finally {
        sessionStorage.removeItem('passportSelectedPlan');
      }
    }

    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [location.pathname, location.hash, location.key]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Clear field error as user types
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'mobileNumber') {
      const sanitized = value.replace(/\D/g, ''); // Digits only
      if (sanitized.length <= 10) {
        setFormData((prev) => ({ ...prev, mobileNumber: sanitized }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setErrorMsg('');
    setSuccessMsg('');
  };

  const validateForm = (): boolean => {
    const errors: PassportErrors = {};

    if (!formData.service) {
      errors.service = 'Please select a service type';
    }
    if (!formData.applicant) {
      errors.applicant = 'Please select an applicant type';
    }
    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = 'Please enter a valid city name';
    }
    if (!formData.fullName.trim() || formData.fullName.trim().length < 3) {
      errors.fullName = 'Please enter your full name';
    }

    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailId.trim())) {
      errors.emailId = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload: PassportQuotePayload = {
        source,
        service: formData.service as PassportQuotePayload['service'],
        applicant: formData.applicant as PassportQuotePayload['applicant'],
        city: formData.city.trim(),
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId.trim().toLowerCase(),
      };

      const response = await submitPassportQuote(payload);

      if (response?.success) {
        setSuccessMsg('Quote request submitted successfully!');
        setFormData({
          service: '',
          applicant: '',
          city: '',
          fullName: '',
          mobileNumber: '',
          emailId: '',
        });
        setFieldErrors({});
      }
    } catch (err: any) {
      if (err.response?.data?.errors?.length) {
        setErrorMsg(err.response.data.errors[0].message);
      } else {
        setErrorMsg(err.response?.data?.message || 'Failed to submit quote request.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-50 min-h-screen flex flex-col pb-8">
      {/* 1. TOP HERO BANNER (Image 2 style) */}
      <div 
        className="relative w-full h-64 bg-cover bg-center flex flex-col justify-between p-4 text-white"
        style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.7)), url(${bannerImageUrl})` }}
      >
        {/* Top Navbar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-serif font-semibold tracking-wide text-white drop-shadow-sm">
            Passport Services
          </h2>
          <div className="w-10" /> {/* Spacer for visual center alignment */}
        </div>

        {/* Hero Title and Subheading */}
        <div className="mb-6 px-2">
          <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight mb-1 text-white">
            Where will your next story begin?
          </h1>
          <p className="text-xs sm:text-sm text-gray-200 font-sans font-light leading-snug">
            Hassle-free assistance for new passports, renewals, and expedited processing.
          </p>
        </div>
      </div>

      {/* 2. FORM CARD OVERLAY (Image 1 style) */}
      <div className="-mt-6 px-4 z-10 w-full" id="passport-form">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-[#FCF8F7] border border-[#D4AF37]/60 rounded-2xl p-5 shadow-lg flex flex-col gap-4 text-left"
        >
          {/* Service Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              Service
            </label>
            <div className="relative">
              <select
                name="service"
                value={formData.service}
                onChange={handleChange}
                className={`w-full h-11 px-3.5 bg-white border ${
                  fieldErrors.service ? 'border-red-500' : 'border-gray-200'
                } rounded-xl text-gray-700 font-sans text-sm focus:outline-none focus:border-[#7F0909] appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  Select Service
                </option>
                <option value="New passport">New passport</option>
                <option value="Renewal">Renewal</option>
                <option value="Reissue">Reissue</option>
                <option value="Police Clearance Certificate">Police Clearance Certificate</option>
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {fieldErrors.service && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.service}</span>
              </div>
            )}
          </div>

          {/* Applicant Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              Applicant
            </label>
            <div className="relative">
              <select
                name="applicant"
                value={formData.applicant}
                onChange={handleChange}
                className={`w-full h-11 px-3.5 bg-white border ${
                  fieldErrors.applicant ? 'border-red-500' : 'border-gray-200'
                } rounded-xl text-gray-700 font-sans text-sm focus:outline-none focus:border-[#7F0909] appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  Select Applicant
                </option>
                <option value="Adult">Adult</option>
                <option value="Minor">Minor</option>
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {fieldErrors.applicant && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.applicant}</span>
              </div>
            )}
          </div>

          {/* City Input */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              City
            </label>
            <input
              type="text"
              name="city"
              placeholder="Mumbai"
              value={formData.city}
              onChange={handleChange}
              className={`w-full h-11 px-3.5 bg-white border ${
                fieldErrors.city ? 'border-red-500' : 'border-gray-200'
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-none focus:border-[#7F0909]`}
            />
            {fieldErrors.city && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.city}</span>
              </div>
            )}
          </div>

          {/* Full Name Input */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full h-11 px-3.5 bg-white border ${
                fieldErrors.fullName ? 'border-red-500' : 'border-gray-200'
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-none focus:border-[#7F0909]`}
            />
            {fieldErrors.fullName && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.fullName}</span>
              </div>
            )}
          </div>

          {/* Mobile Number Input */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobileNumber"
              placeholder="Mobile Number"
              value={formData.mobileNumber}
              onChange={handleChange}
              maxLength={10}
              className={`w-full h-11 px-3.5 bg-white border ${
                fieldErrors.mobileNumber ? 'border-red-500' : 'border-gray-200'
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-none focus:border-[#7F0909]`}
            />
            {fieldErrors.mobileNumber && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.mobileNumber}</span>
              </div>
            )}
          </div>

          {/* Email ID Input */}
          <div className="flex flex-col gap-1">
            <label className="font-serif text-gray-900 text-sm font-bold pl-1">
              E-mail
            </label>
            <input
              type="email"
              name="emailId"
              placeholder="E-mail"
              value={formData.emailId}
              onChange={handleChange}
              className={`w-full h-11 px-3.5 bg-white border ${
                fieldErrors.emailId ? 'border-red-500' : 'border-gray-200'
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-none focus:border-[#7F0909]`}
            />
            {fieldErrors.emailId && (
              <div className="flex items-center gap-1 text-red-600 mt-1 text-xs font-medium pl-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{fieldErrors.emailId}</span>
              </div>
            )}
          </div>

          {/* Global Messages */}
          {errorMsg && (
            <p className="text-red-600 text-xs font-medium text-center mt-1">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-green-700 text-xs font-medium text-center mt-1">{successMsg}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            style={{ backgroundColor: '#4A0000', color: '#ffffff' }}
            className="w-full mt-3 h-12 flex items-center justify-center gap-2 font-sans font-semibold text-sm rounded-xl transition-all duration-200 shadow-md active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            <Search className="w-4 h-4 text-white" />
            <span>{loading ? 'Submitting...' : 'Check plans'}</span>
          </button>
        </form>
      </div>
      <PassportContent 
  onSelectPlan={(selectedPlan) => {
    setFormData((prev) => ({
      ...prev,
      service: selectedPlan.service,
      applicant: selectedPlan.applicant,
    }));
    setFieldErrors((prev) => ({ ...prev, service: '', applicant: '' }));
  }} 
      />
    </div>
  );
};

export default MobilePassportServiceSearchSection;