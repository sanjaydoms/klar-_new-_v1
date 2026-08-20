import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Star,
  Clock,
  Tag,
  ShieldCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Heart,
  Sparkles,
  Camera,
  ThumbsUp,
  Coffee,
  Wifi,
  Car,
  Utensils,
  Calendar,
  CreditCard,
  Wind,
  Bell,
  Tv,
} from 'lucide-react';
import { formatHotelImageUrl, calculateNights, encodeRoomsToUrl, NO_HOTEL_IMAGE, toggleWishlistHotel, isHotelWishlisted, formatINR } from '@/utils/hotelUtils';

const formatHotelAddress = (address?: string | null): string => {
  if (!address) return '';
  return address.trim();
};

interface HotelCardProps {
  id: string;
  name: string;
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  reviewScore: string;
  reviewLabel: string;
  price: number; // Total stay price
  basePrice?: number; // Base net price excl. taxes — use for per-night display
  taxAmount?: number; // Taxes on top of base (0 if included)
  taxesIncluded?: boolean; // true = all taxes included in price
  apiPrice?: number;
  originalPrice?: number | null;
  discount?: string | null;
  image: string;
  images?: string[];
  propertyCode?: string | null;
  brandCode?: string | null;
  city?: string | null;
  address?: string | null;
  amenities?: string[] | null;
  allotment?: number | null;
  cancellationPolicy?: string | null;
  description?: string | null;
  source?: string | undefined;
  isRefundable?: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  rateComments?: string | null;
  hotelBoards?: string[];
  hotelSegments?: string[];
  altDeal?: { source: string; price: number };
  correlationId?: string;
  rawPayload?: any;
  inclusions?: string[] | null;
  onWishlistToggle?: (id: string, isWishlisted: boolean) => void;
}

const getReviewLabel = (score: string | number): string => {
  const s = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(s) || s <= 0) return '';
  if (s >= 9) return 'Excellent';
  if (s >= 8) return 'Very Good';
  if (s >= 7) return 'Good';
  if (s >= 6) return 'Pleasant';
  return 'Fair';
};

