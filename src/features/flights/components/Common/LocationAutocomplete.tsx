import React from 'react';
import { cn } from '@/lib/utils';
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
  onSelect?: (location: Location) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
  autoFocus?: boolean;
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'City or Airport',
  className = '',
  onBlur,
  autoFocus = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value);
  // What the user has TYPED, which is not the same as `query`: `query` is also
  // written by the `value` prop sync below and by selecting a suggestion (which
  // puts "Mumbai (BOM), India" in the box). Debouncing `query` would re-search
  // on both. This only ever changes on a keystroke.
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

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
        id: airport.code,
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

  // Search on the settled term, not on every keystroke. Typing "bangalore" used
  // to run nine full passes over the airport dataset, one per character.
  useEffect(() => {
    fetchSuggestions(debouncedSearchTerm);
    // fetchSuggestions closes over setState only, so it is stable in practice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    setSearchTerm(newValue);
  };

  const handleSelectLocation = (location: Location) => {
    const displayValue = `${location.city} (${location.code}), ${location.country}`;
    setQuery(displayValue);
    onChange(displayValue);
    if (onSelect) {
      onSelect(location);
    }
    setShowSuggestions(false);
    setTimeout(() => {
      if (onBlur) onBlur();
    }, 100);
  };

  const handleFocus = () => {
    if (query.length >= 2) {
      fetchSuggestions(query);
    }
    setShowSuggestions(true);
  };

  /**
   * Keep the input focused when a suggestion is pressed, so the dropdown is
   * still mounted by the time the click lands.
   *
   * Selection itself deliberately does NOT happen here. This used to be the only
   * handler on the suggestion button, and mousedown never fires for a keyboard
   * user — Enter or Space on a focused button fires `click`. So the list was
   * reachable by Tab and completely inert, which meant a keyboard-only traveller
   * could not choose an airport and could not book a flight at all.
   */
  const handleSuggestionMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();

    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }
    if (onBlur) onBlur();
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <div className="relative w-full h-full flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleInputBlur}
          autoFocus={autoFocus}
          placeholder={placeholder}
          /*
           * These were an inline `style` block, which beats every utility class
           * a caller passes — so `font-display`, `text-lg`, `font-medium` and
           * `text-primary` on the landing card were all inert, and the field
           * rendered as bold 21.57px Inter regardless. They are classes now, and
           * `cn` runs tailwind-merge, so a caller's className wins the conflict
           * instead of losing to specificity it cannot beat.
           *
           * `letterSpacing: "0%"` went with them: a percentage is not a valid
           * letter-spacing, so the browser had been dropping it anyway.
           */
          className={cn(
            'h-full w-full bg-transparent capitalize align-middle focus:outline-none',
            'font-primary text-[21.57px] font-bold leading-[32.1px] text-gray-800 pr-8',
            className,
          )}
        />
        {/* <Search className="absolute right-3 w-4 h-4 text-gray-400 pointer-events-none" /> */}
      </div>

      {/* min-h holds the panel steady. It used to swap between a ~56px
          "Loading..." box and a list of up to 20 rows, so it collapsed and
          sprang back on every search, and resized again whenever the result
          count changed. The floor is ~3 rows; beyond that it grows to max-h and
          scrolls. */}
      {/* `query.length >= 2` keeps the "No locations found" branch below
          reachable. Without it the panel unmounted the moment results hit zero,
          so the empty message was dead code and the dropdown simply vanished
          mid-type — the largest size change of the lot. */}
      {showSuggestions && (suggestions.length > 0 || isLoading || query.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-h-[13.5rem] max-h-80 overflow-y-auto">
          {isLoading ? (
            // Skeleton rows sized like real ones, so loading -> results is not a
            // jump. A centred spinner in a small box is what caused the snap.
            <ul className="py-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-4 py-3 border-b border-gray-100 last:border-b-0">
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
                    onMouseDown={handleSuggestionMouseDown}
                    onClick={() => handleSelectLocation(location)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          {location.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {location.city}, {location.country}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded">
                        {location.code}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.length >= 2 ? (
            <div className="flex min-h-[13.5rem] items-center justify-center p-4 text-center text-gray-500">
              No locations found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
