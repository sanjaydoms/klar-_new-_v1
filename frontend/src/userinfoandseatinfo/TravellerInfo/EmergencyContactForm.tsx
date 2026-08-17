import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { countries, Country, getCountryByCode } from '../../services/countries';

interface EmergencyContact {
  name: string;
  email: string;
  phone: string;
}

interface EmergencyContactFormProps {
  emergencyContact: EmergencyContact;
  setEmergencyContact: (contact: EmergencyContact) => void;
  nameErrors: { [key: string]: string };
  setNameErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export default function EmergencyContactForm({
  emergencyContact,
  setEmergencyContact,
  nameErrors,
  setNameErrors,
}: EmergencyContactFormProps) {
  const updateEmergencyField = (field: keyof EmergencyContact, value: string) => {
    setEmergencyContact({ ...emergencyContact, [field]: value });
    if (nameErrors[`emergency_${field}`]) {
      setNameErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`emergency_${field}`];
        return newErrors;
      });
    }
  };


  const defaultCountry = countries.find(c => c.code === 'IN') || countries[0];
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(defaultCountry);


  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="bg-gray-100 text-gray-700 px-4 sm:px-6 py-2 sm:py-3 font-medium text-xs sm:text-sm">
        Emergency Contact
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <Label htmlFor="emergency-name" className="mb-1 text-xs text-gray-700">Contact Name <span className="text-red-500">*</span></Label>
            <Input
              id="emergency-name"
              name="emergencyName"
              autoComplete="section-emergency name"
              required
              type="text"
              value={emergencyContact.name}
              onChange={(e) => updateEmergencyField('name', e.target.value.toUpperCase())}
              aria-invalid={!!(nameErrors['emergency_name'])}
              className="w-full h-9 text-xs sm:text-sm"
              placeholder="Emergency contact name"
            />
            {nameErrors['emergency_name'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['emergency_name']}</p>
            )}
          </div>

          <div>
            <Label htmlFor="emergency-email" className="mb-1 text-xs text-gray-700">Email <span className="text-red-500">*</span></Label>
            <Input
              id="emergency-email"
              name="emergencyEmail"
              autoComplete="section-emergency email"
              inputMode="email"
              required
              type="email"
              value={emergencyContact.email}
              onChange={(e) => updateEmergencyField('email', e.target.value.toLowerCase())}
              onBlur={(e) => {
                const value = e.target.value;
                if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                  setNameErrors((prev) => ({
                    ...prev,
                    emergency_email: 'Please enter a valid email address',
                  }));
                } else {
                  setNameErrors((prev) => {
                    const newErrors = { ...prev };
                    delete newErrors['emergency_email'];
                    return newErrors;
                  });
                }
              }}
              aria-invalid={!!(nameErrors['emergency_email'])}
              className="w-full h-9 text-xs sm:text-sm"
              placeholder="Emergency contact email"
            />
            {nameErrors['emergency_email'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['emergency_email']}</p>
            )}
          </div>

          <div>
            <Label htmlFor="emergency-phone" className="mb-1 text-xs text-gray-700">Phone Number <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <select
                aria-label="Emergency contact country code"
                name="emergencyCountryCode"
                autoComplete="section-emergency tel-country-code"
                value={selectedCountry.code}
                onChange={(e) => {
                  const country = getCountryByCode(e.target.value);
                  if (country) setSelectedCountry(country);
                }}
                className="w-20 h-9 rounded-lg border border-input bg-transparent px-2.5 text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm"
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.dialCode}
                  </option>
                ))}
              </select>

              {/* Phone Number Input */}
              <Input
                id="emergency-phone"
                name="emergencyPhone"
                autoComplete="section-emergency tel-national"
                inputMode="numeric"
                required
                type="tel"
                value={emergencyContact.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                  updateEmergencyField('phone', value);
                }}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && value.length !== 10) {
                    setNameErrors((prev) => ({
                      ...prev,
                      emergency_phone: `Please enter a valid 10-digit phone number`,
                    }));
                  } else {
                    setNameErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors['emergency_phone'];
                      return newErrors;
                    });
                  }
                }}
                aria-invalid={!!(nameErrors['emergency_phone'])}
              className="flex-1 w-full h-9 text-xs sm:text-sm"
                placeholder="Enter 10-digit phone number"
                maxLength={10}
              />
            </div>
            {nameErrors['emergency_phone'] && (
              <p className="text-xs text-red-500 mt-1">{nameErrors['emergency_phone']}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
