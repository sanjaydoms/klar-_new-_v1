import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode } from 'react';

interface MobileSectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
  icon?: ReactNode;
}

export const MobileSectionHeader = ({ 
  title, 
  isOpen, 
  onToggle, 
  count, 
  icon 
}: MobileSectionHeaderProps) => {
  return (
    <button 
      onClick={onToggle} 
      className="flex items-center justify-between w-full py-3 px-1 active:bg-gray-50 rounded-lg transition-colors touch-manipulation"
    >
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="text-gray-500">
            {icon}
          </span>
        )}
        <span className="text-sm font-medium text-gray-900">
          {title} {count !== undefined && count > 0 && `(${count})`}
        </span>
      </div>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-gray-500" />
      ) : (
        <ChevronDown className="w-4 h-4 text-gray-500" />
      )}
    </button>
  );
};