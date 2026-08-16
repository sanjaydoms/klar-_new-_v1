import { logger } from '@/utils/logger';
import DOMPurify from 'dompurify';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  FaStar,
  FaChevronDown,
  FaChevronUp,
  FaMapMarkerAlt,
  FaWifi,
  FaCheckCircle,
  FaInfoCircle,
  FaUserCircle,
  FaLock,
  FaEdit,
  FaChevronRight,
  FaTrash,
} from 'react-icons/fa';
import {
  CheckCircle2,
  X,
  Clock,
  Calendar,
  Users,
  Bed,
  MapPin,
  Building,
  Wifi,
  Check,
  ArrowLeft,
} from 'lucide-react';

import {
  getSpecialRequests,
  precheckBooking,
  commitBooking,
  commitUnifiedBooking,
} from '@/features/hotels/services/hotelBookingService';
import { precheckTJ } from '@/features/hotels/services/tripjackBookingService';
import { ChildInfo } from '@/features/bookings/types/booking.types';
import { Country } from 'country-state-city';
import {
  formatRateComments,
  calculateNights,
  formatBedConfig,
  formatHotelAddress,
  formatINR,
  NO_HOTEL_IMAGE,
} from '@/utils/hotelUtils';
import { resolveRatePricing } from '@/features/hotels/utils/ratePricing';
import { getHotelProducts, flattenFacilities } from '@/features/hotels/services/hotelSearchService';
import { initiateRazorpayPayment } from '@/api/razorpay.api';
import { notifyError } from '@/utils/notify';

// Format a number for display to 2 decimal places
const formatPrice = (num: number | undefined | null): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return '0.00';
  return Number(num).toFixed(2);
};

/**
 * `country-state-city` returns phonecode inconsistently — bare ("91") for most
 * countries but already prefixed ("+358-18") for some, which produced "++358-18"
 * once the UI added its own plus. Some entries also carry prose
 * ("+1-809 and 1-829"); keep only the first dial code.
 */
const formatDialCode = (phonecode?: string) => {
  const raw = (phonecode || '').trim();
  if (!raw) return '';
  const firstCode = raw.split(/\s+and\s+/i)[0] || raw;
  return `+${firstCode.replace(/^\++/, '').trim()}`;
};

/**
 * Supplier offer names arrive with their internal promo id appended, e.g.
 * "Special discount (9009)". Customers should not see wholesaler codes.
 */
const formatOfferName = (name?: string) => {
  const cleaned = (name || '').replace(/\s*\(\s*[\w-]*\d[\w-]*\s*\)\s*$/, '').trim();
  return cleaned || 'Discount';
};

const formatDateWithDay = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const safeSanitize = (html: string) => {
  if (!html) return '';
  try {
    return DOMPurify.sanitize(html);
  } catch (error) {
    logger.error('DOMPurify sanitize failed on iOS/Safari, falling back to strip tags', error);
    return html.replace(/<[^>]+>/g, '');
  }
};

