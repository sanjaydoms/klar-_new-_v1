import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
  icon?: ReactNode;
}

export const SectionHeader = ({ 
  title, 
  isOpen, 
  onToggle, 
  count, 
  icon 
}: SectionHeaderProps) => {
  return (
    <button 
      onClick={onToggle} 
      className="flex items-center justify-between w-full mb-2 sm:mb-3 group hover:bg-gray-50 rounded-md px-1 py-1 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
            {icon}
          </span>
        )}
        <span className="text-sm sm:text-base font-medium text-gray-900">
          {title} {count !== undefined && count > 0 && `(${count})`}
        </span>
      </div>
      {isOpen ? (
        <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
      ) : (
        <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
      )}
    </button>
  );
};