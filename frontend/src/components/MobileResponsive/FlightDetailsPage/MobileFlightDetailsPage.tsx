import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SectionCard from './SectionCard';
import MobileFlightHeader from './FlightHeader';
import MobileExtraBaggage from './ExtraBaggage';
import MobileSeatSelection from './MobileSeatSelection';
import MobileInflightMeals from './InflightMeals';
import MobileTravellerInfo, { validateEmergencyContact } from './MobileTravellerInfo';
import SeatLogo from '/logo/Seat.png?url';
import MobilePriceInformation from './MobilePriceInformation';
import { getSeatDetails, getMealsAndBaggages, initLocalBooking } from '@/api/flightService.api';
import { useAuth } from '@/features/authentication/hooks/useAuth';
import { ROUTES } from '@/routes/routes.config';
import { notifyError } from '@/utils/notify';
import { readReviewData } from '@/utils/reviewSession';

interface FlightDetailsPageProps {
  onBack?: () => void;
  onContinue?: () => void;
}

interface SSRItem {
  AirlineCode: string;
  amount: number;
  Description: string;
  iswca: boolean;
  isEmdResynced: boolean;
}

interface SegmentInfo {
  SegmentID: string;
  FlightDetails: any;
  DepartureAirport: any;
  ArrivalAirport: any;
  DepartureTime: string;
  ArrivalTime: string;
  Duration: number;
  IsRefundableSegment?: boolean;
  NumberOfStops?: number;
  TotalPriceList?: any[];
  ssrInfo?: {
    MEAL?: SSRItem[];
    BAGGAGE?: SSRItem[];
    FASTFORWARD?: SSRItem[];
  };
}

// Unwrapped review payload — the level readReviewData() returns.
interface ReviewData {
  sessionId: string;
    mappedData: {
      bookingId: string;
      TripInformation: Array<{
        SegmentInformation: SegmentInfo[];
        TotalPriceList: any[];
      }>;
      totalPriceInfo: {
        totalFareDetail: {
          FareComponents: {
            BaseFare: number;
            TotalFare: number;
            TotalAdditionalFare: number;
            NetFare: number;
          };
          AdditionalFareComponents: {
            TotalAdditionalFare: {
              AirlineGSTComponent: number;
              FuelSurcharge: number;
              ManagementFee: number;
              ManagementFeeTax: number;
              OtherTaxes: number;
            };
          };
        };
      };
      searchQuery?: {
        paxInfo?: {
          AdultFare: number;
        };
      };
    };
}

interface AncillaryItem {
  code: string;
  description: string;
  price: number;
  isWCAG?: boolean;
}

interface AncillarySegment {
  segments: Array<{
    segmentId: string;
    flightNumber: string;
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    meals: AncillaryItem[];
    baggage: AncillaryItem[];
  }>;
}

interface AncillaryResponse {
  success: boolean;
  data: AncillarySegment[];
}

interface SeatInfo {
  seatNo: string;
  seatPosition: { row: number; column: number };
  isBooked: boolean;
  isLegroom: boolean;
  isAisle: boolean;
  isExitRow?: boolean;
  AirlineCode: string;
  amount: number;
  isEmdResynced: boolean;
  iswca: boolean;
}

interface SeatSegmentData {
  sData: any;
  sInfo: SeatInfo[];
}

