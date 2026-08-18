import { PassportQuotePayload, submitPassportQuote } from "@/api/passportService.api";
import React, { useState, useEffect } from "react";
import { useLocation } from 'react-router-dom';
import type { SelectedPlanPayload } from '@/components/Passport/PassportPlans';

interface PassportFormData {
  service: "New passport" | "Renewal" | "Reissue" | "Police Clearance Certificate" | "";
  applicant: "Adult" | "Minor" | "";
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

interface PassportServiceSearchSectionProps {
  source?: "b2c";
  selectedPlan?: SelectedPlanPayload | undefined;
}

const PassportServiceSearchSection: React.FC<PassportServiceSearchSectionProps> = ({
  source = "b2c",
  selectedPlan,
}) => {
  const location = useLocation();
  const [formData, setFormData] = useState<PassportFormData>({
    service: "",
    applicant: "",
    city: "",
    fullName: "",
    mobileNumber: "",
    emailId: "",
  });

  const [fieldErrors, setFieldErrors] = useState<PassportErrors>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  useEffect(() => {
    if (selectedPlan) {
      setFormData((prev) => ({
        ...prev,
        service: selectedPlan.service,
        applicant: selectedPlan.applicant,
      }));
      setFieldErrors((prev) => ({ ...prev, service: '', applicant: '' }));
      return;
    }

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
  }, [location.pathname, location.hash, location.key, selectedPlan]);

  const handlePlanSelection = (selected: {
  service: "New passport" | "Renewal" | "Reissue" | "Police Clearance Certificate";
  applicant: "Adult" | "Minor";
}) => {
  setFormData((prev) => ({
    ...prev,
    service: selected.service,
    applicant: selected.applicant,
  }));
  setFieldErrors((prev) => ({ ...prev, service: "", applicant: "" }));
};

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Clear specific field error when user types
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));

    // Mobile Number specific formatting: numeric only & max 10 digits
    if (name === "mobileNumber") {
      const sanitized = value.replace(/\D/g, ""); // Keep only digits
      if (sanitized.length <= 10) {
        setFormData((prev) => ({ ...prev, mobileNumber: sanitized }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    setErrorMsg("");
    setSuccessMsg("");
  };

  // Client-side Validation Handler
  const validateForm = (): boolean => {
    const errors: PassportErrors = {};

    if (!formData.service) {
      errors.service = "Please select a service type";
    }
    if (!formData.applicant) {
      errors.applicant = "Please select an applicant type";
    }
    if (!formData.city.trim() || formData.city.trim().length < 2) {
      errors.city = "Please enter a valid city (at least 2 characters)";
    }
    if (!formData.fullName.trim() || formData.fullName.trim().length < 3) {
      errors.fullName = "Please enter full name (at least 3 characters)";
    }

    // Mobile Validation (10 digits starting with 6, 7, 8, or 9)
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(formData.mobileNumber)) {
      errors.mobileNumber = "Please enter a valid 10-digit mobile number";
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailId.trim())) {
      errors.emailId = "Please enter a valid email address";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    // Run Frontend Validation
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: PassportQuotePayload = {
        source,
        service: formData.service as PassportQuotePayload["service"],
        applicant: formData.applicant as PassportQuotePayload["applicant"],
        city: formData.city.trim(),
        fullName: formData.fullName.trim(),
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId.trim().toLowerCase(),
      };

      const response = await submitPassportQuote(payload);

      if (response?.success) {
        setSuccessMsg("Quote request submitted successfully!");
        setFormData({
          service: "",
          applicant: "",
          city: "",
          fullName: "",
          mobileNumber: "",
          emailId: "",
        });
        setFieldErrors({});
      }
    } catch (err: any) {
      if (err.response?.data?.errors?.length) {
        setErrorMsg(err.response.data.errors[0].message);
      } else {
        setErrorMsg(
          err.response?.data?.message || "Failed to submit quote request."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="passport-search" className="w-full bg-[#FCF8F7] border border-[#D4AF37] rounded-2xl p-6 md:p-8 shadow-xs my-2">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col items-center gap-6">
        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5 w-full">
          {/* Services Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              Services
            </label>
            <div className="relative">
              <select
                name="service"
                value={formData.service}
                onChange={handleChange}
                className={`w-full h-12 px-4 bg-white border ${
                  fieldErrors.service ? "border-red-500" : "border-[#D3E2F2]"
                } rounded-xl text-gray-700 font-sans text-sm focus:outline-hidden focus:border-[#7F0909] appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  Select Service
                </option>
                <option value="New passport">New passport</option>
                <option value="Renewal">Renewal</option>
                <option value="Reissue">Reissue</option>
                <option value="Police Clearance Certificate">
                  Police Clearance Certificate
                </option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {fieldErrors.service && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.service}</p>
            )}
          </div>

          {/* Applicant Dropdown */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              Applicant
            </label>
            <div className="relative">
              <select
                name="applicant"
                value={formData.applicant}
                onChange={handleChange}
                className={`w-full h-12 px-4 bg-white border ${
                  fieldErrors.applicant ? "border-red-500" : "border-[#D3E2F2]"
                } rounded-xl text-gray-700 font-sans text-sm focus:outline-hidden focus:border-[#7F0909] appearance-none cursor-pointer`}
              >
                <option value="" disabled>
                  Select Applicant
                </option>
                <option value="Adult">Adult</option>
                <option value="Minor">Minor</option>
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-gray-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
            {fieldErrors.applicant && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.applicant}</p>
            )}
          </div>

          {/* City Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              City
            </label>
            <input
              type="text"
              name="city"
              placeholder="Mumbai"
              value={formData.city}
              onChange={handleChange}
              className={`w-full h-12 px-4 bg-white border ${
                fieldErrors.city ? "border-red-500" : "border-[#D3E2F2]"
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-hidden focus:border-[#7F0909]`}
            />
            {fieldErrors.city && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.city}</p>
            )}
          </div>

          {/* Full Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full h-12 px-4 bg-white border ${
                fieldErrors.fullName ? "border-red-500" : "border-[#D3E2F2]"
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-hidden focus:border-[#7F0909]`}
            />
            {fieldErrors.fullName && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Mobile Number Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              Mobile Number
            </label>
            <input
              type="tel"
              name="mobileNumber"
              placeholder="Mobile Number"
              value={formData.mobileNumber}
              onChange={handleChange}
              maxLength={10}
              className={`w-full h-12 px-4 bg-white border ${
                fieldErrors.mobileNumber ? "border-red-500" : "border-[#D3E2F2]"
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-hidden focus:border-[#7F0909]`}
            />
            {fieldErrors.mobileNumber && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.mobileNumber}</p>
            )}
          </div>

          {/* Email ID Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-serif text-gray-800 text-sm font-semibold pl-1">
              Email ID
            </label>
            <input
              type="email"
              name="emailId"
              placeholder="Email ID"
              value={formData.emailId}
              onChange={handleChange}
              className={`w-full h-12 px-4 bg-white border ${
                fieldErrors.emailId ? "border-red-500" : "border-[#D3E2F2]"
              } rounded-xl text-gray-700 font-sans text-sm placeholder-gray-400 focus:outline-hidden focus:border-[#7F0909]`}
            />
            {fieldErrors.emailId && (
              <p className="text-red-600 text-xs pl-1 font-medium">{fieldErrors.emailId}</p>
            )}
          </div>
        </div>

        {/* Global Feedback Messages */}
        {errorMsg && (
          <p className="text-red-600 text-sm font-medium">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-green-700 text-sm font-medium">{successMsg}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 px-8 py-3.5 bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 text-white font-sans font-medium text-sm rounded-xl shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors duration-200 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {loading ? "Submitting..." : "Request Quote"}
        </button>
      </form>
    </div>
  );
};

export default PassportServiceSearchSection;