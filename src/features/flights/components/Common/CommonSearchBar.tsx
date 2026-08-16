import { useState, useEffect, useRef } from 'react';
import { Plus, Minus, X, ArrowRightLeft, MapPin, Calendar, Users } from 'lucide-react';
import LocationAutocomplete from './LocationAutocomplete';
import { CommonSearchBarProps, Segment } from '../../types/types.commonSearchbar';
import { Button } from '@/components/ui/button';

interface TripTypeFieldProps {
  tripType: 'oneway' | 'return' | 'multicity';
  className?: string;
}

export const TripTypeField = ({ tripType, className = '' }: TripTypeFieldProps) => {
  const getTripTypeLabel = () => {
    switch (tripType) {
      case 'oneway':
        return 'One Way';
      case 'return':
        return 'Round Trip';
      case 'multicity':
        return 'Multi City';
      default:
        return 'One Way';
    }
  };

  return (
    <div
      className={`flex-shrink-0 flex flex-col ${className}`}
      style={{ width: '8%', minWidth: '70px' }}
    >
      <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 mb-0.5 sm:mb-1 uppercase leading-[14px] sm:leading-[15.77px]">
        Trip Type
      </div>
      <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate leading-[19px] sm:leading-[22.08px]">
        {getTripTypeLabel()}
      </div>
    </div>
  );
};

interface FromFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const FromField = ({
  value,
  onChange,
  className = '',
  placeholder = 'From',
  disabled = false,
}: FromFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCityName = (location: string) => {
    if (!location) return 'Select city';
    return location.replace(/\([^)]*\)/g, '').trim();
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`flex-1 flex flex-col ${className}`}
      style={{ minWidth: '70px' }}
      ref={containerRef}
    >
      <div
        className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex items-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        style={{ borderWidth: '0.79px', height: '44px' }}
        onClick={handleClick}
      >
        {isEditing && !disabled ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
            <LocationAutocomplete
              value={value}
              onChange={(val) => {
                onChange(val);
              }}
              placeholder={placeholder}
              className="w-full h-full font-display text-[15px] sm:text-[16px] font-medium text-primary bg-transparent border-0 outline-none p-0"
              onBlur={handleBlur}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
              From
            </div>
            <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px]">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span>{getCityName(value)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SwapArrowProps {
  onSwap: () => void;
  className?: string;
  disabled?: boolean;
}

export const SwapArrow = ({ onSwap, className = '', disabled = false }: SwapArrowProps) => {
  return (
    <div
      className={`flex-shrink-0 p-1 rounded-full transition-colors flex items-center justify-center ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
        }`}
      style={{ width: '4%', minWidth: '28px' }}
      onClick={!disabled ? onSwap : undefined}
      aria-label="Swap origin and destination"
    >
      <ArrowRightLeft className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-black" />
    </div>
  );
};

interface ToFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export const ToField = ({ value, onChange, className = '', placeholder = 'To', disabled = false }: ToFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getCityName = (location: string) => {
    if (!location) return 'Select city';
    return location.replace(/\([^)]*\)/g, '').trim();
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`flex-1 flex flex-col ${className}`}
      style={{ minWidth: '70px' }}
      ref={containerRef}
    >
      <div
        className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex items-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        style={{ borderWidth: '0.79px', height: '44px' }}
        onClick={handleClick}
      >
        {isEditing && !disabled ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
            <LocationAutocomplete
              value={value}
              onChange={(val) => {
                onChange(val);
              }}
              placeholder={placeholder}
              className="w-full h-full font-display text-[15px] sm:text-[16px] font-medium text-primary bg-transparent border-0 outline-none p-0"
              onBlur={handleBlur}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
              To
            </div>
            <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px]">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span>{getCityName(value)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface DepartureDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  className?: string;
  disabled?: boolean;
}

