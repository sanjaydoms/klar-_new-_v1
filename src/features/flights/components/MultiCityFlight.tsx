import { useNavigate } from 'react-router-dom';
import { parseLocation } from '../utils/utils';
import FlightList from './MultiCity/FlightList';
import { groupAndMap } from '../utils/groupFareVariants';
import { ChevronRight, Home, Loader2, Plane, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import CommonSearchBar from './Common/CommonSearchBar';
import { searchMultiCityFlights } from '@/api/flightService.api';
import FlightFilterSidebar from '../components/Common/filterSidebar';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import FlightDetailsModal from './modals/FlightDetailsModal';
import SelectedFlightsBottomBar from './MultiCity/SelectedFlightsBottomBar';
import InternationalMultiFlightComboList from './MultiCity/InternationalMultiFlightComboList';
import FlightFlyingLoader from '@/components/FlightCommon/FlightLoader';
import { notifyError } from '@/utils/notify';
import {
  FlightOption,
  FlightSegment,
  InternationalItinerary,
} from '../types/types.multiCityFlight';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface MultiCityFlightProps {
  onBack: () => void;
  onBookNow?: () => void;
}

// Sort Options Component - Same as OneWay
const SortOptions = ({
  sortBy,
  onSortChange,
  sortOrder,
  onSortOrderChange,
}: {
  sortBy: string;
  onSortChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (value: 'asc' | 'desc') => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sortOptions = [
    { key: 'cheapest', label: 'Price' },
    { key: 'stops', label: 'Stops' },
    { key: 'quickest', label: 'Duration' },
    { key: 'earliest', label: 'Departure' },
    { key: 'arrival', label: 'Arrival' },
    { key: 'airline', label: 'Airline' },
  ];

  const currentSortLabel = sortOptions.find((option) => option.key === sortBy)?.label || 'Sort By';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSortSelect = (key: string) => {
    onSortChange(key);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-3" ref={dropdownRef}>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:border-gray-400 transition-colors text-sm"
        >
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <span className="font-medium text-gray-700">Sort: {currentSortLabel}</span>
          <ChevronDown
            className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
            {sortOptions.map((option) => (
              <div key={option.key}>
                <button
                  onClick={() => handleSortSelect(option.key)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${
                    sortBy === option.key ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  <span>{option.label}</span>
                  {sortBy === option.key && <Check className="h-4 w-4" />}
                </button>

                {sortBy === option.key && option.key === 'cheapest' && (
                  <div className="px-4 pb-2 flex gap-2 border-t border-gray-100 pt-2 mt-1">
                    <button
                      onClick={() => {
                        onSortOrderChange('asc');
                        setIsOpen(false);
                      }}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        sortOrder === 'asc'
                          ? 'bg-[#1A1F4D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Low→High
                    </button>
                    <button
                      onClick={() => {
                        onSortOrderChange('desc');
                        setIsOpen(false);
                      }}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        sortOrder === 'desc'
                          ? 'bg-[#1A1F4D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      High→Low
                    </button>
                  </div>
                )}

                {sortBy === option.key && option.key === 'airline' && (
                  <div className="px-4 pb-2 flex gap-2 border-t border-gray-100 pt-2 mt-1">
                    <button
                      onClick={() => {
                        onSortOrderChange('asc');
                        setIsOpen(false);
                      }}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        sortOrder === 'asc'
                          ? 'bg-[#1A1F4D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      A→Z
                    </button>
                    <button
                      onClick={() => {
                        onSortOrderChange('desc');
                        setIsOpen(false);
                      }}
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        sortOrder === 'desc'
                          ? 'bg-[#1A1F4D] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Z→A
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {sortBy !== 'cheapest' && sortBy !== 'airline' && (
        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-md overflow-hidden">
          <button
            onClick={() => onSortOrderChange('asc')}
            className={`px-2.5 py-1.5 text-sm font-medium transition-colors ${
              sortOrder === 'asc'
                ? 'bg-[#1A1F4D] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Ascending"
          >
            ↑
          </button>
          <button
            onClick={() => onSortOrderChange('desc')}
            className={`px-2.5 py-1.5 text-sm font-medium transition-colors ${
              sortOrder === 'desc'
                ? 'bg-[#1A1F4D] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Descending"
          >
            ↓
          </button>
        </div>
      )}
    </div>
  );
};

export default function MultiCityFlight({ onBack, onBookNow }: MultiCityFlightProps) {
  const navigate = useNavigate();
  const isEditingSearch = useRef(false);
  const initialLoadDone = useRef(false);
  const mainContentRef = useRef<HTMLDivElement>(null);

  const getInitialSegments = () => {
    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (paramsString) {
      const parsedParams = JSON.parse(paramsString);
      if (parsedParams.tripType === 'multicity') {
        let segmentsData = parsedParams.segments || parsedParams.multiCitySegments || [];
        if (segmentsData.length > 0 && segmentsData[0].id !== undefined) {
          segmentsData = segmentsData.map((seg: any) => ({
            from: seg.from,
            to: seg.to,
            date: seg.date,
          }));
        }
        if (segmentsData.length > 0) {
          return segmentsData;
        }
      }
    }
    return [
      { from: '', to: '', date: '' },
      { from: '', to: '', date: '' },
    ];
  };

  const [segments, setSegments] = useState<FlightSegment[]>(getInitialSegments());
  const [currentSegment, setCurrentSegment] = useState(0);
  const [selectedFlights, setSelectedFlights] = useState<Map<number, FlightOption>>(new Map());
  const [legFlights, setLegFlights] = useState<Map<number, FlightOption[]>>(new Map());
  const [searchPayload, setSearchPayload] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Sort state
  const [sortBy, setSortBy] = useState('cheapest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [internationalItineraries, setInternationalItineraries] = useState<
    InternationalItinerary[]
  >([]);
  const [selectedInternationalItinerary, setSelectedInternationalItinerary] =
    useState<InternationalItinerary | null>(null);
  const [isInternationalFlight, setIsInternationalFlight] = useState(false);

  const [airlineStats, setAirlineStats] = useState<
    { airline: string; airlineCode: string; flights: number }[]
  >([]);

  const [showFlightDetailsModal, setShowFlightDetailsModal] = useState(false);
  const [modalFlight, setModalFlight] = useState<any>(null);
  const [showFareOptionsModal, setShowFareOptionsModal] = useState(false);
  const [filteredFlightsPerSegment, setFilteredFlightsPerSegment] = useState<
    Map<number, FlightOption[]>
  >(new Map());

  const getInitialCabinClass = () => {
    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (paramsString) {
      const parsedParams = JSON.parse(paramsString);
      return parsedParams.class || parsedParams.cabinClass || 'ECONOMY';
    }
    return 'ECONOMY';
  };

  const getInitialPaxInfo = () => {
    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (paramsString) {
      const parsedParams = JSON.parse(paramsString);
      const travelerDetails = parsedParams.travelerDetails || parsedParams.paxInfo;
      return {
        ADULT: travelerDetails?.adults || travelerDetails?.ADULT || 1,
        CHILD: travelerDetails?.children || travelerDetails?.CHILD || 0,
        INFANT: travelerDetails?.infants || travelerDetails?.INFANT || 0,
      };
    }
    return { ADULT: 1, CHILD: 0, INFANT: 0 };
  };

  const [initialCabinClass, setInitialCabinClass] = useState(getInitialCabinClass());
  const [initialPaxInfo, setInitialPaxInfo] = useState(getInitialPaxInfo());

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalFlights, setTotalFlights] = useState(0);
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (segments[currentSegment]) {
      setSelectedDate(segments[currentSegment].date);
    }
  }, [currentSegment, segments]);

  useEffect(() => {
    if (filteredFlightsPerSegment.size > 0 && !isInternationalFlight) {
      const flightsForCurrentSegment = filteredFlightsPerSegment.get(currentSegment);
      if (flightsForCurrentSegment) {
        const newLegFlights = new Map(legFlights);
        newLegFlights.set(currentSegment, flightsForCurrentSegment);
        setLegFlights(newLegFlights);
        setTotalFlights(flightsForCurrentSegment.length);
      }
    }
  }, [currentSegment, filteredFlightsPerSegment, isInternationalFlight]);

  useEffect(() => {
    if (searchPayload && !isEditingSearch.current) {
      const extractCodeFromLocation = (locationString: string): string => {
        if (!locationString) return '';
        const match = locationString.match(/\(([^)]+)\)/);
        return match && match[1] ? match[1] : locationString;
      };

      const updatedRouteInfos = searchPayload.searchQuery.routeInfos.map(
        (route: any, index: number) => {
          if (segments[index]) {
            return {
              ...route,
              fromCityOrAirport: { code: extractCodeFromLocation(segments[index].from) },
              toCityOrAirport: { code: extractCodeFromLocation(segments[index].to) },
              travelDate: segments[index].date,
            };
          }
          return route;
        },
      );

      const updatedPayload = {
        ...searchPayload,
        searchQuery: {
          ...searchPayload.searchQuery,
          routeInfos: updatedRouteInfos,
        },
      };

      setSearchPayload(updatedPayload);
    }
  }, [segments]);

  const parseDuration = (durationString: string): number => {
    if (!durationString) return 0;

    let totalMinutes = 0;
    const hoursMatch = durationString.match(/(\d+)h/);
    const minutesMatch = durationString.match(/(\d+)m/);

    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1] as string) * 60;
    }
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1] as string);
    }

    return totalMinutes;
  };

  const handleSegmentClick = (index: number) => {
    setCurrentSegment(index);
  };

  const extractCodeFromLocation = (locationString: string): string => {
    if (!locationString) return '';
    const match = locationString.match(/\(([^)]+)\)/);
    return match && match[1] ? match[1] : locationString;
  };

  const loadStoredFares = useCallback(() => {
    const storedFares = sessionStorage.getItem('selectedMultiCityFares');
    if (storedFares && legFlights.size > 0 && !isInternationalFlight) {
      try {
        const parsedFares = JSON.parse(storedFares);
        console.log('Loading stored fares into selected flights:', parsedFares);

        const newSelectedFlights = new Map<number, FlightOption>();

        const storedIndexes = new Set<number>();
        parsedFares.forEach((storedFare: any) => {
          const segmentIndex = segments.findIndex((seg) => {
            const fromCode = extractCodeFromLocation(seg.from || '');
            const toCode = extractCodeFromLocation(seg.to || '');
            return (
              fromCode === storedFare.fromLocation?.code && toCode === storedFare.toLocation?.code
            );
          });

          if (segmentIndex !== -1) {
            storedIndexes.add(segmentIndex);
            if (storedFare.flight) {
              newSelectedFlights.set(segmentIndex, storedFare.flight);
            } else {
              const segmentFlights = legFlights.get(segmentIndex) || [];
              const matchingFlight = segmentFlights.find(
                (flight) => flight.id === storedFare.selectedFareId,
              );

              if (matchingFlight) {
                newSelectedFlights.set(segmentIndex, matchingFlight);
              }
            }
          }
        });

        setSelectedFlights(newSelectedFlights);

        // Auto-advance to the first segment still awaiting a fare. Keyed on the
        // STORED fares (what the Stored/Pending summary rows read), not the
        // matched-flight map — the stored record often carries only a fareId
        // that no legFlights entry matches. Only advance when the CURRENT
        // segment is stored, so a manually-viewed pending segment is never
        // fought.
        const firstPending = segments.findIndex((_, i) => !storedIndexes.has(i));
        if (firstPending !== -1 && storedIndexes.has(currentSegment)) {
          setCurrentSegment(firstPending);
        }
      } catch (error) {
        console.error('Error loading stored fares:', error);
      }
    }
  }, [legFlights, segments, isInternationalFlight, currentSegment]);

  useEffect(() => {
    loadStoredFares();
    window.addEventListener('selectedFaresUpdated', loadStoredFares);
    return () => {
      window.removeEventListener('selectedFaresUpdated', loadStoredFares);
    };
  }, [loadStoredFares]);

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    if (searchPayload) {
      setCurrentPage(1);
      setLegFlights(new Map());
      setFilteredFlightsPerSegment(new Map());
      setInternationalItineraries([]);
      setIsInternationalFlight(false);

      const payloadWithSort = {
        ...searchPayload,
        searchQuery: {
          ...searchPayload.searchQuery,
          searchType: 'MULTICITY',
        },
        page: 1,
        limit: itemsPerPage,
        sortBy: newSortBy,
        sortOrder: sortOrder,
      };

      loadFlights(payloadWithSort);
    }
  };

  const handleSortOrderChange = (newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    if (searchPayload) {
      setCurrentPage(1);
      setLegFlights(new Map());
      setFilteredFlightsPerSegment(new Map());
      setInternationalItineraries([]);
      setIsInternationalFlight(false);

      const payloadWithSort = {
        ...searchPayload,
        searchQuery: {
          ...searchPayload.searchQuery,
          searchType: 'MULTICITY',
        },
        page: 1,
        limit: itemsPerPage,
        sortBy: sortBy,
        sortOrder: newSortOrder,
      };

      loadFlights(payloadWithSort);
    }
  };

  const loadFlights = useCallback(
    async (payload: any) => {
      setIsFetching(true);
      setLegFlights(new Map());
      setInternationalItineraries([]);
      setIsInternationalFlight(false);

      try {
        const response = await searchMultiCityFlights(payload.searchQuery);
        sessionStorage.setItem('multiCitySessionId', response.data.sessionId);

        if (response.data?.airlineStats) {
          const stats = response.data.airlineStats.map((stat: any) => ({
            airline: stat.airline,
            airlineCode: stat.airlineCode || stat.airline?.substring(0, 2).toUpperCase() || '',
            flights: stat.flights,
          }));
          setAirlineStats(stats);
        }

        if (response.success && response.data) {
          if (
            response.data.flights &&
            Array.isArray(response.data.flights) &&
            response.data.flights.length > 0
          ) {
            if (response.data.flights[0]?.legs) {
              const itineraries: InternationalItinerary[] = response.data.flights;
              setInternationalItineraries(itineraries);
              setIsInternationalFlight(true);
            } else if (
              response.data.flights[0]?.legIndex !== undefined &&
              response.data.flights[0]?.flights
            ) {
              const newLegFlights = new Map<number, FlightOption[]>();
              const newFilteredMap = new Map<number, FlightOption[]>();

              response.data.flights.forEach((leg: any) => {
                const legIndex = leg.legIndex;
                const flightOptions = leg.flights || [];

                const mappedFlights = groupAndMap(flightOptions, (flight: any, idx: number): any => ({
                  flightId: `${flight.flightKey}-${idx}`,
                  segmentId: flight.flightKey,
                  searchId: flight.searchId || flight.flightKey,
                  id: flight.id || `${flight.flightKey}-${idx}`,
                  airline: {
                    name: flight.airline,
                    code: flight.airlineCode || flight.airline?.substring(0, 2).toUpperCase() || '',
                  },
                  flightNumber: flight.flightNumber,
                  departure: {
                    airportCode: flight.from.airportCode,
                    city: flight.from.city,
                    time: flight.from.time,
                    date: flight.from.date,
                  },
                  arrival: {
                    airportCode: flight.to.airportCode,
                    city: flight.to.city,
                    time: flight.to.time,
                    date: flight.to.date,
                  },
                  duration: parseDuration(flight.duration),
                  stops: flight.stops,
                  price: flight.price,
                  fareOptions: [
                    {
                      fareIdentifier: flight.cabinClass,
                      totalFare: flight.price,
                    },
                  ],
                  cabinClass: flight.cabinClass,
                  legIndex: legIndex,
                  fareId: flight.fareId,
                  fareIdentifier: flight.fareIdentifier,
                  refundable: flight.refundable,
                  seatsRemaining: flight.seatsRemaining,
                  checkInBaggage: flight.checkInBaggage,
                  cabinBaggage: flight.cabinBaggage,
                }));

                newLegFlights.set(legIndex, mappedFlights);
                newFilteredMap.set(legIndex, mappedFlights);
              });

              setLegFlights(newLegFlights);
              setFilteredFlightsPerSegment(newFilteredMap);
              const currentSegmentFlights = newLegFlights.get(currentSegment) || [];
              setTotalFlights(currentSegmentFlights.length);
            }
          } else {
            setLegFlights(new Map());
            setTotalFlights(0);
          }
        } else {
          setLegFlights(new Map());
          setTotalFlights(0);
        }
      } catch (err) {
        console.error('Error fetching flights:', err);
        setLegFlights(new Map());
        setTotalFlights(0);
      } finally {
        setIsFetching(false);
        setIsLoading(false);
      }
    },
    [currentSegment],
  );

  useEffect(() => {
    if (isEditingSearch.current) {
      console.log('Skipping sessionStorage load during edit search');
      return;
    }

    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    const paramsString = sessionStorage.getItem('flightSearchParams');

    if (!paramsString) {
      console.warn('No flightSearchParams found in sessionStorage');
      return;
    }

    try {
      const parsedParams = JSON.parse(paramsString);
      let segmentsData = [];

      const cabinClass = parsedParams.class || parsedParams.cabinClass;
      setInitialCabinClass(cabinClass?.toUpperCase() || 'ECONOMY');

      const travelerDetails = parsedParams.travelerDetails || parsedParams.paxInfo;
      setInitialPaxInfo({
        ADULT: travelerDetails?.adults || travelerDetails?.ADULT || 1,
        CHILD: travelerDetails?.children || travelerDetails?.CHILD || 0,
        INFANT: travelerDetails?.infants || travelerDetails?.INFANT || 0,
      });

      if (parsedParams.tripType === 'multicity') {
        segmentsData = parsedParams.segments || parsedParams.multiCitySegments || [];

        if (segmentsData.length > 0 && segmentsData[0].id !== undefined) {
          segmentsData = segmentsData.map((seg: any) => ({
            from: seg.from,
            to: seg.to,
            date: seg.date,
          }));
        }
      } else if (parsedParams.tripType === 'return') {
        segmentsData = [
          {
            from: parsedParams.from,
            to: parsedParams.to,
            date: parsedParams.departureDate,
          },
          {
            from: parsedParams.to,
            to: parsedParams.from,
            date: parsedParams.returnDate,
          },
        ];
      } else {
        segmentsData = [
          {
            from: parsedParams.from,
            to: parsedParams.to,
            date: parsedParams.departureDate,
          },
        ];
      }

      if (segmentsData.length === 0) {
        console.error('No segments found in stored params');
        return;
      }

      const currentSegmentsStr = JSON.stringify(segments);
      const newSegmentsStr = JSON.stringify(segmentsData);

      if (currentSegmentsStr !== newSegmentsStr) {
        console.log('Updating segments from sessionStorage:', segmentsData);
        setSegments(segmentsData);
      }

      const routeInfos = segmentsData.map((s: any) => ({
        fromCityOrAirport: { code: parseLocation(s.from).code },
        toCityOrAirport: { code: parseLocation(s.to).code },
        travelDate: s.date,
      }));

      const payload = {
        searchQuery: {
          cabinClass: parsedParams.class?.toUpperCase() || 'ECONOMY',
          paxInfo: {
            ADULT: travelerDetails?.adults || 1,
            CHILD: travelerDetails?.children || 0,
            INFANT: travelerDetails?.infants || 0,
          },
          routeInfos: routeInfos,
          searchModifiers: { isDirectFlight: true, isConnectingFlight: true },
        },
      };

      setSearchPayload(payload);
    } catch (error) {
      console.error('Error parsing flightSearchParams:', error);
    }
  }, []);

  useEffect(() => {
    if (searchPayload) {
      const isValid = searchPayload.searchQuery.routeInfos.every(
        (route: any) =>
          route.fromCityOrAirport?.code && route.toCityOrAirport?.code && route.travelDate,
      );

      if (!isValid) {
        console.error('Invalid search payload:', searchPayload);
        return;
      }

      setCurrentPage(1);
      setLegFlights(new Map());
      setFilteredFlightsPerSegment(new Map());
      setInternationalItineraries([]);
      setIsInternationalFlight(false);

      const payloadWithSort = {
        ...searchPayload,
        searchQuery: {
          ...searchPayload.searchQuery,
          searchType: 'MULTICITY',
        },
        page: currentPage,
        limit: itemsPerPage,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };

      loadFlights(payloadWithSort);
    }
  }, [searchPayload]);

  const handleSearch = async (payload: any) => {
    isEditingSearch.current = true;

    const sq = payload.searchQuery;

    if (!sq.routeInfos || sq.routeInfos.length === 0) {
      console.error('No route information in search payload');
      return;
    }

    const newSegments = sq.routeInfos.map((r: any) => ({
      from: r.fromCityOrAirport.code,
      to: r.toCityOrAirport.code,
      date: r.travelDate,
    }));

    const hasEmptySegments = newSegments.some(
      (seg: { from: any; to: any; date: any }) => !seg.from || !seg.to || !seg.date,
    );

    if (hasEmptySegments) {
      console.error('Some segments have missing data');
      return;
    }

    setSegments(newSegments);
    setCurrentSegment(0);
    setSelectedFlights(new Map());
    setSelectedInternationalItinerary(null);
    setIsInternationalFlight(false);
    setCurrentPage(1);

    const adults = parseInt(sq.paxInfo.ADULT) || 1;
    const children = parseInt(sq.paxInfo.CHILD) || 0;
    const infants = parseInt(sq.paxInfo.INFANT) || 0;

    const travelerDetails = {
      adults,
      children,
      infants,
      total: adults + children + infants,
    };

    setInitialCabinClass(sq.cabinClass?.toUpperCase() || 'ECONOMY');
    setInitialPaxInfo({
      ADULT: adults,
      CHILD: children,
      INFANT: infants,
    });

    const updatedSearchParams = {
      tripType: 'multicity',
      segments: newSegments,
      travelers: `${travelerDetails.total} Traveler${travelerDetails.total > 1 ? 's' : ''}, ${sq.cabinClass}`,
      class: sq.cabinClass,
      travelerDetails: travelerDetails,
      paxInfo: { ADULT: adults, CHILD: children, INFANT: infants },
    };

    sessionStorage.setItem('flightSearchParams', JSON.stringify(updatedSearchParams));
    sessionStorage.setItem('multiCitySearchParams', JSON.stringify(updatedSearchParams));

    setSearchPayload(payload);

    setTimeout(() => {
      isEditingSearch.current = false;
    }, 500);
  };

  const handlePageChange = (newPage: number) => {
    const totalPages = Math.ceil((totalFlights || 0) / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const handleSelectFlight = async (flight: FlightOption) => {
    setModalFlight(flight);
    setShowFareOptionsModal(true);

    if (flight.searchId && searchPayload) {
      try {
        const { getFlightSegmentDetails } = await import('../../../api/flights.api');
        const { mapSegmentResponseToFlight } = await import('../utils/flightMapper');

        const detailedData = await getFlightSegmentDetails(flight.searchId, searchPayload);

        if (detailedData) {
          const detailedFlight = mapSegmentResponseToFlight(detailedData);
          setModalFlight((prev: any) => (prev ? { ...prev, ...detailedFlight } : detailedFlight));
        }
      } catch (err) {
        console.error('MultiCityFlight: Failed to fetch fare details', err);
      }
    }
  };

  const handleViewDetails = async (flight: FlightOption) => {
    setModalFlight(flight);
    setShowFlightDetailsModal(true);

    if (flight.searchId && searchPayload) {
      try {
        const { getFlightSegmentDetails } = await import('../../../api/flights.api');
        const { mapSegmentResponseToFlight } = await import('../utils/flightMapper');

        const detailedData = await getFlightSegmentDetails(flight.searchId, searchPayload);

        if (detailedData) {
          const detailedFlight = mapSegmentResponseToFlight(detailedData);
          setModalFlight(detailedFlight);
        }
      } catch (err) {
        console.error('MultiCityFlight: Failed to fetch details', err);
      }
    }
  };

  const getAllSelectedFareIds = useCallback(() => {
    const fareIds: string[] = [];

    selectedFlights.forEach((flight) => {
      if (flight.id) {
        fareIds.push(flight.id);
      }
    });

    const stored = sessionStorage.getItem('selectedMultiCityFares');
    if (stored) {
      try {
        const storedSelections = JSON.parse(stored);
        storedSelections.forEach((selection: any) => {
          if (selection.selectedFareId && !fareIds.includes(selection.selectedFareId)) {
            fareIds.push(selection.selectedFareId);
          }
        });
      } catch (e) {
        console.error('Error parsing stored selections:', e);
      }
    }

    return fareIds;
  }, [selectedFlights]);

  useEffect(() => {
    const fareIds = getAllSelectedFareIds();
    if (fareIds.length > 0) {
      sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));
      console.log('Synced fare IDs to sessionStorage:', fareIds);
    }
  }, [selectedFlights, getAllSelectedFareIds]);

  const getFlightPrice = (flight: FlightOption): number => {
    if (flight.fareOptions && flight.fareOptions.length > 0) {
      return flight.fareOptions[0]?.totalFare || 0;
    }
    return 0;
  };

  const totalPrice = Array.from(selectedFlights.values()).reduce(
    (sum, flight) => sum + getFlightPrice(flight),
    0,
  );

  const handleBookNow = () => {
    if (isInternationalFlight && selectedInternationalItinerary) {
      const bookingData = {
        tripType: 'multicity',
        flightType: 'international',
        itinerary: selectedInternationalItinerary,
        totalPrice: selectedInternationalItinerary.totalPrice,
        segments: segments,
        from: segments[0]?.from,
        to: segments[segments.length - 1]?.to,
      };
      sessionStorage.setItem('selectedFlight', JSON.stringify(bookingData));

      if (onBookNow) {
        onBookNow();
      } else {
        navigate('/traveller-info');
      }
      return;
    }

    const storedFares = sessionStorage.getItem('selectedMultiCityFares');
    const reviewDetailsResponse = sessionStorage.getItem('reviewDetailsResponse');

    if (reviewDetailsResponse) {
      try {
        const parsedReviewResponse = JSON.parse(reviewDetailsResponse);
        const firstSegment = segments[0];
        const lastSegment = segments[segments.length - 1] || segments[0];

        const firstFlight = Array.from(selectedFlights.values())[0];
        const lastFlight = Array.from(selectedFlights.values())[selectedFlights.size - 1];

        let storedSelectionsData = [];
        if (storedFares) {
          try {
            storedSelectionsData = JSON.parse(storedFares);
            console.log('Stored selections data:', storedSelectionsData);
          } catch (e) {
            console.error('Error parsing stored fares:', e);
          }
        }

        const flightLegs = storedSelectionsData.map((selection: any, index: number) => ({
          legIndex: index,
          airline: selection.flight?.airline?.name || 'Unknown',
          flightNumber: selection.flight?.flightNumber || 'N/A',
          departure: selection.flight?.departure,
          arrival: selection.flight?.arrival,
          duration: selection.flight?.duration,
          price: selection.totalFare || 0,
          segmentId: selection.selectedFareId,
          fareIdentifier: selection.fareType || 'STANDARD',
          fromLocation: selection.fromLocation,
          toLocation: selection.toLocation,
        }));

        const travelerDetails = searchPayload?.searchQuery?.paxInfo || {
          ADULT: '1',
          CHILD: '0',
          INFANT: '0',
        };
        const adults = parseInt(travelerDetails.ADULT) || 1;
        const children = parseInt(travelerDetails.CHILD) || 0;
        const infants = parseInt(travelerDetails.INFANT) || 0;

        const totalPriceFromStored = storedSelectionsData.reduce(
          (sum: number, selection: any) => sum + (selection.totalFare || 0),
          0,
        );

        const bookingData = {
          tripType: 'multicity',
          airline: firstFlight?.airline?.name || storedSelectionsData[0]?.flight?.airline?.name,
          flightNumber: firstFlight?.flightNumber || storedSelectionsData[0]?.flight?.flightNumber,
          from: firstSegment?.from,
          to: lastSegment?.to,
          departureDate: firstSegment?.date,
          departureTime:
            firstFlight?.departure?.time || storedSelectionsData[0]?.flight?.departure?.time,
          arrivalDate: lastSegment?.date,
          arrivalTime:
            lastFlight?.arrival?.time ||
            storedSelectionsData[storedSelectionsData.length - 1]?.flight?.arrival?.time,
          duration: firstFlight?.duration || storedSelectionsData[0]?.flight?.duration,
          stops: `Multi-City (${segments.length} segments)`,
          basefare: totalPriceFromStored,
          taxes: 0,
          insurance: 0,
          flightLegs: flightLegs,
          segments: segments,
          selectedFlights: Array.from(selectedFlights.entries()).map(([index, flight]) => ({
            segmentIndex: index,
            flight: flight,
            from: segments[index]?.from,
            to: segments[index]?.to,
            date: segments[index]?.date,
          })),
          storedSelections: storedSelectionsData,
          reviewDetailsResponse: parsedReviewResponse,
          totalPrice: totalPriceFromStored,
          travelerDetails: {
            adults,
            children,
            infants,
            total: adults + children + infants,
          },
          cabinClass: searchPayload?.searchQuery?.cabinClass || '',
        };

        sessionStorage.setItem('selectedFlight', JSON.stringify(bookingData));

        if (onBookNow) {
          console.log('Calling onBookNow prop');
          onBookNow();
        } else {
          console.log('Navigating directly to /traveller-info');
          navigate('/traveller-info');
        }
        return;
      } catch (error) {
        console.error('Error parsing review details response:', error);
        notifyError('Something went wrong, please try again.');
        return;
      }
    }

    if (selectedFlights.size !== segments.length) {
      notifyError(
        `Please select a flight for all ${segments.length} segments before booking. You have selected ${selectedFlights.size} segment(s).`,
      );
      return;
    }

    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1] || segments[0];

    const firstFlight = Array.from(selectedFlights.values())[0];
    const lastFlight = Array.from(selectedFlights.values())[selectedFlights.size - 1];

    if (!firstFlight || !lastFlight) {
      console.error('Missing flight data');
      notifyError('Unable to proceed. Please select flights again.');
      return;
    }

    const flightLegs = Array.from(selectedFlights.entries()).map(([index, flight]) => ({
      legIndex: index,
      airline: flight.airline?.name || 'Unknown',
      flightNumber: flight.flightNumber,
      departure: flight.departure,
      arrival: flight.arrival,
      duration: flight.duration,
      price: getFlightPrice(flight),
      segmentId: flight.segmentId,
      fareIdentifier: flight.fareOptions?.[0]?.fareIdentifier || 'STANDARD',
    }));

    const travelerDetails = searchPayload?.searchQuery?.paxInfo || {
      ADULT: '1',
      CHILD: '0',
      INFANT: '0',
    };
    const adults = parseInt(travelerDetails.ADULT) || 1;
    const children = parseInt(travelerDetails.CHILD) || 0;
    const infants = parseInt(travelerDetails.INFANT) || 0;

    const bookingData = {
      tripType: 'multicity',
      airline: firstFlight?.airline?.name,
      flightNumber: firstFlight?.flightNumber,
      from: firstSegment?.from,
      to: lastSegment?.to,
      departureDate: firstSegment?.date,
      departureTime: firstFlight?.departure?.time,
      arrivalDate: lastSegment?.date,
      arrivalTime: lastFlight?.arrival?.time,
      duration: firstFlight?.duration,
      stops: `Multi-City (${segments.length} segments)`,
      basefare: totalPrice,
      taxes: 0,
      insurance: 0,
      flightLegs: flightLegs,
      segments: segments,
      selectedFlights: Array.from(selectedFlights.entries()).map(([index, flight]) => ({
        segmentIndex: index,
        flight: flight,
        from: segments[index]?.from,
        to: segments[index]?.to,
        date: segments[index]?.date,
      })),
      totalPrice: totalPrice,
      travelerDetails: {
        adults,
        children,
        infants,
        total: adults + children + infants,
      },
      cabinClass: searchPayload?.searchQuery?.cabinClass || '',
    };

    sessionStorage.setItem('selectedFlight', JSON.stringify(bookingData));

    if (onBookNow) {
      console.log('Calling onBookNow prop');
      onBookNow();
    } else {
      console.log('Navigating directly to /traveller-info');
      navigate('/traveller-info');
    }
  };

  const handleSelectInternationalItinerary = (itinerary: InternationalItinerary) => {
    setSelectedInternationalItinerary(itinerary);
    setSelectedFlights(new Map());
  };

  const handleDeselectInternationalItinerary = () => {
    setSelectedInternationalItinerary(null);
  };

  const handleFareRuleLoaded = (fareRuleData: any, flightType: string, fareId: string) => {
    console.log('Fare rule loaded:', fareRuleData, flightType, fareId);
    if (flightType === 'departure') {
      sessionStorage.setItem('selectedDepartureFareId', fareId);
    }
  };

  const handleFilterChange = (filteredResponse: any) => {
    setIsFilterLoading(true);

    if (filteredResponse?.type === 'international') {
      if (filteredResponse.data?.itineraries) {
        setInternationalItineraries(filteredResponse.data.itineraries);
        setIsInternationalFlight(true);
        setSelectedInternationalItinerary(null);
        setSelectedFlights(new Map());
        setIsFilterLoading(false);
        return;
      }
      if (filteredResponse.data?.roundTrips) {
        setInternationalItineraries(filteredResponse.data.roundTrips);
        setIsInternationalFlight(true);
        setSelectedInternationalItinerary(null);
        setSelectedFlights(new Map());
        setIsFilterLoading(false);
        return;
      }
    }

    if (isInternationalFlight) {
      setIsFilterLoading(false);
      return;
    }

    let flightsByLeg = new Map<number, FlightOption[]>();

    const mapFlightsWithSearchId = (leg: any, legIndex: number) => {
      const flightOptions = leg.flights || [];

      const originalFlights = legFlights.get(legIndex) || [];
      const originalFlightMap = new Map(originalFlights.map((flight) => [flight.flightId, flight]));

      return groupAndMap(flightOptions, (flight: any, idx: number): any => {
        const flightId = `${flight.flightKey}-${idx}`;
        const originalFlight = originalFlightMap.get(flightId);

        return {
          flightId: flightId,
          segmentId: flight.flightKey,
          searchId: originalFlight?.searchId || flight.searchId || flight.flightKey,
          id: originalFlight?.id || flight.id || `${flight.flightKey}-${idx}`,
          airline: {
            name: flight.airline,
            code: flight.airlineCode || flight.airline?.substring(0, 2).toUpperCase() || '',
          },
          flightNumber: flight.flightNumber,
          departure: {
            airportCode: flight.from?.airportCode,
            city: flight.from?.city,
            time: flight.from?.time,
            date: flight.from?.date,
            day: flight.from?.day,
          },
          arrival: {
            airportCode: flight.to?.airportCode,
            city: flight.to?.city,
            time: flight.to?.time,
            date: flight.to?.date,
            day: flight.to?.day,
          },
          duration:
            typeof flight.duration === 'string' ? parseDuration(flight.duration) : flight.duration,
          stops: flight.stops,
          price: flight.price,
          fareOptions: [
            {
              fareIdentifier: flight.cabinClass,
              totalFare: flight.price,
            },
          ],
          cabinClass: flight.cabinClass,
          legIndex: legIndex,
          fareId: flight.fareId,
          fareIdentifier: flight.fareIdentifier,
          refundable: flight.refundable,
          seatsRemaining: flight.seatsRemaining,
          checkInBaggage: flight.checkInBaggage,
          cabinBaggage: flight.cabinBaggage,
        };
      });
    };

    if (filteredResponse && filteredResponse.data && Array.isArray(filteredResponse.data.flights)) {
      filteredResponse.data.flights.forEach((leg: any) => {
        const legIndex = leg.legIndex;
        const mappedFlights = mapFlightsWithSearchId(leg, legIndex);
        flightsByLeg.set(legIndex, mappedFlights);
      });
    } else if (
      filteredResponse &&
      filteredResponse.flights &&
      Array.isArray(filteredResponse.flights)
    ) {
      filteredResponse.flights.forEach((leg: any) => {
        const legIndex = leg.legIndex;
        const mappedFlights = mapFlightsWithSearchId(leg, legIndex);
        flightsByLeg.set(legIndex, mappedFlights);
      });
    } else if (filteredResponse && Array.isArray(filteredResponse)) {
      filteredResponse.forEach((leg: any) => {
        const legIndex = leg.legIndex;
        const mappedFlights = mapFlightsWithSearchId(leg, legIndex);
        flightsByLeg.set(legIndex, mappedFlights);
      });
    }

    if (flightsByLeg.size > 0) {
      const newFilteredMap = new Map(filteredFlightsPerSegment);
      for (const [legIndex, mappedFlights] of flightsByLeg) {
        newFilteredMap.set(legIndex, mappedFlights);
      }
      setFilteredFlightsPerSegment(newFilteredMap);

      const updatedLegFlights = new Map(legFlights);
      for (const [legIndex, mappedFlights] of flightsByLeg) {
        updatedLegFlights.set(legIndex, mappedFlights);
      }
      setLegFlights(updatedLegFlights);

      const currentSegmentFlights = flightsByLeg.get(currentSegment) || [];
      setTotalFlights(currentSegmentFlights.length);

      const newSelectedFlights = new Map(selectedFlights);
      for (const [segmentIndex, selectedFlight] of selectedFlights) {
        const segmentFlights = flightsByLeg.get(segmentIndex) || [];
        const stillExists = segmentFlights.some((f) => f.id === selectedFlight.id);
        if (!stillExists) {
          newSelectedFlights.delete(segmentIndex);
        }
      }
      setSelectedFlights(newSelectedFlights);
    }

    setIsFilterLoading(false);
  };

  const currentFlights = legFlights.get(currentSegment) || [];

  // Scroll to top when changing segments
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentSegment]);

  // Check if loader should be shown
  const showLoader = isFetching && !isFilterLoading;

  return (
    <div className="min-h-screen bg-gray-200 pt-5">
      {/* Header - Full Width Search Bar */}
      <div className="mt-20">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <CommonSearchBar
            key={segments.map((s) => `${s.from}-${s.to}-${s.date}`).join('|')}
            onSearch={handleSearch}
            isLoading={isFetching || isLoading}
            initialParams={{
              tripType: 'multicity',
              segments: segments.map((s) => ({
                from: s.from,
                to: s.to,
                date: s.date,
              })),
              cabinClass: initialCabinClass,
              paxInfo: initialPaxInfo,
            }}
          />

          {/* Breadcrumbs - Left aligned with Sort on right */}
          <div className="mt-3">
            <div className="flex items-center justify-between">
              <Breadcrumb>
                <BreadcrumbList className="text-base">
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/" className="text-base">
                      <Home className="h-5 w-5" />
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-5 w-5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage className="flex items-center gap-1 text-base">
                      <Plane className="h-5 w-5" />
                      Multi City Flight
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <SortOptions
                sortBy={sortBy}
                onSortChange={handleSortChange}
                sortOrder={sortOrder}
                onSortOrderChange={handleSortOrderChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <div ref={mainContentRef} className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6">
        {/* Show full page loader when fetching initial flights */}
        {showLoader ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <FlightFlyingLoader size="large" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            {/* Sidebar - Visible only when not in initial loading state */}
            <div className="w-full lg:w-64 xl:w-72 2xl:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                <FlightFilterSidebar
                  searchQuery={searchPayload?.searchQuery || searchPayload}
                  onFilterChange={handleFilterChange}
                  onLoadingChange={(loading) => {
                    setIsFilterLoading(loading);
                  }}
                  onError={(error) => {
                    console.error('Filter error:', error);
                  }}
                  flightType="multicity"
                  availableAirlines={airlineStats}
                />
              </div>
            </div>

            {/* Flight List - Takes remaining space */}
            <div className="flex-1 min-w-0">
              {/* Show filter loading state */}
              {isFilterLoading ? (
                <div className="flex justify-center items-center py-20">
                  <FlightFlyingLoader size="medium" />
                </div>
              ) : (
                <div className="space-y-4">
                  {!isInternationalFlight && segments.length > 0 && (
                    <div className="mb-4">
                      <SelectedFlightsBottomBar
                        segments={segments}
                        selectedFlights={selectedFlights}
                        onBookNow={handleBookNow}
                        getFlightPrice={getFlightPrice}
                        currentSegment={currentSegment}
                        onSegmentClick={handleSegmentClick}
                      />
                    </div>
                  )}

                  {isInternationalFlight && internationalItineraries.length > 0 && (
                    <InternationalMultiFlightComboList
                      itineraries={internationalItineraries}
                      selectedItinerary={selectedInternationalItinerary}
                      onSelectItinerary={handleSelectInternationalItinerary}
                      onDeselectItinerary={handleDeselectInternationalItinerary}
                      onFareRuleLoaded={handleFareRuleLoaded}
                      isLoading={isLoading}
                      isReturnFlightSearch={true}
                    />
                  )}

                  {!isInternationalFlight && !isLoading && legFlights.size > 0 && (
                    <FlightList
                      currentSegment={currentSegment}
                      flights={currentFlights}
                      isLoading={isLoading}
                      selectedFlightId={selectedFlights.get(currentSegment)?.flightId || ''}
                      onSelectFlight={handleSelectFlight}
                      onViewDetails={handleViewDetails}
                      getFlightPrice={getFlightPrice}
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      totalFlights={totalFlights}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={handleItemsPerPageChange}
                    />
                  )}

                  {isLoading && (
                    <div className="flex items-center justify-center py-20">
                      <div className="text-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900">Searching for flights</h3>
                        <p className="text-gray-500">Finding the best deals for you...</p>
                      </div>
                    </div>
                  )}

                  {!isLoading &&
                    !isInternationalFlight &&
                    legFlights.size === 0 &&
                    currentFlights.length === 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <p className="text-gray-500">
                          No flights found. Try different search criteria.
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showFlightDetailsModal && modalFlight && (
        <FlightDetailsModal
          isOpen={showFlightDetailsModal}
          onClose={() => setShowFlightDetailsModal(false)}
          flightDetails={modalFlight}
          flightType={currentSegment === 0 ? 'departure' : 'return'}
        />
      )}
    </div>
  );
}