import { svg } from 'leaflet';
import React from 'react';

export type FareType = 'VALUE' | 'FLEXI' | 'PREMIUM';

interface FareCardProps {
  type: FareType;
  title: string;
  subtitle?: string;
  price: string;
  features: string[];
  isPopular?: boolean;
  badge?: string;
  isSelected?: boolean;
  onSelect?: () => void;
}

const FareCard: React.FC<FareCardProps> = ({
  type,
  title,
  subtitle,
  price,
  features,
  isPopular = false,
  badge,
  isSelected = false,
  onSelect,
}) => {
  const getCardStyles = () => {
    switch (type) {
      case 'VALUE':
        return {
          border: 'border-input',
          bg: 'bg-blue-50',
          badgeBg: 'bg-primary',
          buttonBg: 'bg-primary hover:bg-primary/90',
          selectedBorder: 'border-blue-500',
          dotColor: 'bg-blue-500',
          selectedBg: 'bg-blue-50',
          accentColor: 'text-blue-600',
          bgGradient: 'from-blue-50 to-white',
          shadowColor: 'shadow-blue-100',
        };
      case 'FLEXI':
        return {
          border: 'border-input',
          bg: 'bg-purple-50',
          badgeBg: 'bg-purple-600',
          buttonBg: 'bg-purple-600 hover:bg-purple-700',
          selectedBorder: 'border-purple-500',
          dotColor: 'bg-purple-500',
          selectedBg: 'bg-purple-50',
          accentColor: 'text-purple-600',
          bgGradient: 'from-purple-50 to-white',
          shadowColor: 'shadow-purple-100',
        };
      case 'PREMIUM':
        return {
          border: 'border-input',
          bg: 'bg-amber-50',
          badgeBg: 'bg-amber-600',
          buttonBg: 'bg-amber-600 hover:bg-amber-700',
          selectedBorder: 'border-amber-500',
          dotColor: 'bg-amber-500',
          selectedBg: 'bg-amber-50',
          accentColor: 'text-amber-600',
          bgGradient: 'from-amber-50 to-white',
          shadowColor: 'shadow-amber-100',
        };
      default:
        return {
          border: 'border-input',
          bg: 'bg-gray-50',
          badgeBg: 'bg-gray-600',
          buttonBg: 'bg-gray-600 hover:bg-gray-700',
          selectedBorder: 'border-gray-500',
          dotColor: 'bg-gray-500',
          selectedBg: 'bg-gray-50',
          accentColor: 'text-gray-600',
          bgGradient: 'from-gray-50 to-white',
          shadowColor: 'shadow-gray-100',
        };
    }
  };

  const styles = getCardStyles();

  const getColorClass = () => {
    switch (type) {
      case 'VALUE':
        return 'blue';
      case 'FLEXI':
        return 'purple';
      case 'PREMIUM':
        return 'amber';
      default:
        return 'gray';
    }
  };

  const color = getColorClass();

  return (
    <div
      className={`block md:hidden lg:hidden rounded-2xl p-4 sm:p-5 relative transition-all duration-300 cursor-pointer ${
        isSelected
          ? `border-2 ${styles.selectedBorder} bg-gradient-to-br ${styles.bgGradient} shadow-lg ${styles.shadowColor} scale-[1.02]`
          : `border-2 ${styles.border} bg-white hover:shadow-xl hover:-translate-y-0.5`
      }`}
      style={{
        borderColor: isSelected ? undefined : '#E5E7EB',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#001B85';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#E5E7EB';
        }
      }}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.();
        }
      }}
    >
      {isSelected && (
        <div className="absolute top-3 left-3 z-10">
          <span
            className={`text-[10px] sm:text-xs font-bold text-white bg-${color}-600 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full shadow-md animate-pulse`}
          >
            SELECTED
          </span>
        </div>
      )}

      <button
        className={`absolute top-3 right-3 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
          isSelected
            ? `border-${color}-500 bg-${color}-500 shadow-md hover:shadow-lg`
            : 'border-gray-300 bg-white hover:border-primary hover:shadow-md'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        aria-label="Select fare"
      >
        {isSelected ? (
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-300 rounded-full hover:border-primary"></div>
        )}
      </button>

      {(isPopular || badge) && !isSelected && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <span
            className={`${
              isPopular
                ? 'bg-gradient-to-r from-orange-400 to-orange-500 shadow-lg shadow-orange-200'
                : styles.badgeBg
            } text-white text-[10px] sm:text-xs font-bold px-4 sm:px-5 py-0.5 sm:py-1 rounded-full shadow-md`}
          >
            {isPopular ? '⭐ MOST POPULAR' : badge}
          </span>
        </div>
      )}

      <div className="mb-3 sm:mb-4 pr-8 sm:pr-10">
        <div className="flex items-center space-x-2">
          <h4 className={`text-lg sm:text-xl font-bold text-gray-800`}>{title}</h4>
          {isPopular && !isSelected && <span className="text-xs text-orange-500">🔥</span>}
        </div>
        {subtitle && (
          <p className={`text-[10px] sm:text-xs font-medium ${styles.accentColor} mt-0.5`}>
            {subtitle}
          </p>
        )}
      </div>

      <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
        {features.map((feature, index) => {
          const isHighlighted =
            feature.includes('Free') ||
            feature.includes('Complimentary') ||
            feature.includes('Refundable');
          return (
            <li key={index} className="flex items-start text-xs sm:text-sm">
              <div
                className={`w-4 h-4 sm:w-5 sm:h-5 mt-0.5 mr-2 sm:mr-2.5 flex-shrink-0 rounded-full flex items-center justify-center ${
                  isHighlighted ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                <svg
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${isHighlighted ? 'text-green-600' : 'text-gray-400'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className={isHighlighted ? 'text-gray-800 font-medium' : 'text-gray-600'}>
                {feature}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t-2 border-gray-100">
        <div>
          <div className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
            Starting from
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#EF4444]">{price}</div>
        </div>
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-${color}-50 flex items-center justify-center opacity-50`}
        >
          <svg
            className={`w-5 h-5 sm:w-6 sm:h-6 text-${color}-400`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      </div>

      {isSelected && (
        <div
          className={`absolute inset-0 rounded-2xl border-2 ${styles.selectedBorder} pointer-events-none`}
        ></div>
      )}
    </div>
  );
};

export default FareCard;
