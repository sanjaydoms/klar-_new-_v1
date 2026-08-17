import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { searchAirports } from '../../../../services/flightApi';
import { useDebounce } from '../../../../hooks/useDebounce';

interface Location {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  type: 'airport' | 'city';
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'City or Airport',
  className = '',
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  // Only a keystroke sets this, so selecting a suggestion cannot re-trigger a
  // search. See the Common/ variant for the same reasoning.
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchAirports(searchTerm);

      const locations: Location[] = results.map((airport) => ({
        id: airport.code, // Using airport code as unique ID
        name: airport.name,
        code: airport.code,
        city: airport.city,
        country: airport.country,
        type: 'airport',
      }));

      setSuggestions(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Search the settled term rather than every keystroke.
  useEffect(() => {
    fetchSuggestions(debouncedSearchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setSearchTerm(newValue);
  };

  const handleSelectLocation = (location: Location) => {
    const displayValue = `${location.city} (${location.code}), ${location.country}`;
    onChange(displayValue);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    if (value.length >= 2) {
      fetchSuggestions(value);
    }
    setShowSuggestions(true);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`w-full px-3 py-2.5 text-sm font-medium text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-300 ${className}`}
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>

      {/* value.length >= 2 keeps the "No locations found" branch reachable —
          see the Common/ variant. */}
      {showSuggestions && (suggestions.length > 0 || isLoading || value.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-h-[13.5rem] max-h-80 overflow-y-auto">
          {isLoading ? (
            <ul className="py-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-center justify-between animate-pulse">
                    <div className="flex flex-col gap-1.5">
                      <div className="h-3.5 w-40 bg-gray-200 rounded" />
                      <div className="h-2.5 w-24 bg-gray-100 rounded" />
                    </div>
                    <div className="h-6 w-12 bg-gray-100 rounded" />
                  </div>
                </li>
              ))}
            </ul>
          ) : suggestions.length > 0 ? (
            <ul className="py-1">
              {suggestions.map((location) => (
                <li key={location.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">
                            {location.city}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {location.code}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{location.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{location.country}</p>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <span
                          className={`text-xs px-2 py-1 rounded ${location.type === 'airport' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}
                        >
                          {location.type === 'airport' ? 'Airport' : 'City'}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : value.length >= 2 ? (
            <div className="flex min-h-[13.5rem] items-center justify-center p-4 text-center text-gray-500">
              No locations found
            </div>
          ) : null}
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-1 px-3">
          <div className="bg-gray-800 text-white text-xs rounded-lg py-2 px-3">
            <div className="flex items-center justify-between">
              <span>Search for cities, airports, or IATA codes</span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
