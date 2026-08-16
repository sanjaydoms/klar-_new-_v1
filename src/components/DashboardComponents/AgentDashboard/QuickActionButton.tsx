import React from 'react';
import { LucideIcon } from 'lucide-react';

interface QuickActionButtonProps {
  icon: React.ReactNode | LucideIcon;
  label: string;
  onClick?: () => void;
  href?: string;
  color?: 'default' | 'primary' | 'blue' | 'purple';
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onClick,
  href,
  color = 'default',
}) => {
  const colorClasses = {
    default: 'hover:bg-gray-50 border-gray-200',
    primary: 'hover:bg-red-50 border-red-200 text-red-600',
    blue: 'hover:bg-blue-50 border-blue-200 text-blue-600',
    purple: 'hover:bg-purple-50 border-purple-200 text-purple-600',
  };

  const handleClick = () => {
    if (href) {
      window.location.href = href;
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        group flex flex-col items-center justify-center 
        bg-white border border-gray-200 rounded-2xl 
        p-6 hover:shadow-md transition-all duration-200 
        active:scale-95 w-full h-full
        ${colorClasses[color]}
      `}
    >
      <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-50 group-hover:bg-white transition-colors mb-4">
        {typeof icon === 'function'
          ? React.createElement(icon as LucideIcon, {
              className: 'w-6 h-6 text-gray-700 group-hover:text-red-600 transition-colors',
            })
          : icon}
      </div>

      <p className="font-medium text-gray-800 text-center text-sm leading-tight">{label}</p>
    </button>
  );
};

export default QuickActionButton;