interface SeatResponse {
  success: boolean;
  data: {
    tripSeatMap: {
      tripSeat: {
        [segmentId: string]: SeatSegmentData;
      };
    };
    bookingId: string;
    status: {
      success: boolean;
      httpStatus: number;
    };
  };
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

interface SelectedItem {
  segmentId: string;
  code: string;
  price: number;
  description?: string;
}

interface SelectedSeatItem extends SelectedItem {
  seatNo: string;
  isLegroom?: boolean;
  isAisle?: boolean;
  isExitRow?: boolean;
}

type SelectedSeatsMap = {
  [passengerKey: string]: {
    [segmentId: string]: SelectedSeatItem | null;
  };
};

const MobileAncillaryDetailsPage: React.FC<FlightDetailsPageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mealOptions, setMealOptions] = useState<SSRItem[]>([]);
  const [baggageOptions, setBaggageOptions] = useState<SSRItem[]>([]);
  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip' | 'multicity'>('oneway');
  const [flightSegments, setFlightSegments] = useState<any[]>([]);
  const [priceInfo, setPriceInfo] = useState<any>(null);
  const [adultCount, setAdultCount] = useState(1);
  const [openSections, setOpenSections] = useState<string[]>(['flight']);
  const [segmentIds, setSegmentIds] = useState<string[]>([]);

  const [selectedBaggage, setSelectedBaggage] = useState<{
    [passengerKey: string]: {
      [segmentId: string]: SelectedItem | null
    }
  }>({});
  const [selectedMeals, setSelectedMeals] = useState<{
    [passengerKey: string]: {
      [segmentId: string]: SelectedItem | null
    }
  }>({});
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeatsMap>({});
  const [activePassenger, setActivePassenger] = useState<number>(0);

  const [seatData, setSeatData] = useState<SeatResponse | null>(null);
  const [ancillaryData, setAncillaryData] = useState<AncillaryResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [seatList, setSeatList] = useState<{ [segmentId: string]: SeatInfo[] }>({});
  const [segmentMealOptions, setSegmentMealOptions] = useState<{ [segmentId: string]: SSRItem[] }>(
    {},
  );
  const [segmentBaggageOptions, setSegmentBaggageOptions] = useState<{
    [segmentId: string]: SSRItem[];
  }>({});
  const [baggageSegmentIndex, setBaggageSegmentIndex] = useState<number>(0);
  const [mealSegmentIndex, setMealSegmentIndex] = useState<number>(0);
  const [seatSegmentIndex, setSeatSegmentIndex] = useState<number>(0);

  const [travelers, setTravelers] = useState<TravelerFormData[]>([]);
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [showGST, setShowGST] = useState(false);
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
  const [nameErrors, setNameErrors] = useState<{ [key: string]: string }>({});
  const [bookingId, setBookingId] = useState<string>('');

  useEffect(() => {
    const sectionsToKeepOpen = ['baggage', 'seat', 'meals'];
    const updatedSections = [...openSections];
    let hasChanges = false;

    sectionsToKeepOpen.forEach((section) => {
      if (!updatedSections.includes(section)) {
        updatedSections.push(section);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setOpenSections(updatedSections);
    }
  }, [activePassenger]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = readReviewData();
        if (data) {
          setReviewData(data);

          const sessionId = data?.sessionId;
          const bookingIdFromStorage = data?.mappedData?.bookingId;
          setBookingId(bookingIdFromStorage);

          const tripInfoArray = data?.mappedData?.TripInformation || [];
          const segmentIdsArray: string[] = [];
          const allSegments: any[] = [];

          let tripTypeDetected: 'oneway' | 'roundtrip' | 'multicity' = 'oneway';

          tripInfoArray.forEach((trip: any, tripIndex: number) => {
            const segmentInfoArray = trip.SegmentInformation || [];

            if (tripInfoArray.length > 1) {
              tripTypeDetected = 'multicity';
            } else if (segmentInfoArray.length > 1) {
              const firstSeg = segmentInfoArray[0];
              const lastSeg = segmentInfoArray[segmentInfoArray.length - 1];
              const origin = firstSeg.DepartureAirport?.city;
              const destination = lastSeg.ArrivalAirport?.city;
              if (origin === destination && segmentInfoArray.length === 2) {
                tripTypeDetected = 'roundtrip';
              } else {
                tripTypeDetected = 'multicity';
              }
            }

            segmentInfoArray.forEach((segmentInfo: SegmentInfo, index: number) => {
              const segId = segmentInfo.SegmentID || `SEG${tripIndex}_${index + 1}`;
              segmentIdsArray.push(segId);

              const segment = {
                id: segId,
                fromCity: segmentInfo.DepartureAirport?.city || 'N/A',
                toCity: segmentInfo.ArrivalAirport?.city || 'N/A',
                date: segmentInfo.DepartureTime
                  ? new Date(segmentInfo.DepartureTime).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                  : 'N/A',
                departureTime: segmentInfo.DepartureTime
                  ? new Date(segmentInfo.DepartureTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'N/A',
                departureDate: segmentInfo.DepartureTime
                  ? new Date(segmentInfo.DepartureTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })
                  : 'N/A',
                arrivalTime: segmentInfo.ArrivalTime
                  ? new Date(segmentInfo.ArrivalTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'N/A',
                arrivalDate: segmentInfo.ArrivalTime
                  ? new Date(segmentInfo.ArrivalTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: '2-digit',
                    day: '2-digit',
                    year: 'numeric',
                  })
                  : 'N/A',
                airline: segmentInfo.FlightDetails?.AirlineInfo?.AirlineName || 'N/A',
                flightNumber: `${segmentInfo.FlightDetails?.AirlineInfo?.AirlineCode || ''}-${segmentInfo.FlightDetails?.FlightNumber || ''}`,
                cabin: segmentInfo.FlightDetails?.CabinClass || 'Economy',
                isRefundable: segmentInfo.IsRefundableSegment || false,
                baggage:
                  segmentInfo.TotalPriceList?.[0]?.FareDetails?.AdultFare?.BaggageInfo?.ClassCode ||
                  '7 Kg',
                checkIn:
                  segmentInfo.TotalPriceList?.[0]?.FareDetails?.AdultFare?.BaggageInfo
                    ?.CheckInBaggage || '15 Kg',
                duration: segmentInfo.Duration || 0,
                stops: segmentInfo.NumberOfStops || 0,
                fromAirportCode: segmentInfo.DepartureAirport?.AirlineCode || '',
                toAirportCode: segmentInfo.ArrivalAirport?.AirlineCode || '',
                departureAirport: segmentInfo.DepartureAirport,
                arrivalAirport: segmentInfo.ArrivalAirport,
                segmentInfo: segmentInfo,
              };

              allSegments.push(segment);

              if (tripIndex === 0 && index === 0) {
                setFlightDetails(segment);
              }
            });
          });

          setFlightSegments(allSegments);
          setTripType(tripTypeDetected);
          setSegmentIds(segmentIdsArray);

          const searchQuery = data?.mappedData?.searchQuery;
          if (searchQuery?.paxInfo) {
            const adultCount = searchQuery.paxInfo.AdultFare || searchQuery.paxInfo.ADULT || 0;
            const childCount = searchQuery.paxInfo.ChildFare || searchQuery.paxInfo.CHILD || 0;
            const infantCount = searchQuery.paxInfo.INFANT || searchQuery.paxInfo.infant || 0;
            const totalCount = adultCount + childCount + infantCount;

            setAdultCount(totalCount);

            const baggageObj: { [passengerKey: string]: { [segmentId: string]: SelectedItem | null } } = {};
            const mealsObj: { [passengerKey: string]: { [segmentId: string]: SelectedItem | null } } = {};
            const seatsObj: SelectedSeatsMap = {};
            for (let i = 0; i < totalCount; i++) {
              const passengerKey = `P${i + 1}`;
              const paxBaggage: { [segmentId: string]: SelectedItem | null } = {};
              const paxMeals: { [segmentId: string]: SelectedItem | null } = {};
              const paxSeats: { [segmentId: string]: any } = {};

              segmentIdsArray.forEach((segId) => {
                paxBaggage[segId] = null;
                paxMeals[segId] = null;
                paxSeats[segId] = null;
              });

              baggageObj[passengerKey] = paxBaggage;
              mealsObj[passengerKey] = paxMeals;
              seatsObj[passengerKey] = paxSeats;
            }
            setSelectedBaggage(baggageObj);
            setSelectedMeals(mealsObj);
            setSelectedSeats(seatsObj);

            const initialTravelers: TravelerFormData[] = [];
            for (let i = 0; i < adultCount; i++) {
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
            for (let i = 0; i < childCount; i++) {
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
            for (let i = 0; i < infantCount; i++) {
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
          }

          const totalPriceInfo = data?.mappedData?.totalPriceInfo;
          if (totalPriceInfo) {
            const fareComponents = totalPriceInfo.totalFareDetail?.FareComponents;
            const additionalFare =
              totalPriceInfo.totalFareDetail?.AdditionalFareComponents?.TotalAdditionalFare;
            setPriceInfo({
              baseFare: fareComponents?.BaseFare || 0,
              totalFare: fareComponents?.TotalFare || 0,
              taxesFees:
                additionalFare?.AirlineGSTComponent +
                additionalFare?.FuelSurcharge +
                additionalFare?.OtherTaxes || 0,
              managementFee: additionalFare?.ManagementFee || 0,
              managementFeeTax: additionalFare?.ManagementFeeTax || 0,
              totalAdditionalFare: fareComponents?.TotalAdditionalFare || 0,
            });
          }

          if (sessionId && bookingIdFromStorage) {
            setApiLoading(true);
            setApiError(null);

            try {
              // ===== INDEPENDENT API CALLS =====
              let seatResponse = null;
              let ancillaryResponse = null;

              // Try to get seat details
              try {
                const seatResult = await getSeatDetails({ bookingId: bookingIdFromStorage });
                seatResponse = seatResult;
                console.log('✅ Seat API succeeded');
              } catch (error: any) {
                console.error('❌ Error fetching seat details:', error);
                // Continue without seat data
              }

              // Try to get meals and baggage
              try {
                const mealsResult = await getMealsAndBaggages(sessionId);
                ancillaryResponse = mealsResult;
                console.log('✅ Meals & Baggage API succeeded');
              } catch (error: any) {
                console.error('❌ Error fetching meals and baggage:', error);
                // Continue without ancillary data
              }

              // Only show error if BOTH failed
              if (!seatResponse && !ancillaryResponse) {
                setApiError('Failed to fetch ancillary data. Please try again.');
              } else {
                setApiError(null);
              }

              setSeatData(seatResponse);
              setAncillaryData(ancillaryResponse);

              // ===== PROCESS SEAT DATA (if available) =====
              if (seatResponse?.data?.tripSeatMap?.tripSeat) {
                const tripSeat = seatResponse.data.tripSeatMap.tripSeat;
                const seatSegmentIds = Object.keys(tripSeat);
                const seatMap: { [segmentId: string]: SeatInfo[] } = {};

                seatSegmentIds.forEach((segmentId) => {
                  const segmentSeats = tripSeat[segmentId];
                  if (segmentSeats.sInfo && segmentSeats.sInfo.length > 0) {
                    seatMap[segmentId] = segmentSeats.sInfo;
                  }
                });
                setSeatList(seatMap);
              }

              // ===== PROCESS ANCILLARY DATA (if available) =====
              if (
                ancillaryResponse?.data &&
                Array.isArray(ancillaryResponse.data) &&
                ancillaryResponse.data.length > 0
              ) {
                const segmentMealsMap: { [segmentId: string]: SSRItem[] } = {};
                const segmentBaggageMap: { [segmentId: string]: SSRItem[] } = {};

                ancillaryResponse.data.forEach((tripData: any, tripIndex: number) => {
                  if (tripData?.segments && Array.isArray(tripData.segments)) {
                    tripData.segments.forEach((segment: any) => {
                      const segmentId = segment.segmentId;
                      if (segment.meals && Array.isArray(segment.meals)) {
                        segmentMealsMap[segmentId] = segment.meals.map((meal: any) => ({
                          AirlineCode: meal.code,
                          amount: meal.price,
                          Description: meal.description,
                          iswca: meal.isWCAG || false,
                          isEmdResynced: false,
                        }));
                      }
                    });

                    // Process baggage - CORRECTED VERSION
                    const segmentsWithPrice: string[] = [];
                    const segmentsWithZeroPrice: string[] = [];

                    tripData.segments.forEach((segment: any) => {
                      const segmentId = segment.segmentId;
                      if (segment.baggage && Array.isArray(segment.baggage) && segment.baggage.length > 0) {
                        const hasPrice = segment.baggage.some(
                          (bag: any) => bag.price !== undefined && bag.price !== null && bag.price > 0
                        );
                        if (hasPrice) {
                          segmentsWithPrice.push(segmentId);
                        } else {
                          segmentsWithZeroPrice.push(segmentId);
                        }
                      }
                    });

                    tripData.segments.forEach((segment: any) => {
                      const segmentId = segment.segmentId;

                      if (segment.baggage && Array.isArray(segment.baggage) && segment.baggage.length > 0) {
                        const hasOwnPrice = segment.baggage.some(
                          (bag: any) => bag.price !== undefined && bag.price !== null && bag.price > 0
                        );

                        if (hasOwnPrice) {
                          const baggageWithPrice = segment.baggage.filter(
                            (bag: any) => bag.price !== undefined && bag.price !== null && bag.price > 0
                          );
                          if (baggageWithPrice.length > 0) {
                            segmentBaggageMap[segmentId] = baggageWithPrice.map((bag: any) => ({
                              AirlineCode: bag.code,
                              amount: bag.price,
                              Description: bag.description,
                              iswca: false,
                              isEmdResynced: false,
                            }));
                          }
                        } else {
                          segmentBaggageMap[segmentId] = segment.baggage.map((bag: any) => ({
                            AirlineCode: bag.code,
                            amount: 0,
                            Description: bag.description,
                            iswca: false,
                            isEmdResynced: false,
                          }));
                        }
                      } else {
                        if (segmentsWithPrice.length > 0) {
                          const sourceSegmentId = segmentsWithPrice[0];
                          const sourceSegment = tripData.segments.find(
                            (seg: any) => seg.segmentId === sourceSegmentId
                          );
                          if (sourceSegment && sourceSegment.baggage) {
                            const inheritedBaggage = sourceSegment.baggage
                              .filter(
                                (bag: any) => bag.price !== undefined && bag.price !== null && bag.price > 0
                              )
                              .map((bag: any) => ({
                                AirlineCode: bag.code,
                                amount: bag.price,
                                Description: bag.description,
                                iswca: false,
                                isEmdResynced: false,
                              }));
                            if (inheritedBaggage.length > 0) {
                              segmentBaggageMap[segmentId] = inheritedBaggage;
                            }
                          }
                        }
                      }
                    });

                    const hasAnyBaggage = Object.keys(segmentBaggageMap).length > 0;
                    if (!hasAnyBaggage && tripData.segments.length > 0) {
                      const firstSegment = tripData.segments[0];
                      if (firstSegment.baggage && firstSegment.baggage.length > 0) {
                        const transformedBaggage = firstSegment.baggage.map((bag: any) => ({
                          AirlineCode: bag.code,
                          amount: bag.price || 0,
                          Description: bag.description,
                          iswca: false,
                          isEmdResynced: false,
                        }));
                        tripData.segments.forEach((segment: any) => {
                          segmentBaggageMap[segment.segmentId] = transformedBaggage;
                        });
                      }
                    }
                  }
                });

                setSegmentMealOptions(segmentMealsMap);
                setSegmentBaggageOptions(segmentBaggageMap);

                if (ancillaryResponse.data.length > 0) {
                  const firstTripSegments = ancillaryResponse.data[0]?.segments || [];
                  if (firstTripSegments.length > 0) {
                    const firstSegment = firstTripSegments[0];
                    if (firstSegment.meals) {
                      const transformedMeals = firstSegment.meals.map((meal: any) => ({
                        AirlineCode: meal.code,
                        amount: meal.price,
                        Description: meal.description,
                        iswca: meal.isWCAG || false,
                        isEmdResynced: false,
                      }));
                      setMealOptions(transformedMeals);
                    }
                    if (firstSegment.baggage) {
                      const transformedBaggage = firstSegment.baggage.map((bag: any) => ({
                        AirlineCode: bag.code,
                        amount: bag.price || 0,
                        Description: bag.description,
                        iswca: false,
                        isEmdResynced: false,
                      }));
                      setBaggageOptions(transformedBaggage);
                    }
                  }
                }
              }
            } catch (error: any) {
              console.error('Error in API handling:', error);
              setApiError(error?.message || 'Failed to fetch ancillary data');
            } finally {
              setApiLoading(false);
            }
          }
        }
      } catch (error) {
        console.error('Error loading review data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      const pendingData = sessionStorage.getItem('pendingMobileAncillaryData');
      if (pendingData) {
        console.log('Restoring mobile ancillary data after login...');
        restoreStateAfterLogin();
      }
    }
  }, [isAuthenticated, user]);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Function to save current state before redirecting to login
  const saveCurrentStateForRedirect = () => {
    const currentState = {
      travelers: travelers,
      contactDetails: {
        email: email,
        phone: `${countryCode}${mobileNumber}`,
        countryCode: countryCode
      },
      gstInfo: showGST ? gstInfo : null,
      emergencyContact: emergencyContact,
      selectedBaggage: selectedBaggage,
      selectedMeals: selectedMeals,
      selectedSeats: selectedSeats,
      bookingId: bookingId,
      segmentIds: segmentIds,
      activePassenger: activePassenger,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem('pendingMobileAncillaryData', JSON.stringify(currentState));
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
  };

  // Function to restore state after login
  const restoreStateAfterLogin = () => {
    try {
      const pendingData = sessionStorage.getItem('pendingMobileAncillaryData');
      if (pendingData) {
        const parsedData = JSON.parse(pendingData);

        // Check if data is recent (less than 5 minutes old)
        const timestamp = new Date(parsedData.timestamp);
        const now = new Date();
        const timeDiff = (now.getTime() - timestamp.getTime()) / 1000 / 60;

        if (timeDiff > 5) {
          sessionStorage.removeItem('pendingMobileAncillaryData');
          return false;
        }

        // Restore travellers
        if (parsedData.travellers && parsedData.travellers.length > 0) {
          setTravelers(parsedData.travellers);
        }

        // Restore contact details
        if (parsedData.contactDetails) {
          setEmail(parsedData.contactDetails.email || '');
          setCountryCode(parsedData.contactDetails.countryCode || '+91');
          setMobileNumber(parsedData.contactDetails.phone?.replace(/^\+\d{1,3}/, '') || '');
        }

        // Restore GST info
        if (parsedData.gstInfo) {
          setGstInfo(parsedData.gstInfo);
          setShowGST(true);
        }

        // Restore emergency contact
        if (parsedData.emergencyContact) {
          setEmergencyContact(parsedData.emergencyContact);
        }

        // Restore selections
        if (parsedData.selectedBaggage) {
          setSelectedBaggage(parsedData.selectedBaggage);
        }
        if (parsedData.selectedMeals) {
          setSelectedMeals(parsedData.selectedMeals);
        }
        if (parsedData.selectedSeats) {
          setSelectedSeats(parsedData.selectedSeats);
        }

        // Restore booking ID
        if (parsedData.bookingId) {
          setBookingId(parsedData.bookingId);
        }

        // Restore segment IDs
        if (parsedData.segmentIds) {
          setSegmentIds(parsedData.segmentIds);
        }

        // Restore active passenger
        if (parsedData.activePassenger !== undefined) {
          setActivePassenger(parsedData.activePassenger);
        }

        // Clear the pending data after restoration
        sessionStorage.removeItem('pendingMobileAncillaryData');
        sessionStorage.removeItem('redirectAfterLogin');

        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring state after login:', error);
      return false;
    }
  };

  const handleContinue = async () => {
    if (isSubmitting) return;

    // ===== VALIDATE FORM FIRST =====
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
        newErrors[`dob_${index}`] = 'Date of birth is required';
        hasErrors = true;
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

    const emergencyValidation = validateEmergencyContact(emergencyContact);
    if (!emergencyValidation.isValid) {
      setNameErrors({
        ...newErrors,
        ...emergencyValidation.errors
      });
      hasErrors = true;
    }

    if (showGST && gstInfo.gstNumber) {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstInfo.gstNumber)) {
        newErrors['gst_number'] = 'Please enter a valid GST number';
        hasErrors = true;
      }
      if (!gstInfo.registeredName) {
        newErrors['gst_name'] = 'Registered name is required for GST';
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setNameErrors(newErrors);
      return;
    }

    // ===== STORE DATA IN SESSION STORAGE FIRST =====
    const totalAmount = priceInfo?.totalFare || 0;

    const getDepartureDate = (): string => {
      if (flightSegments && flightSegments.length > 0) {
        const firstSegment = flightSegments[0];
        if (firstSegment?.departureDate && firstSegment.departureDate !== 'N/A') {
          return firstSegment.departureDate;
        }
        if (firstSegment?.date && firstSegment.date !== 'N/A') {
          return firstSegment.date;
        }
      }
      if (flightDetails?.departureDate && flightDetails.departureDate !== 'N/A') {
        return flightDetails.departureDate;
      }
      const firstSeg = reviewData?.mappedData?.TripInformation?.[0]?.SegmentInformation?.[0];
      if (firstSeg?.DepartureTime) {
        return new Date(firstSeg.DepartureTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        });
      }
      const searchParamsStr = sessionStorage.getItem('flightSearchParams');
      if (searchParamsStr) {
        try {
          const searchParams = JSON.parse(searchParamsStr);
          if (searchParams.departureDate) {
            return searchParams.departureDate;
          }
        } catch (e) {
          console.error('Error parsing flightSearchParams:', e);
        }
      }
      return '';
    };

    const departureDate = getDepartureDate();

    const payload = {
      bookingId: bookingId,
      amount: totalAmount,
      email: email.trim().toLowerCase(),
      phone: `${countryCode}${mobileNumber.replace(/\s/g, '')}`,
      isHold: false,
      source: 'b2c',
      departureDate: departureDate,
      travellers: travelers.map((traveler, index) => {
        const passengerKey = `P${index + 1}`;
        const hasPassportData = traveler.passportNumber ||
          traveler.passportIssueDate ||
          traveler.passportExpiryDate;

        const passengerSeatInfos = [];
        const passengerSeats = selectedSeats[passengerKey] || {};
        for (const segmentId of segmentIds) {
          const seat = passengerSeats[segmentId];
          if (seat) {
            passengerSeatInfos.push({
              segmentId: seat.segmentId,
              code: seat.code,
              price: seat.price
            });
          }
        }

        return {
          title: traveler.title,
          paxType: traveler.type,
          firstName: traveler.firstName.trim(),
          lastName: traveler.lastName.trim(),
          dob: traveler.dateOfBirth,
          ...(hasPassportData && {
            passportNumber: traveler.passportNumber?.toUpperCase(),
            passportNationality: traveler.passportNationality || 'IN',
            passportIssueDate: traveler.passportIssueDate,
            passportExpiryDate: traveler.passportExpiryDate
          }),
          ssrSeatInfos: passengerSeatInfos,
          ssrMealInfos: (() => {
            const passengerMeals = selectedMeals[passengerKey] || {};
            const mealInfos = [];
            for (const segId of segmentIds) {
              const meal = passengerMeals[segId];
              if (meal) {
                mealInfos.push({
                  segmentId: meal.segmentId,
                  code: meal.code,
                  price: meal.price
                });
              }
            }
            return mealInfos;
          })(),
          ssrBaggageInfos: (() => {
            const passengerBaggage = selectedBaggage[passengerKey] || {};
            const baggageInfos = [];
            for (const segId of segmentIds) {
              const baggage = passengerBaggage[segId];
              if (baggage) {
                baggageInfos.push({
                  segmentId: baggage.segmentId,
                  code: baggage.code,
                  price: baggage.price
                });
              }
            }
            return baggageInfos;
          })()
        };
      }),
      ...(showGST && gstInfo.gstNumber && {
        gstInfo: {
          gstNumber: gstInfo.gstNumber,
          registeredName: gstInfo.registeredName,
          email: gstInfo.email || email,
          mobile: gstInfo.mobile || `${countryCode}${mobileNumber}`,
          address: gstInfo.address
        }
      }),
      emergencyContact: {
        name: emergencyContact.name || `${travelers[0]?.firstName} ${travelers[0]?.lastName}`,
        email: emergencyContact.email || email,
        phone: emergencyContact.phone || `${countryCode}${mobileNumber}`
      }
    };

    console.log('📦 === BAGGAGE DATA DEBUG ===');
    console.log('Selected Baggage State:', selectedBaggage);
    console.log('Segment IDs:', segmentIds);

    travelers.forEach((traveler, index) => {
      const passengerKey = `P${index + 1}`;
      const passengerBaggage = selectedBaggage[passengerKey] || {};
      console.log(`📦 Passenger ${passengerKey} baggage:`, passengerBaggage);
    });

    console.log('📦 Payload baggage data:', payload.travellers.map(t => ({
      name: t.firstName,
      baggageInfos: t.ssrBaggageInfos
    })));

    // Store all data first
    sessionStorage.setItem('mobileBookingPayload', JSON.stringify(payload));
    sessionStorage.setItem('mobileTravellerData', JSON.stringify({
      travelers: payload.travellers,
      contactDetails: {
        email: payload.email,
        phone: payload.phone
      }
    }));
    sessionStorage.setItem('mobileSelectedItems', JSON.stringify({
      baggage: selectedBaggage,
      meals: selectedMeals,
      seats: selectedSeats
    }));

    // ===== PROCEED WITH BOOKING =====
    setIsSubmitting(true);

    try {
      console.log('📋 Proceeding with booking');

      const response = await initLocalBooking(payload as any);

      if (response.success && response.data) {
        sessionStorage.setItem('bookingInitResponse', JSON.stringify(response));
        sessionStorage.setItem('mobileBookingPayload', JSON.stringify(payload));
        sessionStorage.setItem('bookingData', JSON.stringify(response.data));
        sessionStorage.setItem('selectedItems', JSON.stringify({
          baggage: selectedBaggage,
          meals: selectedMeals,
          seats: selectedSeats
        }));

        if (response.data.bookingId) {
          sessionStorage.setItem('bookingId', response.data.bookingId);
        }

        if (response.data.travellers) {
          const travellerIds = response.data.travellers.map((t: any) => t.travellerId);
          sessionStorage.setItem('travellerIds', JSON.stringify(travellerIds));
        }

        navigate(ROUTES.BEFORE_BOOKING);
      } else {
        notifyError('Failed to initialize booking. Please try again.');
      }
    } catch (error: any) {
      console.error('Error in handleContinue:', error);

      // Handle success case where status is 201 but considered error by axios
      if (error?.response?.status === 201 || error?.response?.data?.success) {
        const responseData = error?.response?.data || error?.data;
        if (responseData?.data) {
          sessionStorage.setItem('bookingInitResponse', JSON.stringify(responseData));
          sessionStorage.setItem('bookingData', JSON.stringify(responseData.data));
          sessionStorage.setItem('selectedItems', JSON.stringify({
            baggage: selectedBaggage,
            meals: selectedMeals,
            seats: selectedSeats
          }));

          if (responseData.data.bookingId) {
            sessionStorage.setItem('bookingId', responseData.data.bookingId);
          }

          navigate(ROUTES.BEFORE_BOOKING);
          return;
        }
      }

      notifyError(error?.message || 'An error occurred while processing your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBaggageSelect = (
    passengerKey: string,
    baggageCode: string,
    segmentId: string,
    price: number,
    description: string,
  ) => {
    setSelectedBaggage((prev) => {
      const passengerBaggage = prev[passengerKey] || {};
      const current = passengerBaggage[segmentId];

      if (current && current.code === baggageCode && current.segmentId === segmentId) {
        // Remove selection for this segment
        return {
          ...prev,
          [passengerKey]: {
            ...passengerBaggage,
            [segmentId]: null,
          },
        };
      }

      // Add/update selection for this segment
      return {
        ...prev,
        [passengerKey]: {
          ...passengerBaggage,
          [segmentId]: {
            segmentId,
            code: baggageCode,
            price,
            description,
          },
        },
      };
    });
  };
  const handleMealSelect = (
    passengerKey: string,
    mealCode: string,
    segmentId: string,
    price: number,
    description: string,
  ) => {
    setSelectedMeals((prev) => {
      // Get current passenger's meal selections
      const passengerMeals = prev[passengerKey] || {};
      const current = passengerMeals[segmentId];

      // If the same meal is selected for this segment, remove it
      if (current && current.code === mealCode && current.segmentId === segmentId) {
        return {
          ...prev,
          [passengerKey]: {
            ...passengerMeals,
            [segmentId]: null,
          },
        };
      }

      // Add/update selection for this passenger and segment
      return {
        ...prev,
        [passengerKey]: {
          ...passengerMeals,
          [segmentId]: {
            segmentId,
            code: mealCode,
            price,
            description,
          },
        },
      };
    });
  };

  const handleSeatSelect = (passengerKey: string, seat: SeatInfo, segmentId: string) => {
    setSelectedSeats((prev) => {
      const passengerSeats = prev[passengerKey] || {};
      const current = passengerSeats[segmentId];

      if (current && current.code === seat.seatNo) {
        return {
          ...prev,
          [passengerKey]: {
            ...passengerSeats,
            [segmentId]: null,
          },
        };
      }

      const seatData: SelectedSeatItem = {
        segmentId,
        code: seat.seatNo,
        price: seat.amount,
        seatNo: seat.seatNo,
        isLegroom: seat.isLegroom,
        isAisle: seat.isAisle,
      };

      if (seat.isExitRow !== undefined) {
        seatData.isExitRow = seat.isExitRow;
      }

      return {
        ...prev,
        [passengerKey]: {
          ...passengerSeats,
          [segmentId]: seatData,
        },
      };
    });
  };

  const handleTravelerUpdate = (index: number, field: keyof TravelerFormData, value: string) => {
    const updatedTravelers = [...travelers];
    updatedTravelers[index] = {
      ...updatedTravelers[index],
      [field]: value,
    } as TravelerFormData;
    setTravelers(updatedTravelers);
  };

  const isPassengerComplete = (index: number) => {
    const key = `P${index + 1}`;
    const passengerBaggage = selectedBaggage[key] || {};

    // Check if passenger has baggage selected for all segments
    let hasAllBaggage = true;
    for (const segId of segmentIds) {
      if (!passengerBaggage[segId]) {
        hasAllBaggage = false;
        break;
      }
    }

    // Check seats
    const passengerSeats = selectedSeats[key] || {};
    let hasAllSeats = true;
    for (const segId of segmentIds) {
      if (!passengerSeats[segId]) {
        hasAllSeats = false;
        break;
      }
    }

    return hasAllBaggage && hasAllSeats;
  };

  const isTravelerComplete = (index: number) => {
    const traveler = travelers[index];
    if (!traveler) return false;
    return (
      traveler.firstName.trim() !== '' &&
      traveler.lastName.trim() !== '' &&
      traveler.dateOfBirth !== ''
    );
  };

  if (loading) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading flight details...</p>
        </div>
      </div>
    );
  }

  const passengerKeys = Array.from({ length: adultCount }, (_, i) => `P${i + 1}`);

  return (
    <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 p-3 sm:p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-3 sm:mb-4 transition-colors"
          onClick={handleBack}
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-xs sm:text-sm font-medium">Back</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Flight Details</h1>

        {apiLoading && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Fetching seat and meal data...
            </p>
          </div>
        )}

        <SectionCard
          title="Flight Information"
          isOpen={openSections.includes('flight')}
          onToggle={() => toggleSection('flight')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${tripType === 'oneway'
                  ? 'bg-blue-100 text-blue-700'
                  : tripType === 'roundtrip'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-purple-100 text-purple-700'
                  }`}
              >
                {tripType === 'oneway'
                  ? 'One Way'
                  : tripType === 'roundtrip'
                    ? 'Round Trip'
                    : 'Multi-City'}
              </span>
              {tripType === 'multicity' && (
                <span className="text-xs text-gray-500">{flightSegments.length} Segments</span>
              )}
            </div>

            {flightSegments.map((segment, index) => (
              <div key={segment.id}>
                {tripType === 'multicity' && (
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                      Segment {index + 1}
                    </span>
                    {index < flightSegments.length - 1 && (
                      <div className="flex-1 ml-3 text-xs text-gray-400 border-t border-gray-200"></div>
                    )}
                  </div>
                )}

                {tripType === 'multicity' && index > 0 && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="font-medium">Connection:</span>
                      <span className="ml-2">
                        {flightSegments[index - 1].toCity} → {segment.fromCity}
                      </span>
                    </div>
                  </div>
                )}

                {tripType === 'roundtrip' && index === 0 && (
                  <div className="mb-2 text-xs font-semibold text-blue-600">Departure</div>
                )}
                {tripType === 'roundtrip' && index === 1 && (
                  <div className="mb-2 text-xs font-semibold text-green-600">Return</div>
                )}

                <MobileFlightHeader {...segment} />

                {index < flightSegments.length - 1 && (
                  <div
                    className={`my-4 border-t-2 border-dashed ${tripType === 'multicity' ? 'border-purple-200' : 'border-gray-200'
                      }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Extra Baggage"
          isOpen={openSections.includes('baggage')}
          onToggle={() => toggleSection('baggage')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
          }
        >
          <MobileExtraBaggage
            baggageOptions={baggageOptions}
            segmentBaggageOptions={segmentBaggageOptions}
            selectedBaggage={selectedBaggage}
            onSelect={handleBaggageSelect}
            passengerKeys={passengerKeys}
            activePassenger={activePassenger}
            setActivePassenger={setActivePassenger}
            isPassengerComplete={isPassengerComplete}
            segmentIds={segmentIds}
            currentSegmentId={segmentIds[baggageSegmentIndex] || segmentIds[0] || ''}
            onSegmentChange={setBaggageSegmentIndex}
          />
        </SectionCard>

        <SectionCard
          title="Seat Selection"
          isOpen={openSections.includes('seat')}
          onToggle={() => toggleSection('seat')}
          icon={<img src={SeatLogo} alt="Seat" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />}
        >
          <MobileSeatSelection
            seats={seatList}
            onSelect={handleSeatSelect}
            passengerKeys={passengerKeys}
            activePassenger={activePassenger}
            setActivePassenger={setActivePassenger}
            isPassengerComplete={isPassengerComplete}
            selectedSeats={selectedSeats}
            segmentIds={segmentIds}
            currentSegmentId={segmentIds[seatSegmentIndex] || segmentIds[0] || ''}
            onSegmentChange={setSeatSegmentIndex}
          />
        </SectionCard>

        <SectionCard
          title="In-flight Meals"
          isOpen={openSections.includes('meals')}
          onToggle={() => toggleSection('meals')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
              />
            </svg>
          }
        >
          <MobileInflightMeals
            mealOptions={mealOptions}
            segmentMealOptions={segmentMealOptions}
            selectedMeals={selectedMeals}
            onSelect={handleMealSelect}
            passengerKeys={passengerKeys}
            activePassenger={activePassenger}
            setActivePassenger={setActivePassenger}
            isPassengerComplete={isPassengerComplete}
            segmentIds={segmentIds}
            currentSegmentId={segmentIds[mealSegmentIndex] || segmentIds[0] || ''}
            onSegmentChange={setMealSegmentIndex}
          />
        </SectionCard>

        <SectionCard
          title="Traveller Information"
          isOpen={openSections.includes('traveller')}
          onToggle={() => toggleSection('traveller')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
        >
          <MobileTravellerInfo
            travelers={travelers}
            onTravelerUpdate={handleTravelerUpdate}
            passengerKeys={passengerKeys}
            activePassenger={activePassenger}
            setActivePassenger={setActivePassenger}
            isPassengerComplete={isTravelerComplete}
            email={email}
            onEmailChange={setEmail}
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            mobileNumber={mobileNumber}
            onMobileNumberChange={setMobileNumber}
            showGST={showGST}
            onShowGSTChange={setShowGST}
            gstInfo={gstInfo}
            onGSTInfoChange={setGstInfo}
            emergencyContact={emergencyContact}
            onEmergencyContactChange={setEmergencyContact}
            nameErrors={nameErrors}
            onNameErrorsChange={setNameErrors}
          />
        </SectionCard>

        <MobilePriceInformation priceInfo={priceInfo} />

        <button
          onClick={handleContinue}
          disabled={isSubmitting}
          className={`w-full font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg transition-colors mt-3 sm:mt-4 text-sm sm:text-base ${isSubmitting
            ? 'bg-gray-400 text-white cursor-not-allowed'
            : 'bg-primary hover:bg-primary text-white'
            }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileAncillaryDetailsPage;
