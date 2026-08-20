import {
  setItemWithTTL,
  getItemWithTTL,
  removeItem as removeTTLItem,
} from '@/utils/localStorageWithTTL';
import React, { useState, useEffect, useRef } from 'react';
import {
  FaStar,
  FaMapMarkerAlt,
  FaCamera,
  FaCalendarAlt,
  FaSearch,
  FaChevronRight,
  FaCheckCircle,
  FaInfoCircle,
  FaPen,
} from 'react-icons/fa';
import {
  Utensils,
  Bell,
  Wifi,
  Waves,
  Dumbbell,
  Wine,
  Car,
  Sparkles,
  Briefcase,
  Snowflake,
  Tv,
  Shirt,
  Bus,
  Coffee,
  CheckCircle2,
  X,
  Landmark,
  Train,
  ShoppingBag,
  MapPin,
  Building2,
  Map,
  Calendar,
} from 'lucide-react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import MainNavbar from '../../components/layout/Navbar/MainNavbar';
import {
  getHotelProducts,
  flattenFacilities,
  extractFeatures,
} from '../../features/hotels/services/hotelSearchService';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import LoginForm from '../../features/authentication/components/LoginForm';
import {
  formatHotelImageUrl,
  calculateNights,
  decodeRoomsFromUrl,
  encodeRoomsToUrl,
  formatBedConfig,
  formatHotelAddress,
  formatINR,
  NO_HOTEL_IMAGE,
} from '../../utils/hotelUtils';
import { sortHotelImagesByDimensions } from '../../utils/imageUtils';
import HotelAutocomplete from '@/features/hotels/components/HotelAutocomplete';
import DestinationAutocomplete from '@/features/hotels/components/DestinationAutocomplete';
import RoomGuestSelector from '@/features/hotels/components/RoomGuestSelector';
import { SimilarHotels } from '@/features/hotels/components/SimilarHotels';
import { precheckBooking } from '../../features/hotels/services/hotelBookingService';
import { precheckTJ } from '../../features/hotels/services/tripjackBookingService';
import { resolveRatePricing } from '../../features/hotels/utils/ratePricing';
import { ChildInfo } from '../../features/bookings/types/booking.types';
import InteractiveHotelMap, {
  NearbyPlace,
} from '../../features/hotels/components/InteractiveHotelMap';


const safeGetImageUrl = (img: any): string => {
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (typeof img === 'object') {
    const links = img.links || {};
    const firstLink = Object.values(links)[0] as any;
    return (
      img.links?.original?.href ||
      img.links?.large?.href ||
      img.links?.medium?.href ||
      firstLink?.href ||
      img.href ||
      img.url ||
      img.src ||
      img.link ||
      img['1000px']?.href ||
      img.default?.href ||
      ''
    );
  }
  return String(img);
};

interface RoomCardProps {
  title: string;
  price: string | number;
  netPrice: number;
  image: string;
  images?: string[];
  features: string[];
  oldPrice?: string | number;
  savePercent?: string;
  rateKey?: string;
  boardName?: string;
  adults?: number;
  children?: number;
  roomTypeCode?: string;
  numberOfRooms?: number;
  allotment?: number;
  hotelData: any;
  searchParams: any;
  rateComments?: string;
  cancellationPolicies?: any[];
  offers?: any[];
  taxesInfo?: any;
  isMandatory?: boolean;
  isSelected?: boolean;
  onSelect?: (roomData: any) => void;
  onRequireLogin?: () => void;
  buttonLabel?: string;
  roomIndex?: number;
  variant?: 'featured' | 'grid';
  mealBasis?: string;
  compliance?: {
    panRequired: boolean;
    passportRequired: boolean;
    gstType?: string;
  };
  pricingBreakdown?: any;
  onHoldAllowed?: boolean;
  optionType?: string;
  roomInfo?: any[];
  bookingNotes?: string | null;
  ris?: any[];
  reviewHash?: string;
  correlationId?: string;
  hid?: string;
  bed_config?: string;
  amenities?: string[];
  inclusions?: string[];
  isRefundable?: boolean;
  refundableLabel?: string;
  hotelMainImage?: string;
}

interface ValidationPanelProps {
  products: any[];
  isMultiRoom: boolean;
  isLoading: boolean;
}

const HotelValidationPanel: React.FC<ValidationPanelProps> = ({
  products,
  isMultiRoom,
  isLoading,
}) => {
  if (isLoading) return null;

  // if (!products || products.length === 0) {
  //   return (
  //     <div className="mx-4 my-6 p-6 bg-amber-50 border border-amber-200 rounded-xl flex flex-col items-center text-center">
  //       <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xl font-bold mb-3">
  //         ⚠️
  //       </div>
  //       <h3 className="text-lg font-bold text-amber-900">
  //         Rooms Unavailable for Selected Criteria
  //       </h3>
  //       <p className="text-amber-700 text-sm mt-1 max-w-md">
  //         {isMultiRoom
  //           ? 'The requested multi-room bundle configuration is sold out at this property for your dates. Try reducing the room count or altering your guest distribution.'
  //           : 'This property has no individual rooms matching your room occupancy rules left for these dates.'}
  //       </p>
  //       <button
  //         onClick={() => window.history.back()}
  //         className="mt-4 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
  //       >
  //         Modify Search Parameters
  //       </button>
  //     </div>
  //   );
  // }

  return null;
};

const MAX_ROOM_IMAGES = 5;