const MAX_HOTEL_IMAGES = 5;
const HotelCard: React.FC<HotelCardProps> = ({
  id,
  name,
  location,
  distance,
  rating,
  reviews,
  reviewScore,
  reviewLabel,
  price,
  basePrice,
  taxAmount = 0,
  taxesIncluded,
  apiPrice,
  originalPrice,
  discount,
  image,
  images = [],
  propertyCode,
  brandCode,
  city,
  address,
  amenities,
  allotment,
  cancellationPolicy,
  description,
  checkInTime,
  checkOutTime,
  rateComments,
  hotelBoards = [],
  hotelSegments = [],
  source,
  isRefundable,
  altDeal,
  correlationId,
  rawPayload,
  inclusions = [],
  onWishlistToggle,
}) => {
  const navigate = useNavigate();
  const hasReviews = reviews > 0 || (reviewScore && reviewScore !== '0.0' && reviewScore !== '0');

  // Removed duplicate reviewBoxColor declaration

  const [isWishlisted, setIsWishlisted] = React.useState(() => isHotelWishlisted(id));

  React.useEffect(() => {
    setIsWishlisted(isHotelWishlisted(id));
  }, [id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const hotelData = {
      id,
      name,
      location,
      city,
      address,
      rating,
      image,
      images,
      price,
      basePrice,
      source,
    };
    const newState = toggleWishlistHotel(hotelData);
    setIsWishlisted(newState);
    onWishlistToggle?.(id, newState);
  };

  // MMT-style review-score box colour, keyed to the same 0–10 bands as getReviewLabel.
  const reviewScoreNum = parseFloat(reviewScore) || 0;
  const reviewBoxColor =
    reviewScoreNum >= 8
      ? '#16a34a'
      : reviewScoreNum >= 7
        ? '#1e40af'
        : reviewScoreNum >= 5
          ? '#0891b2'
          : '#d97706';

  // Calculate nights from session storage search params
  const searchParams = React.useMemo(() => {
    try {
      const stored = sessionStorage.getItem('hotelSearchParams');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const nights = React.useMemo(() => {
    return calculateNights(searchParams?.checkIn, searchParams?.checkOut);
  }, [searchParams]);

  // ── Per-night pricing ─────────────────────────────────────────────────
  // The headline number is the ALL-IN price, for every supplier.
  //
  // It used to be `basePrice`, which is not comparable across suppliers: TripJack
  // quotes a base with taxes on top, RateGain usually folds them in. Two cards
  // side by side then read "₹2,516 + ₹130 taxes & fees" and "₹1,850 incl. taxes
  // & fees" — different quantities in the same visual slot, so the cheaper-looking
  // hotel was not reliably the cheaper one.
  //
  // `price` is the one field whose meaning is supplier-independent: the unified
  // model defines it as "Total stay price (base + taxes). Always total." Deriving
  // the headline from it makes cards comparable by construction, with no supplier
  // branch here. `basePrice`/`taxAmount` are used only to DISCLOSE the tax split
  // when the supplier gives one — never to decide what the big number means.
  //
  // Deliberately not keyed on `taxesIncluded`: for RateGain that flag is inferred
  // from whether a tax field happened to be present (rateGainAdapter.ts:445),
  // not stated by the supplier, so it cannot carry a pricing decision.
  const effectiveBasePrice = basePrice ?? price; // fall back to total if no breakdown
  const effectiveTaxAmount = taxAmount ?? 0;

  const perNightBasePrice = React.useMemo(() => {
    if (!nights) return null; // Bug 1.4 fix: no nights = no per-night price
    return Math.round(effectiveBasePrice / nights);
  }, [effectiveBasePrice, nights]);

  // total per night (base + tax) for showing "total incl. taxes" line
  const perNightTotal = React.useMemo(() => {
    if (!nights) return null;
    return Math.round(price / nights);
  }, [price, nights]);

  const perNightTaxAmount = React.useMemo(() => {
    if (!nights) return null;
    return Math.round(effectiveTaxAmount / nights);
  }, [effectiveTaxAmount, nights]);

  const perNightOriginalPrice = React.useMemo(() => {
    return originalPrice ? Math.round(originalPrice / (nights || 1)) : null;
  }, [originalPrice, nights]);

  const allImages = React.useMemo(() => {
    const fallbackList = [NO_HOTEL_IMAGE];
    if (images && images.length > 0) return images;
    if (image) return [image];
    return fallbackList;
  }, [image, images]);

  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);

  const maxImages = Math.min(allImages.length, MAX_HOTEL_IMAGES);

  React.useEffect(() => {
    if (!isHovered || maxImages <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % maxImages);
    }, 2000);
    return () => clearInterval(interval);
  }, [isHovered, maxImages]);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (maxImages > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % maxImages);
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (maxImages > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + maxImages) % maxImages);
    }
  };

  const saveToRecent = (hotelData: any, searchParams: any) => {
    let recentHotels: any[] = [];
    try {
      recentHotels = JSON.parse(localStorage.getItem('recentHotels') || '[]');
    } catch (e) {
      console.error('Error parsing recentHotels:', e);
      localStorage.removeItem('recentHotels');
    }

    try {
      const newEntry = {
        id: hotelData.id,
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
      const filtered = recentHotels.filter((h: any) => h.id !== hotelData.id);
      const updated = [newEntry, ...filtered].slice(0, 10);
      localStorage.setItem('recentHotels', JSON.stringify(updated));
    } catch (e) {
      console.error('Error in saveToRecent:', e);
    }
  };

  const handleClick = () => {
    const searchParamsStr = sessionStorage.getItem('hotelSearchParams');
    const params = searchParamsStr ? JSON.parse(searchParamsStr) : null;
    const hotel = {
      id,
      name,
      location,
      city,
      address,
      rating,
      images,
      amenities,
      propertyCode,
      brandCode,
      price,
      reviewScore,
      reviewLabel,
      reviews,
      allotment,
      cancellationPolicy,
      description,
      checkInTime,
      checkOutTime,
      rateComments,
      hotelBoards,
      hotelSegments,
      source,
      isRefundable,
      altDeal,
      // TripJack session fields required for the Detail/Pricing request
      correlationId: correlationId || '',
      rawPayload: rawPayload || null,
    };
    saveToRecent(hotel, params);
    let queryStr = '';
    if (params) {
      const roomsStr = encodeRoomsToUrl(params.rooms || []);
      queryStr = `?city=${encodeURIComponent(params.location || '')}&destCode=${encodeURIComponent(params.destinationCode || '')}&checkin=${params.checkIn || ''}&checkout=${params.checkOut || ''}&rooms=${roomsStr}`;
    }
    navigate(`/hotels/${id}${queryStr}`, {
      state: {
        hotel,
        searchParams: params,
      },
    });
  };

  // Determine if cancellation is free or non-refundable
  // RateGain hotels don't provide cancellation policies at search time, so don't show static Non-Refundable
  const isNonRefundablePolicy =
    isRefundable === false ||
    cancellationPolicy?.toUpperCase().includes('NFR') ||
    cancellationPolicy?.toUpperCase().includes('NON-REFUNDABLE');

  const isRefundablePolicy =
    isRefundable === true ||
    (cancellationPolicy?.toUpperCase().includes('REFUNDABLE') && !cancellationPolicy?.toUpperCase().includes('NON') && !isNonRefundablePolicy) ||
    (cancellationPolicy?.toUpperCase().includes('FREE CANCELLATION') && !isNonRefundablePolicy);

  // Combine RateGain Meal Plans & Segments into dynamic UI Tags
  const offerTags: string[] = [...hotelBoards].filter((b) => typeof b === 'string');
  hotelSegments.forEach((seg) => {
    if (typeof seg === 'string' && seg.toLowerCase() !== 'hotel' && !offerTags.includes(seg)) {
      offerTags.push(seg);
    }
  });

  // Display BOTH meal plans/offer tags AND amenities so we always show rich dynamic content
  const tagsToDisplay = Array.from(new Set([...offerTags, ...(amenities || [])]));

  // MMT-style attribute pills ("Couple Friendly" etc.) — hotel segments only,
  // excluding the generic "hotel" segment which isn't a distinguishing trait.
  const segmentPills = Array.from(
    new Set(
      hotelSegments.filter(
        (seg) => typeof seg === 'string' && seg.trim() && seg.toLowerCase() !== 'hotel',
      ),
    ),
  );

  const discountAmount =
    originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : null;

  const displayDiscount = discount || (discountAmount ? `${discountAmount}%` : null);

  // Removing duplicate block of dynamicPills and displayDescription

  // Dynamic pills construction to match mockup exactly
  const dynamicPills = React.useMemo(() => {
    const list: { text: string; type: 'default' | 'success' }[] = [];

    // 1. Add segment pills (like Couple Friendly, Business hotels)
    segmentPills.forEach((seg) => {
      list.push({ text: seg, type: 'default' });
    });

    // 2. If Free Cancellation is available, prioritize it as a success pill
    if (isRefundablePolicy) {
      list.push({ text: 'Free Cancellation', type: 'success' });
    }

    // 3. Fallback to top amenities/boards if we don't have 2 pills yet
    if (list.length < 2 && tagsToDisplay && tagsToDisplay.length > 0) {
      tagsToDisplay.forEach((tag) => {
        if (list.length < 2 && !segmentPills.includes(tag)) {
          list.push({ text: tag, type: 'default' });
        }
      });
    }

    // Deduplicate list by text
    const seen = new Set<string>();
    const uniq: { text: string; type: 'default' | 'success' }[] = [];
    list.forEach(p => {
      const k = p.text.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        uniq.push(p);
      }
    });

    return uniq;
  }, [isRefundablePolicy, segmentPills, tagsToDisplay]);

  const visiblePills = React.useMemo(() => dynamicPills.slice(0, 2), [dynamicPills]);
  const remainingCount = React.useMemo(() => Math.max(0, tagsToDisplay.length - visiblePills.length), [tagsToDisplay, visiblePills]);

  const displayDescription = React.useMemo(() => {
    if (description && description.trim()) return description;

    const hotelRating = rating && rating > 0 ? `${Math.round(rating)}-star` : 'highly rated';
    const loc = city || address?.split(',')[0] || location || 'this prime location';
    const amens = amenities && amenities.length > 0
      ? ` featuring popular amenities like ${amenities.slice(0, 3).join(', ')}`
      : '';

    return `Welcome to ${name || 'our property'}, a ${hotelRating} hotel located in ${loc}.${amens} Perfect for both leisure and business travelers seeking comfort and convenience.`;
  }, [description, name, rating, city, address, location, amenities]);

  return (
    <div
      onClick={handleClick}
      className="group bg-white border-[1.13px] border-[#E7E7E7] shadow-[0px_1.13px_2.25px_0px_#0000000D] transition-shadow cursor-pointer flex flex-col md:flex-row w-full h-auto md:min-h-[250px] rounded-[9.01px] overflow-hidden mb-4 hover:shadow-md hover:border-[#D1D1D1] duration-300"
    >
      {/* Image container */}
      <div
        className="relative w-full md:w-[360px] md:min-w-[300px] h-[220px] md:h-auto md:self-stretch overflow-hidden bg-gray-50 flex-shrink-0 group/carousel"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-2 right-2 p-1.5 rounded-full z-30 transition-colors backdrop-blur-sm shadow-sm ${
            isWishlisted ? 'bg-red-50 text-red-500' : 'bg-white/80 text-gray-500 hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart size={16} className={isWishlisted ? 'fill-current' : ''} />
        </button>
        {allImages.length > 0 ? (
          <>
            {allImages.slice(0, MAX_HOTEL_IMAGES).map((imgUrl, idx) => (
              <img
                key={idx}
                src={formatHotelImageUrl(imgUrl)}
                alt={`${name} - view ${idx + 1}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => {
                  const t = e.currentTarget;
                  if (t.src !== NO_HOTEL_IMAGE) {
                    t.src = NO_HOTEL_IMAGE;
                  }
                }}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-500 ease-in-out z-10 group-hover:scale-105 ${idx === currentImageIndex ? 'opacity-100' : 'opacity-0'}`}
              />
            ))}
            {allImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity z-20"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity z-20"
                >
                  <ChevronRight size={18} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-1.5 opacity-100 md:opacity-0 md:group-hover/carousel:opacity-100 transition-opacity z-20">
                  {allImages.slice(0, MAX_HOTEL_IMAGES).map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all shadow-sm z-30 ${idx === currentImageIndex ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full min-h-[200px] bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center relative z-0">
            <div className="flex flex-col items-center opacity-30">
              <svg
                className="w-12 h-12 mb-2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Photo count badge */}
        {allImages.length > 0 && (
          <div className="absolute bottom-[13.52px] left-[13.52px] bg-[#0000008C] text-white text-[10.5px] font-semibold px-2 py-1 rounded-[4.51px] flex items-center gap-1 z-20 backdrop-blur-[1px]">
            <Camera size={11} />
            {allImages.length} Photos & Videos
          </div>
        )}
      </div>
      {/* Right box */}
      <div className="flex-1 flex flex-col p-[22.54px] gap-[11.27px] min-w-0 justify-between select-none">
        {/* Right above */}
        <div className="flex flex-col gap-[13.52px] w-full">
          {/* First row: Name box + Best price */}
          <div className="flex justify-between items-start gap-4 w-full min-w-0">
            <div className="flex flex-col gap-[4.51px] flex-grow min-w-0">
              <h3
                className="font-bold text-[22.54px] leading-[31.55px] text-[#1A1F4D] tracking-normal align-middle truncate whitespace-nowrap w-full"
                style={{ fontFamily: "'Playfair Display', serif" }}
                title={name}
              >
                {name}
              </h3>
            </div>

            {/* Best price box */}
            <div className="flex items-center gap-[6px] py-[6.76px] flex-shrink-0 text-[#00A63E]">
              <span className="flex items-center justify-center">
                <Check className="w-[14px] h-[14px]" strokeWidth={3} />
              </span>
              <span className="font-['Inter'] font-bold text-[15.78px] tracking-[0.56px] uppercase leading-[15.02px]">
                Best Price
              </span>
            </div>
          </div>

          {/* Stars */}
          {rating > 0 && (
            <div className="flex items-center gap-[4.51px] w-[69.86px] h-[15.65px]">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-[14px] h-[14px] ${i < Math.round(rating) ? 'text-[#FFC300] fill-current' : 'text-gray-200 fill-current'}`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 .587l3.668 7.431 8.2 1.191-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.209l8.2-1.191L12 .587z" />
                </svg>
              ))}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-[3.38px] w-full text-[15.78px] font-['Inter'] leading-[22.54px] min-w-0">
            <MapPin size={16} className="text-[#2563EB] flex-shrink-0" />
            <span className="font-medium text-[#2563EB] truncate flex-shrink">
              {address?.split(',')[0] || city || 'Location'}
            </span>
            {distance && (
              <span className="text-[#707070] font-normal text-[13.52px] leading-[18.03px] truncate">
                | {distance}
              </span>
            )}
          </div>

          {/* Attribute pills */}
          <div className="flex flex-wrap gap-[9px]">
            {visiblePills.map((pill, i) => (
              <span
                key={i}
                className={`text-[11.27px] font-medium font-['Inter'] px-[10px] py-[4px] rounded-[4.51px] leading-none border ${pill.type === 'success'
                  ? 'bg-[#E8F8F0] border-[#BFF0D7] text-[#00A63E]'
                  : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#707070]'
                  }`}
              >
                {pill.text}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="bg-white border border-[#E5E7EB] text-[#1F2937] font-bold text-[11.27px] font-['Inter'] px-[10px] py-[4px] rounded-[4.51px] leading-none">
                +{remainingCount}
              </span>
            )}
          </div>

          {/* Benefit bullets */}
          <div className="flex flex-col gap-[4.51px] mt-2">
            {inclusions && inclusions.slice(0, 2).map((inc, i) => (
              <span key={i} className="text-[13.52px] text-[#374151] font-medium font-['Inter'] flex items-center gap-2 leading-tight">
                <Check size={14} className="text-[#00A63E] shrink-0" strokeWidth={3} />
                {inc}
              </span>
            ))}
          </div>

          {/* Description to occupy space elegantly on wide desktop screens */}
          {displayDescription && (
            <p className="text-[13.52px] text-[#707070] font-normal leading-relaxed line-clamp-2 mt-[6px] max-w-[480px] font-['Inter']">
              {displayDescription}
            </p>
          )}
        </div>

        {/* Bottom container / Divider */}
        <div className="w-full border-t-[1.13px] border-[#E5E7EB] pt-4 pb-1.5 flex justify-between items-center gap-4 mt-auto">
          {/* Amenities & Cancellation Policy (left) - Stacked vertically one-by-one */}
          <div className="flex flex-col items-start gap-[6px]">
            {/* Cancellation Policy Badge */}
            {isRefundablePolicy && (
              <div className="flex items-center gap-[6px] text-[#00A63E] font-['Inter'] font-semibold text-[13.52px] leading-none mb-1">
                <Check size={14} className="text-[#00A63E] shrink-0" strokeWidth={3} />
                <span>Free Cancellation</span>
              </div>
            )}
            {!isRefundablePolicy && isNonRefundablePolicy && (
              <div className="flex items-center gap-[6px] text-red-600 font-['Inter'] font-semibold text-[13.52px] leading-none mb-1">
                <span className="text-red-600 font-bold shrink-0 w-[14px] text-center">✕</span>
                <span>Non-Refundable</span>
              </div>
            )}

            <div className="flex items-center gap-[6px] text-[#374151] font-['Inter'] font-medium text-[13.52px] leading-none">
              <Calendar size={14} className="text-[#374151] shrink-0" />
              <span>Flexible Booking</span>
            </div>
            {rating >= 1 && (
              <div className="flex items-center gap-[6px] text-[#374151] font-['Inter'] font-medium text-[13.52px] leading-none">
                <Wifi size={14} className="text-[#374151] shrink-0" />
                <span>Free Wi Fi</span>
              </div>
            )}
            <div className="flex items-center gap-[6px] text-[#374151] font-['Inter'] font-medium text-[13.52px] leading-none">
              <CreditCard size={14} className="text-[#374151] shrink-0" />
              <span>Secure Payments</span>
            </div>
          </div>

          {/* Pricing & Button (right) */}
          <div className="flex flex-col items-end gap-[9px] w-[167px] justify-end flex-shrink-0">
            {/* Price Box */}
            <div className="flex flex-col items-end text-right w-full">
              {perNightOriginalPrice && perNightTotal && perNightOriginalPrice > perNightTotal && (
                <span className="text-gray-400 text-[13.52px] line-through font-medium leading-none mb-1">
                  {formatINR(perNightOriginalPrice)}
                </span>
              )}
              <span className="text-[27.04px] font-bold text-[#1A1F4D] font-['Inter'] leading-[27.04px]">
                {formatINR(perNightTotal ?? price)}
              </span>
              <span className="text-[11.27px] text-[#707070] font-['Inter'] font-normal leading-[16.9px] mt-[4.51px]">
                {/* Always all-in, so the wording never changes what the number means;
                    the split is disclosed only when the supplier provides one. */}
                {perNightTaxAmount != null && perNightTaxAmount > 0
                  ? `Incl. ${formatINR(perNightTaxAmount)} taxes & fees / Per Night`
                  : 'Incl. taxes & fees / Per Night'}
              </span>
            </div>

            {/* Select Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClick();
              }}
              className="w-[111.13px] h-[42.38px] bg-[#1A1F4D] hover:bg-[#15193e] active:scale-[0.98] text-white rounded-[4.71px] transition-all shadow-[0px_3.77px_3.77px_0px_#00000040] flex items-center justify-center p-[7.59px] gap-[7.59px]"
            >
              <span className="font-['Inter'] font-semibold text-[18.84px] leading-[22.6px] text-white text-center">
                Select
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MakeMyTrip-style Hotel Info Modal Popup */}
      {showDetailsModal && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowDetailsModal(false);
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden"
          >
            {/* Header */}
            <div className="flex justify-between items-start p-5 border-b border-gray-100 bg-[#FAFAFA]">
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{name}</h2>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                  <span className="flex items-center text-yellow-500 font-semibold">
                    <Star size={13} className="fill-current mr-0.5" />
                    <span>{rating || 5} Star</span>
                  </span>
                  <span>·</span>
                  <span className="truncate">{formatHotelAddress(address) || location}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetailsModal(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* About description */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">About The Property</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-normal whitespace-pre-line">
                  {description || "No property description available for this hotel."}
                </p>
              </div>

              {/* Popular Facilities categorised list */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Popular Facilities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {tagsToDisplay.map((tag, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-slate-600 font-normal">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Inclusions */}
              {inclusions && inclusions.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Special Inclusions</h3>
                  <div className="flex flex-col gap-1.5">
                    {inclusions.map((inc, i) => (
                      <span key={i} className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {inc}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Check-in / Out policies */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">Property Policies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Check-in / Check-out</span>
                    <p className="text-slate-600">Check-in: {checkInTime || "After 2:00 PM"}</p>
                    <p className="text-slate-600">Check-out: {checkOutTime || "Before 11:00 AM"}</p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block mb-1">Cancellation Policy</span>
                    <p className="text-slate-600">{cancellationPolicy || "Free cancellation rules depend on selected rate options."}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetailsModal(false);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                Close
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowDetailsModal(false);
                  handleClick();
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
              >
                View Rooms &amp; Rates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelCard;
