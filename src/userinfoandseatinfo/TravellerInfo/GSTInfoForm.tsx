import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

interface GSTInfo {
  gstNumber: string;
  registeredName: string;
  email: string;
  mobile: string;
  address: string;
}

interface GSTInfoFormProps {
  showGST: boolean;
  setShowGST: (show: boolean) => void;
  gstInfo: GSTInfo;
  setGstInfo: (info: GSTInfo) => void;
  nameErrors: { [key: string]: string };
  setNameErrors: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export default function GSTInfoForm({
  showGST,
  setShowGST,
  gstInfo,
  setGstInfo,
  nameErrors,
  setNameErrors,
}: GSTInfoFormProps) {
  const updateGSTField = (field: keyof GSTInfo, value: string) => {
    setGstInfo({ ...gstInfo, [field]: value });
    if (nameErrors[`gst_${field}`]) {
      setNameErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`gst_${field}`];
        return newErrors;
      });
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Input
              type="checkbox"
              id="showGST"
              checked={showGST}
              onChange={(e) => setShowGST(e.target.checked)}
              className="w-4 h-4 text-[#234977] rounded border-gray-300 focus:ring-[#234977]"
            />
            <Label htmlFor="showGST" className="text-sm font-medium text-gray-700">
              I have a GST number
            </Label>
          </div>
        </div>

        {showGST && (
          <div className="space-y-3 sm:space-y-4 mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="gst-number" className="mb-1 text-xs text-gray-700">
                  GST Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gst-number"
                  name="gstNumber"
                  autoComplete="off"
                  required
                  type="text"
                  value={gstInfo.gstNumber}
                  onChange={(e) => updateGSTField('gstNumber', e.target.value.toUpperCase())}
                  onBlur={(e) => {
                    const value = e.target.value;
                    if (
                      value &&
                      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)
                    ) {
                      setNameErrors((prev) => ({
                        ...prev,
                        gst_number: 'Please enter a valid GST number',
                      }));
                    } else {
                      setNameErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors['gst_number'];
                        return newErrors;
                      });
                    }
                  }}
                  aria-invalid={!!(nameErrors['gst_number'])}
              className="w-full h-9 text-xs sm:text-sm"
                  placeholder="Enter GST number"
                />
                {nameErrors['gst_number'] && (
                  <p className="text-xs text-red-500 mt-1">{nameErrors['gst_number']}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gst-registered-name" className="mb-1 text-xs text-gray-700">
                  Registered Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gst-registered-name"
                  name="gstRegisteredName"
                  autoComplete="section-gst organization"
                  required
                  type="text"
                  value={gstInfo.registeredName}
                  onChange={(e) => updateGSTField('registeredName', e.target.value.toUpperCase())}
                  aria-invalid={!!(nameErrors['gst_name'])}
              className="w-full h-9 text-xs sm:text-sm"
                  placeholder="Enter registered business name"
                />
                {nameErrors['gst_name'] && (
                  <p className="text-xs text-red-500 mt-1">{nameErrors['gst_name']}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="gst-email" className="mb-1 text-xs text-gray-700">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="gst-email"
                  name="gstEmail"
                  autoComplete="section-gst email"
                  inputMode="email"
                  required
                  type="email"
                  value={gstInfo.email}
                  onChange={(e) => updateGSTField('email', e.target.value.toLowerCase())}
                  aria-invalid={!!(nameErrors['gst_email'])}
              className="w-full h-9 text-xs sm:text-sm"
                  placeholder="GST email address"
                />
                {nameErrors['gst_email'] && (
                  <p className="text-xs text-red-500 mt-1">{nameErrors['gst_email']}</p>
                )}
              </div>

              <div>
                <Label className="mb-1 text-xs text-gray-700">
                  Mobile <span className="text-red-500">*</span>
                </Label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-gray-500 text-sm font-medium pointer-events-none z-10">
                    +91
                  </span>
                  <Input
                    type="tel"
                    value={gstInfo.mobile}
                    onChange={(e) =>
                      updateGSTField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                    }
                    aria-invalid={!!(nameErrors['gst_mobile'])}
              className="w-full pl-14 pr-3 h-9 text-xs sm:text-sm"
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                {nameErrors['gst_mobile'] && (
                  <p className="text-xs text-red-500 mt-1">{nameErrors['gst_mobile']}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="gst-address" className="mb-1 text-xs text-gray-700">
                Address <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="gst-address"
                name="gstAddress"
                autoComplete="section-gst street-address"
                required
                value={gstInfo.address}
                onChange={(e) => updateGSTField('address', e.target.value)}
                rows={2}
                aria-invalid={!!(nameErrors['gst_address'])}
              className="w-full h-9 text-xs sm:text-sm"
                placeholder="Enter registered business address"
              />
              {nameErrors['gst_address'] && (
                <p className="text-xs text-red-500 mt-1">{nameErrors['gst_address']}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
