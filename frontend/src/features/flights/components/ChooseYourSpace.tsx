import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Search, ChevronRight } from 'lucide-react';
import { getHotelSuggestions, getPopularDestinations } from '@/features/hotels/services/hotelSearchService';
import { getCachedSuggestions, setCachedSuggestions } from '@/features/hotels/utils/suggestionCache';
import type { HotelSuggestion } from '@/features/hotels/types/hotelTypes';

interface ChooseYourSpaceProps {
  className?: string;
  onSelectSpace?: (space: string) => void;
}

// Labels MUST exactly match PROPERTY_TYPE_KEYWORDS in facets.service.ts
// (since accTypeDesc is empty in DB — types come from hotel name keyword matching)
const SPACES = [
  {
    id: 'resort',
    name: 'Resorts',
    label: 'Resort',
    emoji: '🏝️',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'villa',
    name: 'Villas',
    label: 'Villa',
    emoji: '🏡',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'hostel',
    name: 'Hostels',
    label: 'Hostel',
    emoji: '🎒',
    image: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'guesthouse',
    name: 'Guesthouses',
    label: 'Guesthouse',
    emoji: '🏠',
    image: 'https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'motel',
    name: 'Motels',
    label: 'Motel',
    emoji: '🚗',
    image: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'bnb',
    name: 'B&Bs',
    label: 'B&B',
    emoji: '☕',
    image: 'https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'palace',
    name: 'Palaces',
    label: 'Hotel', // TJ classifies palaces as "Hotel" type
    emoji: '👑',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
    extraFilter: 'palace', // used as a name keyword hint
  },
];

