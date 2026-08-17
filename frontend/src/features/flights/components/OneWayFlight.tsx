import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, ChevronRight, Plane, ArrowUpDown, ChevronDown, Check } from 'lucide-react';

import CommonSearchBar from './Common/CommonSearchBar';
import OneWayFlightList from './OneWayFlights/OnewayFlightlist';
import OneWayFlightDetailsModal from './OneWayFlights/OneWayFlightDetailsModal';
import FareOptionsModal from './modals/FareOptionsModal';
import { FlightData, SearchParams } from '../types/types.oneWayFlight';
import FlightFilterSidebar from './Common/filterSidebar';
import { buildFlightSearchPayload } from '../utils/flightPayloadBuilder';
import { searchOneWayFlights } from '@/api/flightService.api';
import SessionStorageService from '../utils/sessionStorage.service';
import FlightFlyingLoader from '@/components/FlightCommon/FlightLoader';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import FareRulesPage from '../../flights/components/OneWayFlights/FareRuleDetails';
import { searchAirports } from '@/services/flightApi';
import { notifyError, notifyWarning } from '@/utils/notify';

interface OneWayFlightProps {
  onBack?: () => void;
  onBookNow?: () => void;
}

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
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${sortBy === option.key ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortOrder === 'asc'
                        ? 'bg-primary text-primary-foreground'
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
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortOrder === 'desc'
                        ? 'bg-primary text-primary-foreground'
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
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortOrder === 'asc'
                        ? 'bg-primary text-primary-foreground'
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
                      className={`flex-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${sortOrder === 'desc'
                        ? 'bg-primary text-primary-foreground'
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
            className={`px-2.5 py-1.5 text-sm font-medium transition-colors ${sortOrder === 'asc'
              ? 'bg-primary text-primary-foreground'
              : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            title="Ascending"
          >
            ↑
          </button>
          <button
            onClick={() => onSortOrderChange('desc')}
            className={`px-2.5 py-1.5 text-sm font-medium transition-colors ${sortOrder === 'desc'
              ? 'bg-primary text-primary-foreground'
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

export default function OneWayFlight({ onBack, onBookNow }: OneWayFlightProps) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [sortBy, setSortBy] = useState('cheapest');
  const [searchMetadata, setSearchMetadata] = useState({
    searchParams: null,
    searchType: '',
    totalFlights: 0,
    routeCount: 0,
    airlineStats: [],
  });

  const [flights, setFlights] = useState<FlightData[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<FlightData[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [showFlightDetailsModal, setShowFlightDetailsModal] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState<FlightData | null>(null);

  const [activeModalTab, setActiveModalTab] = useState('flight-details');
  const [showFareOptionsModal, setShowFareOptionsModal] = useState(false);
  const [selectedFareClass, setSelectedFareClass] = useState('economy');
  const [lastSearchPayload, setLastSearchPayload] = useState<any>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const initialFetchDone = useRef(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [showFareRulesPopup, setShowFareRulesPopup] = useState(false);
  const [fareRulesData, setFareRulesData] = useState<any>(null);

  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const mainContentRef = useRef<HTMLDivElement>(null);

  const [routeData, setRouteData] = useState<{ from: string; to: string } | null>(null);
  const [isAutoSearchTriggered, setIsAutoSearchTriggered] = useState(false);

  useEffect(() => {
    const state = location.state as { from?: string; to?: string; tripType?: string };
    if (state?.from && state?.to && state?.tripType === 'oneway') {
      setRouteData({ from: state.from, to: state.to });
      sessionStorage.setItem('footerRouteData', JSON.stringify({ from: state.from, to: state.to }));
    } else {
      const storedRouteData = sessionStorage.getItem('footerRouteData');
      if (storedRouteData) {
        try {
          const parsed = JSON.parse(storedRouteData);
          setRouteData(parsed);
        } catch (e) {
          console.error('Failed to parse stored route data:', e);
        }
      }
    }
  }, [location]);

  const getLocationDetails = async (cityName: string): Promise<{ displayValue: string; code: string } | null> => {
    try {
      const results = await searchAirports(cityName);
      if (results && results.length > 0) {
        const airport = results[0];
        const displayValue = `${airport?.city} (${airport?.code}), ${airport?.country}`;
        return { displayValue, code: airport?.code as any };
      }
      return null;
    } catch (error) {
      console.error('Error fetching airport details:', error);
      return null;
    }
  };

  useEffect(() => {
    if (routeData && !isAutoSearchTriggered) {
      const { from, to } = routeData;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().split('T')[0];

      const fetchLocationDetails = async () => {
        try {
          const fromDetails = await getLocationDetails(from);
          const toDetails = await getLocationDetails(to);

          if (!fromDetails || !toDetails) {
            notifyError('Could not find airport details for the selected cities', 'Location Error');
            setRouteData(null);
            return;
          }

          const params = {
            tripType: 'oneway',
            from: fromDetails.displayValue,
            to: toDetails.displayValue,
            departureDate: defaultDate,
            class: 'ECONOMY',
            travelerDetails: {
              adults: 1,
              children: 0,
              infants: 0,
              total: 1,
            },
            paxInfo: {
              ADULT: 1,
              CHILD: 0,
              INFANT: 0,
            },
          };

          setSearchParams(params as any);
          setSelectedDate(defaultDate as any);

          const payload = buildFlightSearchPayload(params);
          setLastSearchPayload(payload);
          fetchFlights(payload, false, null);
          setIsAutoSearchTriggered(true);

          sessionStorage.removeItem('footerRouteData');
          setRouteData(null);
        } catch (err) {
          console.error('Error fetching location details:', err);
          notifyError('Failed to get airport details. Please try again.', 'Error');
          setRouteData(null);
        }
      };

      fetchLocationDetails();
      return;
    }

    if (initialFetchDone.current) return;

    const paramsString = sessionStorage.getItem('flightSearchParams');
    if (paramsString) {
      const parsedParams = JSON.parse(paramsString);
      setSearchParams(parsedParams);
      setSelectedDate(parsedParams.departureDate);

      const payload = buildFlightSearchPayload(parsedParams);

      setLastSearchPayload(payload);
      fetchFlights(payload, false, null);
      initialFetchDone.current = true;
    }
  }, [routeData, isAutoSearchTriggered]);

  const fetchFlights = async (payload: any, isLoadMore = false, cursor?: string | null) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true);
      } else {
        setIsFetching(true);
        setFlights([]);
        setFilteredFlights([]);
        setNextCursor(null);
        setHasMore(true);
        setIsFilterApplied(false);
      }

      setFetchError('');

      let requestPayload: any = { ...payload };

      if (cursor) {
        requestPayload.cursor = cursor;
      }

      if (!isLoadMore && itemsPerPage) {
        requestPayload.limit = itemsPerPage;
      }

      if (sortBy) {
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
        requestPayload.sortBy = getSortByField(sortBy);
        requestPayload.sortOrder = sortOrder;
      }

      SessionStorageService.set('onewaysearchpayload', requestPayload);

      const response = await searchOneWayFlights(requestPayload);

      if (response.data?.sessionId) {
        sessionStorage.setItem('onewayFlightSessionId', response.data.sessionId);
        console.log('Stored sessionId from response.data:', response.data.sessionId);
      } else if (response.sessionId) {
        sessionStorage.setItem('onewayFlightSessionId', response.sessionId);
        console.log('Stored sessionId from response:', response.sessionId);
      } else {
        console.warn('No sessionId found in response:', response);
      }

      if (response.data?.sessionId) {
        sessionStorage.setItem('onewayFlightSessionId', response.data.sessionId);
      }

      if (response.success === true) {
        const flightsData = response.data.flights || [];
        const newCursor = response.data.nextCursor || null;
        const hasMoreData = response.data.hasMore || false;

        if (flightsData.length === 0) {
          notifyError(
            'No flights available for this route. Please try different dates or destinations or class.',
            'Flights Not Available',
          );
        }

        if (isLoadMore) {
          setFlights((prev) => [...prev, ...flightsData]);
          setFilteredFlights((prev) => [...prev, ...flightsData]);
        } else {
          setFlights(flightsData);
          setFilteredFlights(flightsData);
        }

        setNextCursor(newCursor);
        setHasMore(hasMoreData);
        setTotalCount(response.data.totalCount || flightsData.length);

        setSearchMetadata({
          searchParams: response.data.searchParams,
          searchType: response.data.searchType,
          totalFlights: response.data.totalCount || flightsData.length,
          routeCount: response.data.routeCount || 1,
          airlineStats: response.data.airlineStats || [],
        });
      } else {
        const errorMessage =
          response.message ||
          'No flights found for the selected route. Please try different search criteria.';
        notifyError(errorMessage, 'Flight Search Failed');
        setFetchError(errorMessage);
        setFlights([]);
        setFilteredFlights([]);
        setHasMore(false);
      }
    } catch (err: any) {
      console.error('Error fetching flights:', err);

      if (err.code === 'NETWORK_ERROR') {
        notifyError(
          'Network error occurred. Please check your internet connection and try again.',
          'Connection Error',
        );
      } else if (err.response?.status === 404) {
        notifyError(
          'Flight service is temporarily unavailable. Please try again later.',
          'Service Unavailable',
        );
      } else if (err.response?.status === 500) {
        notifyError(
          'Server error occurred. Our team has been notified. Please try again later.',
          'Server Error',
        );
      } else if (err.response?.status === 429) {
        notifyError(
          'Too many requests. Please wait a moment before trying again.',
          'Rate Limit Exceeded',
        );
      } else {
        notifyError(
          err.message || 'An error occurred while searching for flights. Please try again.',
          'Error',
        );
      }

      setFetchError('An error occurred while searching for flights');
      setFlights([]);
      setFilteredFlights([]);
      setHasMore(false);
    } finally {
      setIsFetching(false);
      setIsLoadingMore(false);
    }
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    if (lastSearchPayload) {
      setCurrentPage(1);
      setNextCursor(null);
      setHasMore(true);
      setIsFilterApplied(false);
      fetchFlights(lastSearchPayload, false, null);
    }
  };

  const handleSortOrderChange = (newSortOrder: 'asc' | 'desc') => {
    setSortOrder(newSortOrder);
    if (lastSearchPayload) {
      setCurrentPage(1);
      setNextCursor(null);
      setHasMore(true);
      setIsFilterApplied(false);
      fetchFlights(lastSearchPayload, false, null);
    }
  };

  const handleSearch = async (payload: any) => {
    if (!payload.searchQuery.routeInfos[0].fromCityOrAirport.code) {
      notifyError('Please select a departure city', 'Validation Error');
      return;
    }

    if (!payload.searchQuery.routeInfos[0].toCityOrAirport.code) {
      notifyError('Please select an arrival city', 'Validation Error');
      return;
    }

    if (!payload.searchQuery.routeInfos[0].travelDate) {
      notifyError('Please select a travel date', 'Validation Error');
      return;
    }

    const transformedPayload = {
      cabinClass: payload.searchQuery.cabinClass || 'ECONOMY',
      paxInfo: {
        ADULT: parseInt(payload.searchQuery.paxInfo.ADULT),
        CHILD: parseInt(payload.searchQuery.paxInfo.CHILD),
        INFANT: parseInt(payload.searchQuery.paxInfo.INFANT),
      },
      routeInfos: payload.searchQuery.routeInfos,
      searchModifiers: {
        isDirectFlight: payload.searchQuery.searchModifiers.isDirectFlight,
        isConnectingFlight: payload.searchQuery.searchModifiers.isConnectingFlight,
        pft: '',
      },
    };

    setLastSearchPayload(transformedPayload);
    const sq = transformedPayload;
    const firstRoute = sq.routeInfos[0];

    setCurrentPage(1);
    setNextCursor(null);
    setHasMore(true);
    setIsFilterApplied(false);

    const adults = sq.paxInfo.ADULT || 1;
    const children = sq.paxInfo.CHILD || 0;
    const infants = sq.paxInfo.INFANT || 0;

    setSearchParams({
      tripType: 'oneway',
      from: firstRoute.fromCityOrAirport.code,
      to: firstRoute.toCityOrAirport.code,
      departureDate: firstRoute.travelDate,
      travelers: `${adults + children + infants} Traveler${adults + children + infants > 1 ? 's' : ''}, ${sq.cabinClass}`,
      class: sq.cabinClass,
      fareType: 'REGULAR',
      travelerDetails: {
        adults,
        children,
        infants,
        total: adults + children + infants,
      },
    });

    setSelectedDate(firstRoute.travelDate);

    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    await fetchFlights(transformedPayload, false, null);
  };

  const handleFilteredFlights = (filteredFlightsData: any) => {
    console.log('Filtered flights data received:', filteredFlightsData);

    let flightsData = [];

    if (filteredFlightsData?.data?.flights && Array.isArray(filteredFlightsData.data.flights)) {
      flightsData = filteredFlightsData.data.flights;
    } else if (filteredFlightsData?.flights && Array.isArray(filteredFlightsData.flights)) {
      flightsData = filteredFlightsData.flights;
    } else if (Array.isArray(filteredFlightsData)) {
      flightsData = filteredFlightsData;
    } else if (filteredFlightsData?.onwardFlights) {
      flightsData = filteredFlightsData.onwardFlights;
    } else if (filteredFlightsData?.data?.flights?.onward) {
      flightsData = filteredFlightsData.data.flights.onward;
    } else if (filteredFlightsData?.flights?.onward) {
      flightsData = filteredFlightsData.flights.onward;
    }

    setFlights(flightsData);
    setFilteredFlights(flightsData);
    setCurrentPage(1);
    setNextCursor(null);
    setHasMore(false);
    setIsFilterApplied(true);

    if (mainContentRef.current) {
      mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (flightsData.length === 0) {
      notifyWarning(
        'No flights match your selected filters. Please try different criteria.',
        'No Results',
      );
    }
  };

  const handleViewFareRules = (flight: FlightData, fare: any) => {
    const flightWithFareRule = flight as FlightData & {
      fareRuleData?: any;
      basePrice?: number;
      tax?: number;
    };

    const fareData = {
      fareRuleData: fare?.fareRuleData ||
        flightWithFareRule?.fareRuleData || {
        fareRule: {
          ROUTE1: {
            tfr: {
              CANCELLATION: [
                {
                  st: '0',
                  et: '24',
                  amount: 500,
                  additionalFee: 0,
                  policyInfo: 'Cancel up to 24 hours before departure',
                },
              ],
              DATECHANGE: [
                {
                  st: '0',
                  et: '48',
                  amount: 300,
                  additionalFee: 0,
                  policyInfo: 'Change date up to 48 hours before departure',
                },
              ],
              NO_SHOW: [{ policyInfo: 'No show penalty applies - 100% of fare' }],
              SEAT_CHARGEABLE: [{ policyInfo: 'Seat selection available for a fee' }],
            },
          },
        },
      },
      flightDetails: {
        flightNumber: flight?.flightNumber || 'N/A',
        airline: flight?.airline || 'N/A',
        origin: flight?.from?.city || searchParams?.from || 'N/A',
        destination: flight?.to?.city || searchParams?.to || 'N/A',
        departureTime: flight?.departureTime || flight?.from?.time || 'N/A',
        arrivalTime: flight?.arrivalTime || flight?.to?.time || 'N/A',
      },
      selectedFare: fare || {
        FareIdentifierType: 'Economy',
        FareDetails: {
          AdultFare: {
            RefundableType: 1,
            CabinClass: 'Economy',
            BaggageInfo: {
              ClassCode: '15 KG',
              CheckInBaggage: '25 KG',
            },
          },
        },
        priceSummary: {
          AdultFare: {
            total: flight?.price || 5000,
            baseFare: flightWithFareRule?.basePrice || 4500,
            tax: flightWithFareRule?.tax || 500,
          },
        },
      },
      fareId: fare?.id || flight?.id || 'FARE-123',
    };

    setFareRulesData(fareData);
    setShowFareRulesPopup(true);
  };

  const loadMoreFlights = async () => {
    if (!hasMore || isLoadingMore || !nextCursor) {
      if (!hasMore) {
        notifyWarning('No more flights to load', 'End of Results');
      }
      return;
    }

    if (lastSearchPayload && !isFilterApplied) {
      try {
        const loadMorePayload = {
          ...lastSearchPayload,
          cursor: nextCursor,
          limit: itemsPerPage,
          sortBy: getSortByFieldForLoadMore(sortBy),
          sortOrder: sortOrder,
        };
        await fetchFlights(loadMorePayload, true, nextCursor);
        setCurrentPage((prev) => prev + 1);
      } catch (err) {
        notifyError('Failed to load more flights. Please try again.', 'Loading Failed');
      }
    }
  };

  const getSortByFieldForLoadMore = (sort: string): string => {
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

  const showLoader = isFetching && flights.length === 0 && !isFilterApplied;

  if (!searchParams) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FlightFlyingLoader size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-5">
      <div className="mt-20">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10">
          <CommonSearchBar
            onSearch={handleSearch}
            isLoading={isFetching}
            initialParams={{
              tripType: 'oneway',
              from: searchParams?.from || '',
              to: searchParams?.to || '',
              departureDate: searchParams?.departureDate || '',
              cabinClass: searchParams?.class || '',
              paxInfo: {
                ADULT:
                  searchParams?.travelerDetails?.adults ||
                  JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}')?.travelerDetails
                    ?.adults ||
                  1,
                CHILD:
                  searchParams?.travelerDetails?.children ||
                  JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}')?.travelerDetails
                    ?.children ||
                  0,
                INFANT:
                  searchParams?.travelerDetails?.infants ||
                  JSON.parse(sessionStorage.getItem('flightSearchParams') || '{}')?.travelerDetails
                    ?.infants ||
                  0,
              },
            }}
          />

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
                      Oneway Flight
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

      {showLoader ? (
        <div className="flex justify-center items-center py-20">
          <FlightFlyingLoader size="large" />
        </div>
      ) : (
        <div ref={mainContentRef} className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 py-6">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            <div className="w-full lg:w-64 xl:w-72 2xl:w-80 flex-shrink-0">
              {lastSearchPayload && (
                <div className="lg:sticky lg:top-24 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
                  <FlightFilterSidebar
                    priceBounds={
                      flights.length
                        ? {
                            min: Math.floor(Math.min(...flights.map((f: any) => f.price ?? Infinity))),
                            max: Math.ceil(Math.max(...flights.map((f: any) => f.price ?? 0))),
                          }
                        : undefined
                    }
                    searchQuery={lastSearchPayload}
                    onFilterChange={handleFilteredFlights}
                    onLoadingChange={setIsFilterLoading}
                    onError={(errorMsg) => notifyError(errorMsg, 'Filter Error')}
                    flightType="oneway"
                    availableAirlines={searchMetadata.airlineStats || []}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isFilterLoading ? (
                <div className="flex justify-center items-center py-20">
                  <FlightFlyingLoader size="medium" />
                </div>
              ) : (
                <div className="w-full flex flex-col">
                  <OneWayFlightList flights={filteredFlights} onViewFareRules={handleViewFareRules} />

                  {!isFilterApplied && filteredFlights.length > 0 && (
                    <div className="flex flex-col items-center gap-4 mt-8">
                      {hasMore && (
                        <button
                          onClick={loadMoreFlights}
                          disabled={isLoadingMore}
                          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isLoadingMore ? (
                            <>
                              <FlightFlyingLoader size="small" />
                              <span>Loading more...</span>
                            </>
                          ) : (
                            'Load More'
                          )}
                        </button>
                      )}

                      {!hasMore && filteredFlights.length > 0 && (
                        <p className="text-gray-500 text-sm">No more flights to load</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <OneWayFlightDetailsModal
        show={showFlightDetailsModal}
        onClose={() => setShowFlightDetailsModal(false)}
        selectedFlight={selectedFlight}
        activeTab={activeModalTab}
        setActiveTab={setActiveModalTab}
      />

      {showFareOptionsModal && selectedFlight && (
        <FareOptionsModal
          modalFlight={selectedFlight as any}
          title="Select Fare"
          selectedFareClass={selectedFareClass}
          setSelectedFareClass={setSelectedFareClass}
          onFareSelected={(updatedFlight) => {
            setSelectedFlight(updatedFlight as any);
          }}
          setShowFareOptionsModal={setShowFareOptionsModal}
          onBookNow={onBookNow ?? (() => { })}
        />
      )}

      {showFareRulesPopup && fareRulesData && (
        <FareRulesPage isOpen={showFareRulesPopup} onClose={() => setShowFareRulesPopup(false)} />
      )}

    </div>
  );
}