const RoomCard: React.FC<RoomCardProps> = ({
  title,
  price,
  netPrice,
  image,
  images = [],
  hotelMainImage,
  features,
  oldPrice,
  savePercent,
  rateKey,
  boardName,
  adults,
  children,
  roomTypeCode,
  hotelData,
  searchParams,
  rateComments,
  cancellationPolicies,
  offers,
  taxesInfo,
  isMandatory,
  isSelected = false,
  onSelect,
  onRequireLogin,
  buttonLabel,
  roomIndex = 0,
  variant = 'grid',
  reviewHash,
  correlationId,
  hid,
  mealBasis,
  compliance,
  pricingBreakdown,
  onHoldAllowed,
  optionType,
  roomInfo,
  bookingNotes,
  ris,
  bed_config,
  amenities,
  inclusions = [],
  isRefundable,
  refundableLabel,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [precheckErrorMsg, setPrecheckErrorMsg] = useState<string | null>(null);
  const [showAllAmenitiesModal, setShowAllAmenitiesModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const totalAdults =
    roomInfo?.reduce((sum, room) => sum + (room.adt || room.adults || 0), 0) || adults || 0;
  const totalChildren =
    roomInfo?.reduce((sum, room) => sum + (room.chd || room.children || 0), 0) || children || 0;
  const totalRooms = roomInfo?.length || 1;

  const formattedBedConfig =
    typeof bed_config === 'object' ? formatBedConfig(bed_config) : bed_config;
  const hasValidBedConfig =
    typeof formattedBedConfig === 'string' &&
    formattedBedConfig.trim() !== '' &&
    formattedBedConfig.toLowerCase() !== 'null' &&
    formattedBedConfig.toLowerCase() !== 'undefined';

  // Enforce capacity limits (mga, maa, mca) from radi object
  const capacityErrors = React.useMemo(() => {
    if (
      !roomInfo ||
      !Array.isArray(roomInfo) ||
      !searchParams?.rooms ||
      !Array.isArray(searchParams.rooms)
    ) {
      return null;
    }

    const errorsList: string[] = [];

    roomInfo.forEach((ri: any, idx: number) => {
      const searchRoom = searchParams.rooms[idx] || searchParams.rooms[0];
      if (!searchRoom) return;

      const adultsCount = Number(searchRoom.Adults || searchRoom.adults || 0);
      const childrenCount = Number(searchRoom.Children || searchRoom.children || 0);
      const guestsCount = adultsCount + childrenCount;

      const radi = ri.radi;
      if (radi) {
        const mga = radi.mga !== undefined && radi.mga !== null ? Number(radi.mga) : Infinity;
        const maa = radi.maa !== undefined && radi.maa !== null ? Number(radi.maa) : Infinity;
        const mca = radi.mca !== undefined && radi.mca !== null ? Number(radi.mca) : Infinity;

        if (guestsCount > mga) {
          errorsList.push(`Room ${idx + 1}: Max ${mga} guests allowed (searched ${guestsCount})`);
        } else {
          if (adultsCount > maa) {
            errorsList.push(`Room ${idx + 1}: Max ${maa} adults allowed (searched ${adultsCount})`);
          }
          if (childrenCount > mca) {
            errorsList.push(
              `Room ${idx + 1}: Max ${mca} children allowed (searched ${childrenCount})`,
            );
          }
        }
      }
    });

    return errorsList.length > 0 ? errorsList : null;
  }, [roomInfo, searchParams?.rooms]);

  const isCapacityExceeded = !!capacityErrors;

  // Empty when the room has no photo. The renderer already has a proper "No
  // Photo" state for that; the stock library shot that used to sit here just
  // hid the gap behind a picture of somebody else's hotel.
  const allImages = React.useMemo(() => {
    if (images && images.length > 0) return images;
    if (image) return [image];
    if (hotelMainImage) return [hotelMainImage];
    return [];
  }, [image, images, hotelMainImage]);

  useEffect(() => {
    console.log(`🔍 [RoomCard: "${title}"] images count:`, allImages.length, 'URLs:', allImages);
  }, [title, allImages]);

  const maxImages = Math.min(allImages.length, MAX_ROOM_IMAGES);

  useEffect(() => {
    if (!isHovered || maxImages <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % maxImages);
    }, 2500);
    return () => clearInterval(interval);
  }, [isHovered, maxImages]);

  // Sync scroll position with currentImageIndex (auto-rotation or click updates scroll)
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const targetScrollLeft = container.clientWidth * currentImageIndex;
      if (Math.abs(container.scrollLeft - targetScrollLeft) > 10) {
        container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
      }
    }
  }, [currentImageIndex]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const index = Math.round(scrollLeft / (clientWidth || 1));
      if (index !== currentImageIndex && index < maxImages) {
        setCurrentImageIndex(index);
      }
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scrollRef.current) {
      const nextIndex = (currentImageIndex + 1) % maxImages;
      scrollRef.current.scrollTo({
        left: scrollRef.current.clientWidth * nextIndex,
        behavior: 'smooth',
      });
      setCurrentImageIndex(nextIndex);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scrollRef.current) {
      const prevIndex = (currentImageIndex - 1 + maxImages) % maxImages;
      scrollRef.current.scrollTo({
        left: scrollRef.current.clientWidth * prevIndex,
        behavior: 'smooth',
      });
      setCurrentImageIndex(prevIndex);
    }
  };

  const nights = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inDate =
      searchParams?.checkIn ||
      searchParams?.checkin ||
      urlParams.get('checkin') ||
      urlParams.get('checkIn');
    const outDate =
      searchParams?.checkOut ||
      searchParams?.checkout ||
      urlParams.get('checkout') ||
      urlParams.get('checkOut');
    return calculateNights(inDate, outDate);
  }, [searchParams]);

  const taxesDetails = (() => {
    let included = 0;
    let excluded = 0;
    const breakdown: any[] = [];

    if (taxesInfo?.taxes && Array.isArray(taxesInfo.taxes)) {
      taxesInfo.taxes.forEach((t: any) => {
        const amt =
          t.clientCurrency === 'INR'
            ? Number(t.clientAmount)
            : Number(t.clientAmount || t.amount) || 0;

        const isIncluded =
          t.included === true ||
          t.included === 'true' ||
          t.included === 1 ||
          t.allIncluded === true;

        if (isIncluded) {
          included += amt;
        } else {
          excluded += amt;
        }

        breakdown.push({
          name: t.description || 'Tax',
          amount: amt,
          included: isIncluded,
        });
      });
    } else if (typeof taxesInfo === 'number') {
      excluded = taxesInfo;
      breakdown.push({ name: 'Taxes & Fees', amount: excluded, included: false });
    }

    if (excluded === 0 && pricingBreakdown?.taxes) {
      excluded = Number(pricingBreakdown.taxes) || 0;
    }

    return { included, excluded, breakdown };
  })();

  const taxesAmountInINR = taxesDetails.excluded;
  const includedTaxesAmount = taxesDetails.included;

  // Calculate perNightPrice based on basePrice divided by nights
  const basePriceForNight =
    pricingBreakdown?.basePrice ?? Math.max(0, Number(price) - taxesAmountInINR);
  const perNightPrice = basePriceForNight / Math.max(nights, 1);

  const buildRoomData = () => ({
    title,
    price, // full precision
    image,
    rateKey,
    boardName: boardName || mealBasis || '',
    mealBasis: mealBasis || boardName || '',
    adults,
    children,
    roomTypeCode,
    rateComments,
    cancellationPolicies,
    amenities: features || [],
    checkInTime: hotelData.checkInTime,
    checkOutTime: hotelData.checkOutTime,
    offers: offers || [],
    taxesInfo: taxesInfo || null,
    isMandatory: isMandatory || false,
    netPriceInINR: Number(netPrice || 0),
    discountAmountInINR: Number(
      offers?.reduce(
        (sum: number, o: any) => sum + Math.abs(parseFloat(o.value || o.amount || '0') || 0),
        0,
      ) || 0,
    ),
    taxesAmountInINR,
    roomIndex,
    reviewHash: reviewHash || '',
    correlationId: correlationId || '',
    hid: hid || '',
    pricing: pricingBreakdown || null,
    onHoldAllowed: onHoldAllowed,
    optionType,
    roomInfo,
    optionId: rateKey,
  });

  const handleSelect = async () => {
    setPrecheckErrorMsg(null);
    setIsPrechecking(true);
    const roomData = buildRoomData(); // full precision preserved

    try {
      let precheckResponse: any = { status: true }; // Default to true for RateGain

      if (hotelData?.id?.startsWith('TJ:')) {
        const tjPrecheckPayload = {
          propertyId: hotelData.id,
          optionId: rateKey || roomData.rateKey || '',
          reviewHash: roomData.reviewHash || '',
          correlationId: roomData.correlationId || '',
          hid: roomData.hid || '',
        };
        precheckResponse = await precheckTJ(tjPrecheckPayload);
      } else {
        console.log(
          'Skipping RateGain precheck on room selection. Will precheck at Review Booking after taking user data.',
        );
      }

      if (
        precheckResponse.status === 'success' ||
        precheckResponse.status === true ||
        precheckResponse.statusCode === 200
      ) {
        if (onSelect) {
          onSelect(roomData);
        } else {
          const cleanParams = new URLSearchParams();
          cleanParams.set('hotelId', hotelData.id || '');
          cleanParams.set('checkIn', searchParams?.checkIn || '');
          cleanParams.set('checkOut', searchParams?.checkOut || '');
          cleanParams.set('optionId', rateKey || roomData.rateKey || '');
          cleanParams.set('rooms', encodeRoomsToUrl(searchParams?.rooms || []));
          if (searchParams?.destinationCode)
            cleanParams.set('destCode', searchParams.destinationCode);

          if (hotelData?.id?.startsWith('TJ:')) {
            if (roomData.reviewHash) cleanParams.set('reviewHash', roomData.reviewHash);
            if (roomData.correlationId) cleanParams.set('correlationId', roomData.correlationId);
            if (roomData.hid) cleanParams.set('hid', roomData.hid);
            if (roomData.onHoldAllowed) cleanParams.set('hold', '1');
          }

          navigate(`/hotels/review-booking?${cleanParams.toString()}`, {
            state: {
              hotelData,
              searchParams,
              selectedRoom: roomData,
              selectedRooms: [roomData],
              precheckResponseData: precheckResponse,
            },
          });
        }
      } else {
        setPrecheckErrorMsg(
          precheckResponse.message || 'This room is no longer available. Please select another.',
        );
      }
    } catch (err: any) {
      console.error('Precheck Failed:', err);
      let errorMessage =
        err.response?.data?.description ||
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'This room is no longer available. Please try again.';

      if (
        errorMessage.toLowerCase().includes('expired') ||
        err.response?.data?.errors?.[0]?.errCode === '2503'
      ) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      }
      setPrecheckErrorMsg(errorMessage);
    } finally {
      setIsPrechecking(false);
    }
  };

  if (variant === 'featured') {
    const isCombo = optionType === 'CRCM' || optionType === 'CRSM';
    const roomTitle = isCombo ? 'Mixed Rooms / Mixed Meals' : title;

    // Cancellation policy
    const isFreeCancel = (cancellationPolicies &&
      cancellationPolicies.length > 0 &&
      parseFloat(cancellationPolicies[0].amount) === 0) ||
      isRefundable === true ||
      (hotelData?.cancellationPolicy && hotelData.cancellationPolicy.toUpperCase().includes('FREE CANCELLATION'));

    let formattedCancelStr = isFreeCancel ? (refundableLabel || '✓ Free Cancellation') : (refundableLabel || 'X Non Refundable');
    const isRefPolicy = isFreeCancel;
    const isNonRefPolicy = !isFreeCancel;

    // Amenities
    const mealStr =
      features.find(
        (f) =>
          f.includes('Room Only') ||
          f.includes('Breakfast') ||
          f.includes('Board') ||
          f.includes('Inclusive') ||
          f.includes('Meal'),
      ) ||
      mealBasis ||
      'Room Only';
    const otherFeatures = features.filter(
      (f) =>
        f !== mealStr &&
        !f.toLowerCase().includes('cancellation') &&
        !f.toLowerCase().includes('refundable') &&
        !f.includes('left!'),
    );

    const cleanAmenities = React.useMemo(() => {
      const list = [...otherFeatures];
      if (list.length === 0) {
        const fallbackAm = (amenities || []).slice(0, 2);
        list.push(...fallbackAm);
      }
      return list.join(' , ');
    }, [otherFeatures, amenities]);

    return (
      <div
        className={`w-full rounded-[20px] pt-[10px] pr-[20px] pb-[10px] pl-[20px] bg-[#E9EBF8B2] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col justify-between shrink-0 font-sans transition-all select-none border-0 outline-none ring-0 h-full ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      >
        <div className="flex flex-col justify-between h-full w-full">
          {/* Upper Part Inside Box */}
          <div className="flex flex-col gap-[11px] w-full mt-2">
            {/* Name */}
            <h3
              className="text-[20px] font-bold text-[#000000] leading-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {roomTitle}
            </h3>

            {/* Fits */}
            <p
              className="text-[16px] font-medium text-[#3C3B3D] leading-none"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {roomInfo && roomInfo.length > 1
                ? `Fits ${totalAdults} Adult - ${totalChildren} Child`
                : `Fits ${roomInfo?.[0]?.adults ?? adults ?? 2} Adult - ${roomInfo?.[0]?.children ?? children ?? 0} Child`}
            </p>

            {/* Bed Config */}
            {hasValidBedConfig && (
              <p
                className="text-[16px] font-medium text-[#3C3B3D] leading-none flex items-center gap-1.5"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span className="shrink-0">🛏️</span>
                <span>{formattedBedConfig}</span>
              </p>
            )}

            {/* Meal Plan */}
            {mealStr && (
              <p
                className="text-[16px] font-medium text-[#3C3B3D] leading-none flex items-center gap-1.5"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span className="shrink-0">🍽️</span>
                <span>{mealStr}</span>
              </p>
            )}

            {/* Amenities */}
            {cleanAmenities && (
              <div
                className="flex items-start gap-1.5 text-[14px] font-medium text-[#000000] leading-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <svg
                  width="16"
                  height="13"
                  viewBox="0 0 18 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="shrink-0 mt-0.5"
                >
                  <path
                    d="M4 14V11H12V14H14V9H2V14H4ZM0 6H16V8H0V6ZM2 0H14V4H2V0Z"
                    fill="#000000"
                  />
                </svg>
                <span className="line-clamp-1">{cleanAmenities}</span>
              </div>
            )}

            {/* Cancellation Policy Badge */}
            {(isRefPolicy || isNonRefPolicy) && (
              <div className="flex mt-1">
                <span
                  className={`text-[16px] font-medium tracking-normal leading-[100%] flex items-center ${isRefPolicy
                    ? 'text-green-700'
                    : 'text-red-700'
                    }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {formattedCancelStr}
                </span>
              </div>
            )}
          </div>

          {/* Downpart */}
          <div className="flex flex-col gap-4 mt-auto mb-2 w-[353px] max-w-full">
            {/* Price */}
            <div className="flex flex-col gap-[6px]">
              <p
                className="text-[#737474] text-[14px] font-normal leading-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {roomInfo && roomInfo.length > 1 ? 'Package Total / Night :' : 'Per Room / Night :'}
              </p>
              <p className="flex flex-col gap-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span className="text-[18px] font-black text-[#1C1B20] leading-none">
                  {formatINR(perNightPrice, 2)}
                </span>
                {taxesAmountInINR > 0 ? (
                  <span className="text-[12px] font-medium text-gray-500">
                    + {formatINR(taxesAmountInINR, 2)} taxes &amp; fees
                  </span>
                ) : (
                  <span className="text-[12px] font-medium text-gray-500">(Incl. taxes)</span>
                )}
              </p>
            </div>

            {/* Book Now Button */}
            <button
              onClick={handleSelect}
              disabled={isCapacityExceeded || isPrechecking}
              className={`w-full h-[46px] rounded-[5px] uppercase font-bold text-white text-sm flex items-center justify-center transition-all ${isCapacityExceeded || isPrechecking ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-[#F22329E5] hover:bg-[#D31F25] active:scale-95 shadow-md'}`}
            >
              {isCapacityExceeded ? (
                'Capacity Exceeded'
              ) : isPrechecking ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{' '}
                  Verifying
                </span>
              ) : (
                buttonLabel || 'BOOK NOW'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }


  // Grid variant (Available Rooms section) — Figma-spec 3-column card
  return (() => {
    // ── Derived values for middle column ──
    const mealStr =
      (roomInfo && roomInfo[0]?.mealBasis) ||
      (roomInfo && roomInfo[0]?.boardName) ||
      boardName ||
      mealBasis ||
      features.find(
        (f) =>
          f.includes('Room Only') ||
          f.includes('Breakfast') ||
          f.includes('Board') ||
          f.includes('Inclusive') ||
          f.includes('Meal'),
      ) ||
      '';

    const isFreeCancel = (cancellationPolicies &&
      cancellationPolicies.length > 0 &&
      parseFloat(cancellationPolicies[0].amount) === 0) ||
      isRefundable === true ||
      (hotelData?.cancellationPolicy && hotelData.cancellationPolicy.toUpperCase().includes('FREE CANCELLATION'));

    let cancelStr = isFreeCancel ? (refundableLabel || '✓ Free Cancellation') : (refundableLabel || 'Non Refundable');
    const isRefPolicy = isFreeCancel;

    const otherFeatures = features.filter(
      (f) =>
        (!mealStr ||
          (!f.toLowerCase().includes(mealStr.toLowerCase()) &&
            !mealStr.toLowerCase().includes(f.toLowerCase()))) &&
        !f.toLowerCase().includes('cancellation') &&
        !f.toLowerCase().includes('refundable') &&
        !f.includes('left!'),
    );
    const fullAmenitiesList = [...new Set([...(amenities || []), ...otherFeatures])];
    const allAmenities = fullAmenitiesList.slice(0, 6);
    const bedLabel = hasValidBedConfig ? formattedBedConfig : null;
    const maxGuests = roomInfo && roomInfo.length > 1
      ? `MAX ${totalAdults + totalChildren} GUESTS`
      : adults
        ? `MAX ${adults + (children || 0)} GUESTS`
        : null;

    const creditOffer = offers?.find((o: any) =>
      (o.name || o.description || '').toLowerCase().includes('credit') ||
      (o.name || o.description || '').toLowerCase().includes('emi') ||
      (o.name || o.description || '').toLowerCase().includes('card') ||
      (o.name || o.description || '').toLowerCase().includes('offer')
    );
    const bannerText = creditOffer
      ? (creditOffer.description || creditOffer.name || '').replace(/\s?\(\d+\)/g, '')
      : bookingNotes
        ? bookingNotes.slice(0, 80)
        : null;

    return (
      <div
        className={`bg-white rounded-[8px] border border-[#E5E7EB] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] w-full lg:h-[220px] overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col lg:flex-row ${isSelected ? 'ring-2 ring-blue-600' : ''}`}
      >
        {/* ── LEFT: Image carousel ── */}
        {allImages.length > 0 && (
          <div
            className="relative overflow-hidden bg-[#D9D9D9] group/room shrink-0 w-full h-[220px] sm:h-[260px] md:h-[280px] lg:w-[280px] lg:h-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {allImages.slice(0, MAX_ROOM_IMAGES).map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={formatHotelImageUrl(imgUrl)}
                  alt={`${title} - view ${idx + 1}`}
                  className="w-full h-full object-cover object-center shrink-0 snap-start transition-transform duration-700 group-hover/room:scale-105"
                  style={{ minWidth: '100%' }}
                />
              ))}
            </div>
            {allImages.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/room:opacity-100 transition-opacity z-20">
                <button onClick={handlePrevImage} className="w-7 h-7 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all">
                  <FaChevronRight className="rotate-180" size={10} />
                </button>
                <button onClick={handleNextImage} className="w-7 h-7 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm transition-all">
                  <FaChevronRight size={10} />
                </button>
              </div>
            )}
            {allImages.length > 1 && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {allImages.slice(0, MAX_ROOM_IMAGES).map((_, idx) => (
                  <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
            )}
            {allImages.length > 1 && (
              <div className="absolute bottom-2.5 right-2.5 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded backdrop-blur-sm z-20">
                {allImages.length} PHOTOS
              </div>
            )}
          </div>
        )}

        {/* ── MIDDLE + RIGHT wrapper: stacks on mobile, side-by-side on md, split into 2 at lg ── */}
        <div className="flex flex-col md:flex-row flex-1 min-w-0">

          {/* ── MIDDLE: Room details ── */}
          <div className="flex flex-col justify-between flex-1 min-w-0 border-b md:border-b-0 md:border-r border-[#F3F4F6] p-4 sm:p-5 lg:p-6">
            {/* Title + max guests */}
            <div className="pb-2">
              <div className="flex items-start justify-between gap-2 pb-2">
                <h3
                  className="font-bold text-[#111827] text-base sm:text-lg lg:text-[20px] leading-snug lg:leading-[28px]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {optionType === 'CRCM' || optionType === 'CRSM' ? 'Mixed Rooms / Mixed Meals' : title}
                </h3>
                {maxGuests && (
                  <span
                    className="text-[10px] font-medium text-[#6B7280] shrink-0 pt-1"
                    style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.5px' }}
                  >
                    {maxGuests}
                  </span>
                )}
              </div>

              {/* Bed & bathroom — dynamic from backend */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {bedLabel && (
                  <span
                    className="flex items-center gap-1.5 text-[13px] sm:text-[14px] text-[#4B5563]"
                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
                  >
                    <span>🛏</span><span>{bedLabel}</span>
                  </span>
                )}
                <span
                  className="flex items-center gap-1.5 text-[13px] sm:text-[14px] text-[#4B5563]"
                  style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
                >
                  <span>🚿</span><span>1 Bathroom</span>
                </span>
              </div>
            </div>

            {/* Meal / board plan — dynamic from backend */}
            {mealStr && (
              <div className="pb-3 lg:pb-4">
                <div className="flex items-center gap-2">
                  <Utensils size={13} className="shrink-0 text-[#4B5563]" />
                  <span
                    className="text-[13px] sm:text-[14px] text-[#4B5563]"
                    style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
                  >
                    {mealStr}
                  </span>
                </div>
              </div>
            )}

            {/* Amenities grid — 1 col on xs, 2 col on sm+ (3 rows × 2 cols matching Figma at lg) */}
            {allAmenities.length > 0 && (
              <div className="pb-3 lg:pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
                  {allAmenities.map((amenity, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 truncate text-[11px] text-[#4B5563]"
                      style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400, lineHeight: '16.5px' }}
                    >
                      <span className="w-1 h-1 rounded-full bg-[#6B7280] shrink-0" />{amenity}
                    </span>
                  ))}
                  {fullAmenitiesList.length > 6 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowAllAmenitiesModal(true);
                      }}
                      className="text-[11.5px] text-blue-600 hover:text-blue-800 font-bold flex items-center leading-none mt-1 hover:underline text-left bg-transparent border-none p-0 outline-none cursor-pointer"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      + {fullAmenitiesList.length - 6} More
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inclusions (filtered to remove redundant meal/breakfast fallback) */}
            {(() => {
              const cleanInclusions = (inclusions || []).filter(
                (inc) =>
                  !mealStr ||
                  (!inc.toLowerCase().includes(mealStr.toLowerCase()) &&
                    !mealStr.toLowerCase().includes(inc.toLowerCase()))
              );
              if (cleanInclusions.length === 0) return null;
              return (
                <div className="pb-3 lg:pb-4">
                  <div className="flex flex-col gap-1">
                    {cleanInclusions.slice(0, 3).map((inc, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold truncate"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {inc}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Bottom: cancellation, compliance, capacity, offers */}
            <div className="flex flex-col gap-1 mt-auto">
              {(() => {
                // No supplier exemption. This used to read
                // `&& source !== 'RateGain' && source !== 'RG'`, which meant a
                // RateGain room NEVER showed the non-refundable warning — including
                // when it genuinely was non-refundable. Both adapters share one
                // convention (isRefundable: true / false / undefined for unknown),
                // so supplier identity says nothing here that the data doesn't.
                const isNonRef = !isRefPolicy;
                if (isRefPolicy || isNonRef) {
                  return (
                    <span
                      className={`text-[11px] font-medium flex items-center gap-1 ${isRefPolicy ? 'text-green-700' : 'text-red-600'}`}
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {cancelStr}
                    </span>
                  );
                }
                return null;
              })()}
              {compliance && (compliance.panRequired || compliance.passportRequired) && (
                <div className="flex gap-2">
                  {compliance.panRequired && <span className="text-[11px] font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>PAN Required</span>}
                  {compliance.passportRequired && <span className="text-[11px] font-medium text-gray-600" style={{ fontFamily: 'Inter, sans-serif' }}>Passport Required</span>}
                </div>
              )}
              {isCapacityExceeded && (
                <div className="p-1.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 font-semibold">
                  ⚠️ Capacity Exceeded
                  {capacityErrors && capacityErrors.map((err, i) => <div key={i}>• {err}</div>)}
                </div>
              )}
              {(savePercent || (offers && offers.length > 0)) && (
                <div className="flex flex-wrap gap-1.5">
                  {savePercent && <span className="bg-[#E81919] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Save {savePercent}</span>}
                  {offers && offers.map((offer: any, idx: number) => {
                    const cleanedName = (offer.name || 'Offer').replace(/\s?\(\d+\)/g, '');
                    return <span key={idx} className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded">{cleanedName}</span>;
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Price + Book ── */}
          <div className="flex flex-col justify-between p-4 sm:p-5 lg:p-6 shrink-0 w-full md:w-[220px] lg:w-[320px] xl:w-[404px]">
            {/* Price — perNightPrice as headline, mf+mft as tax line, finalTotalPrice as total */}
            <div className="flex flex-col items-start md:items-end">
              {(() => {
                const totalNights = Math.max(1, calculateNights(searchParams?.checkIn, searchParams?.checkOut) || 1);

                // Extract pricing elements
                const totalMarkup = Number(pricingBreakdown?.markupAmount || 0);
                // For RateGain: pricingBreakdown.basePrice is null, so derive base by subtracting
                // excluded taxes (taxesAmountInINR) from price. Do NOT use price directly —
                // it's the gross total and includes excluded taxes.
                const rawBasePrice = pricingBreakdown?.basePrice != null
                  ? Number(pricingBreakdown.basePrice)
                  : Math.max(0, Number(price) - taxesAmountInINR - totalMarkup);

                // headline perNightPrice: base + markup (taxes excluded)
                const displayPerNight = (rawBasePrice + totalMarkup) / totalNights;

                // Taxes & fees per night
                const mfAmount = Number(pricingBreakdown?.mf || 0);
                const mftAmount = Number(pricingBreakdown?.mft || 0);
                const pricingTaxes = Number(pricingBreakdown?.taxes || 0);
                // Avoid double-counting: if pricing.taxes is 0 (RateGain), use taxesAmountInINR
                const backendTaxes = (mfAmount + mftAmount + pricingTaxes) > 0
                  ? mfAmount + mftAmount + pricingTaxes
                  : taxesAmountInINR;
                const taxFeeTotal = backendTaxes;
                const taxFeePerNight = taxFeeTotal / totalNights;

                // Final total price
                const displayTotal = pricingBreakdown?.finalTotalPrice
                  ? Number(pricingBreakdown.finalTotalPrice)
                  : Number(price);

                const fmt = (n: number) =>
                  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                return (
                  <>
                    {/* Old / strikethrough price */}
                    {oldPrice && Number(oldPrice) > 0 && (
                      <span
                        className="line-through text-[13px] text-[#9CA3AF]"
                        style={{ fontFamily: 'Inter, sans-serif', fontWeight: 400 }}
                      >
                        ₹{fmt(Number(oldPrice))}
                      </span>
                    )}

                    {/* Per-night price — headline */}
                    <span
                      className="font-bold text-[#111827] text-[22px] sm:text-[26px] lg:text-[30px] leading-tight lg:leading-[36px]"
                      style={{ fontFamily: 'Inter, sans-serif', textAlign: 'right' }}
                    >
                      ₹{fmt(displayPerNight)}
                    </span>

                    {/* Per-night label */}
                    <span
                      className="text-[10px] font-medium text-[#6B7280] mt-0.5 text-left md:text-right"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      per night
                    </span>

                    {/* Taxes & Fees line */}
                    {taxFeePerNight > 0 ? (
                      <span
                        className="text-[10px] font-medium text-[#6B7280] mt-0.5 text-left md:text-right"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        + ₹{fmt(taxFeePerNight)} Taxes &amp; Fees per night
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-medium text-[#6B7280] mt-0.5 text-left md:text-right"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        Incl. Taxes &amp; Fees
                      </span>
                    )}

                    {/* Total price */}
                    <span
                      className="text-[11px] font-semibold text-[#374151] mt-1.5 text-left md:text-right"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      Total: ₹{fmt(displayTotal)}
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Book + banner */}
            <div className="flex flex-col gap-3 pt-4">
              {precheckErrorMsg && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 font-semibold">{precheckErrorMsg}</div>
              )}
              {/* BOOK NOW — red #F2383E from Figma */}
              <button
                onClick={handleSelect}
                disabled={isCapacityExceeded || isPrechecking}
                className="w-full h-11 rounded-lg font-bold text-white text-[13px] sm:text-[14px] tracking-wide flex items-center justify-center transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed"
                style={{
                  background: isCapacityExceeded || isPrechecking ? '#9CA3AF' : isSelected ? '#16a34a' : '#F2383E',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '0.5px',
                  border: 'none',
                }}
              >
                {isCapacityExceeded ? 'CAPACITY EXCEEDED' : isPrechecking ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying
                  </span>
                ) : isSelected ? (
                  <span className="flex items-center gap-1"><FaCheckCircle size={12} /> SELECTED</span>
                ) : (buttonLabel || 'BOOK NOW')}
              </button>

              {/* Cyan offer banner — dynamic from offers/bookingNotes */}
              {bannerText && (
                <div
                  className="flex items-center gap-2 rounded-md p-3 border"
                  style={{ background: '#ECFEFF', borderColor: '#CFFAFE', minHeight: '48px' }}
                >
                  <span
                    className="text-[10px] font-medium text-[#0891B2] flex-1 leading-[15px] line-clamp-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {bannerText}
                  </span>
                  <button
                    className="text-[10px] font-bold text-[#0891B2] whitespace-nowrap bg-transparent border-none cursor-pointer"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    SELECT TO AVAIL
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>{/* end middle+right wrapper */}

        {/* Room All Amenities Modal Popup */}
        {showAllAmenitiesModal && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowAllAmenitiesModal(false);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start p-5 border-b border-gray-100 bg-[#FAFAFA]">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">{title}</h2>
                  <p className="text-xs text-gray-500 mt-1">Full list of room facilities and amenities</p>
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllAmenitiesModal(false);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3.5">
                  {fullAmenitiesList.map((amenity, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-700 leading-tight">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowAllAmenitiesModal(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  })();
};

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  hotelName: string;
}

const GalleryModal: React.FC<GalleryModalProps> = ({ isOpen, onClose, images, hotelName }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex + 1) % images.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((selectedImageIndex - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in fade-in duration-300">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{hotelName}</h2>
          <p className="text-sm text-gray-500">{images.length} Photos</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600 hover:text-gray-900"
        >
          <FaChevronRight className="rotate-180" size={24} />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {images.map((img, idx) => (
            <div
              key={idx}
              className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-xl shadow-sm hover:shadow-xl transition-all duration-500"
              onClick={() => setSelectedImageIndex(idx)}
            >
              <img
                src={formatHotelImageUrl(img)}
                alt={`${hotelName} - ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 animate-in zoom-in duration-300"
          onClick={() => setSelectedImageIndex(null)}
        >
          <button
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 text-3xl transition-colors"
            onClick={() => setSelectedImageIndex(null)}
          >
            ✕
          </button>

          <div className="relative w-full max-w-5xl max-h-[85vh] flex items-center justify-center">
            <button
              className="absolute -left-12 lg:-left-20 text-white/50 hover:text-white p-4 transition-colors"
              onClick={handlePrev}
            >
              <FaChevronRight className="rotate-180" size={40} />
            </button>

            <img
              src={formatHotelImageUrl(images[selectedImageIndex])}
              alt="Full View"
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
            />

            <button
              className="absolute -right-12 lg:-right-20 text-white/50 hover:text-white p-4 transition-colors"
              onClick={handleNext}
            >
              <FaChevronRight size={40} />
            </button>
          </div>

          <div className="mt-8 text-white/70 text-sm font-medium">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </div>
  );
};

/** Detail-page section tabs, in display order, mapped to their anchor ids. */
const TAB_SECTION_IDS: Record<string, string> = {
  Description: 'section-description',
  Rooms: 'section-rooms',
  Location: 'section-location',
  Facilities: 'section-facilities',
  Policies: 'section-policies',
};
const TAB_ORDER = Object.keys(TAB_SECTION_IDS);

interface FacilitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  amenities: string[];
  hotelName: string;
}

const FacilitiesModal: React.FC<FacilitiesModalProps> = ({
  isOpen,
  onClose,
  amenities,
  hotelName,
}) => {
  if (!isOpen) return null;

  const categories = categorizeAmenities(amenities);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Hotel Facilities</h2>
            <p className="text-sm text-gray-500 mt-1">{hotelName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-900 shadow-sm hover:shadow-md"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-8 space-y-10 custom-scrollbar">
          {Object.entries(categories).map(([category, list]) => (
            <div key={category}>
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                {category}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((amenity: string, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-full border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all text-gray-700 hover:text-gray-900"
                  >
                    <div className="flex items-center justify-center text-gray-500">
                      {getAmenityIcon(amenity)}
                    </div>
                    <span className="text-sm font-medium leading-tight line-clamp-2">
                      {amenity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getAmenityIcon = (name: string) => {
  const lower = name.toLowerCase();
  const iconClass = "text-gray-800";
  if (lower.includes('wifi') || lower.includes('internet'))
    return <Wifi size={18} className={iconClass} />;
  if (lower.includes('pool') || lower.includes('swimming'))
    return <Waves size={18} className={iconClass} />;
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('health club'))
    return <Dumbbell size={18} className={iconClass} />;
  if (
    lower.includes('restaurant') ||
    lower.includes('dining') ||
    lower.includes('breakfast') ||
    lower.includes('buffet')
  )
    return <Utensils size={18} className={iconClass} />;
  if (lower.includes('bar') || lower.includes('cocktail') || lower.includes('lounge'))
    return <Wine size={18} className={iconClass} />;
  if (lower.includes('parking') || lower.includes('valet'))
    return <Car size={18} className={iconClass} />;
  if (
    lower.includes('spa') ||
    lower.includes('sauna') ||
    lower.includes('massage') ||
    lower.includes('steam')
  )
    return <Sparkles size={18} className={iconClass} />;
  if (lower.includes('business') || lower.includes('meeting') || lower.includes('conference'))
    return <Briefcase size={18} className={iconClass} />;
  if (lower.includes('air conditioning') || lower.includes('ac'))
    return <Snowflake size={18} className={iconClass} />;
  if (lower.includes('tv') || lower.includes('television'))
    return <Tv size={18} className={iconClass} />;
  if (lower.includes('laundry') || lower.includes('dry cleaning'))
    return <Shirt size={18} className={iconClass} />;
  if (
    lower.includes('concierge') ||
    lower.includes('reception') ||
    lower.includes('bellboy') ||
    lower.includes('room service')
  )
    return <Bell size={18} className={iconClass} />;
  if (lower.includes('shuttle') || lower.includes('transfer') || lower.includes('bus'))
    return <Bus size={18} className={iconClass} />;
  if (lower.includes('coffee') || lower.includes('cafe'))
    return <Coffee size={18} className={iconClass} />;
  if (lower.includes('board') || lower.includes('segment'))
    return <Sparkles size={18} className={iconClass} />;

  return <CheckCircle2 size={18} className={iconClass} />;
};

const categorizeAmenities = (amenities: string[]) => {
  const categories: { [key: string]: string[] } = {
    'Food & Drink': [],
    'Wellness & Spa': [],
    'Services & Convenience': [],
    'Business & Meeting': [],
    'Room Features': [],
    'Hotel Information': [],
    'General Facilities': [],
  };

  amenities.forEach((amenity) => {
    const lower = amenity.toLowerCase();
    if (
      lower.includes('restaurant') ||
      lower.includes('bar') ||
      lower.includes('breakfast') ||
      lower.includes('dining') ||
      lower.includes('coffee') ||
      lower.includes('buffet') ||
      lower.includes('lounge')
    ) {
      if (categories['Food & Drink']) categories['Food & Drink'].push(amenity);
    } else if (
      lower.includes('pool') ||
      lower.includes('swimming') ||
      lower.includes('gym') ||
      lower.includes('fitness') ||
      lower.includes('spa') ||
      lower.includes('sauna') ||
      lower.includes('massage') ||
      lower.includes('wellness')
    ) {
      if (categories['Wellness & Spa']) categories['Wellness & Spa'].push(amenity);
    } else if (
      lower.includes('wifi') ||
      lower.includes('internet') ||
      lower.includes('parking') ||
      lower.includes('laundry') ||
      lower.includes('reception') ||
      lower.includes('concierge') ||
      lower.includes('shuttle') ||
      lower.includes('transfer')
    ) {
      if (categories['Services & Convenience']) categories['Services & Convenience'].push(amenity);
    } else if (
      lower.includes('business') ||
      lower.includes('meeting') ||
      lower.includes('conference')
    ) {
      if (categories['Business & Meeting']) categories['Business & Meeting'].push(amenity);
    } else if (
      lower.includes('air conditioning') ||
      lower.includes('tv') ||
      lower.includes('television') ||
      lower.includes('safe') ||
      lower.includes('mini bar')
    ) {
      if (categories['Room Features']) categories['Room Features'].push(amenity);
    } else if (lower.includes('board') || lower.includes('segment')) {
      if (categories['Hotel Information']) categories['Hotel Information'].push(amenity);
    } else {
      if (categories['General Facilities']) categories['General Facilities'].push(amenity);
    }
  });

  return Object.fromEntries(Object.entries(categories).filter(([_, list]) => list.length > 0));
};

const convertToINR = (amount: number, currency: string = 'INR'): number => {
  const rates: { [key: string]: number } = {
    INR: 1,
    USD: 83,
    EUR: 90,
    GBP: 105,
    AED: 22,
    THB: 2.3,
  };
  const rate = rates[currency.toUpperCase()] || 1;
  return amount * rate;
};

const DescriptionRenderer = ({
  description,
  isExpanded,
  onTruncated,
}: {
  description: any;
  isExpanded?: boolean;
  onTruncated?: (val: boolean) => void;
}) => {
  const [localTruncated, setLocalTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const isTrunc = contentRef.current.scrollHeight > 250;
      setLocalTruncated(isTrunc);
      if (onTruncated) onTruncated(isTrunc);
    }
  }, [description, onTruncated]);

  if (!description) return <p className="text-gray-500 italic">data is not there</p>;

  const cleanText = (str: string) => {
    if (!str) return '';
    let cleaned = str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<\/?(ul|ol)[^>]*>/gi, '\n')
      .replace(/<li>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<\/?p[^>]*>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');

    cleaned = cleaned.replace(/Distances are displayed to the nearest [^.]+\./gi, '');
    cleaned = cleaned.replace(/The nearest airports are:?/gi, '');
    cleaned = cleaned.replace(/The preferred airport for [^.]+\./gi, '');
    cleaned = cleaned.replace(/[^.:;?!]*?\s*-\s*[\d.]+\s*km(?:\s*\/\s*[\d.]+\s*mi)?/gi, '');

    return cleaned.replace(/\n{3,}/g, '\n\n').trim();
  };

  let content = description;
  if (typeof content === 'string') {
    let trimmed = content.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      try {
        trimmed = JSON.parse(trimmed);
      } catch (e) { }
    }
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        content = JSON.parse(trimmed);
      } catch (e) { }
    } else {
      content = trimmed;
    }
  }

  const renderContent = () => {
    if (typeof content === 'object' && content !== null) {
      const entries = Object.entries(content).filter(
        ([k, v]) => v && String(v).trim().length > 0 && k.toLowerCase() !== 'snippet',
      );

      if (entries.length === 0)
        return <p className="text-gray-500 italic">No description available</p>;

      return (
        <div className="space-y-6">
          {entries.map(([key, value]) => {
            const label = key
              .split('_')
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            return (
              <div key={key}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1 h-3 bg-blue-600 rounded-full"></div>
                  <h4 className="font-bold text-gray-900 uppercase text-[12px] tracking-wide">
                    {label}
                  </h4>
                </div>
                <p className="text-gray-700 text-[13px] leading-relaxed font-medium pl-3 whitespace-pre-line">
                  {cleanText(String(value))}
                </p>
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <p className="text-gray-700 leading-relaxed text-[13px] whitespace-pre-line">
        {cleanText(String(description))}
      </p>
    );
  };

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-300 ${isExpanded ? '' : 'max-h-[250px]'}`}
      >
        {renderContent()}
      </div>
      {!isExpanded && localTruncated && (
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};

/**
 * Shown in place of the room list when a hotel is opened from Explore Mode
 * (no checkin/checkout in the URL yet). Picking dates here updates the URL,
 * which the existing checkin-driven effects below pick up on their own and
 * fetch live pricing exactly as they would from a normal dated search.
 */
const SelectDatesPrompt: React.FC<{
  hotelId: string;
  city: string;
  destCode?: string;
  compact?: boolean;
}> = ({ hotelId, city, destCode, compact = false }) => {
  const navigate = useNavigate();
  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);
  const dayAfter = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, []);
  const [checkin, setCheckin] = useState(tomorrow);
  const [checkout, setCheckout] = useState(dayAfter);
  const [adults, setAdults] = useState(2);

  const goLive = () => {
    const rooms = [{ Adults: adults, Children: 0, childrenAges: [] as number[], numberOfRoom: 1 }];
    const params = new URLSearchParams({
      city: city || '',
      destCode: destCode || '',
      checkin,
      checkout,
      rooms: encodeRoomsToUrl(rooms),
    });
    navigate(`/hotels/${hotelId}?${params.toString()}`, { replace: true });
  };

  if (compact) {
    // Sits right beside the hero image gallery, above the fold, so the user
    // doesn't have to scroll all the way to the room list to realize they
    // need to pick dates before any price can show. Fully functional, not
    // just a nudge — picking dates here goes straight to live pricing.
    return (
      <div className="min-h-[220px] h-full w-full bg-gradient-to-br from-[#7F0909]/5 to-[#E9EBF8B2] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex flex-col justify-center gap-3 p-4 md:p-5">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#7F0909] flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Select Dates</p>
            <p className="text-[11px] text-gray-500 leading-tight">to see live prices &amp; availability</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Check-in
            </label>
            <input
              type="date"
              value={checkin}
              min={tomorrow}
              onChange={(e) => {
                setCheckin(e.target.value);
                if (checkout <= e.target.value) {
                  const d = new Date(e.target.value);
                  d.setDate(d.getDate() + 1);
                  setCheckout(d.toISOString().split('T')[0]);
                }
              }}
              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-[#7F0909] focus:ring-2 focus:ring-[#7F0909]/10"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Check-out
            </label>
            <input
              type="date"
              value={checkout}
              min={checkin}
              onChange={(e) => setCheckout(e.target.value)}
              className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 bg-white focus:outline-none focus:border-[#7F0909] focus:ring-2 focus:ring-[#7F0909]/10"
            />
          </div>
          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white">
            <span className="text-[11px] font-semibold text-gray-600">Guests</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAdults((a) => Math.max(1, a - 1))}
                className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-bold leading-none"
              >
                −
              </button>
              <span className="text-xs font-bold text-gray-800 w-3 text-center">{adults}</span>
              <button
                onClick={() => setAdults((a) => Math.min(9, a + 1))}
                className="w-5 h-5 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-xs font-bold leading-none"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <button
          onClick={goLive}
          className="w-full bg-[#7F0909] hover:bg-[#6a0707] text-white font-bold py-2.5 rounded-lg shadow-sm transition-colors text-xs"
        >
          Show Live Prices
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#7F0909]/5 to-white border border-[#7F0909]/15 rounded-2xl p-6 md:p-8 text-center max-w-2xl mx-auto my-4 shadow-sm">
      <Calendar className="w-8 h-8 text-[#7F0909] mx-auto mb-3" />
      <p className="text-gray-900 font-bold text-xl mb-1">Select Dates to See Live Prices &amp; Availability</p>
      <p className="text-sm text-gray-500 mb-6">Pick your stay dates and we'll pull real-time rates for this property.</p>
      <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-lg mx-auto">
        <div className="flex-1 text-left">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Check-in
          </label>
          <input
            type="date"
            value={checkin}
            min={tomorrow}
            onChange={(e) => {
              setCheckin(e.target.value);
              if (checkout <= e.target.value) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 1);
                setCheckout(d.toISOString().split('T')[0]);
              }
            }}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:border-[#7F0909] focus:ring-2 focus:ring-[#7F0909]/10"
          />
        </div>
        <div className="flex-1 text-left">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Check-out
          </label>
          <input
            type="date"
            value={checkout}
            min={checkin}
            onChange={(e) => setCheckout(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:outline-none focus:border-[#7F0909] focus:ring-2 focus:ring-[#7F0909]/10"
          />
        </div>
        <div className="w-full sm:w-32 text-left">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Guests
          </label>
          <div className="flex items-center justify-between border border-gray-200 rounded-lg px-2 py-1.5 h-[42px]">
            <button
              onClick={() => setAdults((a) => Math.max(1, a - 1))}
              className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold leading-none"
            >
              −
            </button>
            <span className="text-sm font-bold text-gray-800">{adults}</span>
            <button
              onClick={() => setAdults((a) => Math.min(9, a + 1))}
              className="w-6 h-6 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm font-bold leading-none"
            >
              +
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={goLive}
        className="mt-5 bg-[#7F0909] hover:bg-[#6a0707] text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-[#7F0909]/25 transition-colors text-sm"
      >
        Show Live Prices
      </button>
    </div>
  );
};

const HotelDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState<any>(location.state?.searchParams || null);
  const [hotelData, setHotelData] = useState<HotelData | null>(location.state?.hotel || null);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [urlSearchParams] = useSearchParams();

  const [roomProducts, setRoomProducts] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isFacilitiesModalOpen, setIsFacilitiesModalOpen] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<Record<number, any>>({});
  const [allTjOptions, setAllTjOptions] = useState<any[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);

  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('Description');
  /** Tabs whose target section actually rendered — Policies is conditional. */
  const [visibleTabs, setVisibleTabs] = useState<string[]>(TAB_ORDER);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    const sectionId = TAB_SECTION_IDS[tab];
    if (!sectionId) return;

    const el = document.getElementById(sectionId);
    if (!el) return;

    // Offset for the navbar height + some breathing room
    const yOffset = -100;
    const target = el.getBoundingClientRect().top + window.scrollY + yOffset;

    window.scrollTo({ top: target, behavior: 'smooth' });

    // This page keeps re-rendering while room products and images resolve, and a
    // re-render mid-animation cancels the browser's smooth scroll — leaving the
    // user exactly where they were. Re-assert the position instantly if the
    // smooth scroll never landed.
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - target) > 50) {
        const el2 = document.getElementById(sectionId);
        if (!el2) return;
        window.scrollTo({
          top: el2.getBoundingClientRect().top + window.scrollY + yOffset,
          behavior: 'auto',
        });
      }
    }, 400);
  };

  // Sections render conditionally on supplier data (Policies is often absent).
  // A tab pointing at a section that never rendered is a dead button, so only
  // show tabs whose anchor is actually in the DOM.
  useEffect(() => {
    const sync = () => {
      const present = Object.entries(TAB_SECTION_IDS)
        .filter(([, id]) => document.getElementById(id))
        .map(([tab]) => tab);
      if (present.length) {
        setVisibleTabs((prev) =>
          prev.length === present.length && prev.every((t, i) => t === present[i]) ? prev : present,
        );
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const [isDescTruncated, setIsDescTruncated] = useState(false);

  // Sections render conditionally on supplier data (Policies is often absent).
  // A tab pointing at a section that never rendered is a dead button, so only
  // show tabs whose anchor is actually in the DOM.
  useEffect(() => {
    const sync = () => {
      const present = Object.entries(TAB_SECTION_IDS)
        .filter(([, id]) => document.getElementById(id))
        .map(([tab]) => tab);
      if (present.length) {
        setVisibleTabs((prev) =>
          prev.length === present.length && prev.every((t, i) => t === present[i]) ? prev : present,
        );
      }
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sortedImages, setSortedImages] = useState<string[]>([]);
  /** False while image URLs are still being probed — gates the photo count. */
  const [imagesVerified, setImagesVerified] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasFetchedRef = useRef(false);

  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMapInteractive, setIsMapInteractive] = useState(false);
  const [activeAttractionTab, setActiveAttractionTab] = useState('Restaurants');
  const [selectedAttraction, setSelectedAttraction] = useState<string | null>(null);
  const [customMapSearch, setCustomMapSearch] = useState('');
  const [googlePlaces, setGooglePlaces] = useState<NearbyPlace[]>([]);

  const handlePlacesFetched = React.useCallback((places: NearbyPlace[]) => {
    setGooglePlaces(places);
  }, []);

  const dynamicAttractions = React.useMemo(() => {
    let textToParse = '';
    const safeString = (val: any) => (typeof val === 'string' ? val + ' ' : '');
    textToParse += safeString(hotelData?.description);
    textToParse += safeString(hotelData?.location);
    textToParse += safeString(hotelData?.locationInfo);
    textToParse += safeString(hotelData?.facilities);

    const attractions: NearbyPlace[] = [];
    const regex = /(.*?)\s*-\s*([\d.]+)\s*km(?:\s*\/\s*[\d.]+\s*mi)?/g;
    let match;
    while ((match = regex.exec(textToParse)) !== null) {
      let rawName = match[1];
      let dist = `${match[2]} km`;
      let parts = rawName.split(/[.:;]/);
      let name = parts[parts.length - 1].trim();
      if (name.includes(' mi ')) {
        parts = name.split(' mi ');
        name = parts[parts.length - 1].trim();
      }
      name = name.replace(/nearest airports are/i, '').trim();

      let type = 'Monuments & Tourist Attractions';
      const nameLower = name.toLowerCase();
      if (
        nameLower.includes('airport') ||
        nameLower.includes('station') ||
        nameLower.includes('transit') ||
        nameLower.includes('metro') ||
        nameLower.includes('train')
      ) {
        type = 'Transportation (Airports / Metro / Transit)';
      } else if (
        nameLower.includes('restaurant') ||
        nameLower.includes('cafe') ||
        nameLower.includes('dining') ||
        nameLower.includes('bar') ||
        nameLower.includes('bistro')
      ) {
        type = 'Restaurants';
      } else if (
        nameLower.includes('mall') ||
        nameLower.includes('shopping') ||
        nameLower.includes('store') ||
        nameLower.includes('market')
      ) {
        type = 'Shopping Malls';
      }

      if (name && name.length > 2 && name.length < 60) {
        if (!attractions.find((a) => a.name === name)) {
          attractions.push({ name, dist, type, lat: 0, lng: 0 });
        }
      }
    }
    return attractions;
  }, [hotelData]);

  const getAttractionsForTab = (tab: string): NearbyPlace[] => {
    if (googlePlaces.length > 0) {
      return googlePlaces.filter((a) => a.type === tab);
    }
    return dynamicAttractions.filter((a) => a.type === tab);
  };

  const dynamicTabs = React.useMemo(() => {
    return [
      'Restaurants',
      'Monuments & Tourist Attractions',
      'Transportation (Airports / Metro / Transit)',
      'Shopping Malls',
    ];
  }, []);

  useEffect(() => {
    if (dynamicTabs.length > 0 && !dynamicTabs.includes(activeAttractionTab)) {
      setActiveAttractionTab(dynamicTabs[0]);
    }
  }, [dynamicTabs, activeAttractionTab]);

  const displayAmenities = React.useMemo(() => {
    const list: string[] = [];
    if (Array.isArray(hotelData?.amenities)) {
      hotelData.amenities.forEach((item: any) => {
        if (typeof item === 'string' && item.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(item);
            if (Array.isArray(parsed)) {
              parsed.forEach((p) => {
                if (p && typeof p === 'string') list.push(p.trim());
              });
              return;
            }
          } catch (e) { }
        }
        if (item && typeof item === 'string') {
          list.push(item.trim());
        }
      });
    }
    return Array.from(new Set(list));
  }, [hotelData?.amenities]);

  // Explore Mode: opened straight from a property-type tile with no dates yet.
  // No supplier can price anything without dates, so room fetching stays
  // skipped (searchParams remains null) until the user picks dates below.
  const hasDates = !!(searchParams?.checkIn && searchParams?.checkOut);
  const isMultiRoom = (searchParams?.rooms?.length || 1) > 1;
  const isTJ = hotelData?.id?.startsWith('TJ:') || searchParams?.provider === 'tripjack';
  const totalSlots = searchParams?.rooms?.length || 1;
  const allSlotsSelected = Object.keys(selectedRooms).length === totalSlots;

  useEffect(() => {
    const selectedCount = Object.keys(selectedRooms).length;
    if (selectedCount === 0) return;

    console.log(
      `%c[Hotel Room Selection Update - ${selectedCount}/${totalSlots} Rooms Chosen]`,
      'color: #1565D8; font-weight: bold; font-size: 13px;',
    );

    let combinedTotal = 0;
    const urlParams = new URLSearchParams(window.location.search);
    const inDate = searchParams?.checkIn || searchParams?.checkin || urlParams.get('checkin');
    const outDate = searchParams?.checkOut || searchParams?.checkout || urlParams.get('checkout');
    const roomNights = calculateNights(inDate, outDate) || 1;

    Object.entries(selectedRooms).forEach(([slotIdx, room]: [string, any]) => {
      const roomTotal = Number(room.price || 0);
      const perNightPrice = roomTotal / roomNights; // exact
      combinedTotal += roomTotal;

      console.log(
        `%c  Room Slot ${Number(slotIdx) + 1}:%c\n` +
        `     - Name:         ${room.title || room.roomTypeName || 'Room'}\n` +
        `     - Board/Meal:   ${room.boardName || room.mealBasis || 'Room Only'}\n` +
        `     - Price/Night:  INR ${perNightPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
        `     - Total Stay:   INR ${roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${roomNights} night${roomNights > 1 ? 's' : ''})`,
        'color: #bebed6ff; font-weight: bold;',
        'color: #f0e7e7ff;',
      );
    });

    if (selectedCount === totalSlots) {
      console.log(
        `%c  >> Combined Total Stay Cost (All Rooms): INR ${combinedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <<`,
        'color: #10B981; font-weight: bold; font-size: 12px;',
      );
    }
  }, [selectedRooms, searchParams, totalSlots]);

  const handleRoomSelect = (roomData: any, slotIndex: number) => {
    setSelectedRooms((prev) => ({ ...prev, [slotIndex]: { ...roomData, roomIndex: slotIndex } }));
  };

  const navigateToBooking = (overrideFirstRoom?: any) => {
    const roomsArray = overrideFirstRoom
      ? isTJ && isMultiRoom && overrideFirstRoom.roomInfo
        ? overrideFirstRoom.roomInfo.map((ri: any, idx: number) => ({
          ...overrideFirstRoom,
          title: ri.name,
          roomTypeName: ri.name,
          boardName: ri.mealBasis || overrideFirstRoom.boardName || overrideFirstRoom.mealBasis,
          roomIndex: idx,
          price: overrideFirstRoom.price,
        }))
        : [overrideFirstRoom]
      : Array.from({ length: totalSlots }, (_, i) => selectedRooms[i]).filter(Boolean);

    const firstRoom = roomsArray[0];

    const searchParamsUrl = new URLSearchParams();
    searchParamsUrl.set('hotelId', hotelData.id);
    searchParamsUrl.set('checkIn', searchParams.checkIn || '');
    searchParamsUrl.set('checkOut', searchParams.checkOut || '');
    searchParamsUrl.set(
      'optionId',
      overrideFirstRoom?.optionId ||
      firstRoom?.optionId ||
      firstRoom?.rateKey ||
      firstRoom?.RoomSelectionKey ||
      '',
    );
    searchParamsUrl.set('rooms', encodeRoomsToUrl(searchParams?.rooms || []));
    if (searchParams.destinationCode) searchParamsUrl.set('destCode', searchParams.destinationCode);

    const reviewHash = overrideFirstRoom?.reviewHash || firstRoom?.reviewHash;
    const correlationId = overrideFirstRoom?.correlationId || firstRoom?.correlationId;
    const hid = overrideFirstRoom?.hid || firstRoom?.hid;
    if (reviewHash) searchParamsUrl.set('reviewHash', reviewHash);
    if (correlationId) searchParamsUrl.set('correlationId', correlationId);
    if (hid) searchParamsUrl.set('hid', hid);

    const totalAggregatePrice = isTJ
      ? overrideFirstRoom?.price || 0
      : roomsArray.reduce((acc, r) => acc + (r.price || 0), 0);

    const providerContext = {
      hotelId: hotelData.id,
      totalAggregatePrice,
      currency: hotelData.currency || 'INR',
      ...(isTJ
        ? {
          tjContext: {
            optionId: overrideFirstRoom?.optionId || firstRoom?.optionId || '',
            reviewHash: reviewHash || '',
            correlationId: correlationId || '',
            bookingId: '',
          },
        }
        : {
          rgContext: {
            roomSelectionKeys: roomsArray.map((r) => r.rateKey || r.RoomSelectionKey),
            allocationDetails: firstRoom?.allocationDetails || '',
          },
        }),
    };

    const selectedOptionId =
      overrideFirstRoom?.optionId ||
      firstRoom?.optionId ||
      firstRoom?.rateKey ||
      firstRoom?.RoomSelectionKey ||
      '';

    let patchedHotelData = { ...hotelData };
    if (isTJ && allTjOptions && allTjOptions.length > 0 && patchedHotelData.rawPayload) {
      const selectedOption = allTjOptions.find((opt) => opt.optionId === selectedOptionId);
      if (selectedOption && selectedOption.pricing) {
        patchedHotelData.rawPayload = {
          ...patchedHotelData.rawPayload,
          options: [
            {
              ...(patchedHotelData.rawPayload.options?.[0] || {}),
              pricing: {
                totalPrice: selectedOption.pricing.totalPrice,
                basePrice: selectedOption.pricing.basePrice,
                taxes: selectedOption.pricing.taxes,
                mf: selectedOption.pricing.mf,
                mft: selectedOption.pricing.mft,
                currency: selectedOption.pricing.currency,
                gstClaimableAmount: selectedOption.pricing.gstClaimableAmount,
              },
            },
          ],
        };
      }
    }

    const cleanParams = new URLSearchParams();
    cleanParams.set('hotelId', hotelData?.id || searchParamsUrl.get('hotelId') || '');
    cleanParams.set('checkIn', searchParams?.checkIn || searchParamsUrl.get('checkIn') || '');
    cleanParams.set('checkOut', searchParams?.checkOut || searchParamsUrl.get('checkOut') || '');
    cleanParams.set('optionId', firstRoom?.rateKey || firstRoom?.optionId || '');
    cleanParams.set('rooms', encodeRoomsToUrl(searchParams?.rooms || []));

    if (hotelData?.id?.startsWith('TJ:')) {
      if (firstRoom?.reviewHash) cleanParams.set('reviewHash', firstRoom.reviewHash);
      if (firstRoom?.correlationId) cleanParams.set('correlationId', firstRoom.correlationId);
      if (firstRoom?.hid) cleanParams.set('hid', firstRoom.hid);
      if (overrideFirstRoom?.onHoldAllowed ?? firstRoom?.onHoldAllowed)
        cleanParams.set('hold', '1');
    }

    navigate(`/hotels/review-booking?${cleanParams.toString()}`, {
      state: {
        hotelData: patchedHotelData,
        searchParams,
        selectedRoom: firstRoom,
        selectedRooms: roomsArray,
        onHoldAllowed: overrideFirstRoom?.onHoldAllowed ?? firstRoom?.onHoldAllowed ?? false,
        holdConfirm: overrideFirstRoom?.holdConfirm ?? firstRoom?.holdConfirm ?? false,
        providerContext,
      },
    });
  };

  useEffect(() => {
    hasFetchedRef.current = false;
    setSelectedRooms({});
    setAllTjOptions([]);
    setRoomProducts([]);

    const isTJ = id?.startsWith('TJ:') || /^\d+$/.test(id || '');
    const isRG = id?.startsWith('RG:');
    const normalizedId = isTJ && !id?.startsWith('TJ:') ? `TJ:${id}` : id;

    if (
      location.state?.hotel &&
      (location.state.hotel.id === id || location.state.hotel.id === normalizedId)
    ) {
      setHotelData(location.state.hotel);
    } else if (id) {
      const propertyCode = isTJ
        ? normalizedId.replace('TJ:', '')
        : isRG
          ? id.replace('RG:', '')
          : id;

      setHotelData((prev: any) => {
        if (prev?.id === normalizedId) return prev;
        return {
          id: normalizedId,
          propertyCode,
          brandCode: '',
          name: 'Loading Hotel Details...',
          images: [],
          amenities: [],
          address: '',
          city: urlSearchParams.get('city') || '',
        };
      });
    }

    const checkin = urlSearchParams.get('checkin');
    if (checkin) {
      const city = urlSearchParams.get('city');
      const decodedRooms = decodeRoomsFromUrl(urlSearchParams.get('rooms'));

      setSearchParams((prev: any) => {
        const isSame =
          prev &&
          prev.checkIn === checkin &&
          prev.checkOut === urlSearchParams.get('checkout') &&
          prev.location === (city || location.state?.searchParams?.location || '') &&
          JSON.stringify(prev.rooms) === JSON.stringify(decodedRooms);

        if (isSame) return prev;

        return {
          location: city || location.state?.searchParams?.location || '',
          destinationCode:
            urlSearchParams.get('destCode') || location.state?.searchParams?.destinationCode || '',
          checkIn: checkin,
          checkOut: urlSearchParams.get('checkout') || '',
          rooms: decodedRooms,
          bookForGroup: false,
        };
      });
    } else if (location.state?.searchParams) {
      setSearchParams(location.state.searchParams);
    }
  }, [id, location.search]);

  useEffect(() => {
    if (hotelData && searchParams && id) {
      try {
        const recentHotels = JSON.parse(localStorage.getItem('recentHotels') || '[]');
        const newEntry = {
          id: id,
          name: hotelData.name,
          location: hotelData.city || hotelData.address || hotelData.location || 'Unknown',
          rating: hotelData.rating || hotelData.starRating || 0,
          reviews: hotelData.reviewCount || hotelData.reviews || 0,
          price: hotelData.minPrice || hotelData.price || 0,
          image:
            (hotelData.images && hotelData.images[0]) ||
            hotelData.image ||
            NO_HOTEL_IMAGE,
          searchParams: searchParams,
          hotel: hotelData,
        };

        const filtered = recentHotels.filter((h: any) => h.id !== id);
        const updated = [newEntry, ...filtered].slice(0, 10);
        localStorage.setItem('recentHotels', JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving to recent hotels:', error);
      }
    }
  }, [hotelData, searchParams, id]);

  useEffect(() => {
    if (hotelData?.propertyCode && searchParams && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchRoomProducts();
    }
  }, [hotelData?.propertyCode, searchParams]);

  const fetchRoomProducts = async () => {
    if (!hotelData?.propertyCode || !searchParams) {
      console.log('Missing required data for fetching rooms (propertyCode or searchParams)');
      return;
    }

    setIsLoadingRooms(true);
    setRoomsError(null);

    try {
      console.log('Fetching room products for:', {
        propertyId: id,
        propertyCode: hotelData.propertyCode,
        brandCode: hotelData.brandCode,
        searchParams,
      });

      const response = await getHotelProducts(hotelData.id, {
        PropertyCode: hotelData.propertyCode,
        BrandCode: hotelData.brandCode,
        checkin: searchParams.checkIn,
        checkout: searchParams.checkOut,
        Rooms: searchParams.rooms.map((room: any) => {
          const childCount = room.Children || 0;
          let childAges = room.childrenAges || [];
          if (childCount > 0 && childAges.length === 0) {
            childAges = Array(childCount).fill(5);
          }
          return {
            numberOfRoom: 1,
            adults: room.Adults,
            children: childCount,
            childrenAges: childAges,
          };
        }),
        destinationCode: searchParams.destinationCode || searchParams.destCode,
        correlationId: hotelData?.correlationId || hotelData?.rawPayload?._correlationId,
      });

      console.log('Room products response:', response);

      // Normalize response: handle both { body: { products } } and { body: { body: { products } } }
      const responseBody = response.body?.body ?? response.body;

      if (responseBody) {
        console.log(
          '🔍 [HotelDetailPage] Detailed Info Body:',
          JSON.stringify(responseBody, null, 2),
        );
      }

      if (responseBody) {
        const detailedInfo = responseBody;
        const baseAmenities: string[] = detailedInfo.hotelFacility
          ? flattenFacilities(detailedInfo.hotelFacility) || []
          : [];

        const parseNames = (data: any): string[] => {
          if (typeof data === 'string' && data.trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) return parsed.map((d: any) => d.name || d).filter(Boolean);
            } catch (e) { }
          }
          if (Array.isArray(data)) return data.map((d: any) => d.name || d).filter(Boolean);
          if (typeof data === 'string' && data.trim()) {
            return data
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
          }
          return [];
        };

        setHotelData((prev: any) => {
          const finalAmenities =
            baseAmenities.length > 0
              ? [...baseAmenities]
              : prev?.amenities
                ? [...prev.amenities]
                : [];

          const segments = parseNames(
            detailedInfo?.hotelSegments ||
            detailedInfo?.categoryName ||
            detailedInfo?.segment ||
            detailedInfo?.hotelSegment ||
            prev?.hotelSegment,
          );
          segments.forEach((seg: string) => {
            if (!finalAmenities.some((a: string) => a.toLowerCase() === seg.toLowerCase())) {
              finalAmenities.push(seg);
            }
          });

          const boards = parseNames(
            detailedInfo?.hotelBoard ||
            detailedInfo?.boardName ||
            detailedInfo?.board ||
            prev?.hotelBoard,
          );
          boards.forEach((brd: string) => {
            if (!finalAmenities.some((a: string) => a.toLowerCase() === brd.toLowerCase())) {
              finalAmenities.push(brd);
            }
          });

          const updatedData = {
            ...prev,
            name: detailedInfo.name || detailedInfo.hotelName || prev.name,
            starRating: detailedInfo.starRating || detailedInfo.rating || prev.starRating || 0,
            description: detailedInfo.description || '',
            latitude: detailedInfo.latitude || prev.latitude,
            longitude: detailedInfo.longitude || prev.longitude,
            images:
              Array.isArray(detailedInfo.images) && detailedInfo.images.length > 0
                ? detailedInfo.images
                : prev.images || [],
            address: detailedInfo.address || prev.address || '',
            city: detailedInfo.city || prev.city,
            phoneNumber: detailedInfo.phone || prev.phoneNumber,
            amenities: finalAmenities,
            reviewScore: detailedInfo.reviewScore || prev.reviewScore || 0,
            rateComments:
              detailedInfo.rateComments || detailedInfo.RateComments || prev.rateComments || '',
            checkInTime:
              detailedInfo.checkInTime || detailedInfo.checkinTime || prev.checkInTime || '',
            checkOutTime:
              detailedInfo.checkOutTime || detailedInfo.checkoutTime || prev.checkOutTime || '',
            propertyCode:
              detailedInfo.propertyCode || detailedInfo.PropertyCode || prev.propertyCode || '',
            brandCode: detailedInfo.brandCode || detailedInfo.BrandCode || prev.brandCode || '',
            policies: detailedInfo.policies || prev.policies || null,
            checkInInstructions: detailedInfo.checkInInstructions || prev.checkInInstructions || '',
            specialInstructions: detailedInfo.specialInstructions || prev.specialInstructions || '',
            fees: detailedInfo.fees || prev.fees || [],
          };
          return updatedData;
        });
      }

      const apiHotelImages: string[] = (() => {
        const imgs =
          Array.isArray(responseBody?.images) && responseBody.images.length > 0
            ? responseBody.images.map(safeGetImageUrl).filter(Boolean)
            : [];
        if (imgs.length > 0) return imgs;
        return Array.isArray(hotelData?.images)
          ? hotelData.images.map(safeGetImageUrl).filter(Boolean)
          : [];
      })();

      if (
        responseBody?.options &&
        Array.isArray(responseBody.options) &&
        responseBody.options.length > 0
      ) {
        setAllTjOptions(responseBody.options);
        console.log(
          '[TJ Combos] Saved',
          responseBody.options.length,
          'raw options for combo matching',
        );
      }

      let rawRooms =
        responseBody?.products || response.products || responseBody || response.rooms || [];

      if (rawRooms && !Array.isArray(rawRooms) && typeof rawRooms === 'object') {
        rawRooms = [rawRooms];
      }

      if (!Array.isArray(rawRooms)) {
        rawRooms = [];
      }

      const flattenedRooms: any[] = [];
      rawRooms.forEach((room: any) => {
        const rates = Array.isArray(room.rate)
          ? room.rate
          : room.rates
            ? Array.isArray(room.rates)
              ? room.rates
              : [room.rates]
            : [];

        const roomAmenities = room.roomFacility ? flattenFacilities(room.roomFacility) : [];

        if (rates.length > 0) {
          rates.forEach((rate: any) => {
            const pricingObj = rate.pricing || null; // Present for both TJ and RG after backend enrichment

            // Prices are read from the backend verbatim — never recomputed here.
            // See features/hotels/utils/ratePricing.ts.
            const {
              totalPrice,
              basePrice: baseNetPrice,
              taxesAndFees: taxOnTop,
              discount,
            } = resolveRatePricing(rate, hotelData.currency);

            flattenedRooms.push({
              ...room,
              rateKey: rate.rateKey || rate.RoomSelectionKey,
              price: totalPrice + discount, // gross including any offers
              netPrice: baseNetPrice, // ✅ base price (for per-night display)
              taxes: taxOnTop,
              totalPriceInclusive: (() => {
                const currency = rate.currency || hotelData.currency || 'INR';
                const baseInINR = convertToINR(Number(baseNetPrice), currency);
                return baseInINR + convertToINR(Number(taxOnTop), currency);
              })(),
              boardName: rate.boardName || room.boardName || '',
              adults: rate.adults || (searchParams?.rooms?.[0]?.Adults ?? 0),
              children: rate.children || (searchParams?.rooms?.[0]?.Children ?? 0),
              roomTypeName: room.name || room.roomTypeName || '',
              roomTypeCode: room.roomCode || room.roomTypeCode || '',
              allotment: rate.allotment,
              paymentType: rate.paymentType || room.paymentType || '',
              rateComments:
                rate.rateComments ||
                rate.RateComments ||
                room.rateComments ||
                room.RateComments ||
                '',
              cancellationPolicies: rate.cancellationPolicies || room.cancellationPolicies || [],
              offers: rate.offers || room.offers || [],
              // taxesInfo: for RoomCard tax display — TJ uses pricing breakdown, RG uses taxesInfo
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
              isMandatory: rate.isMandatory || room.isMandatory || false,
              reviewHash:
                rate.reviewHash ||
                rate.ReviewHash ||
                rate.review_hash ||
                response.body?.reviewHash ||
                '',
              correlationId:
                rate.correlationId ||
                rate.CorrelationId ||
                rate._correlationId ||
                response.body?.correlationId ||
                '',
              hid: rate.hid || rate.tjHotelId || response.body?.hid || '',
              allocationDetails: rate.allocationDetails || room.allocationDetails || '',
              mealBasis: rate.mealBasis || room.mealBasis || '',
              optionType: rate.optionType || null,
              roomInfo: rate.roomInfo || room.roomInfo || [],
              bookingNotes: rate.bookingNotes || room.bookingNotes || null,
              compliance: rate.compliance || room.compliance || null,
              pricingBreakdown: rate.pricing || room.pricing || null,
              isRefundable: rate.isRefundable ?? room.isRefundable ?? false,
              refundableLabel: rate.refundableLabel || room.refundableLabel || '',
              onHoldAllowed:
                rate.onHoldAllowed ?? room.onHoldAllowed ?? response.body?.onHoldAllowed ?? false,
              holdConfirm:
                rate.holdConfirm ?? room.holdConfirm ?? response.body?.holdConfirm ?? false,
              inclusions: rate.inclusions || room.inclusions || [],
              amenities: roomAmenities,
              images:
                room.images && room.images.length > 0
                  ? room.images.map(safeGetImageUrl).filter(Boolean)
                  : [],
              features: extractFeatures({
                hotelBoard: rate.boardName || room.boardName || rate.mealBasis || room.mealBasis,
                cancellationPolicies: rate.cancellationPolicies || room.cancellationPolicies,
                allotment: rate.allotment,
                amenities: roomAmenities,
                ...rate,
              }),
              bed_config: formatBedConfig(rate.bed_config || room.bed_config || null),
            });
          });
        } else {
          flattenedRooms.push({
            ...room,
            rateKey: room.rateKey || room.optionId || room.RoomSelectionKey || '',
            optionId: room.optionId || room.RoomSelectionKey || room.rateKey || '',
            price: room.price || room.rate || 0,
            roomTypeName: room.name || room.roomTypeName || '',
            allotment: room.allotment,
            paymentType: room.paymentType || '',
            reviewHash:
              room.reviewHash ||
              room.ReviewHash ||
              room.review_hash ||
              response.body?.reviewHash ||
              '',
            correlationId:
              room.correlationId ||
              room.CorrelationId ||
              room._correlationId ||
              response.body?.correlationId ||
              '',
            hid: room.hid || room.tjHotelId || response.body?.hid || '',
            allocationDetails: room.allocationDetails || '',
            bookingNotes: room.bookingNotes || null,
            isRefundable: room.isRefundable ?? false,
            refundableLabel: room.refundableLabel || '',
            onHoldAllowed: room.onHoldAllowed ?? response.body?.onHoldAllowed ?? false,
            holdConfirm: room.holdConfirm ?? response.body?.holdConfirm ?? false,
            amenities: roomAmenities,
            images:
              room.images && room.images.length > 0
                ? room.images.map(safeGetImageUrl).filter(Boolean)
                : [],
            features: extractFeatures({
              hotelBoard: room.boardName,
              amenities: roomAmenities,
              ...room,
            }),
            bed_config: formatBedConfig(room.bed_config || null),
          });
        }
      });

      // Sort by price ascending to keep the cheapest option
      const sortedFlattened = [...flattenedRooms].sort((a: any, b: any) => a.price - b.price);
      const seen = new Set<string>();
      const uniqueRooms = sortedFlattened.filter((r: any) => {
        const bedConfig = r.bed_config || '';
        const capacity = `${r.adults || 0}-${r.children || 0}`;
        const key = `${r.roomTypeName}-${r.boardName}-${bedConfig}-${capacity}`
          .toLowerCase()
          .trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      console.log('Final flattened room products (deduped):', uniqueRooms);

      setRoomProducts(uniqueRooms);

      Promise.all(
        uniqueRooms.map(async (room) => {
          const formatted = (room.images || []).map(formatHotelImageUrl).filter(Boolean);
          if (formatted.length > 1) {
            const sortedFormatted = await sortHotelImagesByDimensions(formatted, 1.33);
            return { ...room, images: sortedFormatted.filter(Boolean) };
          }
          return { ...room, images: formatted };
        }),
      ).then((sortedRooms) => {
        setRoomProducts(sortedRooms);
      });
    } catch (error: any) {
      console.error('Error fetching room products:', error);
      setRoomsError(error.message || 'Failed to fetch room products');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const getRoomsGuestsSummary = () => {
    if (!searchParams?.rooms || searchParams.rooms.length === 0) {
      return '1 Room, 2 Guests';
    }
    const totalRooms = searchParams.rooms.length;
    const totalAdults = searchParams.rooms.reduce((sum: number, room: any) => sum + room.Adults, 0);
    const totalChildren = searchParams.rooms.reduce(
      (sum: number, room: any) => sum + room.Children,
      0,
    );
    const totalGuests = totalAdults + totalChildren;
    return `${totalRooms} Room${totalRooms > 1 ? 's' : ''}, ${totalGuests} Guest${totalGuests > 1 ? 's' : ''}`;
  };

  useEffect(() => {
    let cancelled = false;

    if (hotelData?.images && hotelData.images.length > 0) {
      const formatted = hotelData.images.map(formatHotelImageUrl).filter(Boolean);

      // Show the unverified list immediately so the hero isn't blank while the
      // probe runs, but hold the photo COUNT back until every URL has been
      // verified — publishing the raw length is what produced "19 Photos" over
      // a gallery where none of the nineteen loaded.
      setSortedImages(formatted);
      setImagesVerified(false);

      sortHotelImagesByDimensions(formatted).then((newSorted) => {
        if (cancelled) return;
        setSortedImages(newSorted);
        setImagesVerified(true);
      });
    } else {
      setSortedImages([]);
      setImagesVerified(true);
    }

    return () => {
      cancelled = true;
    };
  }, [hotelData?.images]);

  const handleAutocompleteChange = (loc: string, code: string, hId?: string) => {
    setSearchParams((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        location: loc,
        destinationCode: code,
        hotelId: hId,
      };
    });
  };

  const handleSearchClick = () => {
    if (!searchParams) return;

    const roomsStr = encodeRoomsToUrl(searchParams.rooms);

    const urlSearchParams = new URLSearchParams(window.location.search);
    const city = urlSearchParams.get('city');
    if (searchParams.location !== city) {
      navigate(
        `/hotels/search?city=${encodeURIComponent(searchParams.location)}&destCode=${searchParams.destinationCode || ''}&checkin=${searchParams.checkIn}&checkout=${searchParams.checkOut}&rooms=${roomsStr}`,
        {
          state: { triggerSearch: true },
        },
      );
    } else {
      urlSearchParams.set('city', searchParams.location || '');
      urlSearchParams.set('destCode', searchParams.destinationCode || '');
      urlSearchParams.set('checkin', searchParams.checkIn || '');
      urlSearchParams.set('checkout', searchParams.checkOut || '');
      urlSearchParams.set('rooms', roomsStr);
      navigate({ search: urlSearchParams.toString() }, { replace: true });
      setIsMobileSearchOpen(false);
    }
  };

  if (!hotelData) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <MainNavbar activeService="hotels" />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Hotel information not found</p>
            <button
              onClick={() => navigate('/hotels/search')}
              className="bg-[#1e1e6e] text-white px-6 py-2 rounded hover:bg-blue-900"
            >
              Back to Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col pb-[120px] md:pb-0 overflow-x-hidden">
      {/* Mobile Compact Header */}
      <div className="md:hidden bg-[#1e1e6e] text-white px-4 py-3 flex justify-between items-center sticky top-0 z-[70] shadow-md">
        <div className="flex flex-col truncate pr-4 justify-center">
          <span className="font-bold text-[15px] leading-tight truncate">
            {hotelData.name || searchParams?.location || 'Selected Hotel'}
          </span>
          <span className="text-[11px] text-[#c4c7eb] truncate mt-0.5">
            {searchParams?.checkIn
              ? new Date(searchParams.checkIn).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })
              : 'In'}{' '}
            -{' '}
            {searchParams?.checkOut
              ? new Date(searchParams.checkOut).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
              })
              : 'Out'}{' '}
            • {getRoomsGuestsSummary()}
          </span>
        </div>
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
        >
          <FaPen size={10} />
        </button>
      </div>

      {/* Search Header */}
      <div
        className={`bg-white/90 backdrop-blur-md py-4 sticky top-0 z-[60] shadow-md border-b border-gray-200 px-4 ${!isMobileSearchOpen ? 'hidden md:block' : 'block'}`}
      >
        <div
          className="w-full mx-auto flex flex-col md:flex-row items-stretch justify-between gap-3 md:gap-3 bg-white border border-gray-200 rounded-[12px] p-3 shadow-sm"
          style={{ minHeight: '76px' }}
        >
          {isMobileSearchOpen && (
            <div className="w-full flex justify-between items-center mb-2 md:hidden">
              <h3 className="text-gray-900 font-bold text-lg">Edit Search</h3>
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="text-gray-600 p-2 bg-gray-100 rounded-full"
              >
                <FaChevronRight className="rotate-90" />
              </button>
            </div>
          )}

          {/* Fields row */}
          <div className="flex flex-col md:flex-row gap-2 md:gap-2 items-stretch w-full md:flex-1">
            {/* Destination */}
            <div className="group relative flex-[2.2] w-full min-w-0 bg-gray-50 border border-gray-200 hover:border-[#272E7C]/60 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 cursor-text">
              <div className="flex items-center gap-1.5 mb-0.5">
                <FaMapMarkerAlt className="text-[#272E7C] w-2.5 h-2.5 shrink-0" />
                <span
                  className="text-[#272E7C] font-semibold text-[10px] tracking-widest uppercase"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Location
                </span>
              </div>
              <div className="flex items-center h-[24px] relative w-full">
                <DestinationAutocomplete
                  value={searchParams?.location || ''}
                  onChange={handleAutocompleteChange}
                  placeholder="Where are you going?"
                  className="w-full h-full bg-transparent !border-0 text-[14px] font-semibold text-gray-900 focus:outline-none focus:!ring-0 p-0 placeholder-gray-400 truncate"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>

            {/* Check In — hidden input triggered by wrapper click */}
            <div
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) {
                  try {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      input.showPicker();
                    } else {
                      input.focus();
                    }
                  } catch (err) { }
                }
              }}
              className="group relative flex-1 w-full bg-gray-50 border border-gray-200 hover:border-[#272E7C]/60 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 cursor-pointer overflow-visible"
            >
              <input
                type="date"
                value={searchParams?.checkIn || ''}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) =>
                  setSearchParams((prev: any) =>
                    prev ? { ...prev, checkIn: e.target.value } : null,
                  )
                }
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                style={{ colorScheme: 'light' }}
              />
              <div className="flex items-center gap-1.5 pointer-events-none">
                <svg
                  className="text-[#272E7C] w-2.5 h-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span
                  className="text-[#272E7C] font-semibold text-[10px] tracking-widest uppercase"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Check In
                </span>
              </div>
              <span
                className="text-[14px] font-semibold text-gray-900 pointer-events-none mt-0.5"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {searchParams?.checkIn ? (
                  new Date(searchParams.checkIn + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                ) : (
                  <span className="text-gray-400 font-normal">Pick a date</span>
                )}
              </span>
            </div>

            <div
              onClick={(e) => {
                const input = e.currentTarget.querySelector('input');
                if (input) {
                  try {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      input.showPicker();
                    } else {
                      input.focus();
                    }
                  } catch (err) { }
                }
              }}
              className="group relative flex-1 w-full bg-gray-50 border border-gray-200 hover:border-[#272E7C]/60 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 cursor-pointer overflow-visible"
            >
              <input
                type="date"
                value={searchParams?.checkOut || ''}
                min={searchParams?.checkIn || new Date().toISOString().split('T')[0]}
                onChange={(e) =>
                  setSearchParams((prev: any) =>
                    prev ? { ...prev, checkOut: e.target.value } : null,
                  )
                }
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                style={{ colorScheme: 'light' }}
              />
              <div className="flex items-center gap-1.5 pointer-events-none">
                <svg
                  className="text-[#272E7C] w-2.5 h-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span
                  className="text-[#272E7C] font-semibold text-[10px] tracking-widest uppercase"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Check Out
                </span>
              </div>
              <span
                className="text-[14px] font-semibold text-gray-900 pointer-events-none mt-0.5"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                {searchParams?.checkOut ? (
                  new Date(searchParams.checkOut + 'T00:00:00').toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                ) : (
                  <span className="text-gray-400 font-normal">Pick a date</span>
                )}
              </span>
            </div>

            {/* Rooms & Guests */}
            <div className="group relative flex-1 w-full bg-gray-50 border border-gray-200 hover:border-[#272E7C]/60 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 overflow-visible">
              <div className="flex items-center gap-1.5 pointer-events-none">
                <svg
                  className="text-[#272E7C] w-2.5 h-2.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span
                  className="text-[#272E7C] font-semibold text-[10px] tracking-widest uppercase"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Guests
                </span>
              </div>
              <RoomGuestSelector
                rooms={searchParams?.rooms || []}
                onChange={(rooms) =>
                  setSearchParams((prev: any) => (prev ? { ...prev, rooms } : null))
                }
                className="!border-none !bg-transparent text-[14px] font-semibold !text-gray-900 focus:!ring-0 p-0 w-full text-left mt-0.5"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="w-full md:w-[120px] flex-shrink-0 flex items-stretch">
            <button
              onClick={handleSearchClick}
              className="w-full h-full min-h-[52px] rounded-[10px] font-bold text-[13px] text-[#1A1F4D] transition-all duration-200 active:scale-95 hover:brightness-105 flex items-center justify-center gap-2 px-4 shadow-md uppercase tracking-wide"
              style={{ background: 'linear-gradient(135deg, #F8A90D 0%, #EFC269 100%)' }}
            >
              <FaSearch className="w-3.5 h-3.5" />
              Search
            </button>
          </div>
        </div>
      </div>

      <main className="flex-grow">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 py-4 md:py-6">
          <div className="flex flex-wrap items-center gap-y-1 mb-4 md:mb-6 font-sans text-sm md:text-base">
            <span
              onClick={() => navigate('/')}
              className="cursor-pointer hover:underline text-[#1A1F4D] font-normal leading-none"
            >
              Home
            </span>
            <FaChevronRight className="mx-2 text-[#1A1F4D]/50 w-2 h-2.5 md:w-3 md:h-3 shrink-0" />
            <span
              className="cursor-pointer hover:underline text-[#1A1F4D] font-normal leading-none"
              onClick={() => navigate('/hotels/search')}
            >
              Hotels In {searchParams?.location || 'Selected Location'}
            </span>
            <FaChevronRight className="mx-2 text-[#1A1F4D]/50 w-2 h-2.5 md:w-3 md:h-3 shrink-0" />
            <span
              className="text-[#000000] font-semibold leading-none truncate max-w-[120px] sm:max-w-[200px] md:max-w-[400px]"
              title={hotelData.name}
            >
              {hotelData.name}
            </span>
          </div>

          <div className="mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-3">
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-2">
                  <div className="flex text-[#FFC107] text-xs md:text-sm order-1 md:order-2">
                    {[...Array(Math.min(hotelData.rating || 5, 5))].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </div>
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight order-2 md:order-1">
                    {hotelData.name}
                  </h1>
                </div>
                {hotelData.offers && hotelData.offers.length > 0 && (
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    {hotelData.offers.map((offer: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-green-100/50 border border-green-200 rounded-lg px-3 py-1.5 flex items-center gap-2"
                      >
                        <FaCheckCircle className="text-green-600 text-[10px]" />
                        <span className="text-[10px] font-bold text-green-700 uppercase tracking-tight">
                          {offer.name || 'Special Offer'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-2">
                  {hotelData.badges &&
                    hotelData.badges.map((badge: string, i: number) => (
                      <span
                        key={i}
                        className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-md font-semibold"
                      >
                        {badge}
                      </span>
                    ))}
                  {hotelData.discount && (
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-md font-bold">
                      {hotelData.discount}% OFF
                    </span>
                  )}
                </div>
                <div className="flex items-center text-sm text-gray-600 font-medium gap-4">
                  <div className="flex items-center">
                    <FaMapMarkerAlt className="text-[#E81919] mr-2" />
                    <span>
                      {formatHotelAddress(hotelData.address) || hotelData.location || hotelData.city || ''}
                    </span>
                  </div>
                  {hotelData.distance && (
                    <span className="text-blue-600">• {hotelData.distance}</span>
                  )}
                </div>
              </div>
            </div>
          </div>



          {/* Image Grid + Room Card – stacked on mobile, side-by-side on desktop */}
          <div className="flex flex-col md:flex-row items-stretch justify-between w-full mx-auto mb-4 font-sans gap-3">
            {/* Images block */}
            <div
              className="flex flex-row justify-between items-stretch gap-2 w-full md:flex-1 min-w-0"
              style={{ height: 'clamp(200px, 50vw, 385px)' }}
            >
              {/* Left Column: Single Main Image */}
              <div className="flex-[1.8] h-full rounded-[8.78px] overflow-hidden shadow-sm relative min-w-0">
                {sortedImages[0] ? (
                  <div className="relative h-full w-full">
                    <img
                      src={sortedImages[0]}
                      alt="Main"
                      loading="eager"
                      fetchPriority="high"
                      className="w-full h-full object-cover block"
                    />
                    {hotelData.offers && hotelData.offers.length > 0 && (
                      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                        {hotelData.offers.map((offer: any, idx: number) => {
                          const cleanedName = (offer.name || 'Special Offer').replace(
                            /\s?\(\d+\)/g,
                            '',
                          );
                          return (
                            <div
                              key={idx}
                              className="bg-green-600/90 backdrop-blur-sm shadow-sm text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/20"
                            >
                              <FaCheckCircle className="text-[8px]" />
                              {cleanedName}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {/* Photo count overlay on mobile — only once verified */}
                    {imagesVerified && sortedImages.length > 1 && (
                      <button
                        onClick={() => setIsGalleryOpen(true)}
                        className="md:hidden absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-bold text-white z-10"
                      >
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                        {sortedImages.length} Photos
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                  </div>
                )}
              </div>

              {/* Right Column: Two stacked images — hidden on mobile to avoid tiny squished thumbnails */}
              <div className="hidden sm:flex flex-1 h-full flex-col justify-between gap-2 min-w-0">
                {/* Secondary Image */}
                {/* Slots 2 and 3 show a real second/third photo or stay empty.
                    They used to fall back to sortedImages[0], repeating the hero
                    three times and implying a gallery that isn't there. */}
                <div className="flex-1 w-full rounded-[8.78px] overflow-hidden shadow-sm bg-gray-200 relative">
                  {sortedImages[1] ? (
                    <img
                      src={sortedImages[1]}
                      alt=""
                      loading="eager"
                      className="w-full h-full object-cover block"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                  )}
                </div>
                {/* Tertiary Image */}
                <div className="flex-1 w-full rounded-[8.78px] overflow-hidden shadow-sm relative bg-gray-200">
                  {sortedImages[2] ? (
                    <img
                      src={sortedImages[2]}
                      alt=""
                      loading="eager"
                      className="w-full h-full object-cover block"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                  )}
                  {imagesVerified && sortedImages.length > 3 && (
                    <div
                      className="absolute bottom-2 right-2 bg-black/60 px-2.5 py-1 rounded-[5px] flex items-center gap-1.5 text-[11px] font-bold text-white cursor-pointer hover:bg-black/85 transition-all"
                      onClick={() => setIsGalleryOpen(true)}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-white"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span>{sortedImages.length} Photos</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Room Card – full width below images on mobile, sidebar on desktop */}
            <div
              className="w-full md:w-[33%] md:max-w-[407px] md:min-w-[280px] md:flex-shrink-0"
              style={{ minHeight: '220px' }}
            >
              {(() => {
                const availableRooms =
                  selectedRoomTypes.length === 0
                    ? roomProducts
                    : roomProducts.filter(
                      (r) => selectedRoomTypes.includes(r.roomTypeName || r.roomType),
                    );
                if (availableRooms.length > 0) {
                  const nights =
                    calculateNights(searchParams?.checkIn, searchParams?.checkOut) || 1;
                  const rawFeatured = availableRooms[0];
                  const apiTotal = rawFeatured.totalPriceInclusive || rawFeatured.price || 0;
                  // Exact pricing – no rounding
                  const retailTotal = apiTotal;

                  const updatedPricing = rawFeatured.pricing || rawFeatured.pricingBreakdown || {};
                  // Only derive finalTotalPrice when the backend didn't send one —
                  // overwriting it drops the master's B2C markup.
                  const finalTotal = updatedPricing.finalTotalPrice ?? retailTotal;
                  const pricingBreakdown = {
                    ...updatedPricing,
                    finalTotalPrice: finalTotal,
                    perNightPrice: finalTotal / Math.max(1, nights),
                  };

                  const featuredRoom = {
                    ...rawFeatured,
                    apiPrice: rawFeatured.price || 0,
                    apiTotalPriceInclusive: apiTotal,
                    totalPriceInclusive: retailTotal,
                    price: retailTotal,
                    pricingBreakdown,
                    pricing: pricingBreakdown,
                  };
                  return (
                    <RoomCard
                      onRequireLogin={() => setShowLoginModal(true)}
                      title={featuredRoom.roomTypeName || 'Twin Room'}
                      price={featuredRoom.totalPriceInclusive || featuredRoom.price || 0}
                      hotelMainImage={sortedImages[0]}
                      netPrice={featuredRoom.apiTotalPriceInclusive || featuredRoom.apiPrice || 0}
                      image={formatHotelImageUrl(featuredRoom.images?.[0]) || ''}
                      images={(featuredRoom.images || []).map(formatHotelImageUrl).filter(Boolean)}
                      features={extractFeatures({
                        hotelBoard: featuredRoom.boardName,
                        cancellationPolicies: featuredRoom.cancellationPolicies,
                        allotment: featuredRoom.allotment,
                        amenities: featuredRoom.amenities,
                        ...featuredRoom,
                      })}
                      rateKey={featuredRoom.rateKey}
                      boardName={featuredRoom.boardName}
                      adults={featuredRoom.adults}
                      children={featuredRoom.children}
                      roomTypeCode={featuredRoom.roomTypeCode}
                      hotelData={hotelData}
                      searchParams={searchParams}
                      rateComments={featuredRoom.rateComments}
                      taxesInfo={featuredRoom.taxesInfo}
                      cancellationPolicies={featuredRoom.cancellationPolicies}
                      offers={featuredRoom.offers || []}
                      roomInfo={featuredRoom.roomInfo}
                      variant="featured"
                      reviewHash={featuredRoom.reviewHash}
                      correlationId={featuredRoom.correlationId}
                      hid={featuredRoom.hid}
                      mealBasis={featuredRoom.mealBasis}
                      compliance={featuredRoom.compliance}
                      pricingBreakdown={featuredRoom.pricing || featuredRoom.pricingBreakdown}
                      onHoldAllowed={featuredRoom.onHoldAllowed}
                      bed_config={featuredRoom.bed_config}
                      amenities={featuredRoom.amenities && featuredRoom.amenities.length > 0 ? featuredRoom.amenities : hotelData?.amenities}
                      inclusions={featuredRoom.inclusions || []}
                      isRefundable={featuredRoom.isRefundable}
                      refundableLabel={featuredRoom.refundableLabel}
                    />
                  );
                }
                if (!hasDates) {
                  return (
                    <SelectDatesPrompt
                      hotelId={hotelData.id}
                      city={hotelData.city || searchParams?.location || ''}
                      destCode={searchParams?.destinationCode}
                      compact
                    />
                  );
                }
                return isLoadingRooms ? (
                  <div className="min-h-[220px] h-full bg-[#E9EBF8B2] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] p-5 flex flex-col gap-4 overflow-hidden relative">
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                    {/* Skeleton lines */}
                    <div className="h-6 bg-gray-300/60 rounded-lg w-3/4 animate-pulse" />
                    <div className="h-4 bg-gray-300/60 rounded w-1/2 animate-pulse" />
                    <div className="h-4 bg-gray-300/60 rounded w-2/3 animate-pulse" />
                    <div className="h-4 bg-gray-300/60 rounded w-1/2 animate-pulse" />
                    <div className="mt-auto flex flex-col gap-3">
                      <div className="h-5 bg-gray-300/60 rounded w-1/3 animate-pulse" />
                      <div className="h-8 bg-gray-300/60 rounded-lg w-full animate-pulse" />
                      <div className="h-11 bg-red-300/50 rounded-[5px] w-full animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[220px] h-full bg-[#E9EBF8B2] rounded-[20px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] flex items-center justify-center text-gray-400 italic text-sm p-4 font-sans">
                    {roomProducts.length === 0 ? 'No rooms available for these dates.' : 'No rooms match this filter.'}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="w-full border-b border-gray-200 px-4 flex justify-start gap-8 items-end h-[48px] mb-8 mx-auto mt-8 overflow-x-auto no-scrollbar sticky top-16 bg-white z-30 transition-all duration-300">
            {visibleTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`h-[48px] flex items-center justify-center p-[4px] border-b-2 transition-colors whitespace-nowrap -mb-[1px] ${activeTab === tab ? 'border-[#3771D4]' : 'border-transparent hover:border-gray-300'
                  }`}
              >
                <span
                  className={`text-[16px] md:text-[18px] font-semibold leading-[100%] tracking-normal ${activeTab === tab ? 'text-[#3771D4]' : 'text-gray-700'
                    }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {tab}
                </span>
              </button>
            ))}
          </div>



          <div className="mb-8 md:mb-12" id="section-description">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="w-1 h-6 md:h-8 bg-[#FFC107]"></div>
              <h2 className="text-lg md:text-xl font-bold text-[#FFC107] uppercase tracking-wider">
                Description
              </h2>
              {isDescTruncated && (
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="ml-auto text-[10px] md:text-xs font-bold text-gray-500 hover:text-gray-900 border-b border-gray-400 pb-0.5"
                >
                  {isDescExpanded ? '- view less' : '+ view more'}
                </button>
              )}
            </div>
            <div className="text-gray-700 leading-relaxed text-[13px] md:text-sm">
              <DescriptionRenderer
                description={hotelData.description}
                isExpanded={isDescExpanded}
                onTruncated={setIsDescTruncated}
              />
            </div>
          </div>

          <div className="mb-8 md:mb-12" id="section-rooms">


            <div className="w-full mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 lg:h-[39px]">
              {/* Left Side: Room Type Dropdown */}
              <div className="flex items-center flex-shrink-0 min-w-0 relative z-20">
                <span className="text-[16px] text-gray-600 font-medium mr-3">Room Type :</span>
                <div className="relative" ref={dropdownRef}>
                  <div
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center justify-between text-[16px] font-bold text-gray-900 bg-transparent cursor-pointer select-none"
                  >
                    <span className="truncate pr-3">
                      {selectedRoomTypes.length === 0 ? 'All Rooms' : selectedRoomTypes.length === 1 ? selectedRoomTypes[0] : `${selectedRoomTypes.length} Room Types`}
                    </span>
                    <svg
                      className={`fill-current h-4 w-4 text-gray-900 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-4 w-[280px] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 origin-top animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div
                          className={`px-5 py-3 cursor-pointer text-[13.5px] transition-colors flex items-center justify-between ${selectedRoomTypes.length === 0 ? 'bg-[#1565D8] text-white font-bold' : 'text-[#1e1e6e] hover:bg-gray-50 font-medium'}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedRoomTypes([]);
                            setIsDropdownOpen(false);
                          }}
                        >
                          All Rooms
                          {selectedRoomTypes.length === 0 && (
                            <FaCheckCircle size={14} className="text-white" />
                          )}
                        </div>
                        {Array.from(
                          new Set(
                            roomProducts.map((r) => r.roomTypeName || r.roomType).filter(Boolean),
                          ),
                        ).map((type) => (
                          <div
                            key={type as string}
                            className={`px-5 py-3 cursor-pointer text-[13.5px] border-t border-gray-50 flex items-center justify-between transition-colors ${selectedRoomTypes.includes(type as string) ? 'bg-[#1565D8] text-white font-bold' : 'text-[#1e1e6e] hover:bg-gray-50 font-medium'}`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedRoomTypes([type as string]);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <span className="truncate pr-2">{type as string}</span>
                            {selectedRoomTypes.includes(type as string) && (
                              <FaCheckCircle size={14} className="text-white shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side: Amenities Pills */}
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar ml-auto pl-6 lg:pl-12">
                {displayAmenities.slice(0, 5).map((amenity: string, idx: number) => (
                  <div
                    key={idx}
                    className="whitespace-nowrap px-4 py-1.5 bg-white rounded-lg text-black border border-gray-200 flex-shrink-0 transition-all cursor-default shadow-sm"
                    style={{ fontSize: '16px', fontWeight: 400, fontFamily: 'Inter, sans-serif' }}
                  >
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          </div>



          {/* id lives on the rooms heading above; duplicating it here made the
              document invalid and getElementById ambiguous. */}
          <div className="mb-20">
            {(() => {
              // Exact pricing – no rounding
              const markedUpRoomProducts = roomProducts.map((room: any) => {
                const nights = calculateNights(searchParams?.checkIn, searchParams?.checkOut) || 1;
                const apiTotal = room.price || room.totalPriceInclusive || 0;
                // Use exact total – do NOT round per‑night and multiply back
                const retailTotal = apiTotal;

                const updatedPricing = room.pricing || room.pricingBreakdown || {};
                // Only derive finalTotalPrice when the backend didn't send one —
                // overwriting it drops the master's B2C markup.
                const finalTotal = updatedPricing.finalTotalPrice ?? retailTotal;
                const pricingBreakdown = {
                  ...updatedPricing,
                  finalTotalPrice: finalTotal,
                  perNightPrice: finalTotal / Math.max(1, nights),
                };

                return {
                  ...room,
                  apiPrice: room.price || 0,
                  apiTotalPriceInclusive: apiTotal,
                  totalPriceInclusive: retailTotal,
                  price: retailTotal,
                  pricingBreakdown,
                  pricing: pricingBreakdown,
                };
              });

              return (
                <>
                  {isLoadingRooms && (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="w-full rounded-2xl overflow-hidden border border-gray-100 shadow-sm bg-white flex flex-col md:flex-row" style={{ minHeight: '160px' }}>
                          {/* Image skeleton */}
                          <div className="w-full md:w-[200px] md:min-w-[200px] h-[140px] md:h-auto bg-gray-200 relative overflow-hidden flex-shrink-0">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                          </div>
                          {/* Content skeleton */}
                          <div className="flex-1 p-4 md:p-5 flex flex-col justify-between gap-3">
                            <div className="flex flex-col gap-2">
                              <div className="h-5 bg-gray-200 rounded w-2/5 animate-pulse" />
                              <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                              <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse" />
                              <div className="h-3 bg-gray-200 rounded w-2/5 animate-pulse" />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex flex-col gap-1">
                                <div className="h-6 bg-gray-200 rounded w-28 animate-pulse" />
                                <div className="h-3 bg-gray-200 rounded w-20 animate-pulse" />
                              </div>
                              <div className="h-10 bg-red-200/60 rounded-lg w-28 animate-pulse" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {roomsError && (
                    <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm max-w-2xl mx-auto my-4">
                      <p className="text-gray-900 font-bold text-xl mb-2">Rooms Unavailable</p>
                      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        No rooms are available for the selected dates. Please check again with new dates.
                      </p>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-all text-sm"
                      >
                        Check New Dates
                      </button>
                    </div>
                  )}

                  {!roomsError && (
                    <HotelValidationPanel
                      products={roomProducts}
                      isMultiRoom={isMultiRoom}
                      isLoading={isLoadingRooms}
                    />
                  )}

                  {!isLoadingRooms && !roomsError && roomProducts.length > 0 && (
                    <>
                      {isMultiRoom && !isTJ ? (
                        <div className="space-y-10">
                          {Array.from({ length: totalSlots }, (_, slotIdx) => {
                            const slotConfig = searchParams.rooms[slotIdx];
                            const slotAdults = slotConfig?.Adults || 1;
                            const slotChildren = slotConfig?.Children || 0;
                            const selected = selectedRooms[slotIdx];
                            const otherSelected = Object.values(selectedRooms).find(
                              (r: any) => r && r.roomIndex !== slotIdx,
                            ) as any;
                            const otherBoard = otherSelected
                              ? (otherSelected.boardName || otherSelected.mealBasis || '')
                                .trim()
                                .toLowerCase()
                              : null;

                            return (
                              <div key={slotIdx}>
                                <div
                                  className={`flex items-center justify-between mb-4 p-4 rounded-xl border-2 ${selected ? 'border-green-400 bg-green-50' : 'border-blue-200 bg-blue-50'}`}
                                >
                                  <div>
                                    <h3 className="font-bold text-gray-900 text-base">
                                      Room {slotIdx + 1}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                      {slotAdults} Adult{slotAdults > 1 ? 's' : ''}
                                      {slotChildren > 0
                                        ? `, ${slotChildren} Child${slotChildren > 1 ? 'ren' : ''}`
                                        : ''}
                                    </p>
                                  </div>
                                  {selected && (
                                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
                                      <FaCheckCircle className="text-green-500" size={16} />
                                      {selected.title || 'Room selected'}
                                    </div>
                                  )}
                                  {!selected &&
                                    (() => {
                                      if (otherSelected && isTJ) {
                                        return (
                                          <span className="text-amber-700 text-[10px] uppercase tracking-wider font-extrabold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg animate-pulse flex items-center gap-1.5 shadow-sm">
                                            ⚠️ Must match board: "
                                            {otherSelected.boardName ||
                                              otherSelected.mealBasis ||
                                              'Room Only'}
                                            "
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className="text-blue-600 text-sm font-semibold">
                                          ← Choose a room
                                        </span>
                                      );
                                    })()}
                                </div>
                                {/* Cards for this slot */}
                                <div className="grid grid-cols-1 gap-6">
                                  {(selectedRoomTypes.length === 0
                                    ? markedUpRoomProducts
                                    : markedUpRoomProducts.filter(
                                      (r) => selectedRoomTypes.includes(r.roomTypeName || r.roomType),
                                    )
                                  ).map((room: any, index: number) => {
                                    const currentBoard = (room.boardName || room.mealBasis || '')
                                      .trim()
                                      .toLowerCase();
                                    const isSelectable =
                                      isTJ && isMultiRoom && otherBoard
                                        ? otherBoard === currentBoard
                                        : true;

                                    return (
                                      <div
                                        key={index}
                                        className={`transition-all duration-300 ${isSelectable ? '' : 'opacity-30 filter grayscale-[40%] pointer-events-none'}`}
                                      >
                                        <RoomCard
                                          onRequireLogin={() => setShowLoginModal(true)}
                                          title={room.roomTypeName || 'Room'}
                                          price={room.totalPriceInclusive || room.price || 0}
                                          hotelMainImage={sortedImages[0]}
                                          netPrice={
                                            room.apiTotalPriceInclusive || room.apiPrice || 0
                                          }
                                          image={
                                            formatHotelImageUrl(room.images?.[0] || room.image) ||
                                            ''
                                          }
                                          images={(room.images || [])
                                            .map(formatHotelImageUrl)
                                            .filter(Boolean)}
                                          features={extractFeatures({
                                            hotelBoard: room.boardName,
                                            cancellationPolicies: room.cancellationPolicies,
                                            allotment: room.allotment,
                                            amenities: room.amenities,
                                            ...room,
                                          })}
                                          rateKey={room.rateKey}
                                          boardName={room.boardName}
                                          adults={slotAdults}
                                          children={slotChildren}
                                          roomTypeCode={room.roomTypeCode}
                                          numberOfRooms={room.numberOfRooms}
                                          allotment={room.allotment}
                                          hotelData={hotelData}
                                          searchParams={searchParams}
                                          rateComments={room.rateComments}
                                          cancellationPolicies={room.cancellationPolicies || []}
                                          offers={room.offers || []}
                                          roomInfo={room.roomInfo}
                                          taxesInfo={room.taxesInfo || room.taxes || null}
                                          isMandatory={room.isMandatory || false}
                                          isSelected={
                                            selected?.rateKey === room.rateKey &&
                                            selected?.roomIndex === slotIdx
                                          }
                                          onSelect={(roomData) =>
                                            handleRoomSelect(roomData, slotIdx)
                                          }
                                          roomIndex={slotIdx}
                                          variant="grid"
                                          reviewHash={room.reviewHash}
                                          correlationId={room.correlationId}
                                          hid={room.hid}
                                          mealBasis={room.mealBasis}
                                          compliance={room.compliance}
                                          pricingBreakdown={room.pricing || room.pricingBreakdown}
                                          onHoldAllowed={room.onHoldAllowed}
                                          bookingNotes={room.bookingNotes}
                                          bed_config={room.bed_config}
                                          amenities={room.amenities && room.amenities.length > 0 ? room.amenities : hotelData?.amenities}
                                          inclusions={room.inclusions || []}
                                          isRefundable={room.isRefundable}
                                          refundableLabel={room.refundableLabel}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          {allSlotsSelected &&
                            (() => {
                              const matchedTjCombo =
                                isTJ && isMultiRoom && allTjOptions && allTjOptions.length > 0
                                  ? allTjOptions.find((opt) => {
                                    if (!opt.roomInfo || opt.roomInfo.length !== totalSlots)
                                      return false;
                                    return opt.roomInfo.every((ri: any, idx: number) => {
                                      const sel = selectedRooms[idx];
                                      if (!sel) return false;
                                      const selBoard = (sel.boardName || sel.mealBasis || '')
                                        .trim()
                                        .toLowerCase();
                                      const optBoard = (ri.mealBasis || opt.mealBasis || '')
                                        .trim()
                                        .toLowerCase();
                                      const selCode = sel.roomTypeCode || '';
                                      const optCode = ri.roomCode || '';
                                      return selCode === optCode && selBoard === optBoard;
                                    });
                                  })
                                  : null;

                              const isComboUnavailable = isTJ && isMultiRoom && !matchedTjCombo;
                              let comboPrice = Object.values(selectedRooms).reduce(
                                (s: number, r: any) => s + Number(r.price || 0),
                                0,
                              );
                              return (
                                <div className="sticky bottom-4 z-20 animate-in slide-in-from-bottom-4 duration-300">
                                  <div
                                    className={`${isComboUnavailable ? 'bg-red-600' : 'bg-green-600'} text-white rounded-2xl shadow-2xl p-4 flex items-center justify-between`}
                                  >
                                    <div>
                                      <p className="font-bold text-base">
                                        All {totalSlots} rooms selected!
                                      </p>
                                      {isComboUnavailable ? (
                                        <p className="text-red-100 text-sm">
                                          ⚠️ This combination is unavailable — please change a room
                                        </p>
                                      ) : (
                                        <>
                                          <p className="text-green-100 text-sm font-semibold">
                                            Total: ₹
                                            {comboPrice.toLocaleString('en-IN', {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}
                                          </p>
                                          {isTJ && isMultiRoom && (
                                            <p className="text-green-200 text-[10px]">
                                              Live price from TripJack API ✓
                                            </p>
                                          )}
                                        </>
                                      )}
                                    </div>
                                    <button
                                      disabled={isComboUnavailable}
                                      onClick={() => {
                                        navigateToBooking(
                                          isTJ && isMultiRoom ? matchedTjCombo : undefined,
                                        );
                                      }}
                                      className={`${isComboUnavailable ? 'bg-red-200 text-red-800 cursor-not-allowed' : 'bg-white text-green-700 hover:bg-green-50'} font-bold px-6 py-2.5 rounded-xl transition-all active:scale-95 shadow-md text-sm uppercase tracking-wide`}
                                    >
                                      {isComboUnavailable
                                        ? 'Combo Unavailable'
                                        : 'Book Selected Rooms →'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                        </div>
                      ) : (
                        /* Single-room mode: flat grid (original behaviour) */
                        <div className="grid grid-cols-1 gap-6">
                          {(selectedRoomTypes.length === 0
                            ? markedUpRoomProducts
                            : markedUpRoomProducts.filter(
                              (r) => selectedRoomTypes.includes(r.roomTypeName || r.roomType),
                            )
                          ).map((room: any, index: number) => (
                            <RoomCard
                              onRequireLogin={() => setShowLoginModal(true)}
                              key={index}
                              title={room.roomTypeName || 'Room'}
                              hotelMainImage={sortedImages[0]}
                              price={room.totalPriceInclusive || room.price || 0}
                              netPrice={room.apiTotalPriceInclusive || room.apiPrice || 0}
                              image={formatHotelImageUrl(room.images?.[0] || room.image) || ''}
                              images={room.images || []}
                              features={extractFeatures({
                                hotelBoard: room.boardName,
                                cancellationPolicies: room.cancellationPolicies,
                                allotment: room.allotment,
                                amenities: room.amenities,
                                ...room,
                              })}
                              rateKey={room.rateKey}
                              boardName={room.boardName}
                              adults={room.adults}
                              children={room.children}
                              roomTypeCode={room.roomTypeCode}
                              numberOfRooms={room.numberOfRooms}
                              allotment={room.allotment}
                              hotelData={hotelData}
                              searchParams={searchParams}
                              rateComments={room.rateComments}
                              cancellationPolicies={room.cancellationPolicies || []}
                              offers={room.offers || []}
                              roomInfo={room.roomInfo}
                              taxesInfo={room.taxesInfo || room.taxes || null}
                              isMandatory={room.isMandatory || false}
                              isSelected={false}
                              onSelect={() => navigateToBooking(room)}
                              buttonLabel={
                                isTJ && isMultiRoom ? 'Select Package' : 'Select This Room'
                              }
                              variant="grid"
                              reviewHash={room.reviewHash}
                              correlationId={room.correlationId}
                              hid={room.hid}
                              mealBasis={room.mealBasis}
                              compliance={room.compliance}
                              pricingBreakdown={room.pricing || room.pricingBreakdown}
                              onHoldAllowed={room.onHoldAllowed}
                              optionType={room.optionType}
                              bookingNotes={room.bookingNotes}
                              bed_config={room.bed_config}
                              amenities={
                                room.amenities && room.amenities.length > 0
                                  ? room.amenities
                                  : hotelData?.amenities
                              }
                              inclusions={room.inclusions || []}
                              isRefundable={room.isRefundable}
                              refundableLabel={room.refundableLabel}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {!hasDates && (
                    <SelectDatesPrompt
                      hotelId={hotelData.id}
                      city={hotelData.city || searchParams?.location || ''}
                      destCode={searchParams?.destinationCode}
                    />
                  )}

                  {hasDates && !isLoadingRooms && !roomsError && roomProducts.length === 0 && (
                    <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm max-w-2xl mx-auto my-4">
                      <p className="text-gray-900 font-bold text-xl mb-2">Rooms Unavailable</p>
                      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                        No rooms are available for the selected dates. Please check again with new dates.
                      </p>
                      <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-sm transition-all text-sm"
                      >
                        Check New Dates
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Location & Attractions Section */}
          <div className="mb-20" id="section-location">
            <div className="flex flex-col lg:flex-row gap-4 justify-center items-center w-full my-6 px-4 lg:px-0">
              {/* Left Column – Nearby Places */}
              <div
                className="w-full lg:flex-1 min-w-0 rounded-[20px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-100 flex flex-col overflow-hidden relative z-10"
                style={{ minHeight: 400 }}
              >
                {/* Category Icon Tabs (Luxury Pills) */}
                <div
                  className="flex items-center gap-3 p-5 border-b border-gray-100 overflow-x-auto bg-gray-50/30"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {dynamicTabs.map((tab) => {
                    const tabMeta: Record<
                      string,
                      { icon: React.ReactNode; color: string; bg: string }
                    > = {
                      Restaurants: {
                        icon: <Utensils className="w-4 h-4" />,
                        color: '#dc2626',
                        bg: '#fef2f2',
                      },
                      'Monuments & Tourist Attractions': {
                        icon: <Landmark className="w-4 h-4" />,
                        color: '#6d28d9',
                        bg: '#f5f3ff',
                      },
                      'Transportation (Airports / Metro / Transit)': {
                        icon: <Train className="w-4 h-4" />,
                        color: '#2563eb',
                        bg: '#eff6ff',
                      },
                      'Shopping Malls': {
                        icon: <ShoppingBag className="w-4 h-4" />,
                        color: '#d97706',
                        bg: '#fffbeb',
                      },
                    };
                    const meta = tabMeta[tab] || {
                      icon: <MapPin className="w-4 h-4" />,
                      color: '#4b5563',
                      bg: '#f3f4f6',
                    };
                    const isActive = activeAttractionTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveAttractionTab(tab);
                          setSelectedAttraction(null);
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 border whitespace-nowrap ${isActive
                          ? 'border-transparent shadow-md transform scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm hover:bg-gray-50 text-gray-600'
                          }`}
                        style={isActive ? { backgroundColor: meta.color, color: 'white' } : {}}
                      >
                        <span
                          className={`text-[15px] flex items-center justify-center leading-none rounded-full p-1 shadow-sm ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}
                        >
                          {meta.icon}
                        </span>
                        <span
                          className="text-sm font-bold tracking-wide"
                          style={{ color: isActive ? 'white' : '' }}
                        >
                          {tab.split(' ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Places List */}
                <div className="flex-1 overflow-y-auto font-sans p-3" style={{ maxHeight: 340 }}>
                  {getAttractionsForTab(activeAttractionTab).length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {getAttractionsForTab(activeAttractionTab).map((attr, idx) => {
                        const categoryMeta: Record<
                          string,
                          { icon: React.ReactNode; color: string; bg: string }
                        > = {
                          Restaurants: {
                            icon: <Utensils className="w-5 h-5" />,
                            color: '#dc2626',
                            bg: '#fef2f2',
                          },
                          'Monuments & Tourist Attractions': {
                            icon: <Landmark className="w-5 h-5" />,
                            color: '#6d28d9',
                            bg: '#f5f3ff',
                          },
                          'Transportation (Airports / Metro / Transit)': {
                            icon: <Train className="w-5 h-5" />,
                            color: '#2563eb',
                            bg: '#eff6ff',
                          },
                          'Shopping Malls': {
                            icon: <ShoppingBag className="w-5 h-5" />,
                            color: '#d97706',
                            bg: '#fffbeb',
                          },
                        };
                        const meta = categoryMeta[attr.type] || {
                          icon: <MapPin className="w-5 h-5" />,
                          color: '#4b5563',
                          bg: '#f3f4f6',
                        };
                        const isSelected = selectedAttraction === attr.name;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedAttraction(isSelected ? null : attr.name)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all duration-300 border ${isSelected
                              ? 'bg-blue-50/40 border-blue-200 shadow-sm'
                              : 'bg-transparent border-transparent hover:bg-gray-50'
                              }`}
                          >
                            {/* Category Icon Circle */}
                            <div
                              className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm transition-transform duration-300 ${isSelected ? 'scale-110' : ''}`}
                              style={{ background: meta.bg, color: meta.color }}
                            >
                              {meta.icon}
                            </div>

                            {/* Place Name */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-[14.5px] font-bold truncate transition-colors"
                                style={{ color: isSelected ? '#1d4ed8' : '#1e293b' }}
                              >
                                {attr.name}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {attr.type.split(' ')[0]}
                              </p>
                            </div>

                            {/* Distance Badge */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {attr.dist !== 'Check map' && (
                                <span
                                  className={`text-[12px] font-extrabold px-3 py-1 rounded-lg transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md' : ''
                                    }`}
                                  style={
                                    !isSelected ? { background: meta.bg, color: meta.color } : {}
                                  }
                                >
                                  {attr.dist}
                                </span>
                              )}
                              <FaChevronRight
                                className={`w-4 h-4 transition-transform duration-300 ${isSelected ? 'text-blue-600 translate-x-1' : 'text-gray-300'}`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center flex flex-col items-center justify-center h-full">
                      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <span className="text-3xl opacity-50 grayscale">🗺️</span>
                      </div>
                      <p className="text-[14px] font-semibold text-gray-500">
                        No nearby {activeAttractionTab.toLowerCase()} found.
                      </p>
                      <p className="text-[12px] text-gray-400 mt-1">
                        Try exploring a different category
                      </p>
                    </div>
                  )}
                  
                  {/* Cabs Redirect Button for Transportation Tab */}
                  {activeAttractionTab.includes('Transportation') && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-center w-full pb-2">
                      <button
                        onClick={() => window.open('/cabs', '_blank')}
                        className="w-[90%] md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <Car size={16} />
                        Need a ride? Book a Cab
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Map */}
              <div
                className="w-full lg:flex-1 min-w-0 rounded-[8.78px] flex-shrink-0 relative bg-gray-100 shadow-sm border border-gray-200 overflow-hidden"
                style={{ minHeight: 384 }}
              >
                <div className="absolute inset-0 w-full h-full">
                  <InteractiveHotelMap
                    hotelData={hotelData}
                    selectedAttraction={selectedAttraction}
                    nearbyPlaces={googlePlaces}
                    onPlacesFetched={handlePlacesFetched}
                  />
                </div>

                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 z-20 bg-white rounded-md shadow border border-gray-200 flex items-center overflow-hidden">
                  <input
                    type="text"
                    placeholder="Search nearby places..."
                    value={customMapSearch}
                    onChange={(e) => setCustomMapSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customMapSearch.trim() !== '') {
                        setSelectedAttraction(customMapSearch);
                      }
                    }}
                    className="px-3 py-2 text-sm text-gray-700 focus:outline-none w-48"
                  />
                  <button
                    onClick={() => {
                      if (customMapSearch.trim() !== '') {
                        setSelectedAttraction(customMapSearch);
                      }
                    }}
                    className="px-3 py-2 text-gray-500 hover:text-[#1565D8] bg-gray-50 border-l border-gray-200 transition-colors"
                  >
                    <FaSearch className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Popular Facilities (Moved from top) */}
          <div className="mb-20 w-full mx-auto" id="section-facilities">
            <div className="mb-4">
              <h2
                className="font-bold text-[#3771D4]"
                style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', lineHeight: '100%' }}
              >
                Popular Facilities
              </h2>
            </div>

            <div className="flex flex-col w-full">
              {Object.keys(categorizeAmenities(hotelData.amenities || [])).length > 0 ? (
                Object.entries(categorizeAmenities(hotelData.amenities || [])).map(([category, list]) => (
                  <div key={category} className="pt-[24px] pb-[1px] border-b border-[#F3F4F6] flex flex-col gap-[16px] last:border-b-0">
                    <h3
                      className="font-bold text-[#1E2939]"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', lineHeight: '28px' }}
                    >
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px] mb-[23px]">
                      {list.map((amenity: string, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-[8px] transition-all text-[#1E2939]"
                        >
                          <div className="flex items-center justify-center text-gray-500 shrink-0">
                            {getAmenityIcon(amenity)}
                          </div>
                          <span
                            className="font-medium"
                            style={{ fontFamily: 'Inter, sans-serif', fontSize: '16px', lineHeight: '16px' }}
                          >
                            {amenity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic py-8 text-center border-t border-gray-100 mt-6 pt-6">No facilities data available</div>
              )}
            </div>
          </div>

          {(() => {
            const pol = hotelData.policies || {};
            const checkInCheckOut = pol.checkInCheckOut || {};
            const checkinFrom = checkInCheckOut.checkin_from || hotelData.checkInTime || '';
            const checkoutFrom = checkInCheckOut.checkout_from || hotelData.checkOutTime || '';

            // Parse know_before_you_go — may be a JSON string or plain object
            let knowBefore: Record<string, string> = {};
            try {
              const raw = pol.know_before_you_go;
              if (typeof raw === 'string') {
                let trimmed = raw.trim();
                if (
                  (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                  (trimmed.startsWith("'") && trimmed.endsWith("'"))
                ) {
                  try {
                    trimmed = JSON.parse(trimmed);
                  } catch (e) { }
                }
                if (trimmed.startsWith('{')) {
                  knowBefore = JSON.parse(trimmed);
                } else if (trimmed) {
                  knowBefore = { Policy: trimmed };
                }
              } else if (typeof raw === 'object' && raw !== null) {
                knowBefore = raw;
              }
            } catch {
              // ignore parse errors
            }

            const knowBeforeEntries = Object.entries(knowBefore).filter(([, v]) => v);
            const hasAnyPolicy =
              checkinFrom ||
              checkoutFrom ||
              knowBeforeEntries.length > 0 ||
              hotelData.checkInInstructions ||
              hotelData.specialInstructions ||
              hotelData.rateComments ||
              (hotelData.fees && hotelData.fees.length > 0);

            if (!hasAnyPolicy) return null;
            return (
              <div className="w-full mx-auto mb-20 flex flex-col" id="section-policies">
                <div className="mb-4">
                  <h2
                    className="font-bold text-[#3771D4]"
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: '24px', lineHeight: '100%' }}
                  >
                    Policies
                  </h2>
                </div>

                <div
                  className="w-full flex flex-col gap-4 text-[#4B5563]"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: 400,
                    fontSize: '16px',
                    lineHeight: '24px',
                    textAlign: 'justify'
                  }}
                >
                  {(checkinFrom || checkoutFrom) && (
                    <p>
                      {checkinFrom && `Check-in From: ${checkinFrom}. `}
                      {checkoutFrom && `Check-out By: ${checkoutFrom}.`}
                    </p>
                  )}

                  {knowBeforeEntries.length > 0 && (
                    <div>
                      {knowBeforeEntries.map(([key, val]) => (
                        <p key={key} className="whitespace-pre-line mb-4 last:mb-0">
                          {val}
                        </p>
                      ))}
                    </div>
                  )}

                  {hotelData.fees && hotelData.fees.length > 0 && (
                    <div>
                      <p><strong>Additional Fees & Charges:</strong></p>
                      <ul className="list-disc pl-5 mt-2">
                        {hotelData.fees.map((fee: any, idx: number) => {
                          const feeText = typeof fee === 'string' ? fee : fee.description || fee.name || JSON.stringify(fee);
                          return <li key={idx}>{feeText}</li>;
                        })}
                      </ul>
                    </div>
                  )}

                  {hotelData.checkInInstructions && (
                    <p className="whitespace-pre-line">
                      {hotelData.checkInInstructions}
                    </p>
                  )}

                  {hotelData.specialInstructions && (
                    <p className="whitespace-pre-line">
                      {hotelData.specialInstructions}
                    </p>
                  )}

                  {hotelData.rateComments && (
                    <p className="whitespace-pre-line">
                      {hotelData.rateComments}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Similar Properties Section */}
          {hotelData && (
            <SimilarHotels
              destinationCode={searchParams?.destinationCode || hotelData?.destinationCode}
              city={searchParams?.location || hotelData?.city || hotelData?.address}
              checkIn={searchParams?.checkIn}
              checkOut={searchParams?.checkOut}
              rooms={searchParams?.rooms}
              currentHotelId={hotelData?.id}
              currentStarRating={hotelData?.starRating || hotelData?.rating || 0}
              currentPrice={hotelData?.minPrice || hotelData?.price || 0}
            />
          )}
        </div>
      </main>

      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={sortedImages}
        hotelName={hotelData.name}
      />
      <FacilitiesModal
        isOpen={isFacilitiesModalOpen}
        onClose={() => setIsFacilitiesModalOpen(false)}
        amenities={hotelData.amenities || []}
        hotelName={hotelData.name}
      />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </div>
  );
};

const LoginModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in duration-300">
        <div className="hidden md:block md:w-1/2 relative bg-blue-900 h-full min-h-[500px]">
          <img
            src="https://images.pexels.com/photos/1008155/pexels-photo-1008155.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
            alt="Travel"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-10 text-white">
            <h2 className="text-3xl font-bold mb-3">Almost There!</h2>
            <p className="text-sm opacity-90 leading-relaxed">
              Log in to your partner account to secure this booking and manage your travel business.
            </p>
          </div>
        </div>
        <div className="w-full md:w-1/2 p-2 relative bg-white flex flex-col">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-2 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
          <div className="flex-1 scale-90 -mt-8">
            <LoginForm
              disableRedirect={true}
              onLoginResult={(result) => {
                if (result.type === 'DASHBOARD' || result.type === 'ACTIVE') {
                  onClose();
                  window.location.reload();
                }
              }}
              onNavigateToSignup={() => {
                onClose();
                navigate('/signup');
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotelDetailPage;
