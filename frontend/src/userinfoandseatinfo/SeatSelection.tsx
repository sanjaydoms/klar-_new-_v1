import React, { useState, useEffect } from 'react';
import {
  Plane,
  Hotel,
  FileText,
  Shield,
  User,
  ArmchairIcon as SeatIcon,
  Package,
  Utensils,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import SeatSelectionComponent from './SeatSelection/SeatSelectionComponent';
import BaggageSelectionComponent from './SeatSelection/BaggageSelectionComponent';
import MealSelectionComponent from './SeatSelection/MealSelectionComponent';
import {
  calculateBaggageTotal,
  calculateMealTotal,
  calculateSeatTotal,
} from '@/utils/extracter.helper';
import PriceInformation from './SeatSelection/PriceInformation';
import {
  getMealsAndBaggages,
  getSeatDetails,
  updateAndBook,
  updateBooking,
} from '@/api/flightService.api';
import { getUserWallet } from '@/api/user.api';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { readReviewData } from '@/utils/reviewSession';

interface SeatSelectionProps {
  onBack?: () => void;
  onContinue?: () => void;
  seatMapData?: any;
  bookingData?: any;
}

interface Seat {
  id: string;
  row: number;
  column: string;
  columnNumber: number;
  status: 'available' | 'booked' | 'blocked' | 'free' | 'selected';
  price?: number;
  currency?: string;
  features?: string[];
  isLegroom?: boolean;
  isAisle?: boolean;
  isWindow?: boolean;
  isExitRow?: boolean;
}

export default function SeatSelection({
  onBack,
  onContinue,
  seatMapData,
  bookingData,
}: SeatSelectionProps) {
  const [activeSubTab, setActiveSubTab] = useState<'seat' | 'baggage' | 'meal'>('seat');
  const [selectedClass, setSelectedClass] = useState<'economy' | 'business' | 'first'>('economy');
  const [selectedTravelerForMeals, setSelectedTravelerForMeals] = useState(0);

  const [selectedMeals, setSelectedMeals] = useState<{ [key: string]: number }>({});
  const [selectedBaggage, setSelectedBaggage] = useState<{ [key: string]: number }>({});

  const [seats, setSeats] = useState<Seat[]>([]);
  const [travelerInfo, setTravelerInfo] = useState<any>(null);
  const [flightDetails, setFlightDetails] = useState({});
  const [allFlights, setAllFlights] = useState<any[]>([]);

  const [mealOptions, setMealOptions] = useState([]);
  const [baggageOptions, setBaggageOptions] = useState([]);
  const [isMealAvailable, setIsMealAvailable] = useState<boolean>(true);
  const [isBaggageAvailable, setIsBaggageAvailable] = useState<boolean>(true);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [travelerCount, setTravelerCount] = useState(0);
  const [maxSelections, setMaxSelections] = useState(0);
  const [showSeatLimitWarning, setShowSeatLimitWarning] = useState(false);
  const [selectedSeatPrices, setSelectedSeatPrices] = useState<
    { seatId: string; price: number; segmentId?: string; seatNumber?: string; uniqueKey?: string }[]
  >([]);
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState<string | React.ReactNode | null>(null);

  const [showBaggageLimitWarning, setShowBaggageLimitWarning] = useState(false);
  const [selectedTravelerForBaggage, setSelectedTravelerForBaggage] = useState(0);
  const [selectedBaggagePerTraveler, setSelectedBaggagePerTraveler] = useState<
    Array<{ [key: string]: number }>
  >([]);
  const [selectedMealsPerTraveler, setSelectedMealsPerTraveler] = useState<
    Array<{ [key: string]: number }>
  >([]);
  const [showTimerExpiredModal, setShowTimerExpiredModal] = useState(false);
  const [showSeatDisclaimer, setShowSeatDisclaimer] = useState(false);
  const [selectedSeatsPerTraveler, setSelectedSeatsPerTraveler] = useState<Array<string[]>>([]);
  const [selectedTravelerForSeat, setSelectedTravelerForSeat] = useState(0);
  const [allSegmentsSeatMaps, setAllSegmentsSeatMaps] = useState<{ [segmentId: string]: Seat[] }>(
    {},
  );
  const [availableSegments, setAvailableSegments] = useState<string[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<string>('');
  const [mealsBySegment, setMealsBySegment] = useState<{ [segmentId: string]: any[] }>({});
  const [baggageBySegment, setBaggageBySegment] = useState<{ [segmentId: string]: any[] }>({});
  const [mealSegments, setMealSegments] = useState<string[]>([]);
  const [baggageSegments, setBaggageSegments] = useState<string[]>([]);
  const [isConnectingFlight, setIsConnectingFlight] = useState(false);
  const [isMultiCity, setIsMultiCity] = useState(false);
  const [mealOnlySegments, setMealOnlySegments] = useState<string[]>([]);
  const [baggageOnlySegments, setBaggageOnlySegments] = useState<string[]>([]);

  const [selectedSeatsPerTravelerPerSegment, setSelectedSeatsPerTravelerPerSegment] = useState<{
    [travelerIndex: number]: { [segmentId: string]: string };
  }>({});

  const [currentSegmentIdForMeals, setCurrentSegmentIdForMeals] = useState<string>('');
  const [currentSegmentIdForBaggage, setCurrentSegmentIdForBaggage] = useState<string>('');
  const [selectedMealsPerTravelerPerSegment, setSelectedMealsPerTravelerPerSegment] = useState<{
    [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
  }>({});
  const [selectedBaggagePerTravelerPerSegment, setSelectedBaggagePerTravelerPerSegment] = useState<{
    [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
  }>({});

  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [reviewData, setReviewData] = useState<any>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [seatApiError, setSeatApiError] = useState(false);
  const [holdBooking, setHoldBooking] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'error' | 'success' | 'warning';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const getSegmentInfoFromReviewData = () => {
      try {
        const parsedData = readReviewData();
        if (parsedData) {
          setReviewData(parsedData);
        }
      } catch (error) {
        console.error('Error parsing onewayReviewData:', error);
      }
    };

    getSegmentInfoFromReviewData();
  }, []);

  useEffect(() => {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const flightsData = priceData?.data?.flights || [];
    setAllFlights(flightsData);
  }, []);

  useEffect(() => {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const allFlightsData = priceData?.data?.flights || [];

    const roundTrip =
      allFlightsData.length === 2 &&
      allFlightsData[0]?.departure?.airportCode === allFlightsData[1]?.arrival?.airportCode &&
      allFlightsData[0]?.arrival?.airportCode === allFlightsData[1]?.departure?.airportCode;
    setIsRoundTrip(roundTrip);

    const connecting = allFlightsData.length > 1 && !roundTrip && allFlightsData.length <= 2;
    setIsConnectingFlight(connecting);

    const multiCity = allFlightsData.length > 2;
    setIsMultiCity(multiCity);

    console.log('Flight type:', {
      roundTrip,
      connecting,
      multiCity,
      flightCount: allFlightsData.length,
    });
  }, []);

  useEffect(() => {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const allFlightsData = priceData?.data?.flights || [];
    const isRoundTripValue =
      allFlightsData.length === 2 &&
      allFlightsData[0]?.departure?.airportCode === allFlightsData[1]?.arrival?.airportCode &&
      allFlightsData[0]?.arrival?.airportCode === allFlightsData[1]?.departure?.airportCode;
    setIsRoundTrip(isRoundTripValue);
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const response = await getUserWallet();
        if (response?.data?.success) {
          setWalletData(response.data.data);
          console.log('Wallet Data:', response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch wallet:', error);
      }
    };

    fetchWallet();
  }, []);

  useEffect(() => {
    const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
    const flights: any[] = priceData?.data?.flights || [];
    if (flights.length === 0) return;

    const segmentIds = flights.map((f: any) => f.segmentId).filter(Boolean);
    if (segmentIds.length === 0) return;

    setCurrentSegmentIdForMeals(segmentIds[0]);
    setCurrentSegmentIdForBaggage(segmentIds[0]);

    setAvailableSegments((prev) => {
      if (prev.length === 0) {
        console.log('Setting availableSegments from price data (fallback):', segmentIds);
        return segmentIds;
      }
      console.log('Keeping existing availableSegments from seat map:', prev);
      return prev;
    });
  }, []);

  useEffect(() => {
    const storedTravelerInfo = sessionStorage.getItem('travelerInfo');
    console.log('Raw storedTravelerInfo:', storedTravelerInfo);

    if (storedTravelerInfo) {
      try {
        const parsedInfo = JSON.parse(storedTravelerInfo);
        console.log('Parsed traveler info structure:', parsedInfo);
        setTravelerInfo(parsedInfo);

        let totalTravelers = 0;

        if (parsedInfo.travelers && Array.isArray(parsedInfo.travelers)) {
          totalTravelers = parsedInfo.travelers.length;
          console.log('Found travelers array, count:', totalTravelers);
        } else if (parsedInfo.passengers && Array.isArray(parsedInfo.passengers)) {
          totalTravelers = parsedInfo.passengers.filter(
            (p: any) => p.type === 'adult' || p.type === 'child' || p.age >= 2,
          ).length;
          console.log('Found passengers array, count:', totalTravelers);
        } else if (
          parsedInfo.travelers &&
          typeof parsedInfo.travelers === 'object' &&
          'adults' in parsedInfo.travelers
        ) {
          const adults = parseInt(parsedInfo.travelers.adults) || 0;
          const children = parseInt(parsedInfo.travelers.children) || 0;
          totalTravelers = adults + children;
          console.log('Found travelers object with adults/children:', totalTravelers);
        } else if (('adults' in parsedInfo || 'children' in parsedInfo) && !parsedInfo.travelers) {
          const adults = parseInt(parsedInfo.adults) || 0;
          const children = parseInt(parsedInfo.children) || 0;
          totalTravelers = adults + children;
          console.log('Found adults/children in root:', totalTravelers);
        } else {
          let adultCount = 0;
          let childCount = 0;

          for (const key in parsedInfo) {
            if (key.match(/^adultsTitle\d+$/)) {
              adultCount++;
            }
            if (key.match(/^childrenTitle\d+$/)) {
              childCount++;
            }
          }

          if (adultCount > 0 || childCount > 0) {
            totalTravelers = adultCount + childCount;
            console.log(
              'Found individual traveler fields - adults:',
              adultCount,
              'children:',
              childCount,
              'total:',
              totalTravelers,
            );
          }
        }

        if (totalTravelers === 0 && Array.isArray(parsedInfo)) {
          totalTravelers = parsedInfo.length;
          console.log('ParsedInfo is an array, length:', totalTravelers);
        }

        if (totalTravelers === 0) {
          totalTravelers = 1;
          console.log('No traveler data found, defaulting to 1');
        }

        console.log('Setting travelerCount to:', totalTravelers);
        setTravelerCount(totalTravelers);
        setMaxSelections(totalTravelers);
      } catch (error) {
        console.error('Error parsing travelerInfo:', error);
        setTravelerCount(1);
        setMaxSelections(1);
      }
    } else {
      console.log('No travelerInfo found in sessionStorage');
      setTravelerCount(1);
      setMaxSelections(1);
    }
  }, []);

  useEffect(() => {
    const fetchSeatMapFromAPI = async () => {
      try {
        const bookingId = sessionStorage.getItem('bookingId');

        if (!bookingId) {
          console.warn('No booking ID found for seat map API');
          setSeatApiError(true);
          return;
        }

        console.log('Calling seat map API for bookingId:', bookingId);
        const response = await getSeatDetails({ bookingId: bookingId });

        if (response && response.success === true && response.data?.tripSeatMap) {
          processSeatMapData(response);
        } else {
          console.error('Seat map API returned error or no data');
          setSeatApiError(true);
        }
      } catch (error) {
        console.error('Failed to fetch seat map:', error);
        setSeatApiError(true);
      }
    };

    if (travelerCount > 0 && Object.keys(allSegmentsSeatMaps).length === 0 && !seatApiError) {
      fetchSeatMapFromAPI();
    }
  }, [travelerCount]);

  useEffect(() => {
    if (travelerCount > 0) {
      setSelectedMealsPerTraveler(Array(travelerCount).fill({}));
      setSelectedBaggagePerTraveler(Array(travelerCount).fill({}));
      setSelectedSeatsPerTraveler(Array(travelerCount).fill([]));

      if (availableSegments.length > 0) {
        setSelectedSeatsPerTravelerPerSegment((prev) => {
          const updated = { ...prev };
          for (let i = 0; i < travelerCount; i++) {
            if (!updated[i]) {
              updated[i] = {};
            }
            availableSegments.forEach((segmentId) => {
              if (updated[i][segmentId] === undefined) {
                updated[i][segmentId] = '';
              }
            });
          }
          return updated;
        });

        setSelectedMealsPerTravelerPerSegment((prev) => {
          const updated = { ...prev };
          for (let i = 0; i < travelerCount; i++) {
            if (!updated[i]) {
              updated[i] = {};
            }
            availableSegments.forEach((segmentId) => {
              if (!updated[i][segmentId]) {
                updated[i][segmentId] = {};
              }
            });
          }
          return updated;
        });

        setSelectedBaggagePerTravelerPerSegment((prev) => {
          const updated = { ...prev };
          for (let i = 0; i < travelerCount; i++) {
            if (!updated[i]) {
              updated[i] = {};
            }
            availableSegments.forEach((segmentId) => {
              if (!updated[i][segmentId]) {
                updated[i][segmentId] = {};
              }
            });
          }
          return updated;
        });
      }
    }
  }, [travelerCount, availableSegments]);

  useEffect(() => {
    console.log('=== SEAT MAP DEBUGGING ===');
    console.log('1. seatMapData prop:', seatMapData);
    console.log('2. seatMapData type:', typeof seatMapData);

    const stored = sessionStorage.getItem('seatMapResponse');
    console.log('3. Stored in sessionStorage:', stored ? 'Yes' : 'No');

    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('4. Parsed stored data structure:', {
        hasData: !!parsed?.data,
        hasTripSeatMap: !!parsed?.data?.tripSeatMap,
        hasTripSeat: !!parsed?.data?.tripSeatMap?.tripSeat,
        tripSeatKeys: parsed?.data?.tripSeatMap?.tripSeat
          ? Object.keys(parsed.data.tripSeatMap.tripSeat)
          : [],
        fullData: parsed,
      });
    }

    if (seatMapData) {
      console.log('5. seatMapData prop structure:', {
        hasData: !!seatMapData?.data,
        hasTripSeatMap: !!seatMapData?.data?.tripSeatMap,
        hasTripSeat: !!seatMapData?.data?.tripSeatMap?.tripSeat,
        directTripSeatMap: !!seatMapData?.tripSeatMap,
      });
    }
  }, []);

  useEffect(() => {
    const seatsByTraveler: string[][] = [];
    for (let i = 0; i < travelerCount; i++) {
      const travelerSeats = selectedSeatsPerTravelerPerSegment[i] || {};
      seatsByTraveler[i] = Object.values(travelerSeats).filter(Boolean);
    }
    setSelectedSeatsPerTraveler(seatsByTraveler);

    const allSeats = seatsByTraveler.flat();
    setSelectedSeats(allSeats);
  }, [selectedSeatsPerTravelerPerSegment, travelerCount]);

  useEffect(() => {
    const overallMeals: { [key: string]: number } = {};
    Object.values(selectedMealsPerTravelerPerSegment).forEach((travelerSelections) => {
      Object.values(travelerSelections).forEach((segmentSelections) => {
        Object.entries(segmentSelections).forEach(([mealId, quantity]) => {
          overallMeals[mealId] = (overallMeals[mealId] || 0) + quantity;
        });
      });
    });
    setSelectedMeals(overallMeals);
  }, [selectedMealsPerTravelerPerSegment]);

  useEffect(() => {
    const overallBaggage: { [key: string]: number } = {};
    Object.values(selectedBaggagePerTravelerPerSegment).forEach((travelerSelections) => {
      Object.values(travelerSelections).forEach((segmentSelections) => {
        Object.entries(segmentSelections).forEach(([baggageId, quantity]) => {
          overallBaggage[baggageId] = (overallBaggage[baggageId] || 0) + quantity;
        });
      });
    });
    setSelectedBaggage(overallBaggage);
  }, [selectedBaggagePerTravelerPerSegment]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0) {
      setShowTimerExpiredModal(true);
    }
  }, [timeLeft]);

  useEffect(() => {
    const stored = sessionStorage.getItem('seatMapResponse');
    if (stored) {
      const parsed = JSON.parse(stored);
      console.log('=== ACTUAL STORED SEAT MAP DATA ===');
      console.log('Full stored object:', parsed);
      console.log('Stored data property:', parsed.data);
      console.log('Stored data type:', typeof parsed.data);

      if (parsed.data) {
        console.log('Data keys:', Object.keys(parsed.data));
        if (parsed.data.tripSeatMap) {
          console.log('Found tripSeatMap in data');
        } else if (parsed.data.seatMap) {
          console.log('Found seatMap in data');
        } else {
          console.log('Looking for any array or object that might contain seats');
          console.log('First level of data:', parsed.data);
        }
      }
    }
  }, []);

  useEffect(() => {
    const hasAvailableSeats = seats.some(
      (seat) => seat.status === 'available' || seat.status === 'free',
    );

    if (seats.length > 0 && !hasAvailableSeats) {
      setShowSeatDisclaimer(true);
    } else {
      setShowSeatDisclaimer(false);
    }
  }, [seats]);

  useEffect(() => {
    if (!currentSegmentId || !allSegmentsSeatMaps[currentSegmentId]) return;

    const segmentSeatMap = allSegmentsSeatMaps[currentSegmentId];

    const updatedSeats = segmentSeatMap.map((seat) => {
      const isSelected = Object.values(selectedSeatsPerTravelerPerSegment).some(
        (travelerSelection) => travelerSelection?.[currentSegmentId] === seat.id,
      );

      if (isSelected) {
        return { ...seat, status: 'selected' as const };
      }

      if (seat.status === 'booked') {
        return { ...seat, status: 'booked' };
      }

      if (seat.status === 'blocked') {
        return { ...seat, status: 'blocked' };
      }

      return {
        ...seat,
        status: seat.price === 0 ? 'free' : 'available',
      };
    });

    setSeats(updatedSeats);
  }, [selectedSeatsPerTravelerPerSegment, currentSegmentId, allSegmentsSeatMaps]);

  useEffect(() => {
    console.log('📊 Available segments in SeatSelectionComponent:', availableSegments);
    console.log('📊 Number of segments:', availableSegments.length);
  }, [availableSegments]);

  const handleTimerExpiredRedirect = () => {
    sessionStorage.removeItem('travelerInfo');
    sessionStorage.removeItem('seatMapResponse');
    sessionStorage.removeItem('priceAvailabilityResponse');
    sessionStorage.removeItem('seatSelection');
    sessionStorage.removeItem('onewayReviewData');

    setShowTimerExpiredModal(false);
    navigate('/');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isSeatSelectionComplete = (): boolean => {
    if (activeSubTab !== 'seat') return true;

    for (let travelerIdx = 0; travelerIdx < travelerCount; travelerIdx++) {
      const travelerSeats = selectedSeatsPerTravelerPerSegment[travelerIdx] || {};

      for (const segmentId of availableSegments) {
        const seatId = travelerSeats[segmentId];
        if (!seatId || seatId === '') {
          return false;
        }
      }
    }
    return true;
  };

  const loadMealsAndBaggage = async () => {
    try {
      const ancillarySessionId = sessionStorage.getItem('ancillarySessionId');
      console.log('🔍 [Meals&Baggages] ancillarySessionId:', ancillarySessionId);

      if (!ancillarySessionId) {
        console.warn('⚠️ No ancillarySessionId found - cannot fetch meals and baggage');
        setIsMealAvailable(false);
        setIsBaggageAvailable(false);
        return;
      }

      console.log('📞 [Meals&Baggages] Calling API with ancillarySessionId:', ancillarySessionId);
      const response = await getMealsAndBaggages(ancillarySessionId);
      console.log('✅ [Meals&Baggages] Full API Response:', JSON.stringify(response, null, 2));

      if (response && response.success === true && response.data) {
        const mealsMapLocal: { [segmentId: string]: any[] } = {};
        const baggageMapLocal: { [segmentId: string]: any[] } = {};

        const allSegmentIdsFromAPI: string[] = [];

        if (Array.isArray(response.data)) {
          console.log(`📦 Processing ${response.data.length} itinerary/ies`);

          response.data.forEach((itinerary: any, itineraryIndex: number) => {
            console.log(`  📍 Itinerary ${itineraryIndex + 1}:`, itinerary);

            let itinerarySegments = [];

            if (itinerary.segments && Array.isArray(itinerary.segments)) {
              itinerarySegments = itinerary.segments;
            } else if (Array.isArray(itinerary)) {
              itinerarySegments = itinerary;
            }

            if (itinerarySegments.length === 0) {
              console.warn(`  ⚠️ No segments found in itinerary ${itineraryIndex + 1}`);
              return;
            }

            console.log(
              `  📍 Itinerary ${itineraryIndex + 1} has ${itinerarySegments.length} segment(s)`,
            );

            itinerarySegments.forEach((segment: any, segmentIndex: number) => {
              const segmentId =
                segment.segmentId || segment.id || segment.segment_code || segment.segmentCode;

              if (!segmentId) {
                console.warn(
                  `  ⚠️ Segment ${segmentIndex + 1} in itinerary ${itineraryIndex + 1} has no ID:`,
                  segment,
                );
                return;
              }

              console.log(
                `    ✈️ Segment ${segmentIndex + 1}: ID=${segmentId}, Flight=${segment.flightNumber || 'N/A'}`,
              );
              allSegmentIdsFromAPI.push(segmentId);

              if (segment.meals && Array.isArray(segment.meals) && segment.meals.length > 0) {
                console.log(
                  `      🍽️ Found ${segment.meals.length} meal(s) for segment ${segmentId}`,
                );
                mealsMapLocal[segmentId] = segment.meals.map((meal: any, idx: number) => ({
                  ...meal,
                  id: `meal_${segmentId}_${idx}`,
                  code: meal.code || meal.AirlineCode || meal.mealCode,
                  price: meal.price !== undefined ? meal.price : meal.amount || 0,
                  description:
                    meal.description || meal.desc || meal.name || meal.Description || 'Meal',
                  isWCAG: meal.isWCAG || false,
                }));
              } else {
                console.log(`      🍽️ No meals found for segment ${segmentId}`);
              }

              if (segment.baggage && Array.isArray(segment.baggage) && segment.baggage.length > 0) {
                console.log(
                  `      🧳 Found ${segment.baggage.length} baggage option(s) for segment ${segmentId}`,
                );
                baggageMapLocal[segmentId] = segment.baggage.map((baggage: any, idx: number) => ({
                  ...baggage,
                  id: `baggage_${segmentId}_${idx}`,
                  code: baggage.code || baggage.AirlineCode || baggage.baggageCode,
                  price: baggage.price !== undefined ? baggage.price : baggage.amount || 0,
                  description:
                    baggage.description || baggage.desc || baggage.name || 'Extra Baggage',
                }));
              } else {
                console.log(`      🧳 No baggage found for segment ${segmentId}`);
              }
            });
          });
        } else if (response.data.segments && Array.isArray(response.data.segments)) {
          console.log('📦 Processing response.data.segments directly');
          response.data.segments.forEach((segment: any, idx: number) => {
            const segmentId = segment.segmentId || segment.id;
            if (segmentId) {
              allSegmentIdsFromAPI.push(segmentId);
              if (segment.meals) mealsMapLocal[segmentId] = segment.meals;
              if (segment.baggage) baggageMapLocal[segmentId] = segment.baggage;
            }
          });
        } else {
          console.warn('⚠️ Unexpected response.data format:', response.data);
        }

        const uniqueSegmentIds = [...new Set(allSegmentIdsFromAPI)];
        console.log('📊 FINAL EXTRACTED DATA:');
        console.log('  - Unique segment IDs:', uniqueSegmentIds);
        console.log('  - Segments with meals:', Object.keys(mealsMapLocal));
        console.log('  - Segments with baggage:', Object.keys(baggageMapLocal));

        setMealsBySegment(mealsMapLocal);
        setBaggageBySegment(baggageMapLocal);

        sessionStorage.setItem('mealsBySegment', JSON.stringify(mealsMapLocal));
        sessionStorage.setItem('baggageBySegment', JSON.stringify(baggageMapLocal));

        if (uniqueSegmentIds.length > 0) {
          console.log(
            '📊 Meal/Baggage segments found (NOT updating availableSegments):',
            uniqueSegmentIds,
          );
        }

        const mealSegIds = Object.keys(mealsMapLocal);
        const baggageSegIds = Object.keys(baggageMapLocal);
        setMealSegments(mealSegIds);
        setBaggageSegments(baggageSegIds);

        setMealOnlySegments(mealSegIds);
        setBaggageOnlySegments(baggageSegIds);

        sessionStorage.setItem('mealOnlySegments', JSON.stringify(mealSegIds));
        sessionStorage.setItem('baggageOnlySegments', JSON.stringify(baggageSegIds));

        if (mealSegIds.length > 0 && !currentSegmentIdForMeals) {
          setCurrentSegmentIdForMeals(mealSegIds[0]);
        }
        if (baggageSegIds.length > 0 && !currentSegmentIdForBaggage) {
          setCurrentSegmentIdForBaggage(baggageSegIds[0]);
        }

        const firstSegmentId = uniqueSegmentIds[0];
        if (firstSegmentId) {
          const meals = mealsMapLocal[firstSegmentId] || [];
          const baggage = baggageMapLocal[firstSegmentId] || [];

          setIsMealAvailable(meals.length > 0);
          setMealOptions(meals);

          setIsBaggageAvailable(baggage.length > 0);
          setBaggageOptions(baggage);
        }

        const hasAnyMeals = mealSegIds.length > 0;
        const hasAnyBaggage = baggageSegIds.length > 0;
        setIsMealAvailable(hasAnyMeals);
        setIsBaggageAvailable(hasAnyBaggage);

        console.log('✅ Meals & Baggage loading complete!');
        console.log('  - Total segments:', uniqueSegmentIds.length);
        console.log('  - Segments with meals:', mealSegIds.length);
        console.log('  - Segments with baggage:', baggageSegIds.length);
      } else {
        console.warn('⚠️ Unexpected response structure from getMealsAndBaggages:', response);
        setIsMealAvailable(false);
        setIsBaggageAvailable(false);
        setMealOptions([]);
        setBaggageOptions([]);
      }
    } catch (error) {
      console.error('❌ Failed to load meals and baggage:', error);
      setIsMealAvailable(false);
      setIsBaggageAvailable(false);
      setMealOptions([]);
      setBaggageOptions([]);
    }
  };

  useEffect(() => {
    console.log('🔄 [Meals&Baggages] useEffect triggered - selectedClass:', selectedClass);
    loadMealsAndBaggage();
  }, [selectedClass]);

  useEffect(() => {
    const ancillarySessionId = sessionStorage.getItem('ancillarySessionId');
    if (ancillarySessionId) {
      console.log(
        '🔄 [Meals&Baggages] ancillarySessionId detected in sessionStorage, loading meals/baggage',
      );
      loadMealsAndBaggage();
    }

    const interval = setInterval(() => {
      const sid = sessionStorage.getItem('ancillarySessionId');
      if ((sid && !mealsBySegment) || Object.keys(mealsBySegment).length === 0) {
        console.log('🔄 [Meals&Baggages] ancillarySessionId found via polling, loading...');
        loadMealsAndBaggage();
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => clearInterval(interval), 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    console.log('📊 CURRENT SELECTED SEATS SUMMARY:');
    console.log('Total seats in array:', selectedSeatPrices.length);
    selectedSeatPrices.forEach((seat, index) => {
      console.log(
        `  Seat ${index + 1}: ${seat.seatNumber} on segment ${seat.segmentId} - Price: ₹${seat.price} - Key: ${seat.uniqueKey}`,
      );
    });
  }, [selectedSeatPrices]);

  useEffect(() => {
    if (travelerCount > 0) {
      setSelectedBaggagePerTraveler(Array(travelerCount).fill({}));
    }
  }, [travelerCount]);

  const processSeatMapData = (apiResponse: any) => {
    try {
      console.log('🔍 Processing seat map data from API:', apiResponse);

      setSeatApiError(false);
      sessionStorage.removeItem('seatMapError');

      if (!apiResponse) {
        console.error('❌ No API response provided');
        setSeats([]);
        setSeatApiError(true);
        return;
      }

      if (apiResponse.success === false) {
        console.error('❌ API returned success: false');
        setSeats([]);
        setSeatApiError(true);
        return;
      }

      let tripSeatMapData = null;

      if (apiResponse?.data?.tripSeatMap?.tripSeat) {
        tripSeatMapData = apiResponse.data.tripSeatMap.tripSeat;
        console.log('✅ Found seat map in data.tripSeatMap.tripSeat');
      } else if (apiResponse?.tripSeatMap?.tripSeat) {
        tripSeatMapData = apiResponse.tripSeatMap.tripSeat;
        console.log('✅ Found seat map in tripSeatMap.tripSeat');
      } else if (apiResponse?.tripSeat) {
        tripSeatMapData = apiResponse.tripSeat;
        console.log('✅ Found seat map in tripSeat');
      } else if (apiResponse?.data?.data?.tripSeatMap?.tripSeat) {
        tripSeatMapData = apiResponse.data.data.tripSeatMap.tripSeat;
        console.log('✅ Found seat map in data.data.tripSeatMap.tripSeat');
      }

      console.log('📊 Seat map data after extraction:', tripSeatMapData);

      if (!tripSeatMapData || Object.keys(tripSeatMapData).length === 0) {
        console.error('❌ No seat map data found in API response');
        setSeats([]);
        setSeatApiError(true);
        return;
      }

      const seatMapSegmentIds = Object.keys(tripSeatMapData);
      console.log(
        `📊 Found ${seatMapSegmentIds.length} segments from seat map API:`,
        seatMapSegmentIds,
      );

      const allSeatMaps: { [segmentId: string]: Seat[] } = {};

      seatMapSegmentIds.forEach((segmentId) => {
        const segmentData = tripSeatMapData[segmentId];
        console.log(`📊 Processing segment ${segmentId}`);

        let sInfoArray = segmentData?.sInfo;

        if (!sInfoArray || !Array.isArray(sInfoArray)) {
          console.warn(`⚠️ No sInfo array for segment ${segmentId}`);
          return;
        }

        console.log(`📊 Segment ${segmentId} has ${sInfoArray.length} seats`);

        const mappedSeats: Seat[] = [];

        sInfoArray.forEach((apiSeat: any) => {
          const seatId = apiSeat.seatNo || apiSeat.seatNumber || '';
          const row = apiSeat.seatPosition?.row || 0;
          const columnNum = apiSeat.seatPosition?.column || 0;
          const column = String.fromCharCode(64 + columnNum);

          let status: Seat['status'] = 'available';
          if (apiSeat.isBooked === true) {
            status = 'booked';
          } else if (apiSeat.isAvailable === false) {
            status = 'blocked';
          } else if (apiSeat.amount === 0) {
            status = 'free';
          }

          const price = apiSeat.amount || 0;

          mappedSeats.push({
            id: seatId,
            row: row,
            column: column,
            columnNumber: columnNum,
            status: status,
            price: price,
            currency: 'INR',
            features: [],
            isLegroom: apiSeat.isLegroom || false,
            isAisle: apiSeat.isAisle || false,
            isWindow: apiSeat.isWindow || false,
            isExitRow: apiSeat.isExitRow || false,
          });
        });

        if (mappedSeats.length > 0) {
          const sortedSeats = mappedSeats.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return a.column.localeCompare(b.column);
          });
          allSeatMaps[segmentId] = sortedSeats;
          console.log(`✅ Segment ${segmentId}: ${sortedSeats.length} seats processed`);
        } else {
          console.warn(`⚠️ No valid seats found for segment ${segmentId}`);
        }
      });

      if (Object.keys(allSeatMaps).length === 0) {
        console.error('❌ No seat maps were processed successfully');
        setSeats([]);
        setSeatApiError(true);
        return;
      }

      console.log('🎯 Setting allSegmentsSeatMaps with keys:', Object.keys(allSeatMaps));
      setAllSegmentsSeatMaps(allSeatMaps);

      const segmentsFromSeatMap = Object.keys(allSeatMaps);
      console.log('🎯 Setting availableSegments to ONLY seat map segments:', segmentsFromSeatMap);
      setAvailableSegments(segmentsFromSeatMap);

      sessionStorage.setItem('availableSegmentsFromSeatMap', JSON.stringify(segmentsFromSeatMap));
      sessionStorage.setItem('seatMapSegments', JSON.stringify(segmentsFromSeatMap));

      const firstSegmentWithSeatMap = segmentsFromSeatMap[0];
      if (firstSegmentWithSeatMap && allSeatMaps[firstSegmentWithSeatMap]) {
        console.log(`🎯 Setting currentSegmentId to: ${firstSegmentWithSeatMap}`);
        setCurrentSegmentId(firstSegmentWithSeatMap);
        setSeats(allSeatMaps[firstSegmentWithSeatMap]);
      } else {
        console.warn('⚠️ No valid first segment found to set as current');
      }
    } catch (error) {
      console.error('❌ Failed to process seat map data:', error);
      setSeats([]);
      setSeatApiError(true);
    }
  };

  const processSeatRows = (seatMapData: any[]): Seat[] => {
    const mappedSeats: Seat[] = [];

    seatMapData.forEach((apiSeat: any) => {
      const columnNum = apiSeat.seatPosition?.column || apiSeat.column || 0;
      const columnLetter = String.fromCharCode(64 + columnNum);
      const seatId = apiSeat.seatNo || apiSeat.seatNumber || `${apiSeat.row}${columnLetter}`;

      let status: Seat['status'] = 'available';
      if (apiSeat.isBooked === true) {
        status = 'booked';
      } else if (apiSeat.isAvailable === false) {
        status = 'blocked';
      } else if (apiSeat.price === 0 || apiSeat.amount === 0) {
        status = 'free';
      }

      mappedSeats.push({
        id: seatId,
        row: apiSeat.row || apiSeat.seatPosition?.row || 0,
        column: columnLetter,
        columnNumber: columnNum,
        status: status,
        price: apiSeat.price || apiSeat.amount || 0,
        currency: 'INR',
        features: [],
        isLegroom: apiSeat.isLegroom || false,
        isAisle: apiSeat.isAisle || false,
        isWindow: apiSeat.isWindow || false,
        isExitRow: apiSeat.isExitRow || false,
      });
    });

    return mappedSeats.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.column.localeCompare(b.column);
    });
  };

  const currentStep = 3;

  const steps = [
    { id: 1, name: 'Flights' },
    { id: 2, name: 'Traveller Information' },
    { id: 3, name: 'Seat & Meal' },
    { id: 4, name: 'Payment method' },
    { id: 5, name: 'Booking Confirmed' },
  ];

  useEffect(() => {
    if (selectedSeatPrices.length > 0) {
      console.log('=== CURRENT SEAT SELECTIONS ===');
      selectedSeatPrices.forEach((seat, index) => {
        console.log(`Seat ${index + 1}:`, {
          seatNumber: seat.seatId || seat.seatNumber,
          segmentId: seat.segmentId,
          price: seat.price,
        });
      });
      console.log('Total seats selected:', selectedSeatPrices.length);
      console.log('================================');
    } else {
      console.log('No seats currently selected');
    }
  }, [selectedSeatPrices]);

  const getFlightInfoBySegmentId = (
    segmentId: string,
  ): { flightNumber: string; departure: string; arrival: string } | null => {
    try {
      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
      const seatMapData = JSON.parse(sessionStorage.getItem('seatMapResponse') || '{}');

      const flightInPrice = priceData?.data?.flights?.find((f: any) => f.segmentId === segmentId);
      if (flightInPrice) {
        return {
          flightNumber: flightInPrice.flightNumber || 'N/A',
          departure: flightInPrice.departure?.airportCode || flightInPrice.departure || 'N/A',
          arrival: flightInPrice.arrival?.airportCode || flightInPrice.arrival || 'N/A',
        };
      }

      const flightInSeatMap = seatMapData?.data?.flights?.find(
        (f: any) => f.segmentId === segmentId,
      );
      if (flightInSeatMap) {
        return {
          flightNumber: flightInSeatMap.flightNumber || 'N/A',
          departure: flightInSeatMap.departure?.airportCode || flightInSeatMap.departure || 'N/A',
          arrival: flightInSeatMap.arrival?.airportCode || flightInSeatMap.arrival || 'N/A',
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting flight info:', error);
      return null;
    }
  };

  const handleContinue = async () => {
    setIsProcessing(true);
    setBookingError(null);

    try {
      const travelerInfo = JSON.parse(sessionStorage.getItem('travelerInfo') || '{}');
      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
      const seatMapData = JSON.parse(sessionStorage.getItem('seatMapResponse') || '{}');
      const travellerIds = JSON.parse(sessionStorage.getItem('travellerIds') || '[]');

      const bookingId =
        sessionStorage.getItem('bookingId') ||
        seatMapData?.data?.bookingId ||
        priceData?.data?.bookingId ||
        '';

      const seatTotal = calculateSeatTotal(selectedSeatPrices);
      const mealResult = calculateMealTotal(selectedMealsPerTravelerPerSegment, priceData);
      const baggageResult = calculateBaggageTotal(selectedBaggagePerTravelerPerSegment, priceData);

      const mealsBySegmentFromStorage = JSON.parse(
        sessionStorage.getItem('mealsBySegment') || '{}',
      );
      const baggageBySegmentFromStorage = JSON.parse(
        sessionStorage.getItem('baggageBySegment') || '{}',
      );
      console.log('=== MEALS BY SEGMENT STORED ===');
      console.log(JSON.stringify(mealsBySegmentFromStorage, null, 2));
      console.log('=== BAGGAGE BY SEGMENT STORED ===');
      console.log(JSON.stringify(baggageBySegmentFromStorage, null, 2));

      const addonsTotal = seatTotal + mealResult.total + baggageResult.total;

      console.log('🔍 DETAILED ADDONS BREAKDOWN:');
      console.log('Seat Prices Array:', selectedSeatPrices);
      selectedSeatPrices.forEach((item) => {
        console.log(`Seat ${item.seatId}: ${item.price}`);
      });

      console.log('Meals Per Traveler Per Segment:', selectedMealsPerTravelerPerSegment);
      Object.entries(selectedMealsPerTravelerPerSegment).forEach(([tIdx, segments]) => {
        Object.entries(segments).forEach(([segId, meals]) => {
          Object.entries(meals).forEach(([mealId, qty]) => {
            if (qty > 0) {
              console.log(`Traveler ${tIdx}, Segment ${segId}, Meal ${mealId}: Qty ${qty}`);
            }
          });
        });
      });

      console.log('Baggage Per Traveler Per Segment:', selectedBaggagePerTravelerPerSegment);

      console.log('=== ADD-ONS TOTAL ===');
      console.log('Seat Total:', seatTotal);
      console.log('Meal Total:', mealResult.total, `(${mealResult.itemCount} items)`);
      console.log('Baggage Total:', baggageResult.total, `(${baggageResult.itemCount} items)`);
      console.log('Total Add-ons:', addonsTotal);

      let originalTripjackPrice = 0;

      if (priceData?.data?.totalPrice?.totalFare) {
        originalTripjackPrice = priceData.data.totalPrice.totalFare;
      } else if (priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare) {
        originalTripjackPrice = priceData.data.totalPrice.totalFareDetail.FareComponents.TotalFare;
      } else if (priceData?.data?.flights) {
        originalTripjackPrice = priceData.data.flights.reduce((sum: number, flight: any) => {
          return sum + (flight.totalFare || flight.price || flight.fare || 0);
        }, 0);
      } else if (
        reviewData?.mappedData?.totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare
      ) {
        originalTripjackPrice =
          reviewData.mappedData.totalPriceInfo.totalFareDetail.FareComponents.TotalFare;
      }

      originalTripjackPrice = Number(originalTripjackPrice) || 0;

      const totalPriceValue = originalTripjackPrice + addonsTotal;

      console.log('🔍 DEBUGGING ORIGINAL PRICE SOURCES:');
      console.log(
        'priceData?.data?.totalPrice?.totalFare:',
        priceData?.data?.totalPrice?.totalFare,
      );
      console.log(
        'priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare:',
        priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare,
      );
      console.log(
        'reviewData?.mappedData?.totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare:',
        reviewData?.mappedData?.totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare,
      );
      console.log('Selected originalTripjackPrice:', originalTripjackPrice);

      console.log('Original Tripjack Price:', originalTripjackPrice);
      console.log('Addons Total:', addonsTotal);
      console.log('Final Total Price:', totalPriceValue);

      const travellersForUpdate = buildTravelersForUpdate(
        travelerInfo,
        travellerIds,
        travelerCount,
        selectedSeatsPerTravelerPerSegment,
        selectedMealsPerTravelerPerSegment,
        selectedBaggagePerTravelerPerSegment,
      );

      const updatePayload = holdBooking
        ? {
          bookingId,
          travellers: travellersForUpdate,
          tripjackPrice: originalTripjackPrice,
          totalPrice: totalPriceValue,
          isHold: true,
        }
        : {
          bookingId,
          travellers: travellersForUpdate,
          tripjackPrice: originalTripjackPrice,
          totalPrice: totalPriceValue,
        };

      const seatSelectionData = {
        seats: selectedSeats,
        meals: selectedMeals,
        baggage: selectedBaggage,
        class: selectedClass,
        seatPrices: selectedSeatPrices,
        totalAmount: totalPriceValue,
        selectedSeatsPerTravelerPerSegment,
        selectedMealsPerTravelerPerSegment,
        selectedBaggagePerTravelerPerSegment,
        holdBooking: holdBooking,
        travelerCount: travelerCount,
        mealOptions: mealOptions,
        baggageOptions: baggageOptions,
        bookingId: bookingId,
        // MISNOMER, kept deliberately: this is TripJack's TotalFare, taxes
        // included — not a base fare. BeforeBookingConfirmation.tsx:811 computes
        // the amount charged as `baseFare + seatTotal`, which is correct only
        // because this is a total. Changing it to a real base fare would
        // undercharge every booking by its tax. The price panel now takes the
        // genuine base from FareComponents.BaseFare for display instead.
        baseFare: originalTripjackPrice,
        addonsTotal: addonsTotal,
      };

      sessionStorage.setItem('seatSelection', JSON.stringify(seatSelectionData));

      sessionStorage.setItem('bookingId', bookingId);
      sessionStorage.setItem('totalAmount', JSON.stringify(totalPriceValue));
      sessionStorage.setItem('selectedSeatPrices', JSON.stringify(selectedSeatPrices));
      sessionStorage.setItem(
        'selectedMealsPerTravelerPerSegment',
        JSON.stringify(selectedMealsPerTravelerPerSegment),
      );
      sessionStorage.setItem(
        'selectedBaggagePerTravelerPerSegment',
        JSON.stringify(selectedBaggagePerTravelerPerSegment),
      );
      sessionStorage.setItem(
        'selectedSeatsPerTravelerPerSegment',
        JSON.stringify(selectedSeatsPerTravelerPerSegment),
      );
      sessionStorage.setItem('mealOptions', JSON.stringify(mealOptions));
      sessionStorage.setItem('baggageOptions', JSON.stringify(baggageOptions));
      sessionStorage.setItem('travelerCount', JSON.stringify(travelerCount));
      sessionStorage.setItem('holdBooking', JSON.stringify(holdBooking));

      if (onContinue) {
        onContinue();
      } else {
        navigate('/before/booking', {
          state: {
            bookingData: seatSelectionData,
            bookingId: bookingId,
            totalAmount: totalPriceValue,
            selectedSeats: selectedSeats,
            selectedMeals: selectedMeals,
            selectedBaggage: selectedBaggage,
            selectedSeatPrices: selectedSeatPrices,
            selectedSeatsPerTravelerPerSegment: selectedSeatsPerTravelerPerSegment,
            selectedMealsPerTravelerPerSegment: selectedMealsPerTravelerPerSegment,
            selectedBaggagePerTravelerPerSegment: selectedBaggagePerTravelerPerSegment,
            holdBooking: holdBooking,
            mealOptions: mealOptions,
            baggageOptions: baggageOptions,
            travelerCount: travelerCount,
            baseFare: originalTripjackPrice,
            addonsTotal: addonsTotal,
          },
        });
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      let errorMessage = 'Unable to complete your booking. Please try again.';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      setBookingError(errorMessage);
      setToastMessage({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const buildTravelersForUpdate = (
    travelerInfo: any,
    travellerIds: string[],
    travelerCount: number,
    selectedSeatsPerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: string };
    },
    selectedMealsPerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
    },
    selectedBaggagePerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
    },
  ): Array<{
    travellerId: string;
    ssrSeatInfos: Array<{ key: string; code: string }>;
    ssrMealInfos: Array<{ key: string; code: string }>;
    ssrBaggageInfos: Array<{ key: string; code: string }>;
  }> => {
    const travellers: any[] = [];

    let travelerOrder: any[] = [];

    if (travelerInfo?.travelers && Array.isArray(travelerInfo.travelers)) {
      travelerOrder = travelerInfo.travelers;
    } else {
      const adults = parseInt(travelerInfo?.travelers?.adults) || 0;
      const children = parseInt(travelerInfo?.travelers?.children) || 0;

      for (let i = 0; i < adults; i++) {
        travelerOrder.push({ type: 'adult', index: i });
      }
      for (let i = 0; i < children; i++) {
        travelerOrder.push({ type: 'child', index: i });
      }
    }

    for (let travelerIndex = 0; travelerIndex < travelerCount; travelerIndex++) {
      const ssrSeatInfos: Array<{ key: string; code: string }> = [];
      const ssrMealInfos: Array<{ key: string; code: string }> = [];
      const ssrBaggageInfos: Array<{ key: string; code: string }> = [];

      console.log(`Building traveler ${travelerIndex + 1} for update:`, {
        hasSeats: !!selectedSeatsPerTravelerPerSegment[travelerIndex],
        hasMeals: !!selectedMealsPerTravelerPerSegment[travelerIndex],
        hasBaggage: !!selectedBaggagePerTravelerPerSegment[travelerIndex],
      });

      if (selectedSeatsPerTravelerPerSegment[travelerIndex]) {
        const travelerSeats = selectedSeatsPerTravelerPerSegment[travelerIndex];
        Object.entries(travelerSeats).forEach(([segmentId, seatId]) => {
          if (seatId) {
            ssrSeatInfos.push({
              key: segmentId,
              code: seatId,
            });
            console.log(`  - Seat: ${seatId} on segment ${segmentId}`);
          }
        });
      }

      if (selectedMealsPerTravelerPerSegment[travelerIndex]) {
        const travelerMealsBySegment = selectedMealsPerTravelerPerSegment[travelerIndex];

        const getMealCode = (segmentId: string, mealId: string): string => {
          try {
            const mealCodeMapping = JSON.parse(sessionStorage.getItem('mealCodeMapping') || '{}');
            if (mealCodeMapping[mealId]) {
              return mealCodeMapping[mealId];
            }

            const mealsBySegment = JSON.parse(sessionStorage.getItem('mealsBySegment') || '{}');
            const segmentMeals = mealsBySegment[segmentId];

            if (segmentMeals && Array.isArray(segmentMeals)) {
              const match = mealId.match(/meal_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (
                  segmentMeals[idx] &&
                  (segmentMeals[idx].code || segmentMeals[idx].AirlineCode)
                ) {
                  return segmentMeals[idx].code || segmentMeals[idx].AirlineCode;
                }
              }
            }

            const priceData = JSON.parse(
              sessionStorage.getItem('priceAvailabilityResponse') || '{}',
            );
            const flights = priceData?.data?.flights || [];
            for (const flight of flights) {
              const mealOptionsData = flight.fareOptions?.[0]?.meals;
              if (mealOptionsData && mealOptionsData[segmentId]) {
                const match = mealId.match(/meal_.*_(\d+)$/);
                if (match && match[1]) {
                  const idx = parseInt(match[1]);
                  if (
                    mealOptionsData[segmentId][idx] &&
                    (mealOptionsData[segmentId][idx].code ||
                      mealOptionsData[segmentId][idx].AirlineCode)
                  ) {
                    return (
                      mealOptionsData[segmentId][idx].code ||
                      mealOptionsData[segmentId][idx].AirlineCode
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error getting meal code:', error);
          }

          if (mealId.match(/^[A-Z]{3,4}$/)) {
            return mealId;
          }

          return mealId;
        };

        Object.entries(travelerMealsBySegment).forEach(([segmentId, meals]) => {
          Object.entries(meals).forEach(([mealId, quantity]) => {
            if (quantity > 0) {
              const mealCode = getMealCode(segmentId, mealId);
              for (let i = 0; i < quantity; i++) {
                ssrMealInfos.push({
                  key: segmentId,
                  code: mealCode,
                });
              }
              console.log(`  - Meal: ${mealCode} (x${quantity}) on segment ${segmentId}`);
            }
          });
        });
      }

      if (selectedBaggagePerTravelerPerSegment[travelerIndex]) {
        const travelerBaggageBySegment = selectedBaggagePerTravelerPerSegment[travelerIndex];

        const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
        const flights = priceData?.data?.flights || [];

        const getBaggageCode = (segmentId: string, baggageId: string): string => {
          try {
            const baggageBySegment = JSON.parse(sessionStorage.getItem('baggageBySegment') || '{}');
            const segmentBaggage = baggageBySegment[segmentId];

            if (segmentBaggage && Array.isArray(segmentBaggage)) {
              const match = baggageId.match(/baggage_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (segmentBaggage[idx] && segmentBaggage[idx].code) {
                  return segmentBaggage[idx].code;
                }
                if (segmentBaggage[idx] && segmentBaggage[idx].AirlineCode) {
                  return segmentBaggage[idx].AirlineCode;
                }
              }
            }

            const seatMapData = JSON.parse(sessionStorage.getItem('seatMapResponse') || '{}');
            const tripSeat =
              seatMapData?.data?.tripSeatMap?.tripSeat || seatMapData?.tripSeatMap?.tripSeat;

            if (tripSeat && tripSeat[segmentId]) {
              const baggageOptions = tripSeat[segmentId]?.ssrInfo?.BAGGAGE || [];
              const match = baggageId.match(/baggage_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (baggageOptions[idx] && baggageOptions[idx].AirlineCode) {
                  return baggageOptions[idx].AirlineCode;
                }
              }
            }

            for (const flight of flights) {
              const baggageOptionsData = flight.fareOptions?.[0]?.baggageOptions?.[segmentId];
              if (baggageOptionsData && Array.isArray(baggageOptionsData)) {
                const match = baggageId.match(/baggage_.*_(\d+)$/);
                if (match && match[1]) {
                  const idx = parseInt(match[1]);
                  if (baggageOptionsData[idx] && baggageOptionsData[idx].code) {
                    return baggageOptionsData[idx].code;
                  }
                  if (baggageOptionsData[idx] && baggageOptionsData[idx].AirlineCode) {
                    return baggageOptionsData[idx].AirlineCode;
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error getting baggage code:', error);
          }

          return baggageId;
        };

        const segmentToJourney: { [segmentId: string]: number } = {};
        let currentJourney = 0;
        let previousDate = '';

        flights.forEach((flight: any) => {
          const segmentId = flight.segmentId;
          const departureDate = flight.departure?.date;
          if (previousDate && departureDate !== previousDate) {
            currentJourney++;
          }
          segmentToJourney[segmentId] = currentJourney;
          previousDate = departureDate;
        });

        const baggageAddedForJourney: { [journey: number]: boolean } = {};

        Object.entries(travelerBaggageBySegment).forEach(([segmentId, baggageItems]) => {
          const journeyIndex = segmentToJourney[segmentId];

          if (baggageAddedForJourney[journeyIndex]) {
            console.log(
              `  - Skipping baggage on segment ${segmentId} (already added for journey ${journeyIndex})`,
            );
            return;
          }

          Object.entries(baggageItems).forEach(([baggageId, quantity]) => {
            if (quantity > 0) {
              const bagCode = getBaggageCode(segmentId, baggageId);

              for (let i = 0; i < quantity; i++) {
                ssrBaggageInfos.push({
                  key: segmentId,
                  code: bagCode,
                });
              }
              console.log(`  - Baggage: ${bagCode} (x${quantity}) on segment ${segmentId}`);
              baggageAddedForJourney[journeyIndex] = true;
            }
          });
        });
      }

      const travellerId = travellerIds[travelerIndex] || '';

      travellers.push({
        travellerId,
        ssrSeatInfos,
        ssrMealInfos,
        ssrBaggageInfos,
      });
    }

    return travellers;
  };

  const getTotalBaseFare = (): number => {
    try {
      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');

      if (priceData?.data?.totalPrice?.totalFare) {
        return priceData.data.totalPrice.totalFare;
      }

      if (priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare) {
        return priceData.data.totalPrice.totalFareDetail.FareComponents.TotalFare;
      }

      if (priceData?.data?.flights && Array.isArray(priceData.data.flights)) {
        return priceData.data.flights.reduce((sum: number, flight: any) => {
          const flightFare = flight.totalFare || flight.price || flight.fare || 0;
          return sum + flightFare;
        }, 0);
      }

      if (reviewData?.mappedData?.totalPriceInfo?.totalFareDetail?.FareComponents?.TotalFare) {
        return reviewData.mappedData.totalPriceInfo.totalFareDetail.FareComponents.TotalFare;
      }

      return 0;
    } catch (error) {
      console.error('Error calculating total base fare:', error);
      return 0;
    }
  };

  const buildTravelersArray = (
    travelerInfo: any,
    selectedSeatPrices: Array<{
      seatId: string;
      price: number;
      segmentId?: string;
      seatNumber?: string;
    }>,
    mealOptions: any[],
    baggageOptions: any[],
    travelerCount: number,
    selectedSeatsPerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: string };
    },
    selectedMealsPerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: { [mealId: string]: number } };
    },
    selectedBaggagePerTravelerPerSegment: {
      [travelerIndex: number]: { [segmentId: string]: { [baggageId: string]: number } };
    },
  ): any[] => {
    const travelers: any[] = [];

    const createTraveler = (baseData: any, travelerIndex: number) => {
      const ssrSeatInfos: Array<{ key: string; code: string }> = [];
      const ssrMealInfos: Array<{ key: string; code: string }> = [];
      const ssrBaggageInfos: Array<{ key: string; code: string }> = [];

      console.log(`Building traveler ${travelerIndex + 1}:`, {
        hasSeats: !!selectedSeatsPerTravelerPerSegment[travelerIndex],
        hasMeals: !!selectedMealsPerTravelerPerSegment[travelerIndex],
        hasBaggage: !!selectedBaggagePerTravelerPerSegment[travelerIndex],
      });

      if (selectedSeatsPerTravelerPerSegment[travelerIndex]) {
        const travelerSeats = selectedSeatsPerTravelerPerSegment[travelerIndex];
        Object.entries(travelerSeats).forEach(([segmentId, seatId]) => {
          if (seatId) {
            ssrSeatInfos.push({
              key: segmentId,
              code: seatId,
            });
            console.log(`  - Seat: ${seatId} on segment ${segmentId}`);
          }
        });
      }

      if (selectedMealsPerTravelerPerSegment[travelerIndex]) {
        const travelerMealsBySegment = selectedMealsPerTravelerPerSegment[travelerIndex];

        const getMealCode = (segmentId: string, mealId: string): string => {
          try {
            const mealCodeMapping = JSON.parse(sessionStorage.getItem('mealCodeMapping') || '{}');
            if (mealCodeMapping[mealId]) {
              return mealCodeMapping[mealId];
            }

            const mealsBySegment = JSON.parse(sessionStorage.getItem('mealsBySegment') || '{}');
            const segmentMeals = mealsBySegment[segmentId];

            if (segmentMeals && Array.isArray(segmentMeals)) {
              const match = mealId.match(/meal_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (
                  segmentMeals[idx] &&
                  (segmentMeals[idx].code || segmentMeals[idx].AirlineCode)
                ) {
                  return segmentMeals[idx].code || segmentMeals[idx].AirlineCode;
                }
              }
            }

            const flights =
              JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}')?.data
                ?.flights || [];
            for (const flight of flights) {
              const mealOptionsData = flight.fareOptions?.[0]?.meals;
              if (mealOptionsData && mealOptionsData[segmentId]) {
                const match = mealId.match(/meal_.*_(\d+)$/);
                if (match && match[1]) {
                  const idx = parseInt(match[1]);
                  if (
                    mealOptionsData[segmentId][idx] &&
                    (mealOptionsData[segmentId][idx].code ||
                      mealOptionsData[segmentId][idx].AirlineCode)
                  ) {
                    return (
                      mealOptionsData[segmentId][idx].code ||
                      mealOptionsData[segmentId][idx].AirlineCode
                    );
                  }
                }
              }
            }
          } catch (error) {
            console.error('Error getting meal code:', error);
          }

          return mealId;
        };

        Object.entries(travelerMealsBySegment).forEach(([segmentId, meals]) => {
          Object.entries(meals).forEach(([mealId, quantity]) => {
            if (quantity > 0) {
              const mealCode = getMealCode(segmentId, mealId);
              for (let i = 0; i < quantity; i++) {
                ssrMealInfos.push({
                  key: segmentId,
                  code: mealCode,
                });
              }
              console.log(`  - Meal: ${mealCode} (x${quantity}) on segment ${segmentId}`);
            }
          });
        });
      }

      if (selectedBaggagePerTravelerPerSegment[travelerIndex]) {
        const travelerBaggageBySegment = selectedBaggagePerTravelerPerSegment[travelerIndex];

        const flights =
          JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}')?.data?.flights ||
          [];

        const getBaggageCode = (segmentId: string, baggageId: string): string => {
          try {
            const baggageBySegment = JSON.parse(sessionStorage.getItem('baggageBySegment') || '{}');
            const segmentBaggage = baggageBySegment[segmentId];

            if (segmentBaggage && Array.isArray(segmentBaggage)) {
              const match = baggageId.match(/baggage_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (segmentBaggage[idx] && segmentBaggage[idx].code) {
                  return segmentBaggage[idx].code;
                }
                if (segmentBaggage[idx] && segmentBaggage[idx].AirlineCode) {
                  return segmentBaggage[idx].AirlineCode;
                }
              }
            }

            const seatMapData = JSON.parse(sessionStorage.getItem('seatMapResponse') || '{}');
            const tripSeat =
              seatMapData?.data?.tripSeatMap?.tripSeat || seatMapData?.tripSeatMap?.tripSeat;

            if (tripSeat && tripSeat[segmentId]) {
              const baggageOptions = tripSeat[segmentId]?.ssrInfo?.BAGGAGE || [];
              const match = baggageId.match(/baggage_.*_(\d+)$/);
              if (match && match[1]) {
                const idx = parseInt(match[1]);
                if (baggageOptions[idx] && baggageOptions[idx].AirlineCode) {
                  return baggageOptions[idx].AirlineCode;
                }
              }
            }
          } catch (error) {
            console.error('Error getting baggage code:', error);
          }
          return baggageId;
        };

        const segmentToJourney: { [segmentId: string]: number } = {};
        let currentJourney = 0;
        let previousDate = '';

        flights.forEach((flight: any) => {
          const segmentId = flight.segmentId;
          const departureDate = flight.departure?.date;
          if (previousDate && departureDate !== previousDate) {
            currentJourney++;
          }
          segmentToJourney[segmentId] = currentJourney;
          previousDate = departureDate;
        });

        const baggageAddedForJourney: { [journey: number]: boolean } = {};

        Object.entries(travelerBaggageBySegment).forEach(([segmentId, baggageItems]) => {
          const journeyIndex = segmentToJourney[segmentId];

          if (baggageAddedForJourney[journeyIndex]) {
            console.log(
              `  - Skipping baggage on segment ${segmentId} (already added for journey ${journeyIndex})`,
            );
            return;
          }

          Object.entries(baggageItems).forEach(([baggageId, quantity]) => {
            if (quantity > 0) {
              const bagCode = getBaggageCode(segmentId, baggageId);

              for (let i = 0; i < quantity; i++) {
                ssrBaggageInfos.push({
                  key: segmentId,
                  code: bagCode,
                });
              }
              console.log(`  - Baggage: ${bagCode} (x${quantity}) on segment ${segmentId}`);
              baggageAddedForJourney[journeyIndex] = true;
            }
          });
        });
      }

      const traveler: any = {
        type: baseData.type || 'adult',
        title: baseData.title || 'Mr',
        firstName: baseData.firstName || '',
        lastName: baseData.lastName || '',
        dateOfBirth: baseData.dateOfBirth || '',
        pnum: baseData.pnum || '',
        ed: baseData.ed || '',
        pnat: baseData.pnat || baseData.nationality || 'IN',
        pid: baseData.pid || '',
        di: baseData.di || '',
      };

      if (ssrSeatInfos.length > 0) {
        traveler['ssrSeatInfos'] = ssrSeatInfos;
      }
      if (ssrMealInfos.length > 0) {
        traveler['ssrMealInfos'] = ssrMealInfos;
      }
      if (ssrBaggageInfos.length > 0) {
        traveler['ssrBaggageInfos'] = ssrBaggageInfos;
      }

      return traveler;
    };

    if (travelerInfo?.travelers && Array.isArray(travelerInfo.travelers)) {
      travelerInfo.travelers.forEach((t: any, index: number) => {
        travelers.push(createTraveler(t, index));
      });
    } else {
      const adults = parseInt(travelerInfo?.travelers?.adults) || 0;
      const children = parseInt(travelerInfo?.travelers?.children) || 0;
      let index = 0;

      for (let i = 0; i < adults; i++) {
        travelers.push(
          createTraveler(
            {
              type: 'adult',
              title: travelerInfo[`adultsTitle${i + 1}`] || 'Mr',
              firstName: travelerInfo[`adultsFirstName${i + 1}`] || '',
              lastName: travelerInfo[`adultsLastName${i + 1}`] || '',
              dateOfBirth: travelerInfo[`adultsDob${i + 1}`] || '',
              pnum: travelerInfo[`adultsPnum${i + 1}`] || '',
              ed: travelerInfo[`adultsEd${i + 1}`] || '',
              pnat: travelerInfo[`adultsNationality${i + 1}`] || 'IN',
            },
            index++,
          ),
        );
      }

      for (let i = 0; i < children; i++) {
        travelers.push(
          createTraveler(
            {
              type: 'child',
              title: travelerInfo[`childrenTitle${i + 1}`] || 'Master',
              firstName: travelerInfo[`childrenFirstName${i + 1}`] || '',
              lastName: travelerInfo[`childrenLastName${i + 1}`] || '',
              dateOfBirth: travelerInfo[`childrenDob${i + 1}`] || '',
              pnum: travelerInfo[`childrenPnum${i + 1}`] || '',
              ed: travelerInfo[`childrenEd${i + 1}`] || '',
              pnat: travelerInfo[`childrenNationality${i + 1}`] || 'IN',
            },
            index++,
          ),
        );
      }
    }

    console.log('Built travelers:', JSON.stringify(travelers, null, 2));
    return travelers;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainNavbar navigate={navigate} />

      <div className="bg-white border-b border-gray-200 py-6 mt-18">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step.id < currentStep
                      ? 'bg-orange-500 text-white'
                      : step.id === currentStep
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                      }`}
                  >
                    {step.id < currentStep ? '✓' : step.id}
                  </div>
                  <span
                    className={`text-xs mt-2 text-center ${step.id === currentStep ? 'text-gray-900 font-semibold' : 'text-gray-600'
                      }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${step.id < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          <div className="flex-1">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="font-medium">Back to Traveller Info</span>
              </button>
            )}

            <div className="flex items-center gap-6 mb-6">
              <button
                onClick={() => setActiveSubTab('seat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors relative ${activeSubTab === 'seat'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600'
                  }`}
              >
                <SeatIcon className="w-5 h-5" />
                Seat
                {activeSubTab === 'seat' && !isSeatSelectionComplete() && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => setActiveSubTab('baggage')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeSubTab === 'baggage'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600'
                  }`}
              >
                <Package className="w-5 h-5" />
                Baggage
              </button>
              <button
                onClick={() => setActiveSubTab('meal')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeSubTab === 'meal'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600'
                  }`}
              >
                <Utensils className="w-5 h-5" />
                Meal
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              {activeSubTab === 'seat' && (
                <SeatSelectionComponent
                  travelerCount={travelerCount}
                  availableSegments={availableSegments}
                  currentSegmentId={currentSegmentId}
                  setCurrentSegmentId={setCurrentSegmentId}
                  seats={seats}
                  setSeats={setSeats}
                  allSegmentsSeatMaps={allSegmentsSeatMaps}
                  selectedSeatsPerTravelerPerSegment={selectedSeatsPerTravelerPerSegment}
                  setSelectedSeatsPerTravelerPerSegment={setSelectedSeatsPerTravelerPerSegment}
                  selectedTravelerForSeat={selectedTravelerForSeat}
                  setSelectedTravelerForSeat={setSelectedTravelerForSeat}
                  showSeatLimitWarning={showSeatLimitWarning}
                  setShowSeatLimitWarning={setShowSeatLimitWarning}
                  showSeatDisclaimer={showSeatDisclaimer}
                  selectedSeatPrices={selectedSeatPrices}
                  setSelectedSeatPrices={setSelectedSeatPrices}
                  flightDetails={flightDetails}
                  setFlightDetails={setFlightDetails}
                  getFlightInfoBySegmentId={getFlightInfoBySegmentId}
                  seatApiError={seatApiError}
                />
              )}

              {activeSubTab === 'baggage' && (
                <BaggageSelectionComponent
                  travelerCount={travelerCount}
                  availableSegments={baggageOnlySegments}
                  currentSegmentIdForBaggage={currentSegmentIdForBaggage}
                  setCurrentSegmentIdForBaggage={setCurrentSegmentIdForBaggage}
                  selectedTravelerForBaggage={selectedTravelerForBaggage}
                  setSelectedTravelerForBaggage={setSelectedTravelerForBaggage}
                  selectedBaggagePerTravelerPerSegment={selectedBaggagePerTravelerPerSegment}
                  setSelectedBaggagePerTravelerPerSegment={setSelectedBaggagePerTravelerPerSegment}
                  showBaggageLimitWarning={showBaggageLimitWarning}
                  setShowBaggageLimitWarning={setShowBaggageLimitWarning}
                  getFlightInfoBySegmentId={getFlightInfoBySegmentId}
                  baggageBySegment={baggageBySegment}
                  isRoundTrip={isRoundTrip}
                  isConnectingFlight={isConnectingFlight}
                  isMultiCity={isMultiCity}
                  segmentsList={allFlights}
                />
              )}

              {activeSubTab === 'meal' && (
                <MealSelectionComponent
                  travelerCount={travelerCount}
                  availableSegments={mealOnlySegments}
                  currentSegmentIdForMeals={currentSegmentIdForMeals}
                  setCurrentSegmentIdForMeals={setCurrentSegmentIdForMeals}
                  selectedTravelerForMeals={selectedTravelerForMeals}
                  setSelectedTravelerForMeals={setSelectedTravelerForMeals}
                  selectedMealsPerTravelerPerSegment={selectedMealsPerTravelerPerSegment}
                  setSelectedMealsPerTravelerPerSegment={setSelectedMealsPerTravelerPerSegment}
                  selectedMeals={selectedMeals}
                  getFlightInfoBySegmentId={getFlightInfoBySegmentId}
                  mealsBySegment={mealsBySegment}
                  isRoundTrip={isRoundTrip}
                  allFlights={allFlights}
                />
              )}
            </div>
          </div>

          <div className="w-96">
            <PriceInformation
              timeLeft={timeLeft}
              formatTime={formatTime}
              reviewData={reviewData}
              selectedSeatPrices={selectedSeatPrices}
              selectedMealsPerTravelerPerSegment={selectedMealsPerTravelerPerSegment}
              selectedBaggagePerTravelerPerSegment={selectedBaggagePerTravelerPerSegment}
              bookingError={bookingError}
              isProcessing={isProcessing}
              handleContinue={handleContinue}
              getFlightInfoBySegmentId={getFlightInfoBySegmentId}
              walletData={walletData}
              holdBooking={holdBooking}
              setHoldBooking={setHoldBooking}
              adultFare={reviewData?.mappedData?.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.AdultFare}
              childFare={reviewData?.mappedData?.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.ChildFare}
              infantFare={reviewData?.mappedData?.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.INFANT}
              adultCount={reviewData?.mappedData?.searchQuery?.paxInfo?.AdultFare || 1}
              childCount={reviewData?.mappedData?.searchQuery?.paxInfo?.ChildFare || 0}
              infantCount={reviewData?.mappedData?.searchQuery?.paxInfo?.INFANT || 0} makedPrice={undefined} setMakedPrice={function (price: number): void {
                throw new Error('Function not implemented.');
              } }            />
          </div>
        </div>
      </div>

      {showTimerExpiredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
                <svg
                  className="h-10 w-10 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">Session Expired</h3>

              <p className="text-gray-600 mb-6">
                Your booking session has expired due to inactivity. Please start your booking again
                to continue.
              </p>

              <button
                onClick={handleTimerExpiredRedirect}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                OK, Go to Homepage
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg max-w-md ${toastMessage.type === 'error'
            ? 'bg-red-50 border-red-500 border'
            : toastMessage.type === 'success'
              ? 'bg-green-50 border-green-500 border'
              : 'bg-yellow-50 border-yellow-500 border'
            }`}
        >
          <p
            className={`text-sm ${toastMessage.type === 'error'
              ? 'text-red-700'
              : toastMessage.type === 'success'
                ? 'text-green-700'
                : 'text-yellow-700'
              }`}
          >
            {toastMessage.message}
          </p>
        </div>
      )}
    </div>
  );
}