const HotelReviewBooking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParamsUrl] = useSearchParams();
  const {
    hotelData: stateHotelData,
    searchParams: stateSearchParams,
    selectedRoom: stateSelectedRoom,
    selectedRooms: selectedRoomsState,
    onHoldAllowed: stateOnHoldAllowed,
    holdConfirm: stateHoldConfirm,
    precheckResponseData,
  } = (location.state as any) || {};

  // --- HYDRATION FROM URL FALLBACK ---
  const [hotelData, setHotelData] = useState<any>(stateHotelData);
  const [searchParams, setSearchParams] = useState<any>(stateSearchParams);
  const [selectedRoom, setSelectedRoom] = useState<any>(stateSelectedRoom);
  const onHoldAllowed = useMemo(() => {
    const isHoldAllowedFlag =
      stateOnHoldAllowed ??
      selectedRoom?.onHoldAllowed ??
      stateSelectedRoom?.onHoldAllowed ??
      false;
    const isHoldConfirmFlag =
      stateHoldConfirm ?? selectedRoom?.holdConfirm ?? stateSelectedRoom?.holdConfirm ?? false;
    return Boolean(isHoldAllowedFlag && isHoldConfirmFlag);
  }, [stateOnHoldAllowed, stateHoldConfirm, selectedRoom, stateSelectedRoom]);

  const [isHold, setIsHold] = useState(false);
  const [isHydrating, setIsHydrating] = useState(
    !stateHotelData && !!searchParamsUrl.get('hotelId'),
  );
  // --- END HYDRATION ---

  // Support both multi-room (selectedRooms[]) and single-room (selectedRoom) flows
  const roomsToBook: any[] = useMemo(() => {
    return selectedRoomsState && selectedRoomsState.length > 0
      ? selectedRoomsState
      : selectedRoom
        ? [selectedRoom]
        : [];
  }, [selectedRoom, selectedRoomsState]);

  const isMultiRoom = roomsToBook.length > 1;

  const [instructionOpen, setInstructionOpen] = useState(true); // Open by default for visibility
  const [bookingPolicyOpen, setBookingPolicyOpen] = useState(false);
  const [specialRequestsOpen, setSpecialRequestsOpen] = useState(true);
  const [showTravelerForm, setShowTravelerForm] = useState(true);
  const [showGSTForm, setShowGSTForm] = useState(false);
  const [expandedGuestId, setExpandedGuestId] = useState<string | null>('primary');

  const nights = useMemo(
    () => calculateNights(searchParams?.checkIn, searchParams?.checkOut),
    [searchParams],
  );

  const totalAdults = useMemo(() => {
    return roomsToBook.reduce((sum, room, idx) => {
      const searchRoom = searchParams?.rooms?.[idx] || searchParams?.rooms?.[0] || {};
      return sum + (searchRoom.Adults || room.adults || 1);
    }, 0);
  }, [roomsToBook, searchParams]);

  const totalChildren = useMemo(() => {
    return roomsToBook.reduce((sum, room, idx) => {
      const searchRoom = searchParams?.rooms?.[idx] || searchParams?.rooms?.[0] || {};
      return sum + (searchRoom.Children ?? room.children ?? 0);
    }, 0);
  }, [roomsToBook, searchParams]);

  const [specialRequests, setSpecialRequests] = useState<any[]>([]);
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [customRemark, setCustomRemark] = useState('');
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingStep, setBookingStep] = useState('');

  // ── Pricing: rendered from the backend's figures, never recomputed here ──
  // See features/hotels/utils/ratePricing.ts.
  const r = roomsToBook[0] || {};
  const backendPricing = r.pricing || r.pricingBreakdown || r.priceBreakup || {};

  // Canonical and markup-inclusive: basePrice + taxesAndFees === finalTotalPrice.
  const {
    totalPrice: finalTotalPrice,
    basePrice,
    taxesAndFees,
  } = resolveRatePricing(r, hotelData?.currency);

  // The api net, i.e. the total BEFORE the master's B2C margin. Diffed against a
  // fresh precheck below to detect a supplier price change — never displayed, or
  // the customer would see a total that is short by the margin.
  const supplierTotalPrice = Number(
    backendPricing.supplierTotalPrice ?? backendPricing.totalPrice ?? r.price ?? r.net ?? 0,
  );
  const markupAmount = Number(backendPricing.markupAmount ?? r.markupAmount ?? 0);
  const perNightPrice = Number(
    backendPricing.perNightPrice ?? finalTotalPrice / Math.max(nights, 1),
  );
  const isTaxesIncluded = backendPricing.taxesIncluded === true || taxesAndFees === 0;

  const agentCommission = useMemo(() => {
    const r = roomsToBook[0];
    return Number(
      r?.commissionAmt ||
      r?.commission ||
      r?.pricing?.commission ||
      r?.pricing?.commissionAmt ||
      r?.pricingBreakdown?.commission ||
      r?.pricingBreakdown?.commissionAmt ||
      0,
    );
  }, [roomsToBook]);
  const [commissionTDS] = useState(0);
  const [additionalMarkup, setAdditionalMarkup] = useState(0);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [markupActive, setMarkupActive] = useState(true);
  const [showRoomGoneError, setShowRoomGoneError] = useState(false);
  const [roomGoneMessage, setRoomGoneMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');

  // Traveler details
  const [title, setTitle] = useState('Mr.');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [profileCountryCode, setProfileCountryCode] = useState('IN');
  const [panNumber, setPanNumber] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [useSameDetailsForAll, setUseSameDetailsForAll] = useState(true);
  const [extraPaxDetails, setExtraPaxDetails] = useState<{
    [key: string]: { pan: string; aadhar: string; pNum: string };
  }>({});
  const [dynamicPanRequired, setDynamicPanRequired] = useState(false);
  const [dynamicPassportRequired, setDynamicPassportRequired] = useState(false);
  const [dynamicGstType, setDynamicGstType] = useState<string>('NA');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [expandedRoomIdx, setExpandedRoomIdx] = useState<number>(0);
  const [useCompanyPanForLead, setUseCompanyPanForLead] = useState<boolean>(false);
  const [gstDetails, setGstDetails] = useState({
    gstNumber: '',
    companyName: '',
    companyAddress: '',
  });

  const [selectedPayment, setSelectedPayment] = useState('card');
  const [dynamicRateComments, setDynamicRateComments] = useState<string>('');
  const [freshTotalNet, setFreshTotalNet] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(900); // Default 15 mins

  useEffect(() => {
    if (precheckResponseData && hotelData?.id?.startsWith('TJ:')) {
      const tjOption =
        precheckResponseData.body?.option ||
        precheckResponseData.body?.hInfo?.ops?.[0] ||
        precheckResponseData.body?.hotel?.ops?.[0];
      if (tjOption) {
        const needsPan =
          tjOption.compliance?.panRequired === true ||
          tjOption.ipr === true ||
          tjOption.compliance?.ipr === true;
        const needsPassport =
          tjOption.compliance?.passportRequired === true ||
          tjOption.ipm === true ||
          tjOption.compliance?.ipm === true;
        const gstType = tjOption.compliance?.gstType || 'NA';
        setDynamicPanRequired(needsPan);
        setDynamicPassportRequired(needsPassport);
        setDynamicGstType(gstType);
      }
    }
  }, [precheckResponseData, hotelData]);

  // Persistent Timer Logic
  useEffect(() => {
    const hotelId = searchParamsUrl.get('hotelId') || hotelData?.id;
    const optionId =
      searchParamsUrl.get('optionId') || selectedRoom?.optionId || selectedRoom?.rateKey;

    if (!hotelId || !optionId) return;

    const timerKey = `booking_timer_${hotelId}_${optionId}`;
    const storedExpiry = localStorage.getItem(timerKey);
    const now = Math.floor(Date.now() / 1000);

    let expiryTime: number;

    if (storedExpiry) {
      expiryTime = parseInt(storedExpiry, 10);
      const remaining = expiryTime - now;
      if (remaining <= 0) {
        localStorage.removeItem(timerKey);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    } else {
      // Initialize expiry time (15 minutes from now)
      expiryTime = now + 900;
      localStorage.setItem(timerKey, expiryTime.toString());
      setTimeLeft(900);
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          clearInterval(interval);
          localStorage.removeItem(timerKey);
          navigate('/');
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [hotelData?.id, selectedRoom?.optionId, navigate, searchParamsUrl]);

  // Dev-only test autofill, triggered by typing `sudh_fill` into the coupon box.
  //
  // This previously hardcoded a real person's email, mobile, postal code, PAN and
  // passport number directly in the component. Vite inlines this file into the
  // production bundle, so those identity documents were readable by anyone who
  // opened devtools on the live checkout page. Now it is stripped from production
  // builds entirely and reads placeholder/env values instead of real documents.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (couponCode === 'sudh_fill') {
      setTitle('Mr.');
      setFirstName(import.meta.env.VITE_TEST_FIRST_NAME || 'Test');
      setLastName(import.meta.env.VITE_TEST_LAST_NAME || 'User');
      setEmail(import.meta.env.VITE_TEST_EMAIL || 'test@example.com');
      setMobile(import.meta.env.VITE_TEST_MOBILE || '9999999999');
      setPostalCode(import.meta.env.VITE_TEST_POSTAL_CODE || '500001');
      setPanNumber(import.meta.env.VITE_TEST_PAN || '');
      setPassportNumber(import.meta.env.VITE_TEST_PASSPORT || '');
      setCouponCode(''); // Reset after fill
    }
  }, [couponCode]);

  const getInitialPricing = () => {
    const r = roomsToBook[0];
    return r?.pricing || r?.pricingBreakdown || r?.priceBreakup || r?.Option?.pricing || null;
  };

  const [freshPricingBreakdown, setFreshPricingBreakdown] = useState<any>(getInitialPricing());

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Effect to sync rate comments when room data loads
  useEffect(() => {
    if (!dynamicRateComments) {
      const fromRoom = selectedRoom?.rateComments || selectedRoom?.RateComments;
      const fromRooms = selectedRoomsState?.find((r: any) => r?.rateComments || r?.RateComments);
      const fromRoomsComments = fromRooms?.rateComments || fromRooms?.RateComments;
      const fromHotel = hotelData?.rateComments || hotelData?.RateComments;
      const result = fromRoom || fromRoomsComments || fromHotel || '';
      if (result) {
        logger.info('[DEBUG] Syncing rateComments:', result);
        setDynamicRateComments(result);
      }
    }
  }, [selectedRoom, selectedRoomsState, hotelData]);

  // Main Effect
  useEffect(() => {
    logger.info('--- ENTERING BOOKING REVIEW FLOW ---');
    logger.info('Received State Data:', {
      hotelData,
      searchParams,
      roomsToBook,
      isMultiRoom,
      onHoldAllowed,
    });
    logger.info('URL Search Params:', Object.fromEntries(searchParamsUrl.entries()));
    logger.info('Hotel Description:', hotelData?.description?.substring(0, 50) || 'No description');

    if (!hotelData || roomsToBook.length === 0) {
      if (!isHydrating) {
        logger.warn('Missing critical booking data, redirecting back...');
        navigate('/hotels/search');
      }
      return;
    }

    logger.info('[DEBUG] Timings received:', {
      hotelCheckIn: hotelData.checkInTime,
      hotelCheckOut: hotelData.checkOutTime,
      roomCheckIn: selectedRoom?.checkInTime,
      roomCheckOut: selectedRoom?.checkOutTime,
    });

    fetchSpecialRequests();
  }, [hotelData, selectedRoom, isHydrating, onHoldAllowed]); // Added dependencies for safety

  const totalDiscount = 0; // Discounts are applied server-side in finalTotalPrice

  /**
   * Supplier offer lines are already baked into the net rate, so they must be
   * shown as a gross-to-net breakdown that reconciles:
    *   Base Fare (gross) − offers = Total Amount (net).
   *
   * `basePrice` comes from roomsToBook[0] while the offer rows render from
   * `selectedRoom` (router state) — two sources that can disagree, which left
   * the page showing discounts that never came off the total. Deriving the
   * gross-up from the exact array being rendered keeps the arithmetic honest.
   */
  const displayedOffers: any[] = Array.isArray(selectedRoom?.offers) ? selectedRoom.offers : [];
  const displayedOffersTotal = displayedOffers.reduce((sum: number, offer: any) => {
    const val = parseFloat(offer?.value ?? offer?.amount ?? '0');
    return isNaN(val) ? sum : sum + Math.abs(val);
  }, 0);

  // totalAmount = backend finalTotalPrice + optional agent additional markup entered via UI
  // additionalMarkup is forwarded to commit — NOT added to display total here to avoid double-counting
  const totalAmount =
    couponCode === import.meta.env.VITE_SECRET_COUPON
      ? finalTotalPrice * 0.65
      : finalTotalPrice + additionalMarkup - additionalDiscount - commissionTDS;

  // Hydration Effect
  useEffect(() => {
    const hydrate = async () => {
      if (!isHydrating) return;
      const hotelId = searchParamsUrl.get('hotelId');
      const checkIn = searchParamsUrl.get('checkIn');
      const checkOut = searchParamsUrl.get('checkOut');
      const optionId = searchParamsUrl.get('optionId');
      const reviewHash = searchParamsUrl.get('reviewHash');
      const correlationId = searchParamsUrl.get('correlationId');
      const hid = searchParamsUrl.get('hid');
      const adults = parseInt(searchParamsUrl.get('adults') || '2');
      const children = parseInt(searchParamsUrl.get('children') || '0');
      const urlHold = searchParamsUrl.get('hold') === '1';

      if (!hotelId || !checkIn || !checkOut) {
        setIsHydrating(false);
        return;
      }

      try {
        const recentHotels = JSON.parse(localStorage.getItem('recentHotels') || '[]');
        const cachedHotel = recentHotels.find((h: any) => h.id === hotelId);
        if (cachedHotel) {
          setHotelData(cachedHotel.hotel);
          setSearchParams(
            cachedHotel.searchParams || {
              location: cachedHotel.location,
              checkIn,
              checkOut,
              rooms: [{ Adults: adults, Children: children, childrenAges: [] }],
            },
          );
        } else {
          setHotelData({ id: hotelId, name: 'Loading...', images: [], address: '' });
          setSearchParams({
            location: '',
            checkIn,
            checkOut,
            rooms: [{ Adults: adults, Children: children, childrenAges: [] }],
          });
        }

        const hotelIdStr = hotelId as string;
        const productsResponse: any = await getHotelProducts(hotelIdStr, {
          PropertyCode:
            cachedHotel?.hotel?.propertyCode ||
            (hotelIdStr.includes(':') ? hotelIdStr.split(':')[1] || hotelIdStr : hotelIdStr),
          BrandCode: cachedHotel?.hotel?.brandCode || '',
          checkin: checkIn as string,
          checkout: checkOut as string,
          Rooms: [{ numberOfRoom: 1, adults, children, childrenAges: [] }],
        } as any);

        // Normalize response: handle both { body: { products } } and { body: { body: { products } } }
        const productsBody = productsResponse?.body?.body ?? productsResponse?.body;
        const products = productsBody?.products || productsResponse?.results || [];
        const flattenedRooms: any[] = [];
        products.forEach((room: any) => {
          const rates = Array.isArray(room.rate)
            ? room.rate
            : room.rates
              ? Array.isArray(room.rates)
                ? room.rates
                : [room.rates]
              : [];
          if (rates.length > 0) {
            rates.forEach((rate: any) => {
              const pricingObj = rate.pricing || null;

              // Prices are read from the backend verbatim — never recomputed
              // here. See features/hotels/utils/ratePricing.ts.
              const {
                totalPrice,
                basePrice: baseNetPrice,
                taxesAndFees: taxOnTop,
                discount,
              } = resolveRatePricing(rate, hotelData?.currency);

              flattenedRooms.push({
                ...room,
                rateKey:
                  rate.rateKey || rate.RoomSelectionKey || room.optionId || room.RoomSelectionKey,
                optionId:
                  rate.rateKey || rate.RoomSelectionKey || room.optionId || room.RoomSelectionKey,
                reviewHash:
                  rate.reviewHash ||
                  rate.ReviewHash ||
                  rate.review_hash ||
                  productsBody?.reviewHash ||
                  '',
                correlationId:
                  rate.correlationId ||
                  rate.CorrelationId ||
                  rate._correlationId ||
                  productsBody?.correlationId ||
                  '',
                hid: rate.hid || rate.tjHotelId || productsBody?.hid || '',
                price: totalPrice + discount,
                netPrice: baseNetPrice,
                netPriceInINR: Number(baseNetPrice),
                taxes: taxOnTop,
                boardName: rate.boardName || room.boardName || '',
                mealBasis: rate.mealBasis || room.mealBasis || '',
                optionType: rate.optionType || null,
                roomInfo: rate.roomInfo || room.roomInfo || [],
                pricingBreakdown: rate.pricing || room.pricing || null,
                adults: rate.adults || adults,
                children: rate.children || children,
                offers: rate.offers || [],
                totalDiscount: discount,
                pricing: pricingObj,
                taxesInfo: pricingObj
                  ? {
                    taxes:
                      taxOnTop > 0
                        ? [
                          {
                            description: 'Taxes & Fees',
                            clientAmount: taxOnTop,
                            clientCurrency: 'INR',
                            included: false,
                          },
                        ]
                        : [],
                  }
                  : rate.taxesInfo || rate.taxes || room.taxes || null,
                bed_config: formatBedConfig(rate.bed_config || room.bed_config || null),
              });
            });
          } else {
            flattenedRooms.push({
              ...room,
              rateKey: room.rateKey || room.optionId || room.RoomSelectionKey || '',
              optionId: room.optionId || room.RoomSelectionKey || room.rateKey || '',
              reviewHash:
                room.reviewHash ||
                room.ReviewHash ||
                room.review_hash ||
                productsBody?.reviewHash ||
                '',
              correlationId:
                room.correlationId ||
                room.CorrelationId ||
                room._correlationId ||
                productsBody?.correlationId ||
                '',
              hid: room.hid || room.tjHotelId || productsBody?.hid || '',
              bed_config: formatBedConfig(room.bed_config || null),
            });
          }
        });

        const foundRoom = flattenedRooms.find(
          (p: any) => p.optionId === optionId || p.rateKey === optionId,
        );
        const resolvedRoom = foundRoom || (flattenedRooms.length > 0 ? flattenedRooms[0] : null);

        if (resolvedRoom) {
          const finalRoom = {
            ...resolvedRoom,
            reviewHash: resolvedRoom.reviewHash || reviewHash || '',
            correlationId: resolvedRoom.correlationId || correlationId || '',
            hid: resolvedRoom.hid || hid || '',
            onHoldAllowed: resolvedRoom.onHoldAllowed || urlHold || false,
          };
          setSelectedRoom(finalRoom);
        }
      } catch (err) {
        logger.error('Failed to hydrate review page:', err);
      } finally {
        setIsHydrating(false);
      }
    };
    hydrate();
  }, [isHydrating, searchParamsUrl]);

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                Review Your Booking
              </h1>
              <p className="text-gray-500 font-medium">Complete your details to secure your stay</p>
            </div>

            <div
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 transition-all shadow-sm ${timeLeft < 120
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                : 'bg-blue-50 border-blue-100 text-blue-700'
                }`}
            >
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Clock className={`w-5 h-5 ${timeLeft < 120 ? 'text-red-500' : 'text-blue-500'}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold opacity-70 mb-0.5">
                  Session Expires In
                </p>
                <p className="text-xl font-black tabular-nums leading-none">
                  {formatTime(timeLeft)}
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-500 font-medium text-sm">Recovering your booking session...</p>
        </div>
      </div>
    );
  }

  const handleRequestToggle = (code: string) => {
    setSelectedRequests((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) newErrors.email = 'Valid email is required';
    if (!mobile.trim() || !/^\d{10,}$/.test(mobile))
      newErrors.mobile = 'Valid mobile number is required';
    // Address is gated by what the suppliers actually demand.
    //
    // RateGain CommitReservation (spec 1.5.3, Guest Details p.38-39) requires
    // CountryCode and PostalCode for the primary guest and marks Line1 / City /
    // StateCode as Required=No. TripJack's hotel traveller payload carries no
    // address fields whatsoever, so a TJ booking needs no postal code at all —
    // asking for one would be blocking a sale on data nobody receives.
    if (!profileCountryCode) newErrors.profileCountryCode = 'Country is required';
    if (!hotelData?.id?.startsWith('TJ:') && !postalCode.trim()) {
      newErrors.postalCode = 'Postal code is required';
    }

    // PAN and Passport compliance validation
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (hotelData?.id?.startsWith('TJ:')) {
      const isGstPanUsed = showGSTForm && gstDetails.gstNumber?.trim().length === 15;
      if (dynamicPanRequired && !isGstPanUsed) {
        if (!panNumber.trim()) {
          newErrors.panNumber = 'PAN Number is required';
        } else if (!panRegex.test(panNumber.trim().toUpperCase())) {
          newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
        }
      } else if (panNumber.trim() && !panRegex.test(panNumber.trim().toUpperCase())) {
        newErrors.panNumber = 'Invalid PAN format (e.g., ABCDE1234F)';
      }

      if (dynamicPassportRequired && !passportNumber.trim()) {
        newErrors.passportNumber = 'Passport Number is required';
      }
    }

    // Aadhar is OPTIONAL (validate only if provided)
    if (aadharNumber.trim() && !/^\d{12}$/.test(aadharNumber.replace(/\s/g, ''))) {
      newErrors.aadharNumber = 'Valid 12-digit Aadhar number required';
    }

    // Validate additional guest details if not using same details for all
    if (!useSameDetailsForAll) {
      roomsToBook.forEach((room: any, rIdx: number) => {
        const adults = room.adults || 1;
        const children = room.children || 0;
        for (let i = 0; i < adults + children; i++) {
          if (rIdx === 0 && i === 0) continue; // Skip lead
          const key = `${rIdx}-${i}`;
          const gDetails = extraPaxDetails[key];

          if (!gDetails?.fN?.trim()) {
            newErrors[`extra-${key}-fN`] = 'First name is required';
          }
          if (!gDetails?.lN?.trim()) {
            newErrors[`extra-${key}-lN`] = 'Last name is required';
          }

          if (i < adults) {
            // Adult compliance check
            const isGstPanUsed = showGSTForm && gstDetails.gstNumber?.trim().length === 15;
            if (dynamicPanRequired && !isGstPanUsed) {
              if (!gDetails?.pan?.trim()) {
                newErrors[`extra-${key}-pan`] = 'PAN is required';
              } else if (!panRegex.test(gDetails.pan.trim().toUpperCase())) {
                newErrors[`extra-${key}-pan`] = 'Invalid PAN format';
              }
            } else if (gDetails?.pan?.trim() && !panRegex.test(gDetails.pan.trim().toUpperCase())) {
              newErrors[`extra-${key}-pan`] = 'Invalid PAN format';
            }

            if (dynamicPassportRequired && !gDetails?.pNum?.trim()) {
              newErrors[`extra-${key}-pNum`] = 'Passport is required';
            }
          }
        }
      });
    }

    if (showGSTForm) {
      if (
        !gstDetails.gstNumber.trim() ||
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
          gstDetails.gstNumber.toUpperCase(),
        )
      ) {
        newErrors.gstNumber = 'Valid GST Number required';
      }
      if (!gstDetails.companyName.trim()) newErrors.companyName = 'Company Name required';
      if (!gstDetails.companyAddress.trim()) newErrors.companyAddress = 'Company Address required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDetails = () => {
    if (validateForm()) {
      setShowTravelerForm(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatDateWithDashes = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  const formatHotelTime = (timeStr: string | null | undefined, type: 'in' | 'out') => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (!clean) return '';

    // If it already has a prefix, return as is
    const lower = clean.toLowerCase();
    if (
      lower.includes('after') ||
      lower.includes('before') ||
      lower.includes('from') ||
      lower.includes('until')
    ) {
      return clean;
    }

    // HH:mm format
    if (/^\d{1,2}:\d{2}$/.test(clean)) {
      const [h, m] = clean.split(':');
      if (h) {
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        const formatted = `${h12}:${m || '00'} ${ampm}`;
        return type === 'in' ? `After ${formatted}` : `Before ${formatted}`;
      }
    }
    return type === 'in' ? `After ${clean}` : `Before ${clean}`;
  };

  const formatCancellationDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

    // Check if there is actual time information (not just 00:00:00)
    if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
      return datePart;
    }

    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    return `${datePart}, ${timePart}`;
  };

  const fetchSpecialRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const requests = await getSpecialRequests();
      setSpecialRequests(requests);
    } catch (error: any) {
      logger.error('Failed to fetch special requests:', error.message);
      setBookingError('Failed to fetch special requests. Please try again.');
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleContinueBooking = async (isHoldBooking: boolean = false) => {
    // Validation
    if (!validateForm()) {
      setShowTravelerForm(true);
      setBookingError('Please complete traveler details correctly');
      return;
    }

    try {
      setIsBooking(true);
      setBookingStep('Verifying latest room availability...');
      setBookingError(null);

      const demandBookingId = `demand-${Date.now()}`;
      let needsPanLocal = dynamicPanRequired;
      let needsPassportLocal = dynamicPassportRequired;

      // Generate dynamic session ID and timestamps
      const sessionId = `klar-session-${Date.now()}`;
      const timestamp = new Date().toISOString();

      logger.info('Rooms to book:', roomsToBook);

      // Credit Card is not needed in B2B flow (wallet used)

      const bookingPayload: any = hotelData?.id?.startsWith('TJ:')
        ? {
          optionId:
            roomsToBook[0]?.optionId ||
            roomsToBook[0]?.rateKey ||
            roomsToBook[0]?.RoomSelectionKey ||
            '',
          reviewHash:
            roomsToBook[0]?.reviewHash ||
            roomsToBook[0]?.ReviewHash ||
            roomsToBook[0]?.review_hash ||
            '',
          correlationId:
            roomsToBook[0]?.correlationId ||
            roomsToBook[0]?.CorrelationId ||
            roomsToBook[0]?._correlationId ||
            '',
          hid: roomsToBook[0]?.hid || roomsToBook[0]?.tjHotelId || '',
        }
        : {
          BookReservation: {
            ResStatus: 1, // RateGain v1.5.3 spec confirms int 1 for PreCheck
            DemandBookingId: demandBookingId,
            TimeStamp: timestamp,
            ReservationDate: timestamp,
            CurrencyCode:
              roomsToBook[0]?.currency ||
              roomsToBook[0]?.pricing?.currency ||
              hotelData.currency ||
              'INR',
            Currency:
              roomsToBook[0]?.currency ||
              roomsToBook[0]?.pricing?.currency ||
              hotelData.currency ||
              'INR',
            // Booking-level country. RG marks this Required=No; it now follows
            // the profile country rather than a separate nationality input.
            CountryCode: profileCountryCode || 'IN',
            checkin: searchParams?.checkIn || searchParams?.checkin || '',
            checkout: searchParams?.checkOut || searchParams?.checkout || '',
            propertyID: (hotelData.id || hotelData.propertyID || hotelData.propertyId || '').toString().replace(/^RG:/, ''),
            PropertyCode: hotelData.propertyCode || hotelData.PropertyCode || hotelData.id || '',
            BrandCode: hotelData.brandCode || hotelData.BrandCode || '',
            EchoToken: `klar-${Date.now()}`,
            BookingRate: Number(
              roomsToBook
                .reduce((s: any, r: any) => s + Number(r.netPrice || r.price || 0), 0)
                .toFixed(2),
            ),
            sellingRate: Number(finalTotalPrice.toFixed(2)),
            Session: sessionId,
            RoomSelection: roomsToBook.map((room, roomIdx) => {
              const searchRoom = searchParams?.rooms?.[roomIdx] || searchParams?.rooms?.[0];
              const roomRateKey = room.rateKey || room.RoomSelectionKey || room.rateSelectionKey;
              if (!roomRateKey) {
                throw new Error(
                  `Room ${roomIdx + 1} has an expired or invalid rate. Please go back and re-select.`,
                );
              }
              // Use ?? not || so that Children:0 (no children) is never overridden by the
              // TripJack option's roomInfo child count — 0 is a valid, meaningful value.
              const childCount = searchRoom?.Children ?? 0;
              const childAges = searchRoom?.childrenAges ?? [];
              const childrenArray: ChildInfo[] = Array.from({ length: childCount }, (_, i) => ({
                type: 'child',
                age: childAges[i] || 5,
              }));
              const cleanAlphaNumeric = (str: string) => (str || '').replace(/[^a-zA-Z0-9]/g, '');
              const adults = searchRoom?.Adults || room.adults || 1;
              const guestsArray = [];
              for (let i = 0; i < adults; i++) {
                const isPrimary = roomIdx === 0 && i === 0;
                const key = `${roomIdx}-${i}`;
                const guestFN = isPrimary || useSameDetailsForAll ? firstName : extraPaxDetails[key]?.fN || `${firstName}${i + 1}Adult`;
                const guestLN = isPrimary || useSameDetailsForAll ? lastName : extraPaxDetails[key]?.lN || lastName;

                guestsArray.push({
                  FirstName: cleanAlphaNumeric(guestFN) || 'Guest',
                  LastName: cleanAlphaNumeric(guestLN) + (roomIdx > 0 ? `Room${roomIdx + 1}` : ''),
                  Primary: isPrimary,
                  Email: isPrimary ? email : 'guest@example.com',
                  Phone: isPrimary ? mobile : '0000000000',
                  EmailType: 1,
                  ProfileType: 1,
                  // Line1 / City / StateCode are Required=No for RateGain and
                  // are not collected any more; CountryCode and PostalCode are
                  // the two the primary guest actually needs.
                  CountryCode: profileCountryCode,
                  PostalCode: postalCode,
                });
              }

              return {
                RoomTypeCode: room.roomTypeCode || room.RoomTypeCode || 'Standard',
                NumberOfRooms: 1,
                NumberOfAdults: adults,
                NumberOfChild: childCount,
                // Only include allocationDetails if it's truthy to avoid schema errors
                ...(room.allocationDetails && { allocationDetails: room.allocationDetails }),
                RoomSelectionKey: roomRateKey,
                // RateGain spec (Page 29/38) requires RoomRate as "Price per room per night"
                RoomRate: Number(
                  room.pricing?.perNightPrice ||
                  room.pricingBreakdown?.perNightPrice ||
                  (Number(room.netPrice || room.price || 0) / Math.max(nights, 1)).toFixed(2),
                ),
                BoardName: room.boardName || hotelData.boardName || '',
                Guest: guestsArray,
                ...(childrenArray.length > 0 && { Children: childrenArray }),
                ...(selectedRequests.length > 0 &&
                  roomIdx === 0 && { SpecialRequest: selectedRequests.join(',') }),
                ...(customRemark && roomIdx === 0 && { Comment: customRemark }),
                ...(room.allocationDetails && { allocationDetails: room.allocationDetails }),
              };
            }),
          }
        };

      if (hotelData?.id?.startsWith('TJ:')) {
        logger.info('--- TRIPJACK DEBUG ---');
        logger.info('roomsToBook[0] metadata:', {
          reviewHash: roomsToBook[0]?.reviewHash,
          correlationId: roomsToBook[0]?.correlationId,
          hid: roomsToBook[0]?.hid,
          rateKey: roomsToBook[0]?.rateKey,
        });
        logger.info('--- END TRIPJACK DEBUG ---');
      }

      logger.info('--- START BOOKING FLOW ---');
      logger.info('Booking Type:', isMultiRoom ? 'MULTIPLE ROOMS' : 'SINGLE ROOM');

      let precheckResponse: any = precheckResponseData;

      if (!precheckResponse) {
        logger.info('Phase 1: Precheck Payload:', JSON.stringify(bookingPayload, null, 2));
        if (hotelData?.id?.startsWith('TJ:')) {
          // --- TRIPJACK V3 FLOW ---
          const tjPrecheckPayload = {
            propertyId: hotelData.id,
            optionId: roomsToBook[0]?.optionId || roomsToBook[0]?.rateKey || '',
            reviewHash:
              roomsToBook[0]?.reviewHash ||
              roomsToBook[0]?.ReviewHash ||
              roomsToBook[0]?.review_hash ||
              '',
            correlationId:
              roomsToBook[0]?.correlationId ||
              roomsToBook[0]?.CorrelationId ||
              roomsToBook[0]?._correlationId ||
              '',
            hid: roomsToBook[0]?.hid || roomsToBook[0]?.tjHotelId || '',
          };

          try {
            precheckResponse = await precheckTJ(tjPrecheckPayload);
            logger.info(
              'Phase 1 (TJ): Precheck Response SUCCESS:',
              JSON.stringify(precheckResponse, null, 2),
            );

            const originalOptionId = tjPrecheckPayload.optionId;
            if (precheckResponse?.body?.option?.optionId) {
              precheckResponse.body.option.optionId = originalOptionId;
            }
          } catch (err: any) {
            logger.error('Phase 1 (TJ): Precheck Request FAILED', err);
            throw err;
          }
        } else {
          // --- RATEGAIN FLOW ---
          logger.info('Phase 1 (RG): Precheck Request:', JSON.stringify(bookingPayload, null, 2));
          precheckResponse = await precheckBooking(bookingPayload);
        }
      } else {
        logger.info('Phase 1: Using pre-fetched Precheck Response');
      }

      // --- DYNAMIC COMPLIANCE CHECK (TJ ONLY) ---
      if (hotelData?.id?.startsWith('TJ:')) {
        const tjOption =
          precheckResponse.body?.option ||
          precheckResponse.body?.hInfo?.ops?.[0] ||
          precheckResponse.body?.hotel?.ops?.[0];

        if (tjOption) {
          const needsPan =
            tjOption.compliance?.panRequired === true ||
            tjOption.ipr === true ||
            tjOption.compliance?.ipr === true;
          const needsPassport =
            tjOption.compliance?.passportRequired === true ||
            tjOption.ipm === true ||
            tjOption.compliance?.ipm === true;

          needsPanLocal = needsPan;
          needsPassportLocal = needsPassport;
          setDynamicPanRequired(needsPan);
          setDynamicPassportRequired(needsPassport);
        }

        const isGstPanUsed = showGSTForm && gstDetails.gstNumber?.trim().length === 15;
        const isPanMissing = needsPanLocal && !panNumber && !isGstPanUsed;
        if (isPanMissing || (needsPassportLocal && !passportNumber)) {
          logger.warn('[TJ-COMPLIANCE] Missing mandatory data. Pausing booking.');
          setIsBooking(false);
          setShowTravelerForm(true);
          setBookingError(
            `This property requires ${needsPanLocal ? 'PAN' : ''}${needsPanLocal && needsPassportLocal ? ' and ' : ''}${needsPassportLocal ? 'Passport' : ''} details to continue.`,
          );

          setTimeout(() => {
            const form = document.getElementById('traveler-form');
            form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
          return;
        }
      }

      logger.info('Phase 1: Precheck Response:', JSON.stringify(precheckResponse, null, 2));

      if (
        precheckResponse.status === 'success' ||
        precheckResponse.status === true ||
        precheckResponse.statusCode === 200
      ) {
        setBookingStep('Securing price and preparing payment...');
        logger.info('Phase 2: Commit (Backend will handle Payment and Markups)');

        const preCheckData = hotelData?.id?.startsWith('TJ:')
          ? precheckResponse.body
          : precheckResponse.body?.preCheckResponse || precheckResponse.body;

        const freshNet =
          preCheckData?.totalNet ||
          preCheckData?.tp ||
          preCheckData?.totalFare ||
          preCheckData?.BookingRate ||
          preCheckData?.totalnet ||
          preCheckData?.option?.pricing?.totalPrice; // TJ v3 Path

        if (freshNet) {
          setFreshTotalNet(Number(freshNet));
        }

        const tjPricing =
          preCheckData?.option?.pricing || preCheckData?.pricing || preCheckData?.priceBreakup;
        if (tjPricing) {
          setFreshPricingBreakdown(tjPricing);
        }

        const freshSellingRate =
          preCheckData?.sellingRate ||
          preCheckData?.SellingRate ||
          preCheckData?.sellingrate ||
          preCheckData?.option?.pricing?.totalPrice;

        const freshComments =
          preCheckData?.rateComments ||
          preCheckData?.RateComments ||
          preCheckData?.option?.rateComments ||
          selectedRoom?.rateComments ||
          '';

        if (freshComments) {
          logger.info('Capture fresh Tariff Notes from Precheck:', freshComments);
          setDynamicRateComments(freshComments);
        }

        // --- UNIFIED PAYLOAD MAPPING ---
        const finalNetPrice = Number(freshNet || supplierTotalPrice);
        const precheckBookingId = precheckResponse.bookingId || preCheckData?.bookingId;

        // Payment ids for THIS booking attempt only. Kept in local scope — never
        // on `window` — so a later booking that skips the payment step (hold, or
        // a non-card method) can't reuse a stale, already-consumed payment id.
        let razorpayOrderId: string | undefined;
        let razorpayPaymentId: string | undefined;

        // ==================== INITIATE RAZORPAY PAYMENT ====================
        if (!isHoldBooking && selectedPayment === 'card') {
          setBookingStep('Opening secure payment gateway...');
          try {
            const paymentResult = await initiateRazorpayPayment({
              amount: totalAmount,
              userId: email || 'guest',
              userEmail: email,
              mobile: mobile,
              clientType: 'B2C',
              bookingId: precheckBookingId
            });

            if (!paymentResult.success) {
              setBookingError(paymentResult.error || 'Payment failed or was cancelled by user.');
              setIsBooking(false);
              return;
            }

            setBookingStep('Payment successful! Finalizing booking with supplier...');

            // Must be Razorpay's order_... id (what the payment was captured against),
            // NOT the internal orderId — the backend verifies payment.order_id === this.
            razorpayOrderId = paymentResult.razorpayOrderId;
            razorpayPaymentId = paymentResult.paymentId;
          } catch (paymentErr: any) {
            logger.error('Razorpay payment error:', paymentErr);
            setBookingError('Payment failed. Please try again.');
            setIsBooking(false);
            return;
          }
        }

        const bookingFormData = {
          hotelId: hotelData.id,
          hotelName: hotelData.name,
          hotelAddress: hotelData.address || '',
          hotelImage:
            selectedRoom?.images?.[0] ||
            selectedRoom?.image ||
            hotelData.images?.[0] ||
            (hotelData as any).imageUrl ||
            '',
          starRating: hotelData.starRating || hotelData.rating || 0,
          city: hotelData.city || '',
          currency: hotelData.currency || 'INR',
          isHoldBooking: isHoldBooking,
          isCorporate: showGSTForm,
          gstNumber: showGSTForm ? gstDetails.gstNumber : undefined,
          companyName: showGSTForm ? gstDetails.companyName : undefined,
          companyAddress: showGSTForm ? gstDetails.companyAddress : undefined,
          checkIn: searchParams?.checkIn || '',
          checkOut: searchParams?.checkOut || '',
          PropertyCode: hotelData.propertyCode || hotelData.PropertyCode || hotelData.id || '',
          BrandCode: hotelData.brandCode || hotelData.BrandCode || '',
          CurrencyCode: hotelData.currency || 'INR',
          Session: sessionId,
          precheckBookingId: precheckBookingId,
          totalNet: finalNetPrice,
          totalPrice: totalAmount,
          additionalMarkup: additionalMarkup,
          couponCode: couponCode || '',
          roomName: roomsToBook[0]?.title || 'Standard Room',
          // Primary guest's postal code. Deliberately NOT named `postalCode`
          // alone alongside `city` above, which is the HOTEL's city and is what
          // the booking record stores. Without this the backend fell back to a
          // hardcoded pincode, so what the guest typed never reached RateGain.
          guestPostalCode: postalCode,
          guestCountryCode: profileCountryCode,
          rooms: roomsToBook.map((_: any, roomIdx: number) => {
            const searchRoom = searchParams?.rooms?.[roomIdx] || searchParams?.rooms?.[0];
            const adults = searchRoom?.Adults ?? 1;
            const children = searchRoom?.Children ?? 0; // ?? preserves explicit 0
            const guests = [];

            for (let i = 0; i < adults; i++) {
              const isPrimary = roomIdx === 0 && i === 0;
              const key = `${roomIdx}-${i}`;

              const guestFN =
                isPrimary || useSameDetailsForAll
                  ? firstName
                  : extraPaxDetails[key]?.fN || `${firstName}${i + 1}Adult`;
              const guestLN =
                isPrimary || useSameDetailsForAll ? lastName : extraPaxDetails[key]?.lN || lastName;

              // Extract the 10-character PAN from the 15-character GST Number if used.
              // Indian GSTIN format: State Code (2 digits) + PAN (10 chars) + checksum/entity digits (3 chars).
              let gstPanExtracted = '';
              if (showGSTForm && gstDetails.gstNumber?.trim().length === 15) {
                gstPanExtracted = gstDetails.gstNumber.trim().toUpperCase().substring(2, 12);
              }

              // Use the manually entered PAN first, fallback to the one extracted from GST
              const leadGuestPan = panNumber || gstPanExtracted;

              // When PAN is required, all adult guests must carry a PAN.
              // Fall back to the primary guest's PAN for any adult who doesn't have
              // one entered individually (handles the non-primary rooms case).
              let guestPan =
                isPrimary || useSameDetailsForAll
                  ? leadGuestPan
                  : extraPaxDetails[key]?.pan || (dynamicPanRequired ? leadGuestPan : undefined);

              const guestPNum =
                isPrimary || useSameDetailsForAll ? passportNumber : extraPaxDetails[key]?.pNum;

              guests.push({
                title: isPrimary ? title.replace(/\./g, '') : 'Mr',
                firstName: guestFN.replace(/[^a-zA-Z]/g, '').toUpperCase(),
                lastName: guestLN.replace(/[^a-zA-Z]/g, '').toUpperCase(),
                isAdult: true,
                pan: guestPan?.trim().toUpperCase(),
                passport: guestPNum?.trim().toUpperCase(),
                email: isPrimary ? email : undefined,
                mobile: isPrimary ? mobile : undefined,
              });
            }

            for (let i = 0; i < children; i++) {
              guests.push({
                title: 'Master',
                firstName: `${firstName}Child${i + 1}`.replace(/[^a-zA-Z]/g, '').toUpperCase(),
                lastName: (lastName + `C${i + 1}`).replace(/[^a-zA-Z]/g, '').toUpperCase(),
                isAdult: false,
                age: searchRoom?.childrenAges?.[i] || 5,
              });
            }

            return {
              roomIdx,
              roomName: roomsToBook[roomIdx]?.title || 'Standard Room',
              roomTypeCode:
                searchRoom?.roomTypeCode ||
                roomsToBook[roomIdx]?.roomTypeCode ||
                roomsToBook[roomIdx]?.RoomTypeCode ||
                'Standard',
              rate:
                roomsToBook[roomIdx]?.price ||
                roomsToBook[roomIdx]?.totalPrice ||
                roomsToBook[roomIdx]?.RoomRate ||
                0,
              selectionKey:
                roomsToBook[roomIdx]?.rateKey ||
                roomsToBook[roomIdx]?.RoomSelectionKey ||
                roomsToBook[roomIdx]?.rateSelectionKey ||
                '',
              guests,
            };
          }),
        };

        const providerContext = {
          provider: hotelData?.id?.startsWith('TJ:') ? 'TripJack' : 'RateGain',
          ipr: needsPanLocal,
          ipm: needsPassportLocal,
        };

        logger.info(
          '[Unified Commit] Sending Agnostic Payload to Orchestrator:',
          JSON.stringify({ bookingFormData, providerContext }, null, 2),
        );

        const selectedOptionPrice =
          roomsToBook[0]?.pricing?.totalPrice ||
          roomsToBook[0]?.price ||
          roomsToBook[0]?.totalPrice;

        if (selectedOptionPrice) {
          hotelData.price = selectedOptionPrice;
        }

        let commitResponse = await commitUnifiedBooking({
          bookingFormData,
          providerContext,
          bookingPayload, // Pass the original RateGain raw payload so the backend doesn't lose fields
          razorpayOrderId,
          razorpayPaymentId
        } as any);

        const isSuccessful =
          (commitResponse.status === 'success' || commitResponse.statusCode === 200) &&
          commitResponse.body?.status?.success !== false;

        if (isSuccessful) {
          setBookingStep('Booking confirmed! Redirecting...');
          logger.info('--- BOOKING FLOW COMPLETE ---');

          const commitData = commitResponse.body;
          // Capture fresh rate comments from the final reservation commit
          const commitComments =
            commitData?.rateComments ||
            commitData?.RateComments ||
            commitData?.RoomSelection?.[0]?.Comment ||
            commitData?.RoomSelection?.[0]?.RateComments ||
            commitData?.booking?.rateComments;

          if (commitComments) {
            logger.info('Capture fresh Tariff Notes from Commit:', commitComments);
            setDynamicRateComments(commitComments);
          }

          // If booking succeeded but DB save failed (e.g., no DB), alert the user
          if (commitResponse.dbError) {
            notifyError(
              `SUCCESS! Your booking is confirmed with RateGain.\n\nNote: ${commitResponse.dbError}`,
            );
          }

          // Determine final comments to pass forward - use room-level comments as last fallback too
          const roomLevelComments = roomsToBook.find(
            (r: any) => r?.rateComments || r?.RateComments,
          );
          const finalComments =
            commitComments ||
            freshComments ||
            dynamicRateComments ||
            roomLevelComments?.rateComments ||
            roomLevelComments?.RateComments ||
            '';
          logger.info('[DEBUG] Final comments to navigate:', {
            commitComments,
            freshComments,
            dynamicRateComments,
            roomLevelComments: roomLevelComments?.rateComments,
            finalComments,
          });

          const parsedData =
            typeof commitData === 'string' ? JSON.parse(commitData) : commitData || {};
          const bId =
            parsedData?.bookingRecord?.publicToken ||
            parsedData?.booking?.publicToken ||
            parsedData?.publicToken ||
            parsedData?.ReservationId ||
            parsedData?.bookingId ||
            parsedData?.klarBookingId || parsedData?.ConfirmationNumber ||
            parsedData?.body?.booking?.confirmationNumber ||
            parsedData?.body?.booking?.reservationId ||
            parsedData?.body?.booking?.echotoken ||
            parsedData?.booking?.confirmationNumber ||
            parsedData?.booking?.reservationId ||
            parsedData?.booking?.echotoken ||
            parsedData?.data?.booking?.confirmationNumber ||
            'ID_NOT_FOUND';

          logger.info('[DEBUG] Extracted Booking ID:', bId, 'from commitData:', parsedData);

          navigate(`/hotels/booking-confirmed?bookingId=${encodeURIComponent(bId)}`, {
            state: {
              ...hotelData,
              status: isHoldBooking
                ? 'HELD'
                : hotelData?.id?.startsWith('TJ:')
                  ? 'PENDING'
                  : 'CONFIRMED',
              rateComments: finalComments, // top-level explicit field as extra fallback
              selectedRoom: {
                ...selectedRoom,
                rateComments: finalComments,
              },
              selectedRooms: roomsToBook.map((r) => ({ ...r, rateComments: finalComments })),
              searchParams,
              bookingDetails: commitResponse.body || commitPayload,
              traveler: {
                title,
                firstName,
                lastName,
                email,
                mobile,
                postalCode,
                profileCountryCode,
                gstDetails: showGSTForm ? gstDetails : null,
              },
              pricingBreakdown: {
                basePrice,
                markupAmount,
                perNightPrice,
                supplierTotalPrice,
                finalTotalPrice,
                taxesIncluded: isTaxesIncluded,
                additionalMarkup,
                additionalDiscount,
                totalAmount,
              },
              selectedRequests,
              specialRequests,
              customRemark,
            },
            replace: true,
          });
        } else {
          logger.error('Commit failed:', commitResponse);

          // AUTO-REFUND ON FAILED COMMIT
          // if (paymentProcessed) {
          //   logger.info('--- TRIGGERING AUTO-REFUND DUE TO COMMIT FAILURE ---');
          //   try {
          //     await refundWalletBalance({
          //       amount: totalToPay,
          //       referenceType: 'HOTEL_BOOKING_REFUND',
          //       referenceId: demandBookingId,
          //       description: `Auto-refund for failed booking at ${hotelData.name}`
          //     });
          //     setBookingError((commitResponse.message || 'Booking failed') + ' | Your wallet balance has been restored.');
          //   } catch (refundErr) {
          //     logger.error('CRITICAL: Refund failed after booking failure:', refundErr);
          //     setBookingError((commitResponse.message || 'Booking failed') + ' | Please contact support for wallet refund.');
          //   }
          // } else {
          //   setBookingError(commitResponse.message || 'Booking commit failed. Please contact support.');
          // }
        }
      } else {
        logger.error('Precheck failed:', precheckResponse);
        setBookingError(
          precheckResponse.message ||
          'RateGain could not verify this room availability. Please try another room.',
        );
      }
    } catch (err: any) {
      logger.error('CRITICAL BOOKING ERROR:', err);

      // Extract error message from various possible formats
      let errorMessage =
        err.response?.data?.description ||
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'An unexpected error occurred during booking. Please try again.';

      // Handle TripJack session expiration specifically
      if (
        errorMessage.toLowerCase().includes('expired') ||
        err.response?.data?.errors?.[0]?.errCode === '2503'
      ) {
        errorMessage =
          'Your booking session has expired because it took more than 15 minutes to complete. Please search again to get fresh rates.';
      }

      // AUTO-REFUND ON CRITICAL ERROR
      // if (typeof paymentProcessed !== 'undefined' && paymentProcessed) {
      //   logger.info('--- TRIGGERING AUTO-REFUND DUE TO EXCEPTION ---');
      //   try {
      //     await refundWalletBalance({
      //       amount: totalToPay,
      //       referenceType: 'HOTEL_BOOKING_REFUND',
      //       referenceId: demandBookingId,
      //       description: `Auto-refund for booking error at ${hotelData.name}`
      //     });
      //     errorMessage += ' | Your wallet balance has been restored.';
      //   } catch (refundErr) {
      //     logger.error('CRITICAL: Refund failed after exception:', refundErr);
      //     errorMessage += ' | Please contact support for wallet refund.';
      //   }
      // }

      setBookingError(errorMessage);
    } finally {
      setIsBooking(false);
    }
  };

  const renderGuestCard = (guestId: string, label: string) => {
    const isPrimary = guestId === 'primary';
    const isExpanded = showTravelerForm && expandedGuestId === guestId;

    let guestName = '';
    if (isPrimary) {
      guestName = `${title} ${firstName} ${lastName}`.trim() || 'Not filled yet';
    } else {
      const g = extraPaxDetails[guestId];
      guestName = g?.fN || g?.lN ? `${g.fN || ''} ${g.lN || ''}`.trim() : 'Not filled yet';
    }

    if (!isExpanded) {
      return (
        <div className="group relative" key={guestId}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <FaUserCircle className="text-gray-400" /> {label}
            </span>
            <div className="flex items-center gap-3">
              {!isPrimary && showTravelerForm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      window.confirm(
                        'Guest count is tied to your room selection. To reduce the number of travelers, you must update your search. Do you want to go back to the search page?',
                      )
                    ) {
                      navigate(-1);
                    }
                  }}
                  className="text-red-400 hover:text-red-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  title="Remove Guest"
                >
                  <FaTrash size={12} /> Remove
                </button>
              )}
              {showTravelerForm && (
                <button
                  type="button"
                  onClick={() => setExpandedGuestId(guestId)}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <FaEdit size={14} />
                </button>
              )}
            </div>
          </div>
          <div
            onClick={() => showTravelerForm && setExpandedGuestId(guestId)}
            className={`w-full px-4 py-3 bg-[#F4F6FC] rounded-lg text-sm text-[#1A2B49] font-medium border border-transparent hover:border-blue-200 transition-all cursor-${showTravelerForm ? 'pointer' : 'default'}`}
          >
            {guestName}
          </div>
        </div>
      );
    }

    return (
      <div className="border border-blue-100 bg-blue-50/20 p-4 rounded-xl space-y-4" key={guestId}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <FaUserCircle className="text-blue-500" /> {label} (Editing)
          </span>
          <div className="flex items-center gap-4">
            {!isPrimary && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      'Guest count is tied to your room selection. To reduce the number of travelers, you must update your search. Do you want to go back to the search page?',
                    )
                  ) {
                    navigate(-1);
                  }
                }}
                className="text-red-500 hover:text-red-700 transition-colors flex items-center gap-1.5 text-xs font-bold"
                title="Remove Guest"
              >
                <FaTrash size={12} /> Remove
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpandedGuestId(null)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Collapse
            </button>
          </div>
        </div>

        {isPrimary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Title
                </label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 rounded border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none bg-white"
                >
                  <option>Mr.</option>
                  <option>Mrs.</option>
                  <option>Ms.</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  First & Middle Name
                </label>
                <input
                  type="text"
                  id="guest-first-name"
                  name="given-name"
                  autoComplete="given-name"
                  required
                  value={firstName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^A-Za-z\s\-']/g, '');
                    setFirstName(val);
                    setBookingError(null);
                  }}
                  maxLength={50}
                  placeholder="As per passport"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.firstName ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-[10px] mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="guest-last-name"
                  name="family-name"
                  autoComplete="family-name"
                  required
                  value={lastName}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^A-Za-z\s\-']/g, '');
                    setLastName(val);
                    setBookingError(null);
                  }}
                  maxLength={50}
                  placeholder="Required"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.lastName ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-[10px] mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Nationality was removed: neither supplier asks for it. RateGain's
                CommitReservation Guest object has no nationality field at all,
                and the TripJack traveller payload we build carries only
                fN/lN/ti/pt (+ conditional pan/pNum). It fed the booking-level
                CountryCode, which the RG spec marks Required=No, and the guest
                CountryCode that RG does require comes from profileCountryCode. */}

            {hotelData?.id?.startsWith('TJ:') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-600 block mb-1 flex items-center gap-1">
                    Primary Guest PAN{' '}
                    {dynamicPanRequired ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="font-normal lowercase opacity-70">(optional)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.replace(/\s/g, '').toUpperCase())}
                    onBlur={(e) => setPanNumber(e.target.value.trim().toUpperCase())}
                    placeholder="10-digit PAN"
                    className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white uppercase ${errors.panNumber ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                  />
                  {errors.panNumber && (
                    <p className="text-red-500 text-[10px] mt-1">{errors.panNumber}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-600 block mb-1 flex items-center gap-1">
                    Aadhar <span className="font-normal lowercase opacity-70">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={aadharNumber}
                    onChange={(e) =>
                      setAadharNumber(e.target.value.replace(/\D/g, '').substring(0, 12))
                    }
                    placeholder="12-digit UID"
                    className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.aadharNumber ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                  />
                  {errors.aadharNumber && (
                    <p className="text-red-500 text-[10px] mt-1">{errors.aadharNumber}</p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-600 block mb-1 flex items-center gap-1">
                    Passport{' '}
                    {dynamicPassportRequired ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="font-normal lowercase opacity-70">(optional)</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={passportNumber}
                    onChange={(e) =>
                      setPassportNumber(e.target.value.replace(/\s/g, '').toUpperCase())
                    }
                    onBlur={(e) => setPassportNumber(e.target.value.trim().toUpperCase())}
                    placeholder="Passport No."
                    className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white uppercase ${errors.passportNumber ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                  />
                  {errors.passportNumber && (
                    <p className="text-red-500 text-[10px] mt-1">{errors.passportNumber}</p>
                  )}
                </div>
              </div>
            )}

            {/* Street address / state / city were removed: nothing consumes them.
                TripJack's traveller payload has no address fields, RateGain marks
                Line1/City/StateCode Required=No, the Booking record stores only the
                HOTEL's address, and no voucher, email or GST invoice reads them.
                RateGain does require PostalCode for the primary guest, so that one
                field stays — and only for RateGain properties. */}
            {!hotelData?.id?.startsWith('TJ:') && (
              <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                      Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="Zip code"
                      className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.postalCode ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                    />
                    {errors.postalCode && (
                      <p className="text-red-500 text-[10px] mt-1">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={extraPaxDetails[guestId]?.fN || ''}
                  onChange={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: { ...prev[guestId], fN: e.target.value.toUpperCase() },
                    }))
                  }
                  placeholder="First Name"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border outline-none bg-white uppercase focus:ring-2 ${errors[`extra-${guestId}-fN`] ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'}`}
                />
                {errors[`extra-${guestId}-fN`] && (
                  <p className="text-red-500 text-[10px] mt-1">{errors[`extra-${guestId}-fN`]}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={extraPaxDetails[guestId]?.lN || ''}
                  onChange={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: { ...prev[guestId], lN: e.target.value.toUpperCase() },
                    }))
                  }
                  placeholder="Last Name"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border outline-none bg-white uppercase focus:ring-2 ${errors[`extra-${guestId}-lN`] ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'}`}
                />
                {errors[`extra-${guestId}-lN`] && (
                  <p className="text-red-500 text-[10px] mt-1">{errors[`extra-${guestId}-lN`]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  PAN Number{' '}
                  {dynamicPanRequired ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="font-normal lowercase opacity-70">(optional)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={extraPaxDetails[guestId]?.pan || ''}
                  onChange={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: {
                        ...prev[guestId],
                        pan: e.target.value.replace(/\s/g, '').toUpperCase(),
                      },
                    }))
                  }
                  onBlur={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: {
                        ...prev[guestId],
                        pan: (prev[guestId]?.pan || '').trim().toUpperCase(),
                      },
                    }))
                  }
                  placeholder="10-digit PAN"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border outline-none bg-white uppercase focus:ring-2 ${errors[`extra-${guestId}-pan`] ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'}`}
                />
                {errors[`extra-${guestId}-pan`] && (
                  <p className="text-red-500 text-[10px] mt-1">{errors[`extra-${guestId}-pan`]}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Passport Number{' '}
                  {dynamicPassportRequired ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="font-normal lowercase opacity-70">(optional)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={extraPaxDetails[guestId]?.pNum || ''}
                  onChange={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: {
                        ...prev[guestId],
                        pNum: e.target.value.replace(/\s/g, '').toUpperCase(),
                      },
                    }))
                  }
                  onBlur={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: {
                        ...prev[guestId],
                        pNum: (prev[guestId]?.pNum || '').trim().toUpperCase(),
                      },
                    }))
                  }
                  placeholder="Passport No."
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border outline-none bg-white uppercase focus:ring-2 ${errors[`extra-${guestId}-pNum`] ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'}`}
                />
                {errors[`extra-${guestId}-pNum`] && (
                  <p className="text-red-500 text-[10px] mt-1">{errors[`extra-${guestId}-pNum`]}</p>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                  Aadhar Number <span className="font-normal lowercase">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={extraPaxDetails[guestId]?.aadhar || ''}
                  onChange={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: {
                        ...prev[guestId],
                        aadhar: e.target.value.replace(/\D/g, '').substring(0, 12),
                      },
                    }))
                  }
                  onBlur={(e) =>
                    setExtraPaxDetails((prev) => ({
                      ...prev,
                      [guestId]: { ...prev[guestId], aadhar: (prev[guestId]?.aadhar || '').trim() },
                    }))
                  }
                  placeholder="12-digit UID"
                  className={`w-full px-3 py-2 text-sm text-gray-900 rounded border outline-none bg-white focus:ring-2 ${errors[`extra-${guestId}-aadhar`] ? 'border-red-500 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-100'}`}
                />
                {errors[`extra-${guestId}-aadhar`] && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {errors[`extra-${guestId}-aadhar`]}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hotelData || !selectedRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FaInfoCircle className="text-blue-500 text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Expired</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            We couldn't retrieve your booking details. This can happen if you refresh the page or
            wait too long.
          </p>
          <button
            onClick={() => navigate('/hotels/search')}
            className="w-full bg-[#1e1e6e] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-900 transition-all shadow-lg active:scale-95"
          >
            Go Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-4">
      {/* Room Gone Modal */}
      {showRoomGoneError && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full rounded-[24px] shadow-2xl overflow-hidden p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaInfoCircle className="text-red-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Room Unavailable</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {roomGoneMessage ||
                'The requested room is no longer available at this price. This usually happens when the hotel updates their inventory in real-time.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/hotels/search')}
                className="w-full bg-[#1e1e6e] text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-blue-900 transition-all shadow-lg hover:shadow-xl active:scale-95"
              >
                Back to Search
              </button>
              <button
                onClick={() => setShowRoomGoneError(false)}
                className="w-full bg-gray-100 text-gray-600 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                Stay on Page
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-gray-200 py-3 md:py-4">
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 flex flex-wrap items-center gap-y-1 font-sans text-sm md:text-base">
            <span
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer hover:underline text-[#1A1F4D] font-normal leading-none"
            >
              Home
            </span>
            <FaChevronRight className="mx-2 text-[#1A1F4D]/50 w-2 h-2.5 md:w-3 md:h-3 shrink-0" />
            <span
              className="cursor-pointer hover:underline text-[#1A1F4D] font-normal leading-none"
              onClick={() => navigate('/hotels/search')}
            >
              Hotels in {hotelData.city || ''}
            </span>
            <FaChevronRight className="mx-2 text-[#1A1F4D]/50 w-2 h-2.5 md:w-3 md:h-3 shrink-0" />
            <span
              className="cursor-pointer hover:underline text-[#1A1F4D] font-normal leading-none truncate max-w-[120px] sm:max-w-[200px] md:max-w-[300px]"
              onClick={() => navigate(-1)}
              title={hotelData.name}
            >
              {hotelData.name || 'Hotel Details'}
            </span>
          </div>
        </div>

        {/* Full-width Blue Header */}
        <div className="bg-[#1e1e6e] text-white py-3 md:py-4 shadow-md">
          <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => navigate(-1)}
                className="hover:opacity-80 transition-opacity flex items-center shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </button>
              <h1 className="text-base md:text-lg lg:text-xl font-medium tracking-tight whitespace-nowrap">
                Review your booking
              </h1>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 font-medium shrink-0">
              <Clock
                className={`w-3.5 h-3.5 md:w-4 md:h-4 ${timeLeft < 120 ? 'text-red-300 animate-pulse' : 'text-white'}`}
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 text-xs md:text-sm">
                <span className="opacity-90">Time Left:</span>
                <span className="font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12 py-6">
          {/* Booking Error Modal */}
          {bookingError && (
            <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-white max-w-lg w-full rounded-[32px] shadow-2xl overflow-hidden p-10 text-center animate-in zoom-in-95 duration-300 border border-red-100">
                <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-red-100 animate-ping opacity-25"></div>
                  <FaInfoCircle className="text-red-500 text-5xl relative z-10" />
                </div>

                <h2 className="text-3xl font-extrabold text-gray-900 mb-4 tracking-tight">
                  Booking Failed
                </h2>

                <div className="bg-red-50/50 rounded-2xl p-6 mb-8 border border-red-100/50">
                  <p className="text-red-700 font-semibold text-lg leading-relaxed">
                    {bookingError}
                  </p>
                  {bookingError.toLowerCase().includes('pan') && (
                    <p className="mt-3 text-sm text-red-600/80 italic">
                      Please ensure the PAN number matches the traveler's name exactly as per
                      government records.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <button
                    onClick={() => setBookingError(null)}
                    className="w-full bg-[#1e1e6e] text-white px-8 py-5 rounded-2xl font-bold text-xl hover:bg-blue-900 transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/hotels/search')}
                    className="w-full bg-gray-50 text-gray-500 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    Cancel & Return to Search
                  </button>
                </div>

                <p className="mt-8 text-xs text-gray-400">
                  If this error persists, please contact our support team with booking ID:{' '}
                  <span className="font-mono font-bold text-gray-500">
                    {searchParamsUrl.get('hotelId') || 'N/A'}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Redesigned Hotel Summary Card */}
              <div
                id="hotel-summary-card"
                className="bg-white mb-6"
                style={{
                  width: '100%',
                  borderRadius: '6px',
                  border: '1px solid #D3D3D3',
                  padding: '9.64px',
                  gap: '9.64px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '19.08px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Top row: Image & Basic details */}
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'row',
                      gap: '19.62px',
                      boxSizing: 'border-box',
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Hotel Image */}
                    <img
                      src={
                        roomsToBook?.[0]?.images?.[0] ||
                        roomsToBook?.[0]?.image ||
                        hotelData.images?.[0] ||
                        NO_HOTEL_IMAGE
                      }
                      alt={hotelData.name}
                      style={{
                        width: '130px',
                        minWidth: '100px',
                        height: '120px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />

                    {/* Hotel Info Box */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '9.06px',
                        boxSizing: 'border-box',
                      }}
                    >
                      {/* Name */}
                      <h2
                        style={{
                          width: '100%',
                          fontFamily: '"Mplus 1p", sans-serif',
                          fontWeight: 500,
                          fontSize: 'clamp(17px, 5.5vw, 20px)',
                          lineHeight: '100%',
                          letterSpacing: '0%',
                          color: '#1E293B',
                          margin: 0,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {hotelData.name}
                      </h2>

                      {/* Rating */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2.99px',
                          fontSize: 'clamp(12px, 3.5vw, 14px)',
                          color: '#4A5E78',
                        }}
                      >
                        <FaStar className="text-yellow-400 text-xs" />
                        <span style={{ fontWeight: 500 }}>
                          {hotelData.starRating || hotelData.rating || 5}
                        </span>
                      </div>

                      {/* Address */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '4px',
                          fontSize: 'clamp(11px, 3vw, 13px)',
                          color: '#64748B',
                          lineHeight: '130%',
                        }}
                      >
                        <MapPin className="text-[#EF4444] shrink-0 mt-0.5" size={12} />
                        <span className="line-clamp-2">{formatHotelAddress(hotelData.address)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Middle row: Blue Check-in Check-out Banner */}
                  <div
                    style={{
                      width: '100%',
                      minHeight: '68px',
                      backgroundColor: '#F0F6FF',
                      borderRadius: '6px',
                      padding: '12px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxSizing: 'border-box',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                      {/* Check-in */}
                      <div>
                        <span
                          style={{
                            fontSize: 'clamp(10px, 2.5vw, 11px)',
                            fontWeight: 600,
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Check - In
                        </span>
                        <span
                          style={{
                            fontSize: 'clamp(12px, 3.5vw, 14px)',
                            fontWeight: 600,
                            color: '#1E293B',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {formatDateWithDashes(searchParams?.checkIn)}
                        </span>
                      </div>

                      {/* Nights Pill */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '10px',
                          fontWeight: 500,
                          color: '#64748B',
                        }}
                      >
                        {nights} Night{nights > 1 ? 's' : ''}
                      </div>

                      {/* Check-out */}
                      <div>
                        <span
                          style={{
                            fontSize: 'clamp(10px, 2.5vw, 11px)',
                            fontWeight: 600,
                            color: '#94A3B8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Check - Out
                        </span>
                        <span
                          style={{
                            fontSize: 'clamp(12px, 3.5vw, 14px)',
                            fontWeight: 600,
                            color: '#1E293B',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {formatDateWithDashes(searchParams?.checkOut)}
                        </span>
                      </div>
                    </div>

                    {/* Person / Room */}
                    <div style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          fontSize: 'clamp(10px, 2.5vw, 11px)',
                          fontWeight: 600,
                          color: '#94A3B8',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'block',
                        }}
                      >
                        Person / Room
                      </span>
                      <span
                        style={{
                          fontSize: 'clamp(12px, 3.5vw, 14px)',
                          fontWeight: 600,
                          color: '#1E293B',
                          display: 'block',
                          marginTop: '2px',
                        }}
                      >
                        {totalAdults} Adult{totalAdults > 1 ? 's' : ''}{' '}
                        {totalChildren > 0 ? `, ${totalChildren} Child` : ''} / {roomsToBook.length}{' '}
                        Room{roomsToBook.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Bottom row: Room Details, Badges, Cancellation */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Room Name & View More */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: 'clamp(14px, 4.5vw, 16px)', fontWeight: 600, color: '#1E293B' }}>
                        1x {roomsToBook?.[0]?.title || roomsToBook?.[0]?.roomName || 'Twin Room'}
                      </span>

                    </div>

                    {/* Capacity icons & text */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} className="text-gray-700" />
                      <span style={{ fontSize: 'clamp(11px, 3vw, 13px)', fontWeight: 500, color: '#4A5E78' }}>
                        ( {totalAdults} Adult {totalChildren} Child )
                      </span>
                    </div>

                    {/* Badges and Cancellation */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      {/* Amenities Badges */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Parking badge */}


                        {/* Express check-in */}


                        {/* Free WiFi */}


                        {/* Meal Plan */}
                        {(() => {
                          const meal = roomsToBook?.[0]?.roomInfo?.[0]?.mealBasis ||
                            roomsToBook?.[0]?.roomInfo?.[0]?.boardName ||
                            roomsToBook?.[0]?.boardName ||
                            roomsToBook?.[0]?.mealBasis;
                          if (!meal) return null;
                          return (
                            <div
                              style={{
                                border: '1px solid #D3D3D3',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                fontSize: 'clamp(11px, 3vw, 13px)',
                                color: '#64748B',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#FAFAFA',
                              }}
                            >
                              <CheckCircle2 size={11} className="text-emerald-500" />
                              <span>{meal}</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Refundability */}
                      <div>
                        {(() => {
                          const isFreeCancel = (selectedRoom?.cancellationPolicies &&
                            selectedRoom.cancellationPolicies.length > 0 &&
                            parseFloat(selectedRoom.cancellationPolicies[0].amount) === 0) ||
                            selectedRoom?.isRefundable === true ||
                            selectedRoom?.refundable === true ||
                            (hotelData?.cancellationPolicy && hotelData.cancellationPolicy.toUpperCase().includes('FREE CANCELLATION'));

                          // No supplier exemption — see HotelDetailPage. A RateGain
                          // room used to reach this page, and the payment step, with
                          // the non-refundable warning silently suppressed.
                          const isNonRef = !isFreeCancel;

                          if (isFreeCancel) {
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: 'clamp(11px, 3vw, 13px)',
                                  fontWeight: 600,
                                  color: '#10B981',
                                }}
                              >
                                <Check size={12} />
                                <span>Free Cancellation</span>
                              </div>
                            );
                          } else if (isNonRef) {
                            return (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: 'clamp(11px, 3vw, 13px)',
                                  fontWeight: 600,
                                  color: '#EF4444',
                                }}
                              >
                                <span style={{ fontSize: 'clamp(12px, 3.5vw, 14px)' }}>×</span>
                                <span>Non Refundable</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Details Card Removed per user request */}

              {/* Selected Special Requests Summary */}
              {(selectedRequests.length > 0 || customRemark) && (
                <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-900 mb-2">
                    Selected Special Requests:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequests.map((code) => {
                      const req = specialRequests.find(
                        (r) => r.code === code || r.code === Number(code),
                      );
                      return (
                        <span
                          key={code}
                          className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100"
                        >
                          {req?.specialrequest || req?.name || code}
                        </span>
                      );
                    })}
                    {customRemark && (
                      <span className="text-[10px] px-2 py-1 bg-yellow-50 text-yellow-700 rounded border border-yellow-100">
                        Note: {customRemark}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Special Requests */}
              {specialRequests.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setSpecialRequestsOpen(!specialRequestsOpen)}
                    className="w-full px-5 py-3 flex justify-between items-center hover:bg-gray-50 border-b border-gray-200"
                  >
                    <h3 className="font-semibold text-gray-900 text-sm">Special Requests</h3>
                    {specialRequestsOpen ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>
                  {specialRequestsOpen && (
                    <div className="p-5">
                      {isLoadingRequests ? (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <div className="animate-spin h-3 w-3 border-b-2 border-blue-600 rounded-full"></div>
                          Loading options...
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {specialRequests.map((req) => {
                              const isSelected = selectedRequests.includes(req.code);
                              const reqName = req.specialrequest || req.name || '';
                              const lowerName = reqName.toLowerCase();

                              // Determine a relevant icon
                              let Icon = FaInfoCircle;
                              if (lowerName.includes('bed') || lowerName.includes('cot') || lowerName.includes('mattress')) Icon = Bed;
                              else if (lowerName.includes('time') || lowerName.includes('early') || lowerName.includes('late')) Icon = Clock;
                              else if (lowerName.includes('floor') || lowerName.includes('view') || lowerName.includes('room')) Icon = Building;
                              else if (lowerName.includes('wifi') || lowerName.includes('internet')) Icon = Wifi;

                              return (
                                <button
                                  type="button"
                                  key={req.code}
                                  onClick={() => handleRequestToggle(req.code)}
                                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all text-left w-full ${isSelected
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                                    : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                                    }`}
                                >
                                  <Icon size={14} className={isSelected ? 'text-blue-500' : 'text-gray-400'} />
                                  <span className="flex-1 leading-tight">{reqName}</span>
                                  {isSelected && <FaCheckCircle className="text-blue-600 shrink-0" size={14} />}
                                </button>
                              );
                            })}
                            {specialRequests.length === 0 && (
                              <p className="col-span-full text-xs text-gray-500">
                                No special requests available for this property.
                              </p>
                            )}
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <label className="text-xs font-semibold text-gray-900 block mb-2">
                              Other Request (Optional)
                            </label>
                            <textarea
                              value={customRemark}
                              onChange={(e) => setCustomRemark(e.target.value)}
                              placeholder="Any other specific requirements?"
                              className="w-full text-xs p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none resize-none"
                              rows={2}
                            />
                          </div>
                        </>
                      )}
                      <p className="mt-3 text-[10px] text-gray-400 italic">
                        * Subject to availability at the time of check-in.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Instruction Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <button
                  onClick={() => setInstructionOpen(!instructionOpen)}
                  className="w-full px-5 py-3 flex justify-between items-center hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Standard Procedures & Tariff Notes
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600 text-[11px] font-semibold">View details</span>
                    {instructionOpen ? (
                      <FaChevronUp size={10} className="text-gray-400" />
                    ) : (
                      <FaChevronDown size={10} className="text-gray-400" />
                    )}
                  </div>
                </button>
                {instructionOpen && (
                  <div className="px-5 pb-5 text-xs text-gray-600 space-y-4">
                    {dynamicRateComments ? (
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-blue-900 shadow-sm">
                        <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> Rate Details & Policies
                        </div>
                        <ul className="space-y-1 ml-4 list-disc">
                          {formatRateComments(dynamicRateComments).map(
                            (comment: string, i: number) => (
                              <li key={i} className="leading-relaxed">
                                {comment}
                              </li>
                            ),
                          )}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">
                        No specific tariff notes provided by the property.
                      </p>
                    )}

                    {/* Payment Type */}
                    {roomsToBook[0]?.paymentType && (
                      <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 text-purple-900 shadow-sm mt-3">
                        <div className="flex items-center gap-2 mb-2 text-purple-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> Payment Type
                        </div>
                        <div className="text-xs leading-relaxed font-bold">
                          {roomsToBook[0].paymentType === 'AT_WEB'
                            ? 'Pay Online (At Web)'
                            : roomsToBook[0].paymentType === 'AT_HOTEL'
                              ? 'Pay at Hotel'
                              : roomsToBook[0].paymentType}
                        </div>
                      </div>
                    )}

                    {/* Additional Static Details */}
                    {hotelData?.checkInInstructions && (
                      <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-200 text-orange-900 shadow-sm mt-3">
                        <div className="flex items-center gap-2 mb-2 text-orange-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> Check-In Instructions
                        </div>
                        <div
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: safeSanitize(hotelData.checkInInstructions),
                          }}
                        />
                      </div>
                    )}
                    {hotelData?.specialInstructions && (
                      <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-200 text-yellow-900 shadow-sm mt-3">
                        <div className="flex items-center gap-2 mb-2 text-yellow-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> Special Instructions
                        </div>
                        <div
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: safeSanitize(hotelData.specialInstructions),
                          }}
                        />
                      </div>
                    )}
                    {hotelData?.fees && hotelData.fees.length > 0 && (
                      <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 text-red-900 shadow-sm mt-3">
                        <div className="flex items-center gap-2 mb-2 text-red-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> Excluded / Mandatory Fees
                        </div>
                        <ul className="space-y-1 ml-4 list-disc">
                          {hotelData.fees.map((fee: any, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {fee.description || fee}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hotelData?.policies && hotelData.policies.length > 0 && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-gray-900 shadow-sm mt-3">
                        <div className="flex items-center gap-2 mb-2 text-gray-800 font-bold uppercase text-[10px] tracking-wider">
                          <FaInfoCircle size={12} /> General Policies
                        </div>
                        <ul className="space-y-1 ml-4 list-disc">
                          {hotelData.policies.map((policy: any, idx: number) => (
                            <li key={idx} className="leading-relaxed">
                              {policy.description || policy.name || policy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Booking Policy */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setBookingPolicyOpen(!bookingPolicyOpen)}
                  className="w-full px-5 py-3 flex justify-between items-center hover:bg-gray-50"
                >
                  <h3 className="font-semibold text-gray-900 text-sm">Booking Policy</h3>
                  {bookingPolicyOpen ? (
                    <FaChevronUp size={10} className="text-gray-400" />
                  ) : (
                    <FaChevronDown size={10} className="text-gray-400" />
                  )}
                </button>
                {bookingPolicyOpen && (
                  <div className="px-5 pb-5 text-[13px] text-gray-600 space-y-4">
                    {selectedRoom?.cancellationPolicies &&
                      selectedRoom.cancellationPolicies.length > 0 ? (
                      <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <tr>
                              <th className="px-4 py-3 tracking-wider">CANCEL FROM</th>
                              <th className="px-4 py-3 text-right tracking-wider">PENALTY</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedRoom.cancellationPolicies.map((p: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50/30 transition-colors">
                                <td
                                  className={`px-4 py-3 font-bold ${parseFloat(p.amount) === 0 ? 'text-green-600' : 'text-red-500'}`}
                                >
                                  {formatCancellationDate(p.from)} onwards
                                </td>
                                <td
                                  className={`px-4 py-3 text-right font-bold ${parseFloat(p.amount) === 0 ? 'text-green-600' : 'text-red-500'}`}
                                >
                                  {p.amount}
                                  {!p.amount.toString().includes('%')
                                    ? ' ' + (p.currency || 'INR')
                                    : ''}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="space-y-1 text-gray-400 italic">
                        <p>• Cancellation charges may apply</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                        <p className="text-[10px] text-red-800 font-bold uppercase tracking-tight mb-1">
                          Modification Policy
                        </p>
                        <p className="text-[11px] text-red-700 leading-relaxed">
                          Amendment or modification of this booking is subject to the same penalty
                          as cancellation at the time of the request. A modification fee may apply
                          in addition to any rate difference.
                        </p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-xl border border-orange-100">
                        <p className="text-[10px] text-orange-800 font-bold uppercase tracking-tight mb-1">
                          No-Show Policy
                        </p>
                        <p className="text-[11px] text-orange-700 leading-relaxed">
                          Failure to arrive at the hotel will be treated as a No-Show and will incur
                          a 100% penalty of the total booking amount.
                        </p>
                      </div>
                    </div>
                    {/* <div className="pt-4 border-t border-gray-100">
                      <p className="font-bold text-gray-900 mb-3">Standard Policies:</p>
                      <ul className="space-y-2 text-[13px] text-gray-600">
                        <li className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                          <span className="min-w-[110px]">Check-in time:</span>
                          <span className="font-bold text-gray-900">
                            {formatHotelTime(selectedRoom?.checkInTime || hotelData?.checkInTime) || 'After 2:00 PM'}
                          </span>
                        </li>
                        <li className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                          <span className="min-w-[110px]">Check-out time:</span>
                          <span className="font-bold text-gray-900">
                            {formatHotelTime(selectedRoom?.checkOutTime || hotelData?.checkOutTime) || 'Before 11:00 AM'}
                          </span>
                        </li>
                      </ul>
                    </div> */}
                  </div>
                )}
              </div>
              {/* Box 1: Guest/Traveller Details */}
              <div
                style={{
                  maxWidth: '806.42px',
                  width: '100%',
                  minHeight: '404.53px',
                  borderRadius: '9.92px',
                  background: '#FFFFFF',
                  boxShadow:
                    '0px 0.99px 1.98px -0.99px rgba(0,0,0,0.1), 0px 0.99px 2.97px 0px rgba(0,0,0,0.1)',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
                className="p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-[#1A2B49] leading-tight">
                      Add Guest Details
                    </h3>
                    <button
                      onClick={() => navigate(-1)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline decoration-blue-300 underline-offset-2"
                    >
                      Modify guest count
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 mb-3">
                    Please make sure you add the details as per your ID Proof
                  </p>

                  {/* Compliance Requirements Banner */}
                  {(dynamicPanRequired || dynamicPassportRequired || (dynamicGstType && dynamicGstType !== 'NA')) && (
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <span>⚠️</span> Mandatory Requirements for This Booking
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {dynamicPanRequired && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            PAN Card Required
                          </span>
                        )}
                        {dynamicPassportRequired && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            Passport Required
                          </span>
                        )}
                        {dynamicGstType && dynamicGstType !== 'NA' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a1 1 0 001-1V6a1 1 0 00-1-1H4a1 1 0 00-1 1v12a1 1 0 001 1z" />
                            </svg>
                            GST Applicable ({dynamicGstType})
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Guest List */}
                  <div className="space-y-4">
                    {renderGuestCard('primary', 'Primary Guest')}

                    {!useSameDetailsForAll &&
                      roomsToBook.map((room, rIdx) => {
                        const adults = room.adults || 1;
                        const children = room.children || 0;
                        const paxList = [];
                        for (let i = 0; i < adults + children; i++) {
                          if (rIdx === 0 && i === 0) continue; // Skip lead
                          paxList.push(i);
                        }
                        return paxList.map((pIdx) => {
                          const key = `${rIdx}-${pIdx}`;
                          const guestNum = 1 + (rIdx === 0 ? pIdx : pIdx + 1);
                          return renderGuestCard(key, `Guest ${guestNum}`);
                        });
                      })}
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-4 flex flex-col gap-4">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useSameDetailsForAll}
                      onChange={(e) => {
                        setUseSameDetailsForAll(e.target.checked);
                        if (!e.target.checked) {
                          setExpandedGuestId('0-1');
                        } else {
                          setExpandedGuestId('primary');
                        }
                      }}
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">
                        Use primary guest details for all travelers
                      </span>
                      <p className="text-[10px] text-gray-400">
                        Uncheck to fill details for other guests
                      </p>
                    </div>
                  </label>

                  <div className="flex items-center justify-end flex-wrap gap-4 mt-2">
                    {showTravelerForm ? (
                      <button
                        onClick={handleSaveDetails}
                        className="bg-[#1e1e6e] hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-lg transition-all text-sm shadow-sm"
                      >
                        Save Details
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowTravelerForm(true)}
                        className="border border-[#1e1e6e] text-[#1e1e6e] hover:bg-blue-50 font-bold py-2 px-6 rounded-lg transition-all text-sm"
                      >
                        Edit Guest Details
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Contact Details */}
              <div
                style={{
                  maxWidth: '806.42px',
                  width: '100%',
                  minHeight: '188.39px',
                  borderRadius: '9.92px',
                  paddingTop: '23.8px',
                  paddingRight: '23.8px',
                  paddingLeft: '23.8px',
                  paddingBottom: '23.8px',
                  background: '#FFFFFF',
                  boxShadow:
                    '0px 0.99px 1.98px -0.99px rgba(0,0,0,0.1), 0px 0.99px 2.97px 0px rgba(0,0,0,0.1)',
                  opacity: 1,
                  transform: 'rotate(0deg)',
                }}
                className="mt-6 flex flex-col justify-between"
              >
                <div className="flex flex-col h-full justify-between gap-[15.86px]">
                  <h3 className="text-base font-bold text-[#1A2B49]">
                    Booking details will be sent to
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-[15.86px]">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Country Code
                      </label>
                      {showTravelerForm ? (
                        <select
                          value={profileCountryCode}
                          onChange={(e) => {
                            setProfileCountryCode(e.target.value);
                          }}
                          className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.profileCountryCode ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                        >
                          <option value="">Select</option>
                          {Country.getAllCountries().map((c) => (
                            <option key={c.isoCode} value={c.isoCode}>
                              {c.isoCode} ({formatDialCode(c.phonecode)})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium">
                          {profileCountryCode
                            ? `${profileCountryCode} (${formatDialCode(Country.getCountryByCode(profileCountryCode)?.phonecode)})`
                            : 'Not provided'}
                        </div>
                      )}
                      {errors.profileCountryCode && (
                        <p className="text-red-500 text-[10px] mt-1">{errors.profileCountryCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Mobile Number
                      </label>
                      {showTravelerForm ? (
                        <input
                          type="tel"
                          id="guest-mobile"
                          name="tel"
                          autoComplete="tel-national"
                          inputMode="numeric"
                          required
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          placeholder="Number"
                          className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.mobile ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium">
                          {mobile || 'Not provided'}
                        </div>
                      )}
                      {errors.mobile && (
                        <p className="text-red-500 text-[10px] mt-1">{errors.mobile}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                        Email
                      </label>
                      {showTravelerForm ? (
                        <input
                          type="email"
                          id="guest-email"
                          name="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setBookingError(null);
                          }}
                          maxLength={100}
                          placeholder="Confirmation email"
                          className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.email ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                        />
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                          {email || 'Not provided'}
                        </div>
                      )}
                      {errors.email && (
                        <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-3 mt-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer group font-semibold">
                      <input
                        type="checkbox"
                        checked={showGSTForm}
                        disabled={!showTravelerForm}
                        onChange={(e) => {
                          setShowGSTForm(e.target.checked);
                          if (!e.target.checked) {
                            setGstDetails({ gstNumber: '', companyName: '', companyAddress: '' });
                          }
                        }}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-gray-300 disabled:opacity-50"
                      />
                      <span className="text-gray-700 group-hover:text-blue-600 transition-colors">
                        I have a GST Number (Optional)
                      </span>
                    </label>

                    {showGSTForm && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 bg-gray-50 p-4 rounded border border-gray-100">
                        <div className="col-span-1">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                            GST Number
                          </label>
                          {showTravelerForm ? (
                            <input
                              type="text"
                              value={gstDetails.gstNumber}
                              onChange={(e) =>
                                setGstDetails({
                                  ...gstDetails,
                                  gstNumber: e.target.value.toUpperCase(),
                                })
                              }
                              placeholder="e.g. 22AAAAA0000A1Z5"
                              className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.gstNumber ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                            />
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium">
                              {gstDetails.gstNumber || 'Not provided'}
                            </div>
                          )}
                          {errors.gstNumber && (
                            <p className="text-red-500 text-[10px] mt-1">{errors.gstNumber}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                            Company Name
                          </label>
                          {showTravelerForm ? (
                            <input
                              type="text"
                              value={gstDetails.companyName}
                              onChange={(e) =>
                                setGstDetails({ ...gstDetails, companyName: e.target.value })
                              }
                              placeholder="Required"
                              className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.companyName ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                            />
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium">
                              {gstDetails.companyName || 'Not provided'}
                            </div>
                          )}
                          {errors.companyName && (
                            <p className="text-red-500 text-[10px] mt-1">{errors.companyName}</p>
                          )}
                        </div>
                        <div className="col-span-3">
                          <label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">
                            Company Address
                          </label>
                          {showTravelerForm ? (
                            <input
                              type="text"
                              value={gstDetails.companyAddress}
                              onChange={(e) =>
                                setGstDetails({ ...gstDetails, companyAddress: e.target.value })
                              }
                              placeholder="Registered Address"
                              className={`w-full px-3 py-2 text-sm text-gray-900 rounded border focus:ring-2 outline-none bg-white ${errors.companyAddress ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-400'}`}
                            />
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-700 bg-gray-50 rounded border border-gray-100 font-medium">
                              {gstDetails.companyAddress || 'Not provided'}
                            </div>
                          )}
                          {errors.companyAddress && (
                            <p className="text-red-500 text-[10px] mt-1">{errors.companyAddress}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Price Information */}
            <div className="lg:col-span-1 lg:sticky lg:top-6 self-start flex flex-col gap-6 pb-6 z-10">
              <div
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  borderWidth: '1px',
                  borderColor: '#E2E8F0',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundColor: '#FFFFFF',
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                }}
                className="shadow-sm"
              >
                {/* Header */}
                <div
                  style={{
                    width: '100%',
                    height: '49px',
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: '10px',
                    paddingRight: '10px',
                    paddingBottom: '10px',
                    paddingLeft: '18px',
                    borderBottomWidth: '0.6px',
                    borderBottomColor: '#E2E8F0',
                    borderBottomStyle: 'solid',
                    boxSizing: 'border-box',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: 600,
                      fontSize: 'clamp(16px, 5vw, 18px)',
                      color: '#1E293B',
                      margin: 0,
                    }}
                  >
                    Price Information
                  </h3>
                </div>

                {/* Content Down Box */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '26px',
                    margin: '0 auto',
                    paddingTop: '16px',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Base Fare Row */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      height: '21px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 400,
                        fontSize: 'clamp(12px, 3.5vw, 14px)',
                        lineHeight: '100%',
                        color: '#64748B',
                      }}
                    >
                      Base Fare
                    </span>
                    <span
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 400,
                        fontSize: 'clamp(12px, 3.5vw, 14px)',
                        lineHeight: '100%',
                        color: '#64748B',
                      }}
                    >
                      {formatINR(basePrice + displayedOffersTotal, 2)}
                    </span>
                  </div>

                  {/* Taxes & Fees Row */}
                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        height: '21px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Poppins',
                          fontWeight: 400,
                          fontSize: 'clamp(12px, 3.5vw, 14px)',
                          lineHeight: '100%',
                          color: '#64748B',
                        }}
                      >
                        Taxes & Fees
                      </span>
                      <span
                        style={{
                          fontFamily: 'Poppins',
                          fontWeight: 400,
                          fontSize: 'clamp(12px, 3.5vw, 14px)',
                          lineHeight: '100%',
                          color: '#64748B',
                        }}
                      >
                        {isTaxesIncluded ? 'Included' : formatINR(taxesAndFees, 2)}
                      </span>
                    </div>

                  </div>

                  {/* Offers / Discounts */}
                  {displayedOffers.length > 0 &&
                    displayedOffers.map((offer: any, idx: number) => (
                      <div
                        key={`offer-${idx}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          width: '100%',
                          height: '22px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Poppins',
                            fontWeight: 400,
                            fontSize: 'clamp(12px, 3.5vw, 14px)',
                            lineHeight: '100%',
                            color: '#16a34a', // green-600
                          }}
                        >
                          {formatOfferName(offer.name)}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Poppins',
                            fontWeight: 400,
                            fontSize: 'clamp(12px, 3.5vw, 14px)',
                            lineHeight: '100%',
                            color: '#16a34a', // green-600
                          }}
                        >
                          {Number(offer.value || offer.amount) < 0 ? '-' : ''}{formatINR(Math.abs(Number(offer.value || offer.amount || 0)), 2)}
                        </span>
                      </div>
                    ))}

                  {/* Total Amount Box */}
                  <div
                    style={{
                      backgroundColor: '#E8F2FF',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 500,
                        fontSize: 'clamp(13px, 4vw, 15px)',
                        color: '#1E3A8A',
                      }}
                    >
                      Total Amount
                    </span>
                    <span
                      style={{
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        fontSize: 'clamp(16px, 5vw, 18px)',
                        color: '#1E3A8A',
                      }}
                    >
                      {formatINR(totalAmount, 2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Promo Code & Payment Options Card */}
              <div
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  borderWidth: '1px',
                  borderColor: '#E2E8F0',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  backgroundColor: '#FFFFFF',
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
                  boxSizing: 'border-box',
                }}
                className="shadow-sm"
              >
                {/* Secret Coupon Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Promo Code
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className={`w-full px-4 py-2 border rounded-xl text-xs font-bold transition-all outline-none ${couponCode === import.meta.env.VITE_SECRET_COUPON
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-100 focus:border-blue-200 focus:bg-white'
                        }`}
                      placeholder="Enter code"
                    />
                    {couponCode === import.meta.env.VITE_SECRET_COUPON && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <FaCheckCircle className="text-blue-500" size={12} />
                      </div>
                    )}
                  </div>
                  {couponCode === import.meta.env.VITE_SECRET_COUPON && (
                    <p className="text-[10px] text-blue-600 font-bold">
                      ✓ Corporate Promo Applied: 35% Adjustment
                    </p>
                  )}
                </div>

                {/* Payment Options */}
                <div>
                  <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">
                    Payment Method
                  </h4>
                  <div className="space-y-2 text-[11px]">
                    {[
                      {
                        id: 'card',
                        label: 'Credit / Debit Card',
                        desc: 'Pay securely with your card',
                      },
                    ].map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-all ${selectedPayment === option.id
                          ? 'bg-blue-50 border-blue-400 shadow-sm'
                          : 'border-gray-100 hover:bg-gray-50'
                          }`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={option.id}
                          checked={selectedPayment === option.id}
                          onChange={() => setSelectedPayment(option.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-gray-800">{option.label}</p>
                          <p className="text-gray-500 leading-tight">{option.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* {onHoldAllowed && (
                  <button
                    onClick={() => handleContinueBooking(true)}
                    disabled={isBooking}
                    className={`w-full text-blue-700 font-bold py-3 rounded-xl transition-all border-2 border-blue-100 mb-3 text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
                      isBooking
                        ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
                        : 'bg-blue-50 hover:bg-blue-100 active:scale-[0.98]'
                    }`}
                  >
                    {isBooking ? (
                      <div className="animate-spin h-3 w-3 border-b-2 border-blue-600 rounded-full"></div>
                    ) : (
                      <Clock size={14} />
                    )}
                    Hold Booking (No Payment)
                  </button>
                )} */}

                <button
                  onClick={() => handleContinueBooking(false)}
                  disabled={isBooking}
                  className={`w-full text-white font-black py-4 rounded-xl transition-all shadow-lg text-sm uppercase tracking-widest flex flex-col items-center justify-center gap-1 ${isBooking
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#E81919] hover:bg-red-700 active:scale-[0.98]'
                    }`}
                >
                  {isBooking ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Complete Booking'
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center mt-3">
                  By clicking, you agree to our Terms & Privacy Policy
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECURE BOOKING OVERLAY */}
      {isBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="max-w-md w-full p-8 text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaLock className="text-blue-600 text-2xl animate-pulse" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900">Secure Booking in Progress</h3>
              <p className="text-sm text-gray-500 font-medium animate-pulse">{bookingStep}</p>
            </div>

            <div className="pt-4 flex flex-col items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-8 rounded-full transition-colors duration-500 ${i === 1
                      ? 'bg-blue-600'
                      : i === 2 &&
                        (bookingStep.includes('payment') ||
                          bookingStep.includes('hotel'))
                        ? 'bg-blue-600'
                        : i === 3 &&
                          (bookingStep.includes('hotel') || bookingStep.includes('confirmed'))
                          ? 'bg-blue-600'
                          : 'bg-gray-200'
                      }`}
                  ></div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                Protected by 256-bit Encryption
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelReviewBooking;
