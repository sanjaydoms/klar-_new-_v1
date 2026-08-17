import React from 'react';
import { Plane, Building2, Tag, Percent } from 'lucide-react';

interface DisplayCardProps {
  serviceType: string;
  percentageMarkup: number;
  fixedMarkup: number;
  appliedTo: string;
}

const DisplayCard: React.FC<DisplayCardProps> = ({
  serviceType,
  percentageMarkup,
  fixedMarkup,
  appliedTo,
}) => {
  const getIcon = () => {
    switch (serviceType) {
      case 'FLIGHTS':
        return <Plane className="w-5 h-5 text-blue-600" />;
      case 'HOTELS':
        return <Building2 className="w-5 h-5 text-purple-600" />;
      default:
        return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  const formatServiceName = (service: string): string => {
    return service.replace(/_/g, ' ');
  };

  const hasPercentageMarkup = percentageMarkup > 0;
  const hasFixedMarkup = fixedMarkup > 0;

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:border-green-200 transition-colors bg-gradient-to-br from-white to-gray-50">
      <div className="flex items-center gap-3 mb-4">
        {getIcon()}
        <h3 className="font-semibold text-lg">{formatServiceName(serviceType)}</h3>
      </div>

      <div className="space-y-3">
        {/* Markup Information */}
        <div className="flex items-start gap-2">
          <Tag className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Markup Configuration</p>
            <div className="space-y-1">
              {hasPercentageMarkup && (
                <div className="flex items-center gap-2">
                  <Percent className="w-3 h-3 text-green-600" />
                  <span className="text-sm">
                    <span className="font-medium">{percentageMarkup}%</span>
                    <span className="text-gray-500 text-xs ml-1">percentage markup</span>
                  </span>
                </div>
              )}
              {hasFixedMarkup && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 font-medium text-sm">₹</span>
                  <span className="text-sm">
                    <span className="font-medium">{fixedMarkup}</span>
                    <span className="text-gray-500 text-xs ml-1">fixed markup</span>
                  </span>
                </div>
              )}
              {!hasPercentageMarkup && !hasFixedMarkup && (
                <p className="text-sm text-gray-400 italic">No markup configured</p>
              )}
            </div>
          </div>
        </div>

        {/* Applied To Information */}
        <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
          <div className="w-4 h-4" />
          <div className="flex-1">
            <p className="text-xs text-gray-500">Applied To</p>
            <p className="text-sm font-medium text-gray-700">
              {appliedTo === 'BASE_FARE' ? 'Base Fare' : appliedTo}
            </p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Status</span>
          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
        </div>
      </div>
    </div>
  );
};

export default DisplayCard;
