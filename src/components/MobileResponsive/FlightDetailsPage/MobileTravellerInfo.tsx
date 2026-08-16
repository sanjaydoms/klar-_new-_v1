import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { countries } from '../../../../src/services/countries';
import BottomNav from '../DashboardPage/BottomNav';


interface TravelerFormData {
  type: 'ADULT' | 'CHILD' | 'INFANT';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber?: string;
  passportNationality?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
}

interface GSTInfo {
  gstNumber: string;
  registeredName: string;
  email: string;
  mobile: string;
  address: string;
}

interface EmergencyContact {
  name: string;
  email: string;
  phone: string;
}

interface MobileTravellerInfoProps {
  travelers?: TravelerFormData[];
  onTravelerUpdate?: (index: number, field: keyof TravelerFormData, value: string) => void;
  passengerKeys?: string[];
  activePassenger?: number;
  setActivePassenger?: (index: number) => void;
  isPassengerComplete?: (index: number) => boolean;

  email?: string;
  onEmailChange?: (value: string) => void;
  countryCode?: string;
  onCountryCodeChange?: (value: string) => void;
  mobileNumber?: string;
  onMobileNumberChange?: (value: string) => void;

  showGST?: boolean;
  onShowGSTChange?: (show: boolean) => void;
  gstInfo?: GSTInfo;
  onGSTInfoChange?: (info: GSTInfo) => void;

  emergencyContact?: EmergencyContact;
  onEmergencyContactChange?: (contact: EmergencyContact) => void;

  nameErrors?: { [key: string]: string };
  onNameErrorsChange?: (errors: { [key: string]: string }) => void;
}

