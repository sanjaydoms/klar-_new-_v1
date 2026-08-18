import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

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

interface DateRange {
  min: string;
  max: string;
}

interface TravellerFormCardProps {
  traveler: TravelerFormData;
  index: number;
  travelers: TravelerFormData[];
  updateTraveler: (index: number, field: keyof TravelerFormData, value: string) => void;
  getDateRangeForType: (type: 'ADULT' | 'CHILD' | 'INFANT') => DateRange;
  isDateValidForType: (dateStr: string, type: 'ADULT' | 'CHILD' | 'INFANT') => boolean;
  validateNameInput: (value: string, field: string) => string;
  nameErrors: { [key: string]: string };
  setNameErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  /** From the Review `conditions` block (ipa): supplier demands passports for this itinerary. */
  passportRequired?: boolean;
  /** From conditions.dob per pax type; defaults to required when unstated. */
  dobRequired?: boolean;
  /** conditions.anlm name-length limits (TripJack caps at 32/32). */
  nameLimits?: { first: number; last: number };
}

export default function TravellerFormCard({
  traveler,
  index,
  travelers,
  updateTraveler,
  getDateRangeForType,
  isDateValidForType,
  validateNameInput,
  nameErrors,
  setNameErrors,
  passportRequired = false,
  dobRequired = true,
  nameLimits = { first: 32, last: 32 },
}: TravellerFormCardProps) {

  const getTravelerTypeLabel = (type: string, idx: number) => {
    if (type === 'ADULT') return `Adult ${idx + 1} (12yrs+)`;
    if (type === 'CHILD') return `Child ${idx + 1} (2-11yrs)`;
    return `Infant ${idx + 1} (0-23 months)`;
  };

  const dateRange = getDateRangeForType(traveler.type);
  const travelerIndex = travelers.slice(0, index).filter((t) => t.type === traveler.type).length;

  /**
   * Field identity for autofill and for label association.
   *
   * This card renders once per traveller, so ids MUST be namespaced by index —
   * duplicate ids make `htmlFor` focus the first traveller's field no matter
   * which label you click.
   *
   * The `section-*` prefix matters just as much. Repeating a bare `given-name`
   * across several travellers invites the browser to fill every one of them with
   * the same person; the prefix declares each traveller a separate autofill
   * section, which is what it is for. Everything after the prefix stays a
   * standard token so browsers still recognise it.
   */
  const fieldId = (field: string) => `traveller-${index}-${field}`;
  const autoFill = (token: string) => `section-traveller-${index + 1} ${token}`;

  const hasPassportData =
    traveler.passportNumber ||
    traveler.passportNationality ||
    traveler.passportIssueDate ||
    traveler.passportExpiryDate;

  const validatePassportFields = () => {
    if (passportRequired || traveler.passportNumber || traveler.passportIssueDate || traveler.passportExpiryDate) {
      if (!traveler.passportNumber) {
        setNameErrors((prev) => ({
          ...prev,
          [`passport_${index}`]: 'Passport number is required when filling passport details',
        }));
        return false;
      }
      if (traveler.passportNumber.length < 6 || traveler.passportNumber.length > 9) {
        setNameErrors((prev) => ({
          ...prev,
          [`passport_${index}`]: 'Passport number must be between 6-9 characters',
        }));
        return false;
      }
      if (!traveler.passportIssueDate) {
        setNameErrors((prev) => ({
          ...prev,
          [`passport_issue_${index}`]: 'Passport issue date is required',
        }));
        return false;
      }
      if (!traveler.passportExpiryDate) {
        setNameErrors((prev) => ({
          ...prev,
          [`passport_expiry_${index}`]: 'Passport expiry date is required',
        }));
        return false;
      }
      const issueDate = new Date(traveler.passportIssueDate);
      const expiryDate = new Date(traveler.passportExpiryDate);
      if (expiryDate <= issueDate) {
        setNameErrors((prev) => ({
          ...prev,
          [`passport_dates_${index}`]: 'Expiry date must be after issue date',
        }));
        return false;
      }
    }
    return true;
  };

  const handlePassportBlur = () => {
    validatePassportFields();
  };

  const getTitleOptions = (type: string): string[] => {
    if (type === 'ADULT') return ['Mr', 'Mrs', 'Ms'];
    if (type === 'CHILD' || type === 'INFANT') return ['Master', 'Miss'];
    return ['Mr', 'Mrs', 'Ms', 'Master', 'Miss'];
  };

  const availableTitles = getTitleOptions(traveler.type);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="border-b-2 border-accent bg-primary px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase text-primary-foreground sm:px-6 sm:py-3 sm:text-sm">
        {getTravelerTypeLabel(traveler.type, travelerIndex)}
      </div>

      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor={fieldId('title')} className="mb-1 text-xs text-gray-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <select
              id={fieldId('title')}
              name={fieldId('title')}
              autoComplete={autoFill('honorific-prefix')}
              required
              value={traveler.title || availableTitles[0] || 'Mr'}
              onChange={(e) => updateTraveler(index, 'title', e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
            >
              {availableTitles.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor={fieldId('firstName')} className="mb-1 text-xs text-gray-700">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={fieldId('firstName')}
              name={fieldId('firstName')}
              autoComplete={autoFill('given-name')}
              required
              type="text"
              value={traveler.firstName || ''}
              onChange={(e) => {
                const cleaned = validateNameInput(e.target.value.toUpperCase(), 'firstName');
                updateTraveler(index, 'firstName', cleaned);
                if (cleaned.length > 0 && nameErrors[`firstName_${index}`]) {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`firstName_${index}`];
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                if (!e.target.value.trim()) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`firstName_${index}`]: 'First name is required',
                  }));
                } else if (e.target.value.length < 2) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`firstName_${index}`]: 'Name must be at least 2 characters',
                  }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`firstName_${index}`];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors[`firstName_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
              placeholder="Enter first name"
              maxLength={nameLimits.first}
            />
            {nameErrors[`firstName_${index}`] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors[`firstName_${index}`]}</p>
            )}
          </div>

          <div>
            <Label htmlFor={fieldId('lastName')} className="mb-1 text-xs text-gray-700">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id={fieldId('lastName')}
              name={fieldId('lastName')}
              autoComplete={autoFill('family-name')}
              required
              type="text"
              value={traveler.lastName || ''}
              onChange={(e) => {
                const cleaned = validateNameInput(e.target.value.toUpperCase(), 'lastName');
                updateTraveler(index, 'lastName', cleaned);
                if (cleaned.length > 0 && nameErrors[`lastName_${index}`]) {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`lastName_${index}`];
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                if (!e.target.value.trim()) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`lastName_${index}`]: 'Last name is required',
                  }));
                } else if (e.target.value.length < 2) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`lastName_${index}`]: 'Name must be at least 2 characters',
                  }));
                } else if (/\s/.test(e.target.value)) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`lastName_${index}`]: 'Last name cannot contain spaces',
                  }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`lastName_${index}`];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors[`lastName_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
              placeholder="Enter last name"
              maxLength={nameLimits.last}
            />
            {nameErrors[`lastName_${index}`] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors[`lastName_${index}`]}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor={fieldId('dateOfBirth')} className="mb-1 text-xs text-gray-700">
            Date of Birth {dobRequired ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-gray-400 font-normal">(optional)</span>
            )}
          </Label>
          <div className="relative">
            <Input
              id={fieldId('dateOfBirth')}
              name={fieldId('dateOfBirth')}
              autoComplete={autoFill('bday')}
              required={dobRequired}
              type="date"
              value={traveler.dateOfBirth || ''}
              min={dateRange.min}
              max={dateRange.max}
              onChange={(e) => {
                updateTraveler(index, 'dateOfBirth', e.target.value);
                if (nameErrors[`dob_${index}`]) {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`dob_${index}`];
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                if (!e.target.value) {
                  if (dobRequired) {
                    setNameErrors((prev) => ({
                      ...prev,
                      [`dob_${index}`]: 'Date of birth is required',
                    }));
                  }
                } else if (!isDateValidForType(e.target.value, traveler.type)) {
                  setNameErrors((prev) => ({
                    ...prev,
                    [`dob_${index}`]: `Invalid date of birth for ${traveler.type.toLowerCase()}`,
                  }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors[`dob_${index}`];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors[`dob_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
            />
          </div>
          {nameErrors[`dob_${index}`] && (
            <p className="text-xs text-red-500 mt-1">{nameErrors[`dob_${index}`]}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-2">
          <h4 className="text-base font-medium text-gray-900 mb-3">
            Passport Details{' '}
            {passportRequired ? (
              <span className="text-red-500 text-sm font-normal ml-1">(Required for this trip)</span>
            ) : (
              <span className="text-gray-400 text-sm font-normal ml-1">(Optional — needed for international trips)</span>
            )}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label htmlFor={fieldId('passportNumber')} className="mb-1 text-xs text-gray-700">
                Passport Number
              </Label>
              <Input
                id={fieldId('passportNumber')}
                name={fieldId('passportNumber')}
                autoComplete="off"
                type="text"
                value={traveler.passportNumber || ''}
                onChange={(e) => {
                  const value = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                    .slice(0, 9);
                  updateTraveler(index, 'passportNumber', value);
                  if (nameErrors[`passport_${index}`]) {
                    setNameErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors[`passport_${index}`];
                      return newErrors;
                    });
                  }
                }}
                onBlur={handlePassportBlur}
                aria-invalid={!!(nameErrors[`passport_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
                placeholder="Enter passport number"
                maxLength={9}
              />
              {nameErrors[`passport_${index}`] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors[`passport_${index}`]}</p>
              )}
            </div>

            <div>
              <Label htmlFor={fieldId('passportNationality')} className="mb-1 text-xs text-gray-700">Nationality</Label>
              <Input
                id={fieldId('passportNationality')}
                name={fieldId('passportNationality')}
                autoComplete={autoFill('country-name')}
                type="text"
                value={traveler.passportNationality || ''}
                onChange={(e) =>
                  updateTraveler(index, 'passportNationality', e.target.value.toUpperCase())
                }
                className="w-full h-9 text-xs sm:text-sm"
                maxLength={2}
                placeholder="IN"
              />
            </div>

            <div>
              <Label htmlFor={fieldId('passportIssueDate')} className="mb-1 text-xs text-gray-700">Issue Date</Label>
              <Input
                id={fieldId('passportIssueDate')}
                name={fieldId('passportIssueDate')}
                autoComplete="off"
                type="date"
                value={traveler.passportIssueDate || ''}
                onChange={(e) => {
                  updateTraveler(index, 'passportIssueDate', e.target.value);
                  if (
                    nameErrors[`passport_issue_${index}`] ||
                    nameErrors[`passport_dates_${index}`]
                  ) {
                    setNameErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors[`passport_issue_${index}`];
                      delete newErrors[`passport_dates_${index}`];
                      return newErrors;
                    });
                  }
                }}
                onBlur={handlePassportBlur}
                aria-invalid={!!(nameErrors[`passport_issue_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
              />
              {nameErrors[`passport_issue_${index}`] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors[`passport_issue_${index}`]}</p>
              )}
            </div>

            <div>
              <Label htmlFor={fieldId('passportExpiryDate')} className="mb-1 text-xs text-gray-700">Expiry Date</Label>
              <Input
                id={fieldId('passportExpiryDate')}
                name={fieldId('passportExpiryDate')}
                autoComplete="off"
                type="date"
                value={traveler.passportExpiryDate || ''}
                onChange={(e) => {
                  updateTraveler(index, 'passportExpiryDate', e.target.value);
                  if (
                    nameErrors[`passport_expiry_${index}`] ||
                    nameErrors[`passport_dates_${index}`]
                  ) {
                    setNameErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors[`passport_expiry_${index}`];
                      delete newErrors[`passport_dates_${index}`];
                      return newErrors;
                    });
                  }
                }}
                onBlur={handlePassportBlur}
                aria-invalid={!!(nameErrors[`passport_expiry_${index}`])}
              className="w-full h-9 text-xs sm:text-sm"
              />
              {nameErrors[`passport_expiry_${index}`] && (
                <p className="text-xs text-red-500 mt-1">
                  {nameErrors[`passport_expiry_${index}`]}
                </p>
              )}
            </div>
          </div>
          {nameErrors[`passport_dates_${index}`] && (
            <p className="text-xs text-red-500 mt-2">{nameErrors[`passport_dates_${index}`]}</p>
          )}
          {hasPassportData && (
            <p className="text-xs text-blue-600 mt-2">
              ℹ️ Please fill all passport fields or clear them if not needed
            </p>
          )}
        </div>
      </div>
    </div>
  );
}