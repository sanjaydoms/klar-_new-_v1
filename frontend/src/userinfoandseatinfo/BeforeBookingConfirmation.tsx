import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateAndBook } from '@/api/flightService.api';
import { getUserWallet } from '@/api/user.api';
import Loader from './TravellerInfo/Loader';
import ProgressSteps from './TravellerInfo/ProgressSteps';
import PriceSummarySection from './BeforeBookingConfirmation/PriceSummarySection';
import TravelerAndContactDetails from './BeforeBookingConfirmation/TravelerAndContactDetails';
import SelectedAddonsSection from './BeforeBookingConfirmation/SelectedAddonsSection';
import {
  BeforeBookingConfirmationProps,
  SelectedSeatDetails,
  TravelerSeatSelection,
  TravelerMealSelection,
  TravelerBaggageSelection,
} from '@/types/beforeBooking.type';
import { extractFlightDetailsFromOnewayReview } from '@/utils/beforeBooking.util';
import TravellerInfoCard from './TravellerInfo/TravellerInfoCard';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/api/razorpay.api';
import { v4 as uuidv4 } from 'uuid';
import { readReviewData } from '@/utils/reviewSession';

interface FlightSegment {
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  duration: string;
  stops: number;
  airline: string;
  flightNumber: string;
  refundableType?: number;
  baggage: {
    checkIn: string;
    cabin: string;
  };
  segmentType?: 'outbound' | 'return' | 'multicity';
  tripNumber?: number;
  segmentNumber?: number;
  totalSegmentsInTrip?: number;
  priceDetails?: any;
}

