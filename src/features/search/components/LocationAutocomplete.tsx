import React from 'react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { searchAirports, Airport } from '../../../services/flightApi';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSelect?: (airport: Airport) => void;
  disabled?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  onSelect,
  disabled = false,
}: LocationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredAirports, setFilteredAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search function
  const debouncedSearch = useCallback((query: string) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results
    if (!query || query.trim().length === 0) {
      setFilteredAirports([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Set new timer
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAirports(query);
        setFilteredAirports(results);
        setIsOpen(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching airports:', error);
        setFilteredAirports([]);
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce
  }, []);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    debouncedSearch(inputValue);
  };

  const handleSelect = (airport: Airport) => {
    const formattedValue = `${airport.city} (${airport.code}), ${airport.country}`;
    onChange(formattedValue);
    setIsOpen(false);
    setSelectedIndex(-1);

    // Call onSelect callback if provided
    if (onSelect) {
      onSelect(airport);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredAirports.length === 0) {
      if (e.key === 'ArrowDown' && value.length > 0) {
        debouncedSearch(value);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredAirports.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredAirports.length) {
          handleSelect(filteredAirports[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length > 0) {
              debouncedSearch(value);
            }
          }}
          placeholder={placeholder}
          className={className}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && filteredAirports.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg min-h-[13.5rem] max-h-64 overflow-y-auto">
          {filteredAirports.map((airport, index) => (
            <button
              key={airport.code}
              onClick={() => handleSelect(airport)}
              className={`w-full px-4 py-3 text-left flex items-start gap-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                index === selectedIndex ? 'bg-blue-100' : 'hover:bg-blue-50'
              }`}
            >
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{airport.city}</span>
                  <span className="text-sm font-medium text-blue-600">{airport.code}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{airport.name}</p>
                <p className="text-xs text-gray-400">{airport.country}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && !isLoading && filteredAirports.length === 0 && value.length > 0 && (
        <div className="absolute z-50 flex min-h-[13.5rem] w-full mt-1 items-center justify-center bg-white border-2 border-gray-200 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500 text-center">No airports found</p>
        </div>
      )}
    </div>
  );
}
