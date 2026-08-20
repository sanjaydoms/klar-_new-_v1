import React, { useState, useRef, useEffect } from 'react';
import {
  Ship,
  CalendarDays,
  Moon,
  ChevronDown,
  CheckCircle2,
  X,
  ShieldCheck,
} from 'lucide-react';
import { submitCruiseEnquiry } from '../../../api/cruiseService.api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NIGHT_OPTIONS = [2, 3, 4, 5, 6, 7, 10, 14];

interface CruiseFormData {
  departurePort: string;
  sailMonth: string; // stored as "YYYY-MM"
  nights: string;
  fullName: string;
  mobileNumber: string;
  emailId: string;
  source: string;
}

const initialFormData: CruiseFormData = {
  departurePort: '',
  sailMonth: '',
  nights: '',
  fullName: '',
  mobileNumber: '',
  emailId: '',
  source:'b2c'
};

/** Closes a popover when clicking outside the given ref's element. */
function useClickOutside(ref: React.RefObject<HTMLElement>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside]);
}

/** Custom month/year picker replacing the native <input type="month"> */
const SailMonthPicker = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(value ? Number(value.split('-')[0]) : now.getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  const [selectedYear, selectedMonthIdx] = value
    ? [Number(value.split('-')[0]), Number(value.split('-')[1]) - 1]
    : [null, null];

  const displayLabel = value
    ? `${MONTHS[selectedMonthIdx as number]} ${selectedYear}`
    : 'Sail Month';

  const pickMonth = (monthIdx: number) => {
    const mm = String(monthIdx + 1).padStart(2, '0');
    onChange(`${year}-${mm}`);
    setOpen(false);
  };

  const pickThisMonth = () => {
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    setYear(now.getFullYear());
    onChange(`${now.getFullYear()}-${mm}`);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 bg-white border border-1 rounded-xl px-4 py-3 text-left"
      >
        <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
        <span
          className={`text-sm font-medium flex-1 truncate ${
            value ? 'text-[#1B2559]' : 'text-gray-400'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-lg p-4">
          {/* Year selector */}
          <div className="flex items-center justify-between bg-[#F4F1EA] rounded-full px-3 py-2 mb-3">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              aria-label="Previous year"
              className="text-gray-500 hover:text-[#1B2559] px-2"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-[#1B2559]">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              aria-label="Next year"
              className="text-gray-500 hover:text-[#1B2559] px-2"
            >
              ›
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {MONTHS.map((m, idx) => {
              const isSelected = selectedYear === year && selectedMonthIdx === idx;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => pickMonth(idx)}
                  className={`text-sm py-2 rounded-lg font-medium transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#7A1626] text-white'
                      : 'text-[#1B2559] hover:bg-[#F4F1EA]'
                  }`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="text-sm font-medium text-[#7A1626] hover:underline"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={pickThisMonth}
              className="text-sm font-medium text-[#7A1626] hover:underline"
            >
              This month
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/** Custom "Select Nights" dropdown replacing the native <select> */
const NightsDropdown = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  const displayLabel = value ? `${value} Nights` : 'Select Nights';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 bg-white border border-1 rounded-xl px-4 py-3 text-left"
      >
        <Moon className="w-4 h-4 text-gray-400 shrink-0" />
        <span
          className={`text-sm font-medium flex-1 truncate ${
            value ? 'text-[#1B2559]' : 'text-gray-400'
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full min-w-[180px] bg-white rounded-2xl border border-gray-200 shadow-lg py-2 max-h-64 overflow-y-auto">
          {NIGHT_OPTIONS.map((n) => {
            const isSelected = value === String(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  onChange(String(n));
                  setOpen(false);
                }}
                className={`w-full text-left border border-1 px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#7A1626] text-white'
                    : 'text-[#1B2559] hover:bg-[#F4F1EA]'
                }`}
              >
                {n} Nights
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CruiseSearchSection = () => {

  const [formData, setFormData] = useState<CruiseFormData>(initialFormData);
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field: keyof CruiseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const handleDestinationSelected = (e: any) => {
      handleChange('departurePort', e.detail);
    };
    
    window.addEventListener('cruiseDestinationSelected', handleDestinationSelected);
    return () => window.removeEventListener('cruiseDestinationSelected', handleDestinationSelected);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await submitCruiseEnquiry(formData);
      setShowToast(true);
      setFormData(initialFormData);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to submit enquiry. Please try again.';
      setErrorMsg(msg);
      console.error('Cruise enquiry submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="relative w-full  bg-cover bg-center"
    >
      <div className="max-w-4xl mx-auto flex flex-col items-center">


        {/* Search / enquiry card */}
        <div className="w-full  bg-[#FDF5F5] rounded-3xl border border-[#E7D48C] shadow-[0px_3.66px_3.66px_0px_#00000040] px-6 sm:px-10 py-8 overflow-visible">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Row 1: Departure Port / Sail Month / Select Nights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 border border-1 bg-white rounded-xl px-4 py-3">
                <Ship className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Departure Port"
                  value={formData.departurePort}
                  onChange={(e) => handleChange('departurePort', e.target.value)}
                  required
                  className="bg-transparent w-full text-sm font-medium  text-[#1B2559] placeholder:text-gray-400 placeholder:font-medium outline-none"
                />
              </div>

              <SailMonthPicker
                value={formData.sailMonth}
                onChange={(v) => handleChange('sailMonth', v)}
              />

              <NightsDropdown
                value={formData.nights}
                onChange={(v) => handleChange('nights', v)}
              />
            </div>

            {/* Row 2: Full Name / Mobile Number / Email ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                required
                className="bg-white border border-1 rounded-xl px-4 py-3 text-sm font-medium text-[#1B2559] placeholder:text-gray-400 placeholder:font-medium outline-none"
              />
              <input
                type="tel"
                placeholder="Mobile Number"
                value={formData.mobileNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  handleChange('mobileNumber', val);
                }}
                required
                pattern="[0-9]{10}"
                maxLength={10}
                className="bg-white border border-1 rounded-xl px-4 py-3 text-sm font-medium text-[#1B2559] placeholder:text-gray-400 placeholder:font-medium outline-none"
              />
              <input
                type="email"
                placeholder="Email ID"
                value={formData.emailId}
                onChange={(e) => handleChange('emailId', e.target.value)}
                required
                className="bg-white border border-1 rounded-xl px-4 py-3 text-sm font-medium text-[#1B2559] placeholder:text-gray-400 placeholder:font-medium outline-none"
              />
            </div>

            {/* Submit button */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                className="bg-[var(--color-brand-red)] cursor-pointer hover:bg-[var(--color-brand-red)]/90 shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] transition-colors duration-200 text-white text-sm font-semibold px-8 py-3 rounded-full"
              >
                Enquiry Now
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success toast */}
      {showToast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#D9EFE0] border border-[#BFE3CC] text-[#1B2559] px-5 py-3 rounded-lg shadow-md lg:bottom-[-65px]">
          <ShieldCheck className="w-8 h-8 text-white  shrink-0" strokeWidth={2} fill="#1E8A4C" />
          <span className="text-sm font-medium">
            Thank you for the inquiry! We will get back to you shortly.
          </span>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            aria-label="Dismiss"
            className="ml-2 text-[#1B2559] hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </section>
  );
};

export default CruiseSearchSection;