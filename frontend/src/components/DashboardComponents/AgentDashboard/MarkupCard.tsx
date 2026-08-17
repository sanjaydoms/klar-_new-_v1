import React, { useState } from 'react';

interface MarkupData {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
  appliedTo: string;
}

interface MarkupCardProps {
  title: string;
  icon: React.ReactNode;
  data: MarkupData;
  onChange: (data: MarkupData) => void;
  selectedServices?: string[];
  showErrors?: boolean;
}

type MarkupType = 'percentage' | 'fixed';

const MarkupCard: React.FC<MarkupCardProps> = ({
  title,
  icon,
  data,
  onChange,
  selectedServices = [],
  showErrors = false,
}) => {
  const SERVICE_OPTIONS: readonly string[] = [
    'EVENT_MANAGEMENT',
    'TOUR_PACKAGES',
    'YACHT_CHARTER',
    'FLIGHTS',
    'TRANSFERS',
    'HOTELS',
    'VISA_SERVICES',
    'CHARTER_SERVICES',
    'GROUP_BOOKINGS',
  ];

  const getInitialMarkupType = (): MarkupType => {
    if (data.percentageMarkup && data.percentageMarkup > 0) return 'percentage';
    if (data.fixedMarkup && data.fixedMarkup > 0) return 'fixed';
    return 'percentage';
  };

  const [markupType, setMarkupType] = useState<MarkupType>(getInitialMarkupType);
  const [touched, setTouched] = useState({
    serviceType: false,
    markupValue: false,
  });

  const isServiceTypeValid = (): boolean => {
    return !!data.serviceType && data.serviceType.trim() !== '';
  };

  const isMarkupValueValid = (): boolean => {
    if (markupType === 'percentage') {
      return data.percentageMarkup > 0 && data.percentageMarkup <= 100;
    } else {
      return data.fixedMarkup > 0;
    }
  };

  const getServiceError = (): string => {
    if ((showErrors || touched.serviceType) && !isServiceTypeValid()) {
      return 'Please select a service type';
    }
    return '';
  };

  const getMarkupValueError = (): string => {
    if ((showErrors || touched.markupValue) && !isMarkupValueValid()) {
      if (markupType === 'percentage') {
        return 'Please enter a percentage markup greater than 0 and up to 100';
      } else {
        return 'Please enter a fixed markup greater than 0';
      }
    }
    return '';
  };

  const handleMarkupTypeChange = (type: MarkupType): void => {
    setMarkupType(type);
    if (type === 'percentage') {
      onChange({ ...data, percentageMarkup: data.percentageMarkup || 0, fixedMarkup: 0 });
    } else {
      onChange({ ...data, fixedMarkup: data.fixedMarkup || 0, percentageMarkup: 0 });
    }
    setTouched((prev) => ({ ...prev, markupValue: true }));
  };

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange({ ...data, serviceType: e.target.value });
    setTouched((prev) => ({ ...prev, serviceType: true }));
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = Number(e.target.value) || 0;
    onChange({ ...data, percentageMarkup: Math.min(value, 100) });
    setTouched((prev) => ({ ...prev, markupValue: true }));
  };

  const handleFixedChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ ...data, fixedMarkup: Number(e.target.value) || 0 });
    setTouched((prev) => ({ ...prev, markupValue: true }));
  };

  const formatServiceName = (service: string): string => {
    return service.replace(/_/g, ' ');
  };

  const serviceError = getServiceError();
  const markupValueError = getMarkupValueError();

  return (
    <div
      className={`border rounded-xl p-6 transition-colors ${
        serviceError || markupValueError
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 hover:border-red-200'
      }`}
    >
      <div className="flex items-center gap-3 mb-6">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>

      <div className="space-y-6">
        {/* Service Type Dropdown */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Service <span className="text-red-500">*</span>
          </label>
          <select
            value={data.serviceType || ''}
            onChange={handleServiceChange}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 bg-white ${
              serviceError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
            }`}
          >
            <option value="">Select Service</option>
            {SERVICE_OPTIONS.filter(
              (service) => service === data.serviceType || !selectedServices.includes(service),
            ).map((service) => (
              <option key={service} value={service}>
                {formatServiceName(service)}
              </option>
            ))}
          </select>
          {serviceError && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <span>⚠️</span> {serviceError}
            </p>
          )}
        </div>

        {/* Markup Type Dropdown */}
        <div>
          <label className="block text-sm text-gray-600 mb-1.5">
            Markup Type <span className="text-red-500">*</span>
          </label>
          <select
            value={markupType}
            onChange={(e) => handleMarkupTypeChange(e.target.value as MarkupType)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
          >
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed (₹)</option>
          </select>
        </div>

        {/* Conditional Field: Percentage or Fixed */}
        {markupType === 'percentage' ? (
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Percentage Markup (%) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.percentageMarkup || 0}
                onChange={handlePercentageChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 ${
                  markupValueError
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
                }`}
              />
              <span className="ml-3 text-gray-500 font-medium">%</span>
            </div>
            {markupValueError && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {markupValueError}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Applied on selected base</p>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-gray-600 mb-1.5">
              Fixed Markup (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={data.fixedMarkup || 0}
              onChange={handleFixedChange}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 ${
                markupValueError
                  ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:border-red-500 focus:ring-red-500'
              }`}
            />
            {markupValueError && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {markupValueError}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">Added per booking</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkupCard;
