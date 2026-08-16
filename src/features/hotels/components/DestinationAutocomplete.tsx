import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Building2, Loader2, Search, TrendingUp, ChevronRight } from 'lucide-react';
import { getHotelSuggestions, getPopularDestinations } from '../services/hotelSearchService';
import { getCachedSuggestions, setCachedSuggestions } from '../utils/suggestionCache';
import type { HotelSuggestion } from '../types/hotelTypes';

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string, code: string, hotelId?: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

/** Highlight the matching query portion in bold inside a name string */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.length < 2) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-bold text-gray-900">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function DestinationAutocomplete({
  value,
  onChange,
  placeholder,
  className,
  style,
}: DestinationAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<HotelSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load popular destinations once for when input is empty
  useEffect(() => {
    getPopularDestinations()
      .then((data) => setPopularDestinations(data.slice(0, 6)))
      .catch(() => {});
  }, []);

  // Click-outside close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /** Cancel any in-flight request and stop the spinner. */
  const cancelInFlight = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      abortRef.current?.abort();
    };
  }, []);

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

    abortRef.current?.abort();
    // Hold our own controller: abortRef may be replaced by a newer keystroke
    // before this request settles, and the old code then read the wrong signal.
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const results = await getHotelSuggestions(query, controller.signal);
      if (controller.signal.aborted) return;

      const seen = new Map<string, HotelSuggestion>();
      for (const item of results) {
        const key = item.id || item.name?.toLowerCase() || '';
        if (!seen.has(key)) seen.set(key, item);
      }
      const deduped = Array.from(seen.values());
      setCachedSuggestions(query, deduped);
      setSuggestions(deduped);
    } catch {
      // abort or network error — the next keystroke owns the UI
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [cancelInFlight]);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue, '', undefined);
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

  const handleSelect = (s: HotelSuggestion) => {
    const displayName = s.name;
    if (s.type === 'hotel') {
      // Show "Taj Mahal Palace, Mumbai" in the box — the bare hotel name is
      // ambiguous across cities. The search itself keys off hotelId, not text.
      onChange(s.label || displayName, '', s.hotelId);
    } else {
      // Only pass destCode if it's a valid GEO: token — otherwise let backend text-resolve
      const destCode = s.destCode?.startsWith('GEO:') ? s.destCode : '';
      onChange(displayName, destCode, undefined);
    }
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleSubSelect = (
    sub: NonNullable<HotelSuggestion['subSuggestions']>[number],
  ) => {
    // Sub-city: search by city name — backend geocodes it correctly
    // Do NOT pass raw GEO coordinates to avoid country confusion
    const destCode = sub.destCode?.startsWith('GEO:') ? sub.destCode : '';
    onChange(sub.name, destCode, undefined);
    setIsOpen(false);
    setSuggestions([]);
  };

  // Separate city and hotel suggestions
  const citySuggestions = suggestions.filter((s) => s.type === 'city' || s.type === 'state');
  const hotelSuggestions = suggestions.filter((s) => s.type === 'hotel');

  const showEmpty = value.length >= MIN_CHARS && !isLoading && suggestions.length === 0;

  return (
    <div className="relative w-full h-full" ref={wrapperRef}>
      {/* Input */}
      <div className="relative w-full h-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            if (value.length >= MIN_CHARS && suggestions.length === 0) {
              fetchSuggestions(value);
            }
          }}
          placeholder={placeholder}
          className={`${className} pr-10`}
          style={style}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 w-full md:min-w-[480px] mt-2 bg-white rounded-2xl shadow-2xl overflow-hidden"
          style={{
            border: '1px solid #e5e7eb',
            maxHeight: '480px',
            overflowY: 'auto',
          }}
        >
          {/* ── Search echo row (MMT style) ── */}
          {value.length >= MIN_CHARS && (
            <div
              className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors group"
              onClick={() => {
                onChange(value, '', undefined);
                setIsOpen(false);
                setSuggestions([]);
              }}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
                <Search className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">{value}</span>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
            </div>
          )}

          {/* ── Empty state: Popular Destinations ── */}
          {value.length < MIN_CHARS && popularDestinations.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Popular Destinations
              </div>
              {popularDestinations.map((dest, i) => (
                <button
                  key={`pop-${i}`}
                  onClick={() => handleSelect(dest)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{dest.name || dest.id}</p>
                      {dest.country && (
                        <p className="text-xs text-gray-400 mt-0.5">{dest.country}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Typed suggestions ── */}
          {value.length >= MIN_CHARS && !isLoading && suggestions.length > 0 && (
            <div>
              {/* City / Region results — MMT primary style */}
              {citySuggestions.slice(0, 4).map((s) => (
                <div key={`city-${s.id}`}>
                  {/* Primary city row */}
                  <button
                    onClick={() => handleSelect(s)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group flex items-center gap-3"
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                      <MapPin className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-tight">
                        <HighlightMatch text={s.name} query={value} />
                      </p>
                      {s.subtitle && (
                        <p className="text-xs text-gray-400 mt-0.5">{s.subtitle}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>

                  {/* Sub-city suggestions (MMT "Popular locations in Goa" pattern) */}
                  {s.subSuggestions && s.subSuggestions.length > 0 && (
                    <div className="border-b border-gray-100 pb-2">
                      {/* Section header */}
                      <div className="flex items-center gap-2 px-4 pt-1 pb-2">
                        <MapPin className="w-3 h-3 text-gray-300 flex-shrink-0" />
                        <span className="text-[11px] font-semibold text-gray-400">
                          Popular locations in{' '}
                          <strong className="text-gray-600 font-bold">
                            {s.name.split(',')[0]}
                          </strong>
                        </span>
                      </div>

                      {/* Tree-line sub items */}
                      <div className="ml-6 pl-3 border-l-2 border-gray-100">
                        {s.subSuggestions.map((sub, idx) => (
                          <button
                            key={`sub-${sub.id}-${idx}`}
                            onClick={() => handleSubSelect(sub)}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors rounded-lg flex items-start gap-3 group"
                          >
                            <MapPin className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 group-hover:text-blue-500" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium text-gray-800">
                                  <HighlightMatch text={sub.name} query={value} />
                                </span>
                                {sub.tag && (
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                      sub.tag === 'POPULAR'
                                        ? 'text-purple-600 border-purple-300 bg-purple-50'
                                        : 'text-orange-600 border-orange-300 bg-orange-50'
                                    }`}
                                  >
                                    {sub.tag}
                                  </span>
                                )}
                              </div>
                              {sub.subtitle && (
                                <p className="text-[11px] text-gray-400 mt-0.5">{sub.subtitle}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Hotel results */}
              {hotelSuggestions.length > 0 && (
                <div>
                  <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Hotels
                  </div>
                  {hotelSuggestions.map((s) => (
                    <button
                      key={`hotel-${s.id}`}
                      onClick={() => handleSelect(s)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors">
                        <Building2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                          <HighlightMatch text={s.name} query={value} />
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {s.subtitle || (s.city ? `Hotel · ${s.city}` : 'Hotel')}
                        </p>
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
                onClick={() => {
                  onChange(value, '', undefined);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-4 text-left hover:bg-blue-50 transition-colors group flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Search className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Search for "{value}"</p>
                  <p className="text-xs text-gray-400 mt-0.5">Global Search</p>
                </div>
              </button>
            </div>
          )}

          {/* ── Loading skeleton ── */}
          {isLoading && value.length >= MIN_CHARS && (
            <div className="py-3 px-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-2.5 bg-gray-100 rounded w-1/3" />
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
