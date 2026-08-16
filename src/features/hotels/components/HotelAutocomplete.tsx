import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Building2, History, TrendingUp, Loader2, Search, Navigation } from 'lucide-react';
import { getHotelSuggestions, getPopularDestinations, getPopularAreas } from '../services/hotelSearchService';
import { getRecentSearches, clearRecentSearches } from '@/utils/hotelUtils';
import { getCachedSuggestions, setCachedSuggestions } from '../utils/suggestionCache';
import type { HotelSuggestion } from '../types/hotelTypes';
import { notifyError } from '@/utils/notify';

// Popular areas will be loaded dynamically from the backend database.

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

interface HotelAutocompleteProps {
  value: string;
  /** `subtitle` carries the picked row's context line ("City in Goa, India") so
   *  the caller can render MMT's grey line under the field. Empty while typing. */
  onChange: (location: string, code: string, hotelId?: string, subtitle?: string) => void;
  placeholder?: string;
  className?: string;
}

export default function HotelAutocomplete({
  value,
  onChange,
  placeholder,
  className,
}: HotelAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<HotelSuggestion[]>([]);
  const [popularAreasRecord, setPopularAreasRecord] = useState<Record<string, Array<{ name: string; description: string; tag?: 'POPULAR' | 'TRENDING' }>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  // Stays true until the user actually types or picks something — lets a
  // pre-filled default value (e.g. "Goa, Goa") still open to the Recent
  // Searches / Use My Location view instead of jumping to typed suggestions.
  const [isPristine, setIsPristine] = useState(true);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      notifyError('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
          if (city) {
            onChange(city, '', undefined, 'Your current location');
            setIsPristine(false);
            setIsOpen(false);
          } else {
            notifyError('Could not determine your city.');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          notifyError('Failed to get location');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        notifyError('Location access denied or failed');
        setIsLocating(false);
      }
    );
  };

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
    }
  }, [isOpen]);

  // Load popular destinations once for the empty-state
  useEffect(() => {
    getPopularDestinations()
      .then((data) => setPopularDestinations(data.slice(0, 6)))
      .catch(() => { });
  }, []);

  // Load popular sub-areas dynamically from database
  useEffect(() => {
    getPopularAreas()
      .then((data) => setPopularAreasRecord(data))
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /** Cancel any in-flight request and stop the spinner. */
  const cancelInFlight = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const dedupe = (data: HotelSuggestion[]) => {
    const seen = new Map<string, HotelSuggestion>();
    for (const item of data) {
      const key = `${item.type}::${(item.name || '').toLowerCase()}::${(item.country || '').toLowerCase()}`;
      if (!seen.has(key)) seen.set(key, item);
    }
    return Array.from(seen.values());
  };

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.trim().length < MIN_CHARS) {
      cancelInFlight();
      setSuggestions([]);
      return;
    }

    const cached = getCachedSuggestions(query);
    if (cached) {
      cancelInFlight();
      setSuggestions(cached);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    try {
      const data = await getHotelSuggestions(query, abortController.signal);
      // A newer keystroke superseded us — its own handler owns the UI now.
      if (abortController.signal.aborted) return;
      const deduped = dedupe(data);
      setCachedSuggestions(query, deduped);
      setSuggestions(deduped);
    } catch (error: any) {
      if (!abortController.signal.aborted) console.error('Autocomplete error:', error);
    } finally {
      if (!abortController.signal.aborted) setIsLoading(false);
    }
  }, [cancelInFlight]);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue, '', undefined, '');
    setIsPristine(false);
    setIsOpen(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    // Backspacing below the minimum must also abort the request already in
    // flight; otherwise its late response leaves the spinner running.
    if (inputValue.trim().length < MIN_CHARS) {
      cancelInFlight();
      setSuggestions([]);
      return;
    }

    // Already-seen prefix: repaint synchronously, no spinner, no request.
    const cached = getCachedSuggestions(inputValue);
    if (cached) {
      cancelInFlight();
      setSuggestions(cached);
      return;
    }

    debounceTimer.current = setTimeout(() => fetchSuggestions(inputValue), DEBOUNCE_MS);
  };

  const handleSelect = (suggestion: HotelSuggestion) => {
    const displayValue = suggestion.name;
    const context =
      suggestion.subtitle || (suggestion.type === 'hotel' ? suggestion.city : suggestion.country) || '';
    if (suggestion.type === 'hotel') {
      onChange(displayValue, '', suggestion.hotelId, context);
    } else {
      // Only a real GEO token is a usable destination code. `id` is an internal
      // key ("CITY:IN:KA:Mysuru") and would be sent to the suppliers verbatim.
      const destCode = suggestion.destCode?.startsWith('GEO:') ? suggestion.destCode : '';
      onChange(displayValue, destCode, undefined, context);
    }
    setIsPristine(false);
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleAreaSelect = (cityName: string, areaName: string, cityCode: string) => {
    onChange(`${areaName}, ${cityName}`, cityCode, undefined, `Area in ${cityName}`);
    setIsPristine(false);
    setIsOpen(false);
    setSuggestions([]);
  };



  // Separate city vs hotel suggestions
  const citySuggestions = suggestions.filter((s) => s.type === 'city');
  const hotelSuggestions = suggestions.filter((s) => s.type === 'hotel');

  // Find the first city in results that has known sub-areas.
  // Scan all city suggestions, not just the top one — so "hyd" → "hyde park" (no areas),
  // "hyderabad india" (has areas) correctly shows Hyderabad sub-areas.
  let topCity: HotelSuggestion | undefined;
  let popularAreas: { name: string; description: string; tag?: 'POPULAR' | 'TRENDING' }[] = [];
  for (const city of citySuggestions) {
    const firstWord = city.name.toLowerCase().split(/[\s,]/)[0].trim();
    const areas = popularAreasRecord[firstWord];
    if (areas && areas.length > 0) {
      topCity = city;
      popularAreas = areas;
      break;
    }
  }

  const showRecentView = isPristine || value.length < 2;
  const showEmpty = !showRecentView && value.length >= 2 && !isLoading && suggestions.length === 0;

  return (
    <div className="relative w-full h-full" ref={wrapperRef}>
      <div className="relative w-full h-full">
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            if (!isPristine && value.length >= 2 && suggestions.length === 0) fetchSuggestions(value);
          }}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-40 w-[calc(100%+48px)] -left-6 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-[440px] overflow-y-auto overflow-x-hidden thin-scrollbar">
          {/* ── Empty / recent searches ── */}
          {showRecentView && (
            <div className="py-2">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleLocateUser();
                }}
                disabled={isLocating}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 group flex items-center gap-3 disabled:opacity-50"
              >
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors text-blue-600">
                  {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </div>
                <div>
                  <p className="font-bold text-blue-600 text-sm">
                    {isLocating ? 'Detecting Location...' : 'Use My Location'}
                  </p>
                </div>
              </button>
              {recentSearches.length > 0 && (
                <>
                  <div className="px-4 py-2 flex items-center justify-between border-b border-gray-50 mb-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        clearRecentSearches();
                        setRecentSearches([]);
                      }}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-wider cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  {recentSearches.map((search, idx) => (
                    <button
                      key={`recent-${idx}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect({ ...search, id: search.hotelId || search.destCode || '' });
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-colors flex-shrink-0">
                          <History className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {search.name}
                          </p>
                          <p className="text-xs text-gray-400 uppercase tracking-tight mt-0.5">
                            {new Date(search.checkIn!).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            -{' '}
                            {new Date(search.checkOut!).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            | 1 Room
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
              {recentSearches.length === 0 && popularDestinations.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Popular Destinations
                  </div>
                  {popularDestinations.map((dest, i) => (
                    <button
                      key={`pop-${i}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(dest);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                          <TrendingUp className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {dest.name || dest.id}
                          </p>
                          {dest.country && (
                            <p className="text-xs text-gray-400 uppercase tracking-tight">
                              {dest.country}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ── Typed suggestions — grouped ── */}
          {!showRecentView && value.length >= 2 && !isLoading && suggestions.length > 0 && (
            <div className="py-1">
              {/* City results */}
              {citySuggestions.length > 0 && (
                <div>
                  {citySuggestions.slice(0, 4).map((s) => (
                    <div key={`city-group-${s.id}`}>
                      <button
                        key={`city-${s.id}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(s);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-colors flex-shrink-0">
                            <MapPin className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-gray-400 tracking-tight mt-0.5">
                              {s.subtitle || (s.country ? `City · ${s.country}` : 'City')}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Popular sub-areas immediately underneath topCity — MMT style */}
                      {topCity && topCity.id === s.id && popularAreas.length > 0 && (
                        <div className="border-b border-gray-100 bg-gray-50/30">
                          <div className="px-4 pt-3 pb-1 flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Popular areas in{' '}
                              <span className="text-blue-600">{topCity.name.split(',')[0]}</span>
                            </span>
                          </div>
                          <div className="pl-6 border-l-2 border-gray-100 ml-6 mb-2">
                            {popularAreas.map((area, i) => (
                              <button
                                key={`area-${i}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleAreaSelect(
                                    topCity.name.split(',')[0],
                                    area.name,
                                    topCity.destCode || topCity.id || '',
                                  );
                                }}
                                className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors rounded-lg group flex items-start gap-3"
                              >
                                <MapPin className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 group-hover:text-blue-500" />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-gray-800 text-sm">{area.name}</span>
                                    {area.tag && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${area.tag === 'POPULAR'
                                            ? 'text-purple-600 border-purple-300 bg-purple-50'
                                            : 'text-orange-600 border-orange-300 bg-orange-50'
                                          }`}
                                      >
                                        {area.tag}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-400 mt-0.5">{area.description}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Hotel results */}
              {hotelSuggestions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Hotels
                  </div>
                  {hotelSuggestions.slice(0, 5).map((s) => (
                    <button
                      key={`hotel-${s.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(s);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-colors flex-shrink-0">
                          <Building2 className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {s.name}
                          </p>
                          <p className="text-xs text-gray-400 tracking-tight mt-0.5">
                            {s.subtitle || (s.city ? `Hotel · ${s.city}` : 'Hotel')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── No results fallback ── */}
          {showEmpty && (
            <div className="py-1">
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(value, '', undefined);
                }}
                className="w-full px-5 py-4 text-left hover:bg-blue-50 transition-colors group flex items-center gap-4"
              >
                <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px]">Search for "{value}"</p>
                  <p className="text-[11px] text-gray-500 uppercase tracking-tight">
                    Global Search
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {isLoading && value.length >= 2 && (
            <div className="py-3 px-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
