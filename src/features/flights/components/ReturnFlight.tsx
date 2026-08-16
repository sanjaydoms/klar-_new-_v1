import { parseLocation } from '../utils/utils';
import { ChevronRight, Home, Loader2, Plane, ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import FlightList from './ReturnFlight/FlightList';
import CommonSearchBar from './Common/CommonSearchBar';
import FlightFilterSidebar from './Common/filterSidebar';
import FlightDetailsModal from './modals/FlightDetailsModal';
import { toFlightDetailsView } from './ReturnFlight/flightDetailsView';
import { groupAndMap } from '../utils/groupFareVariants';
import { specialReturnPairingError } from '../utils/specialReturnPairing';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Flight, ReturnFlightProps, PairedFlight } from '../types/types.returnFlight';
import {
  getReviewDetails,
  searchReturnFlights,
  searchReturnFilterFlights,
} from '../../../api/flightService.api';
import InternationalReturnFlightComboList from './ReturnFlight/InternationalReturnFlightComboList';
import { notifyError, notifySuccess } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';
import { Button } from '@/components/ui/button';
import FlightFlyingLoader from '@/components/FlightCommon/FlightLoader'; // Import the loader
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

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

export default function ReturnFlight({ searchParams, onBack, onBookNow }: ReturnFlightProps) {
  const hasFetched = useRef(false);

  const [activeSearchParams, setActiveSearchParams] = useState({
    from: searchParams.from,
    to: searchParams.to,
    departure: searchParams.departureDate || searchParams.departure,
    returnDate:
      searchParams.returnDate ||
      (() => {
        const departureDateStr = searchParams.departure || searchParams.departureDate;
        if (!departureDateStr) return '';
        const date = new Date(departureDateStr);
        date.setDate(date.getDate() + 3);
        return date.toISOString().split('T')[0];
      })(),
    travelers: searchParams.travelers,
  });

  const fromLocation = useMemo(
    () => parseLocation(activeSearchParams.from),
    [activeSearchParams.from],
  );
  const toLocation = useMemo(() => parseLocation(activeSearchParams.to), [activeSearchParams.to]);

  const [onwardFlights, setOnwardFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [selectedOnwardFlight, setSelectedOnwardFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);

  const [roundTrips, setRoundTrips] = useState<PairedFlight[]>([]);
  const [selectedRoundTrip, setSelectedRoundTrip] = useState<PairedFlight | null>(null);
  const [flightType, setFlightType] = useState<'domestic' | 'international'>('domestic');

  const [showFlightDetailsModal, setShowFlightDetailsModal] = useState(false);
  const [modalFlight, setModalFlight] = useState<Flight | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [lastSearchPayload, setLastSearchPayload] = useState<any>(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [totalOnwardFlights, setTotalOnwardFlights] = useState(0);
  const [totalReturnFlights, setTotalReturnFlights] = useState(0);
  const [onwardNextCursor, setOnwardNextCursor] = useState<string | null>(null);
  const [returnNextCursor, setReturnNextCursor] = useState<string | null>(null);
  const [onwardHasMore, setOnwardHasMore] = useState(true);
  const [returnHasMore, setReturnHasMore] = useState(true);
  const [isLoadingMoreOnward, setIsLoadingMoreOnward] = useState(false);
  const [isLoadingMoreReturn, setIsLoadingMoreReturn] = useState(false);
  const [departureFareRuleData, setDepartureFareRuleData] = useState<any>(null);
  const [returnFareRuleData, setReturnFareRuleData] = useState<any>(null);
  const [airlineStats, setAirlineStats] = useState<
    { airline: string; airlineCode: string; flights: number }[]
  >([]);

  const [sortBy, setSortBy] = useState('cheapest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const mainContentRef = useRef<HTMLDivElement>(null);

  const handleFareRuleLoaded = (fareRuleData: any, flightType: string, fareId?: string) => {
    if (flightType === 'departure') {
      setDepartureFareRuleData(fareRuleData);
      if (fareId) {
        sessionStorage.setItem('selectedDepartureFareId', fareId);
      }
    } else if (flightType === 'return') {
      setReturnFareRuleData(fareRuleData);
      if (fareId) {
        sessionStorage.setItem('selectedReturnFareId', fareId);
      }
    }
    notifySuccess('Fare details loaded successfully', 'Success');
  };

  const extractDateParts = (dateTimeStr: string) => {
    if (!dateTimeStr) return { date: '', day: '', time: '' };
    try {
      const date = new Date(dateTimeStr);
      const dayNames = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
      const day = dayNames[date.getDay()];
      const dateStr = dateTimeStr.split('T')[0];
      const timeStr = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return { date: dateStr, day, time: timeStr };
    } catch (error) {
      return { date: '', day: '', time: '' };
    }
  };

  const mapFlightData = (flight: any): Flight => {
    const departureDateTime =
      flight.departure?.datetime || flight.departure?.dateTime || flight.datetime;
    const arrivalDateTime = flight.arrival?.datetime || flight.arrival?.dateTime;

    const departureParts = extractDateParts(departureDateTime);
    const arrivalParts = extractDateParts(arrivalDateTime);

    return {
      flightId: flight.flightKey || flight.id,
      id: flight.flightKey || flight.id,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      flightNumber: flight.flightNumber,
      departure: {
        airportCode: flight.from?.airportCode || flight.departure?.airportCode,
        airport: flight.from?.city || flight.departure?.airport,
        time: departureParts.time || flight.departure?.time || flight.from?.time,
        date: departureParts.date || flight.departure?.date || flight.from?.date,
        day: departureParts.day || flight.departure?.day,
        datetime: departureDateTime,
        terminal: flight.from?.terminal || flight.departure?.terminal,
      },
      arrival: {
        airportCode: flight.to?.airportCode || flight.arrival?.airportCode,
        airport: flight.to?.city || flight.arrival?.airport,
        time: arrivalParts.time || flight.arrival?.time || flight.to?.time,
        date: arrivalParts.date || flight.arrival?.date || flight.to?.date,
        day: arrivalParts.day || flight.arrival?.day,
        datetime: arrivalDateTime,
        terminal: flight.to?.terminal || flight.arrival?.terminal,
      },
      duration: flight.duration,
      stops: flight.stops || 0,
      stopDetails: flight.stopDetails || { count: flight.stops || 0 },
      price: flight.price || 0,
      currency: '₹',
      class: flight.cabinClass || '',
      searchId: flight.searchId,
      segmentId: flight.flightKey,
      isRefundable: false,
      baggage: null,
      fareOptions: flight.fareOptions || [
        {
          totalFare: flight.price,
          cabinClass: flight.cabinClass,
          priceId: flight.priceId,
        },
      ],
      // Fare-group meta the normalizer already sends; the card's fare strip
      // reads it. Dropping it here is what made the variants indistinguishable.
      fareId: flight.fareId,
      fareIdentifier: flight.fareIdentifier,
      refundable: flight.refundable,
      seatsRemaining: flight.seatsRemaining,
      checkInBaggage: flight.checkInBaggage,
      cabinBaggage: flight.cabinBaggage,
    };
  };

  // Three call sites map roundTrips; all three used to drop the COMBO fare's
  // meta, which lives on the trip rather than on either leg.
  const toPairedFlight = (trip: any): PairedFlight => ({
    onward: mapFlightData(trip.onward),
    return: mapFlightData(trip.return),
    totalPrice: trip.totalPrice,
    refundable: trip.refundable,
    checkInBaggage: trip.checkInBaggage,
    cabinBaggage: trip.cabinBaggage,
  });

  const getSortByField = (sort: string): string => {
    switch (sort) {
      case 'cheapest':
        return 'price';
      case 'quickest':
        return 'duration';
      case 'earliest':
        return 'departureTime';
      case 'arrival':
        return 'arrivalTime';
      case 'stops':
        return 'stops';
      case 'airline':
        return 'airline';
      default:
        return 'price';
    }
  };

  const fetchFlights = useCallback(
    async (
      payload: any,
      isLoadMore = false,
      onwardCursor?: string | null,
      returnCursor?: string | null,
    ) => {
      try {
        if (isLoadMore) {
          if (onwardCursor) setIsLoadingMoreOnward(true);
          if (returnCursor) setIsLoadingMoreReturn(true);
        } else {
          setIsFetching(true);
          setOnwardFlights([]);
          setReturnFlights([]);
          setRoundTrips([]);
          setOnwardNextCursor(null);
          setReturnNextCursor(null);
          setOnwardHasMore(true);
          setReturnHasMore(true);
          setIsFilterApplied(false);
        }

        setFetchError('');

        const requestPayload: any = { ...payload };

        if (isLoadMore) {
          if (onwardCursor) requestPayload.onwardCursor = onwardCursor;
          if (returnCursor) requestPayload.returnCursor = returnCursor;
        }

        const sortByField = getSortByField(sortBy);
        const isSortingApplied = true;

        let response;
        console.log(`Calling API with sortBy: ${sortByField}, sortOrder: ${sortOrder}`);

        if (isSortingApplied) {
          response = await searchReturnFilterFlights(requestPayload, sortByField, sortOrder);
        } else {
          response = await searchReturnFlights(requestPayload);
        }

        sessionStorage.setItem('returnFlightSessionId', response.data.sessionId);

        if (response.data?.airlineStats) {
          setAirlineStats(response.data.airlineStats);
        }

        if (response && response.success !== false) {
          if (response?.data?.flights?.roundTrips && response.data.flights.roundTrips.length > 0) {
            const roundTripsData = response.data.flights.roundTrips;
            const mappedRoundTrips: PairedFlight[] = roundTripsData.map(toPairedFlight);

            setRoundTrips(mappedRoundTrips);
            setFlightType('international');

            if (!isLoadMore && mappedRoundTrips.length === 0) {
              setFetchError('No flight combinations found for the selected route');
              notifyError('No flight combinations found for the selected route', 'Search Failed');
            }
          } else {
            let onwardFlightsList: Flight[] = [];
            let returnFlightsList: Flight[] = [];

            const onwardData = response?.data?.flights?.onward || [];
            const returnData = response?.data?.flights?.return || [];

            if (Array.isArray(onwardData) && onwardData.length > 0) {
              onwardFlightsList = groupAndMap(onwardData, mapFlightData);
            }

            if (Array.isArray(returnData) && returnData.length > 0) {
              returnFlightsList = groupAndMap(returnData, mapFlightData);
            }

            console.log('Mapped Onward Flights:', onwardFlightsList.length);
            console.log('Mapped Return Flights:', returnFlightsList.length);

            if (isLoadMore) {
              setOnwardFlights((prev) => [...prev, ...onwardFlightsList]);
              setReturnFlights((prev) => [...prev, ...returnFlightsList]);
              if (onwardFlightsList.length > 0 || returnFlightsList.length > 0) {
                notifySuccess(
                  `Loaded ${onwardFlightsList.length} onward and ${returnFlightsList.length} return flights`,
                  'Success',
                );
              }
            } else {
              setOnwardFlights(onwardFlightsList);
              setReturnFlights(returnFlightsList);
              setFlightType('domestic');
            }

            setTotalOnwardFlights(onwardFlightsList.length);
            setTotalReturnFlights(returnFlightsList.length);

            if (!isLoadMore && onwardFlightsList.length === 0 && returnFlightsList.length === 0) {
              setFetchError('No flights found for the selected route');
              notifyError('No flights found for the selected route', 'Search Failed');
            }
          }

          setOnwardNextCursor(response.data?.onwardNextCursor || null);
          setReturnNextCursor(response.data?.returnNextCursor || null);
          setOnwardHasMore(response.data?.onwardHasMore || false);
          setReturnHasMore(response.data?.returnHasMore || false);

          if (!isLoadMore) {
            setSelectedOnwardFlight(null);
            setDepartureFareRuleData(null);
            setSelectedReturnFlight(null);
            setReturnFareRuleData(null);
            setSelectedRoundTrip(null);
          }
        } else {
          setFetchError(response?.message || 'No flights found for the selected route');
          notifyError(
            response?.message || 'No flights found for the selected route',
            'Search Failed',
          );
        }
      } catch (err) {
        console.error('Error fetching flights:', err);
      } finally {
        setIsFetching(false);
        setIsLoadingMoreOnward(false);
        setIsLoadingMoreReturn(false);
      }
    },
    // notifyError/notifySuccess are module-level and stable — not deps.
    [sortBy, sortOrder],
  );

  const handleSortChange = (newSortBy: string) => {
    console.log(`Sort changed to: ${newSortBy}, current order: ${sortOrder}`);
    setSortBy(newSortBy);
    if (lastSearchPayload) {
      setSelectedOnwardFlight(null);
      setDepartureFareRuleData(null);
      setSelectedReturnFlight(null);
      setReturnFareRuleData(null);
      setSelectedRoundTrip(null);
      setIsFilterApplied(false);
      fetchFlights(lastSearchPayload, false, null, null);
    }
  };

  const handleSortOrderChange = (newSortOrder: 'asc' | 'desc') => {
    console.log(`Sort order changed to: ${newSortOrder}, current sortBy: ${sortBy}`);
    setSortOrder(newSortOrder);
    if (lastSearchPayload) {
      setSelectedOnwardFlight(null);
      setDepartureFareRuleData(null);
      setSelectedReturnFlight(null);
      setReturnFareRuleData(null);
      setSelectedRoundTrip(null);
      setIsFilterApplied(false);
      fetchFlights(lastSearchPayload, false, null, null);
    }
  };

  const handleFilteredFlights = (filteredFlightsData: any) => {
    console.log('Filtered flights data received:', filteredFlightsData);

    if (filteredFlightsData?.type === 'international' || filteredFlightsData?.data?.roundTrips) {
      const roundTripsData =
        filteredFlightsData.data?.roundTrips || filteredFlightsData?.roundTrips;

      if (roundTripsData && Array.isArray(roundTripsData)) {
        const mappedRoundTrips = roundTripsData.map(toPairedFlight);
        setRoundTrips(mappedRoundTrips);
        setFlightType('international');
        setIsFilterApplied(true);
        notifySuccess('Filters applied successfully', 'Success');
        return;
      }
    }

    if (filteredFlightsData?.roundTrips && Array.isArray(filteredFlightsData.roundTrips)) {
      const mappedRoundTrips = filteredFlightsData.roundTrips.map(toPairedFlight);
      setRoundTrips(mappedRoundTrips);
      setFlightType('international');
      setIsFilterApplied(true);
      notifySuccess('Filters applied successfully', 'Success');
      return;
    }

    let onwardData = [];
    let returnData = [];

    if (filteredFlightsData?.type === 'domestic') {
      onwardData = filteredFlightsData.data?.onwardFlights || [];
      returnData = filteredFlightsData.data?.returnFlights || [];
    } else if (filteredFlightsData?.data?.flights) {
      onwardData = filteredFlightsData.data.flights.onward || [];
      returnData = filteredFlightsData.data.flights.return || [];
    } else if (filteredFlightsData?.flights) {
      onwardData = filteredFlightsData.flights.onward || [];
      returnData = filteredFlightsData.flights.return || [];
    } else if (filteredFlightsData?.onwardFlights || filteredFlightsData?.returnFlights) {
      onwardData = filteredFlightsData.onwardFlights || [];
      returnData = filteredFlightsData.returnFlights || [];
    } else {
      console.error('Unexpected filter response structure:', filteredFlightsData);
      return;
    }

    const mappedOnward = groupAndMap(onwardData, mapFlightData);
    const mappedReturn = groupAndMap(returnData, mapFlightData);

    setOnwardFlights(mappedOnward);
    setReturnFlights(mappedReturn);
    setFlightType('domestic');
    setIsFilterApplied(true);
    setOnwardHasMore(false);
    setReturnHasMore(false);
    notifySuccess('Filters applied successfully', 'Success');

    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (!paramsString) return;

    const parsedParams = JSON.parse(paramsString);
    const departureDate = parsedParams.departureDate || parsedParams.departure;
    const initialReturnDate =
      parsedParams.returnDate ||
      (departureDate
        ? (() => {
            const date = new Date(departureDate);
            date.setDate(date.getDate() + 3);
            return date.toISOString().split('T')[0];
          })()
        : '');

    const travelerDetails = parsedParams.travelerDetails || { adults: 1, children: 0, infants: 0 };
    const fromCode = parseLocation(parsedParams.from).code;
    const toCode = parseLocation(parsedParams.to).code;

    const payload = {
      cabinClass: parsedParams.class?.toUpperCase() || 'ECONOMY',
      paxInfo: {
        ADULT: travelerDetails.adults,
        CHILD: travelerDetails.children,
        INFANT: travelerDetails.infants,
      },
      routeInfos: [
        {
          fromCityOrAirport: { code: fromCode },
          toCityOrAirport: { code: toCode },
          travelDate: departureDate,
        },
        {
          fromCityOrAirport: { code: toCode },
          toCityOrAirport: { code: fromCode },
          travelDate: initialReturnDate,
        },
      ],
      searchModifiers: {
        isDirectFlight: true,
        isConnectingFlight: true,
        pft: 'REGULAR',
      },
    };

    console.log('FINAL PAYLOAD:', payload);
    setLastSearchPayload(payload);
    fetchFlights(payload);
  }, []);

  const handleSearch = async (payload: any) => {
    const searchQuery = payload.searchQuery || payload;
    const firstRoute = searchQuery.routeInfos?.[0];
    const secondRoute = searchQuery.routeInfos?.[1];

    if (firstRoute && secondRoute) {
      setActiveSearchParams({
        from: firstRoute.fromCityOrAirport.code,
        to: firstRoute.toCityOrAirport.code,
        departure: firstRoute.travelDate,
        returnDate: secondRoute.travelDate,
        travelers: `${searchQuery.paxInfo?.ADULT || 1} Adult, ${searchQuery.cabinClass || 'Economy'}`,
      });
    }

    setSelectedOnwardFlight(null);
    setDepartureFareRuleData(null);
    setSelectedReturnFlight(null);
    setReturnFareRuleData(null);
    setSelectedRoundTrip(null);
    setIsFilterApplied(false);
    setLastSearchPayload(searchQuery);

    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    await fetchFlights(searchQuery);
  };

  const handleBookNow = async (): Promise<void> => {
    if (flightType === 'domestic' && selectedOnwardFlight && selectedReturnFlight) {
      // Same rule the backend applies at Review; catching it here saves a
      // round trip and reports it in the fare's own terms.
      const mismatch = specialReturnPairingError(departureFareRuleData, returnFareRuleData);
      if (mismatch) {
        notifyError(mismatch, 'Special Return fares');
        return;
      }

      let departurePriceId: string | null = sessionStorage.getItem('selectedDepartureFareId');
      let returnPriceId: string | null = sessionStorage.getItem('selectedReturnFareId');

      console.log('Retrieved departure fare ID:', departurePriceId);
      console.log('Retrieved return fare ID:', returnPriceId);

      if (
        !departurePriceId &&
        selectedOnwardFlight.fareOptions &&
        selectedOnwardFlight.fareOptions.length > 0
      ) {
        const firstFareOption = selectedOnwardFlight.fareOptions[0];
        departurePriceId =
          firstFareOption?.priceId || firstFareOption?.id || firstFareOption?.fareId || null;
      }

      if (
        !returnPriceId &&
        selectedReturnFlight.fareOptions &&
        selectedReturnFlight.fareOptions.length > 0
      ) {
        const firstFareOption = selectedReturnFlight.fareOptions[0];
        returnPriceId =
          firstFareOption?.priceId || firstFareOption?.id || firstFareOption?.fareId || null;
      }

      if (!departurePriceId || !returnPriceId) {
        notifyError('Missing fare information. Please select the flights again.');
        return;
      }

      setIsBooking(true);

      try {
        const reviewResponse = await getReviewDetails({
          priceIds: [departurePriceId, returnPriceId],
        });

        if (reviewResponse.data.mappedData.status.success === false) {
          // The backend names the real cause (fare pairing, price change, sold
          // out). Reporting "Not get review data" instead threw that away.
          const supplierMessage =
            reviewResponse.data.mappedData.status.message ||
            reviewResponse.message ||
            reviewResponse.data.message;
          console.log('ERROR: review rejected', supplierMessage);
          notifyError(supplierMessage || 'Unable to get flight review details. Please try again.');
          setIsBooking(false);
          return;
        }

        const keysToCheck = ['bookingId', 'onewayReviewData', 'ancillarySessionId'];
        keysToCheck.forEach((key) => {
          if (sessionStorage.getItem(key)) {
            console.log(`Clearing existing ${key} from session storage`);
            sessionStorage.removeItem(key);
          }
        });

        storeReviewData(reviewResponse);
        sessionStorage.setItem('bookingId', reviewResponse.data?.mappedData?.bookingId);
        sessionStorage.setItem('ancillarySessionId', reviewResponse.data?.sessionId);

        const isSuccess =
          reviewResponse?.success === true ||
          reviewResponse?.status === 'success' ||
          reviewResponse?.data?.success === true;

        if (isSuccess) {
          if (reviewResponse?.data) {
            sessionStorage.setItem('reviewDetails', JSON.stringify(reviewResponse.data));
          }

          sessionStorage.setItem('selectedDepartureFareId', departurePriceId);
          sessionStorage.setItem('selectedReturnFareId', returnPriceId);

          const totalPrice = (selectedOnwardFlight.price || 0) + (selectedReturnFlight.price || 0);
          const flightData = {
            tripType: 'return',
            totalFare: totalPrice,
            currency: selectedOnwardFlight.currency || '₹',
            onwardFlight: selectedOnwardFlight,
            returnFlight: selectedReturnFlight,
            from: fromLocation.code,
            to: toLocation.code,
            departureDate: activeSearchParams.departure,
            returnDate: activeSearchParams.returnDate,
            departurePriceId: departurePriceId,
            returnPriceId: returnPriceId,
            reviewData: reviewResponse.data,
            flightType: 'domestic',
          };

          sessionStorage.setItem('selectedFlight', JSON.stringify(flightData));
          notifySuccess('Flight details confirmed! Proceeding to traveler information');

          setTimeout(() => {
            onBookNow?.();
          }, 500);
        } else {
          let errorMessage = 'Unable to get flight review details. Please try again.';
          if (reviewResponse?.message) errorMessage = reviewResponse.message;
          else if (reviewResponse?.error) errorMessage = reviewResponse.error;
          notifyError(errorMessage);
          setSelectedOnwardFlight(null);
          setDepartureFareRuleData(null);
          setSelectedReturnFlight(null);
          setReturnFareRuleData(null);
        }
      } catch (err: unknown) {
        console.error('Error getting review details:', err);
        notifyError('Unable to confirm flight details. Please try again.');
      } finally {
        setIsBooking(false);
      }
    } else {
      notifyError('Please select both onward and return flights before proceeding');
    }
  };

  const handleSelectFlight = async (flight: Flight, type: 'onward' | 'return') => {
    if (type === 'onward') {
      setSelectedOnwardFlight(flight);
    } else {
      setSelectedReturnFlight(flight);
    }
  };

  const handleSelectRoundTrip = (combo: PairedFlight) => {
    setSelectedRoundTrip(combo);
    setSelectedOnwardFlight(null);
    setDepartureFareRuleData(null);
    setSelectedReturnFlight(null);
    setReturnFareRuleData(null);
  };

  const shouldShowBookingButton =
    (flightType === 'domestic' && selectedOnwardFlight && selectedReturnFlight) ||
    (flightType === 'international' && selectedRoundTrip);

  // Only domestic returns can be mismatched — an international COMBO is one
  // fare covering both legs. The confirmed fare objects arrive through
  // handleFareRuleLoaded and carry fareIdentifier/sri/msri.
  const pairingError =
    flightType === 'domestic'
      ? specialReturnPairingError(departureFareRuleData, returnFareRuleData)
      : null;

  const getTotalPrice = () => {
    if (flightType === 'international' && selectedRoundTrip) {
      return selectedRoundTrip.totalPrice;
    } else if (flightType === 'domestic' && selectedOnwardFlight && selectedReturnFlight) {
      return selectedOnwardFlight.price + selectedReturnFlight.price;
    }
    return 0;
  };

  const handleCancelSelection = () => {
    if (flightType === 'domestic') {
      setSelectedOnwardFlight(null);
      setDepartureFareRuleData(null);
      setSelectedReturnFlight(null);
      setReturnFareRuleData(null);

      sessionStorage.removeItem('selectedDepartureFareId');
      sessionStorage.removeItem('selectedReturnFareId');
    } else {
      setSelectedRoundTrip(null);
    }
  };

  // Check if loader should be shown
  const showLoader = isFetching && !isFilterLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 bg-white">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold mt-22 text-gray-900"></h1>
          </div>
          <div className="w-full">
            <CommonSearchBar
              onSearch={handleSearch}
              isLoading={isFetching}
              initialParams={{
                tripType: 'return',
                from: activeSearchParams.from,
                to: activeSearchParams.to,
                departureDate: activeSearchParams.departure,
                returnDate: activeSearchParams.returnDate,
                cabinClass: (() => {
                  const paramsString = sessionStorage.getItem('flightSearchParams');
                  if (paramsString) {
                    const parsedParams = JSON.parse(paramsString);
                    const cabinClass = parsedParams.class || parsedParams.cabinClass;
                    return cabinClass?.toUpperCase() || 'ECONOMY';
                  }
                  return 'ECONOMY';
                })(),
                paxInfo: (() => {
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
                })(),
              }}
            />
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-2 bg-white border-gray-200">
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
                  Return Flight
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

      <div ref={mainContentRef} className="w-full px-4 sm:px-6 lg:px-8 py-4">
        {/* Show full page loader when fetching initial flights */}
        {showLoader ? (
          <div className="flex items-center justify-center h-[calc(100vh-200px)]">
            <FlightFlyingLoader size="large" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar - Visible only when not in initial loading state */}
            <div className="w-full lg:w-72 xl:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 h-[calc(100vh-140px)] overflow-y-auto scrollbar-hide">
                <FlightFilterSidebar
                  searchQuery={lastSearchPayload}
                  onFilterChange={handleFilteredFlights}
                  onLoadingChange={setIsFilterLoading}
                  onError={(errorMsg) => notifyError(errorMsg, 'Filter Error')}
                  flightType="return"
                  availableAirlines={airlineStats}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Show filter loading state */}
              {isFilterLoading ? (
                <div className="flex items-center justify-center py-12 h-[calc(100vh-140px)]">
                  <FlightFlyingLoader size="medium" />
                </div>
              ) : (
                <>
                  {flightType === 'international' ? (
                    <InternationalReturnFlightComboList
                      combos={roundTrips}
                      selectedCombo={selectedRoundTrip}
                      onSelectCombo={handleSelectRoundTrip}
                      onDeselectCombo={() => setSelectedRoundTrip(null)}
                      onOnwardFareRuleLoaded={handleFareRuleLoaded}
                      onReturnFareRuleLoaded={handleFareRuleLoaded}
                      isLoading={isFetching}
                      isReturnFlightSearch={true}
                    />
                  ) : (
                    <div className="h-[calc(100vh-140px)]">
                      <div className="flex flex-col lg:flex-row gap-4 h-full">
                        <div className="flex-1 min-w-0 h-full">
                          <FlightList
                            title="Departure Flights"
                            flights={onwardFlights}
                            selectedFlight={selectedOnwardFlight}
                            onSelectFlight={(flight) => handleSelectFlight(flight, 'onward')}
                            onDeselectFlight={() => {
                              setSelectedOnwardFlight(null);
                              setDepartureFareRuleData(null);
                            }}
                            onViewDetails={(flight) => {
                              // Rendered from the search result already in hand —
                              // see flightDetailsView. The endpoint this used to
                              // call does not exist.
                              setModalFlight(toFlightDetailsView(flight) as any);
                              setShowFlightDetailsModal(true);
                            }}
                            fromCode={fromLocation.code}
                            toCode={toLocation.code}
                            date={activeSearchParams.departure}
                            isLoading={false}
                            onFareRuleLoaded={handleFareRuleLoaded}
                            isReturnFlight={true}
                            type="departure"
                          />
                        </div>

                        <div className="flex-1 min-w-0 h-full">
                          <FlightList
                            title="Return Flights"
                            flights={returnFlights}
                            selectedFlight={selectedReturnFlight}
                            onSelectFlight={(flight) => handleSelectFlight(flight, 'return')}
                            onDeselectFlight={() => {
                              setSelectedReturnFlight(null);
                              setReturnFareRuleData(null);
                            }}
                            onViewDetails={(flight) => {
                              // Rendered from the search result already in hand —
                              // see flightDetailsView. The endpoint this used to
                              // call does not exist.
                              setModalFlight(toFlightDetailsView(flight) as any);
                              setShowFlightDetailsModal(true);
                            }}
                            fromCode={toLocation.code}
                            toCode={fromLocation.code}
                            date={activeSearchParams.returnDate}
                            isLoading={false}
                            onFareRuleLoaded={handleFareRuleLoaded}
                            isReturnFlight={true}
                            type="return"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {fetchError && !isFetching && !isFilterLoading && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex-shrink-0">
                      <p>{fetchError}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {shouldShowBookingButton && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
          {pairingError && (
            <div
              role="alert"
              className="max-w-7xl mx-auto mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
            >
              {pairingError}
            </div>
          )}
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Price</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹ {getTotalPrice().toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">Includes taxes and fees</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancelSelection}
                disabled={isBooking}
                className="h-12 px-8 font-bold shadow-lg"
              >
                Cancel
              </Button>

              <Button
                onClick={handleBookNow}
                disabled={isBooking || !!pairingError}
                className="h-12 px-8 font-bold shadow-lg"
              >
                {isBooking ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  'Book Now'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {isBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-gray-700 font-medium">Confirming your booking...</p>
          </div>
        </div>
      )}

      {showFlightDetailsModal && modalFlight && (
        <FlightDetailsModal
          isOpen={showFlightDetailsModal}
          onClose={() => setShowFlightDetailsModal(false)}
          flightDetails={modalFlight}
          flightType="departure"
        />
      )}
    </div>
  );
}
