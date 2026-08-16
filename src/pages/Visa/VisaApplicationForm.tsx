import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, HelpCircle, Check } from 'lucide-react';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import Footer from '@/components/layout/Footer';
import VisaProcessStepper from '../../components/Visa/VisaProcessStepper';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { submitVisaApplicationForm } from '@/api/visaService.api';
import { notifyError } from '@/utils/notify';
// import { submitVisaApplicationForm } from '@/api/visaApiService';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  mobileNumber: string;
  email: string;
  destinationCountry: string;
  travelDate: string;
  purpose: string;
  currentCity?: string;
  country?: string;
  numAdults?: string;
  numChildren?: string;
  employmentStatus?: string;
  travelHistory?: string;
  holdValidPassports?: string;
  previousRefusals?: string;
  companyName?: string;
  designation?: string;
  businessEmail?: string;
  invitationLetter?: string;
  previousTravelHistory?: string;
  visaSubtype?: string;
  intakeDate?: string;
  admissionLetterAvailable?: string;
  sponsorDetails?: string;
}

type Step = 1 | 2 | 3 | 4;

// ─── LOCAL STORAGE HELPERS ──────────────────────────────────────────────────

const STORAGE_KEY = 'visa_draft';

const saveDraft = (data: any) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {

  }
};

const loadDraft = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {

    return null;
  }
};

const clearDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {

  }
};

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────

// Convert DD/MM/YYYY to YYYY-MM-DD for storage
const formatToStorageDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return dateStr;
};

