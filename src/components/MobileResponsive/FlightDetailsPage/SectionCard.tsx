import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  isOpen = false,
  onToggle,
}) => {
  return (
    <div
      className="bg-white rounded-xl border border-input overflow-hidden mb-3 cursor-pointer transition-all hover:border-primary"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-0 border-t border-gray-100">{children}</div>
      </div>
    </div>
  );
};

export default SectionCard;
