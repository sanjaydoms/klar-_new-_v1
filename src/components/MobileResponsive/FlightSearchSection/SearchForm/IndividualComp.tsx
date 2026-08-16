import React, { useRef, useEffect, useState } from 'react';
import { Calendar, Users, ChevronDown, X } from 'lucide-react';
import { searchAirports, Airport } from '@/services/flightApi';
import { useDebounce } from '@/hooks/useDebounce';
import { openDatePicker } from '@/utils/datePicker.util';

/**
 * ==================== LOCATION AUTOCOMPLETE COMPONENT ====================
 */

/**
 * Airport suggestions for a typed query, debounced.
 *
 * FromLocation and ToLocation had byte-identical copies of this, neither
 * debounced and neither gated on a minimum length — so a full pass over the
 * airport dataset ran on the very first character and on every one after it.
 *
 * `search` is exposed for the immediate case (refocusing an input that already
 * has text should reopen the list at once, not after a delay); typing goes
 * through `setTerm` and settles first.
 */
function useAirportSuggestions(delay = 300) {
  const [suggestions, setSuggestions] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [term, setTerm] = useState('');
  const debouncedTerm = useDebounce(term, delay);

  const search = async (query: string) => {
    if (query.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      setSuggestions(await searchAirports(query));
    } catch (error) {
      console.error('Error searching airports:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    search(debouncedTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTerm]);

  return { suggestions, setSuggestions, isLoading, setTerm, search };
}

interface LocationInputProps {
  label: string;
  placeholder: string;
  location: string;
  code: string;
  airportName: string;
  onLocationChange: (value: string, code: string, airportName: string) => void;
  onCodeChange: (value: string) => void;
  error?: string;
  touched?: boolean;
}

export const FromLocation: React.FC<LocationInputProps> = ({
  label,
  placeholder,
  location,
  code,
  airportName,
  onLocationChange,
  onCodeChange,
  error,
  touched,
}) => {
  const { suggestions, setSuggestions, isLoading, setTerm, search } = useAirportSuggestions();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState(location);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchQuery(location);
  }, [location]);

  // Typing: update the box immediately, let the search settle.
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(true);
    setTerm(query);
  };

  const handleSelectAirport = (airport: Airport) => {
    onLocationChange(airport.city, airport.code, airport.name);
    onCodeChange(airport.code);
    setSearchQuery(airport.city);
    setShowSuggestions(false);
    setIsInputFocused(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onLocationChange('', '', '');
    onCodeChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsInputFocused(true);
  };

  // Determine what to show based on state
  const hasData = location && code && airportName;
  const showPlaceholder = !hasData && !searchQuery && !isInputFocused;
  const displayCity = hasData ? location : isInputFocused ? searchQuery : placeholder;
  const displayCode = hasData ? code : isInputFocused ? '' : 'DEL';
  const displayAirportName = hasData ? airportName : isInputFocused ? '' : 'Indira Gandhi Int...';

  return (
    <div className="flex-1 min-w-0 text-left" ref={wrapperRef}>
      <div className="mb-1">
        <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
          {label}
        </span>
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder={showPlaceholder ? placeholder : ''}
            value={displayCity}
            onChange={(e) => {
              handleSearch(e.target.value);
              if (e.target.value === '') {
                // If cleared, reset everything
                onLocationChange('', '', '');
                onCodeChange('');
              }
            }}
            onFocus={() => {
              setIsInputFocused(true);
              setShowSuggestions(true);
              if (searchQuery.trim().length > 0) {
                // Immediate, not debounced: refocusing should reopen the list now.
                search(searchQuery);
              }
            }}
            className="bg-transparent outline-none text-sm font-semibold text-black placeholder-gray-400 w-full min-w-0 border-0 focus:ring-0 text-left"
            style={{ color: showPlaceholder ? '#9CA3AF' : '#000000' }}
          />
          {searchQuery && isInputFocused && (
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && isInputFocused && (suggestions.length > 0 || isLoading) && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-h-[7.5rem] max-h-60 overflow-y-auto w-[120%] min-w-[320px]">
            {isLoading ? (
              // Skeleton rows at real row height. A small centred spinner made
              // the panel collapse to ~44px and snap back to the full list.
              <div aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-full px-4 py-2 flex items-center justify-between">
                    <div className="flex flex-col gap-1 animate-pulse">
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                      <div className="h-2 w-20 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              suggestions.map((airport) => (
                <button
                  key={airport.code}
                  onClick={() => handleSelectAirport(airport)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-800">{airport.city}</div>
                    <div className="text-xs text-gray-500">{airport.name}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{airport.code}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px] font-bold text-black uppercase">{displayCode}</span>
        <span className="text-[11px] text-gray-300">|</span>
        <span className="text-[11px] font-medium text-black truncate text-left">
          {displayAirportName}
        </span>
      </div>
      {error && touched && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
};

export const ToLocation: React.FC<LocationInputProps> = ({
  label,
  placeholder,
  location,
  code,
  airportName,
  onLocationChange,
  onCodeChange,
  error,
  touched,
}) => {
  const { suggestions, setSuggestions, isLoading, setTerm, search } = useAirportSuggestions();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState(location);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsInputFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setSearchQuery(location);
  }, [location]);

  // Typing: update the box immediately, let the search settle.
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(true);
    setTerm(query);
  };

  const handleSelectAirport = (airport: Airport) => {
    onLocationChange(airport.city, airport.code, airport.name);
    onCodeChange(airport.code);
    setSearchQuery(airport.city);
    setShowSuggestions(false);
    setIsInputFocused(false);
  };

  const handleClear = () => {
    setSearchQuery('');
    onLocationChange('', '', '');
    onCodeChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setIsInputFocused(true);
  };

  // Determine what to show based on state
  const hasData = location && code && airportName;
  const showPlaceholder = !hasData && !searchQuery && !isInputFocused;
  const displayCity = hasData ? location : isInputFocused ? searchQuery : placeholder;
  const displayCode = hasData ? code : isInputFocused ? '' : 'DXB';
  const displayAirportName = hasData ? airportName : isInputFocused ? '' : 'Dubai International...';

  return (
    <div className="flex-1 min-w-0 text-left" ref={wrapperRef}>
      <div className="mb-1">
        <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
          {label}
        </span>
      </div>
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder={showPlaceholder ? placeholder : ''}
            value={displayCity}
            onChange={(e) => {
              handleSearch(e.target.value);
              if (e.target.value === '') {
                onLocationChange('', '', '');
                onCodeChange('');
              }
            }}
            onFocus={() => {
              setIsInputFocused(true);
              setShowSuggestions(true);
              if (searchQuery.trim().length > 0) {
                // Immediate, not debounced: refocusing should reopen the list now.
                search(searchQuery);
              }
            }}
            className="bg-transparent outline-none text-sm font-semibold text-black placeholder-gray-400 w-full min-w-0 border-0 focus:ring-0 text-left"
            style={{ color: showPlaceholder ? '#9CA3AF' : '#000000' }}
          />
          {searchQuery && isInputFocused && (
            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && isInputFocused && (suggestions.length > 0 || isLoading) && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-h-[7.5rem] max-h-60 overflow-y-auto w-[120%] min-w-[320px] max-w-[500px]">
            {isLoading ? (
              // Skeleton rows at real row height. A small centred spinner made
              // the panel collapse to ~44px and snap back to the full list.
              <div aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-full px-4 py-2 flex items-center justify-between">
                    <div className="flex flex-col gap-1 animate-pulse">
                      <div className="h-3 w-32 bg-gray-200 rounded" />
                      <div className="h-2 w-20 bg-gray-100 rounded" />
                    </div>
                    <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              suggestions.map((airport) => (
                <button
                  key={airport.code}
                  onClick={() => handleSelectAirport(airport)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-gray-800">{airport.city}</div>
                    <div className="text-xs text-gray-500">{airport.name}</div>
                  </div>
                  <div className="text-sm font-bold text-primary">{airport.code}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 mt-0.5">
        <span className="text-[11px] font-bold text-black uppercase">{displayCode}</span>
        <span className="text-[11px] text-gray-300">|</span>
        <span className="text-[11px] font-medium text-black truncate text-left">
          {displayAirportName}
        </span>
      </div>
      {error && touched && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
};

/**
 * ==================== DATE FIELD COMPONENT ====================
 */

interface DateFieldProps {
  label: string;
  value: string;
  min?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
}

export const DateField: React.FC<DateFieldProps> = ({
  label,
  value,
  min,
  placeholder = 'Select date',
  onChange,
  error,
  touched,
  disabled = false,
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'dd-mm-yyyy';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <div>
      <label className="text-xs font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
        {label}
      </label>
      {/* One handler here covers all three call sites of this shared field
          (SearchForm's Departure and Return, and MultiCityForm). A disabled
          input never dispatches click, so the disabled Return case needs no
          extra guard. */}
      <div
        onClick={openDatePicker}
        className={`flex items-center border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 mt-1 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          key={min + value}
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent outline-none flex-1 text-sm text-gray-700 min-w-0 w-full"
          placeholder={placeholder}
          disabled={disabled}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">{formatDate(value)}</div>
      {error && touched && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
};

/**
 * ==================== TRAVELLER OPTIONS COMPONENT ====================
 */

interface TravellerOptionsProps {
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
  onAdultChange: (count: number) => void;
  onChildChange: (count: number) => void;
  onInfantChange: (count: number) => void;
  onClassChange: (value: string) => void;
}

export const TravellerOptions: React.FC<TravellerOptionsProps> = ({
  adults,
  children,
  infants,
  travelClass,
  onAdultChange,
  onChildChange,
  onInfantChange,
  onClassChange,
}) => {
  const totalTravellers = adults + children + infants;
  const canAddMore = totalTravellers < 9;
  const travellerTypes = [
    {
      label: 'Adults',
      sublabel: '(12+ yrs)',
      count: adults,
      min: 1,
      max: 9,
      onChange: onAdultChange,
    },
    {
      label: 'Children',
      sublabel: '(2-11 yrs)',
      count: children,
      min: 0,
      max: 8,
      onChange: onChildChange,
    },
    {
      label: 'Infants',
      sublabel: '(0-2 yrs)',
      count: infants,
      min: 0,
      max: 8,
      onChange: onInfantChange,
    },
  ];

  return (
    <div>
      <div className="space-y-3">
        {travellerTypes.map((type) => (
          <div key={type.label} className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">{type.label}</span>
              <span className="text-xs text-gray-400 ml-2">{type.sublabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => type.onChange(Math.max(type.min, type.count - 1))}
                className={`w-7 h-7 rounded-full ${type.count <= type.min ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'} text-gray-700 flex items-center justify-center text-sm font-bold transition-colors`}
              >
                -
              </button>
              <span className="font-semibold text-gray-800 w-5 text-center text-sm">
                {type.count}
              </span>
              <button
                onClick={() => {
                  if (type.label === 'Adults') {
                    if (canAddMore) {
                      type.onChange(Math.min(type.max, type.count + 1));
                    }
                  } else if (type.label === 'Children') {
                    if (canAddMore) {
                      type.onChange(Math.min(type.max, type.count + 1));
                    }
                  } else if (type.label === 'Infants') {
                    if (canAddMore && infants + 1 <= adults) {
                      type.onChange(Math.min(type.max, type.count + 1));
                    }
                  }
                }}
                className={`w-7 h-7 rounded-full ${(type.label === 'Adults' && canAddMore) ||
                    (type.label === 'Children' && canAddMore) ||
                    (type.label === 'Infants' && canAddMore && infants + 1 <= adults)
                    ? 'bg-gray-200 hover:bg-gray-300'
                    : 'bg-gray-100 cursor-not-allowed'
                  } text-gray-700 flex items-center justify-center text-sm font-bold transition-colors`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 my-3"></div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Total:</span>
          <span className="text-sm text-gray-700">{adults + children + infants}</span>
          <span className="text-gray-300">|</span>
          <select
            value={travelClass}
            onChange={(e) => onClassChange(e.target.value)}
            className="text-sm text-gray-700 bg-transparent outline-none cursor-pointer focus:ring-0 border-0"
          >
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First Class">First Class</option>
          </select>
        </div>
      </div>
    </div>
  );
};

/**
 * ==================== TRAVELLER FIELD COMPONENT ====================
 */

interface TravellerFieldProps {
  label: string;
  totalPassengers: number;
  travelClass: string;
  showDropdown: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: React.ReactNode;
  error?: string;
  touched?: boolean;
}

export const TravellerField: React.FC<TravellerFieldProps> = ({
  label,
  totalPassengers,
  travelClass,
  showDropdown,
  onToggle,
  onClose,
  children,
  error,
  touched,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="relative traveller-dropdown">
      <label className="text-xs font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
        {label}
      </label>

      <div
        ref={buttonRef}
        className="flex items-center border border-gray-200 rounded-xl px-4 py-2.5 bg-gray-50 mt-1 cursor-pointer"
        onClick={onToggle}
      >
        <Users size={16} className="text-primary mr-3" />
        <div className="flex items-center justify-between flex-1">
          <span className="text-sm text-gray-700">
            {totalPassengers} Traveller{totalPassengers !== 1 ? 's' : ''} · {travelClass}
          </span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {error && touched && <div className="text-red-500 text-xs mt-1">{error}</div>}

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="border border-gray-200 rounded-xl p-4 bg-white mt-2 shadow-lg absolute z-50 w-full left-0"
        >
          {children}
        </div>
      )}
    </div>
  );
};