const MobileTravellerInfo: React.FC<MobileTravellerInfoProps> = ({
  travelers = [],
  onTravelerUpdate,
  passengerKeys = [],
  activePassenger = 0,
  setActivePassenger,
  isPassengerComplete,

  email = '',
  onEmailChange,
  countryCode = '+91',
  onCountryCodeChange,
  mobileNumber = '',
  onMobileNumberChange,

  showGST = false,
  onShowGSTChange,
  gstInfo = { gstNumber: '', registeredName: '', email: '', mobile: '', address: '' },
  onGSTInfoChange,

  emergencyContact = { name: '', email: '', phone: '' },
  onEmergencyContactChange,

  nameErrors = {},
  onNameErrorsChange,
}) => {
  const currentPassenger = passengerKeys[activePassenger] || 'P1';
  const currentTraveler = travelers[activePassenger] || null;

  /**
   * Field identity for autofill and label association.
   *
   * Unlike the desktop card, this screen shows ONE traveller at a time — the
   * passenger chips above are just tabs — so ids cannot collide across
   * travellers. They are still keyed by passenger because switching tabs
   * re-renders the same fields in the same DOM position: a stable, distinct id
   * per passenger is what lets the browser tell them apart.
   *
   * The `section-traveller-<n>` prefix does the same job as on desktop. Without
   * it, filling passenger 2 offers passenger 1's identity, since as far as the
   * browser is concerned it is the same field being shown again.
   */
  const fieldId = (field: string) => `mobile-traveller-${activePassenger}-${field}`;
  const autoFill = (token: string) => `section-traveller-${activePassenger + 1} ${token}`;
  const [showPassport, setShowPassport] = useState<{ [key: string]: boolean }>({});
  // Own state, like desktop's EmergencyContactForm — the emergency contact's
  // dial code must not write through to the booker's countryCode.
  const [emergencyDialCode, setEmergencyDialCode] = useState('+91');

  const titleOptions = {
    ADULT: ['Mr', 'Mrs', 'Ms', 'Dr', 'Capt'],
    CHILD: ['Master', 'Miss'],
    INFANT: ['Master', 'Miss'],
  };

  const getTravelerTypeLabel = (type: string, passengerKey: string) => {
    const index = parseInt(passengerKey.replace('P', ''));
    if (type === 'ADULT') return `Adult ${index}`;
    if (type === 'CHILD') return `Child ${index}`;
    return `Infant ${index}`;
  };

  const getDateRangeForType = (type: 'ADULT' | 'CHILD' | 'INFANT') => {
    const today = new Date();
    const formatDate = (date: Date): string => date.toISOString().split('T')[0] as string;

    switch (type) {
      case 'ADULT':
        const maxDate = new Date(today);
        maxDate.setFullYear(today.getFullYear() - 12);
        return { max: formatDate(maxDate), min: '1900-01-01' };
      case 'CHILD':
        const childMaxDate = new Date(today);
        childMaxDate.setFullYear(today.getFullYear() - 2);
        childMaxDate.setDate(childMaxDate.getDate() + 1);
        const childMinDate = new Date(today);
        childMinDate.setFullYear(today.getFullYear() - 12);
        return { max: formatDate(childMaxDate), min: formatDate(childMinDate) };
      case 'INFANT':
        const infantMinDate = new Date(today);
        infantMinDate.setFullYear(today.getFullYear() - 2);
        return { max: formatDate(today), min: formatDate(infantMinDate) };
      default:
        return { max: formatDate(today), min: '1900-01-01' };
    }
  };

  const isDateValidForType = (dateStr: string, type: 'ADULT' | 'CHILD' | 'INFANT'): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

    switch (type) {
      case 'ADULT':
        return age >= 12;
      case 'CHILD':
        return age >= 2 && age < 12;
      case 'INFANT':
        return age >= 0 && age < 2;
      default:
        return false;
    }
  };

  const validateNameInput = (value: string, field: string): string => {
    let cleaned = value.replace(/[^a-zA-Z.\s]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/^\s+/, '');
    if (field === 'lastName') cleaned = cleaned.replace(/\s/g, '');
    return cleaned;
  };

  const handleTravelerFieldChange = (
    index: number,
    field: keyof TravelerFormData,
    value: string,
  ) => {
    onTravelerUpdate?.(index, field, value);
    if (onNameErrorsChange) {
      const newErrors = { ...nameErrors };
      delete newErrors[`${field}_${index}`];
      onNameErrorsChange(newErrors);
    }
  };

  const updateEmergencyField = (field: keyof EmergencyContact, value: string) => {
    onEmergencyContactChange?.({ ...emergencyContact, [field]: value });
    if (onNameErrorsChange) {
      const newErrors = { ...nameErrors };
      delete newErrors[`emergency_${field}`];
      onNameErrorsChange(newErrors);
    }
  };

  const updateGSTField = (field: keyof GSTInfo, value: string) => {
    onGSTInfoChange?.({ ...gstInfo, [field]: value });
    if (onNameErrorsChange) {
      const newErrors = { ...nameErrors };
      delete newErrors[`gst_${field}`];
      onNameErrorsChange(newErrors);
    }
  };

  if (travelers.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Traveller Information</h3>
        <p className="text-sm text-gray-500 text-center py-4">No travellers added</p>
      </div>
    );
  }

  const completedCount = travelers.filter((t) => t.firstName && t.lastName && t.dateOfBirth).length;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">Traveller Information</h3>
        <span className="text-sm text-gray-500">
          {completedCount}/{travelers.length} completed
        </span>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {passengerKeys.map((key, index) => {
          const isActive = activePassenger === index;
          const isComplete = isPassengerComplete?.(index) || false;

          return (
            <button
              key={key}
              onClick={() => setActivePassenger?.(index)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${isActive
                  ? 'bg-primary text-white shadow-md'
                  : isComplete
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {key}
              {isComplete && <CheckCircle className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {currentTraveler && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700">
            Selecting for: <span className="text-primary font-bold">{currentPassenger}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {getTravelerTypeLabel(currentTraveler.type, currentPassenger)}
          </p>
        </div>
      )}

      {currentTraveler && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-input p-4">
            <div className="mb-4">
              <label htmlFor={fieldId('title')} className="block text-xs font-semibold text-gray-500 mb-1">TITLE</label>
              <select
                id={fieldId('title')}
                name={fieldId('title')}
                autoComplete={autoFill('honorific-prefix')}
                required
                value={currentTraveler.title}
                onChange={(e) =>
                  handleTravelerFieldChange(activePassenger, 'title', e.target.value)
                }
                className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800 bg-white"
              >
                {titleOptions[currentTraveler.type as keyof typeof titleOptions]?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor={fieldId('firstName')} className="block text-xs font-semibold text-gray-500 mb-1">FIRST NAME</label>
              <input
                id={fieldId('firstName')}
                name={fieldId('firstName')}
                autoComplete={autoFill('given-name')}
                required
                type="text"
                value={currentTraveler.firstName}
                onChange={(e) => {
                  const cleaned = validateNameInput(e.target.value, 'firstName');
                  handleTravelerFieldChange(activePassenger, 'firstName', cleaned.toUpperCase());
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors[`firstName_${activePassenger}`]) {
                    const newErrors = { ...nameErrors };
                    delete newErrors[`firstName_${activePassenger}`];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim() && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      [`firstName_${activePassenger}`]: 'First name is required',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (
                    e.target.value.length < 2 &&
                    e.target.value.length > 0 &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      [`firstName_${activePassenger}`]: 'Name must be at least 2 characters',
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                placeholder="Enter first name"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors[`firstName_${activePassenger}`] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors[`firstName_${activePassenger}`] && (
                <p className="text-xs text-red-500 mt-1">
                  {nameErrors[`firstName_${activePassenger}`]}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor={fieldId('lastName')} className="block text-xs font-semibold text-gray-500 mb-1">LAST NAME</label>
              <input
                id={fieldId('lastName')}
                name={fieldId('lastName')}
                autoComplete={autoFill('family-name')}
                required
                type="text"
                value={currentTraveler.lastName}
                onChange={(e) => {
                  const cleaned = validateNameInput(e.target.value, 'lastName');
                  handleTravelerFieldChange(activePassenger, 'lastName', cleaned.toUpperCase());
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors[`lastName_${activePassenger}`]) {
                    const newErrors = { ...nameErrors };
                    delete newErrors[`lastName_${activePassenger}`];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim() && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      [`lastName_${activePassenger}`]: 'Last name is required',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (
                    e.target.value.length < 2 &&
                    e.target.value.length > 0 &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      [`lastName_${activePassenger}`]: 'Name must be at least 2 characters',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (/\s/.test(e.target.value) && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      [`lastName_${activePassenger}`]: 'Last name cannot contain spaces',
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                placeholder="Enter last name"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors[`lastName_${activePassenger}`] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors[`lastName_${activePassenger}`] && (
                <p className="text-xs text-red-500 mt-1">
                  {nameErrors[`lastName_${activePassenger}`]}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor={fieldId('dateOfBirth')} className="block text-xs font-semibold text-gray-500 mb-1">
                DATE OF BIRTH
              </label>
              <input
                id={fieldId('dateOfBirth')}
                name={fieldId('dateOfBirth')}
                autoComplete={autoFill('bday')}
                required
                type="date"
                value={currentTraveler.dateOfBirth}
                min={getDateRangeForType(currentTraveler.type).min}
                max={getDateRangeForType(currentTraveler.type).max}
                onChange={(e) => {
                  handleTravelerFieldChange(activePassenger, 'dateOfBirth', e.target.value);
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors[`dob_${activePassenger}`]) {
                    const newErrors = { ...nameErrors };
                    delete newErrors[`dob_${activePassenger}`];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      [`dob_${activePassenger}`]: 'Date of birth is required',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (
                    e.target.value &&
                    !isDateValidForType(e.target.value, currentTraveler.type) &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      [`dob_${activePassenger}`]: `Invalid date of birth for ${currentTraveler.type.toLowerCase()}`,
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 ${nameErrors[`dob_${activePassenger}`] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors[`dob_${activePassenger}`] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors[`dob_${activePassenger}`]}</p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id={`passport_${activePassenger}`}
                  checked={showPassport[currentPassenger] || false}
                  onChange={(e) =>
                    setShowPassport((prev) => ({ ...prev, [currentPassenger]: e.target.checked }))
                  }
                  className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                />
                <label
                  htmlFor={`passport_${activePassenger}`}
                  className="text-sm font-medium text-gray-700"
                >
                  Add Passport Details
                </label>
              </div>

              {showPassport[currentPassenger] && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor={fieldId('passportNumber')} className="block text-xs font-semibold text-gray-500 mb-1">
                      PASSPORT NUMBER
                    </label>
                    <input
                      id={fieldId('passportNumber')}
                      name={fieldId('passportNumber')}
                      autoComplete="off"
                      type="text"
                      value={currentTraveler.passportNumber || ''}
                      onChange={(e) => {
                        const value = e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, '')
                          .slice(0, 9);
                        handleTravelerFieldChange(activePassenger, 'passportNumber', value);
                      }}
                      placeholder="Enter passport number"
                      className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400"
                      maxLength={9}
                    />
                  </div>

                  <div>
                    <label htmlFor={fieldId('passportNationality')} className="block text-xs font-semibold text-gray-500 mb-1">
                      NATIONALITY
                    </label>
                    <input
                      id={fieldId('passportNationality')}
                      name={fieldId('passportNationality')}
                      autoComplete={autoFill('country')}
                      type="text"
                      value={currentTraveler.passportNationality || ''}
                      onChange={(e) =>
                        handleTravelerFieldChange(
                          activePassenger,
                          'passportNationality',
                          e.target.value.toUpperCase(),
                        )
                      }
                      placeholder="IN"
                      className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label htmlFor={fieldId('passportIssueDate')} className="block text-xs font-semibold text-gray-500 mb-1">
                      ISSUE DATE
                    </label>
                    <input
                      id={fieldId('passportIssueDate')}
                      name={fieldId('passportIssueDate')}
                      autoComplete="off"
                      type="date"
                      value={currentTraveler.passportIssueDate || ''}
                      onChange={(e) =>
                        handleTravelerFieldChange(
                          activePassenger,
                          'passportIssueDate',
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800"
                    />
                  </div>

                  <div>
                    <label htmlFor={fieldId('passportExpiryDate')} className="block text-xs font-semibold text-gray-500 mb-1">
                      EXPIRY DATE
                    </label>
                    <input
                      id={fieldId('passportExpiryDate')}
                      name={fieldId('passportExpiryDate')}
                      autoComplete="off"
                      type="date"
                      value={currentTraveler.passportExpiryDate || ''}
                      onChange={(e) =>
                        handleTravelerFieldChange(
                          activePassenger,
                          'passportExpiryDate',
                          e.target.value,
                        )
                      }
                      className="w-full px-4 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="bg-white rounded-lg border border-input p-4">
          <h4 className="text-sm font-bold text-gray-800 mb-4">Contact Details</h4>

          <div className="mb-4">
            <label htmlFor="mobile-contact-email" className="block text-xs font-semibold text-gray-500 mb-1">E-MAIL <span className="text-red-500">*</span></label>
            <input
              id="mobile-contact-email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              type="email"
              value={email}
              onChange={(e) => {
                onEmailChange?.(e.target.value.toLowerCase());
                // Clear error when user starts typing
                if (onNameErrorsChange && nameErrors['email']) {
                  const newErrors = { ...nameErrors };
                  delete newErrors['email'];
                  onNameErrorsChange(newErrors);
                }
              }}
              onBlur={(e) => {
                if (!e.target.value && onNameErrorsChange) {
                  const newErrors = { ...nameErrors, email: 'Email is required' };
                  onNameErrorsChange(newErrors);
                } else if (
                  e.target.value.toLocaleLowerCase() &&
                  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value) &&
                  onNameErrorsChange
                ) {
                  const newErrors = { ...nameErrors, email: 'Please enter a valid email address' };
                  onNameErrorsChange(newErrors);
                }
              }}
              placeholder="Enter email address"
              className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['email'] ? 'border-red-500' : 'border-input'
                }`}
            />
            {nameErrors['email'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['email']}</p>
            )}
          </div>

          <div>
            <label htmlFor="mobile-contact-phone" className="block text-xs font-semibold text-gray-500 mb-1">MOBILE NUMBER <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                aria-label="Country code"
                name="countryCode"
                autoComplete="tel-country-code"
                value={countryCode}
                onChange={(e) => onCountryCodeChange?.(e.target.value)}
                className="w-36 px-3 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800 bg-white"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.dialCode}>
                    {country.flag} {country.dialCode}
                  </option>
                ))}
              </select>
              <input
                id="mobile-contact-phone"
                name="mobileNumber"
                autoComplete="tel-national"
                inputMode="numeric"
                required
                type="tel"
                value={mobileNumber}
                onChange={(e) => {
                  const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  onMobileNumberChange?.(numbersOnly);
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors['mobileNumber']) {
                    const newErrors = { ...nameErrors };
                    delete newErrors['mobileNumber'];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value && onNameErrorsChange) {
                    const newErrors = { ...nameErrors, mobileNumber: 'Mobile number is required' };
                    onNameErrorsChange(newErrors);
                  } else if (
                    e.target.value &&
                    !/^\d{10}$/.test(e.target.value) &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      mobileNumber: 'Please enter a valid 10-digit mobile number',
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                placeholder="Enter mobile number"
                className={`w-48 px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['mobileNumber'] ? 'border-red-500' : 'border-input'
                  }`}
                maxLength={10}
              />
            </div>
            {nameErrors['mobileNumber'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['mobileNumber']}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="bg-white rounded-lg border border-input p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="showGST"
              checked={showGST}
              onChange={(e) => onShowGSTChange?.(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
            />
            <label htmlFor="showGST" className="text-sm font-medium text-gray-700">
              I have a GST number
            </label>
          </div>

          {showGST && (
            <div>
              <label htmlFor="mobile-gst-number" className="block text-xs font-semibold text-gray-500 mb-1">GST NUMBER</label>
              <input
                id="mobile-gst-number"
                name="gstNumber"
                autoComplete="off"
                type="text"
                value={gstInfo.gstNumber}
                onChange={(e) => {
                  updateGSTField('gstNumber', e.target.value.toUpperCase());
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors['gst_number']) {
                    const newErrors = { ...nameErrors };
                    delete newErrors['gst_number'];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

                  if (!onNameErrorsChange) return;

                  if (value && !gstRegex.test(value)) {
                    onNameErrorsChange({
                      ...nameErrors,
                      gst_number: 'Please enter a valid 15-digit GST number',
                    });
                  } else if (nameErrors.gst_number) {
                    const clearedErrors = { ...nameErrors };
                    delete clearedErrors.gst_number;
                    onNameErrorsChange(clearedErrors);
                  }
                }}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['gst_number'] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors['gst_number'] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors['gst_number']}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <div className="bg-white rounded-lg border border-input p-4">
          <h4 className="text-sm font-bold text-gray-800 mb-4">
            Emergency Contact <span className="text-red-500">*</span>
          </h4>

          <div className="space-y-4">
            <div>
              <label htmlFor="mobile-emergency-name" className="block text-xs font-semibold text-gray-500 mb-1">
                CONTACT NAME <span className="text-red-500">*</span>
              </label>
              <input
                id="mobile-emergency-name"
                name="emergencyName"
                autoComplete="section-emergency name"
                required
                type="text"
                value={emergencyContact.name}
                onChange={(e) => {
                  updateEmergencyField('name', e.target.value);
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors['emergency_name']) {
                    const newErrors = { ...nameErrors };
                    delete newErrors['emergency_name'];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  if (!e.target.value.trim() && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      emergency_name: 'Emergency contact name is required',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (
                    e.target.value.trim().length < 2 &&
                    e.target.value.trim().length > 0 &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      emergency_name: 'Name must be at least 2 characters',
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                placeholder="Emergency contact name"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['emergency_name'] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors['emergency_name'] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors['emergency_name']}</p>
              )}
            </div>

            <div>
              <label htmlFor="mobile-emergency-email" className="block text-xs font-semibold text-gray-500 mb-1">
                EMAIL <span className="text-red-500">*</span>
              </label>
              <input
                id="mobile-emergency-email"
                name="emergencyEmail"
                autoComplete="section-emergency email"
                inputMode="email"
                required
                type="email"
                value={emergencyContact.email}
                onChange={(e) => {
                  updateEmergencyField('email', e.target.value);
                  // Clear error when user starts typing
                  if (onNameErrorsChange && nameErrors['emergency_email']) {
                    const newErrors = { ...nameErrors };
                    delete newErrors['emergency_email'];
                    onNameErrorsChange(newErrors);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (!value && onNameErrorsChange) {
                    const newErrors = {
                      ...nameErrors,
                      emergency_email: 'Emergency contact email is required',
                    };
                    onNameErrorsChange(newErrors);
                  } else if (
                    value &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) &&
                    onNameErrorsChange
                  ) {
                    const newErrors = {
                      ...nameErrors,
                      emergency_email: 'Please enter a valid email address',
                    };
                    onNameErrorsChange(newErrors);
                  }
                }}
                placeholder="Emergency contact email"
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['emergency_email'] ? 'border-red-500' : 'border-input'
                  }`}
              />
              {nameErrors['emergency_email'] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors['emergency_email']}</p>
              )}
            </div>

            <div>
              <label htmlFor="mobile-emergency-phone" className="block text-xs font-semibold text-gray-500 mb-1">PHONE NUMBER <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <select
                  aria-label="Emergency contact country code"
                  name="emergencyCountryCode"
                  autoComplete="section-emergency tel-country-code"
                  value={emergencyDialCode}
                  onChange={(e) => setEmergencyDialCode(e.target.value)}
                  className="w-24 px-2 py-2.5 border border-input rounded-lg focus:outline-none focus:border-primary text-gray-800 bg-white text-sm"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.dialCode}>
                      {country.flag} {country.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  id="mobile-emergency-phone"
                  name="emergencyPhone"
                  autoComplete="section-emergency tel-national"
                  inputMode="numeric"
                  required
                  type="tel"
                  value={emergencyContact.phone}
                  onChange={(e) => {
                    const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    updateEmergencyField('phone', numbersOnly);
                    // Clear error when user starts typing
                    if (onNameErrorsChange && nameErrors['emergency_phone']) {
                      const newErrors = { ...nameErrors };
                      delete newErrors['emergency_phone'];
                      onNameErrorsChange(newErrors);
                    }
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (!value && onNameErrorsChange) {
                      const newErrors = {
                        ...nameErrors,
                        emergency_phone: 'Emergency contact phone number is required',
                      };
                      onNameErrorsChange(newErrors);
                    } else if (value && !/^\d{10}$/.test(value) && onNameErrorsChange) {
                      const newErrors = {
                        ...nameErrors,
                        emergency_phone: 'Please enter a valid 10-digit number',
                      };
                      onNameErrorsChange(newErrors);
                    }
                  }}
                  placeholder="Emergency contact number"
                  className={`w-48 px-4 py-2.5 border rounded-lg focus:outline-none focus:border-primary text-gray-800 placeholder:text-gray-400 ${nameErrors['emergency_phone'] ? 'border-red-500' : 'border-input'
                    }`}
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

// Add this validation function before export
export const validateEmergencyContact = (
  emergencyContact: EmergencyContact,
): { isValid: boolean; errors: { [key: string]: string } } => {
  const errors: { [key: string]: string } = {};

  if (!emergencyContact.name || emergencyContact.name.trim().length < 2) {
    errors['emergency_name'] = 'Emergency contact name is required (minimum 2 characters)';
  }

  if (!emergencyContact.email) {
    errors['emergency_email'] = 'Emergency contact email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContact.email)) {
    errors['emergency_email'] = 'Please enter a valid email address';
  }

  if (!emergencyContact.phone) {
    errors['emergency_phone'] = 'Emergency contact phone number is required';
  } else if (!/^\d{10}$/.test(emergencyContact.phone)) {
    errors['emergency_phone'] = 'Please enter a valid 10-digit phone number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default MobileTravellerInfo;
