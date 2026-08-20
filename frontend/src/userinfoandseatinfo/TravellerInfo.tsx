import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ProgressSteps from './TravellerInfo/ProgressSteps';
import TimerBanner from './TravellerInfo/TimerBanner';
import TravellerFormCard from './TravellerInfo/TravellerFormCard';
import ContactDetailsForm from './TravellerInfo/ContactDetailsForm';
import ActionButtons from './TravellerInfo/ActionButtons';
import Loader from './TravellerInfo/Loader';
import GSTInfoForm from './TravellerInfo/GSTInfoForm';
import EmergencyContactForm from './TravellerInfo/EmergencyContactForm';
import { initLocalBooking } from '@/api/flightService.api';
import TravellerInfoCard from './TravellerInfo/TravellerInfoCard';
import PriceInfoCard from './TravellerInfo/PriceInfoCard';
import MainNavbar from '@/components/layout/Navbar/MainNavbar';
import { notifyError } from '@/utils/notify';
import { flightSearchRoute, normalizeTripType, storedTripType } from '@/utils/tripType';
import { readReviewData } from '@/utils/reviewSession';
import { cabinBaggageOf, refundableLabelFromType } from '@/features/flights/utils/flightDisplay';


interface TravellerInfoProps {
  onBack?: () => void;
  onContinue?: () => void;
}

interface TravelerFormData {
  type: 'ADULT' | 'CHILD' | 'INFANT';
  title: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  passportNumber?: string;
  passportNationality?: string;
  passportIssueDate?: string;
  passportExpiryDate?: string;
}

interface GSTInfo {
  gstNumber: string;
  registeredName: string;
  email: string;
  mobile: string;
  address: string;
}

interface EmergencyContact {
  name: string;
  email: string;
  phone: string;
}

interface DateRange {
  min: string;
  max: string;
}

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
  airlineCode?: string;
  flightNumber: string;
  refundableType?: number;
  refundableLabel?: string;
  cabinClass?: string;
  fareName?: string;
  mealIncluded?: boolean;
  aircraft?: string[];
  departureISO?: string;
  arrivalISO?: string;
  departureTerminal?: string;
  arrivalTerminal?: string;
  originCityCode?: string;
  destinationCityCode?: string;
  originCountry?: string;
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