// Convert YYYY-MM-DD to DD/MM/YYYY for display
const formatToDisplayDate = (dateStr: string): string => {
  if (!dateStr) return '';
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${day}/${month}/${year}`;
    }
  }
  
  return dateStr;
};

// Validate DD/MM/YYYY format
const isValidDDMMYYYY = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(regex);
  if (!match) return false;
  
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  
  if (month < 1 || month > 12) return false;
  
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day < 1 || day > daysInMonth) return false;
  
  return true;
};

// ─── Date Input Field Component (With Calendar Picker) ─────────────────────

const DateInputField = ({
  label,
  value,
  onChange,
  required,
  placeholder = 'DD/MM/YYYY',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const formatted = formatToDisplayDate(value);
      setDisplayValue(formatted);
    } else {
      setDisplayValue('');
    }
  }, [value]);

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value; // YYYY-MM-DD
    if (selectedDate) {
      const parts = selectedDate.split('-');
      const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      setDisplayValue(displayDate);
      setError('');
      onChange(selectedDate);
      setShowPicker(false);
    }
  };

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);
    setError('');

    let cleaned = inputValue.replace(/[^0-9]/g, '');
    
    if (cleaned.length > 8) {
      cleaned = cleaned.slice(0, 8);
    }
    
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    
    setDisplayValue(formatted);
    
    if (formatted.length === 10) {
      if (isValidDDMMYYYY(formatted)) {
        const parts = formatted.split('/');
        const yyyymmdd = `${parts[2]}-${parts[1]}-${parts[0]}`;
        onChange(yyyymmdd);
        setError('');
      } else {
        setError('Invalid date. Use DD/MM/YYYY');
        onChange('');
      }
    } else {
      if (formatted.length === 0) {
        onChange('');
      }
    }
  };

  const togglePicker = () => {
    setShowPicker(!showPicker);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const getPickerValue = (): string => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    return value;
  };

  return (
    <div className="relative" ref={inputRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={handleManualChange}
          onFocus={() => setShowPicker(true)}
          placeholder={placeholder}
          maxLength={10}
          className={`w-full px-4 py-3 bg-[#F7F8FA] border ${error ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B] transition-all text-sm text-gray-800 placeholder:text-gray-400 cursor-pointer`}
        />
        <button
          type="button"
          onClick={togglePicker}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
      
      {showPicker && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
          <input
            type="date"
            value={getPickerValue()}
            onChange={handleDateSelect}
            min={today}
            className="p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B]"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => setShowPicker(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      <p className="text-gray-400 text-xs mt-1">Format: DD/MM/YYYY</p>
    </div>
  );
};

// ─── Shared UI Components ────────────────────────────────────────────────────

const InputField = ({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  required,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full px-4 py-3 bg-[#F7F8FA] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B] transition-all text-sm text-gray-800 placeholder:text-gray-400 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      }`}
    />
  </div>
);

const RadioGroup = ({
  label,
  name,
  options,
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-3">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="w-4 h-4 accent-[#1F2A6B]"
          />
          <span className="text-sm text-gray-700">{opt.label}</span>
        </label>
      ))}
    </div>
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={`w-full px-4 py-3 bg-[#F7F8FA] border border-gray-200 rounded-lg text-left text-sm flex items-center justify-between transition-all focus:outline-none focus:ring-2 focus:ring-[#1F2A6B]/20 focus:border-[#1F2A6B] ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400'}>
          {value || placeholder || 'Select…'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && !disabled && (
        <div className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Review Field ─────────────────────────────────────────────────────────────

const ReviewField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-gray-500 font-medium">{label}</span>
    <span className="text-sm text-gray-900 font-semibold">{value || 'Not provided'}</span>
  </div>
);

// ─── Step Content ─────────────────────────────────────────────────────────────

const Step1 = ({
  data,
  update,
  visaType,
}: {
  data: FormData;
  update: (field: keyof FormData, val: string) => void;
  visaType: string;
}) => {
  const isFamily =
    visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('group');
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');

  if (isBusiness) {
    return (
      <div className="space-y-5">
        <InputField
          label="Applicant Name"
          placeholder=""
          value={data.fullName}
          onChange={(v) => update('fullName', v)}
          required
        />
        <InputField
          label="Company Name"
          placeholder=""
          value={data.companyName || ''}
          onChange={(v) => update('companyName', v)}
          required
        />
        <InputField
          label="Designation"
          placeholder=""
          value={data.designation || ''}
          onChange={(v) => update('designation', v)}
          required
        />
        <InputField
          label="Business Email"
          placeholder=""
          type="email"
          value={data.businessEmail || ''}
          onChange={(v) => update('businessEmail', v)}
          required
        />
        <InputField
          label="Contact Number"
          placeholder=""
          type="tel"
          value={data.mobileNumber}
          onChange={(v) => update('mobileNumber', v)}
          required
        />
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="space-y-5">
        <InputField
          label="Full Name"
          placeholder=""
          value={data.fullName}
          onChange={(v) => update('fullName', v)}
          required
        />
        <InputField
          label="Contact Number"
          placeholder=""
          type="tel"
          value={data.mobileNumber}
          onChange={(v) => update('mobileNumber', v)}
          required
        />
        <InputField
          label="Email"
          placeholder=""
          type="email"
          value={data.email}
          onChange={(v) => update('email', v)}
          required
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <InputField
        label={isFamily ? 'Primary Applicant Name *' : 'Full Name (as per passport) *'}
        placeholder=""
        value={data.fullName}
        onChange={(v) => update('fullName', v)}
      />
      <InputField
        label="Contact Number *"
        placeholder=""
        type="tel"
        value={data.mobileNumber}
        onChange={(v) => update('mobileNumber', v)}
      />
      <InputField
        label="Email *"
        placeholder=""
        type="email"
        value={data.email}
        onChange={(v) => update('email', v)}
      />
      {!isFamily && (
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Current City"
            placeholder=""
            value={data.currentCity || ''}
            onChange={(v) => update('currentCity', v)}
            required
          />
          <InputField
            label="Country"
            placeholder=""
            value={data.country || ''}
            onChange={(v) => update('country', v)}
            required
          />
        </div>
      )}
    </div>
  );
};

const Step2 = ({
  data,
  update,
  visaType,
}: {
  data: FormData;
  update: (field: keyof FormData, val: string) => void;
  visaType: string;
}) => {
  const isFamily =
    visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('group');
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');

  if (isBusiness) {
    return (
      <div className="space-y-5">
        <InputField 
          label="Destination Country" 
          placeholder="" 
          value={data.destinationCountry} 
          onChange={(v) => update('destinationCountry', v)} 
          required 
          disabled={true}
        />
        <SelectField 
          label="Purpose" 
          value={data.purpose} 
          onChange={(v) => update('purpose', v)} 
          options={['Business', 'Meeting', 'Conference', 'Other']} 
          placeholder="Select purpose" 
          required 
        />
        <DateInputField 
          label="Travel Date" 
          value={data.travelDate} 
          onChange={(v) => update('travelDate', v)} 
          required 
        />
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="space-y-5">
        <InputField 
          label="Destination Country" 
          placeholder="" 
          value={data.destinationCountry} 
          onChange={(v) => update('destinationCountry', v)} 
          required 
          disabled={true}
        />
        <SelectField 
          label="Visa Type" 
          value={data.visaSubtype || ''} 
          onChange={(v) => update('visaSubtype', v)} 
          options={['Student Visa', 'Conference Visa', 'Short-term Study']} 
          placeholder="Select visa type" 
          required 
        />
        <DateInputField 
          label="Intake / Event Date" 
          value={data.intakeDate || ''} 
          onChange={(v) => update('intakeDate', v)} 
          required 
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <InputField 
        label="Destination Country *" 
        placeholder="" 
        value={data.destinationCountry} 
        onChange={(v) => update('destinationCountry', v)} 
        disabled={true}
      />
      <DateInputField 
        label="Tentative Travel Date *" 
        value={data.travelDate} 
        onChange={(v) => update('travelDate', v)} 
        required 
      />
      {isFamily ? (
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Number of Adults *"
            placeholder=""
            value={data.numAdults || ''}
            onChange={(v) => update('numAdults', v)}
          />
          <InputField
            label="Number of Children *"
            placeholder=""
            value={data.numChildren || ''}
            onChange={(v) => update('numChildren', v)}
          />
        </div>
      ) : (
        <SelectField
          label="Purpose"
          value={data.purpose}
          onChange={(v) => update('purpose', v)}
          options={['Tourism', 'Business', 'Visit', 'Other']}
          placeholder="Select purpose"
          required
        />
      )}
    </div>
  );
};

const Step3 = ({
  data,
  update,
  visaType,
}: {
  data: FormData;
  update: (field: keyof FormData, val: string) => void;
  visaType: string;
}) => {
  const isFamily =
    visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('group');
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');

  if (isBusiness) {
    return (
      <div className="space-y-8">
        <RadioGroup
          label="Invitation Letter Available? *"
          name="invitationLetter"
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          value={data.invitationLetter || ''}
          onChange={(v) => update('invitationLetter', v)}
        />
        <RadioGroup
          label="Previous Travel History? *"
          name="previousTravelHistory"
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          value={data.previousTravelHistory || ''}
          onChange={(v) => update('previousTravelHistory', v)}
        />
      </div>
    );
  }

  if (isStudent) {
    return (
      <div className="space-y-8">
        <RadioGroup
          label="Admission Letter / Invitation Available? *"
          name="admissionLetterAvailable"
          options={[
            { value: 'Yes', label: 'Yes' },
            { value: 'No', label: 'No' },
          ]}
          value={data.admissionLetterAvailable || ''}
          onChange={(v) => update('admissionLetterAvailable', v)}
        />
        <RadioGroup
          label="Sponsor Details *"
          name="sponsorDetails"
          options={[
            { value: 'Self', label: 'Self' },
            { value: 'Parents', label: 'Parents' },
            { value: 'Company', label: 'Company' },
          ]}
          value={data.sponsorDetails || ''}
          onChange={(v) => update('sponsorDetails', v)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isFamily ? (
        <>
          <RadioGroup
            label="Is everyone holding valid passports? *"
            name="holdValidPassports"
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            value={data.holdValidPassports || ''}
            onChange={(v) => update('holdValidPassports', v)}
          />
          <RadioGroup
            label="Any previous visa refusals? *"
            name="previousRefusals"
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            value={data.previousRefusals || ''}
            onChange={(v) => update('previousRefusals', v)}
          />
        </>
      ) : (
        <>
          <RadioGroup
            label="Employment Status"
            name="employmentStatus"
            options={[
              { value: 'salaried-employee', label: 'Salaried Employee' },
              { value: 'business-owner', label: 'Business Owner' },
            ]}
            value={data.employmentStatus || ''}
            onChange={(v) => update('employmentStatus', v)}
            required
          />
          <RadioGroup
            label="Travel History"
            name="travelHistory"
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'No', label: 'No' },
            ]}
            value={data.travelHistory || ''}
            onChange={(v) => update('travelHistory', v)}
            required
          />
        </>
      )}
    </div>
  );
};

const Step4 = ({ data, visaType }: { data: FormData; visaType: string }) => {
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Not provided';
    return formatToDisplayDate(dateStr);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Review Your Information</h2>
        <p className="text-sm text-gray-500">
          Please verify all details are correct before submitting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {isBusiness ? (
          <>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Applicant Name" value={data.fullName} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Company" value={data.companyName || ''} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Designation" value={data.designation || ''} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Contact" value={data.mobileNumber} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Business Email" value={data.businessEmail || ''} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Destination" value={data.destinationCountry} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Purpose" value={data.purpose} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Travel Date" value={formatDisplayDate(data.travelDate)} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Invitation Letter" value={data.invitationLetter || 'Not provided'} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Previous Travel History" value={data.previousTravelHistory || 'Not provided'} /></div>
          </>
        ) : isStudent ? (
          <>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Full Name" value={data.fullName} /></div>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Contact" value={data.mobileNumber} /></div>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Email" value={data.email} /></div>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Destination" value={data.destinationCountry} /></div>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Visa Type" value={data.visaSubtype || ''} /></div>
            <div className="bg-gray-50 p-3 rounded-lg"><ReviewField label="Event Date" value={formatDisplayDate(data.intakeDate || '')} /></div>
            <div className="bg-gray-50 p-3 rounded-lg w-full col-span-2"><ReviewField label="Admission Letter" value={data.admissionLetterAvailable || 'Not provided'} /></div>
            <div className="bg-gray-50 p-3 rounded-lg w-full col-span-2"><ReviewField label="Sponsor" value={data.sponsorDetails || ''} /></div>
          </>
        ) : (
          <>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Primary Applicant" value={data.fullName} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Contact" value={data.mobileNumber} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Email" value={data.email} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Destination" value={data.destinationCountry} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Travel Date" value={formatDisplayDate(data.travelDate)} /></div>
            <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Purpose" value={data.purpose} /></div>
            {data.currentCity && (
              <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Current City" value={data.currentCity} /></div>
            )}
            {data.country && (
              <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Country" value={data.country} /></div>
            )}
            {data.employmentStatus && (
              <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Employment Status" value={data.employmentStatus} /></div>
            )}
            {data.travelHistory && (
              <div className="bg-gray-50 p-4 rounded-lg"><ReviewField label="Travel History" value={data.travelHistory} /></div>
            )}
          </>
        )}
      </div>

      {isBusiness && (
        <>
          <div className="bg-[#4338CA] rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🚀</span>
                <h3 className="text-lg font-bold">Corporate Visa Advantages</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {[
                  'Dedicated Account Manager',
                  'Multi-Entry Visa Support',
                  'Corporate Bulk Processing',
                  'Express Documentation',
                ].map((text, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs opacity-90">
                    <Check size={14} className="text-green-400" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: '24-48 Hour',
                sub: 'Initial Review',
                color: 'bg-green-50 text-green-700',
                icon: '⚡',
              },
              {
                label: '98% Success',
                sub: 'Approval Rate',
                color: 'bg-purple-50 text-purple-700',
                icon: '📋',
              },
              {
                label: '150+ Countries',
                sub: 'We Process',
                color: 'bg-orange-50 text-orange-700',
                icon: '🌍',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`${stat.color} rounded-xl p-3 text-center border border-current/10`}
              >
                <div className="text-xs mb-1">{stat.icon}</div>
                <div className="text-sm font-bold leading-tight">{stat.label}</div>
                <div className="text-[10px] opacity-80">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-4 rounded-r-lg">
            <p className="text-xs text-[#92400E] leading-relaxed">
              💡 <strong>Pro Tip:</strong> Business visas often require invitation letters from the
              host company. Our team will help you prepare all necessary documentation including
              company registration certificates, tax documents, and invitation letters to maximize
              approval chances.
            </p>
          </div>
        </>
      )}

      {isStudent && (
        <>
          <div className="bg-[#1F2A6B] rounded-2xl p-6 text-white overflow-hidden relative">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🎯</span>
                <h3 className="text-lg font-bold">Student & Conference Visa Benefits</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold mb-1">
                    <Check size={14} className="text-green-400" /> Specialized Documentation
                  </div>
                  <p className="text-[10px] opacity-70 ml-5">
                    Expert help with admission letters & invitations
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold mb-1">
                    <Check size={14} className="text-green-400" /> Financial Proof Guidance
                  </div>
                  <p className="text-[10px] opacity-70 ml-5">
                    Support with bank statements & sponsorship letters
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold mb-1">
                    <Check size={14} className="text-green-400" /> Interview Preparation
                  </div>
                  <p className="text-[10px] opacity-70 ml-5">
                    Mock sessions for visa interview success
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold mb-1">
                    <Check size={14} className="text-green-400" /> Academic Verification
                  </div>
                  <p className="text-[10px] opacity-70 ml-5">
                    Assistance with transcripts & certificates
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: '96% Success',
                sub: 'For Students',
                color: 'bg-green-50 text-green-700',
                icon: '✅',
              },
              {
                label: '15,000+',
                sub: 'Students Helped',
                color: 'bg-blue-50 text-blue-700',
                icon: '🎓',
              },
              {
                label: '7-10 Days',
                sub: 'Avg. Processing',
                color: 'bg-pink-50 text-pink-700',
                icon: '⚡',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`${stat.color} rounded-xl p-3 text-center border border-current/10`}
              >
                <div className="text-xs mb-1">{stat.icon}</div>
                <div className="text-sm font-bold leading-tight">{stat.label}</div>
                <div className="text-[10px] opacity-80">{stat.sub}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#F0F7FF] border border-[#BFDBFE] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-[#1E40AF]">
                🗂️ Required Documents Checklist:
              </span>
            </div>
            <ul className="grid grid-cols-1 gap-1 text-[11px] text-[#1E40AF]">
              {[
                'Valid passport (minimum 6 months validity)',
                'University acceptance/admission letter',
                'Conference invitation letter (for attendees)',
                'Proof of financial support or sponsorship',
                'Academic transcripts & certificates',
                'Travel insurance coverage',
                'Accommodation confirmation',
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-300">•</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#FFFBEB] border-l-4 border-[#F59E0B] p-4 rounded-r-lg">
            <p className="text-xs text-[#92400E] leading-relaxed">
              💡 <strong>Expert Tips for Higher Approval:</strong> Apply 8-12 weeks before your
              course/event starts. Ensure your financial documents show sufficient funds for tuition
              and living expenses. Prepare a compelling Statement of Purpose explaining your
              academic goals and intent to return home.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const VisaApplicationForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  const visaType: string = (location.state as { visaType?: string })?.visaType ?? 'Individual';
  
  // Get destination from state
  const stateData = location.state as any;
  
  // Try multiple sources for destination country
  const destinationFromState = stateData?.destinationCountry || 
                              stateData?.destinationAirport?.country ||
                              sessionStorage.getItem('visaCountry') ||
                              '';
  




  // Redirect check - If user lands here but there's a redirect, go to it
  useEffect(() => {
    const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
    
    if (redirectUrl && redirectUrl !== window.location.pathname) {

      sessionStorage.removeItem('redirectAfterLogin');
      navigate(redirectUrl);
    }
  }, [navigate]);
  
  // Auto-redirect check for pending redirect
  useEffect(() => {
    if (isAuthenticated) {
      const pendingRedirect = sessionStorage.getItem('redirectAfterLogin');
      if (pendingRedirect) {

        sessionStorage.removeItem('redirectAfterLogin');
      }
    }
  }, [isAuthenticated]);
  
  const isBusiness = visaType.toLowerCase().includes('business');
  const isStudent = visaType.toLowerCase().includes('student');
  const isFamily =
    visaType.toLowerCase().includes('family') || visaType.toLowerCase().includes('group');

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    mobileNumber: '',
    email: '',
    destinationCountry: destinationFromState || '',
    travelDate: '',
    purpose: '',
  });

  // ─── LOAD DRAFT ON MOUNT ────────────────────────────────────────────────────
  useEffect(() => {
    // Clear redirect key when form loads
    const pendingRedirect = sessionStorage.getItem('redirectAfterLogin');
    if (pendingRedirect) {

      sessionStorage.removeItem('redirectAfterLogin');
    }
    
    const saved = loadDraft();
    if (saved) {
      setFormData({
        ...saved,
        // Always prioritize the destination from state over saved draft
        destinationCountry: destinationFromState || saved.destinationCountry || '',
      });
      if (saved.currentStep) {
        setCurrentStep(saved.currentStep as Step);
      }
    } else {
      // If no saved draft, ensure destination is set
      if (destinationFromState) {
        setFormData(prev => ({
          ...prev,
          destinationCountry: destinationFromState,
        }));
      }
    }
    setIsLoading(false);
  }, [destinationFromState]);

  // ─── AUTO-SAVE DRAFT ON CHANGE ──────────────────────────────────────────────
  useEffect(() => {
    if (!submitted && !isLoading) {
      const hasData = Object.values(formData).some(val => val && val.length > 0);
      if (hasData) {
        saveDraft({
          ...formData,
          visaType,
          currentStep,
        });
      }
    }
  }, [formData, visaType, currentStep, submitted, isLoading]);

  const update = (field: keyof FormData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const canContinueStep1 = isBusiness
    ? formData.fullName &&
      formData.companyName &&
      formData.designation &&
      formData.businessEmail &&
      formData.mobileNumber
    : isStudent
      ? formData.fullName && formData.mobileNumber && formData.email
      : isFamily
        ? formData.fullName && formData.mobileNumber && formData.email
        : formData.fullName &&
          formData.mobileNumber &&
          formData.email &&
          formData.currentCity &&
          formData.country;

  const canContinueStep2 = isBusiness
    ? formData.destinationCountry && formData.purpose && formData.travelDate
    : isStudent
      ? formData.destinationCountry && formData.visaSubtype && formData.intakeDate
      : isFamily
        ? formData.destinationCountry &&
          formData.travelDate &&
          formData.numAdults &&
          formData.numChildren
        : formData.destinationCountry && formData.travelDate && formData.purpose;

  const canContinueStep3 = isBusiness
    ? formData.invitationLetter && formData.previousTravelHistory
    : isStudent
      ? formData.admissionLetterAvailable && formData.sponsorDetails
      : isFamily
        ? formData.holdValidPassports && formData.previousRefusals
        : formData.employmentStatus && formData.travelHistory;

  const canContinue =
    currentStep === 1
      ? canContinueStep1
      : currentStep === 2
        ? canContinueStep2
        : currentStep === 3
          ? canContinueStep3
          : true;

  const handleContinue = () => {
    if (currentStep < 4) setCurrentStep((s) => (s + 1) as Step);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => (s - 1) as Step);
    else navigate('/visa');
  };

  // ─── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {


    if (!isAuthenticated) {

      
      saveDraft({
        ...formData,
        visaType,
        currentStep,
      });
      
      const currentPath = window.location.pathname;
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      

      
      navigate('/b2b', {
        state: {
          from: currentPath,
          message: 'Please login to continue with your visa application',
        },
      });
      return;
    }

    try {
      // ✅ Destructure mobileNumber out and rename/map it to contactNumber for the backend
      const { mobileNumber, ...restFormData } = formData;

      const result = await submitVisaApplicationForm({
        ...restFormData,
        contactNumber: mobileNumber, 
        visaType: visaType.toUpperCase(),
        source: 'B2C_PORTAL',
      });

      if (result && result.success) {
        setSubmitted(true);
        clearDraft();
      } else {
        notifyError(result?.message || 'Failed to submit application');
      }
    } catch (error: any) {

      notifyError(error?.response?.data?.message || 'Server error encountered during submission');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] py-16 px-4">
        <div className="max-w-[1000px] mx-auto">
          <div className="max-w-[800px] mx-auto mb-16">
            <VisaProcessStepper currentStep={4} visaType={visaType} />
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8 md:p-16 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-500" />
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Application Submitted Successfully!
            </h2>
            <p className="text-gray-500 text-lg mb-12">
              Thank you for choosing us. Our visa experts will review your application shortly.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              {[
                {
                  title: 'Free Eligibility Check',
                  desc: 'Get your visa eligibility assessed at no cost',
                  icon: '✅',
                },
                {
                  title: 'Document Checklist in 24 Hours',
                  desc: 'Receive a personalized document checklist within a day',
                  icon: '📄',
                },
                {
                  title: 'End-to-End Visa Support',
                  desc: 'Complete assistance throughout the visa process',
                  icon: '🛡️',
                },
                {
                  title: 'Dedicated Case Manager',
                  desc: 'Your personal expert to guide you every step',
                  icon: '👥',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#F8FAFF] rounded-2xl p-6 flex items-start gap-4 text-left border border-blue-50"
                >
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <span className="text-xl">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#EBFFF4] rounded-2xl p-8 mb-8 text-left border border-green-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                What happens next?
              </h3>
              <div className="space-y-4 max-w-xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <Check size={12} />
                  </div>
                  <span className="text-gray-700 font-medium">
                    Our visa expert will contact you within 24 hours
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <Check size={12} />
                  </div>
                  <span className="text-gray-700 font-medium">
                    You'll receive a detailed document checklist
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                    <Check size={12} />
                  </div>
                  <span className="text-gray-700 font-medium">
                    We'll guide you through every step of the application
                  </span>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button className="bg-[#25D366] text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#1ebd5e] transition-all shadow-lg">
                  <span className="text-xl">💬</span> Talk to Visa Expert on WhatsApp
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="text-[#1F2A6B] font-bold py-2 px-4 hover:underline"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#1F2A6B] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your application...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <MainNavbar activeService="visa" />
      <div className="min-h-screen bg-[#F7F8FA] font-sans pb-24 lg:pb-20">
        <div className="w-full bg-[#1F2A6B] h-[72px] flex items-center shadow-sm mt-20">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-10">
            <h1 className="text-white text-[19px] font-bold tracking-wide">
              Complete Visa Process Guide
            </h1>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-10 pt-5 pb-1">
          <div className="flex items-center gap-2 text-sm">
            <ChevronLeft
              size={16}
              className="text-gray-400 cursor-pointer"
              onClick={() => navigate(-1)}
            />
            <span
              className="text-[#4F8AFF] font-medium cursor-pointer hover:underline"
              onClick={() => navigate('/')}
            >
              Home
            </span>
            <span className="text-gray-400">›</span>
            <span
              className="text-[#4F8AFF] font-medium cursor-pointer hover:underline"
              onClick={() => navigate('/visa-plans')}
            >
              Visa
            </span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 font-medium">
              {currentStep === 1
                ? isBusiness
                  ? 'Business information'
                  : isStudent
                    ? 'Personal details'
                    : 'Personal information'
                : currentStep === 2
                  ? isBusiness
                    ? 'Travel Details'
                    : isStudent
                      ? 'Visa Details'
                      : 'Travel Details'
                  : currentStep === 3
                    ? 'Additional Information'
                    : 'Review Your Information'}
            </span>
          </div>
        </div>

        <div className="max-w-[800px] mx-auto px-4 sm:px-6">
          <VisaProcessStepper currentStep={currentStep} visaType={visaType} />
        </div>

        <main className="max-w-[1400px] mx-auto px-4 sm:px-10">
          <div className={`relative ${currentStep === 4 ? 'max-w-[720px] mx-auto' : ''}`}>

            <div className={`grid gap-8 ${currentStep === 4 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[1fr_320px]'}`}>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-8">
                {currentStep === 1 && <Step1 data={formData} update={update} visaType={visaType} />}
                {currentStep === 2 && <Step2 data={formData} update={update} visaType={visaType} />}
                {currentStep === 3 && <Step3 data={formData} update={update} visaType={visaType} />}
                {currentStep === 4 && <Step4 data={formData} visaType={visaType} />}
              </div>

              {currentStep !== 4 && (
                <div className="hidden lg:block">
                  <div className=" top-32">
                    <div className="w-72 bg-[#1F2A6B] rounded-xl text-white p-5 flex flex-col gap-3 shadow-2xl">
                      <div className="flex items-center gap-2.5">
                        <HelpCircle size={22} />
                        <h3 className="text-base font-bold">Need Assistance?</h3>
                      </div>
                      <p className="text-sm opacity-90 leading-relaxed">
                        Our visa experts are available 24/7 to guide you through the process.
                      </p>
                      <button
                        onClick={() => navigate('/contact-us')}
                        className="w-full bg-white text-[#1F2A6B] rounded-lg font-bold text-sm py-2.5 hover:bg-gray-100 transition-colors"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className={`flex justify-between mt-8 ${currentStep === 4 ? 'max-w-[720px] mx-auto' : ''}`}
            >
              <button
                onClick={handleBack}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={handleContinue}
                  disabled={!canContinue}
                  className={`px-8 py-2.5 rounded-lg text-sm font-bold text-white transition-all ${
                    canContinue
                      ? 'bg-[#1F2A6B] hover:bg-[#162055] shadow hover:-translate-y-0.5'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  className="px-8 py-2.5 rounded-lg text-sm font-bold text-white bg-[#1F2A6B] hover:bg-[#162055] shadow hover:-translate-y-0.5 transition-all"
                >
                  Submit your Application
                </button>
              )}
            </div>
          </div>
        </main>

        <div className="mt-20">
          <Footer />
        </div>
      </div>

      {currentStep !== 4 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1F2A6B] text-white px-4 py-3 flex items-center justify-between shadow-2xl z-50">
          <div className="flex items-center gap-3">
            <HelpCircle size={20} className="flex-shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Need Assistance?</h3>
              <p className="text-xs opacity-80">Available 24/7</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/contact-us')}
            className="bg-white text-[#1F2A6B] rounded-lg font-bold text-xs px-4 py-2 hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Contact Support
          </button>
        </div>
      )}
    </>
  );
};

export default VisaApplicationForm;