export default function BeforeBookingConfirmation({
  onBack,
  onContinue,
}: BeforeBookingConfirmationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('flights');

  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [travelerDetails, setTravelerDetails] = useState<any[]>([]);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [selectedBaggage, setSelectedBaggage] = useState<string[]>([]);
  const [holdBooking, setHoldBooking] = useState(false);
  const [walletData, setWalletData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [selectedSeatPrices, setSelectedSeatPrices] = useState<SelectedSeatDetails[]>([]);
  const [selectedMealsPerTravelerPerSegment, setSelectedMealsPerTravelerPerSegment] =
    useState<TravelerMealSelection>({});
  const [selectedBaggagePerTravelerPerSegment, setSelectedBaggagePerTravelerPerSegment] =
    useState<TravelerBaggageSelection>({});
  const [selectedSeatsPerTravelerPerSegment, setSelectedSeatsPerTravelerPerSegment] =
    useState<TravelerSeatSelection>({});
  const [reviewData, setReviewData] = useState<any>(null);
  const [makedPrice, setMakedPrice] = useState<any>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [bookingId, setBookingId] = useState('');
  const [mealOptions, setMealOptions] = useState<any[]>([]);
  const [baggageOptions, setBaggageOptions] = useState<any[]>([]);
  const [travelerCount, setTravelerCount] = useState(0);
  const [markupPrice, setMarkupPrice] = useState(0);
  const [baseFare, setBaseFare] = useState(0);
  const [addonsTotal, setAddonsTotal] = useState(0);
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([]);
  const [tripType, setTripType] = useState<string>('oneway');
  const [passengerCount, setPassengerCount] = useState({ ADULT: 0, CHILD: 0, INFANT: 0 });
  const [gstInfo, setGstInfo] = useState<any>(null);
  const [emergencyContact, setEmergencyContact] = useState<any>(null);
  const [allTravellerDetails, setAllTravellerDetails] = useState<any>(null);

  const steps = [
    { id: 1, name: 'Flights' },
    { id: 2, name: 'Traveller Information' },
    { id: 3, name: 'Seat & Meal' },
    { id: 4, name: 'Payment method' },
    { id: 5, name: 'Booking Confirmed' },
  ];

  const currentStep = 4;

  // Fetch all traveller details from session storage
  useEffect(() => {
    try {
      // 1. Get complete traveller details
      const allDetailsStr = sessionStorage.getItem('allTravellerDetails');
      if (allDetailsStr) {
        const allDetails = JSON.parse(allDetailsStr);
        setAllTravellerDetails(allDetails);

        // Extract GST info if present
        if (allDetails.gstInfo) {
          setGstInfo(allDetails.gstInfo);
        }

        // Extract emergency contact if present
        if (allDetails.emergencyContact) {
          setEmergencyContact(allDetails.emergencyContact);
        }
      }

      // 2. Alternative: Get GST info separately if stored
      const gstStr = sessionStorage.getItem('gstInfo');
      if (gstStr) {
        setGstInfo(JSON.parse(gstStr));
      }

      // 3. Alternative: Get emergency contact separately if stored
      const emergencyStr = sessionStorage.getItem('emergencyContact');
      if (emergencyStr) {
        setEmergencyContact(JSON.parse(emergencyStr));
      }

      // 4. Get booking payload (contains everything)
      const payloadStr = sessionStorage.getItem('bookingPayload');
      if (payloadStr) {
        const payload = JSON.parse(payloadStr);
        // This contains: travellers, gstInfo, emergencyContact, email, phone
        console.log('Full booking payload:', payload);
      }

    } catch (error) {
      console.error('Error fetching all traveller details:', error);
    }
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const totalAmount = calculateTotalAmount();
        const response = await getUserWallet(totalAmount.total);
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
    const getDataFromStorage = () => {
      try {
        if (location.state) {
          console.log('📍 Location state data:', location.state);

          if (location.state.bookingId) setBookingId(location.state.bookingId);
          if (location.state.totalAmount) setTotalPrice(location.state.totalAmount);
          if (location.state.selectedSeats) setSelectedSeats(location.state.selectedSeats);
          if (location.state.selectedMeals) setSelectedMeals(location.state.selectedMeals);
          if (location.state.selectedBaggage) setSelectedBaggage(location.state.selectedBaggage);
          if (location.state.holdBooking !== undefined) setHoldBooking(location.state.holdBooking);
          if (location.state.selectedSeatPrices)
            setSelectedSeatPrices(location.state.selectedSeatPrices);
          if (location.state.selectedMealsPerTravelerPerSegment)
            setSelectedMealsPerTravelerPerSegment(
              location.state.selectedMealsPerTravelerPerSegment,
            );
          if (location.state.selectedBaggagePerTravelerPerSegment)
            setSelectedBaggagePerTravelerPerSegment(
              location.state.selectedBaggagePerTravelerPerSegment,
            );
          if (location.state.selectedSeatsPerTravelerPerSegment)
            setSelectedSeatsPerTravelerPerSegment(
              location.state.selectedSeatsPerTravelerPerSegment,
            );
          if (location.state.mealOptions) setMealOptions(location.state.mealOptions);
          if (location.state.baggageOptions) setBaggageOptions(location.state.baggageOptions);
          if (location.state.travelerCount) setTravelerCount(location.state.travelerCount);
          if (location.state.markupPrice) setMarkupPrice(location.state.markupPrice);
          if (location.state.baseFare) setBaseFare(location.state.baseFare);
          if (location.state.addonsTotal) setAddonsTotal(location.state.addonsTotal);
        }

        const seatSelectionStr = sessionStorage.getItem('seatSelection');
        if (seatSelectionStr) {
          const seatSelection = JSON.parse(seatSelectionStr);
          if (!location.state) {
            setSelectedSeats(seatSelection.seats || []);
            setSelectedMeals(seatSelection.meals || []);
            setSelectedBaggage(seatSelection.baggage || []);
            setHoldBooking(seatSelection.holdBooking || false);
            setSelectedSeatPrices(seatSelection.seatPrices || []);
            setSelectedMealsPerTravelerPerSegment(
              seatSelection.selectedMealsPerTravelerPerSegment || {},
            );
            setSelectedBaggagePerTravelerPerSegment(
              seatSelection.selectedBaggagePerTravelerPerSegment || {},
            );
            setSelectedSeatsPerTravelerPerSegment(
              seatSelection.selectedSeatsPerTravelerPerSegment || {},
            );
            setTotalPrice(seatSelection.totalAmount || 0);
            setTravelerCount(seatSelection.travelerCount || 0);
            setMealOptions(seatSelection.mealOptions || []);
            setBaggageOptions(seatSelection.baggageOptions || []);
            setBookingId(seatSelection.bookingId || '');
            setMarkupPrice(seatSelection.markupPrice || 0);
            setBaseFare(seatSelection.baseFare || 0);
            setAddonsTotal(seatSelection.addonsTotal || 0);
          }
        }

        const travelerInfoStr = sessionStorage.getItem('travelerInfo');
        if (travelerInfoStr) {
          const travelerInfo = JSON.parse(travelerInfoStr);
          setTravelerDetails(travelerInfo);

          if (!travelerCount) {
            const travelers = travelerInfo.travelers || travelerInfo || [];
            const count = travelers.length || 1;
            setTravelerCount(count);
          }
        }

        const contactDetailsStr = sessionStorage.getItem('currentContactDetails');
        if (contactDetailsStr) setContactDetails(JSON.parse(contactDetailsStr));

        const reviewData = readReviewData();
        if (reviewData) {
          setReviewData(reviewData);
          const extractedData = extractFlightDetailsFromOnewayReview(reviewData);
          if (extractedData) setFlightDetails(extractedData);

          const tripInfoArray =
            reviewData?.TripInformation ||
            reviewData?.mappedData?.TripInformation ||
            reviewData?.data?.TripInformation ||
            reviewData?.tripInfos ||
            [];

          const searchType =
            reviewData?.mappedData?.searchQuery?.searchType ||
            reviewData?.searchQuery?.searchType ||
            reviewData?.data?.searchQuery?.searchType ||
            'oneway';

          let allSegments: FlightSegment[] = [];

          if (tripInfoArray.length === 0) {
            const segments = reviewData?.data?.segments || reviewData?.segments || [];
            if (segments.length > 0) {
              segments.forEach((segment: any, idx: number) => {
                const segmentData = {
                  origin:
                    segment.origin ||
                    segment.fromCityOrAirport?.code ||
                    segment.departureAirport?.code ||
                    'N/A',
                  destination:
                    segment.destination ||
                    segment.toCityOrAirport?.code ||
                    segment.arrivalAirport?.code ||
                    'N/A',
                  originAirport:
                    segment.origin ||
                    segment.fromCityOrAirport?.code ||
                    segment.departureAirport?.code ||
                    'N/A',
                  destinationAirport:
                    segment.destination ||
                    segment.toCityOrAirport?.code ||
                    segment.arrivalAirport?.code ||
                    'N/A',
                  departureDate: segment.departureDate || segment.dt?.split('T')[0] || 'N/A',
                  departureTime: segment.departureTime || segment.dt || 'N/A',
                  arrivalDate: segment.arrivalDate || segment.at?.split('T')[0] || 'N/A',
                  arrivalTime: segment.arrivalTime || segment.at || 'N/A',
                  duration: segment.duration || 'N/A',
                  stops: segment.stops || 0,
                  airline:
                    segment.airlineName || segment.airline?.name || segment.al?.name || 'N/A',
                  flightNumber: segment.flightNumber || segment.flightNo || segment.fN || 'N/A',
                  refundableType: segment.refundableType || 0,
                  baggage: {
                    checkIn: segment.baggage?.checkIn || segment.bI?.iB || 'N/A',
                    cabin: segment.baggage?.cabin || segment.bI?.cB || 'N/A',
                  },
                  segmentType:
                    searchType === 'RETURN' ? (idx === 0 ? 'outbound' : 'return') : 'multicity',
                  tripNumber: 1,
                  segmentNumber: idx + 1,
                  totalSegmentsInTrip: segments.length,
                  priceDetails: segment.priceDetails || {},
                };
                allSegments.push(segmentData as any);
              });
            }
          } else {
            tripInfoArray.forEach((trip: any, tripIndex: number) => {
              const segmentInfoArray = trip?.SegmentInformation || trip?.segments || trip?.sI || [];

              segmentInfoArray.forEach((segment: any, segmentIndex: number) => {
                const extractedData = extractFlightDetailsFromOnewayReview(
                  reviewData,
                  tripIndex,
                  segmentIndex,
                );

                if (extractedData) {
                  let segmentType: 'outbound' | 'return' | 'multicity' = 'multicity';

                  if (searchType === 'RETURN') {
                    segmentType = tripIndex === 0 ? 'outbound' : 'return';
                  } else if (searchType === 'MULTICITY') {
                    segmentType = 'multicity';
                  }

                  allSegments.push({
                    ...extractedData,
                    segmentType: segmentType,
                    tripNumber: tripIndex + 1,
                    segmentNumber: segmentIndex + 1,
                    totalSegmentsInTrip: segmentInfoArray.length,
                  });
                }
              });
            });
          }

          setFlightSegments(allSegments);

          let finalTripType = 'oneway';
          if (searchType === 'RETURN') {
            finalTripType = 'roundtrip';
          } else if (searchType === 'MULTICITY') {
            finalTripType = 'multicity';
          }
          setTripType(finalTripType);
        }

        const walletStr = sessionStorage.getItem('walletData');
        if (walletStr) setWalletData(JSON.parse(walletStr));

        const makedPriceStr = sessionStorage.getItem('makedPrice');
        if (makedPriceStr) setMakedPrice(JSON.parse(makedPriceStr));

        if (!bookingId) {
          const storedBookingId = sessionStorage.getItem('bookingId');
          if (storedBookingId) setBookingId(storedBookingId);
        }

        if (!totalPrice) {
          const storedTotal = sessionStorage.getItem('totalAmount');
          if (storedTotal) setTotalPrice(JSON.parse(storedTotal));
        }

        if (selectedSeatPrices.length === 0) {
          const storedPrices = sessionStorage.getItem('selectedSeatPrices');
          if (storedPrices) setSelectedSeatPrices(JSON.parse(storedPrices));
        }

        if (Object.keys(selectedMealsPerTravelerPerSegment).length === 0) {
          const storedMeals = sessionStorage.getItem('selectedMealsPerTravelerPerSegment');
          if (storedMeals) setSelectedMealsPerTravelerPerSegment(JSON.parse(storedMeals));
        }

        if (Object.keys(selectedBaggagePerTravelerPerSegment).length === 0) {
          const storedBaggage = sessionStorage.getItem('selectedBaggagePerTravelerPerSegment');
          if (storedBaggage) setSelectedBaggagePerTravelerPerSegment(JSON.parse(storedBaggage));
        }

        if (Object.keys(selectedSeatsPerTravelerPerSegment).length === 0) {
          const storedSeats = sessionStorage.getItem('selectedSeatsPerTravelerPerSegment');
          if (storedSeats) setSelectedSeatsPerTravelerPerSegment(JSON.parse(storedSeats));
        }

        if (mealOptions.length === 0) {
          const storedMealOptions = sessionStorage.getItem('mealOptions');
          if (storedMealOptions) setMealOptions(JSON.parse(storedMealOptions));
        }

        if (baggageOptions.length === 0) {
          const storedBaggageOptions = sessionStorage.getItem('baggageOptions');
          if (storedBaggageOptions) setBaggageOptions(JSON.parse(storedBaggageOptions));
        }

        if (!markupPrice) {
          const storedMarkup = sessionStorage.getItem('markupPrice');
          if (storedMarkup) setMarkupPrice(JSON.parse(storedMarkup));
        }

        if (!holdBooking) {
          const storedHold = sessionStorage.getItem('holdBooking');
          if (storedHold) setHoldBooking(JSON.parse(storedHold));
        }

        if (!travelerCount) {
          const storedCount = sessionStorage.getItem('travelerCount');
          if (storedCount) setTravelerCount(JSON.parse(storedCount));
        }
      } catch (error) {
        console.error('Error getting data from sessionStorage:', error);
      }
    };

    getDataFromStorage();
  }, [location]);

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
    try {
      const reviewData = readReviewData();
      if (reviewData) {
        const paxInfo =
          reviewData?.searchQuery?.paxInfo || reviewData?.mappedData?.searchQuery?.paxInfo || {};

        console.log('📊 Setting passenger count from paxInfo:', paxInfo);

        setPassengerCount({
          ADULT: paxInfo?.AdultFare || paxInfo?.ADULT || 1,
          CHILD: paxInfo?.ChildFare || paxInfo?.CHILD || 0,
          INFANT: paxInfo?.INFANT || paxInfo?.infant || 0,
        });
      }
    } catch (error) {
      console.error('Error getting passenger count:', error);
    }
  }, [reviewData]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getActualMealCode = (mealId: string, segmentId: string): string => {
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
          if (segmentMeals[idx] && (segmentMeals[idx].code || segmentMeals[idx].AirlineCode)) {
            return segmentMeals[idx].code || segmentMeals[idx].AirlineCode;
          }
        }
      }

      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
      const flights = priceData?.data?.flights || [];
      for (const flight of flights) {
        const mealOptionsData = flight.fareOptions?.[0]?.meals;
        if (mealOptionsData && mealOptionsData[segmentId]) {
          const match = mealId.match(/meal_.*_(\d+)$/);
          if (match && match[1]) {
            const idx = parseInt(match[1]);
            if (
              mealOptionsData[segmentId][idx] &&
              (mealOptionsData[segmentId][idx].code || mealOptionsData[segmentId][idx].AirlineCode)
            ) {
              return (
                mealOptionsData[segmentId][idx].code || mealOptionsData[segmentId][idx].AirlineCode
              );
            }
          }
        }
      }

      const mealOption = mealOptions.find((m) => m.id === mealId || m.code === mealId);
      if (mealOption && (mealOption.code || mealOption.AirlineCode)) {
        return mealOption.code || mealOption.AirlineCode;
      }

      return mealId;
    } catch (error) {
      console.error('Error getting meal code:', error);
      return mealId;
    }
  };

  const formatGSTMobile = (mobile: string): string => {
    if (!mobile) return '';
    // Remove all non-digits
    const digits = mobile.replace(/\D/g, '');
    // If it's exactly 10 digits, add +91
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    // If it already has country code
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    return mobile;
  };

  const getActualBaggageCode = (baggageId: string, segmentId: string): string => {
    try {
      const baggageCodeMapping = JSON.parse(sessionStorage.getItem('baggageCodeMapping') || '{}');
      if (baggageCodeMapping[baggageId]) {
        return baggageCodeMapping[baggageId];
      }

      const baggageBySegment = JSON.parse(sessionStorage.getItem('baggageBySegment') || '{}');
      const segmentBaggage = baggageBySegment[segmentId];

      if (segmentBaggage && Array.isArray(segmentBaggage)) {
        const match = baggageId.match(/baggage_.*_(\d+)$/);
        if (match && match[1]) {
          const idx = parseInt(match[1]);
          if (
            segmentBaggage[idx] &&
            (segmentBaggage[idx].code || segmentBaggage[idx].AirlineCode)
          ) {
            return segmentBaggage[idx].code || segmentBaggage[idx].AirlineCode;
          }
        }
      }

      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
      const flights = priceData?.data?.flights || [];
      for (const flight of flights) {
        const baggageOptionsData = flight.fareOptions?.[0]?.baggageOptions?.[segmentId];
        if (baggageOptionsData && Array.isArray(baggageOptionsData)) {
          const match = baggageId.match(/baggage_.*_(\d+)$/);
          if (match && match[1]) {
            const idx = parseInt(match[1]);
            if (
              baggageOptionsData[idx] &&
              (baggageOptionsData[idx].code || baggageOptionsData[idx].AirlineCode)
            ) {
              return baggageOptionsData[idx].code || baggageOptionsData[idx].AirlineCode;
            }
          }
        }
      }

      const baggageOption = baggageOptions.find((b) => b.id === baggageId || b.code === baggageId);
      if (baggageOption && (baggageOption.code || baggageOption.AirlineCode)) {
        return baggageOption.code || baggageOption.AirlineCode;
      }

      return baggageId;
    } catch (error) {
      console.error('Error getting baggage code:', error);
      return baggageId;
    }
  };

  const buildTravelersForUpdateWithCodes = (
    travelerInfo: any,
    travellerIds: string[],
    selectedSeatsPerTravelerPerSegment: any,
    selectedMealsPerTravelerPerSegment: any,
    selectedBaggagePerTravelerPerSegment: any,
  ) => {
    const travellers: any[] = [];
    const travelersList = travelerInfo.travelers || travelerInfo || [];

    travelersList.forEach((traveler: any, index: number) => {
      const ssrSeatInfos: Array<{ key: string; code: string }> = [];
      const ssrMealInfos: Array<{ key: string; code: string }> = [];
      const ssrBaggageInfos: Array<{ key: string; code: string }> = [];

      if (selectedSeatsPerTravelerPerSegment[index]) {
        Object.entries(selectedSeatsPerTravelerPerSegment[index]).forEach(([segmentId, seatId]) => {
          if (seatId) {
            ssrSeatInfos.push({
              key: segmentId,
              code: seatId as string,
            });
          }
        });
      }

      if (selectedMealsPerTravelerPerSegment[index]) {
        Object.entries(selectedMealsPerTravelerPerSegment[index]).forEach(([segmentId, meals]) => {
          Object.entries(meals as any).forEach(([mealId, quantity]) => {
            if (quantity as number > 0) {
              const actualMealCode = getActualMealCode(mealId, segmentId as string);
              for (let i = 0; i < (quantity as number); i++) {
                ssrMealInfos.push({
                  key: segmentId as string,
                  code: actualMealCode,
                });
              }
            }
          });
        });
      }

      if (selectedBaggagePerTravelerPerSegment[index]) {
        Object.entries(selectedBaggagePerTravelerPerSegment[index]).forEach(
          ([segmentId, baggage]) => {
            Object.entries(baggage as any).forEach(([baggageId, quantity]) => {
              if (quantity as number > 0) {
                const actualBaggageCode = getActualBaggageCode(baggageId, segmentId as string);
                for (let i = 0; i < (quantity as number); i++) {
                  ssrBaggageInfos.push({
                    key: segmentId as string,
                    code: actualBaggageCode,
                  });
                }
              }
            });
          },
        );
      }

      travellers.push({
        travellerId: travellerIds[index] || '',
        ssrSeatInfos,
        ssrMealInfos,
        ssrBaggageInfos,
      });
    });

    console.log('📋 Built travelers with codes:', JSON.stringify(travellers, null, 2));
    return travellers;
  };

  const calculateTotalAmount = () => {
    try {
      let baseFareVal = baseFare || 0;
      let addonsTotalVal = addonsTotal || 0;
      let markupVal = markupPrice || 0;
      let totalVal = totalPrice || 0;

      if (!baseFareVal) {
        const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
        if (priceData?.data?.totalPrice?.totalFare) {
          baseFareVal = priceData.data.totalPrice.totalFare;
        } else if (priceData?.data?.totalPrice?.totalFareDetail?.FareComponents?.TotalFare) {
          baseFareVal = priceData.data.totalPrice.totalFareDetail.FareComponents.TotalFare;
        }
      }

      if (!addonsTotalVal) {
        const seatTotal = selectedSeatPrices.reduce((sum, seat) => sum + (seat.price || 0), 0);

        let mealTotal = 0;
        Object.entries(selectedMealsPerTravelerPerSegment).forEach(
          ([travelerIndex, travelerSelections]) => {
            Object.entries(travelerSelections || {}).forEach(([segmentId, segmentMeals]) => {
              Object.entries(segmentMeals || {}).forEach(([mealId, quantity]) => {
                if (quantity > 0) {
                  const mealOption = mealOptions.find((m) => m.id === mealId || m.code === mealId);
                  if (mealOption) {
                    mealTotal += (mealOption.price || mealOption.amount || 0) * quantity;
                  }
                }
              });
            });
          },
        );

        let baggageTotal = 0;
        Object.entries(selectedBaggagePerTravelerPerSegment).forEach(
          ([travelerIndex, travelerSelections]) => {
            Object.entries(travelerSelections || {}).forEach(([segmentId, segmentBaggage]) => {
              Object.entries(segmentBaggage || {}).forEach(([baggageId, quantity]) => {
                if (quantity > 0) {
                  const baggageOption = baggageOptions.find(
                    (b) => b.id === baggageId || b.code === baggageId,
                  );
                  if (baggageOption) {
                    baggageTotal += (baggageOption.price || baggageOption.amount || 0) * quantity;
                  }
                }
              });
            });
          },
        );

        addonsTotalVal = seatTotal + mealTotal + baggageTotal;
      }

      if (!markupVal) {
        const storedMarkup = sessionStorage.getItem('markupPrice');
        if (storedMarkup) {
          markupVal = JSON.parse(storedMarkup);
        } else {
          const makedPriceData = JSON.parse(sessionStorage.getItem('makedPrice') || '{}');
          if (makedPriceData?.services) {
            const flightService = makedPriceData.services.find(
              (s: any) => s.serviceType === 'FLIGHTS',
            );
            if (flightService) {
              const percentage = flightService.percentageMarkup || 0;
              const fixed = flightService.fixedMarkup || 0;
              const totalBeforeMarkup = baseFareVal + addonsTotalVal;
              if (percentage > 0) {
                markupVal = (totalBeforeMarkup * percentage) / 100;
              } else if (fixed > 0) {
                markupVal = fixed;
              }
            }
          }
        }
      }

      if (!totalVal) {
        totalVal = baseFareVal + addonsTotalVal + markupVal;
      }

      return {
        baseFare: Math.round(baseFareVal * 100) / 100,
        seatTotal: Math.round(addonsTotalVal * 100) / 100,
        markup: Math.round(markupVal * 100) / 100,
        total: Math.round(totalVal * 100) / 100,
      };
    } catch (error) {
      console.error('Error calculating total:', error);
      return {
        baseFare: 0,
        seatTotal: 0,
        markup: 0,
        total: 0,
      };
    }
  };

  const handleConfirmBooking = async () => {
    setIsLoading(true);
    setBookingError(null);

    try {
      const totalAmount = calculateTotalAmount();

      console.log('💰 Checking wallet with amount:', totalAmount.total);
      const walletResponse = await getUserWallet(totalAmount.total);
      console.log('💰 Wallet response:', walletResponse);

      if (walletResponse?.data?.success) {
        // Balance is fetched for DISPLAY only. There is no wallet-payment path
        // on this screen — every booking proceeds to Razorpay below, whatever
        // canUseWallet says. If wallet payment is ever implemented (see the
        // backend's /book/pay debit, which bookingLocal already supports),
        // branch on canUseWallet HERE, before createRazorpayOrder.
        setWalletData(walletResponse.data.data);
      }

      const travelerInfo = JSON.parse(sessionStorage.getItem('travelerInfo') || '{}');
      const travellerIds = JSON.parse(sessionStorage.getItem('travellerIds') || '[]');
      const finalBookingId = bookingId || sessionStorage.getItem('bookingId') || '';

      if (!finalBookingId) {
        throw new Error('Booking ID not found. Please restart your booking.');
      }

      const selectedSeatsPerTravelerPerSegmentData =
        location.state?.selectedSeatsPerTravelerPerSegment ||
        JSON.parse(sessionStorage.getItem('seatSelection') || '{}')
          .selectedSeatsPerTravelerPerSegment ||
        {};
      const selectedMealsPerTravelerPerSegmentData =
        location.state?.selectedMealsPerTravelerPerSegment ||
        JSON.parse(sessionStorage.getItem('seatSelection') || '{}')
          .selectedMealsPerTravelerPerSegment ||
        {};
      const selectedBaggagePerTravelerPerSegmentData =
        location.state?.selectedBaggagePerTravelerPerSegment ||
        JSON.parse(sessionStorage.getItem('seatSelection') || '{}')
          .selectedBaggagePerTravelerPerSegment ||
        {};

      const travellers = buildTravelersForUpdateWithCodes(
        travelerInfo,
        travellerIds,
        selectedSeatsPerTravelerPerSegmentData,
        selectedMealsPerTravelerPerSegmentData,
        selectedBaggagePerTravelerPerSegmentData,
      );

      const tripjackPrice = totalAmount.baseFare + totalAmount.seatTotal;

      let formattedGstInfo = null;
      if (gstInfo && gstInfo.gstNumber) {
        formattedGstInfo = {
          gstNumber: gstInfo.gstNumber,
          registeredName: gstInfo.registeredName,
          email: gstInfo.email || '',
          mobile: formatGSTMobile(gstInfo.mobile || ''), 
          address: gstInfo.address || '',
        };
      }

      const tempBookingData = {
        bookingId: finalBookingId,
        travellers: travellers,
        tripjackPrice: tripjackPrice,
        markupPrice: totalAmount.markup || 0,
        totalPrice: totalAmount.total || 0,
        gstInfo: formattedGstInfo,
      };
      sessionStorage.setItem('tempBookingData', JSON.stringify(tempBookingData));

      // Wallet settlement — no Razorpay. updateAndBook is sent WITHOUT orderId
      // and WITHOUT source:'b2c'; the token identifies the client and the
      // backend routes by clientType: b2b wallets are balance-checked and
      // debited BEFORE the supplier book, refunded automatically on failure.
      // If a non-wallet client ever reaches this branch, the backend rejects
      // the missing orderId — it cannot issue an unpaid ticket.
      if (walletResponse?.data?.data?.canUseWallet) {
        const bookingResponse = await updateAndBook({
          bookingId: finalBookingId,
          travellers,
          tripjackPrice,
          markupPrice: totalAmount.markup || 0,
          totalPrice: totalAmount.total || 0,
          ...(formattedGstInfo && { gstInfo: formattedGstInfo }),
        } as any);

        if (!bookingResponse?.success) {
          setBookingError(
            bookingResponse?.message ||
              'Wallet payment failed. Please try again or contact support.',
          );
          setIsLoading(false);
          return;
        }

        sessionStorage.setItem(
          'seatSelection',
          JSON.stringify({
            seats: selectedSeats,
            meals: selectedMeals,
            baggage: selectedBaggage,
            seatPrices: selectedSeatPrices,
            totalAmount: totalAmount.total,
            selectedSeatsPerTravelerPerSegment,
            selectedMealsPerTravelerPerSegment,
            selectedBaggagePerTravelerPerSegment,
            holdBooking: false,
            paymentMethod: 'wallet',
          }),
        );
        sessionStorage.removeItem('tempBookingData');

        if (onContinue) {
          onContinue();
        } else {
          navigate('/booking-confirmation', {
            state: {
              bookingResponse: bookingResponse,
              bookingId: finalBookingId,
              totalAmount: totalAmount.total,
              selectedSeats: selectedSeats,
            },
          });
        }
        return;
      }

      const token = localStorage.getItem('token');
      const backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';

      let userId = '';
      let userEmail = '';
      let mobile = '';
      let clientType = 'B2C';

      try {
        const userResponse = await fetch(`${backendUrl}/user/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const userDataResponse = await userResponse.json();
        const userData = userDataResponse.data?.user || userDataResponse;
        userId = userData.id || userData._id || userData.userId || '';
        userEmail = userData.email || '';
        mobile = userData.mobile || userData.phone || '';
        clientType = userData.clientType || 'B2C';
      } catch (error) {
        console.warn('Could not fetch user data:', error);
      }

      if (!userId) {
        userId = uuidv4();
        console.log('🆔 Generated UUID for userId:', userId);
      }

      if (!userEmail) {
        try {
          const contactDetailsStr = sessionStorage.getItem('currentContactDetails');
          if (contactDetailsStr) {
            const contactDetails = JSON.parse(contactDetailsStr);
            userEmail = contactDetails?.email || contactDetails?.contactEmail || '';
            mobile = mobile || contactDetails?.phone || contactDetails?.mobile || '';
          }
        } catch (error) {
          console.warn('Could not get email from contact details:', error);
        }
      }

      if (!userEmail) {
        try {
          const travelerInfoStr = sessionStorage.getItem('travelerInfo');
          if (travelerInfoStr) {
            const travelerInfoData = JSON.parse(travelerInfoStr);
            userEmail = travelerInfoData?.email || travelerInfoData?.contactEmail || '';
            mobile = mobile || travelerInfoData?.phone || travelerInfoData?.mobile || '';
          }
        } catch (error) {
          console.warn('Could not get email from traveler info:', error);
        }
      }

      if (!userEmail) {
        userEmail = `user_${userId.substring(0, 8)}@temp.klar.com`;
        console.log('📧 Generated fallback email:', userEmail);
      }

      if (!mobile) {
        mobile = '9999999999';
        console.log('📱 Generated fallback mobile:', mobile);
      }

      const orderPayload = {
        userId: userId,
        userEmail: userEmail,
        mobile: mobile,
        clientType: clientType.toUpperCase(),
        amount: totalAmount.total,
        currency: 'INR',
        bookingId: finalBookingId
      };

      console.log('Creating Razorpay order with payload:', orderPayload);

      const orderResponse = await createRazorpayOrder(orderPayload);

      if (!orderResponse?.success || !orderResponse?.data) {
        throw new Error(orderResponse?.message || 'Failed to create payment order');
      }

      const { razorpayOrderId, razorpayKeyId, order } = orderResponse.data;

      sessionStorage.setItem('razorpayOrderId', razorpayOrderId);
      sessionStorage.setItem('razorpayOrderDetails', JSON.stringify(order));

      if (!(window as any).Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const options = {
        key: razorpayKeyId,
        amount: Math.round(totalAmount.total * 100),
        currency: 'INR',
        name: 'Klar',
        description: `Booking Payment - ${finalBookingId}`,
        order_id: razorpayOrderId,
        handler: async (response: any) => {
          try {
            console.log('Razorpay payment response:', response);

            const verifyResult = await verifyRazorpayPayment({
              orderId: order.orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });

            console.log('Payment verification result:', verifyResult);

            if (verifyResult?.success && verifyResult?.data) {
              const paymentData = verifyResult.data;
              const razorpayOrderIdFromPayment = paymentData?.razorpayOrderId || razorpayOrderId;
              const razorpayPaymentId = paymentData?.razorpayPaymentId || response.razorpay_payment_id;

              console.log('Payment verified successfully. Razorpay Order ID:', razorpayOrderIdFromPayment);
              console.log('Razorpay Payment ID:', razorpayPaymentId);

              const storedBookingData = JSON.parse(sessionStorage.getItem('tempBookingData') || '{}');

              const confirmPayload = {
                bookingId: storedBookingData.bookingId || finalBookingId,
                travellers: storedBookingData.travellers || travellers,
                tripjackPrice: storedBookingData.tripjackPrice || tripjackPrice,
                markupPrice: storedBookingData.markupPrice || totalAmount.markup || 0,
                totalPrice: storedBookingData.totalPrice || totalAmount.total || 0,
                orderId: razorpayOrderIdFromPayment,
                source: 'b2c',
                ...(storedBookingData.gstInfo && { gstInfo: storedBookingData.gstInfo }),
              };

              console.log('Calling updateAndBook with payload:', confirmPayload);
              const bookingResponse = await updateAndBook(confirmPayload as any);

              if (!bookingResponse?.success) {
                console.error('Booking creation failed:', bookingResponse);
                setBookingError('Payment successful but booking creation failed. Please contact support with your payment reference.');
                setIsLoading(false);
                return;
              }

              console.log('Booking created successfully:', bookingResponse);

              sessionStorage.setItem('seatSelection', JSON.stringify({
                seats: selectedSeats,
                meals: selectedMeals,
                baggage: selectedBaggage,
                seatPrices: selectedSeatPrices,
                totalAmount: totalAmount.total,
                selectedSeatsPerTravelerPerSegment,
                selectedMealsPerTravelerPerSegment,
                selectedBaggagePerTravelerPerSegment,
                holdBooking: false,
                razorpayOrderId: razorpayOrderIdFromPayment,
                razorpayPaymentId: razorpayPaymentId
              }));

              sessionStorage.removeItem('tempBookingData');
              sessionStorage.removeItem('razorpayOrderId');
              sessionStorage.removeItem('razorpayOrderDetails');

              if (onContinue) {
                onContinue();
              } else {
                navigate('/booking-confirmation', {
                  state: {
                    bookingResponse: bookingResponse,
                    bookingId: finalBookingId,
                    totalAmount: totalAmount.total,
                    selectedSeats: selectedSeats,
                    selectedMeals: selectedMeals,
                    selectedBaggage: selectedBaggage,
                    selectedSeatPrices: selectedSeatPrices,
                    markupPrice: totalAmount.markup || 0,
                    selectedSeatsPerTravelerPerSegment: selectedSeatsPerTravelerPerSegment,
                    selectedMealsPerTravelerPerSegment: selectedMealsPerTravelerPerSegment,
                    selectedBaggagePerTravelerPerSegment: selectedBaggagePerTravelerPerSegment,
                    holdBooking: false,
                    paymentData: paymentData,
                    razorpayOrderId: razorpayOrderIdFromPayment,
                    razorpayPaymentId: razorpayPaymentId,
                    gstInfo: storedBookingData.gstInfo 
                  }
                });
              }
            } else {
              const errorMsg = verifyResult?.message || 'Payment verification failed';
              console.error('Payment verification failed:', errorMsg);
              setBookingError(errorMsg);
            }
          } catch (error: any) {
            console.error('Verification error:', error);
            setBookingError(error.message || 'Payment verification failed. Please contact support.');
          } finally {
            setIsLoading(false);
          }
        },
        theme: {
          color: '#FF5A5F'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed by user');
            setBookingError('Payment was cancelled.');
            sessionStorage.removeItem('tempBookingData');
            sessionStorage.removeItem('razorpayOrderId');
            sessionStorage.removeItem('razorpayOrderDetails');
            setIsLoading(false);
          }
        }
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('Payment flow failed:', error);

      let errorMessage = 'Unable to process payment. Please try again.';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Network connection issue. Please check your internet and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setBookingError(errorMessage);
      setIsLoading(false);
    }
  };

  const totalAmount = calculateTotalAmount();

  const getFlightInfoBySegmentId = (segmentId: string) => {
    try {
      const priceData = JSON.parse(sessionStorage.getItem('priceAvailabilityResponse') || '{}');
      const flight = priceData?.data?.flights?.find((f: any) => f.segmentId === segmentId);
      if (flight) {
        return {
          flightNumber: flight.flightNumber || 'N/A',
          departure: flight.departure?.airportCode || flight.departure || 'N/A',
          arrival: flight.arrival?.airportCode || flight.arrival || 'N/A',
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting flight info:', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && <Loader />}

      <MainNavbar activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />

      <div className="mt-20">
        <ProgressSteps steps={steps} currentStep={currentStep} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Review & Confirm Booking</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            {flightSegments.length > 0 && (
              <div className="mb-6">
                <TravellerInfoCard
                  flightSegments={flightSegments}
                  tripType={tripType}
                  passengerCount={passengerCount}
                  onContinue={() => { }}
                />
              </div>
            )}

            <TravelerAndContactDetails
              travelerDetails={travelerDetails}
              travelerCount={travelerCount}
              contactDetails={contactDetails}
              gstInfo={gstInfo}
              emergencyContact={emergencyContact}
              allTravellerDetails={allTravellerDetails}
            />

            <SelectedAddonsSection
              selectedSeats={selectedSeats}
              selectedSeatsPerTravelerPerSegment={selectedSeatsPerTravelerPerSegment}
              selectedSeatPrices={selectedSeatPrices}
              selectedMeals={selectedMeals}
              selectedMealsPerTravelerPerSegment={selectedMealsPerTravelerPerSegment}
              mealOptions={mealOptions}
              selectedBaggage={selectedBaggage}
              selectedBaggagePerTravelerPerSegment={selectedBaggagePerTravelerPerSegment}
              baggageOptions={baggageOptions}
            />
          </div>

          <div className="w-full lg:w-96">
            <PriceSummarySection
              timeLeft={timeLeft}
              formatTime={formatTime}
              reviewData={reviewData}
              selectedSeatPrices={selectedSeatPrices}
              selectedMealsPerTravelerPerSegment={selectedMealsPerTravelerPerSegment}
              selectedBaggagePerTravelerPerSegment={selectedBaggagePerTravelerPerSegment}
              makedPrice={makedPrice}
              setMakedPrice={setMakedPrice}
              bookingError={bookingError}
              isProcessing={isLoading}
              handleContinue={handleConfirmBooking}
              getFlightInfoBySegmentId={getFlightInfoBySegmentId}
              walletData={walletData}
              holdBooking={holdBooking}
              setHoldBooking={setHoldBooking}
              isConfirmationPage={true}
              totalAmount={totalAmount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}