export default function TravellerInfo({ onContinue }: TravellerInfoProps) {
  const navigate = useNavigate();
  const [activeTab] = useState('flights');
  const [currentStep] = useState(2);
  const [travelerCounts, setTravelerCounts] = useState({ ADULT: 1, CHILD: 0, INFANT: 0 });
  const [flightDetailsRouting, setFlightDetails] = useState(null);
  const [fareRuleData, setFareRuleData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [travelers, setTravelers] = useState<TravelerFormData[]>([]);
  const [currentTravelerIndex, setCurrentTravelerIndex] = useState(0);
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [nameErrors, setNameErrors] = useState<{ [key: string]: string }>({});
  const [hasTimerExpired, setHasTimerExpired] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [flightSegments, setFlightSegments] = useState<FlightSegment[]>([]);
  const [tripType, setTripType] = useState<string>('oneway');
  const [isDataRestored, setIsDataRestored] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  // The supplier's `conditions` block from the Review response: what the Book
  // request must carry (passport, DOB per pax type, GST) and the session length.
  const [conditions, setConditions] = useState<any>(null);

  const [gstInfo, setGstInfo] = useState<GSTInfo>({
    gstNumber: '',
    registeredName: '',
    email: '',
    mobile: '',
    address: '',
  });
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: '',
    email: '',
    phone: '',
  });
  const [showGST, setShowGST] = useState(false);
  const [bookingId, setBookingId] = useState('');

  const hasInitialized = useRef(false);

  // ADD THIS ENTIRE BLOCK HERE:
  const autoFillTravellerDetails = () => {
    // Auto-fill contact details
    setEmail('test@example.com');
    setCountryCode('+91');
    setMobileNumber('9876543210');

    // Auto-fill traveler details
    const updatedTravelers = travelers.map((traveler, index) => {
      const baseName = traveler.type === 'ADULT' ? 'John' :
        traveler.type === 'CHILD' ? 'Sam' : 'Baby';
      const lastName = traveler.type === 'ADULT' ? 'Doe' :
        traveler.type === 'CHILD' ? 'Smith' : 'Doe';

      let dob = '';
      const today = new Date();
      if (traveler.type === 'ADULT') {
        const date = new Date(today);
        date.setFullYear(today.getFullYear() - 30);
        dob = date.toISOString().split('T')[0] || '';
      } else if (traveler.type === 'CHILD') {
        const date = new Date(today);
        date.setFullYear(today.getFullYear() - 8);
        dob = date.toISOString().split('T')[0] || '';
      } else if (traveler.type === 'INFANT') {
        const date = new Date(today);
        date.setFullYear(today.getFullYear() - 1);
        dob = date.toISOString().split('T')[0] || '';
      }

      // Letter suffix, not a digit: the backend (rightly) rejects digits in names.
      const suffix = String.fromCharCode(65 + (index % 26));
      return {
        ...traveler,
        title: traveler.type === 'ADULT' ? 'Mr' : 'Master',
        firstName: `${baseName}${suffix}`,
        lastName: `${lastName}${suffix}`,
        dateOfBirth: dob,
        passportNumber: `PASS${String(1000 + index).padStart(4, '0')}`,
        passportNationality: 'IN',
        passportIssueDate: '2020-01-01',
        passportExpiryDate: '2030-01-01',
      };
    });

    setTravelers(updatedTravelers);

    if (showGST) {
      setGstInfo({
        gstNumber: '22AAAAA0000A1Z5',
        registeredName: 'TEST BUSINESS PVT LTD',
        email: 'gst@example.com',
        mobile: '9876543210',
        address: '123 Test Street, Mumbai, Maharashtra, India',
      });
    }

    setEmergencyContact({
      name: 'EMERGENCY CONTACT',
      email: 'emergency@example.com',
      phone: '9876543211',
    });

    setNameErrors({});
  };

  const isDevelopment = import.meta.env.VITE_ENVIRONMENT === 'development';

  /**
   * Booking requirements as the supplier stated them at Review. When the
   * conditions block is absent (old sessions), keep the stricter historical
   * behaviour rather than guessing leniency.
   */
  const passportRequired = conditions?.ipa === true;
  const dobRequiredFor = (type: 'ADULT' | 'CHILD' | 'INFANT'): boolean => {
    const dob = conditions?.dob;
    if (!dob) return true;
    return type === 'ADULT' ? !!dob.adobr : type === 'CHILD' ? !!dob.cdobr : !!dob.idobr;
  };
  const nameLimits = {
    first: conditions?.anlm?.fN || 32,
    last: conditions?.anlm?.lN || 32,
  };
  const gstApplicable = conditions?.gst?.gstappl !== false;
  const gstMandatory = conditions?.gst?.igm === true;

  useEffect(() => {
    if (gstMandatory) setShowGST(true);
  }, [gstMandatory]);

  const getDateRangeForType = (type: 'ADULT' | 'CHILD' | 'INFANT'): DateRange => {
    const today = new Date();
    const formatDate = (date: Date): string => date.toISOString().split('T')[0] as string;

    switch (type) {
      case 'ADULT':
        const maxDate = new Date(today);
        maxDate.setFullYear(today.getFullYear() - 12);
        return { max: formatDate(maxDate), min: '1900-01-01' };
      case 'CHILD':
        const childMaxDate = new Date(today);
        childMaxDate.setFullYear(today.getFullYear() - 2);
        childMaxDate.setDate(childMaxDate.getDate() + 1);
        const childMinDate = new Date(today);
        childMinDate.setFullYear(today.getFullYear() - 12);
        return { max: formatDate(childMaxDate), min: formatDate(childMinDate) };
      case 'INFANT':
        const infantMinDate = new Date(today);
        infantMinDate.setFullYear(today.getFullYear() - 2);
        return { max: formatDate(today), min: formatDate(infantMinDate) };
      default:
        return { max: formatDate(today), min: '1900-01-01' };
    }
  };

  const isDateValidForType = (dateStr: string, type: 'ADULT' | 'CHILD' | 'INFANT'): boolean => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    date.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    const dayDiff = today.getDate() - date.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;

    switch (type) {
      case 'ADULT':
        return age >= 12;
      case 'CHILD':
        return age >= 2 && age < 12;
      case 'INFANT':
        return age >= 0 && age < 2;
      default:
        return false;
    }
  };

  const validateNameInput = (value: string, field: string): string => {
    let cleaned = value.replace(/[^a-zA-Z.\s]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/^\s+/, '');
    if (field === 'lastName') cleaned = cleaned.replace(/\s/g, '');
    return cleaned;
  };

  const getFlightDetails = () => {
    const flightSearchParams = sessionStorage.getItem('flightSearchParams');
    const fullFlightDetails = sessionStorage.getItem('fullFlightDetails');
    const selectedFareIndex = sessionStorage.getItem('selectedFareIndex') || '0';

    let from = '', to = '', departureDate = '';

    if (flightSearchParams) {
      try {
        const searchParams = JSON.parse(flightSearchParams);
        if (searchParams.from) {
          const fromMatch = searchParams.from.match(/\(([^)]+)\)/);
          from = fromMatch ? fromMatch[1] : searchParams.from.split(',')[0];
        }
        if (searchParams.to) {
          const toMatch = searchParams.to.match(/\(([^)]+)\)/);
          to = toMatch ? toMatch[1] : searchParams.to.split(',')[0];
        }
        departureDate = searchParams.departureDate || departureDate;
      } catch (error) {
        console.error('Error parsing flightSearchParams:', error);
      }
    }

    if (fullFlightDetails) {
      try {
        const parsedData = JSON.parse(fullFlightDetails);
        const flightData = parsedData.data;
        const selectedFare = flightData.fareOptions[parseInt(selectedFareIndex)];
        const baggageInfo = selectedFare?.bI || { cB: '7 Kg', iB: '15 kg' };
        const firstSegment = flightData.tripInfo?.sI?.[0];
        const lastSegment = flightData.tripInfo?.sI?.[flightData.tripInfo.sI.length - 1];

        const formatDate = (dateTimeStr: string) => {
          if (!dateTimeStr) return departureDate;
          const date = new Date(dateTimeStr);
          return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        };

        const formatTime = (dateTimeStr: string) => {
          if (!dateTimeStr) return '';
          const date = new Date(dateTimeStr);
          return date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        };

        const totalDuration = flightData.totalDuration || 290;
        const hours = Math.floor(totalDuration / 60);
        const minutes = totalDuration % 60;
        const totalStops = flightData.totalStops || 0;

        return {
          airline: flightData.airlines?.[0]?.name || 'Air India',
          flightNumber: flightData.flightNumbers?.join(', ') || 'AI-640',
          from: firstSegment?.da?.cityCode || from,
          to: lastSegment?.aa?.cityCode || to,
          departureDate: formatDate(firstSegment?.dt),
          departureTime: formatTime(firstSegment?.dt),
          arrivalDate: formatDate(lastSegment?.at),
          arrivalTime: formatTime(lastSegment?.at),
          duration: `${hours}h ${minutes}m`,
          stops:
            totalStops === 0 ? 'Non-stop' : totalStops === 1 ? '1 Stop' : `${totalStops} Stops`,
          baggage: { cabin: baggageInfo.cB || '7 Kg', checkin: baggageInfo.iB || '15 kg' },
        };
      } catch (error) {
        console.error('Error parsing fullFlightDetails:', error);
      }
    }

    return {
      airline: 'Air India',
      flightNumber: 'AI-640',
      from,
      to,
      departureDate,
      departureTime: '06:00 PM',
      arrivalDate: departureDate,
      arrivalTime: '01:10 AM',
      duration: '4h 50m',
      stops: '1 Stop',
      baggage: { cabin: '7 Kg', checkin: '15 kg' },
    };
  };


  const steps = [
    { id: 1, name: 'Flights' },
    { id: 2, name: 'Traveller Information' },
    { id: 3, name: 'Seat & Meal' },
    { id: 4, name: 'Payment method' },
    { id: 5, name: 'Booking Confirmed' },
  ];

  const extractPriceDetails = (data: any) => {
    try {
      const mappedData = data?.data?.mappedData || data?.mappedData || data;

      if (!mappedData) {
        console.log('No mappedData found');
        return null;
      }

      const totalPriceInfo = mappedData.totalPriceInfo;
      let fareComponents: any = {};
      let additionalFareComponents: any = {};

      if (totalPriceInfo?.totalFareDetail) {
        fareComponents = totalPriceInfo.totalFareDetail.FareComponents || {};
        additionalFareComponents = totalPriceInfo.totalFareDetail.AdditionalFareComponents?.TotalAdditionalFare || {};
      }

      if (!totalPriceInfo && mappedData.TripInformation?.[0]?.TotalPriceList?.[0]?.FareDetails?.AdultFare) {
        const adultFare = mappedData.TripInformation[0].TotalPriceList[0].FareDetails.AdultFare;
        fareComponents = adultFare.FareComponents || {};
        additionalFareComponents = adultFare.AdditionalFareComponents?.TotalAdditionalFare || {};
      }

      const baseFare = fareComponents?.BaseFare || 0;
      const totalFare = fareComponents?.TotalFare || 0;

      const airlineGSTComponent = additionalFareComponents?.AirlineGSTComponent || 0;
      const fuelSurcharge = additionalFareComponents?.FuelSurcharge || 0;
      const otherTaxes = additionalFareComponents?.OtherTaxes || 0;
      const managementFee = additionalFareComponents?.ManagementFee || 0;
      const managementFeeTax = additionalFareComponents?.ManagementFeeTax || 0;

      const paxInfo = mappedData?.searchQuery?.paxInfo || {};
      const adultCount = paxInfo?.AdultFare || 1;
      const childCount = paxInfo?.ChildFare || 0;
      const infantCount = paxInfo?.INFANT || 0;

      // One fare per pax type SUMMED ACROSS TRIPS: on return/multicity each
      // trip prices its own fare, and showing only trip 1's beside the
      // combined total made the breakdown disagree with the amount charged.
      const TAX_KEYS = [
        'AirlineGSTComponent',
        'FuelSurcharge',
        'OtherTaxes',
        'ManagementFee',
        'ManagementFeeTax',
      ] as const;
      const summedFare = (type: 'AdultFare' | 'ChildFare' | 'INFANT') => {
        let found = false;
        const fc = { BaseFare: 0, TotalFare: 0 };
        const taxes: Record<string, number> = {};
        (mappedData.TripInformation || []).forEach((trip: any) => {
          const fare = trip?.TotalPriceList?.[0]?.FareDetails?.[type];
          if (!fare) return;
          found = true;
          fc.BaseFare += fare.FareComponents?.BaseFare || 0;
          fc.TotalFare += fare.FareComponents?.TotalFare || 0;
          TAX_KEYS.forEach((k) => {
            taxes[k] =
              (taxes[k] || 0) +
              (fare.AdditionalFareComponents?.TotalAdditionalFare?.[k] || 0);
          });
        });
        return found
          ? { FareComponents: fc, AdditionalFareComponents: { TotalAdditionalFare: taxes } }
          : undefined;
      };

      const priceDetails = {
        baseFare: baseFare,
        airlineGSTComponent: airlineGSTComponent,
        fuelSurcharge: fuelSurcharge,
        otherTaxes: otherTaxes,
        managementFee: managementFee,
        managementFeeTax: managementFeeTax,
        totalFare: totalFare,
        addOnsTotal: 0,
        totalAmount: totalFare,
        adultFare: summedFare('AdultFare'),
        childFare: summedFare('ChildFare'),
        infantFare: summedFare('INFANT'),

        adultCount: adultCount,
        childCount: childCount,
        infantCount: infantCount
      };

      console.log('💰 Extracted price details:', priceDetails);
      return priceDetails;
    } catch (error) {
      console.error('Error extracting price details:', error);
      return null;
    }
  };

  const extractFlightDetailsFromOnewayReview = (
    data: any,
    tripIndex: number = 0,
    segmentIndex: number = 0,
  ) => {
    try {
      const mappedData = data?.data?.mappedData || data?.mappedData || data;
      const tripInfo = mappedData?.TripInformation?.[tripIndex];
      if (!tripInfo) {
        return null;
      }

      const segmentInfo = tripInfo?.SegmentInformation?.[segmentIndex];
      if (!segmentInfo) {
        return null;
      }

      const departureAirport = segmentInfo.DepartureAirport;
      const arrivalAirport = segmentInfo.ArrivalAirport;
      const flightDetailsData = segmentInfo.FlightDetails;
      const departureTime = segmentInfo.DepartureTime;
      const arrivalTime = segmentInfo.ArrivalTime;
      const duration = segmentInfo.Duration;
      const paxInfo = mappedData?.searchQuery?.paxInfo || data?.searchQuery?.paxInfo;

      const totalPriceList = tripInfo?.TotalPriceList;
      const fareDetails = totalPriceList?.[0]?.FareDetails?.AdultFare;
      const baggage = fareDetails?.BaggageInfo || {};

      const fareComponents: any = fareDetails?.FareComponents || {};
      const additionalFareComponents: any = fareDetails?.AdditionalFareComponents?.TotalAdditionalFare || {};

      const baseFare = fareComponents?.BaseFare || 0;
      const totalFare = fareComponents?.TotalFare || 0;
      const totalAdditionalFare = fareComponents?.TotalAdditionalFare || 0;

      const airlineGSTComponent = additionalFareComponents?.AirlineGSTComponent || 0;
      const fuelSurcharge = additionalFareComponents?.FuelSurcharge || 0;
      const otherTaxes = additionalFareComponents?.OtherTaxes || 0;
      const managementFee = additionalFareComponents?.ManagementFee || 0;
      const managementFeeTax = additionalFareComponents?.ManagementFeeTax || 0;

      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const formattedDuration = `${hours}h ${minutes}m`;

      const formatDateTime = (dateTimeStr: string) => {
        if (!dateTimeStr) return { date: '', time: '' };
        const date = new Date(dateTimeStr);
        return {
          date: date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          time: date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        };
      };

      const formatDateFull = (dateTimeStr: string) => {
        if (!dateTimeStr) return '';
        const date = new Date(dateTimeStr);
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      };

      const departure = formatDateTime(departureTime);
      const arrival = formatDateTime(arrivalTime);

      const refundableType = fareDetails?.RefundableType;

      let checkInBaggage = baggage.CheckInBaggage || '';
      if (checkInBaggage) {
        checkInBaggage = checkInBaggage.replace('Kilograms', 'Kg').trim();
      }

      return {
        origin: departureAirport?.city || '',
        destination: arrivalAirport?.city || '',
        originAirport: departureAirport?.AirlineName || '',
        destinationAirport: arrivalAirport?.AirlineName || '',
        departureDate: departure.date || '',
        departureTime: departure.time || '',
        arrivalDate: formatDateFull(arrivalTime),
        arrivalTime: arrival.time || '',
        duration: formattedDuration,
        stops: segmentInfo.NumberOfStops || 0,
        airline: flightDetailsData?.AirlineInfo?.AirlineName || '',
        airlineCode: flightDetailsData?.AirlineInfo?.AirlineCode || '',
        flightNumber: flightDetailsData?.FlightNumber || '',
        refundableType: refundableType,
        refundableLabel: refundableLabelFromType(refundableType),
        cabinClass: fareDetails?.CabinClass || '',
        fareName: totalPriceList?.[0]?.FareIdentifierType || '',
        mealIncluded: fareDetails?.MealIncluded === true,
        aircraft: Array.isArray(segmentInfo.ac)
          ? segmentInfo.ac
          : segmentInfo.ac
            ? [segmentInfo.ac]
            : [],
        departureISO: departureTime || '',
        arrivalISO: arrivalTime || '',
        departureTerminal: departureAirport?.terminal || '',
        arrivalTerminal: arrivalAirport?.terminal || '',
        originCityCode: departureAirport?.AirportCode || departureAirport?.cityCode || '',
        destinationCityCode: arrivalAirport?.AirportCode || arrivalAirport?.cityCode || '',
        originCountry: departureAirport?.country || '',
        baggage: {
          checkIn: checkInBaggage || '',
          // CabinBaggage is the corrected name; ClassCode is the legacy alias.
          cabin: cabinBaggageOf(baggage),
        },
        passengerCount: (paxInfo?.AdultFare || 0) + (paxInfo?.ChildFare || 0) + (paxInfo?.INFANT || 0),
        adultCount: paxInfo?.AdultFare || 0,
        childCount: paxInfo?.ChildFare || 0,
        infantCount: paxInfo?.INFANT || 0,
        priceDetails: {
          baseFare: baseFare,
          airlineGSTComponent: airlineGSTComponent,
          fuelSurcharge: fuelSurcharge,
          otherTaxes: otherTaxes,
          managementFee: managementFee,
          managementFeeTax: managementFeeTax,
          totalFare: totalFare,
          addOnsTotal: 0,
          totalAmount: totalFare
        },
      };
    } catch (error) {
      console.error('Error extracting flight details from onewayReviewData:', error);
      return null;
    }
  };

  const initializeTravelers = (counts: { ADULT: number; CHILD: number; INFANT: number }) => {
    const initialTravelers: TravelerFormData[] = [];
    for (let i = 0; i < counts.ADULT; i++) {
      initialTravelers.push({
        type: 'ADULT',
        title: 'Mr',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        passportNationality: '',
        passportIssueDate: '',
        passportExpiryDate: '',
      });
    }
    for (let i = 0; i < counts.CHILD; i++) {
      initialTravelers.push({
        type: 'CHILD',
        title: 'Master',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        passportNationality: '',
        passportIssueDate: '',
        passportExpiryDate: '',
      });
    }
    for (let i = 0; i < counts.INFANT; i++) {
      initialTravelers.push({
        type: 'INFANT',
        title: 'Master',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        passportNumber: '',
        passportNationality: '',
        passportIssueDate: '',
        passportExpiryDate: '',
      });
    }
    setTravelers(initialTravelers);
    setIsInitialized(true);
  };

  useEffect(() => {
    if (isDataRestored && travelers.length > 0 && email) {
      console.log('✅ Data restored successfully:', {
        travelerCount: travelers.length,
        travelers: travelers,
        email,
        mobileNumber,
        hasGST: showGST,
        hasEmergency: !!emergencyContact.name
      });
    }
  }, [isDataRestored, travelers, email, mobileNumber, showGST, emergencyContact]);

  useEffect(() => {
    const parsedData = readReviewData();
    const tripTypeFromStorage = storedTripType();

    if (parsedData) {
      try {
        console.log('📦 onewayReviewData loaded:', parsedData);

        const extractedPriceDetails = extractPriceDetails(parsedData);
        if (extractedPriceDetails) {
          console.log('💰 Setting price details:', extractedPriceDetails);
          setPriceDetails(extractedPriceDetails);
        }

        const mappedData = parsedData?.data?.mappedData || parsedData?.mappedData || parsedData;
        const tripInfoArray = mappedData?.TripInformation || [];

        setConditions(parsedData?.conditions ?? mappedData?.conditions ?? null);

        const searchType = normalizeTripType(mappedData?.searchQuery?.searchType || tripTypeFromStorage);

        let allSegments: FlightSegment[] = [];

        tripInfoArray.forEach((trip: any, tripIndex: number) => {
          const segmentInfoArray = trip?.SegmentInformation || [];

          segmentInfoArray.forEach((segment: any, segmentIndex: number) => {
            const extractedData = extractFlightDetailsFromOnewayReview(
              parsedData,
              tripIndex,
              segmentIndex,
            );

            if (extractedData) {
              let segmentType: 'outbound' | 'return' | 'multicity' = 'multicity';

              if (searchType === 'return') {
                segmentType = tripIndex === 0 ? 'outbound' : 'return';
              } else if (searchType === 'multicity') {
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

        let finalTripType = 'oneway';
        if (searchType === 'return') {
          finalTripType = 'roundtrip';
        } else if (searchType === 'multicity') {
          finalTripType = 'multicity';
        }

        setTripType(finalTripType);
        setFlightSegments(allSegments);
        console.log('✈️ Flight segments extracted:', allSegments.length);
      } catch (error) {
        console.error('Error parsing onewayReviewData:', error);
      }
    }
  }, []);

  useEffect(() => {
    const parsedReviewData = readReviewData();
    if (parsedReviewData) {
      try {
        setReviewData(parsedReviewData);
      } catch (error) {
        console.error('Error parsing review data:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      setHasTimerExpired(true);
      sessionStorage.removeItem('travelerInfo');
      sessionStorage.removeItem('currentBooking');
      sessionStorage.removeItem('currentTravelers');
      sessionStorage.removeItem('currentContactDetails');
      sessionStorage.removeItem('travellerInfoValidated');
      navigate('/', { replace: true });
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, navigate]);

  useEffect(() => {
    const storedTimer = sessionStorage.getItem('bookingTimer');
    const timerStartTime = sessionStorage.getItem('timerStartTime');

    if (storedTimer && timerStartTime) {
      const elapsedSeconds = Math.floor((Date.now() - parseInt(timerStartTime)) / 1000);
      const remainingTime = Math.max(0, parseInt(storedTimer) - elapsedSeconds);
      if (remainingTime <= 0) {
        setTimeLeft(0);
        setHasTimerExpired(true);
        sessionStorage.removeItem('bookingTimer');
        sessionStorage.removeItem('timerStartTime');
        navigate('/', { replace: true });
      } else {
        setTimeLeft(remainingTime);
      }
    } else {
      // The supplier states the fare-session length in conditions.st (840s on
      // live UAT); the old hardcoded 15 min outlived the session by a minute.
      const review = readReviewData();
      const st = review?.conditions?.st ?? review?.mappedData?.conditions?.st;
      const sessionSeconds = typeof st === 'number' && st > 0 ? st : 15 * 60;
      setTimeLeft(sessionSeconds);
      sessionStorage.setItem('bookingTimer', sessionSeconds.toString());
      sessionStorage.setItem('timerStartTime', Date.now().toString());
    }
  }, [navigate]);

  useEffect(() => {
    if (timeLeft > 0) {
      sessionStorage.setItem('bookingTimer', timeLeft.toString());
      sessionStorage.setItem('timerStartTime', Date.now().toString());
    }
  }, [timeLeft]);

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    hasInitialized.current = true;

    const flightSearchParams = sessionStorage.getItem('flightSearchParams');
    let counts = { ADULT: 1, CHILD: 0, INFANT: 0 };

    if (flightSearchParams) {
      try {
        const parsedData = JSON.parse(flightSearchParams);
        if (parsedData.travelerDetails) {
          counts = {
            ADULT: parsedData.travelerDetails.adults || 1,
            CHILD: parsedData.travelerDetails.children || 0,
            INFANT: parsedData.travelerDetails.infants || 0,
          };
        } else if (parsedData.paxInfo) {
          counts = {
            ADULT: parseInt(parsedData.paxInfo.ADULT) || 1,
            CHILD: parseInt(parsedData.paxInfo.CHILD) || 0,
            INFANT: parseInt(parsedData.paxInfo.INFANT) || 0,
          };
        } else if (parsedData.travelers) {
          counts = {
            ADULT: parseInt(parsedData.travelers) || 1,
            CHILD: 0,
            INFANT: 0,
          };
        }
      } catch (error) {
        console.error('Error parsing flight search params:', error);
      }
    }

    const priceAvailabilityResponse = sessionStorage.getItem('priceAvailabilityResponse');
    if (priceAvailabilityResponse) {
      try {
        const parsedPriceResponse = JSON.parse(priceAvailabilityResponse);
        if (parsedPriceResponse.data?.passengerSummary) {
          counts = {
            ADULT: parsedPriceResponse.data.passengerSummary.adult || counts.ADULT,
            CHILD: parsedPriceResponse.data.passengerSummary.child || counts.CHILD,
            INFANT: parsedPriceResponse.data.passengerSummary.infant || counts.INFANT,
          };
        }
        if (parsedPriceResponse.data?.bookingId) {
          setBookingId(parsedPriceResponse.data.bookingId);
        }
      } catch (error) {
        console.error('Error parsing price availability response:', error);
      }
    }

    setTravelerCounts(counts);
    initializeTravelers(counts);

    const fullFlightDetails = sessionStorage.getItem('fullFlightDetails');
    if (fullFlightDetails) {
      try {
        const parsedFlightDetails = JSON.parse(fullFlightDetails);
        setFlightDetails(parsedFlightDetails);
      } catch (error) {
        console.error('Error parsing full flight details:', error);
      }
    }

    const fareRuleData = sessionStorage.getItem('fareRuleData');
    if (fareRuleData) {
      try {
        const parsedFareRule = JSON.parse(fareRuleData);
        setFareRuleData(parsedFareRule);
      } catch (error) {
        console.error('Error parsing fare rule data:', error);
      }
    }
  }, []);

  const updateTraveler = (index: number, field: keyof TravelerFormData, value: string) => {
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: value
    } as TravelerFormData;
    setTravelers(updatedTravelers);
  };

  const validatePassportDates = (issueDate: string, expiryDate: string): boolean => {
    if (!issueDate || !expiryDate) return true;
    const issue = new Date(issueDate);
    const expiry = new Date(expiryDate);
    return expiry > issue;
  };

  const goToNextTraveler = () => {
    if (currentTravelerIndex < travelers.length - 1) {
      setCurrentTravelerIndex(currentTravelerIndex + 1);
    }
  };

  const goToPreviousTraveler = () => {
    if (currentTravelerIndex > 0) {
      setCurrentTravelerIndex(currentTravelerIndex - 1);
    }
  };

  const goToTraveler = (index: number) => {
    setCurrentTravelerIndex(index);
  };

  const getPassengerLabel = (index: number, traveler: TravelerFormData) => {
    const typeMap = {
      'ADULT': 'Adult',
      'CHILD': 'Child',
      'INFANT': 'Infant'
    };
    return `${typeMap[traveler.type]} ${index + 1}`;
  };

  const handleContinue = async () => {
    if (timeLeft <= 0) {
      navigate('/', { replace: true });
      return;
    }

    let hasErrors = false;
    const newErrors: { [key: string]: string } = {};

    travelers.forEach((traveler, index) => {
      if (!traveler.firstName.trim()) {
        newErrors[`firstName_${index}`] = 'First name is required';
        hasErrors = true;
      } else if (traveler.firstName.length < 2) {
        newErrors[`firstName_${index}`] = 'First name must be at least 2 characters';
        hasErrors = true;
      }

      if (!traveler.lastName.trim()) {
        newErrors[`lastName_${index}`] = 'Last name is required';
        hasErrors = true;
      } else if (traveler.lastName.length < 2) {
        newErrors[`lastName_${index}`] = 'Last name must be at least 2 characters';
        hasErrors = true;
      }

      if (!traveler.dateOfBirth) {
        if (dobRequiredFor(traveler.type)) {
          newErrors[`dob_${index}`] = 'Date of birth is required';
          hasErrors = true;
        }
      } else if (!isDateValidForType(traveler.dateOfBirth, traveler.type)) {
        newErrors[`dob_${index}`] = `Invalid date of birth for ${traveler.type.toLowerCase()}`;
        hasErrors = true;
      }

      const hasAnyPassportField =
        passportRequired ||
        traveler.passportNumber || traveler.passportIssueDate || traveler.passportExpiryDate;

      if (hasAnyPassportField) {
        if (!traveler.passportNumber) {
          newErrors[`passport_${index}`] =
            'Passport number is required when filling passport details';
          hasErrors = true;
        } else if (traveler.passportNumber.length < 6 || traveler.passportNumber.length > 9) {
          newErrors[`passport_${index}`] = 'Passport number must be between 6-9 characters';
          hasErrors = true;
        }

        if (!traveler.passportIssueDate) {
          newErrors[`passport_issue_${index}`] = 'Passport issue date is required';
          hasErrors = true;
        }

        if (!traveler.passportExpiryDate) {
          newErrors[`passport_expiry_${index}`] = 'Passport expiry date is required';
          hasErrors = true;
        }

        if (traveler.passportIssueDate && traveler.passportExpiryDate) {
          if (!validatePassportDates(traveler.passportIssueDate, traveler.passportExpiryDate)) {
            newErrors[`passport_dates_${index}`] = 'Passport expiry date must be after issue date';
            hasErrors = true;
          }
        }
      }
    });

    if (!email) {
      newErrors['email'] = 'Email is required';
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors['email'] = 'Please enter a valid email address';
      hasErrors = true;
    }

    if (!mobileNumber) {
      newErrors['mobileNumber'] = 'Mobile number is required';
      hasErrors = true;
    } else if (!/^\d{10}$/.test(mobileNumber.replace(/\s/g, ''))) {
      newErrors['mobileNumber'] = 'Please enter a valid 10-digit mobile number';
      hasErrors = true;
    }

    const hasAnyEmergencyField =
      emergencyContact.name || emergencyContact.email || emergencyContact.phone;

    if (hasAnyEmergencyField) {
      if (emergencyContact.name && !emergencyContact.name.trim()) {
        newErrors['emergency_name'] = 'Emergency contact name is required if provided';
        hasErrors = true;
      }
      if (emergencyContact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContact.email)) {
        newErrors['emergency_email'] = 'Please enter a valid emergency contact email';
        hasErrors = true;
      }
      if (emergencyContact.phone && !/^\d{10}$/.test(emergencyContact.phone.replace(/\s/g, ''))) {
        newErrors['emergency_phone'] = 'Please enter a valid 10-digit emergency contact number';
        hasErrors = true;
      }
    }

    if (showGST) {
      // GST Number validation
      if (!gstInfo.gstNumber.trim()) {
        newErrors['gst_number'] = 'GST Number is required';
        hasErrors = true;
      } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstInfo.gstNumber)) {
        newErrors['gst_number'] = 'Please enter a valid GST number';
        hasErrors = true;
      }

      // Registered Name validation
      if (!gstInfo.registeredName.trim()) {
        newErrors['gst_name'] = 'Registered name is required';
        hasErrors = true;
      }

      // Email validation
      if (!gstInfo.email.trim()) {
        newErrors['gst_email'] = 'GST Email is required';
        hasErrors = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gstInfo.email)) {
        newErrors['gst_email'] = 'Please enter a valid email address';
        hasErrors = true;
      }

      // Mobile validation
      if (!gstInfo.mobile.trim()) {
        newErrors['gst_mobile'] = 'GST Mobile number is required';
        hasErrors = true;
      } else if (!/^\d{10}$/.test(gstInfo.mobile.replace(/\s/g, ''))) {
        newErrors['gst_mobile'] = 'Please enter a valid 10-digit mobile number';
        hasErrors = true;
      }

      // Address validation
      if (!gstInfo.address.trim()) {
        newErrors['gst_address'] = 'GST Address is required';
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setNameErrors(newErrors);
      const firstErrorField = Object.keys(newErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const getDepartureDate = (): string => {
      if (flightSegments && flightSegments.length > 0) {
        const firstSegment = flightSegments[0];
        if (firstSegment?.departureDate) {
          return firstSegment.departureDate;
        }
      }
      return '';
    };

    const storedBookingId = sessionStorage.getItem('bookingId');
    const finalBookingId = storedBookingId || bookingId;
    const departureDate = getDepartureDate();


    const payload = {
      bookingId: finalBookingId,
      email: email.trim().toLowerCase(),
      phone: `${countryCode}${mobileNumber.replace(/\s/g, '')}`,
      isHold: false,
      source: 'b2c',
      departureDate: departureDate,
      travellers: travelers.map((traveler) => {
        const hasPassportData =
          traveler.passportNumber || traveler.passportIssueDate || traveler.passportExpiryDate;

        return {
          title: traveler.title,
          paxType: traveler.type,
          firstName: traveler.firstName.trim(),
          lastName: traveler.lastName.trim(),
          ...(traveler.dateOfBirth && { dob: traveler.dateOfBirth }),
          ...(hasPassportData && {
            passportNumber: traveler.passportNumber?.toUpperCase(),
            passportNationality: traveler.passportNationality || 'IN',
            passportIssueDate: traveler.passportIssueDate,
            passportExpiryDate: traveler.passportExpiryDate,
          }),
          ssrSeatInfos: [],
          ssrMealInfos: [],
          ssrBaggageInfos: [],
        };
      }),
      ...(showGST &&
        gstInfo.gstNumber && {
        gstInfo: {
          gstNumber: gstInfo.gstNumber,
          registeredName: gstInfo.registeredName,
          ...(gstInfo.email && gstInfo.email.trim() !== '' && { email: gstInfo.email.trim() }),
          ...(gstInfo.mobile && gstInfo.mobile.trim() !== '' && {
            mobile: gstInfo.mobile.replace(/^\+91/, '').replace(/^0+/, '').replace(/\s/g, '')
          }),
          ...(gstInfo.address && gstInfo.address.trim() !== '' && {
            address: gstInfo.address.replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
          }),
        },
      }),
      emergencyContact: {
        name: emergencyContact.name || `${travelers[0]?.firstName} ${travelers[0]?.lastName}`,
        email: emergencyContact.email || email,
        phone: emergencyContact.phone || `${countryCode}${mobileNumber}`,
      },
    };

    const allTravellerDetails = {
      travellers: payload.travellers,
      contactDetails: {
        email: payload.email,
        phone: payload.phone,
        countryCode: countryCode,
      },
      gstInfo: payload.gstInfo || null,
      emergencyContact: payload.emergencyContact,
      totalPassengers: travelers.length,
      passengerCounts: {
        adult: travelerCounts.ADULT,
        child: travelerCounts.CHILD,
        infant: travelerCounts.INFANT,
      },
      timestamp: new Date().toISOString(),
      bookingId: finalBookingId,
      source: 'b2c',
    };

    sessionStorage.setItem('allTravellerDetails', JSON.stringify(allTravellerDetails));
    sessionStorage.setItem('bookingPayload', JSON.stringify(payload));
    sessionStorage.setItem('travelerInfo', JSON.stringify(payload.travellers));
    sessionStorage.setItem(
      'currentContactDetails',
      JSON.stringify({
        email: payload.email,
        phone: payload.phone,
      }),
    );
    sessionStorage.setItem('travellerInfoValidated', 'true');

    const currentPath = window.location.pathname;
    sessionStorage.setItem('redirectAfterLogin', currentPath);

    setIsLoading(true);

    try {
      const bookingResponse = await initLocalBooking(payload as any);

      if (bookingResponse.success && bookingResponse.data.travellers) {
        const travellerIds = bookingResponse.data.travellers.map((t: any) => t.travellerId);
        sessionStorage.setItem('travellerIds', JSON.stringify(travellerIds));
      }

      sessionStorage.setItem('bookingInitResponse', JSON.stringify(bookingResponse));

      const responseBookingId = bookingResponse.data?.bookingId || finalBookingId;
      if (responseBookingId) {
        sessionStorage.setItem('bookingId', responseBookingId);
        const updatedDetails = {
          ...allTravellerDetails,
          bookingId: responseBookingId,
        };
        sessionStorage.setItem('allTravellerDetails', JSON.stringify(updatedDetails));
      }

      sessionStorage.removeItem('bookingTimer');
      sessionStorage.removeItem('timerStartTime');

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onContinue) {
        onContinue();
      } else {
        navigate('/seat-selection', {
          state: {
            reviewData: reviewData,
            bookingId: responseBookingId,
            travelerInfo: payload.travellers,
            contactDetails: {
              email: payload.email,
              phone: payload.phone,
            },
          },
        });
      }
    } catch (error: any) {
      console.error('Error in handleContinue:', error);

      if (error.response?.status === 401) {
        notifyError('Your session has expired. Please login again.');
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token_raw');
        sessionStorage.removeItem('token_raw');

        navigate('/b2b', {
          state: {
            from: window.location.pathname,
            message: 'Your session has expired. Please login again.',
          },
        });
      } else {
        notifyError('An error occurred while processing your request. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isLoading && <Loader />}
      <MainNavbar activeService={activeTab as 'flights' | 'hotels' | 'visa' | 'insurance' | 'holiday' | 'cabs'} />
      <div className="mt-20">
        <ProgressSteps steps={steps} currentStep={currentStep} />
      </div>
      <TimerBanner timeLeft={timeLeft} formatTime={formatTime} />

      <div className="w-full max-w-[1800px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Fill Traveller Details</h2>
          {isDevelopment && (
            <button
              onClick={autoFillTravellerDetails}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Auto-fill Details
            </button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[70%]">
            {flightSegments && flightSegments.length > 0 && (
              <TravellerInfoCard
                flightSegments={flightSegments}
                tripType={tripType}
                passengerCount={{
                  adult: travelerCounts.ADULT,
                  child: travelerCounts.CHILD,
                  infant: travelerCounts.INFANT,
                  ADULT: travelerCounts.ADULT,
                  CHILD: travelerCounts.CHILD,
                  INFANT: travelerCounts.INFANT
                }}
                onContinue={() => { }}
              />
            )}

            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Traveller Information</h2>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
                  {travelers.map((traveler, index) => (
                    <button
                      key={index}
                      onClick={() => goToTraveler(index)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
                        ${currentTravelerIndex === index
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {getPassengerLabel(index, traveler)}
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  {travelers.length > 0 && travelers[currentTravelerIndex] ? (
                    <TravellerFormCard
                      key={currentTravelerIndex}
                      traveler={travelers[currentTravelerIndex]}
                      index={currentTravelerIndex}
                      travelers={travelers}
                      updateTraveler={updateTraveler}
                      getDateRangeForType={getDateRangeForType}
                      isDateValidForType={isDateValidForType}
                      validateNameInput={validateNameInput}
                      nameErrors={nameErrors}
                      setNameErrors={setNameErrors}
                      passportRequired={passportRequired}
                      dobRequired={dobRequiredFor(travelers[currentTravelerIndex]!.type)}
                      nameLimits={nameLimits}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">No travelers found</div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={goToPreviousTraveler}
                    disabled={currentTravelerIndex === 0}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${currentTravelerIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }
                    `}
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    {currentTravelerIndex + 1} of {travelers.length}
                  </span>
                  <button
                    onClick={goToNextTraveler}
                    disabled={currentTravelerIndex === travelers.length - 1}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${currentTravelerIndex === travelers.length - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                      }
                    `}
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <ContactDetailsForm
                  email={email}
                  setEmail={setEmail}
                  countryCode={countryCode}
                  setCountryCode={setCountryCode}
                  mobileNumber={mobileNumber}
                  setMobileNumber={setMobileNumber}
                  nameErrors={nameErrors}
                  setNameErrors={setNameErrors}
                />

                {gstApplicable && (
                  <GSTInfoForm
                    showGST={showGST}
                    setShowGST={setShowGST}
                    gstInfo={gstInfo}
                    setGstInfo={setGstInfo}
                    nameErrors={nameErrors}
                    setNameErrors={setNameErrors}
                  />
                )}

                <EmergencyContactForm
                  emergencyContact={emergencyContact}
                  setEmergencyContact={setEmergencyContact}
                  nameErrors={nameErrors}
                  setNameErrors={setNameErrors}
                />
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[30%] flex flex-col gap-4">
            <PriceInfoCard
              priceDetails={priceDetails}
              adultFare={priceDetails?.adultFare}
              childFare={priceDetails?.childFare}
              infantFare={priceDetails?.infantFare}
              adultCount={priceDetails?.adultCount || 1}
              childCount={priceDetails?.childCount || 0}
              infantCount={priceDetails?.infantCount || 0}
            />

            <ActionButtons
              onCancel={() => {
                navigate(flightSearchRoute(storedTripType()));
              }}
              onContinue={handleContinue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}