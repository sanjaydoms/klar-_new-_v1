import { useState, useRef, useEffect } from 'react';
import {
  Plane,
  Calendar,
  Search,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  UserRound,
  Baby,
  Milk,
} from 'lucide-react';
import LocationAutocomplete from '@/features/flights/components/Common/LocationAutocomplete';
import TravelerDropdown from '@/features/flights/components/Common/TravelerDropdown';
import { FlightSearchValidator, ValidationError } from '@/utils/FlightSearchValidator';
import { openDatePicker } from '@/utils/datePicker.util';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TripTypeRow from './TripTypeRow';

interface FlightSearchSectionProps {
  onFlightSearch: ((params: any) => void) | undefined;
}

interface MultiCitySegment {
  id: string;
  from: string;
  to: string;
  date: string;
}

export default function FlightSearchSection({ onFlightSearch }: FlightSearchSectionProps) {
  const location = useLocation();
  const { state } = location;

  const getDisplayCityName = (val: string) => {
    if (!val) return '';
    const cityName = val.split('(')[0]?.split(',')[0]?.trim();
    return cityName || val;
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getTodayDate();

  const [tripType, setTripType] = useState<'oneway' | 'return' | 'multicity'>('oneway');
  const [from, setFrom] = useState('Delhi (DEL), India');
  const [to, setTo] = useState('Mumbai (BOM), India');
  const [fromAirportName, setFromAirportName] = useState('Indira Gandhi International Airport');
  const [toAirportName, setToAirportName] = useState('Chhatrapati Shivaji International Airport');
  const [departureDate, setDepartureDate] = useState(today);
  const [returnDate, setReturnDate] = useState('');
  const [multiCitySegments, setMultiCitySegments] = useState<MultiCitySegment[]>([
    { id: '1', from: 'Delhi (DEL), India', to: 'Mumbai (BOM), India', date: today },
    { id: '2', from: 'Mumbai (BOM), India', to: 'Bengaluru (BLR), India', date: today },
  ]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [travelClass, setTravelClass] = useState('');
  const [fareType, setFareType] = useState('Regular');
  const [showTravelerCard, setShowTravelerCard] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const travelerCardRef = useRef<HTMLDivElement>(null);
  const travelerButtonRef = useRef<HTMLButtonElement>(null);

  // The `isMobile` state, its resize listener and the whole mobile render branch
  // were removed: this component mounts only inside `hidden md:block`
  // (>=768px, DashboardPage.tsx:137) while the branch required
  // `window.innerWidth <= 640`. Those ranges never overlap, so the markup was
  // rendered into a display:none subtree and could never be seen. The mobile
  // flight search users actually get is MobileResponsive/FlightSearchSection/,
  // reached via the `md:hidden` sibling at DashboardPage.tsx:132.

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        travelerCardRef.current &&
        !travelerCardRef.current.contains(e.target as Node) &&
        travelerButtonRef.current &&
        !travelerButtonRef.current.contains(e.target as Node)
      ) {
        setShowTravelerCard(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    // Check if we have state data from navigation
    if (state) {
      if (state.from) {
        setFrom(state.from);
      }
      if (state.to) {
        setTo(state.to);
      }
      if (state.departureDate) {
        setDepartureDate(state.departureDate);
      }
      if (state.tripType) {
        setTripType(state.tripType);
      }
      if (state.adults) {
        setAdults(parseInt(state.adults));
      }
      if (state.children) {
        setChildren(parseInt(state.children));
      }
      if (state.infants) {
        setInfants(parseInt(state.infants));
      }

      // Auto-trigger search if both from and to are present
      if (state.from && state.to && onFlightSearch) {
        // Small delay to ensure state is updated
        const timer = setTimeout(() => {
          handleFlightSearch();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [state]);

  const validateTravelerCounts = () => {
    if (infants > adults) {
      return { isValid: false, error: 'Infants cannot exceed adults' };
    }
    setValidationErrors((prev) => prev.filter((error) => error.field !== 'travelers'));
    return { isValid: true, error: null };
  };

  const runValidation = () => {
    const validationParams = {
      tripType,
      from,
      to,
      departureDate,
      returnDate,
      multiCitySegments: tripType === 'multicity' ? multiCitySegments : undefined,
      adults,
      children,
      infants,
      today,
    };

    const result = FlightSearchValidator.validate(validationParams);
    setValidationErrors(result.errors);
    return result.isValid;
  };

  const markFieldAsTouched = (field: string) => {
    setTouchedFields((prev) => new Set(prev).add(field));
    runValidation();
  };

  const getFieldError = (field: string): string | undefined => {
    if (!touchedFields.has(field)) return undefined;
    return validationErrors.find((error) => error.field === field)?.message;
  };

  const addMultiCitySegment = () => {
    if (multiCitySegments.length < 5) {
      const nextId = (Math.max(0, ...multiCitySegments.map((s) => parseInt(s.id) || 0)) + 1).toString();
      const lastSegment = multiCitySegments[multiCitySegments.length - 1];
      const lastDate = lastSegment ? lastSegment.date : getTodayDate();
      setMultiCitySegments([...multiCitySegments, { id: nextId, from: '', to: '', date: lastDate }]);
    }
  };

  const removeMultiCitySegment = (id: string) => {
    if (multiCitySegments.length > 2) {
      setMultiCitySegments(multiCitySegments.filter((segment) => segment.id !== id));
      runValidation();
    }
  };

  const updateMultiCitySegment = (id: string, field: keyof MultiCitySegment, value: string) => {
    setMultiCitySegments(
      multiCitySegments.map((segment) =>
        segment.id === id ? { ...segment, [field]: value } : segment,
      ),
    );
    markFieldAsTouched(`segment_${multiCitySegments.findIndex((s) => s.id === id)}_${field}`);
  };

  const handleFlightSearch = async () => {
    // Prevent multiple submissions
    if (isSearching) return;

    const allFields = new Set<string>();

    if (tripType === 'multicity') {
      multiCitySegments.forEach((_, index) => {
        allFields.add(`segment_${index}_from`);
        allFields.add(`segment_${index}_to`);
        allFields.add(`segment_${index}_date`);
      });
    } else {
      allFields.add('from');
      allFields.add('to');
      allFields.add('departureDate');
      if (tripType === 'return') {
        allFields.add('returnDate');
      }
    }
    allFields.add('travelers');

    setTouchedFields(allFields);

    const isValid = runValidation();

    if (!isValid) {
      const firstErrorField = validationErrors[0]?.field;
      if (firstErrorField) {
        const element = document.getElementById(`error-${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    // Set loading state
    setIsSearching(true);

    try {
      const extractCode = (loc: string) => {
        const match = loc.match(/\(([A-Z]{3})\)/);
        return match ? match[1] : loc.trim();
      };

      let routeInfos: any[] = [];
      let segmentsForStorage: any[] = [];

      if (tripType === 'multicity') {
        segmentsForStorage = multiCitySegments.map((segment) => ({
          from: segment.from,
          to: segment.to,
          date: segment.date,
        }));

        routeInfos = multiCitySegments.map((segment) => ({
          fromCityOrAirport: { code: extractCode(segment.from) },
          toCityOrAirport: { code: extractCode(segment.to) },
          travelDate: segment.date,
        }));
      } else {
        segmentsForStorage = [
          {
            from: from,
            to: to,
            date: departureDate,
          },
        ];

        routeInfos = [
          {
            fromCityOrAirport: { code: extractCode(from) },
            toCityOrAirport: { code: extractCode(to) },
            travelDate: departureDate,
          },
        ];

        if (tripType === 'return' && returnDate) {
          segmentsForStorage.push({
            from: to,
            to: from,
            date: returnDate,
          });

          routeInfos.push({
            fromCityOrAirport: { code: extractCode(to) },
            toCityOrAirport: { code: extractCode(from) },
            travelDate: returnDate,
          });
        }
      }

      const cabinClassMap: Record<string, string> = {
        Economy: 'ECONOMY',
        'Premium Economy': 'PREMIUM_ECONOMY',
        Business: 'BUSINESS',
        'First Class': 'FIRST',
      };

      const params = {
        tripType,
        from,
        to,
        departureDate,
        returnDate,
        segments: segmentsForStorage,
        multiCitySegments: tripType === 'multicity' ? multiCitySegments : undefined,
        travelers: `${adults + children + infants}`,
        class: travelClass ? cabinClassMap[travelClass] || '' : '',
        fareType,
        travelerDetails: { adults, children, infants, total: adults + children + infants },
        searchQuery: {
          cabinClass: travelClass ? cabinClassMap[travelClass] || '' : '',
          paxInfo: {
            ADULT: adults.toString(),
            CHILD: children.toString(),
            INFANT: infants.toString(),
          },
          routeInfos,
        },
      };

      sessionStorage.setItem('flightSearchParams', JSON.stringify(params));

      if (onFlightSearch) {
        onFlightSearch(params);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setTimeout(() => {
        setIsSearching(false);
      }, 1000);
    }
  };

  const errorInputClass = 'border-red-300 bg-red-50';
  const errorTextClass = 'text-red-500 text-xs mt-1';

  const renderFieldError = (fieldName: string) => {
    const error = getFieldError(fieldName);
    if (!error) return null;
    return (
      <div id={`error-${fieldName}`} className={`${errorTextClass} flex items-center gap-1`}>
        <AlertCircle className="w-3 h-3" />
        <span>{error}</span>
      </div>
    );
  };

  // ============= ONE WAY SCREEN =============
  const renderOneWayContent = () => {
    // Helper function to format date with month name
    const formatDateWithMonthName = (dateString: string) => {
      if (!dateString) return "19 Jul'26";
      const date = new Date(dateString + 'T00:00:00');
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear().toString().slice(-2);
      return `${day} ${month}'${year}`;
    };

    return (
      <div className="w-full">
        {/* Trip Type Selector - Centered */}
        <TripTypeRow
          tripType={tripType}
          onChange={(t) => {
            setTripType(t);
            setValidationErrors([]);
          }}
        />
        {/* From, To, Departure, Travellers, CTA — the design's inset panel */}
        <div className="grid grid-cols-1 items-center rounded-2xl border border-border/70 bg-white p-2 md:grid-cols-[1fr_1fr_0.85fr_0.85fr_auto]">
          {/* From */}
          <div className="relative border-border/70 px-4 py-3 md:border-r">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">From</span>
            </div>
            <div
              className={`bg-transparent h-[64px] flex items-center relative w-full ${getFieldError('from') && touchedFields.has('from') ? errorInputClass : ''
                }`}
            >
              <LocationAutocomplete
                value={getDisplayCityName(from)}
                onChange={(value) => {
                  setFrom(value);
                  markFieldAsTouched('from');
                }}
                onSelect={(location) => {
                  setFromAirportName(location.name);
                }}
                placeholder="Delhi"
                className="w-full bg-transparent font-display text-lg font-medium text-primary focus:outline-none border-0 h-full !px-3 !pl-10 rounded-xl"
              />
              <span className="pointer-events-none absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-slate-100">
                <Plane className="h-4.5 w-4.5 text-primary" />
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {from ? (
                <>
                  <div>
                    <span
                      className="font-bold text-sm text-gray-600"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "14px",
                        letterSpacing: "1px"
                      }}
                    >
                      {from.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                    </span>
                    , {from.replace(/\([^)]*\)/, '').trim()}
                  </div>
                  {fromAirportName && (
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      {fromAirportName}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Select a city or airport</span>
              )}
            </div>
            {renderFieldError('from')}

            {/* Arrow pointing from From to To */}
            <div className="hidden md:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_4px_14px_-4px_rgba(224,36,47,0.6)] ring-1 ring-black/5">
                <svg
                  className="h-4 w-4 text-[var(--color-brand-red)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16h13m0 0l-4-4m4 4l-4 4M17 8H4m0 0l4-4M4 8l4 4" />
                </svg>
              </div>
            </div>
          </div>

          {/* To */}
          <div className="border-border/70 px-4 py-3 md:border-r">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">To</span>
            </div>
            <div
              className={`bg-transparent h-[64px] flex items-center relative w-full ${getFieldError('to') && touchedFields.has('to') ? errorInputClass : ''
                }`}
            >
              <LocationAutocomplete
                value={getDisplayCityName(to)}
                onChange={(value) => {
                  setTo(value);
                  markFieldAsTouched('to');
                }}
                onSelect={(location) => {
                  setToAirportName(location.name);
                }}
                placeholder="Mumbai"
                className="w-full bg-transparent font-display text-lg font-medium text-primary focus:outline-none border-0 h-full !px-3 !pl-10 rounded-xl"
              />
              <Plane className="absolute left-3 top-1/2 transform -translate-y-1/2 rotate-90 w-4.5 h-4.5 text-gray-400 pointer-events-none" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {to ? (
                <>
                  <div>
                    <span
                      className="font-bold text-sm text-gray-600"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "14px",
                        letterSpacing: "1px"
                      }}
                    >
                      {to.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                    </span>
                    , {to.replace(/\([^)]*\)/, '').trim()}
                  </div>
                  {toAirportName && (
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      {toAirportName}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Select a city or airport</span>
              )}
            </div>
            {renderFieldError('to')}
          </div>

          {/* Departure Date */}
          <div className="border-border/70 px-4 py-3 md:border-r">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">Departure</span>
              <span className="text-xs text-gray-400 ml-1">▼</span>
            </div>
            <div
              onClick={openDatePicker}
              className={`bg-transparent h-[52px] flex items-center relative w-full cursor-pointer ${getFieldError('departureDate') && touchedFields.has('departureDate')
                ? errorInputClass
                : ''
                }`}
            >
              <span className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Calendar className="h-4.5 w-4.5 text-primary" />
              </span>
              <input
                type="date"
                value={departureDate}
                min={today}
                onChange={(e) => {
                  setDepartureDate(e.target.value);
                  markFieldAsTouched('departureDate');
                }}
                onBlur={() => markFieldAsTouched('departureDate')}
                className="w-full font-display text-lg font-medium text-primary bg-transparent focus:outline-none cursor-pointer"
                placeholder={departureDate ? formatDateWithMonthName(departureDate) : "19 Jul'26"}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="font-bold text-sm text-gray-600">
                {departureDate ? new Date(departureDate + 'T00:00:00').toLocaleString('default', { weekday: 'long' }) : 'Sunday'}
              </span>
            </div>
            {renderFieldError('departureDate')}
          </div>

          {/* Travellers & Class */}
          <div className="px-3 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">Travellers</span>
              <span className="text-xs text-gray-400 ml-1">▼</span>
            </div>
            <div className="relative">
              <div
                className={`bg-transparent h-[52px] flex items-center relative w-full ${getFieldError('travelers') && touchedFields.has('travelers') ? errorInputClass : ''
                  }`}
              >
                <button
                  ref={travelerButtonRef}
                  onClick={() => setShowTravelerCard(!showTravelerCard)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <UserRound className="h-4.5 w-4.5 text-primary" strokeWidth={1.5} />
                  </span>
                  {/* One summary line rather than three counters; the counts
                      still live in the dropdown this opens. */}
                  <span className="font-display text-lg font-medium whitespace-nowrap text-primary">
                    {adults + children + infants} Traveller
                    {adults + children + infants > 1 ? 's' : ''}
                  </span>
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <span className="text-sm font-medium text-gray-600">{travelClass || 'Economy'}</span>
              </div>
              {renderFieldError('travelers')}

              {/* mb-2, not mb-24: the 96px was compensating for the collapsed
                  wrapper described in TravelerDropdown. With that fixed,
                  bottom-full does the work and this is just the gap. */}
              {showTravelerCard && (
                <div ref={travelerCardRef} className="absolute bottom-full left-0 mb-2 z-50 w-80">
                  <TravelerDropdown
                    adults={adults}
                    children={children}
                    infants={infants}
                    travelClass={travelClass}
                    fareType={fareType}
                    onAddAdult={() => {
                      setAdults((a) => Math.min(a + 1, 9));
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveAdult={() => {
                      setAdults((a) => Math.max(a - 1, 1));
                      markFieldAsTouched('travelers');
                    }}
                    onAddChild={() => {
                      setChildren((c) => c + 1);
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveChild={() => {
                      setChildren((c) => Math.max(c - 1, 0));
                      markFieldAsTouched('travelers');
                    }}
                    onAddInfant={() => {
                      setInfants((i) => i + 1);
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveInfant={() => {
                      setInfants((i) => Math.max(i - 1, 0));
                      markFieldAsTouched('travelers');
                    }}
                    onClassChange={setTravelClass}
                    onFareTypeChange={setFareType}
                    onClose={() => setShowTravelerCard(false)}
                    validateTravelerCounts={validateTravelerCounts}
                    maxTravelers={9}
                    minAdults={1}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Search sits in the row, per the design */}
          <div className="px-2 py-2">
            <Button
              onClick={handleFlightSearch}
              disabled={isSearching}
              className="h-14 w-full gap-2 rounded-xl bg-[var(--color-brand-red)] px-8 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] hover:bg-[var(--color-brand-red)]/90 md:w-auto"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Flights
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ============= RETURN SCREEN =============
  const renderReturnContent = () => {

    return (
      <div className="w-full">
        {/* Trip Type Selector - Centered */}
        <TripTypeRow
          tripType={tripType}
          onChange={(t) => {
            setTripType(t);
            setValidationErrors([]);
          }}
        />
        {/* 5 Column Layout - From, To, Departure, Return, Travellers */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
          {/* From */}
          <div className="border-r border-gray-300 px-2 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">From</span>
            </div>
            <div
              className={`bg-transparent h-[52px] flex items-center relative w-full ${getFieldError('from') && touchedFields.has('from') ? errorInputClass : ''
                }`}
            >
              <LocationAutocomplete
                value={getDisplayCityName(from)}
                onChange={(value) => {
                  setFrom(value);
                  markFieldAsTouched('from');
                }}
                placeholder="Delhi"
                className="w-full bg-transparent font-display text-base font-medium text-primary focus:outline-none border-0 h-full !px-2 !pl-9 rounded-xl"
              />
              <Plane className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {from ? (
                <>
                  <div>
                    <span
                      className="font-bold text-sm text-gray-600"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "14px",
                        letterSpacing: "1px"
                      }}
                    >
                      {from.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                    </span>
                    , {from.replace(/\([^)]*\)/, '').trim()}
                  </div>
                  {fromAirportName && (
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      {fromAirportName}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Select a city or airport</span>
              )}
            </div>
            {renderFieldError('from')}
          </div>

          {/* To */}
          <div className="border-r border-gray-300 px-2 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">To</span>
            </div>
            <div
              className={`bg-transparent h-[52px] flex items-center relative w-full ${getFieldError('to') && touchedFields.has('to') ? errorInputClass : ''
                }`}
            >
              <LocationAutocomplete
                value={getDisplayCityName(to)}
                onChange={(value) => {
                  setTo(value);
                  markFieldAsTouched('to');
                }}
                placeholder="Mumbai"
                className="w-full bg-transparent font-display text-base font-medium text-primary focus:outline-none border-0 h-full !px-2 !pl-9 rounded-xl"
              />
              <Plane className="absolute left-2 top-1/2 transform -translate-y-1/2 rotate-90 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {to ? (
                <>
                  <div>
                    <span
                      className="font-bold text-sm text-gray-600"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: "14px",
                        letterSpacing: "1px"
                      }}
                    >
                      {to.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                    </span>
                    , {to.replace(/\([^)]*\)/, '').trim()}
                  </div>
                  {toAirportName && (
                    <div className="text-xs text-gray-500 mt-0.5 font-medium">
                      {toAirportName}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-gray-400">Select a city or airport</span>
              )}
            </div>
            {renderFieldError('to')}
          </div>

          {/* Departure Date */}
          <div className="border-r border-gray-300 px-2 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">Departure</span>
              <span className="text-xs text-gray-400 ml-1">▼</span>
            </div>
            <div
              onClick={openDatePicker}
              className={`bg-transparent h-[52px] flex items-center relative w-full cursor-pointer ${getFieldError('departureDate') && touchedFields.has('departureDate')
                ? errorInputClass
                : ''
                }`}
            >
              <Calendar className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
              <input
                type="date"
                value={departureDate}
                min={today}
                onChange={(e) => {
                  setDepartureDate(e.target.value);
                  markFieldAsTouched('departureDate');
                }}
                onBlur={() => markFieldAsTouched('departureDate')}
                className="w-full font-display text-base font-medium text-primary bg-transparent focus:outline-none cursor-pointer"
                placeholder="19 Jul'26"
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="font-bold text-sm text-gray-600">
                {departureDate ? new Date(departureDate + 'T00:00:00').toLocaleString('default', { weekday: 'long' }) : 'Sunday'}
              </span>
            </div>
            {renderFieldError('departureDate')}
          </div>

          {/* Return Date */}
          <div className="border-r border-gray-300 px-2 py-2">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">Return</span>
              <span className="text-xs text-gray-400 ml-1">▼</span>
            </div>
            <div
              onClick={openDatePicker}
              className={`bg-transparent h-[52px] flex items-center relative w-full cursor-pointer ${getFieldError('returnDate') && touchedFields.has('returnDate')
                ? errorInputClass
                : ''
                }`}
            >
              <Calendar className="w-4 h-4 text-gray-400 shrink-0 mr-2" />
              <input
                type="date"
                value={returnDate}
                min={departureDate || today}
                onChange={(e) => {
                  const newReturnDate = e.target.value;
                  setReturnDate(newReturnDate);

                  const validationParams = {
                    tripType,
                    from,
                    to,
                    departureDate,
                    returnDate: newReturnDate,
                    adults,
                    children,
                    infants,
                    today,
                  };

                  const result = FlightSearchValidator.validate(validationParams);
                  setValidationErrors(result.errors);

                  setTouchedFields((prev) => new Set(prev).add('returnDate'));
                }}
                onBlur={() => markFieldAsTouched('returnDate')}
                className="w-full font-display text-base font-medium text-primary bg-transparent focus:outline-none cursor-pointer"
                placeholder="Tap to add return"
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="font-bold text-sm text-gray-600">
                {returnDate ? new Date(returnDate + 'T00:00:00').toLocaleString('default', { weekday: 'long' }) : 'Tap to add return date'}
              </span>
            </div>
            {renderFieldError('returnDate')}
          </div>

          {/* Travellers */}
          <div className="px-2 py-2 relative">
            <div className="mb-1">
              <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-gray-400">Travellers</span>
              <span className="text-xs text-gray-400 ml-1">▼</span>
            </div>
            <div className="relative">
              <div
                className={`bg-transparent h-[52px] flex items-center relative w-full ${getFieldError('travelers') && touchedFields.has('travelers') ? errorInputClass : ''
                  }`}
              >
                <button
                  ref={travelerButtonRef}
                  onClick={() => setShowTravelerCard(!showTravelerCard)}
                  className="w-full text-left flex items-center gap-2"
                >
                  <div className="flex items-center gap-1">
                    <UserRound className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                    <span className="font-display text-base font-medium text-primary">{adults}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Baby className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                    <span className="font-display text-base font-medium text-primary">{children}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Milk className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                    <span className="font-display text-base font-medium text-primary">{infants}</span>
                  </div>
                </button>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <span className="text-sm font-medium text-gray-600">{travelClass || 'Economy'}</span>
              </div>
              {renderFieldError('travelers')}

              {showTravelerCard && (
                <div
                  ref={travelerCardRef}
                  className="absolute z-50 w-80"
                  style={{
                    bottom: '100%',
                    right: '0',
                    marginBottom: '8px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <TravelerDropdown
                    adults={adults}
                    children={children}
                    infants={infants}
                    travelClass={travelClass}
                    fareType={fareType}
                    onAddAdult={() => {
                      setAdults((a) => Math.min(a + 1, 9));
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveAdult={() => {
                      setAdults((a) => Math.max(a - 1, 1));
                      markFieldAsTouched('travelers');
                    }}
                    onAddChild={() => {
                      setChildren((c) => c + 1);
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveChild={() => {
                      setChildren((c) => Math.max(c - 1, 0));
                      markFieldAsTouched('travelers');
                    }}
                    onAddInfant={() => {
                      setInfants((i) => i + 1);
                      markFieldAsTouched('travelers');
                    }}
                    onRemoveInfant={() => {
                      setInfants((i) => Math.max(i - 1, 0));
                      markFieldAsTouched('travelers');
                    }}
                    onClassChange={setTravelClass}
                    onFareTypeChange={setFareType}
                    onClose={() => setShowTravelerCard(false)}
                    validateTravelerCounts={validateTravelerCounts}
                    maxTravelers={9}
                    minAdults={1}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Footer - Reduced margin top */}
        <div className="mt-2 flex justify-end">
          <Button
            onClick={handleFlightSearch}
            disabled={isSearching}
            className="h-14 gap-2 rounded-xl bg-[var(--color-brand-red)] px-10 text-[15px] font-semibold text-white shadow-[0_14px_30px_-12px_rgba(224,36,47,0.8)] hover:bg-[var(--color-brand-red)]/90" 
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search Flights
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ============= MULTI-CITY SCREEN =============
  const renderMultiCityContent = () => (
    <div className="w-full">
      {/* Trip Type Selector - Centered */}
      <TripTypeRow
        tripType={tripType}
        onChange={(t) => {
          setTripType(t);
          setValidationErrors([]);
        }}
      />
      {/* Header labels for multi-city */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-4 mb-1 px-1">
        <div>
          <span className="text-sm font-semibold text-gray-700">From</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-700">To</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-700">Departure</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-gray-700">Travellers & Class</span>
        </div>
        <div></div>
      </div>

      <div className="space-y-0">
        {multiCitySegments.map((segment, index) => (
          <div key={segment.id}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-0 items-start relative">
              {/* From */}
              <div className="relative">
                <div
                  className={`h-[52px] flex items-center relative w-full ${getFieldError(`segment_${index}_from`) &&
                    touchedFields.has(`segment_${index}_from`)
                    ? errorInputClass
                    : ''
                    }`}
                >
                  <LocationAutocomplete
                    value={getDisplayCityName(segment.from)}
                    onChange={(value) => updateMultiCitySegment(segment.id, 'from', value)}
                    placeholder="Departure city"
                    className="w-full bg-transparent text-base font-semibold text-gray-800 focus:outline-none border-0 h-full !px-4 !pl-11 rounded-xl"
                  />
                  <Plane className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {segment.from ? (
                    <>
                      <div>
                        <span
                          className="font-bold text-sm text-gray-600"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "14px",
                            letterSpacing: "1px"
                          }}
                        >
                          {segment.from.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                        </span>
                        , {segment.from.replace(/\([^)]*\)/, '').trim()}
                      </div>
                      {/* Multi City doesn't have airport name state yet */}
                    </>
                  ) : (
                    <span className="text-gray-400">City or airport</span>
                  )}
                </div>
                {renderFieldError(`segment_${index}_from`)}

                {/* Vertical Divider between From and To */}
                <div className="hidden md:block absolute right-0 top-0 h-[52px] w-px bg-gray-300"></div>
              </div>

              {/* To */}
              <div className="relative">
                <div
                  className={`h-[52px] flex items-center relative w-full ${getFieldError(`segment_${index}_to`) && touchedFields.has(`segment_${index}_to`)
                    ? errorInputClass
                    : ''
                    }`}
                >
                  <LocationAutocomplete
                    value={getDisplayCityName(segment.to)}
                    onChange={(value) => updateMultiCitySegment(segment.id, 'to', value)}
                    placeholder="Destination city"
                    className="w-full bg-transparent text-base font-semibold text-gray-800 focus:outline-none border-0 h-full !px-4 !pl-11 rounded-xl"
                  />
                  <Plane className="absolute left-4 top-1/2 transform -translate-y-1/2 rotate-90 w-5 h-5 text-gray-600 pointer-events-none" />
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {segment.to ? (
                    <>
                      <div>
                        <span
                          className="font-bold text-sm text-gray-600"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontWeight: 700,
                            fontSize: "14px",
                            letterSpacing: "1px"
                          }}
                        >
                          {segment.to.match(/\(([A-Z]{3})\)/)?.[1] || '---'}
                        </span>
                        , {segment.to.replace(/\([^)]*\)/, '').trim()}
                      </div>
                      {/* Multi City doesn't have airport name state yet */}
                    </>
                  ) : (
                    <span className="text-gray-400">City or airport</span>
                  )}
                </div>
                {renderFieldError(`segment_${index}_to`)}

                {/* Vertical Divider between To and Date */}
                <div className="hidden md:block absolute right-0 top-0 h-[52px] w-px bg-gray-300"></div>
              </div>

              {/* Date */}
              <div className="relative">
                <div
                  onClick={openDatePicker}
                  className={`h-[52px] flex items-center w-full cursor-pointer ${getFieldError(`segment_${index}_date`) &&
                    touchedFields.has(`segment_${index}_date`)
                    ? errorInputClass
                    : ''
                    }`}
                >
                  <Calendar className="w-5 h-5 text-gray-600 shrink-0 ml-4 mr-3" />
                  <input
                    type="date"
                    value={segment.date}
                    min={index === 0 ? today : multiCitySegments[index - 1]?.date}
                    onChange={(e) => updateMultiCitySegment(segment.id, 'date', e.target.value)}
                    onBlur={() => markFieldAsTouched(`segment_${index}_date`)}
                    className="w-full text-base font-semibold text-gray-800 bg-transparent focus:outline-none cursor-pointer"
                    placeholder="Depart"
                  />
                </div>
                <div className="text-xs text-gray-400 mt-1">Select date</div>
                {renderFieldError(`segment_${index}_date`)}

                {/* Vertical Divider between Date and Travellers (only for first row) */}
                {index === 0 && (
                  <div className="hidden md:block absolute right-0 top-0 h-[52px] w-px bg-gray-300"></div>
                )}
              </div>

              {/* Traveller & Class - Only shown in first row */}
              {index === 0 ? (
                <div>
                  <div className="relative">
                    <div
                      className={`h-[52px] flex items-center w-full ${getFieldError('travelers') && touchedFields.has('travelers') ? errorInputClass : ''
                        }`}
                    >
                      <button
                        ref={travelerButtonRef}
                        onClick={() => setShowTravelerCard(!showTravelerCard)}
                        className="w-full text-left flex items-center px-4 gap-3"
                      >
                        <div className="flex items-center gap-1">
                          <UserRound className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.5} />
                          <span className="font-display text-lg font-medium text-primary">{adults}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Baby className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.5} />
                          <span className="font-display text-lg font-medium text-primary">{children}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Milk className="w-4.5 h-4.5 text-gray-500" strokeWidth={1.5} />
                          <span className="font-display text-lg font-medium text-primary">{infants}</span>
                        </div>
                      </button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      <span className="font-bold text-sm text-gray-600">Economy</span>/ Premium...
                    </div>
                    {renderFieldError('travelers')}

                    {/* Traveler Card */}
                    {showTravelerCard && (
                      <div ref={travelerCardRef} className="absolute top-full left-0 mt-2 z-50 w-80">
                        <TravelerDropdown
                          adults={adults}
                          children={children}
                          infants={infants}
                          travelClass={travelClass}
                          fareType={fareType}
                          onAddAdult={() => {
                            setAdults((a) => Math.min(a + 1, 9));
                            markFieldAsTouched('travelers');
                          }}
                          onRemoveAdult={() => {
                            setAdults((a) => Math.max(a - 1, 1));
                            markFieldAsTouched('travelers');
                          }}
                          onAddChild={() => {
                            setChildren((c) => c + 1);
                            markFieldAsTouched('travelers');
                          }}
                          onRemoveChild={() => {
                            setChildren((c) => Math.max(c - 1, 0));
                            markFieldAsTouched('travelers');
                          }}
                          onAddInfant={() => {
                            setInfants((i) => i + 1);
                            markFieldAsTouched('travelers');
                          }}
                          onRemoveInfant={() => {
                            setInfants((i) => Math.max(i - 1, 0));
                            markFieldAsTouched('travelers');
                          }}
                          onClassChange={setTravelClass}
                          onFareTypeChange={setFareType}
                          onClose={() => setShowTravelerCard(false)}
                          validateTravelerCounts={validateTravelerCounts}
                          maxTravelers={9}
                          minAdults={1}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Empty placeholder for other rows to maintain grid alignment
                <div></div>
              )}

              {/* Actions */}
              <div className="flex gap-2 items-center h-[52px]">
                {multiCitySegments.length > 2 && (
                  <button
                    onClick={() => removeMultiCitySegment(segment.id)}
                    className="p-2.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-all duration-200"
                    title="Remove segment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                {index === multiCitySegments.length - 1 && multiCitySegments.length < 6 && (
                  <button
                    onClick={addMultiCitySegment}
                    className="p-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all duration-200"
                    title="Add segment"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Divider between rows */}
            {index < multiCitySegments.length - 1 && (
              <div className="flex justify-center my-3">
                <div className="w-full border-t border-gray-300"></div>
              </div>
            )}
          </div>
        ))}
        {renderFieldError('multiCity')}
      </div>
      {/* Footer - Reduced margin top */}
      <div className="mt-2 flex justify-end">
        <Button
          onClick={handleFlightSearch}
          disabled={isSearching}
          className="h-12 gap-2 px-8 text-sm font-semibold tracking-[0.08em] uppercase shadow-lg"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Flights
            </>
          )}
        </Button>
      </div>
    </div>
  );


  return (
    <div className="flex-1 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>


      {/* Content - Separate functions for each trip type */}
      <div>
        {tripType === 'multicity' && renderMultiCityContent()}
        {tripType === 'oneway' && renderOneWayContent()}
        {tripType === 'return' && renderReturnContent()}
      </div>
    </div>
  );
}