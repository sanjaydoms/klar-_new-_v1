import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateAndBook } from '@/api/flightService.api';
import { getUserWallet } from '@/api/user.api';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/api/razorpay.api';
import PaymentHeader from './PaymentHeader';
import PriceInformation from './PriceInformation';
import BottomNav from '../DashboardPage/BottomNav';
import { v4 as uuidv4 } from 'uuid';
import { readReviewData } from '@/utils/reviewSession';

interface MobilePaymentPageProps {
  onBack?: () => void;
  onPay?: () => void;
  onContinue?: () => void;
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

const MobilePaymentPage: React.FC<MobilePaymentPageProps> = ({ onBack, onPay, onContinue }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [priceDetails, setPriceDetails] = useState<any>(null);
  const [flightSegments, setFlightSegments] = useState<any[]>([]);
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip' | 'multicity'>('oneway');
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
  const [bookingId, setBookingId] = useState('');
  const [travelerInfo, setTravelerInfo] = useState<any>(null);
  const [travellerIds, setTravellerIds] = useState<string[]>([]);
  const [holdBooking, setHoldBooking] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [baseFare, setBaseFare] = useState(0);
  const [taxesFees, setTaxesFees] = useState(0);
  const [markupPrice, setMarkupPrice] = useState(0);
  const [addonsTotal, setAddonsTotal] = useState(0);
  const [totalFare, setTotalFare] = useState(0);
  const [loading, setLoading] = useState(true);
  const [segmentIds, setSegmentIds] = useState<string[]>([]);
  const [passengerKeys, setPassengerKeys] = useState<string[]>([]);
  const [walletData, setWalletData] = useState<any>(null);

  useEffect(() => {
    if (window.location.pathname !== '/before/booking') {
      window.history.replaceState({}, '', '/before/booking');
    }

    const loadData = () => {
      console.log('📱 MobilePaymentPage - Loading data...');

      try {
        const storedBookingId = sessionStorage.getItem('bookingId');
        console.log('📦 1. Booking ID from session:', storedBookingId);
        if (storedBookingId) setBookingId(storedBookingId);

        const travelerInfoStr = sessionStorage.getItem('travelerInfo');
        console.log(
          '📦 2. Traveler Info from session:',
          travelerInfoStr ? JSON.parse(travelerInfoStr) : null,
        );
        if (travelerInfoStr) {
          const info = JSON.parse(travelerInfoStr);
          setTravelerInfo(info);
        }

        const travellerIdsStr = sessionStorage.getItem('travellerIds');
        console.log(
          '📦 3. Traveller IDs from session:',
          travellerIdsStr ? JSON.parse(travellerIdsStr) : null,
        );
        if (travellerIdsStr) {
          setTravellerIds(JSON.parse(travellerIdsStr));
        }

        const selectedItemsStr = sessionStorage.getItem('selectedItems');
        console.log(
          '📦 4. Selected Items from session:',
          selectedItemsStr ? JSON.parse(selectedItemsStr) : null,
        );
        if (selectedItemsStr) {
          const items = JSON.parse(selectedItemsStr);
          setSelectedBaggage(items.baggage || {});
          setSelectedMeals(items.meals || {});
          setSelectedSeats(items.seats || {});
          console.log('💺 Selected Seats (nested):', items.seats || {});
        }

        const reviewData = readReviewData();
        console.log('📦 5. Review Data from session:', reviewData);
        if (reviewData) {
          const tripInfoArray = reviewData?.mappedData?.TripInformation || [];

          let detectedTripType: 'oneway' | 'roundtrip' | 'multicity' = 'oneway';
          const searchType = reviewData?.mappedData?.searchQuery?.searchType;
          if (searchType === 'MULTICITY') {
            detectedTripType = 'multicity';
          } else if (searchType === 'ROUNDTRIP') {
            detectedTripType = 'roundtrip';
          } else {
            detectedTripType = 'oneway';
          }

          console.log('📊 Trip Type detected:', detectedTripType);
          setTripType(detectedTripType);

          const allSegments: any[] = [];
          const segIds: string[] = [];

          tripInfoArray.forEach((trip: any, tripIndex: number) => {
            const segmentInfoArray = trip.SegmentInformation || [];

            segmentInfoArray.forEach((segmentInfo: any, index: number) => {
              const segId = segmentInfo.SegmentID || `SEG${tripIndex}_${index + 1}`;
              segIds.push(segId);

              let baggageInfo = '';
              let checkInInfo = '';

              if (trip.TotalPriceList && trip.TotalPriceList.length > 0) {
                const fareDetails = trip.TotalPriceList[0]?.FareDetails?.AdultFare;
                if (fareDetails?.BaggageInfo) {
                  baggageInfo = fareDetails.BaggageInfo.ClassCode;
                  checkInInfo = fareDetails.BaggageInfo.CheckInBaggage;
                }
              }

              const segment = {
                id: segId,
                fromCity: segmentInfo.DepartureAirport?.city || 'N/A',
                toCity: segmentInfo.ArrivalAirport?.city || 'N/A',
                fromAirportCode: segmentInfo.DepartureAirport?.AirlineCode || '',
                toAirportCode: segmentInfo.ArrivalAirport?.AirlineCode || '',
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
                baggage: baggageInfo,
                checkIn: checkInInfo,
                duration: segmentInfo.Duration || 0,
                stops: segmentInfo.NumberOfStops || 0,
                departureAirport: segmentInfo.DepartureAirport,
                arrivalAirport: segmentInfo.ArrivalAirport,
                segmentInfo: segmentInfo,
              };

              allSegments.push(segment);

              if (tripIndex === 0 && index === 0) {
                console.log('✈️ First Flight Details extracted:', segment);
                setFlightDetails(segment);
              }
            });
          });

          console.log('✈️ All Flight Segments extracted:', allSegments);
          setFlightSegments(allSegments);
          setSegmentIds(segIds);
        }

        const priceInfoStr = sessionStorage.getItem('priceInfo');
        console.log(
          '📦 6. Price Info from session:',
          priceInfoStr ? JSON.parse(priceInfoStr) : null,
        );
        if (priceInfoStr) {
          const price = JSON.parse(priceInfoStr);
          setPriceDetails(price);
          setBaseFare(price.baseFare || 0);
          setTaxesFees(price.taxesFees || 0);
          setTotalFare(price.totalFare || 0);
          setTotalAmount(price.totalFare || 0);
          console.log('💰 Price details set from priceInfo:', price);
        } else {
          const reviewData = readReviewData();
          if (reviewData) {
            const totalPriceInfo = reviewData?.mappedData?.totalPriceInfo;
            console.log('💰 Price info from reviewData:', totalPriceInfo);
            if (totalPriceInfo) {
              const fareComponents = totalPriceInfo.totalFareDetail?.FareComponents;
              const additionalFare =
                totalPriceInfo.totalFareDetail?.AdditionalFareComponents?.TotalAdditionalFare;

              const baseFareVal = fareComponents?.BaseFare || 0;
              const airlineGST = additionalFare?.AirlineGSTComponent || 0;
              const fuelSurcharge = additionalFare?.FuelSurcharge || 0;
              const otherTaxes = additionalFare?.OtherTaxes || 0;
              const managementFee = additionalFare?.ManagementFee || 0;
              const managementFeeTax = additionalFare?.ManagementFeeTax || 0;
              const taxesFeesVal =
                airlineGST + fuelSurcharge + otherTaxes + managementFee + managementFeeTax;
              const totalFareVal = fareComponents?.TotalFare || 0;

              const price = {
                baseFare: baseFareVal,
                totalFare: totalFareVal,
                taxesFees: taxesFeesVal,
                managementFee: managementFee,
                managementFeeTax: managementFeeTax,
                totalAdditionalFare: fareComponents?.TotalAdditionalFare || 0,
              };
              console.log('💰 Calculated price from reviewData:', price);
              setPriceDetails(price);
              setBaseFare(baseFareVal);
              setTaxesFees(taxesFeesVal);
              setTotalFare(totalFareVal);
              setTotalAmount(totalFareVal);
            }
          }
        }

        const markupStr = sessionStorage.getItem('markupPrice');
        console.log('📦 7. Markup Price from session:', markupStr);
        if (markupStr) {
          setMarkupPrice(JSON.parse(markupStr));
        }

        const holdStr = sessionStorage.getItem('holdBooking');
        console.log('📦 8. Hold Booking from session:', holdStr);
        if (holdStr) {
          setHoldBooking(JSON.parse(holdStr));
        }

        const passengerKeysList: string[] = [];
        if (travelerInfoStr) {
          try {
            const info = JSON.parse(travelerInfoStr);
            if (Array.isArray(info)) {
              info.forEach((_, index) => passengerKeysList.push(`P${index + 1}`));
            } else if (info.travellers && Array.isArray(info.travellers)) {
              info.travellers.forEach((_: any, index: number) =>
                passengerKeysList.push(`P${index + 1}`),
              );
            }
          } catch (e) {
            console.error('Error getting passenger keys:', e);
          }
        }
        if (passengerKeysList.length === 0) {
          const travellerIdsList = travellerIdsStr ? JSON.parse(travellerIdsStr) : [];
          travellerIdsList.forEach((_: any, index: number) =>
            passengerKeysList.push(`P${index + 1}`),
          );
        }
        setPassengerKeys(passengerKeysList);

        let addonsTotalCalc = 0;

        const baggageItems = selectedBaggage || {};
        Object.values(baggageItems).forEach((passengerBaggage) => {
          if (passengerBaggage) {
            Object.values(passengerBaggage).forEach((item) => {
              if (item) addonsTotalCalc += item.price;
            });
          }
        });

        const mealItems = selectedMeals || {};
        Object.values(mealItems).forEach((passengerMeals) => {
          if (passengerMeals) {
            Object.values(passengerMeals).forEach((item) => {
              if (item) addonsTotalCalc += item.price;
            });
          }
        });

        const seatItems = selectedSeats || {};
        Object.values(seatItems).forEach((passengerSeats) => {
          if (passengerSeats) {
            Object.values(passengerSeats).forEach((seat) => {
              if (seat) addonsTotalCalc += seat.price;
            });
          }
        });

        console.log('🧳 Total Add-ons calculated:', addonsTotalCalc);
        setAddonsTotal(addonsTotalCalc);

        console.log('✅ MobilePaymentPage - Data loading complete');
        console.log('📊 Summary:', {
          bookingId,
          travelerInfo: !!travelerInfo,
          travellerIds: travellerIds.length,
          selectedBaggage: Object.keys(selectedBaggage).filter((k) => selectedBaggage[k]).length,
          selectedMeals: Object.keys(selectedMeals).filter((k) => selectedMeals[k]).length,
          selectedSeats: Object.keys(selectedSeats).length,
          baseFare,
          taxesFees,
          totalFare,
          markupPrice,
          addonsTotal: addonsTotalCalc,
          holdBooking,
          passengerKeys: passengerKeysList,
          segmentIds: segIds,
        });
      } catch (error) {
        console.error('❌ Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const calculateTotalAmount = () => {
    const totalFareVal = totalFare || 0;

    let addonsTotalCalc = 0;

    Object.values(selectedBaggage).forEach((passengerBaggage) => {
      if (passengerBaggage) {
        Object.values(passengerBaggage).forEach((item) => {
          if (item) addonsTotalCalc += item.price;
        });
      }
    });

    Object.values(selectedMeals).forEach((passengerMeals) => {
      if (passengerMeals) {
        Object.values(passengerMeals).forEach((item) => {
          if (item) addonsTotalCalc += item.price;
        });
      }
    });

    Object.values(selectedSeats).forEach((passengerSeats) => {
      if (passengerSeats) {
        Object.values(passengerSeats).forEach((seat) => {
          if (seat) addonsTotalCalc += seat.price;
        });
      }
    });

    const addonsTotalVal = addonsTotalCalc || addonsTotal || 0;
    const markupVal = markupPrice || 0;

    const tripjackPrice = totalFareVal + addonsTotalVal;
    const grandTotal = tripjackPrice + markupVal;

    const result = {
      baseFare: Math.round(baseFare * 100) / 100,
      taxesFees: Math.round(taxesFees * 100) / 100,
      totalFare: Math.round(totalFareVal * 100) / 100,
      seatTotal: Math.round(addonsTotalVal * 100) / 100,
      markup: Math.round(markupVal * 100) / 100,
      tripjackPrice: Math.round(tripjackPrice * 100) / 100,
      total: Math.round(grandTotal * 100) / 100,
    };

    console.log('💰 calculateTotalAmount result:', result);
    return result;
  };

  const getActualMealCode = (mealCode: string, segmentId: string): string => {
    try {
      const mealCodeMapping = JSON.parse(sessionStorage.getItem('mealCodeMapping') || '{}');
      if (mealCodeMapping[mealCode]) {
        console.log(`🍽️ Meal code mapping: ${mealCode} -> ${mealCodeMapping[mealCode]}`);
        return mealCodeMapping[mealCode];
      }
      return mealCode;
    } catch (error) {
      console.error('Error getting meal code:', error);
      return mealCode;
    }
  };

  const getActualBaggageCode = (baggageCode: string, segmentId: string): string => {
    try {
      const baggageCodeMapping = JSON.parse(sessionStorage.getItem('baggageCodeMapping') || '{}');
      if (baggageCodeMapping[baggageCode]) {
        console.log(
          `🧳 Baggage code mapping: ${baggageCode} -> ${baggageCodeMapping[baggageCode]}`,
        );
        return baggageCodeMapping[baggageCode];
      }
      return baggageCode;
    } catch (error) {
      console.error('Error getting baggage code:', error);
      return baggageCode;
    }
  };

  const handleConfirmBooking = async () => {
    console.log('🔄 handleConfirmBooking - Starting booking process...');
    setIsLoading(true);
    setBookingError(null);

    try {
      const finalBookingId = bookingId || sessionStorage.getItem('bookingId') || '';
      console.log('📌 Final Booking ID:', finalBookingId);

      if (!finalBookingId) {
        throw new Error('Booking ID not found. Please restart your booking.');
      }

      let travelersList = [];
      let travellerIdsList = travellerIds;

      let travelerInfoStr = sessionStorage.getItem('travelerInfo');
      console.log('📦 Traveler Info from session (raw):', travelerInfoStr);

      if (travelerInfoStr) {
        try {
          const info = JSON.parse(travelerInfoStr);
          console.log('📦 Parsed traveler info:', info);
          if (info.travelers && Array.isArray(info.travelers)) {
            travelersList = info.travelers;
          } else if (Array.isArray(info)) {
            travelersList = info;
          } else {
            travelersList = [info];
          }
        } catch (e) {
          console.error('Error parsing traveler info:', e);
        }
      }

      if (travelersList.length === 0) {
        const bookingInitStr = sessionStorage.getItem('bookingInitResponse');
        console.log('📦 Booking Init Response from session:', bookingInitStr);
        if (bookingInitStr) {
          try {
            const bookingInit = JSON.parse(bookingInitStr);
            if (bookingInit.data?.travellers && Array.isArray(bookingInit.data.travellers)) {
              travelersList = bookingInit.data.travellers;
              console.log('👤 Travelers from booking init:', travelersList);
            }
          } catch (e) {
            console.error('Error parsing booking init response:', e);
          }
        }
      }

      if (travelersList.length === 0) {
        const reviewData = readReviewData();
        if (reviewData) {
          try {
            const travelers = reviewData?.mappedData?.TravelerInfo;
            if (travelers && Array.isArray(travelers)) {
              travelersList = travelers;
              console.log('👤 Travelers from review data:', travelersList);
            }
          } catch (e) {
            console.error('Error parsing review data:', e);
          }
        }
      }

      if (travellerIdsList.length === 0) {
        const storedIds = sessionStorage.getItem('travellerIds');
        if (storedIds) {
          travellerIdsList = JSON.parse(storedIds);
        }
      }

      console.log('👤 Final Travelers List:', travelersList);
      console.log('🆔 Traveller IDs:', travellerIdsList);

      const selectedItemsStr = sessionStorage.getItem('selectedItems');
      console.log('📦 Selected Items from session:', selectedItemsStr);
      let baggageItems: { [key: string]: any } = {};
      let mealItems: { [key: string]: any } = {};
      let seatItems: SelectedSeatsMap = {};

      if (selectedItemsStr) {
        try {
          const items = JSON.parse(selectedItemsStr);
          baggageItems = items.baggage || {};
          mealItems = items.meals || {};
          seatItems = items.seats || {};
          console.log('🧳 Baggage Items:', baggageItems);
          console.log('🍽️ Meal Items:', mealItems);
          console.log('💺 Seat Items:', seatItems);
        } catch (e) {
          console.error('Error parsing selected items:', e);
        }
      }

      const totalAmountCalc = calculateTotalAmount();

      console.log('💰 Checking wallet with amount:', totalAmountCalc.total);
      const walletResponse = await getUserWallet(totalAmountCalc.total);
      console.log('💰 Wallet response:', walletResponse);

      if (walletResponse?.data?.success) {
        setWalletData(walletResponse.data.data);
        console.log('💰 Wallet Data:', walletResponse.data.data);
        
        if (walletResponse.data.data.canUseWallet) {
          console.log('✅ Wallet has sufficient balance');
        } else {
          console.log('⚠️ Wallet balance insufficient. Will proceed with Razorpay payment.');
        }
      }

      const travellers = travelersList.map((traveler: any, index: number) => {
        const passengerKey = `P${index + 1}`;
        console.log(`👤 Processing passenger ${passengerKey}:`, traveler);

        const ssrSeatInfos: Array<{ key: string; code: string }> = [];
        const ssrMealInfos: Array<{ key: string; code: string }> = [];
        const ssrBaggageInfos: Array<{ key: string; code: string }> = [];

        const travellerId = traveler.travellerId || travellerIdsList[index] || '';

        const passengerSeats = seatItems[passengerKey] || seatItems[travellerId] || {};
        console.log(`💺 Passenger ${passengerKey} seats:`, passengerSeats);
        for (const segId of segmentIds) {
          const selectedSeat = passengerSeats[segId];
          if (selectedSeat) {
            console.log(`💺 Seat selected for ${passengerKey} in segment ${segId}:`, selectedSeat);
            ssrSeatInfos.push({
              key: selectedSeat.segmentId || segId,
              code: selectedSeat.code || '2A',
            });
          }
        }

        const selectedMeal = mealItems[passengerKey] || mealItems[travellerId];
        if (selectedMeal) {
          Object.entries(selectedMeal).forEach(([segId, meal]) => {
            if (meal) {
              const actualMealCode = getActualMealCode(meal.code, meal.segmentId);
              ssrMealInfos.push({
                key: meal.segmentId || segId,
                code: actualMealCode,
              });
            }
          });
        }

        const passengerBaggage = baggageItems[passengerKey] || baggageItems[travellerId] || {};
        console.log(`🧳 Passenger ${passengerKey} baggage:`, passengerBaggage);

        for (const segId of segmentIds) {
          const selectedBaggageItem = passengerBaggage[segId];
          if (selectedBaggageItem) {
            const actualBaggageCode = getActualBaggageCode(
              selectedBaggageItem.code,
              selectedBaggageItem.segmentId,
            );
            console.log(
              `🧳 Baggage selected for ${passengerKey} in segment ${segId}:`,
              selectedBaggageItem,
              'Actual code:',
              actualBaggageCode,
            );
            ssrBaggageInfos.push({
              key: selectedBaggageItem.segmentId || segId,
              code: actualBaggageCode,
            });
          }
        }

        return {
          travellerId: travellerId,
          ssrSeatInfos,
          ssrMealInfos,
          ssrBaggageInfos,
        };
      });

      const tripjackPrice = totalAmountCalc.totalFare + totalAmountCalc.seatTotal;
      const totalPrice = tripjackPrice + totalAmountCalc.markup;

      const tempBookingData = {
        bookingId: finalBookingId,
        travellers: travellers,
        tripjackPrice: tripjackPrice,
        markupPrice: totalAmountCalc.markup || 0,
        totalPrice: totalPrice,
      };
      sessionStorage.setItem('tempBookingData', JSON.stringify(tempBookingData));

      const token = localStorage.getItem('token');
      let backendUrl = import.meta.env.VITE_BACKEND_AUTH_URL || 'http://localhost:5010';
      if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost') {
        backendUrl = backendUrl.replace('localhost', window.location.hostname);
      }

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
          const travelerInfoStr2 = sessionStorage.getItem('travelerInfo');
          if (travelerInfoStr2) {
            const travelerInfoData = JSON.parse(travelerInfoStr2);
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
        amount: totalAmountCalc.total,
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
        amount: Math.round(totalAmountCalc.total * 100),
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
                markupPrice: storedBookingData.markupPrice || totalAmountCalc.markup || 0,
                totalPrice: storedBookingData.totalPrice || totalAmountCalc.total || 0,
                orderId: razorpayOrderIdFromPayment,
                source: 'b2c',
              };

              console.log('Calling updateAndBook with payload:', confirmPayload);
              const bookingResponse = await updateAndBook(confirmPayload);

              if (!bookingResponse?.success) {
                console.error('Booking creation failed:', bookingResponse);
                setBookingError('Payment successful but booking creation failed. Please contact support with your payment reference.');
                setIsLoading(false);
                return;
              }

              console.log('Booking created successfully:', bookingResponse);

              sessionStorage.setItem('selectedItems', JSON.stringify({
                baggage: selectedBaggage,
                meals: selectedMeals,
                seats: selectedSeats,
              }));

              sessionStorage.setItem('bookingConfirmation', JSON.stringify(bookingResponse));
              sessionStorage.setItem('bookingData', JSON.stringify(bookingResponse.data || {}));
              sessionStorage.setItem('totalAmount', JSON.stringify(totalAmountCalc.total));

              sessionStorage.removeItem('tempBookingData');
              sessionStorage.removeItem('razorpayOrderId');
              sessionStorage.removeItem('razorpayOrderDetails');

              if (bookingResponse.data?.bookingId) {
                console.log('📌 New Booking ID:', bookingResponse.data.bookingId);
                sessionStorage.setItem('bookingId', bookingResponse.data.bookingId);
              }

              if (onContinue) {
                onContinue();
              } else {
                navigate('/mobile-confirmation', {
                  state: {
                    bookingResponse: bookingResponse,
                    bookingId: finalBookingId,
                    totalAmount: totalAmountCalc.total,
                    selectedBaggage: selectedBaggage,
                    selectedMeals: selectedMeals,
                    selectedSeats: selectedSeats,
                    markupPrice: totalAmountCalc.markup || 0,
                    paymentData: paymentData,
                    razorpayOrderId: razorpayOrderIdFromPayment,
                    razorpayPaymentId: razorpayPaymentId
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
        prefill: {
          name: userEmail || userId,
          email: userEmail,
          contact: mobile
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

      if (window.location.pathname !== '/before/booking') {
        window.history.replaceState({}, '', '/before/booking');
      }

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();

    } catch (error: any) {
      console.error('❌❌❌ Booking confirmation failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      let errorMessage = 'Unable to complete your booking. Please try again.';
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const totalAmountCalc = calculateTotalAmount();

  const getDisplayItems = () => {
    const items: any[] = [];

    Object.entries(selectedBaggage).forEach(([passengerKey, passengerBaggage]) => {
      if (passengerBaggage) {
        Object.entries(passengerBaggage).forEach(([segmentId, value]) => {
          if (value) {
            items.push({
              type: 'baggage',
              key: `${passengerKey}-${segmentId}`,
              value: value,
              label: `${passengerKey} - Baggage (Seg ${segmentIds.indexOf(segmentId) + 1})`,
              passengerKey,
              segmentId,
            });
          }
        });
      }
    });

    Object.entries(selectedMeals).forEach(([passengerKey, passengerMeals]) => {
      if (passengerMeals) {
        Object.entries(passengerMeals).forEach(([segmentId, value]) => {
          if (value) {
            items.push({
              type: 'meal',
              key: `${passengerKey}-${segmentId}`,
              value: value,
              label: `${passengerKey} - Meal (Seg ${segmentIds.indexOf(segmentId) + 1})`,
              passengerKey,
              segmentId,
            });
          }
        });
      }
    });

    Object.entries(selectedSeats).forEach(([passengerKey, passengerSeats]) => {
      if (passengerSeats) {
        Object.entries(passengerSeats).forEach(([segmentId, seat]) => {
          if (seat) {
            items.push({
              type: 'seat',
              key: `${passengerKey}-${segmentId}`,
              value: seat,
              label: `${passengerKey} - Seat ${seat.seatNo} (Seg ${segmentIds.indexOf(segmentId) + 1})`,
              passengerKey,
              segmentId,
            });
          }
        });
      }
    });

    return items;
  };

  const displayItems = getDisplayItems();
  const totalAddOns = displayItems.reduce((sum, item) => sum + (item.value?.price || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-700 font-medium">Processing payment...</p>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          onClick={handleBack}
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Review Booking</h1>

        <div className="block md:hidden lg:hidden">
          <PaymentHeader segments={flightSegments} tripType={tripType} {...flightDetails} />
        </div>

        <div className="block md:hidden lg:hidden bg-white rounded-xl border border-[#E7E2D9] p-4 sm:p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Selected Add-ons</h3>

          {displayItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No add-ons selected</p>
          ) : (
            <div className="space-y-3">
              {displayItems.map((item, index) => {
                const value = item.value;
                const segNumber = segmentIds.indexOf(value.segmentId) + 1;
                return (
                  <div
                    key={`${item.type}-${item.key}-${index}`}
                    className="flex justify-between text-sm border-b border-gray-100 pb-2"
                  >
                    <div>
                      <span className="text-gray-600">{item.label}</span>
                      {value.description && (
                        <span className="text-xs text-gray-500 ml-1">- {value.description}</span>
                      )}
                      {item.type === 'seat' && value.isLegroom && (
                        <span className="text-xs text-blue-500 ml-1">• Extra Legroom</span>
                      )}
                      {item.type === 'seat' && value.isExitRow && (
                        <span className="text-xs text-orange-500 ml-1">• Exit Row</span>
                      )}
                      {item.type === 'seat' && value.isAisle && (
                        <span className="text-xs text-yellow-500 ml-1">• Aisle</span>
                      )}
                    </div>
                    <span className="font-medium text-gray-800">₹{value.price}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="block md:hidden lg:hidden">
          <PriceInformation
            baseFare={priceDetails ? priceDetails.baseFare.toFixed(2) : '0.00'}
            seatMealBaggage={totalAddOns.toFixed(2)}
            insurance="0.00"
            taxesFees={priceDetails ? priceDetails.taxesFees.toFixed(2) : '0.00'}
            totalAmount={totalAmountCalc.total.toFixed(2)}
            payAmount={totalAmountCalc.total.toFixed(2)}
            currency="INR"
          />
        </div>

        {bookingError && (
          <div className="block md:hidden lg:hidden bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-600">{bookingError}</p>
          </div>
        )}

        <div className="block md:hidden lg:hidden">
          <button
            onClick={handleConfirmBooking}
            disabled={isLoading}
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors text-center text-lg mt-4 shadow-md hover:shadow-lg ${isLoading
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-primary hover:bg-primary text-white'
              }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
              'Confirm & Pay'
            )}
          </button>
        </div>

        <BottomNav />
      </div>
    </div>
  );
};

export default MobilePaymentPage;