export const DepartureDateField = ({
  value,
  onChange,
  minDate,
  className = '',
  disabled = false,
}: DepartureDateFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];
  const min = minDate || today;

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.showPicker?.();
        }
      }, 50);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`flex-1 flex flex-col ${className}`}
      style={{ minWidth: '70px' }}
      ref={containerRef}
    >
      <div
        className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex items-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        style={{ borderWidth: '0.79px', height: '44px' }}
        onClick={handleClick}
      >
        {isEditing && !disabled ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
            <input
              ref={inputRef}
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={min}
              className="w-full h-full font-display text-[15px] sm:text-[16px] font-medium text-primary bg-transparent border-0 outline-none p-0 leading-[19px] sm:leading-[22.08px]"
              onBlur={handleBlur}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
              Depart
            </div>
            <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px]">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span>{formatDisplayDate(value)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface ReturnDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  className?: string;
  disabled?: boolean;
}

export const ReturnDateField = ({
  value,
  onChange,
  minDate,
  className = '',
  disabled = false,
}: ReturnDateFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'Select date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.showPicker?.();
        }
      }, 50);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div
      className={`flex-1 flex flex-col ${className}`}
      style={{ minWidth: '70px' }}
      ref={containerRef}
    >
      <div
        className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex items-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        style={{ borderWidth: '0.79px', height: '44px' }}
        onClick={handleClick}
      >
        {isEditing && !disabled ? (
          <div onClick={(e) => e.stopPropagation()} className="w-full h-full flex items-center">
            <input
              ref={inputRef}
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={minDate}
              className="w-full h-full font-display text-[15px] sm:text-[16px] font-medium text-primary bg-transparent border-0 outline-none p-0 leading-[19px] sm:leading-[22.08px]"
              onBlur={handleBlur}
              autoFocus
            />
          </div>
        ) : (
          <div className="flex flex-col w-full">
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
              Return
            </div>
            <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px]">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
              <span>{formatDisplayDate(value)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PassengerClassFieldProps {
  paxInfo: {
    ADULT: number;
    CHILD: number;
    INFANT: number;
  };
  cabinClass: string;
  onPaxChange: (paxInfo: any) => void;
  onCabinChange: (cabinClass: string) => void;
  className?: string;
  showDropdown?: boolean;
  onDropdownToggle?: (show: boolean) => void;
  editingField?: string | null;
  onFieldEdit?: (fieldName: string) => void;
  onApply?: () => void;
  disabled?: boolean;
}

export const PassengerClassField = ({
  paxInfo,
  cabinClass,
  onPaxChange,
  onCabinChange,
  className = '',
  showDropdown = false,
  onDropdownToggle,
  editingField = null,
  onFieldEdit,
  onApply,
  disabled = false,
}: PassengerClassFieldProps) => {
  const travelerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (travelerRef.current && !travelerRef.current.contains(event.target as Node)) {
        if (onDropdownToggle) onDropdownToggle(false);
        if (onFieldEdit) onFieldEdit('');
        setError('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onDropdownToggle, onFieldEdit]);

  const handleFieldClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    const isCurrentlyOpen = showDropdown && editingField === 'passenger';

    if (isCurrentlyOpen) {
      if (onDropdownToggle) onDropdownToggle(false);
      if (onFieldEdit) onFieldEdit('');
      setError('');
    } else {
      if (onFieldEdit) onFieldEdit('passenger');
      if (onDropdownToggle) onDropdownToggle(true);
      setError('');
    }
  };

  const validatePax = (newPax: any): boolean => {
    const total = newPax.ADULT + newPax.CHILD + newPax.INFANT;

    if (total > 9) {
      setError('Total travellers cannot exceed 9');
      return false;
    }

    if (newPax.INFANT > newPax.ADULT) {
      setError('Infants cannot exceed adults');
      return false;
    }

    setError('');
    return true;
  };

  const handlePaxChange = (type: string, operation: 'increment' | 'decrement') => {
    if (disabled) return;

    const currentValue = paxInfo[type as keyof typeof paxInfo];
    const newValue = operation === 'increment' ? currentValue + 1 : Math.max(0, currentValue - 1);

    if (operation === 'decrement' && newValue === 0 && type === 'ADULT') {
      return;
    }

    const newPax = {
      ...paxInfo,
      [type]: newValue,
    };

    if (validatePax(newPax)) {
      onPaxChange(newPax);
    }
  };

  const handleApply = () => {
    if (disabled) return;

    if (validatePax(paxInfo)) {
      if (onApply) onApply();
      if (onDropdownToggle) onDropdownToggle(false);
    }
  };

  const formatPaxDisplay = () => {
    let display = `${paxInfo.ADULT} Adult${paxInfo.ADULT > 1 ? 's' : ''}`;
    if (paxInfo.CHILD > 0) {
      display += `, ${paxInfo.CHILD} Child${paxInfo.CHILD > 1 ? 'ren' : ''}`;
    }
    if (paxInfo.INFANT > 0) {
      display += `, ${paxInfo.INFANT} Infant${paxInfo.INFANT > 1 ? 's' : ''}`;
    }
    const formattedCabin =
      cabinClass.charAt(0) + cabinClass.slice(1).toLowerCase().replace('_', ' ');
    return `${display}, ${formattedCabin}`;
  };

  return (
    <div
      className={`flex-1 relative flex flex-col ${className}`}
      style={{ minWidth: '80px' }}
      ref={travelerRef}
    >
      <div
        className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex flex-col justify-center transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
          }`}
        style={{ borderWidth: '0.79px', height: '44px' }}
        onClick={handleFieldClick}
      >
        <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
          Passenger & Class
        </div>
        <div className="font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px]">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
          <span>{formatPaxDisplay()}</span>
        </div>

        {showDropdown && editingField === 'passenger' && !disabled && (
          <div
            className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-3 sm:p-4 z-50 w-64 sm:w-72"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3 sm:space-y-4">
              {['ADULT', 'CHILD', 'INFANT'].map((type) => {
                const maxValue = type === 'ADULT'
                  ? 9 - paxInfo.CHILD - paxInfo.INFANT
                  : type === 'CHILD'
                    ? 9 - paxInfo.ADULT - paxInfo.INFANT
                    : Math.min(paxInfo.ADULT, 9 - paxInfo.ADULT - paxInfo.CHILD);

                return (
                  <div key={type} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-xs sm:text-sm">{type}</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">
                        {type === 'ADULT'
                          ? '12+ years'
                          : type === 'CHILD'
                            ? '2-12 years'
                            : 'Under 2 years'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        type="button"
                        onClick={() => handlePaxChange(type, 'decrement')}
                        disabled={type === 'ADULT' ? paxInfo.ADULT <= 1 : paxInfo[type as keyof typeof paxInfo] <= 0}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center hover:bg-gray-50 ${(type === 'ADULT' ? paxInfo.ADULT <= 1 : paxInfo[type as keyof typeof paxInfo] <= 0) ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                      <span className="w-5 sm:w-6 text-center text-xs sm:text-sm">
                        {paxInfo[type as keyof typeof paxInfo]}
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePaxChange(type, 'increment')}
                        disabled={paxInfo[type as keyof typeof paxInfo] >= maxValue}
                        className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border flex items-center justify-center hover:bg-gray-50 ${paxInfo[type as keyof typeof paxInfo] >= maxValue ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-2 text-[10px] sm:text-xs text-red-500 font-medium">
                {error}
              </div>
            )}

            <div className="mt-3 sm:mt-4 pt-3 border-t">
              <select
                value={cabinClass}
                onChange={(e) => onCabinChange(e.target.value)}
                className="w-full border rounded px-2 py-1 text-xs sm:text-sm"
                disabled={disabled}
              >
                <option value="ECONOMY">Economy</option>
                <option value="PREMIUM_ECONOMY">Premium Economy</option>
                <option value="BUSINESS">Business</option>
                <option value="FIRST">First Class</option>
              </select>
            </div>
            <div className="mt-3 pt-3 border-t flex justify-end">
              <button
                type="button"
                onClick={handleApply}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface SearchButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  className?: string;
  buttonText?: string;
  mobileText?: string;
}

export const SearchButton = ({
  onClick,
  isLoading = false,
  className = '',
  buttonText = 'Search Flights',
  mobileText = 'Search Flights',
}: SearchButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className={`flex-shrink-0 bg-accent font-bold text-[14px] text-white sm:text-[16px] px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg transition-opacity flex items-center hover:opacity-90 ${className}`}
      style={{
        minWidth: '120px',
        width: 'auto',
        height: '44px',
      }}
      aria-label="Search Results"
    >
      <span className="hidden xs:inline font-bold">{buttonText}</span>
      <span className="xs:hidden font-bold">{mobileText}</span>
    </Button>
  );
};

interface AddSegmentButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const AddSegmentButton = ({ onClick, className = '', disabled = false }: AddSegmentButtonProps) => {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className={`text-blue-600 hover:text-blue-800 text-[11px] sm:text-sm font-medium flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded hover:bg-blue-50 transition-colors whitespace-nowrap flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      aria-label="Add another city"
      disabled={disabled}
    >
      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">Add another city</span>
      <span className="sm:hidden">Add</span>
    </button>
  );
};

interface RemoveSegmentButtonProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export const RemoveSegmentButton = ({ onClick, className = '', disabled = false }: RemoveSegmentButtonProps) => {
  return (
    <button
      onClick={!disabled ? onClick : undefined}
      className={`p-1 sm:p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex-shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      aria-label="Remove segment"
      disabled={disabled}
    >
      <X className="w-3 h-3 sm:w-4 sm:h-4" />
    </button>
  );
};

export default function CommonSearchBarEnhanced({
  onSearch,
  isLoading = false,
  initialParams,
  className = '',
}: CommonSearchBarProps) {
  const [tripType] = useState<'oneway' | 'return' | 'multicity'>(
    initialParams?.tripType || 'oneway',
  );

  const [from, setFrom] = useState(initialParams?.from || '');
  const [to, setTo] = useState(initialParams?.to || '');
  const [departureDate, setDepartureDate] = useState(initialParams?.departureDate || '');
  const [returnDate, setReturnDate] = useState(initialParams?.returnDate || '');

  const [segments, setSegments] = useState<Segment[]>(
    initialParams?.segments || [
      { from: '', to: '', date: '' },
      { from: '', to: '', date: '' },
    ],
  );

  const [paxInfo, setPaxInfo] = useState({
    ADULT: initialParams?.paxInfo?.ADULT || 1,
    CHILD: initialParams?.paxInfo?.CHILD || 0,
    INFANT: initialParams?.paxInfo?.INFANT || 0,
  });
  const [cabinClass, setCabinClass] = useState(initialParams?.cabinClass || 'ECONOMY');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingSegmentIndex, setEditingSegmentIndex] = useState<number | null>(null);
  const [editingSegmentField, setEditingSegmentField] = useState<string | null>(null);
  const [showTravelerDropdown, setShowTravelerDropdown] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const getCityName = (location: string) => {
    if (!location) return 'Not selected';
    return location.replace(/\([^)]*\)/g, '').trim();
  };

  useEffect(() => {
    if (initialParams) {
      if (initialParams.from !== undefined) {
        setFrom(initialParams.from);
      }
      if (initialParams.to !== undefined) {
        setTo(initialParams.to);
      }
      if (initialParams.departureDate !== undefined) {
        setDepartureDate(initialParams.departureDate);
      }
      if (initialParams.returnDate !== undefined) {
        setReturnDate(initialParams.returnDate);
      }
      if (initialParams.paxInfo) {
        setPaxInfo({
          ADULT: initialParams.paxInfo.ADULT || 1,
          CHILD: initialParams.paxInfo.CHILD || 0,
          INFANT: initialParams.paxInfo.INFANT || 0,
        });
      }
      if (initialParams.cabinClass) {
        setCabinClass(initialParams.cabinClass);
      }
      if (initialParams.tripType === 'multicity' && initialParams.segments) {
        const validSegments = initialParams.segments.map((seg: any) => ({
          from: seg.from || '',
          to: seg.to || '',
          date: seg.date || '',
        }));
        setSegments(validSegments);
      }
    }
  }, [initialParams]);

  const handleSwapLocations = () => {
    if (isLoading) return;
    setFrom(to);
    setTo(from);
  };

  const handleAddSegment = () => {
    if (isLoading) return;
    if (segments.length < 5) {
      setSegments([...segments, { from: '', to: '', date: '' }]);
    }
  };

  const handleRemoveSegment = (index: number) => {
    if (isLoading) return;
    if (segments.length > 2) {
      const newSegments = [...segments];
      newSegments.splice(index, 1);
      setSegments(newSegments);
    }
  };

  const updateSegment = (index: number, field: keyof Segment, value: string) => {
    if (isLoading) return;
    const newSegments = [...segments];
    if (!newSegments[index]) return;
    newSegments[index][field] = value;
    setSegments(newSegments);
  };

  const handleSegmentFieldClick = (index: number, field: string) => {
    if (isLoading) return;
    setEditingSegmentIndex(index);
    setEditingSegmentField(field);

    // The segment date input mounts only after the state flip above, so the
    // wrapper-level openDatePicker util can't find it at click time. It
    // autofocuses on mount; open its picker once it exists. Same guards as
    // datePicker.util: showPicker throws without user activation or on a
    // non-mutable input, and older engines lack it entirely.
    if (field === 'date') {
      setTimeout(() => {
        const input = document.activeElement;
        if (input instanceof HTMLInputElement && input.type === 'date') {
          try {
            input.showPicker?.();
          } catch {
            /* keep focus; the field stays typeable */
          }
        }
      }, 50);
    }
  };

  const handleSegmentFieldBlur = () => {
    setEditingSegmentIndex(null);
    setEditingSegmentField(null);
  };

  const handleSearch = () => {
    const extractCode = (loc: string) => {
      if (!loc) return '';
      const match = loc.match(/\(([A-Z]{3})\)/);
      return match ? match[1] : loc;
    };

    let routeInfos: any[] = [];

    if (tripType === 'multicity') {
      const validSegments = segments.filter((seg) => seg.from && seg.to && seg.date);

      if (validSegments.length === 0) {
        console.error('No valid segments to search');
        return;
      }

      routeInfos = validSegments.map((seg) => ({
        fromCityOrAirport: { code: extractCode(seg.from) },
        toCityOrAirport: { code: extractCode(seg.to) },
        travelDate: seg.date,
      }));
    } else {
      routeInfos.push({
        fromCityOrAirport: { code: extractCode(from) },
        toCityOrAirport: { code: extractCode(to) },
        travelDate: departureDate,
      });

      if (tripType === 'return' && returnDate) {
        routeInfos.push({
          fromCityOrAirport: { code: extractCode(to) },
          toCityOrAirport: { code: extractCode(from) },
          travelDate: returnDate,
        });
      }
    }

    const payload = {
      searchQuery: {
        cabinClass,
        paxInfo: {
          ADULT: paxInfo.ADULT,
          CHILD: paxInfo.CHILD,
          INFANT: paxInfo.INFANT,
        },
        routeInfos,
        searchModifiers: {
          isDirectFlight: true,
          isConnectingFlight: true,
        },
      },
    };

    const searchParamsToStore = {
      tripType,
      from,
      to,
      departureDate,
      returnDate,
      class: cabinClass,
      paxInfo: {
        ADULT: paxInfo.ADULT,
        CHILD: paxInfo.CHILD,
        INFANT: paxInfo.INFANT,
      },
      travelerDetails: {
        adults: paxInfo.ADULT,
        children: paxInfo.CHILD,
        infants: paxInfo.INFANT,
        total: paxInfo.ADULT + paxInfo.CHILD + paxInfo.INFANT,
      },
      segments: tripType === 'multicity' ? segments : undefined,
    };

    sessionStorage.setItem('flightSearchParams', JSON.stringify(searchParamsToStore));

    if (tripType === 'multicity') {
      sessionStorage.setItem(
        'multiCitySearchParams',
        JSON.stringify({
          segments: segments,
          travelers: `${paxInfo.ADULT + paxInfo.CHILD + paxInfo.INFANT} Traveler${paxInfo.ADULT + paxInfo.CHILD + paxInfo.INFANT > 1 ? 's' : ''}, ${cabinClass}`,
          class: cabinClass,
          travelerDetails: {
            adults: paxInfo.ADULT,
            children: paxInfo.CHILD,
            infants: paxInfo.INFANT,
            total: paxInfo.ADULT + paxInfo.CHILD + paxInfo.INFANT,
          },
          paxInfo: { ADULT: paxInfo.ADULT, CHILD: paxInfo.CHILD, INFANT: paxInfo.INFANT },
        }),
      );
    } else {
      sessionStorage.setItem('flightSearchParams', JSON.stringify(searchParamsToStore));
    }

    onSearch(payload);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleFieldEdit = (fieldName: string) => {
    if (isLoading) return;
    setEditingField(editingField === fieldName ? null : fieldName);
  };

  const renderSegmentRow = (segment: Segment, index: number, isFirst: boolean, isLast: boolean) => {
    const showAddButton = isLast && segments.length < 5;
    const showRemoveButton = !isFirst;

    return (
      <div
        key={index}
        className={`bg-white px-2 sm:px-3 py-2 rounded-lg border-1 border-gray-500 w-full ${isLoading ? 'opacity-60' : ''
          }`}
      >
        <div className="flex items-center gap-2 w-full">
          {isFirst ? (
            <TripTypeField tripType="multicity" className="w-[8%] min-w-[70px]" />
          ) : (
            <div className="w-[8%] min-w-[70px] flex-shrink-0"></div>
          )}

          <div className="flex-1 min-w-[70px] flex flex-col">
            <div
              className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex flex-col justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              style={{ borderWidth: '0.79px', height: '44px' }}
            >
              <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
                From
              </div>
              {editingSegmentIndex === index && editingSegmentField === 'from' && !isLoading ? (
                <LocationAutocomplete
                  value={segment.from || ''}
                  onChange={(val) => updateSegment(index, 'from', val)}
                  placeholder="From"
                  className="w-full font-display text-[15px] sm:text-[16px] font-medium text-primary leading-[19px] sm:leading-[22.08px]"
                  onBlur={handleSegmentFieldBlur}
                  autoFocus
                />
              ) : (
                <div
                  className={`font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px] ${!isLoading ? 'cursor-pointer hover:text-blue-600' : ''
                    }`}
                  onClick={() => handleSegmentFieldClick(index, 'from')}
                >
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span>{getCityName(segment.from || '') || 'Select city'}</span>
                </div>
              )}
            </div>
          </div>

          <SwapArrow onSwap={handleSwapLocations} disabled={isLoading} />

          <div className="flex-1 min-w-[70px] flex flex-col">
            <div
              className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex flex-col justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              style={{ borderWidth: '0.79px', height: '44px' }}
            >
              <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
                To
              </div>
              {editingSegmentIndex === index && editingSegmentField === 'to' && !isLoading ? (
                <LocationAutocomplete
                  value={segment.to || ''}
                  onChange={(val) => updateSegment(index, 'to', val)}
                  placeholder="To"
                  className="w-full font-display text-[15px] sm:text-[16px] font-medium text-primary leading-[19px] sm:leading-[22.08px]"
                  onBlur={handleSegmentFieldBlur}
                  autoFocus
                />
              ) : (
                <div
                  className={`font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px] ${!isLoading ? 'cursor-pointer hover:text-blue-600' : ''
                    }`}
                  onClick={() => handleSegmentFieldClick(index, 'to')}
                >
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span>{getCityName(segment.to || '') || 'Select city'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[70px] flex flex-col">
            <div
              className={`bg-[#F8F9FA] border rounded-lg p-1 sm:p-1.5 flex flex-col justify-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              style={{ borderWidth: '0.79px', height: '44px' }}
            >
              <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.16em] text-gray-400 uppercase leading-[14px] sm:leading-[15.77px]">
                Depart
              </div>
              {editingSegmentIndex === index && editingSegmentField === 'date' && !isLoading ? (
                <input
                  type="date"
                  value={segment.date || ''}
                  onChange={(e) => updateSegment(index, 'date', e.target.value)}
                  min={today}
                  className="font-display text-[15px] sm:text-[16px] font-medium text-primary border rounded px-1 sm:px-1.5 py-0.5 w-full bg-transparent leading-[19px] sm:leading-[22.08px]"
                  onBlur={handleSegmentFieldBlur}
                  autoFocus
                />
              ) : (
                <div
                  className={`font-display text-[15px] sm:text-[16px] font-medium text-primary truncate flex items-center gap-1.5 leading-[19px] sm:leading-[22.08px] ${!isLoading ? 'cursor-pointer hover:text-blue-600' : ''
                    }`}
                  onClick={() => handleSegmentFieldClick(index, 'date')}
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                  <span>{formatDisplayDate(segment.date || '') || 'Select date'}</span>
                </div>
              )}
            </div>
          </div>

          {isFirst ? (
            <PassengerClassField
              paxInfo={paxInfo}
              cabinClass={cabinClass}
              onPaxChange={setPaxInfo}
              onCabinChange={setCabinClass}
              showDropdown={showTravelerDropdown}
              onDropdownToggle={setShowTravelerDropdown}
              editingField={editingField}
              onFieldEdit={handleFieldEdit}
              onApply={() => setEditingField(null)}
              className="flex-1 min-w-[80px]"
              disabled={isLoading}
            />
          ) : (
            <div className="flex-1 min-w-[80px] flex-shrink-0"></div>
          )}

          {isFirst ? (
            <SearchButton onClick={handleSearch} isLoading={isLoading} />
          ) : (
            <div
              className="flex-shrink-0"
              style={{ minWidth: '120px', width: 'auto', height: '44px' }}
            ></div>
          )}

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {showAddButton && <AddSegmentButton onClick={handleAddSegment} disabled={isLoading} />}
            {showRemoveButton && <RemoveSegmentButton onClick={() => handleRemoveSegment(index)} disabled={isLoading} />}
          </div>
        </div>
      </div>
    );
  };

  const renderOneWay = () => {
    return (
      <div
        className={`relative bg-white px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-lg border-1 border-gray-500 transition-shadow w-full ${isLoading ? 'opacity-60' : ''
          }`}
        style={{ padding: '10px' }}
      >
        <div className="flex items-center gap-2 w-full">
          <TripTypeField tripType="oneway" />
          <FromField value={from} onChange={setFrom} disabled={isLoading} />
          <SwapArrow onSwap={handleSwapLocations} disabled={isLoading} />
          <ToField value={to} onChange={setTo} disabled={isLoading} />
          <DepartureDateField value={departureDate} onChange={setDepartureDate} disabled={isLoading} />
          <PassengerClassField
            paxInfo={paxInfo}
            cabinClass={cabinClass}
            onPaxChange={setPaxInfo}
            onCabinChange={setCabinClass}
            showDropdown={showTravelerDropdown}
            onDropdownToggle={setShowTravelerDropdown}
            editingField={editingField}
            onFieldEdit={handleFieldEdit}
            onApply={() => setEditingField(null)}
            disabled={isLoading}
          />
          <SearchButton onClick={handleSearch} isLoading={isLoading} />
        </div>
      </div>
    );
  };

  const renderReturn = () => {
    return (
      <div
        className={`relative bg-white px-2 sm:px-3 md:px-4 py-2 sm:py-3 rounded-lg border-1 border-gray-500 transition-shadow w-full ${isLoading ? 'opacity-60' : ''
          }`}
        style={{ padding: '10px' }}
      >
        <div className="flex items-center gap-2 w-full">
          <TripTypeField tripType="return" />
          <FromField value={from} onChange={setFrom} disabled={isLoading} />
          <SwapArrow onSwap={handleSwapLocations} disabled={isLoading} />
          <ToField value={to} onChange={setTo} disabled={isLoading} />
          <DepartureDateField value={departureDate} onChange={setDepartureDate} disabled={isLoading} />
          <ReturnDateField value={returnDate} onChange={setReturnDate} minDate={departureDate} disabled={isLoading} />
          <PassengerClassField
            paxInfo={paxInfo}
            cabinClass={cabinClass}
            onPaxChange={setPaxInfo}
            onCabinChange={setCabinClass}
            showDropdown={showTravelerDropdown}
            onDropdownToggle={setShowTravelerDropdown}
            editingField={editingField}
            onFieldEdit={handleFieldEdit}
            onApply={() => setEditingField(null)}
            disabled={isLoading}
          />
          <SearchButton onClick={handleSearch} isLoading={isLoading} />
        </div>
      </div>
    );
  };

  const renderMultiCity = () => {
    return (
      <div className="space-y-2 w-full">
        {segments.map((segment, index) => {
          const isFirst = index === 0;
          const isLast = index === segments.length - 1;
          return renderSegmentRow(segment, index, isFirst, isLast);
        })}
      </div>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {tripType === 'multicity' && renderMultiCity()}
      {tripType === 'oneway' && renderOneWay()}
      {tripType === 'return' && renderReturn()}
    </div>
  );
}