export default function ChooseYourSpace({ className = '', onSelectSpace }: ChooseYourSpaceProps) {
  const navigate = useNavigate();

  // Sheet state
  const [selectedSpace, setSelectedSpace] = useState<typeof SPACES[0] | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Search fields — Explore Mode only needs a destination; dates/guests are
  // picked later on the hotel detail page, once the user has actually found
  // a property they like (Airbnb-style browse-first flow).
  const [city, setCity] = useState('');
  const [destCode, setDestCode] = useState('');

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [popularDests, setPopularDests] = useState<HotelSuggestion[]>([]);
  const [sugOpen, setSugOpen] = useState(false);
  const [isLoadingSug, setIsLoadingSug] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPopularDestinations()
      .then((data) => setPopularDests(data.slice(0, 6)))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (city.length < 2) {
      setSuggestions([]);
      return;
    }

    const cacheKey = city.toLowerCase().trim();
    const cached = getCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoadingSug(true);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const data = await getHotelSuggestions(city, ctrl.signal);
        setSuggestions(data);
        setCachedSuggestions(cacheKey, data);
      } catch (_) { }
      finally {
        setIsLoadingSug(false);
      }
    }, 220);
  }, [city]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setSugOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sheet opens on a pure CSS transform/opacity transition (no work done on
  // open), so focus can follow almost immediately instead of waiting out a
  // long animation — that wait is what made the sheet feel sluggish.
  const openSheet = (space: typeof SPACES[0]) => {
    setSelectedSpace(space);
    setSheetOpen(true);
    setTimeout(() => cityInputRef.current?.focus(), 180);
    if (onSelectSpace) onSelectSpace(space.id);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => setSelectedSpace(null), 200);
  };

  const handleSearch = () => {
    if (!city) {
      cityInputRef.current?.focus();
      return;
    }

    const params = new URLSearchParams({
      explore: 'true',
      city,
      destCode: destCode || '',
    });

    if (selectedSpace?.label) {
      params.set('propertyType', selectedSpace.label);
    }

    // Explore Mode reads from the local hotel catalogue, not live suppliers —
    // it's fast enough to navigate straight there with no loading overlay.
    closeSheet();
    navigate(`/hotels/search?${params.toString()}`);
  };

  const handleSuggestionSelect = (s: HotelSuggestion) => {
    setCity(s.name);
    setDestCode(s.destinationCode || s.code || '');
    setSugOpen(false);
    setSuggestions([]);
  };

  const displayedSuggestions = city.length >= 2 ? suggestions : popularDests;

  return (
    <>
      <div className={`w-full ${className}`}>
        <div className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-8">
          {/* Header */}
          <h2
            className="text-2xl md:text-3xl lg:text-4xl font-bold mb-6"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
              fontSize: '32px',
              lineHeight: '100%',
              letterSpacing: '-1px',
              color: '#e0242f',
            }}
          >
            Curated Staycation
          </h2>

          {/* Grid — fills the screen width at all breakpoints */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-7 gap-3 md:gap-4 lg:gap-6">
            {SPACES.map((space) => (
              <button
                key={space.id}
                onClick={() => openSheet(space)}
                className="group flex flex-col items-center focus:outline-none"
              >
                {/* Square Image */}
                <div className="w-full aspect-square rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 border-2 border-transparent group-hover:border-[var(--color-brand-red)]/30">
                  <img
                    src={space.image}
                    alt={space.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Label */}
                <span
                  className="text-xs sm:text-sm md:text-base font-semibold text-primary mt-2 text-center group-hover:text-[var(--color-brand-red)] transition-colors line-clamp-1"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {space.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Backdrop ── */}
      {/* A plain translucent layer, not a blur: backdrop-blur forces the browser
          to repaint the whole viewport every frame of the transition, which is
          what made the sheet feel like it was lagging open on anything but a
          high-end GPU. */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ease-out ${sheetOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        onClick={closeSheet}
      />

      {/* ── Bottom Sheet (mobile) / Centered Modal (desktop) ── */}
      <div
        className={`fixed z-50 transition-[transform,opacity] duration-200 ease-out
          bottom-0 left-0 right-0 rounded-t-3xl
          md:bottom-auto md:left-1/2 md:top-1/2 md:right-auto md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:w-[480px]
          bg-white shadow-2xl
          ${sheetOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 md:translate-y-[-45%] md:opacity-0 pointer-events-none'}
        `}
        style={{ maxHeight: '95dvh', overflowY: 'auto', willChange: 'transform', transform: 'translateZ(0)' }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {selectedSpace && <span className="text-3xl">{selectedSpace.emoji}</span>}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Exploring</p>
                <h3 className="text-xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {selectedSpace?.name ?? ''}
                </h3>
              </div>
            </div>
            <button
              onClick={closeSheet}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Property type badge */}
          {selectedSpace && (
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[var(--color-brand-red)]/10 text-[var(--color-brand-red)] text-xs font-bold px-3 py-1.5 rounded-full border border-[var(--color-brand-red)]/20">
                {selectedSpace.emoji} {selectedSpace.name} only
              </span>
              <span className="text-xs text-gray-400">· We'll filter results to show only this type</span>
            </div>
          )}

          {/* ── City Input ── */}
          <div className="mb-3 relative" ref={autocompleteRef}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Destination / City
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={cityInputRef}
                type="text"
                value={city}
                onChange={(e) => { setCity(e.target.value); setDestCode(''); setSugOpen(true); }}
                onFocus={() => setSugOpen(true)}
                placeholder="Search city, area or hotel…"
                className="w-full pl-9 pr-9 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/10 transition-all"
              />
              {isLoadingSug ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-brand-red)] border-t-transparent rounded-full animate-spin" />
              ) : city ? (
                <button
                  onClick={() => { setCity(''); setDestCode(''); setSuggestions([]); cityInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Autocomplete Dropdown */}
            {sugOpen && displayedSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-52 overflow-y-auto">
                {city.length < 2 && (
                  <div className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Popular Destinations
                  </div>
                )}
                {displayedSuggestions.map((s, i) => (
                  <button
                    key={i}
                    className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-gray-50 transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(s); }}
                  >
                    <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                      {s.country && <p className="text-xs text-gray-400">{s.country}</p>}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Explore Button ── */}
          <button
            onClick={handleSearch}
            disabled={!city}
            className="w-full mt-2 flex items-center justify-center gap-2.5 bg-[var(--color-brand-red)] hover:bg-[var(--color-brand-red)]/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-colors text-base shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)]"
          >
            <Search className="w-5 h-5" />
            {city
              ? `Explore ${selectedSpace?.name ?? 'Properties'} in ${city}`
              : `Enter a destination to explore`}
          </button>

          {!city ? (
            <p className="text-center text-xs text-gray-400 mt-2">Please enter a city or destination above</p>
          ) : (
            <p className="text-center text-xs text-gray-400 mt-2">You'll pick your dates on the property page</p>
          )}
        </div>
      </div>
    </>
  );
}