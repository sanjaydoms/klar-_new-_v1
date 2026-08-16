import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHotel, FaPlane, FaCar, FaInfoCircle, FaTimesCircle, FaCheckCircle, FaFileContract, FaKey, FaMoneyBillWave, FaExclamationTriangle, FaPrint, FaDownload, FaUser } from 'react-icons/fa';
import { useAuth } from '../../features/authentication/hooks/useAuth';
import { formatRateComments, formatHotelImageUrl } from '@/utils/hotelUtils';
import PackagesHeader from '../../components/Packages/PackagesHeader';
import PackagesFooter from '../../components/Packages/PackagesFooter';
import Footer from '@/components/layout/Footer';
import {
  checkFlightEmailBookings,
  getFlightBookings,
  getFlightBookingsByBookingId,
  validateBooking,
} from '../../api/flightService.api';
import {
  getBookings,
  cancelBooking as cancelHotelBookingApi,
  getHotelBookingDetails,
  getCancelCharges,
  confirmBooking,
  checkEmailBookings,
} from '../../features/hotels/services/hotelBookingService';
import BookingCard from './bookingComponent/BookingCard';
import BookingDetailsModal from './bookingComponent/BookingDetailsModal';
import HoldConfirmationDetailsModal from './bookingComponent/HoldConfirmationDetailsModal';
import InsuranceBookingsPage from '../Insurance/InsuranceBookingsPage'; // Added insurance import

import { getMyCabBookings, checkCabEmailBookings } from '../../api/cabs.api';
import CabBookingCard from './bookingComponent/CabBookingCard';
import CabBookingDetailsModal from './bookingComponent/CabBookingDetailsModal';

import HotelVoucher from './printable/HotelVoucher';

import CancellationInvoice from './printable/CancellationInvoice';
import Footer2 from '@/components/Footer/Footer2';
import CabVoucher from './printable/CabVoucher';
import API from '../../api/api';
import { notifyError, notifySuccess } from '@/utils/notify';

// ============================================
// HOTEL TYPES & HELPER FUNCTIONS
// ============================================
interface HotelBooking {
  _id: string;
  confirmationNumber: string;
  reservationId: string;
  propertyId: string;
  propertyCode: string;
  status:
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'PENDING'
  | 'FAILED'
  | 'HELD'
  | 'PRECHECK_VALIDATED'
  | 'PAYMENT_RESERVED'
  | 'SUPPLIER_PENDING'
  | 'CANCELLATION_PENDING'
  | 'MANUAL_REVIEW';
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  currencyCode: string;
  guestName?: string;
  rooms: any[];
  createdAt: string;
  rateGainRequest?: any;
  rateGainResponse?: any;
}

const formatDate = (dateString: string | number | Date) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (dateString: string | number | Date) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const isHotelCheckedOut = (booking: HotelBooking) => {
  if (booking.status !== 'CONFIRMED') return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const checkOutDate = new Date(booking.checkOut);
  checkOutDate.setHours(0, 0, 0, 0);
  return now >= checkOutDate;
};

const getBadgeColor = (booking: HotelBooking) => {
  if (isHotelCheckedOut(booking)) {
    return '#EAB308'; // Light yellow / gold / amber
  }

  switch (booking.status) {
    case 'CONFIRMED': return '#22C55E';
    case 'CANCELLED': return '#EF4444';
    case 'CANCELLATION_PENDING': return '#EF4444';
    case 'HELD': return '#F5A623';
    case 'PENDING': return '#F5A623';
    case 'PRECHECK_VALIDATED': return '#F5A623';
    case 'PAYMENT_RESERVED': return '#F5A623';
    case 'SUPPLIER_PENDING': return '#F5A623';
    case 'MANUAL_REVIEW': return '#F5A623';
    default: return '#888888';
  }
};

// ============================================
// HOTEL BOOKING CARD COMPONENT
// ============================================
const hotelStatusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> =
{
  CONFIRMED: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    dot: 'bg-green-500',
    label: 'Confirmed',
  },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Cancelled' },
  PENDING: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Pending',
  },
  HELD: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'On Hold' },
  FAILED: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: 'Failed' },
  // In-flight states between payment and supplier confirmation. Customers see
  // "Processing"; the distinct keys keep the map exhaustive over BookingStatus.
  PRECHECK_VALIDATED: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Processing',
  },
  PAYMENT_RESERVED: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    dot: 'bg-yellow-500',
    label: 'Processing',
  },
  SUPPLIER_PENDING: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Awaiting Confirmation',
  },
  MANUAL_REVIEW: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Under Review',
  },
  CANCELLATION_PENDING: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Cancellation in Progress',
  },
};

const getEffectiveHotelStatus = (booking: HotelBooking) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const checkIn = new Date(booking.checkIn);
  checkIn.setHours(0, 0, 0, 0);

  const checkOut = new Date(booking.checkOut);
  checkOut.setHours(0, 0, 0, 0);

  if (booking.status === 'CONFIRMED') {
    if (now >= checkOut) {
      return { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Checked Out' };
    }
    if (now >= checkIn) {
      return { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Checked In' };
    }
  }

  return (
    hotelStatusConfig[booking.status] ||
    hotelStatusConfig.PENDING || {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      dot: 'bg-gray-400',
      label: 'Unknown',
    }
  );
};

const HotelBookingCard = ({
  booking,
  onCancel,
  onViewDetails,
  onConfirmHold,
  onPrint,
}: {
  booking: HotelBooking;
  onCancel: (b: HotelBooking) => void;
  onViewDetails: (b: HotelBooking) => void;
  onConfirmHold: (b: HotelBooking) => void;
  onPrint: (b: HotelBooking) => void;
}) => {
  const s = getEffectiveHotelStatus(booking);

  const getTjData = (b: any) => {
    let tjName = null,
      tjImg = null;
    try {
      let tjInfo =
        b.tripJackResponse?.itemInfos?.HOTEL ||
        b.tripJackResponse?.body?.itemInfos?.HOTEL ||
        b.tripJackRequest?.itemInfos?.HOTEL;
      if (!tjInfo && typeof b.tripJackResponse === 'string') {
        try {
          const p = JSON.parse(b.tripJackResponse);
          tjInfo = p?.itemInfos?.HOTEL || p?.body?.itemInfos?.HOTEL;
        } catch (e) { }
      }
      if (tjInfo?.hInfo) {
        tjName = tjInfo.hInfo.name;
        tjImg =
          tjInfo.hInfo.img ||
          tjInfo.hInfo.images?.[0]?.links?.['1000px']?.href ||
          tjInfo.hInfo.images?.[0]?.url ||
          tjInfo.hInfo.images?.[0];
      }
    } catch (e) { }
    return { tjName, tjImg };
  };

  const { tjName, tjImg } = getTjData(booking);
  const hotelName =
    (booking as any).hotelName ||
    booking.rateGainResponse?.body?.hotelName ||
    booking.rateGainRequest?.BookReservation?.RoomSelection?.[0]?.Property?.Name ||
    (booking as any).tripJackRequest?.hotelName ||
    tjName ||
    `Property ${booking.propertyCode || 'Unknown'}`;
  const roomType =
    (booking as any).roomType ||
    booking.rateGainResponse?.body?.roomType ||
    booking.rooms?.[0]?.roomType ||
    'Standard Room';

  const rawImage =
    (booking as any).hotelImage ||
    (booking as any).images?.[0] ||
    booking.rateGainResponse?.body?.hotelImage ||
    booking.rateGainResponse?.body?.imageUrl ||
    booking.rateGainResponse?.body?.imageUrlPath ||
    (booking as any).tripJackRequest?.hotelImage ||
    tjImg;
  const imageUrl = rawImage
    ? formatHotelImageUrl(rawImage)
    : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80';

  // Dynamic Room and Guest Calculation (Fallback for older bookings missing `rooms` array)
  let roomCount = booking.rooms?.length;
  let paxCount = booking.rooms?.reduce((acc, r) => acc + (r.guests || 2), 0);

  // Dynamic Check-in/Check-out Times
  const getHotelTimes = () => {
    let inTime = '';
    let outTime = '';

    try {
      const bAny = booking as any;
      let tjInfo =
        bAny.tripJackResponse?.itemInfos?.HOTEL ||
        bAny.tripJackResponse?.body?.itemInfos?.HOTEL ||
        bAny.tripJackRequest?.itemInfos?.HOTEL;

      if (!tjInfo && typeof bAny.tripJackResponse === 'string') {
        try {
          const p = JSON.parse(bAny.tripJackResponse);
          tjInfo = p?.itemInfos?.HOTEL || p?.body?.itemInfos?.HOTEL;
        } catch (e) { }
      }

      let rgIn = bAny.rateGainResponse?.body?.checkInTime;
      let rgOut = bAny.rateGainResponse?.body?.checkOutTime;

      if (!rgIn && typeof bAny.rateGainResponse === 'string') {
        try {
          const p = JSON.parse(bAny.rateGainResponse);
          rgIn = p?.body?.checkInTime || p?.checkInTime;
          rgOut = p?.body?.checkOutTime || p?.checkOutTime;
        } catch (e) { }
      }

      if (tjInfo?.hInfo) {
        if (tjInfo.hInfo.pt) {
          // TripJack v2
          let pt = tjInfo.hInfo.pt;
          inTime = pt.includes('|') ? pt.split('|')[0] : pt;
          outTime = pt.includes('|') ? pt.split('|')[1] : '';
        } else if (tjInfo.hInfo.checkInTime || tjInfo.hInfo.checkOutTime) {
          // TripJack v3
          const tjIn = tjInfo.hInfo.checkInTime;
          const tjOut = tjInfo.hInfo.checkOutTime;
          inTime =
            typeof tjIn === 'object' && tjIn !== null
              ? tjIn.beginTime || tjIn.time || ''
              : tjIn || '';
          outTime =
            typeof tjOut === 'object' && tjOut !== null
              ? tjOut.beginTime || tjOut.time || ''
              : tjOut || '';
        }
      } else if (rgIn || rgOut) {
        // RateGain
        inTime =
          typeof rgIn === 'object' && rgIn !== null
            ? rgIn.beginTime || rgIn.time || ''
            : rgIn || '';
        outTime =
          typeof rgOut === 'object' && rgOut !== null
            ? rgOut.beginTime || rgOut.time || ''
            : rgOut || '';
      } else if (bAny.checkInTime || bAny.checkOutTime) {
        // DB Top-level fallback
        const dbIn = bAny.checkInTime;
        const dbOut = bAny.checkOutTime;
        inTime = typeof dbIn === 'object' && dbIn !== null ? dbIn.beginTime : dbIn || inTime;
        outTime = typeof dbOut === 'object' && dbOut !== null ? dbOut.beginTime : dbOut || outTime;
      }
    } catch (e) { }

    const formatTimeStr = (t: string) => {
      const clean = t.trim();
      if (/^\d{1,2}:\d{2}$/.test(clean)) {
        const [h, m] = clean.split(':');
        const hour = parseInt(h, 10);
        return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
      }
      return clean;
    };

    return { in: formatTimeStr(inTime), out: formatTimeStr(outTime) };
  };
  const times = getHotelTimes();

  const isCancelDisabled = React.useMemo(() => {
    if (booking.status !== 'CONFIRMED' && booking.status !== 'HELD') return true;
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);

    let hours = 0; // Default to midnight if no time is provided
    let minutes = 0;
    if (times.in) {
      const clean = times.in.trim().toLowerCase();
      const match = clean.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        if (clean.includes('pm') && hours < 12) hours += 12;
        if (clean.includes('am') && hours === 12) hours = 0;
      }
    }

    checkInDate.setHours(hours, minutes, 0, 0);
    return now >= checkInDate;
  }, [booking, times.in]);

  if (!roomCount || !paxCount) {
    const tjRooms = (booking as any).tripJackRequest?.roomTravellerInfo;
    const rgRooms =
      booking.rateGainRequest?.BookReservation?.RoomSelection ||
      booking.rateGainRequest?.RoomSelection;

    if (tjRooms && Array.isArray(tjRooms)) {
      roomCount = tjRooms.length;
      paxCount = tjRooms.reduce((acc: number, r: any) => acc + (r.travellerInfo?.length || 2), 0);
    } else if (rgRooms && Array.isArray(rgRooms)) {
      roomCount = rgRooms.length;
      paxCount = rgRooms.reduce((acc: number, r: any) => acc + (r.Guest?.length || 2), 0);
    } else {
      roomCount = 1;
      paxCount = 2;
    }
  }

  // Extract rooms for dynamic card display
  const displayRooms = React.useMemo(() => {
    if (booking.rooms && booking.rooms.length > 0) {
      return booking.rooms;
    }

    const tjRooms = (booking as any).tripJackRequest?.roomTravellerInfo;
    const rgRooms =
      booking.rateGainRequest?.BookReservation?.RoomSelection ||
      booking.rateGainRequest?.RoomSelection;

    if (tjRooms && Array.isArray(tjRooms)) {
      return tjRooms.map((room: any) => ({
        roomType:
          (booking as any).tripJackRequest?.roomName ||
          (booking as any).roomType ||
          'Standard Room',
        guests: room.travellerInfo?.length || 2,
        price: (booking.totalAmount || 0) / tjRooms.length,
      }));
    } else if (rgRooms && Array.isArray(rgRooms)) {
      return rgRooms.map((room: any) => ({
        roomType:
          booking.rateGainRequest?.BookReservation?.roomType ||
          (booking as any).roomType ||
          'Standard Room',
        guests: room.Guest?.length || 2,
        price: (booking.totalAmount || 0) / rgRooms.length,
      }));
    }

    return [
      {
        roomType: 'Standard Room',
        guests: 2,
        price: booking.totalAmount || 0,
      },
    ];
  }, [booking]);

  // Calculate nights
  const getNights = () => {
    try {
      const inDate = new Date(booking.checkIn);
      const outDate = new Date(booking.checkOut);
      const diff = Math.abs(outDate.getTime() - inDate.getTime());
      const days = Math.ceil(diff / (1000 * 3600 * 24));
      return days > 0 ? days : 1;
    } catch {
      return 1;
    }
  };
  const nights = getNights();



  // Hotel location from booking data
  const hotelLocation = (booking as any).city || (booking as any).hotelAddress || (booking as any).hotelLocation || (booking as any).location || 'Location unavailable';
  // Hotel star rating from booking data (1-5)
  const starRating = (booking as any).starRating || (booking as any).rating || 4;
  const refCode = booking.klarBookingId || booking.confirmationNumber || booking.reservationId || booking.propertyCode || 'N/A';

  return (
    <div className="w-full rounded-[12px] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-full">
      {/* ── Header: full-bleed image with overlay (Figma: 960×260, #00000080) ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          /* Figma: height 260px on desktop, responsive downward */
          height: 'clamp(160px, 27.08vw, 260px)',
        }}
      >
        <img
          src={imageUrl}
          alt={hotelName}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=960&q=80'; }}
        />
        {/* Figma: #00000080 flat overlay */}
        <div
          className="absolute inset-0"
          style={{ background: '#00000080' }}
        />
        {/* Extra bottom gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* ── Top Row: stars (left) + X close button (right) ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-3 sm:px-4 sm:pt-4">
          {/* Star rating – Figma: 8.75×8.31 #FACC15 */}
          <div className="flex items-center gap-[3px]">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg
                key={i}
                viewBox="0 0 10 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                style={{
                  width: 'clamp(7px, 0.91vw, 8.75px)',
                  height: 'clamp(6.5px, 0.87vw, 8.31px)',
                }}
              >
                <path
                  d="M5 0.5L6.12 3.56L9.39 3.56L6.82 5.44L7.94 8.5L5 6.62L2.06 8.5L3.18 5.44L0.61 3.56L3.88 3.56L5 0.5Z"
                  fill={i < Math.round(starRating) ? '#FACC15' : '#ffffff44'}
                />
              </svg>
            ))}
          </div>

          {/* X close button – Figma: 14×14 #FFFFFF, opacity 1 */}
          <button
            onClick={(e) => { e.stopPropagation(); }}
            className="flex items-center justify-center rounded-full bg-white/10 hover:bg-white/25 active:scale-95 transition-all"
            style={{
              width: 'clamp(24px, 2.9vw, 28px)',
              height: 'clamp(24px, 2.9vw, 28px)',
              flexShrink: 0,
            }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 1 }}
            >
              <path d="M13 1L1 13M1 1L13 13" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── Bottom Row: hotel info (left) + badge + ref (right) ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 px-3 pb-3 sm:px-4 sm:pb-4">
          {/* Left: hotel name + location */}
          <div className="flex-1 min-w-0 pr-2">
            {/* Hotel name – Figma: 396.25×40, white, opacity 1 */}
            <h3
              className="text-white leading-tight truncate"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 600,
                fontSize: 'clamp(15px, 3.75vw, 36px)',
                lineHeight: 'clamp(20px, 4.17vw, 40px)',
                letterSpacing: '0px',
                maxWidth: '396.25px',
                color: '#FFFFFF',
                opacity: 1,
              }}
            >
              {hotelName}
            </h3>
            {/* Location – Figma: Inter Regular 14px/20px, #FFFFFF, 262.39×20 */}
            <div className="flex items-center gap-1 mt-[5px]">
              <svg
                viewBox="0 0 12 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                style={{ width: '10px', height: '13px', opacity: 0.85 }}
              >
                <path d="M6 0C3.24 0 1 2.24 1 5C1 8.75 6 14 6 14C6 14 11 8.75 11 5C11 2.24 8.76 0 6 0ZM6 6.5C5.17 6.5 4.5 5.83 4.5 5C4.5 4.17 5.17 3.5 6 3.5C6.83 3.5 7.5 4.17 7.5 5C7.5 5.83 6.83 6.5 6 6.5Z" fill="#FFFFFF" />
              </svg>
              <p
                className="truncate"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontStyle: 'normal',
                  fontSize: 'clamp(10px, 1.46vw, 14px)',
                  lineHeight: '20px',
                  letterSpacing: '0px',
                  verticalAlign: 'middle',
                  color: '#FFFFFF',
                  opacity: 1,
                  maxWidth: '262.39px',
                }}
              >
                {hotelLocation}
              </p>
            </div>
          </div>

          {/* Right: status badge + REF text */}
          <div className="flex flex-col items-end gap-[6px] shrink-0">
            {/* Status pill – Figma: 115×26, #22C55E, border 1px #22C55E4D, radius 9999px, padding 4px 12px, gap 8px */}
            <div
              className="flex items-center rounded-[9999px]"
              style={{
                background: getBadgeColor(booking),
                border: `1px solid ${getBadgeColor(booking)}4D`,
                paddingTop: '4px',
                paddingBottom: '4px',
                paddingLeft: '12px',
                paddingRight: '12px',
                gap: '8px',
                width: 'auto',
                minWidth: 'clamp(90px, 11.98vw, 115px)',
                height: '26px',
                opacity: 1,
                flexShrink: 0,
              }}
            >
              {/* 8px white dot */}
              <span
                className="shrink-0 rounded-full"
                style={{ width: '8px', height: '8px', background: '#FFFFFF', display: 'inline-block' }}
              />
              {/* Confirmed text – Figma: Inter Bold 12px/16px #FFFFFF, 73×16 */}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontStyle: 'normal',
                  fontSize: 'clamp(9px, 1.25vw, 12px)',
                  lineHeight: '16px',
                  letterSpacing: '0px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  opacity: 1,
                }}
              >
                {(s as any).label?.toUpperCase() || 'CONFIRMED'}
              </span>
            </div>

            {/* REF – Figma: Inter 400, 10px/15px, letter-spacing 1px, uppercase, #FFFFFF, 148.08×15 */}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
                fontStyle: 'normal',
                fontSize: 'clamp(7px, 1.04vw, 10px)',
                lineHeight: '15px',
                letterSpacing: '1px',
                textAlign: 'right',
                verticalAlign: 'middle',
                textTransform: 'uppercase',
                color: '#FFFFFF',
                opacity: 1,
                whiteSpace: 'nowrap',
                maxWidth: '148.08px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              REF: {refCode}
            </span>
          </div>
        </div>
      </div>

      {/* ── Body: duration, price, view booking button ── */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col bg-white">
        <div className="my-3 border-t border-gray-100/60" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <p
              className="uppercase text-[#45474D] mb-[4px]"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '11px', lineHeight: '14.4px', letterSpacing: '0.6px' }}
            >
              Duration
            </p>
            <p
              className="text-[#0E1D2B]"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: 'clamp(14px, 1.6vw, 16px)', lineHeight: '24px' }}
            >
              {nights} {nights === 1 ? 'Night' : 'Nights'}
            </p>
          </div>
          <div className="text-left min-w-[80px]">
            <p
              className="uppercase text-[#45474D] mb-[4px]"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: '11px', lineHeight: '14.4px', letterSpacing: '0.6px' }}
            >
              Price Paid
            </p>
            <p
              className="text-[#000000]"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(14px, 1.6vw, 16px)', lineHeight: '24px' }}
            >
              {booking.currencyCode === 'USD' ? '$' : '₹'}{booking.totalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mt-auto">
          <button
            onClick={() => onViewDetails(booking)}
            className="w-full min-h-[44px] sm:min-h-[48px] rounded-[8px] flex items-center justify-center transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: '#f8fafc' }}
          >
            <span
              className="text-[#1A1F4D]"
              style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 'clamp(15px, 1.8vw, 18px)', lineHeight: '24px' }}
            >
              View Booking
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// HOTEL BOOKING DETAILS MODAL
// ============================================
const HotelBookingDetailsModal = ({
  booking,
  onClose,
  onCancel,
  onConfirmHold,
}: {
  booking: HotelBooking;
  onClose: () => void;
  onCancel: (b: HotelBooking) => void;
  onConfirmHold: (b: HotelBooking) => void;
}) => {
  const s = getEffectiveHotelStatus(booking);

  const checkInInstructions = React.useMemo(() => {
    try {
      const findTjDetails = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.itemInfos?.HOTEL) return obj.itemInfos.HOTEL;
        if (obj.HOTEL?.hInfo) return obj.HOTEL;
        if (obj.tripJackResponse?.itemInfos?.HOTEL) return obj.tripJackResponse.itemInfos.HOTEL;
        if (obj.tripJackResponse?.body?.itemInfos?.HOTEL) return obj.tripJackResponse.body.itemInfos.HOTEL;
        if (obj.tripJackRequest?.itemInfos?.HOTEL) return obj.tripJackRequest.itemInfos.HOTEL;
        if (typeof obj.tripJackResponse === 'string') {
          try { const p = JSON.parse(obj.tripJackResponse); if (p?.itemInfos?.HOTEL) return p.itemInfos.HOTEL; if (p?.body?.itemInfos?.HOTEL) return p.body.itemInfos.HOTEL; } catch (e) { }
        }
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'object' && val !== null) {
            if (val.itemInfos?.HOTEL) return val.itemInfos.HOTEL;
            if (val.HOTEL?.hInfo) return val.HOTEL;
          }
        }
        return null;
      };
      const tjItemInfo = findTjDetails(booking);
      const rawInst = tjItemInfo?.inst || tjItemInfo?.hInfo?.inst;
      const inst = Array.isArray(rawInst) ? rawInst : [];
      return inst.filter((instruction: any) =>
        instruction &&
        typeof instruction.type === 'string' &&
        instruction.type.toUpperCase() === 'CHECKIN_INSTRUCTIONS'
      );
    } catch (e) {
      return [];
    }
  }, [booking]);

  const policiesInstructions = React.useMemo(() => {
    try {
      const findTjDetails = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.itemInfos?.HOTEL) return obj.itemInfos.HOTEL;
        if (obj.HOTEL?.hInfo) return obj.HOTEL;
        if (obj.tripJackResponse?.itemInfos?.HOTEL) return obj.tripJackResponse.itemInfos.HOTEL;
        if (obj.tripJackResponse?.body?.itemInfos?.HOTEL) return obj.tripJackResponse.body.itemInfos.HOTEL;
        if (obj.tripJackRequest?.itemInfos?.HOTEL) return obj.tripJackRequest.itemInfos.HOTEL;
        if (typeof obj.tripJackResponse === 'string') {
          try { const p = JSON.parse(obj.tripJackResponse); if (p?.itemInfos?.HOTEL) return p.itemInfos.HOTEL; if (p?.body?.itemInfos?.HOTEL) return p.body.itemInfos.HOTEL; } catch (e) { }
        }
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'object' && val !== null) {
            if (val.itemInfos?.HOTEL) return val.itemInfos.HOTEL;
            if (val.HOTEL?.hInfo) return val.HOTEL;
          }
        }
        return null;
      };
      const tjItemInfo = findTjDetails(booking);
      const rawInst = tjItemInfo?.inst || tjItemInfo?.hInfo?.inst;
      const inst = Array.isArray(rawInst) ? rawInst : [];
      return inst.filter((instruction: any) =>
        instruction &&
        typeof instruction.type === 'string' &&
        instruction.type.toUpperCase() === 'POLICIES'
      );
    } catch (e) {
      return [];
    }
  }, [booking]);

  const feesInstructions = React.useMemo(() => {
    try {
      const findTjDetails = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.itemInfos?.HOTEL) return obj.itemInfos.HOTEL;
        if (obj.HOTEL?.hInfo) return obj.HOTEL;
        if (obj.tripJackResponse?.itemInfos?.HOTEL) return obj.tripJackResponse.itemInfos.HOTEL;
        if (obj.tripJackResponse?.body?.itemInfos?.HOTEL) return obj.tripJackResponse.body.itemInfos.HOTEL;
        if (obj.tripJackRequest?.itemInfos?.HOTEL) return obj.tripJackRequest.itemInfos.HOTEL;
        if (typeof obj.tripJackResponse === 'string') {
          try { const p = JSON.parse(obj.tripJackResponse); if (p?.itemInfos?.HOTEL) return p.itemInfos.HOTEL; if (p?.body?.itemInfos?.HOTEL) return p.body.itemInfos.HOTEL; } catch (e) { }
        }
        for (const key of Object.keys(obj)) {
          const val = obj[key];
          if (typeof val === 'object' && val !== null) {
            if (val.itemInfos?.HOTEL) return val.itemInfos.HOTEL;
            if (val.HOTEL?.hInfo) return val.HOTEL;
          }
        }
        return null;
      };
      const tjItemInfo = findTjDetails(booking);
      const rawInst = tjItemInfo?.inst || tjItemInfo?.hInfo?.inst;
      const inst = Array.isArray(rawInst) ? rawInst : [];
      return inst.filter((instruction: any) =>
        instruction &&
        typeof instruction.type === 'string' &&
        instruction.type.toUpperCase() === 'FEES'
      );
    } catch (e) {
      return [];
    }
  }, [booking]);

  const getTjData = (b: any) => {
    let tjName = null,
      tjImg = null;
    try {
      let tjInfo =
        b.tripJackResponse?.itemInfos?.HOTEL ||
        b.tripJackResponse?.body?.itemInfos?.HOTEL ||
        b.tripJackRequest?.itemInfos?.HOTEL;
      if (!tjInfo && typeof b.tripJackResponse === 'string') {
        try {
          const p = JSON.parse(b.tripJackResponse);
          tjInfo = p?.itemInfos?.HOTEL || p?.body?.itemInfos?.HOTEL;
        } catch (e) { }
      }
      if (tjInfo?.hInfo) {
        tjName = tjInfo.hInfo.name;
        tjImg =
          tjInfo.hInfo.img ||
          tjInfo.hInfo.images?.[0]?.links?.['1000px']?.href ||
          tjInfo.hInfo.images?.[0]?.url ||
          tjInfo.hInfo.images?.[0];
      }
    } catch (e) { }
    return { tjName, tjImg };
  };

  const { tjName, tjImg } = getTjData(booking);
  const hotelName =
    (booking as any).hotelName ||
    booking.rateGainResponse?.body?.hotelName ||
    booking.rateGainRequest?.BookReservation?.RoomSelection?.[0]?.Property?.Name ||
    (booking as any).tripJackRequest?.hotelName ||
    tjName ||
    `Property ${booking.propertyCode || 'Unknown'}`;
  const rawImage =
    (booking as any).hotelImage ||
    (booking as any).images?.[0] ||
    booking.rateGainResponse?.body?.hotelImage ||
    booking.rateGainResponse?.body?.imageUrl ||
    booking.rateGainResponse?.body?.imageUrlPath ||
    (booking as any).tripJackRequest?.hotelImage ||
    tjImg;
  const imageUrl = rawImage
    ? formatHotelImageUrl(rawImage)
    : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';

  // Dynamic Check-in/Check-out Times
  const getHotelTimes = () => {
    let inTime = '';
    let outTime = '';

    try {
      const bAny = booking as any;
      let tjInfo =
        bAny.tripJackResponse?.itemInfos?.HOTEL ||
        bAny.tripJackResponse?.body?.itemInfos?.HOTEL ||
        bAny.tripJackRequest?.itemInfos?.HOTEL;

      if (!tjInfo && typeof bAny.tripJackResponse === 'string') {
        try {
          const p = JSON.parse(bAny.tripJackResponse);
          tjInfo = p?.itemInfos?.HOTEL || p?.body?.itemInfos?.HOTEL;
        } catch (e) { }
      }

      let rgIn = bAny.rateGainResponse?.body?.checkInTime;
      let rgOut = bAny.rateGainResponse?.body?.checkOutTime;

      if (!rgIn && typeof bAny.rateGainResponse === 'string') {
        try {
          const p = JSON.parse(bAny.rateGainResponse);
          rgIn = p?.body?.checkInTime || p?.checkInTime;
          rgOut = p?.body?.checkOutTime || p?.checkOutTime;
        } catch (e) { }
      }

      if (tjInfo?.hInfo) {
        if (tjInfo.hInfo.pt) {
          // TripJack v2
          let pt = tjInfo.hInfo.pt;
          inTime = pt.includes('|') ? pt.split('|')[0] : pt;
          outTime = pt.includes('|') ? pt.split('|')[1] : '';
        } else if (tjInfo.hInfo.checkInTime || tjInfo.hInfo.checkOutTime) {
          // TripJack v3
          const tjIn = tjInfo.hInfo.checkInTime;
          const tjOut = tjInfo.hInfo.checkOutTime;
          inTime =
            typeof tjIn === 'object' && tjIn !== null
              ? tjIn.beginTime || tjIn.time || ''
              : tjIn || '';
          outTime =
            typeof tjOut === 'object' && tjOut !== null
              ? tjOut.beginTime || tjOut.time || ''
              : tjOut || '';
        }
      } else if (rgIn || rgOut) {
        // RateGain
        inTime =
          typeof rgIn === 'object' && rgIn !== null
            ? rgIn.beginTime || rgIn.time || ''
            : rgIn || '';
        outTime =
          typeof rgOut === 'object' && rgOut !== null
            ? rgOut.beginTime || rgOut.time || ''
            : rgOut || '';
      } else if (bAny.checkInTime || bAny.checkOutTime) {
        // DB Top-level fallback
        const dbIn = bAny.checkInTime;
        const dbOut = bAny.checkOutTime;
        inTime = typeof dbIn === 'object' && dbIn !== null ? dbIn.beginTime : dbIn || inTime;
        outTime = typeof dbOut === 'object' && dbOut !== null ? dbOut.beginTime : dbOut || outTime;
      }
    } catch (e) { }

    const formatTimeStr = (t: string) => {
      const clean = t.trim();
      if (/^\d{1,2}:\d{2}$/.test(clean)) {
        const [h, m] = clean.split(':');
        const hour = parseInt(h, 10);
        return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
      }
      return clean;
    };

    return { in: formatTimeStr(inTime), out: formatTimeStr(outTime) };
  };
  const times = getHotelTimes();

  const isCancelDisabled = React.useMemo(() => {
    if (booking.status !== 'CONFIRMED' && booking.status !== 'HELD') return true;
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);

    let hours = 0;
    let minutes = 0;
    if (times.in) {
      const clean = times.in.trim().toLowerCase();
      const match = clean.match(/(\d{1,2}):(\d{2})/);
      if (match) {
        hours = parseInt(match[1], 10);
        minutes = parseInt(match[2], 10);
        if (clean.includes('pm') && hours < 12) hours += 12;
        if (clean.includes('am') && hours === 12) hours = 0;
      }
    }

    checkInDate.setHours(hours, minutes, 0, 0);
    return now >= checkInDate;
  }, [booking, times.in]);

  // Dynamic Room Extraction for UI
  const displayRooms = React.useMemo(() => {
    if (booking.rooms && booking.rooms.length > 0) {
      return booking.rooms;
    }

    // Fallback for older bookings
    const tjRooms = (booking as any).tripJackRequest?.roomTravellerInfo;
    const rgRooms =
      booking.rateGainRequest?.BookReservation?.RoomSelection ||
      booking.rateGainRequest?.RoomSelection;

    if (tjRooms && Array.isArray(tjRooms)) {
      return tjRooms.map((room: any) => ({
        roomType:
          (booking as any).tripJackRequest?.roomName ||
          (booking as any).roomType ||
          'Standard Room',
        guests: room.travellerInfo?.length || 2,
        price: (booking.totalAmount || 0) / tjRooms.length,
      }));
    } else if (rgRooms && Array.isArray(rgRooms)) {
      return rgRooms.map((room: any) => ({
        roomType:
          booking.rateGainRequest?.BookReservation?.roomType ||
          (booking as any).roomType ||
          'Standard Room',
        guests: room.Guest?.length || 2,
        price: (booking.totalAmount || 0) / rgRooms.length,
      }));
    }

    // Ultimate Fallback
    return [
      {
        roomType: 'Standard Room',
        guests: 2,
        price: booking.totalAmount || 0,
      },
    ];
  }, [booking]);

  const roomCount = displayRooms.length;
  const paxCount = displayRooms.reduce((acc: number, r: any) => acc + (r.guests || 2), 0);

  const travelerInfo =
    booking.rateGainRequest?.BookReservation?.RoomSelection?.[0]?.Guest?.[0] ||
    booking.rateGainRequest?.RoomSelection?.[0]?.Guest?.[0] ||
    booking.rateGainRequest?.Guest?.[0] ||
    (booking as any).tripJackRequest?.roomTravellerInfo?.[0]?.travellerInfo?.[0] ||
    {};

  const guestName =
    booking.guestName ||
    (travelerInfo.fN ? `${travelerInfo.fN} ${travelerInfo.lN || ''}`.trim() : null) ||
    (travelerInfo.FirstName ? `${travelerInfo.FirstName} ${travelerInfo.LastName || ''}`.trim() : null) ||
    'Primary Guest';
  const contactEmail =
    (booking as any).guestEmail ||
    travelerInfo.Email ||
    travelerInfo.email ||
    (booking as any).tripJackRequest?.deliveryInfo?.emails?.[0] ||
    'N/A';
  const contactPhone =
    (booking as any).guestMobile ||
    (booking as any).guestPhone ||
    travelerInfo.Phone ||
    travelerInfo.phone ||
    (booking as any).tripJackRequest?.deliveryInfo?.contacts?.[0] ||
    'N/A';

  const gstInfo = (booking as any).gstInfo || (booking as any).tripJackRequest?.gstInfo || booking.rateGainRequest?.BookReservation?.RoomSelection?.[0]?.Guest?.[0]?.gstInfo;

  const cancelPolicies = React.useMemo(() => {
    const tjPolicy =
      (booking as any).tripJackResponse?.cancellationPolicy ||
      (booking as any).tripJackResponse?.body?.cancellationPolicy ||
      (booking as any).tripJackResponse?.body?.status?.cancellationPolicy ||
      (booking as any).tripJackRequest?.cancellationPolicy;
    if (tjPolicy?.pd || tjPolicy?.cp) {
      const list = tjPolicy.pd || tjPolicy.cp;
      return list.map((item: any) => ({
        from: item.fdt,
        to: item.tdt,
        amount: Number(item.am) || 0,
        type: 'TJ',
      }));
    }

    const rgPolicy =
      booking.rateGainResponse?.body?.cancellationPolicy ||
      booking.rateGainResponse?.body?.cancellationPolicies ||
      booking.rateGainRequest?.BookReservation?.cancellationPolicy;
    if (Array.isArray(rgPolicy)) {
      return rgPolicy.map((item: any) => ({
        from: item.fromDate || item.FromDate || item.start || '',
        to: item.toDate || item.ToDate || item.end || '',
        amount: Number(item.amount || item.Amount || item.penalty || 0),
        text: item.description || item.Description || item.policy || '',
        type: 'RG',
      }));
    } else if (typeof rgPolicy === 'string') {
      return [{ text: rgPolicy, type: 'TEXT' }];
    }

    return [];
  }, [booking]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-[#f8f9fc] rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col">

        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button
            onClick={onClose}
            className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white shadow-lg"
          >
            <FaTimesCircle size={20} />
          </button>
        </div>

        {/* ── Figma-spec Image Header: #00000080 overlay, 260px height ── */}
        <div
          className="relative w-full shrink-0 overflow-hidden bg-gray-900"
          style={{ height: 'clamp(160px, 27.08vw, 260px)' }}
        >
          <img
            src={imageUrl}
            alt={hotelName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'; }}
          />
          {/* Figma: #00000080 flat overlay */}
          <div className="absolute inset-0" style={{ background: '#00000080' }} />
          {/* Extra bottom gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />



          {/* Bottom row: hotel name + location (left) + confirmed pill + ref (right) */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 px-4 pb-4 sm:px-6 sm:pb-5">
            {/* Left */}
            <div className="flex-1 min-w-0 pr-2">
              {/* Hotel name – Figma: 396.25×40 white, opacity 1 */}
              <h2
                className="text-white leading-tight truncate drop-shadow-sm"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  fontSize: 'clamp(16px, 3.75vw, 36px)',
                  lineHeight: 'clamp(22px, 4.17vw, 40px)',
                  letterSpacing: '0px',
                  maxWidth: '396.25px',
                  color: '#FFFFFF',
                  opacity: 1,
                }}
              >
                {hotelName}
              </h2>
              {/* Location – Figma: Inter Regular 14px/20px, #FFFFFF */}
              <div className="flex items-center gap-1 mt-[5px]">
                <FaHotel style={{ color: '#FFFFFF', opacity: 0.7, fontSize: '10px', flexShrink: 0 }} />
                <p
                  className="truncate"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontStyle: 'normal',
                    fontSize: 'clamp(10px, 1.46vw, 14px)',
                    lineHeight: '20px',
                    letterSpacing: '0px',
                    verticalAlign: 'middle',
                    color: '#FFFFFF',
                    opacity: 1,
                    maxWidth: '262.39px',
                  }}
                >
                  Property Code: {booking.propertyCode}
                </p>
              </div>
            </div>

            {/* Right: confirmed pill + ref */}
            <div className="flex flex-col items-end gap-[6px] shrink-0">
              {/* Confirmed pill – Figma: 115×26 #22C55E border #22C55E4D, padding 4/12, gap 8 */}
              <div
                className="flex items-center rounded-[9999px]"
                style={{
                  background: getBadgeColor(booking),
                  border: `1px solid ${getBadgeColor(booking)}4D`,
                  paddingTop: '4px',
                  paddingBottom: '4px',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  gap: '8px',
                  width: 'auto',
                  minWidth: 'clamp(90px, 11.98vw, 115px)',
                  height: '26px',
                  opacity: 1,
                  flexShrink: 0,
                }}
              >
                <span
                  className="shrink-0 rounded-full"
                  style={{ width: '8px', height: '8px', background: '#FFFFFF', display: 'inline-block' }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 'clamp(9px, 1.25vw, 12px)',
                    lineHeight: '16px',
                    letterSpacing: '0px',
                    textAlign: 'right',
                    verticalAlign: 'middle',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    opacity: 1,
                  }}
                >
                  {(s as any).label?.toUpperCase() || 'CONFIRMED'}
                </span>
              </div>
              {/* REF – Figma: Inter 400 10px/15px 1px letter-spacing uppercase #FFFFFF 148.08×15 */}
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontStyle: 'normal',
                  fontSize: 'clamp(7px, 1.04vw, 10px)',
                  lineHeight: '15px',
                  letterSpacing: '1px',
                  textAlign: 'right',
                  verticalAlign: 'middle',
                  textTransform: 'uppercase',
                  color: '#FFFFFF',
                  opacity: 1,
                  whiteSpace: 'nowrap',
                  maxWidth: '148.08px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                REF: {booking.klarBookingId || booking.confirmationNumber || booking.propertyCode || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6 flex-1 custom-scrollbar flex flex-col gap-6">
          {/* ── TWO-COLUMN LAYOUT: Guest Info (left) + Stay Info (right) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* ── LEFT COLUMN: Guest Info + Booking Details ── */}
            <div className="flex flex-col gap-6 w-full">
              {/* ── GUEST INFORMATION – Figma spec ── */}
              <div
                style={{
                  width: '100%',
                  gap: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: 1,
                  boxSizing: 'border-box',
                }}
              >
                {/* Title – Inter Bold 16px/20px, 1.4px letter-spacing, uppercase, #000000 */}
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 'clamp(13px, 1.67vw, 16px)',
                    lineHeight: '20px',
                    letterSpacing: '1.4px',
                    verticalAlign: 'middle',
                    textTransform: 'uppercase',
                    color: '#000000',
                    opacity: 1,
                    margin: 0,
                  }}
                >
                  Guest Information
                </h3>

                {/* Profile row: icon + name + travel id */}
                <div className="flex items-center gap-3">
                  {/* Profile icon – 56×56 rounded-full #D5E4F8 */}
                  <div
                    style={{
                      width: 'clamp(44px, 5.83vw, 56px)',
                      height: 'clamp(44px, 5.83vw, 56px)',
                      borderRadius: '9999px',
                      background: '#D5E4F8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      opacity: 1,
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '60%', height: '60%' }}>
                      <circle cx="12" cy="8" r="4" fill="#5B8DB8" />
                      <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#5B8DB8" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>

                  {/* Name + travel id */}
                  <div className="min-w-0 flex-1">
                    {/* Guest name – Inter Bold 14px/28px #05142E, max 150px */}
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '28px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '233px',
                        margin: 0,
                      }}
                    >
                      {guestName}
                    </p>
                    {/* Travel ID (email) – Inter 400 14px/20px #45474D, max 233.8px */}
                    <p
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        maxWidth: '233.8px',
                        margin: 0,
                      }}
                    >
                      {contactEmail || '—'}
                    </p>
                  </div>
                </div>

                {/* Phone + Passport Ref – always side by side */}
                <div className="flex items-start gap-8" style={{ flexWrap: 'nowrap' }}>
                  {/* Phone */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Label – Inter Bold 11px/16.5px -0.55px uppercase #45474D */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Phone
                    </span>
                    {/* Value – Inter Medium 14px/20px #05142E, max 206px */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '206px',
                      }}
                    >
                      {contactPhone || '—'}
                    </span>
                  </div>

                  {/* Passport Ref */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Label – same spec */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Ref. Code
                    </span>
                    {/* Value – same spec */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '206px',
                      }}
                    >
                      {booking.klarBookingId || booking.confirmationNumber || booking.reservationId || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── BOOKING DETAILS – Figma spec ── */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '428px',
                  minHeight: 'auto',
                  gap: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: 1,
                  boxSizing: 'border-box',
                }}
              >
                {/* Title – Inter Bold 16px/20px, 1.4px letter-spacing, uppercase, #000000 */}
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 'clamp(13px, 1.67vw, 16px)',
                    lineHeight: '20px',
                    letterSpacing: '1.4px',
                    verticalAlign: 'middle',
                    textTransform: 'uppercase',
                    color: '#000000',
                    opacity: 1,
                    margin: 0,
                  }}
                >
                  Booking Details
                </h3>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {/* Booking ID */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Booking ID
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '210px',
                      }}
                    >
                      #{booking._id?.slice(-10).toUpperCase() || 'N/A'}
                    </span>
                  </div>

                  {/* Conf Number */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Conf Number
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '210px',
                      }}
                    >
                      {booking.klarBookingId || booking.confirmationNumber || 'Pending'}
                    </span>
                  </div>



                  {/* Booking Date */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Booking Date
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '210px',
                      }}
                    >
                      {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>



                  {/* Channel ID */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Channel ID
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '210px',
                      }}
                    >
                      {booking.rateGainRequest?.channelId || 'GDS_AMADEUS_442'}
                    </span>
                  </div>

                  {/* Property Code */}
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '-0.55px',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#45474D',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Property Code
                    </span>
                    <span
                      className="truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontStyle: 'normal',
                        fontSize: 'clamp(11px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '210px',
                      }}
                    >
                      {booking.propertyCode || '—'}
                    </span>
                  </div>

                  {/* GST Info */}
                  {gstInfo && gstInfo.gstNumber && (
                    <div className="flex flex-col gap-0.5 min-w-0 col-span-2 mt-2 p-3 bg-[#f8f9fc] rounded-lg border border-gray-200">
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: '11px',
                          lineHeight: '16.5px',
                          letterSpacing: '-0.55px',
                          textTransform: 'uppercase',
                          color: '#45474D',
                        }}
                      >
                        GST Information
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <span style={{ fontSize: '13px', color: '#05142E', fontWeight: 500 }}>
                          <span className="text-gray-500 text-[10px] uppercase mr-1">Number:</span>
                          {gstInfo.gstNumber}
                        </span>
                        <span style={{ fontSize: '13px', color: '#05142E', fontWeight: 500 }} className="truncate">
                          <span className="text-gray-500 text-[10px] uppercase mr-1">Company:</span>
                          {gstInfo.companyName || '—'}
                        </span>
                        <span style={{ fontSize: '13px', color: '#05142E', fontWeight: 500 }} className="truncate col-span-2">
                          <span className="text-gray-500 text-[10px] uppercase mr-1">Email:</span>
                          {gstInfo.email || gstInfo.companyEmail || '—'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── BENEFITS GRID – Figma spec ── */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 194px))',
                  rowGap: '12px',
                  columnGap: '12px',
                  opacity: 1,
                  boxSizing: 'border-box',
                  marginTop: '8px',
                }}
              >
                {(
                  (booking as any).amenities ||
                  (booking as any).hotelAmenities ||
                  []
                )
                  .slice(0, 10)
                  .map((amenity: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        width: '100%',
                        maxWidth: '194px',
                        height: '54px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #C5C6CE80',
                        background: '#EEF4FF',
                        boxSizing: 'border-box',
                        opacity: 1,
                      }}
                    >
                      {/* Tick Icon – 16.67×16.67 #00A63E */}
                      <div
                        style={{
                          width: '16.67px',
                          height: '16.67px',
                          borderRadius: '9999px',
                          background: '#00A63E',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          opacity: 1,
                        }}
                      >
                        <svg
                          width="9"
                          height="7"
                          viewBox="0 0 9 7"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M1 3L3.5 5.5L8 1"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {/* Benefit Text – Inter 500 14px/24px #0E1D2B */}
                      <span
                        className="line-clamp-2"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 500,
                          fontStyle: 'normal',
                          fontSize: 'clamp(11px, 1.46vw, 14px)',
                          lineHeight: '16px', // adjusted slightly from 24px so two lines fit nicely within 48px max height
                          letterSpacing: '0px',
                          color: '#0E1D2B',
                          maxWidth: '151px',
                          maxHeight: '48px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                        title={amenity}
                      >
                        {amenity}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* ── RIGHT COLUMN: Stay Info + Rate & Policy ── */}
            <div className="flex flex-col gap-6 w-full">
              {/* ── STAY INFORMATION – Figma spec ── */}
              <div
                style={{
                  width: '100%',
                  gap: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: 1,
                  boxSizing: 'border-box',
                }}
              >
                {/* Title – Inter Bold 16px/20px, 1.4px letter-spacing, uppercase, #000000 */}
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 'clamp(13px, 1.67vw, 16px)',
                    lineHeight: '20px',
                    letterSpacing: '1.4px',
                    verticalAlign: 'middle',
                    textTransform: 'uppercase',
                    color: '#000000',
                    opacity: 1,
                    margin: 0,
                  }}
                >
                  Stay Information
                </h3>

                {/* Check-in + arrow + Check-out row – always side by side */}
                <div className="flex items-center gap-2" style={{ flexWrap: 'nowrap' }}>
                  {/* CHECK IN box – Figma: 189.98×95, #FDC70033, border #C5C6CE4D, radius 12px */}
                  <div
                    style={{
                      flex: '1 1 0',
                      minWidth: '120px',
                      maxWidth: '190px',
                      minHeight: '95px',
                      borderRadius: '12px',
                      background: '#FDC70033',
                      border: '1px solid #C5C6CE4D',
                      paddingTop: '18.5px',
                      paddingRight: '12px',
                      paddingBottom: '12px',
                      paddingLeft: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      opacity: 1,
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    {/* CHECK IN label – Inter Bold 12px/15px uppercase #00A63E */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(10px, 1.25vw, 12px)',
                        lineHeight: '15px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#00A63E',
                        opacity: 1,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Check-In
                    </span>
                    {/* Date – Inter Bold 18px/28px #1B2944 */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(14px, 1.88vw, 18px)',
                        lineHeight: '28px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#1B2944',
                        opacity: 1,
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatShortDate(booking.checkIn)}
                    </span>
                    {/* After 15:00 – Inter Regular 11px/16.5px #45474D */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      {times.in ? `After ${times.in}` : 'After 15:00'}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg width="20" height="16" viewBox="0 0 20 16" fill="none" style={{ flexShrink: 0, color: '#45474D' }}>
                    <path d="M1 8H19M19 8L12 1M19 8L12 15" stroke="#45474D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>

                  {/* CHECK OUT box – same dimensions, red label */}
                  <div
                    style={{
                      flex: '1 1 0',
                      minWidth: '120px',
                      maxWidth: '190px',
                      minHeight: '95px',
                      borderRadius: '12px',
                      background: '#FDC70033',
                      border: '1px solid #C5C6CE4D',
                      paddingTop: '18.5px',
                      paddingRight: '12px',
                      paddingBottom: '12px',
                      paddingLeft: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      opacity: 1,
                      boxSizing: 'border-box',
                      flexShrink: 0,
                    }}
                  >
                    {/* CHECK OUT label – Inter Bold 12px/15px uppercase #FF0004 */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(10px, 1.25vw, 12px)',
                        lineHeight: '15px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        textTransform: 'uppercase',
                        color: '#FF0004',
                        opacity: 1,
                        display: 'block',
                        marginBottom: '4px',
                      }}
                    >
                      Check-Out
                    </span>
                    {/* Date – Inter Bold 18px/28px #1B2944 */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(14px, 1.88vw, 18px)',
                        lineHeight: '28px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#1B2944',
                        opacity: 1,
                        display: 'block',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatShortDate(booking.checkOut)}
                    </span>
                    {/* Before 12:00 – Inter Regular 11px/16.5px #45474D */}
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(9px, 1.15vw, 11px)',
                        lineHeight: '16.5px',
                        letterSpacing: '0px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        display: 'block',
                      }}
                    >
                      {times.out ? `Before ${times.out}` : 'Before 12:00'}
                    </span>
                  </div>
                </div>

                {/* Stay detail rows – label (Inter Regular 14px/20px #45474D) + value (Inter Bold 14px/20px #05142E) */}
                <div className="flex flex-col gap-3">
                  {/* Room Type */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        flexShrink: 0,
                      }}
                    >
                      Room Type
                    </span>
                    <span
                      className="text-right truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '190.98px',
                      }}
                    >
                      {displayRooms[0]?.roomType || booking.roomType || 'Standard Room'}
                    </span>
                  </div>

                  {/* Board Basis */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        flexShrink: 0,
                      }}
                    >
                      Board Basis
                    </span>
                    <span
                      className="text-right truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '190.98px',
                      }}
                    >
                      {booking.boardType || booking.boardBasis || displayRooms[0]?.boardBasis || 'Room Only'}
                    </span>
                  </div>

                  {/* Occupancy */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        flexShrink: 0,
                      }}
                    >
                      Occupancy
                    </span>
                    <span
                      className="text-right"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '190.98px',
                      }}
                    >
                      {paxCount} {paxCount === 1 ? 'Guest' : 'Guests'}, {roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}
                    </span>
                  </div>

                  {/* Total Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#45474D',
                        opacity: 1,
                        flexShrink: 0,
                      }}
                    >
                      Total Amount
                    </span>
                    <span
                      className="text-right"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontStyle: 'normal',
                        fontSize: 'clamp(12px, 1.46vw, 14px)',
                        lineHeight: '20px',
                        letterSpacing: '0px',
                        verticalAlign: 'middle',
                        color: '#05142E',
                        opacity: 1,
                        maxWidth: '190.98px',
                      }}
                    >
                      {booking.currencyCode} {booking.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── RATE & POLICY – Figma spec ── */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '428px',
                  minHeight: 'auto',
                  gap: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  opacity: 1,
                  boxSizing: 'border-box',
                }}
              >
                {/* Title */}
                <h3
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontStyle: 'normal',
                    fontSize: 'clamp(13px, 1.67vw, 16px)',
                    lineHeight: '20px',
                    letterSpacing: '1.4px',
                    verticalAlign: 'middle',
                    textTransform: 'uppercase',
                    color: '#000000',
                    opacity: 1,
                    margin: 0,
                  }}
                >
                  Rate &amp; Policy
                </h3>

                {/* Night-by-night rates */}
                <div className="flex flex-col gap-2">
                  {(() => {
                    const checkIn = new Date(booking.checkIn);
                    const checkOut = new Date(booking.checkOut);
                    const numNights = Math.max(Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)), 1);
                    const currency = booking.currencyCode || 'INR';
                    const totalVal = booking.totalAmount || 0;
                    const perNight = totalVal / numNights;

                    const rows = [];
                    for (let n = 0; n < numNights; n++) {
                      const d1 = new Date(checkIn);
                      d1.setDate(checkIn.getDate() + n);
                      const d2 = new Date(d1);
                      d2.setDate(d1.getDate() + 1);

                      const dateStr = `${d1.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${d2.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
                      rows.push(
                        <div key={n} className="flex justify-between items-center w-full">
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 400,
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#0E1D2B',
                            }}
                          >
                            {dateStr}
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 500,
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#0E1D2B',
                            }}
                          >
                            {currency} {perNight.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <>
                        {rows.slice(0, 3)}
                        {numNights > 3 && <div className="text-[10px] text-gray-400 italic text-right">+ {numNights - 3} more nights</div>}
                        <div className="w-full h-px bg-gray-100 my-1" />
                        <div className="flex justify-between items-center w-full">
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 700,
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#1B2944',
                            }}
                          >
                            Base Total ({numNights} {numNights === 1 ? 'Night' : 'Nights'})
                          </span>
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 700,
                              fontSize: '12px',
                              lineHeight: '16px',
                              color: '#1B2944',
                            }}
                          >
                            {currency} {totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Cancellation Policy Box */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '396px',
                    minHeight: '83.63px',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #C5C6CE4D',
                    background: '#FFFFFF',
                    display: 'flex',
                    gap: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg
                    style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }}
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>

                  <div className="flex flex-col gap-0.5">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '11px',
                        lineHeight: '17.88px',
                        color: '#05142E',
                      }}
                    >
                      Cancellation Policy
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: '11px',
                        lineHeight: '17.88px',
                        color: '#45474D',
                        maxWidth: '317.09px',
                      }}
                    >
                      {cancelPolicies[0]?.text || cancelPolicies[0]?.description || "Free cancellation window applies. Late cancellations or no-shows are subject to hotel policy rules."}
                    </span>
                  </div>
                </div>

                {/* Cancellation Timeline Box */}
                {cancelPolicies && cancelPolicies.length > 0 && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '396px',
                      minHeight: '120px',
                      paddingTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      borderTop: '1px solid #E5E7EB',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '10px',
                        lineHeight: '15px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#45474D',
                      }}
                    >
                      Cancellation Timeline
                    </span>

                    <div className="flex flex-col gap-4">
                      {cancelPolicies.map((policy: any, idx: number) => {
                        if (policy.type === 'TEXT') {
                          return (
                            <span key={idx} style={{ fontSize: '11px', color: '#05142E' }}>
                              {policy.text}
                            </span>
                          );
                        }

                        let dateText = 'From ';
                        if (policy.from) {
                          dateText += new Date(policy.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                        } else {
                          dateText += 'Now';
                        }
                        if (policy.to) {
                          dateText += ` to ${new Date(policy.to).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                        }

                        return (
                          <div key={idx} className="flex flex-col gap-0.5">
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 700,
                                fontSize: '11px',
                                lineHeight: '16.5px',
                                color: '#05142E',
                              }}
                            >
                              {dateText}
                            </span>
                            <span
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                fontWeight: 400,
                                fontSize: '10px',
                                lineHeight: '15px',
                                color: '#45474D',
                              }}
                            >
                              Penalty: {booking.currencyCode || 'INR'} {policy.amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Rate Inclusion Box */}
                {booking.taxes && Array.isArray(booking.taxes) && booking.taxes.length > 0 && (
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '396px',
                      minHeight: '81px',
                      paddingTop: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      borderTop: '1px solid #E5E7EB',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '10px',
                        lineHeight: '15px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        color: '#45474D',
                      }}
                    >
                      Rate Inclusions
                    </span>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {booking.taxes.map((tax: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: '11px', lineHeight: '16.5px', color: '#0E1D2B' }}>{tax.desc || tax.name || 'Taxes & Fees'}</span>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '11px', lineHeight: '16.5px', color: '#0E1D2B' }}>
                            {booking.currencyCode} {tax.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* ── END TWO-COLUMN LAYOUT ── */}

          {/* Check-In Instructions */}
          {checkInInstructions.length > 0 && (
            <div className="flex flex-col gap-4 mt-6">
              {checkInInstructions.map((instruction: any, i: number) => {
                if (!instruction) return null;
                try {
                  const parsedMsg = typeof instruction.msg === 'string' ? JSON.parse(instruction.msg) : instruction.msg;
                  if (!parsedMsg || typeof parsedMsg !== 'object') throw new Error("Not an object");

                  return (
                    <div
                      key={i}
                      style={{
                        width: '100%',
                        maxWidth: '894px',
                        minHeight: '200px',
                        opacity: 1,
                        borderRadius: '12px',
                        background: '#FFF7ED',
                        border: '1px solid #C5C6CE4D',
                        padding: '16px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: '14px',
                          lineHeight: '15px',
                          color: '#FF0004',
                          textTransform: 'uppercase',
                          display: 'block',
                        }}
                      >
                        CHECK-IN
                      </span>

                      <div className="flex flex-col gap-4" style={{ maxWidth: '850px' }}>
                        {Object.entries(parsedMsg).map(([key, val]) => {
                          const displayKey = typeof key === 'string' ? key.replace(/_/g, ' ') : String(key);
                          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

                          const sentences = strVal.length > 150 && strVal.includes('. ')
                            ? strVal.split(/(?<=[a-zA-Z])\.\s+/).filter(Boolean).map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
                            : [strVal];

                          return (
                            <div key={key} className="flex flex-col gap-1">
                              <span
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  lineHeight: '22px',
                                  color: '#45474D',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {displayKey}
                              </span>
                              <div className="flex flex-col gap-1">
                                {sentences.map((sentence, sIdx) => (
                                  <p
                                    key={sIdx}
                                    style={{
                                      fontFamily: "'Inter', sans-serif",
                                      fontWeight: 400,
                                      fontSize: '12px',
                                      lineHeight: '22px',
                                      color: '#45474D',
                                      margin: 0,
                                    }}
                                  >
                                    {sentence}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })}
            </div>
          )}

          {/* Policies Instructions */}
          {policiesInstructions.length > 0 && (
            <div className="flex flex-col gap-4 mt-4">
              {policiesInstructions.map((instruction: any, i: number) => {
                if (!instruction) return null;
                try {
                  const parsedMsg = typeof instruction.msg === 'string' ? JSON.parse(instruction.msg) : instruction.msg;
                  if (!parsedMsg || typeof parsedMsg !== 'object') throw new Error("Not an object");

                  return (
                    <div
                      key={i}
                      style={{
                        width: '100%',
                        maxWidth: '894px',
                        minHeight: '91px',
                        opacity: 1,
                        borderRadius: '12px',
                        background: '#FFF8FA',
                        border: '1px solid #C5C6CE4D',
                        padding: '16px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: '14px',
                          lineHeight: '15px',
                          color: '#FF0004',
                          textTransform: 'uppercase',
                          display: 'block',
                        }}
                      >
                        POLICIES
                      </span>

                      <div className="flex flex-col gap-4" style={{ maxWidth: '850px' }}>
                        {Object.entries(parsedMsg).map(([key, val]) => {
                          const displayKey = typeof key === 'string' ? key.replace(/_/g, ' ') : String(key);
                          const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

                          const sentences = strVal.length > 150 && strVal.includes('. ')
                            ? strVal.split(/(?<=[a-zA-Z])\.\s+/).filter(Boolean).map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
                            : [strVal];

                          return (
                            <div key={key} className="flex flex-col gap-1">
                              <span
                                style={{
                                  fontFamily: "'Inter', sans-serif",
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  lineHeight: '22px',
                                  color: '#45474D',
                                  textTransform: 'capitalize',
                                }}
                              >
                                {displayKey}
                              </span>
                              <div className="flex flex-col gap-1">
                                {sentences.map((sentence, sIdx) => (
                                  <p
                                    key={sIdx}
                                    style={{
                                      fontFamily: "'Inter', sans-serif",
                                      fontWeight: 400,
                                      fontSize: '12px',
                                      lineHeight: '22px',
                                      color: '#45474D',
                                      margin: 0,
                                    }}
                                  >
                                    {sentence}
                                  </p>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })}
            </div>
          )}

          {/* Fees Instructions */}
          {feesInstructions.length > 0 && (
            <div className="flex flex-col gap-4 mt-4">
              {feesInstructions.map((instruction: any, i: number) => {
                if (!instruction) return null;
                try {
                  const parsedMsg = typeof instruction.msg === 'string' ? JSON.parse(instruction.msg) : instruction.msg;
                  const hasOptionalFees = Object.keys(parsedMsg).some(
                    (key) => typeof key === 'string' && !key.toLowerCase().includes('mandatory')
                  );
                  if (!hasOptionalFees) return null;

                  return (
                    <div
                      key={i}
                      style={{
                        width: '100%',
                        maxWidth: '894px',
                        minHeight: '139px',
                        opacity: 1,
                        borderRadius: '12px',
                        background: '#C9E0F999',
                        border: '1px solid #C5C6CE4D',
                        padding: '16px',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: '14px',
                          lineHeight: '15px',
                          color: '#FF0004',
                          textTransform: 'uppercase',
                          display: 'block',
                        }}
                      >
                        FEES
                      </span>

                      <div className="flex flex-col gap-4" style={{ maxWidth: '850px' }}>
                        {Object.entries(parsedMsg)
                          .filter(([key]) => typeof key === 'string' && !key.toLowerCase().includes('mandatory'))
                          .map(([key, val]) => {
                            const displayKey = typeof key === 'string' ? key.replace(/_/g, ' ') : String(key);
                            const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);

                            const sentences = strVal.length > 150 && strVal.includes('. ')
                              ? strVal.split(/(?<=[a-zA-Z])\.\s+/).filter(Boolean).map(s => s.trim() + (s.trim().endsWith('.') ? '' : '.'))
                              : [strVal];

                            return (
                              <div key={key} className="flex flex-col gap-1">
                                <span
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    lineHeight: '22px',
                                    color: '#45474D',
                                    textTransform: 'capitalize',
                                  }}
                                >
                                  {displayKey}
                                </span>
                                <div className="flex flex-col gap-1">
                                  {sentences.map((sentence, sIdx) => (
                                    <p
                                      key={sIdx}
                                      style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontWeight: 400,
                                        fontSize: '12px',
                                        lineHeight: '22px',
                                        color: '#45474D',
                                        margin: 0,
                                      }}
                                    >
                                      {sentence}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })}
            </div>
          )}

          {/* Payment Summary */}
          <div
            style={{
              width: '100%',
              maxWidth: '884px',
              minHeight: '112px',
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '24px',
              marginTop: '24px',
              boxSizing: 'border-box',
            }}
            className="flex-col md:flex-row"
          >
            {/* Left side: Title + Badge + Payment Mode */}
            <div className="flex flex-col gap-3">
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: '20px',
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  color: '#1B2944',
                  display: 'block',
                }}
              >
                Payment Summary
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Fully Paid Badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: '6px',
                    paddingRight: '16px',
                    paddingBottom: '6px',
                    paddingLeft: '16px',
                    gap: '8px',
                    borderRadius: '9999px',
                    background: '#DCFCE7',
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#15803D"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: '11.67px', height: '11.67px' }}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: '12px',
                      lineHeight: '16px',
                      color: '#15803D',
                    }}
                  >
                    FULLY PAID
                  </span>
                </div>

                {/* Payment Mode Text */}
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 400,
                    fontSize: '11px',
                    lineHeight: '16.5px',
                    color: '#45474D',
                  }}
                >
                  Paid via Corporate Card ending in **9011
                </span>
              </div>
            </div>

            {/* Right side: Prices breakdown */}
            {(() => {
              const currency = booking.currencyCode || '$';
              const grandTotal = booking.totalAmount || 0;
              const discountVal = grandTotal * 0.02476;
              const taxVal = grandTotal * 0.10036;
              const roomVal = grandTotal - taxVal + discountVal;

              const fmt = (val: number) =>
                val.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

              return (
                <div className="flex flex-col gap-2 items-end w-full md:w-auto shrink-0 text-right">
                  {/* Room Total Row */}
                  <div className="flex justify-between md:justify-end gap-6 items-center w-full md:w-auto">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#45474D',
                      }}
                    >
                      Room Total:
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#05142E',
                      }}
                    >
                      {currency} {fmt(roomVal)}
                    </span>
                  </div>

                  {/* Taxes & Fees Row */}
                  <div className="flex justify-between md:justify-end gap-6 items-center w-full md:w-auto">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#45474D',
                      }}
                    >
                      Taxes & Fees:
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#05142E',
                      }}
                    >
                      {currency} {fmt(taxVal)}
                    </span>
                  </div>

                  {/* Corporate Discount Row */}
                  <div className="flex justify-between md:justify-end gap-6 items-center w-full md:w-auto">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#45474D',
                      }}
                    >
                      Corporate Discount:
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 500,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: '#16A34A',
                      }}
                    >
                      -{currency} {fmt(discountVal)}
                    </span>
                  </div>

                  {/* Grand Total Row */}
                  <div className="flex justify-between md:justify-end gap-6 items-center w-full md:w-auto mt-2 pt-2 border-t border-gray-100">
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '24px',
                        lineHeight: '32px',
                        color: '#1B2944',
                      }}
                    >
                      Grand Total:
                    </span>
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 700,
                        fontSize: '24px',
                        lineHeight: '32px',
                        color: '#1B2944',
                      }}
                    >
                      {currency} {fmt(grandTotal)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

        </div>

        <div
          style={{
            width: '100%',
            height: '89px',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: 1,
            padding: '12px 16px',
            background: '#E4EFFF',
            borderTop: '1px solid #C5C6CE4D',
            boxSizing: 'border-box',
          }}
          className="flex-col md:flex-row gap-2 h-auto md:h-[89px]"
        >
          {/* Left: Need Assistance? */}
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#45474D"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: '20px', height: '20px' }}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#45474D',
                whiteSpace: 'nowrap',
              }}
            >
              Need Assistance?
            </span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-nowrap shrink-0">
            {/* Close Dashboard Button */}
            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'auto',
                height: '38px',
                paddingTop: '8px',
                paddingRight: '12px',
                paddingBottom: '8px',
                paddingLeft: '12px',
                gap: '6px',
                borderRadius: '8px',
                border: '1px solid #75777E',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: '#05142E',
                  whiteSpace: 'nowrap',
                }}
              >
                Close Dashboard
              </span>
            </button>

            {/* Cancel Hold Button */}
            {booking.status === 'HELD' && (
              <button
                onClick={() => onConfirmHold(booking)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  height: '40px',
                  paddingTop: '10px',
                  paddingRight: '12px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  gap: '6px',
                  borderRadius: '8px',
                  background: '#16A34A',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Confirm Hold Booking
                </span>
              </button>
            )}

            {/* Cancel Reservation / Cancel Hold Button */}
            {((booking.status === 'CONFIRMED' && !isHotelCheckedOut(booking)) || booking.status === 'HELD') && (
              <button
                onClick={() => onCancel(booking)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  height: '40px',
                  paddingTop: '10px',
                  paddingRight: '12px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  gap: '6px',
                  borderRadius: '8px',
                  background: '#DC2626',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Cancel {booking.status === 'HELD' ? 'Hold' : 'Reservation'}
                </span>
              </button>
            )}

            {/* Download Voucher Button */}
            {booking.status === 'CONFIRMED' && (
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  height: '40px',
                  paddingTop: '10px',
                  paddingRight: '12px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  gap: '6px',
                  borderRadius: '8px',
                  background: '#1B2944',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: '12px', height: '12px', flexShrink: 0 }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Download Voucher
                </span>
              </button>
            )}

            {/* Download Invoice Button */}
            {booking.status === 'CANCELLED' && (
              <button
                onClick={() => window.print()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 'auto',
                  height: '40px',
                  paddingTop: '10px',
                  paddingRight: '12px',
                  paddingBottom: '10px',
                  paddingLeft: '12px',
                  gap: '6px',
                  borderRadius: '8px',
                  background: '#1B2944',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: '12px', height: '12px', flexShrink: 0 }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Download Invoice
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Hidden Printable Components */}
        <HotelVoucher booking={booking} />
        {booking.status === 'CANCELLED' && <CancellationInvoice booking={booking} />}
      </div>
    </div>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
const MyBookingsPage = () => {
  // State
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('hotel');
  const [subTab, setSubTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [showConfirmationDetails, setShowConfirmationDetails] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [hotelBookings, setHotelBookings] = useState<HotelBooking[]>([]);
  const [cabBookings, setCabBookings] = useState<any[]>([]);
  const [showHotelCancelDialog, setShowHotelCancelDialog] = useState(false);
  const [isHotelCancelling, setIsHotelCancelling] = useState(false);
  const [hotelCancelCharges, setHotelCancelCharges] = useState<any>(null);
  const [isLoadingHotelCancelCharges, setIsLoadingHotelCancelCharges] = useState(false);
  const [hotelCancelError, setHotelCancelError] = useState<string | null>(null);

  const [isConfirmingHold, setIsConfirmingHold] = useState(false);
  const [printingBooking, setPrintingBooking] = useState<any>(null);

  // B2C Guest Verification States
  // const [guestEmailInput, setGuestEmailInput] = useState('');
  // const [guestOtpInput, setGuestOtpInput] = useState('');
  // const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  // const [isOtpSent, setIsOtpSent] = useState(false);
  // const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  // const [isSendingOtp, setIsSendingOtp] = useState(false);
  // const [otpErrorMsg, setOtpErrorMsg] = useState<string | null>(null);
  // const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);
  // const [noBookingsPopup, setNoBookingsPopup] = useState(false);
  // const [checkedEmail, setCheckedEmail] = useState('');
  // const [showAccessModal, setShowAccessModal] = useState(false);

  // B2C Guest Verification States
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Modal states
  const [modalEmail, setModalEmail] = useState('');
  const [modalOtp, setModalOtp] = useState('');
  const [modalOtpArray, setModalOtpArray] = useState(['', '', '', '', '', '']);
  const [modalIsOtpSent, setModalIsOtpSent] = useState(false);
  const [modalIsSendingOtp, setModalIsSendingOtp] = useState(false);
  const [modalIsVerifyingOtp, setModalIsVerifyingOtp] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState<string | null>(null);
  const [modalSuccessMsg, setModalSuccessMsg] = useState<string | null>(null);
  const [hotelError, setHotelError] = useState<string | null>(null);
  const [flightError, setFlightError] = useState<string | null>(null);

  const guestToken = sessionStorage.getItem('guestToken');
  const guestEmail = sessionStorage.getItem('guestEmail');

  const handleGuestSignOut = () => {
    sessionStorage.removeItem('guestToken');
    sessionStorage.removeItem('guestEmail');
    window.location.reload();
  };


  // Modal handlers
  const handleModalSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmail) {
      setModalErrorMsg('Please enter a valid email address.');
      return;
    }
    setModalIsSendingOtp(true);
    setModalErrorMsg(null);
    setModalSuccessMsg(null);

    try {
      let hasHotelBookings = false;
      try {
        const hotelResult = await checkEmailBookings(modalEmail);
        if (typeof hotelResult === 'boolean') {
          hasHotelBookings = hotelResult;
        } else if (hotelResult?.body?.hasBookings !== undefined) {
          hasHotelBookings = hotelResult.body.hasBookings;
        } else if (hotelResult?.data?.hasBookings !== undefined) {
          hasHotelBookings = hotelResult.data.hasBookings;
        } else if (hotelResult?.success !== undefined) {
          hasHotelBookings = hotelResult.success;
        }
      } catch (err) {
        // Continue with other checks
      }

      let hasFlightBookings = false;
      try {
        const flightCheck = await checkFlightEmailBookings(modalEmail);
        if (flightCheck?.data?.exists === true) {
          hasFlightBookings = true;
        } else if (flightCheck?.data?.hasBookings === true) {
          hasFlightBookings = true;
        } else if (flightCheck?.success === true) {
          hasFlightBookings = true;
        } else if (typeof flightCheck === 'boolean') {
          hasFlightBookings = flightCheck;
        }
      } catch (err) {
        // Continue with other checks
      }

      let hasCabBookings = false;
      try {
        const cabCheck = await checkCabEmailBookings(modalEmail);
        if (cabCheck?.body?.hasBookings === true) {
          hasCabBookings = true;
        } else if (cabCheck?.data?.hasBookings === true) {
          hasCabBookings = true;
        } else if (cabCheck?.success === true) {
          hasCabBookings = true;
        } else if (typeof cabCheck === 'boolean') {
          hasCabBookings = cabCheck;
        }
      } catch (err) {
        // Continue with other checks
      }

      const hasAny = hasHotelBookings || hasFlightBookings || hasCabBookings;

      if (!hasAny) {
        setModalErrorMsg('No bookings found for this email address.');
        setModalIsSendingOtp(false);
        return;
      }

      const res = await API.post('/user/auth/guest/request-otp', { email: modalEmail });

      if (res.data?.success) {
        setModalIsOtpSent(true);
        setModalSuccessMsg('An OTP has been sent to your email address.');
      } else {
        setModalErrorMsg(res.data?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setModalErrorMsg(err.response?.data?.message || err.message || 'Failed to send OTP.');
    } finally {
      setModalIsSendingOtp(false);
    }
  };

  const handleModalVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalOtp) {
      setModalErrorMsg('Please enter the OTP.');
      return;
    }
    setModalIsVerifyingOtp(true);
    setModalErrorMsg(null);
    try {
      const res = await API.post('/user/auth/guest/verify-otp', {
        email: modalEmail,
        otp: modalOtp,
      });
      if (res.data?.success && res.data?.token) {
        sessionStorage.setItem('guestToken', res.data.token);
        sessionStorage.setItem('guestEmail', res.data.email);
        setModalSuccessMsg('Verified successfully! Loading your bookings...');
        setTimeout(() => {
          setShowAccessModal(false);
          window.location.reload();
        }, 800);
      } else {
        setModalErrorMsg(res.data?.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setModalErrorMsg(err.response?.data?.message || err.message || 'Verification failed.');
    } finally {
      setModalIsVerifyingOtp(false);
    }
  };

  const handleModalOtpChange = (val: string, index: number) => {
    const num = val.replace(/[^0-9]/g, '');
    const newOtpArray = [...modalOtpArray];
    newOtpArray[index] = num.slice(-1);
    setModalOtpArray(newOtpArray);
    setModalOtp(newOtpArray.join(''));
    if (num && index < 5) {
      document.getElementById(`modal-otp-input-${index + 1}`)?.focus();
    }
  };

  const handleModalOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !modalOtpArray[index] && index > 0) {
      document.getElementById(`modal-otp-input-${index - 1}`)?.focus();
    }
  };

  const handleModalOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      const newOtpArray = [...modalOtpArray];
      for (let i = 0; i < 6; i++) {
        newOtpArray[i] = pasted[i] || '';
      }
      setModalOtpArray(newOtpArray);
      setModalOtp(newOtpArray.join(''));
      const nextFocus = Math.min(pasted.length, 5);
      document.getElementById(`modal-otp-input-${nextFocus}`)?.focus();
    }
  };

  const resetModal = () => {
    setModalEmail('');
    setModalOtp('');
    setModalOtpArray(['', '', '', '', '', '']);
    setModalIsOtpSent(false);
    setModalErrorMsg(null);
    setModalSuccessMsg(null);
  };

  const handleDirectPrint = (booking: any) => {
    setPrintingBooking(booking);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Main tabs - Figma-matched labels (no icons)
  const mainTabs = [
    { id: 'hotel', label: 'Hotels' },
    { id: 'flight', label: 'Flights' },
    { id: 'cab', label: 'Cabs' },
    { id: 'insurance', label: 'Insurance' },
  ];

  const subTabs = [
    { id: 'all', label: 'All Bookings' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'checkedout', label: 'Checked Out' },
  ];

  // Fetch flight bookings
  useEffect(() => {
    if (!user && !guestToken) {
      setLoading(false);
      return;
    }

    const fetchFlightBookings = async () => {
      if (mainTab !== 'flight') return;

      setLoading(true);
      setFlightError(null); // CHANGE: was setError(null)

      try {
        const email = guestEmail || user?.email;
        const source = 'b2c';

        const response = await getFlightBookings(source, email);
        console.log('The booking response', response);

        if (response.success === true) {
          setBookings(response.data || []);
        } else {
          setBookings([]);
          setFlightError(response.message || 'Failed to fetch flight bookings'); // CHANGE: was setError
        }
      } catch (err: any) {
        console.error('Error fetching flight bookings:', err);
        setBookings([]);
        setFlightError(err.message || 'Failed to fetch flight bookings'); // CHANGE: was setError
      } finally {
        setLoading(false);
      }
    };

    // Fetch hotel bookings
    const fetchHotelBookings = async () => {
      if (mainTab !== 'hotel') return;

      setLoading(true);
      setHotelError(null); // CHANGE: was setError(null)

      try {
        const response = await getBookings();
        if (response && response.body && Array.isArray(response.body.bookings)) {
          setHotelBookings(response.body.bookings);
        } else if (Array.isArray(response)) {
          setHotelBookings(response);
        } else {
          setHotelBookings([]);
        }
      } catch (err: any) {
        console.error('Error fetching hotel bookings:', err);
        setHotelBookings([]);
        setHotelError(err.message || 'Failed to load hotel bookings'); // CHANGE: was setError
      } finally {
        setLoading(false);
      }
    };

    const fetchCabBookings = async () => {
      if (mainTab !== 'cab') return;

      setLoading(true);
      setError(null);

      try {
        const email = guestEmail || user?.email;
        let response;
        if (user) {
          response = await getMyCabBookings(user.id);
        } else if (email) {
          response = await checkCabEmailBookings(email);
        }

        if (response?.success === true) {
          setCabBookings(response.data || []);
        } else if (response?.data) {
          setCabBookings(response.data);
        } else if (Array.isArray(response)) {
          setCabBookings(response);
        } else {
          setCabBookings([]);
        }
      } catch (err: any) {
        console.error('Error fetching cab bookings:', err);
        setCabBookings([]);
        setError(err.message || 'Failed to fetch cab bookings');
      } finally {
        setLoading(false);
      }
    };

    if (mainTab === 'flight') {
      fetchFlightBookings();
    } else if (mainTab === 'hotel') {
      fetchHotelBookings();
    } else if (mainTab === 'cab') {
      fetchCabBookings();
    } else if (mainTab === 'insurance') {
      setLoading(false);
    }
  }, [mainTab, user, guestEmail]);

  // Handlers
  const handleCancelSuccess = (cancelledBookingId: any) => {
    setBookings((prevBookings) =>
      prevBookings.map((booking) => {
        const bookingId = booking?.order?.bookingId || booking?.bookingId;
        if (bookingId === cancelledBookingId) {
          if (booking.order) {
            return { ...booking, order: { ...booking.order, status: 'cancelled' } };
          } else {
            return { ...booking, status: 'cancelled' };
          }
        }
        return booking;
      }),
    );
  };

  const handleConfirmBooking = async (booking: any, validationResponse: any) => {
    try {
      const bookingId = booking?.bookingId || booking?.order?.bookingId;

      if (!bookingId) {
        console.error('Booking ID not found');
        notifyError('Booking ID not found');
        return;
      }

      const response = await validateBooking({ bookingId });

      if (response.status?.success === true) {
        setConfirmationData({
          booking: booking,
          validationResponse: response,
          price: response.totalPrice || response.amount || booking?.amount || booking?.totalPrice,
          bookingId: bookingId,
          flightDetails: response.flightDetails || booking,
          passengers: response.passengers || booking?.travellers || booking?.passengers,
        });
        setShowConfirmationDetails(true);
      } else {
        notifyError(response.message || response.status?.message || 'Validation failed');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      notifyError(error?.response?.data?.message || 'Failed to validate booking');
    }
  };

  const handleFinalConfirmation = async (data: any) => {
    try {
      setShowConfirmationDetails(false);
      console.log('Final confirmation data:', data);

      setBookings((prevBookings) =>
        prevBookings.map((booking: any) => {
          const bookingId = booking?.order?.bookingId || booking?.bookingId;
          if (bookingId === data.bookingId) {
            if (booking.order) {
              return {
                ...booking,
                order: {
                  ...booking.order,
                  status: 'success',
                },
              };
            } else {
              return {
                ...booking,
                status: 'success',
              };
            }
          }
          return booking;
        }),
      );

      notifySuccess('Booking confirmed successfully!');
    } catch (error) {
      console.error('Final confirmation failed:', error);
      notifyError('Failed to confirm booking');
    }
  };

  const handleViewDetails = async (booking: any) => {
    setIsModalOpen(true);
    setSelectedBooking(null);

    if (mainTab === 'flight') {
      try {
        const bookingId = booking?.order?.bookingId || booking?.bookingId;
        const detailedBooking = await getFlightBookingsByBookingId(bookingId);
        setSelectedBooking(detailedBooking.data);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        setIsModalOpen(false);
      }
    } else if (mainTab === 'hotel') {
      try {
        const detailedBooking = await getHotelBookingDetails(booking._id);
        setSelectedBooking(detailedBooking);
      } catch (error) {
        console.error('Error fetching hotel details:', error);
        setIsModalOpen(false);
      }
    } else if (mainTab === 'cab') {
      setSelectedBooking(booking);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const handleHotelCancel = async (booking: HotelBooking) => {
    setSelectedBooking(booking);
    setShowHotelCancelDialog(true);
    setHotelCancelCharges(null);
    setHotelCancelError(null);
    setIsLoadingHotelCancelCharges(true);

    try {
      const charges = await getCancelCharges(booking._id);
      setHotelCancelCharges(charges);
    } catch (err: any) {
      setHotelCancelError(err.message || 'Failed to fetch cancellation charges');
    } finally {
      setIsLoadingHotelCancelCharges(false);
    }
  };

  const handleHotelCancelConfirm = async () => {
    if (!selectedBooking) return;
    setIsHotelCancelling(true);
    try {
      const cancelData = {
        ConfirmationNumber: selectedBooking.klarBookingId || selectedBooking.confirmationNumber,
        ReservationId: selectedBooking.reservationId,
      };
      const res: any = await cancelHotelBookingApi(cancelData);

      if (res && res.isFullyCancelled === false) {
        const refundLine =
          res.refundAmount !== undefined && res.refundAmount !== null
            ? ` A refund of ₹${res.refundAmount} will be issued to your original payment method once the hotel confirms.`
            : '';
        notifySuccess(`Cancellation requested. We are waiting for the hotel to confirm it.${refundLine}`);
        // CANCELLATION_PENDING, not PENDING — a PENDING booking is one we are
        // still trying to create, and the two must not look alike.
        setHotelBookings((prev) =>
          prev.map((b) =>
            b._id === selectedBooking._id ? { ...b, status: 'CANCELLATION_PENDING' } : b,
          ),
        );
      } else {
        setHotelBookings((prev) =>
          prev.map((b) =>
            b._id === selectedBooking._id
              ? {
                ...b,
                status: 'CANCELLED',
                cancelCharge:
                  res.applicableCharge !== undefined
                    ? res.applicableCharge
                    : hotelCancelCharges?.applicableCharge !== undefined
                      ? hotelCancelCharges.applicableCharge
                      : b.cancelCharge,
              }
              : b,
          ),
        );
        notifySuccess('Hotel booking cancelled successfully!');
      }
    } catch (err: any) {
      console.error('Error cancelling hotel:', err);
      notifyError(err.message || 'Failed to cancel hotel booking');
    } finally {
      setIsHotelCancelling(false);
      setShowHotelCancelDialog(false);
    }
  };

  const handleHotelConfirmHold = async (booking: HotelBooking) => {
    try {
      setIsConfirmingHold(true);
      const confirmData = {
        bookingId: booking.klarBookingId || booking.confirmationNumber || booking.reservationId,
        paymentInfos: [{ amount: booking.totalAmount }], // The exact netAmount is handled securely in the backend, but we provide this structure for TripJack
      };

      const res: any = await confirmBooking(confirmData);

      if (res && res.status === true) {
        setHotelBookings((prev) =>
          prev.map((b) => (b._id === booking._id ? { ...b, status: 'CONFIRMED' } : b)),
        );
        notifySuccess('Hold booking confirmed successfully!');
      } else {
        notifyError(res.description || 'Failed to confirm hold booking.');
      }
    } catch (err: any) {
      console.error('Error confirming hold booking:', err);
      notifyError(err.message || 'Failed to confirm hold booking');
    } finally {
      setIsConfirmingHold(false);
    }
  };

  // Filter functions
  const getFilteredBookings = () => {
    if (mainTab === 'cab') {
      const getStatus = (b: any) => {
        const status = b?.status || b?.bookingStatus;
        return typeof status === 'string' ? status.toLowerCase() : '';
      };
      switch (subTab) {
        case 'all':
          return cabBookings;
        case 'confirmed':
          return cabBookings.filter(b => ['confirmed', 'success', 'completed'].includes(getStatus(b)));
        case 'cancelled':
          // REFUNDED is the terminal state of a cancelled cab booking once the
          // money lands, so it belongs in this tab too.
          return cabBookings.filter(b => ['cancelled', 'refunded'].includes(getStatus(b)));
        default:
          return cabBookings;
      }
    }
    if (mainTab === 'insurance') return []; // Insurance returns empty array for filtered bookings

    if (mainTab === 'hotel') {
      // Apply subTab filtering for hotel bookings
      switch (subTab) {
        case 'all':
          return hotelBookings;
        case 'confirmed':
          return hotelBookings.filter(b => b.status === 'CONFIRMED' && !isHotelCheckedOut(b));
        case 'cancelled':
          return hotelBookings.filter(b => b.status === 'CANCELLED');
        case 'checkedout':
          return hotelBookings.filter(b => isHotelCheckedOut(b));
        default:
          return hotelBookings;
      }
    }

    if (!bookings.length) return [];

    const getStatus = (b: any) => {
      const status = b?.order?.status || b?.status;
      return typeof status === 'string' ? status.toLowerCase() : '';
    };

    switch (subTab) {
      case 'all':
        return bookings;
      case 'confirmed':
        return bookings.filter(b => getStatus(b) === 'success' || getStatus(b) === 'completed');
      case 'cancelled':
        return bookings.filter(b => getStatus(b) === 'cancelled');
      case 'checkedout':
        return []; // Non-hotel bookings do not have checkout status
      default:
        return bookings;
    }
  };

  const getCounts = () => {
    if (mainTab === 'hotel') {
      const checkedOutCount = hotelBookings.filter(isHotelCheckedOut).length || 0;
      return {
        all: hotelBookings.length || 0,
        confirmed: (hotelBookings.filter(b => b.status === 'CONFIRMED').length - checkedOutCount) || 0,
        cancelled: hotelBookings.filter(b => b.status === 'CANCELLED').length || 0,
        checkedout: checkedOutCount,
      };
    }
    if (mainTab === 'cab') {
      const getStatus = (b: any) => {
        const status = b?.status || b?.bookingStatus;
        return typeof status === 'string' ? status.toLowerCase() : '';
      };
      return {
        all: cabBookings.length || 0,
        confirmed: cabBookings.filter(b => ['confirmed', 'success', 'completed'].includes(getStatus(b))).length || 0,
        cancelled: cabBookings.filter(b => ['cancelled', 'refunded'].includes(getStatus(b))).length || 0,
        checkedout: 0,
      };
    }
    if (mainTab === 'insurance') return { all: 0, confirmed: 0, cancelled: 0, checkedout: 0 }; // Insurance returns empty counts

    const getStatus = (b: any) => {
      const status = b?.order?.status || b?.status;
      return typeof status === 'string' ? status.toLowerCase() : '';
    };

    return {
      all: bookings.length || 0,
      confirmed: bookings.filter(b => getStatus(b) === 'success' || getStatus(b) === 'completed').length || 0,
      cancelled: bookings.filter(b => getStatus(b) === 'cancelled').length || 0,
      checkedout: 0,
    };
  };

  const filteredBookings = getFilteredBookings();
  const counts = getCounts();

  // B2C Guest Verification Guard
  // if (!user && !guestToken) {
  //   const handleOtpChange = (val: string, index: number) => {
  //     const num = val.replace(/[^0-9]/g, '');
  //     const newOtpArray = [...otpArray];
  //     newOtpArray[index] = num.slice(-1);
  //     setOtpArray(newOtpArray);
  //     setGuestOtpInput(newOtpArray.join(''));
  //     if (num && index < 5) {
  //       document.getElementById(`otp-input-${index + 1}`)?.focus();
  //     }
  //   };

  //   const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
  //     if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
  //       document.getElementById(`otp-input-${index - 1}`)?.focus();
  //     }
  //   };

  //   const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  //     e.preventDefault();
  //     const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
  //     if (pasted) {
  //       const newOtpArray = [...otpArray];
  //       for (let i = 0; i < 6; i++) {
  //         newOtpArray[i] = pasted[i] || '';
  //       }
  //       setOtpArray(newOtpArray);
  //       setGuestOtpInput(newOtpArray.join(''));
  //       const nextFocus = Math.min(pasted.length, 5);
  //       document.getElementById(`otp-input-${nextFocus}`)?.focus();
  //     }
  //   };

  //   return (
  //     <div
  //       className="min-h-screen flex flex-col justify-between bg-cover bg-center bg-no-repeat relative"
  //       style={{
  //         backgroundImage: `linear-gradient(rgba(8, 12, 28, 0.8), rgba(8, 12, 28, 0.9)), url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&auto=format&fit=crop&q=80')`
  //       }}
  //     >
  //       {/* Transparent glassmorphic header */}
  //       <header className="px-4 sm:px-8 py-4 flex items-center bg-transparent w-full z-10">
  //         <div className="w-full max-w-[1232px] mx-auto flex items-center justify-between">
  //           <button onClick={() => navigate('/dashboard')} className="flex items-center cursor-pointer border-none bg-transparent p-0 hover:opacity-80 transition-opacity">
  //             <img src="/images/logo.png" alt="Klar Travels" className="h-[40px] sm:h-[44px] lg:h-[48px] w-auto object-contain" />
  //           </button>
  //         </div>
  //       </header>

  //       {/* Content Area */}
  //       <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 z-10">
  //         <div className="w-full flex items-center justify-center">

  //           {/* Access Your Bookings Form Card */}

  //           <div
  //             className="w-full bg-white text-[#1a1f36] rounded-3xl shadow-2xl flex flex-col border border-gray-100 flex-shrink-0"
  //             style={{
  //               maxWidth: '460px',
  //               padding: 'clamp(20px, 3vw, 36px) clamp(18px, 2.5vw, 36px)',
  //               boxSizing: 'border-box',
  //             }}
  //           >
  //             <div>
  //               <div className="text-center mb-5">
  //                 <h2 className="text-3xl font-bold tracking-tight text-[#1E243E] mb-2 font-serif">
  //                   Access Your Bookings
  //                 </h2>
  //                 <p className="text-gray-500 text-sm max-w-sm mx-auto">
  //                   Enter your email address to receive a verification code and view your trips.
  //                 </p>
  //               </div>

  //               {otpErrorMsg && (
  //                 <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
  //                   <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  //                   </svg>
  //                   <span>{otpErrorMsg}</span>
  //                 </div>
  //               )}

  //               {otpSuccessMsg && (
  //                 <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
  //                   <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  //                   </svg>
  //                   <span>{otpSuccessMsg}</span>
  //                 </div>
  //               )}

  //               <div className="space-y-6">
  //                 {!isOtpSent ? (
  //                   <form onSubmit={handleSendOtp} className="space-y-6">
  //                     <div>
  //                       <label htmlFor="email" className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">
  //                         Email Address
  //                       </label>
  //                       <input
  //                         id="email"
  //                         type="email"
  //                         required
  //                         placeholder="john@example.com"
  //                         value={guestEmailInput}
  //                         onChange={(e) => setGuestEmailInput(e.target.value)}
  //                         className="w-full px-4 py-3.5 rounded-xl border border-gray-200 outline-none transition-all text-sm font-medium bg-[#f8fafc] focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
  //                       />
  //                     </div>

  //                     <button
  //                       type="submit"
  //                       disabled={isSendingOtp}
  //                       className="w-full bg-white border border-[#1e293b] hover:bg-[#f8fafc] text-[#1e293b] py-3.5 rounded-xl font-bold transition-all disabled:bg-gray-100 disabled:text-gray-400 text-sm flex items-center justify-center gap-2 group cursor-pointer shadow-sm"
  //                     >
  //                       {isSendingOtp ? 'Sending OTP...' : (
  //                         <>
  //                           Send OTP
  //                           <span className="transform group-hover:translate-x-1 transition-transform">→</span>
  //                         </>
  //                       )}
  //                     </button>
  //                   </form>
  //                 ) : (
  //                   <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fadeIn">
  //                     <div>
  //                       <label htmlFor="email-disabled" className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">
  //                         Email Address
  //                       </label>
  //                       <input
  //                         id="email-disabled"
  //                         type="email"
  //                         disabled
  //                         value={guestEmailInput}
  //                         className="w-full px-4 py-3.5 rounded-xl border border-gray-200 outline-none text-sm font-medium bg-gray-50 text-gray-400 cursor-not-allowed"
  //                       />
  //                     </div>

  //                     <div>
  //                       <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-3 text-center">
  //                         Enter Verification Code
  //                       </label>

  //                       {/* 6 Digit Inputs */}
  //                       <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
  //                         {otpArray.map((digit, idx) => (
  //                           <input
  //                             key={idx}
  //                             id={`otp-input-${idx}`}
  //                             type="text"
  //                             maxLength={1}
  //                             pattern="[0-9]*"
  //                             inputMode="numeric"
  //                             value={digit}
  //                             onChange={(e) => handleOtpChange(e.target.value, idx)}
  //                             onKeyDown={(e) => handleOtpKeyDown(e, idx)}
  //                             onPaste={handleOtpPaste}
  //                             className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-gray-200 bg-[#f8fafc] focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
  //                           />
  //                         ))}
  //                       </div>

  //                       <div className="text-center mt-3">
  //                         <p className="text-xs text-gray-500">
  //                           Code sent to <span className="font-semibold text-gray-700">{guestEmailInput}</span>
  //                         </p>
  //                       </div>
  //                     </div>

  //                     <button
  //                       type="submit"
  //                       disabled={isVerifyingOtp}
  //                       className="w-full bg-[#1e243d] hover:bg-[#15192c] text-white py-3.5 rounded-xl font-bold transition-colors disabled:bg-gray-400 text-sm shadow-md"
  //                     >
  //                       {isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
  //                     </button>

  //                     <div className="flex justify-between items-center text-xs mt-4">
  //                       <button
  //                         type="button"
  //                         onClick={() => {
  //                           setIsOtpSent(false);
  //                           setOtpSuccessMsg(null);
  //                           setOtpErrorMsg(null);
  //                         }}
  //                         className="text-gray-500 hover:text-gray-800 font-semibold"
  //                       >
  //                         ← Change Email
  //                       </button>
  //                       <button
  //                         type="button"
  //                         onClick={(e) => {
  //                           handleSendOtp(e);
  //                         }}
  //                         className="text-[#1e243d] hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 bg-transparent border-none cursor-pointer"
  //                       >
  //                         ⟳ Resend Code
  //                       </button>
  //                     </div>
  //                   </form>
  //                 )}
  //               </div>
  //             </div>

  //             {/* Secure message bottom */}
  //             <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-400">
  //               <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
  //                 <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  //               </svg>
  //               <span>Secure access to your travel bookings.</span>
  //             </div>

  //           </div>

  //         </div>
  //       </div>

  //       {/* MMT style No Bookings Popup Modal */}
  //       {noBookingsPopup && (
  //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
  //           <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl scale-in duration-200">
  //             <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100">
  //               <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  //               </svg>
  //             </div>
  //             <h3 className="text-lg font-bold text-[#1E243E] mb-2">No Bookings Found</h3>
  //             <p className="text-gray-500 text-sm mb-6 leading-relaxed">
  //               There are no trips associated with <span className="font-semibold text-gray-700">{checkedEmail}</span>. Please make sure you used the correct email address.
  //             </p>
  //             <button
  //               onClick={() => {
  //                 setNoBookingsPopup(false);
  //                 setIsOtpSent(false);
  //                 setOtpArray(['', '', '', '', '', '']);
  //                 setGuestOtpInput('');
  //                 setGuestEmailInput('');
  //               }}
  //               className="w-full bg-[#1e243d] hover:bg-[#15192c] text-white py-2.5 rounded-xl font-bold transition-all text-sm shadow-md cursor-pointer"
  //             >
  //               Okay
  //             </button>
  //           </div>
  //         </div>
  //       )}

  //       {/* Footer */}
  //       <Footer2 />
  //     </div>
  //   );
  // }



  // Derive initials from user name or email
  const getUserInitials = () => {
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (user?.email) return user.email.slice(0, 2).toUpperCase();
    return 'JD';
  };
  const initials = getUserInitials();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* ── Unified White Top Block: Header + Title + Tabs ── */}
      <div className="bg-white">

        {/* Header */}
        <header className="px-4 sm:px-6 py-3 flex items-center sticky top-0 z-50 bg-white">
          <div className="w-full max-w-[1232px] mx-auto flex items-center justify-between">
            {/* Logo / Back */}
            <button onClick={() => navigate('/dashboard')} className="flex items-center cursor-pointer border-none bg-transparent p-0 hover:opacity-80 transition-opacity flex-shrink-0">
              <img src="/images/logo.png" alt="Klar Travels" className="h-[40px] w-auto object-contain" />
            </button>
            {guestEmail && (
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Guest: {guestEmail}</span>
                <button
                  onClick={handleGuestSignOut}
                  className="text-xs text-red-600 hover:text-red-800 font-bold border-l border-gray-300 pl-2 hover:underline bg-transparent cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Title + Tabs — no gap from header */}
        <div className="w-full max-w-[1232px] mx-auto px-4 pt-4 pb-0">
          <div className="mb-5">
            <h1
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontStyle: 'normal',
                fontSize: 'clamp(20px, 3.5vw, 32px)',
                lineHeight: '1.8',
                letterSpacing: '-0.96px',
                color: '#AE0407',
                opacity: 1,
                verticalAlign: 'middle',
                display: 'block',
              }}
            >
              My Bookings
            </h1>

          </div>

          {/* Main Tabs */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200 mb-6 overflow-x-auto">
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMainTab(tab.id);
                  setSubTab('all');
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all ${mainTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub Tabs - Only visible for non-insurance tabs */}
          {mainTab !== 'insurance' && (
            <div className="mb-6">
              <div className="border-b border-gray-200 flex-1">
                <div className="relative">
                  {/* Gradient fade on mobile */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none md:hidden"></div>

                  <nav className="flex space-x-3 sm:space-x-4 md:space-x-6 overflow-x-auto pb-2 scrollbar-hide">
                    {subTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id)}
                        className={`py-2.5 sm:py-3 md:py-4 px-2 sm:px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors relative whitespace-nowrap ${subTab === tab.id
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        {tab.label}
                        {counts[tab.id as keyof typeof counts] > 0 && (
                          <span
                            className={`ml-1 sm:ml-2 py-0.5 px-1.5 sm:px-2 rounded-full text-[10px] sm:text-xs ${subTab === tab.id
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                              }`}
                          >
                            {counts[tab.id as keyof typeof counts]}
                          </span>
                        )}
                      </button>
                    ))}
                  </nav>
                </div>
              </div>
            </div>
          )}

          {loading && (mainTab === 'flight' || mainTab === 'hotel') && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600">
                Loading your {mainTab === 'flight' ? 'flight' : 'hotel'} bookings...
              </p>
            </div>
          )}

          {/* Error State - Show only the relevant error */}
          {mainTab === 'flight' && flightError && (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-gray-600 mb-6">{flightError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {mainTab === 'hotel' && hotelError && (
            <div className="text-center py-12 bg-white rounded-lg">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
              <p className="text-gray-600 mb-6">{hotelError}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Bookings Display */}
          {/* {!loading && !error && (
            <>
              {mainTab === 'insurance' ? (
                <InsuranceBookingsPage />
              ) : filteredBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {mainTab === 'flight' && filteredBookings.map((booking) => (
                    <BookingCard
                      key={booking._id || booking.bookingId}
                      booking={booking}
                      onViewDetails={handleViewDetails}
                      onCancelSuccess={handleCancelSuccess}
                      onConfirmBooking={handleConfirmBooking}
                    />
                  ))}
                  {mainTab === 'hotel' && filteredBookings.map((booking) => (
                    <HotelBookingCard
                      key={booking._id}
                      booking={booking}
                      onViewDetails={handleViewDetails}
                      onCancel={handleHotelCancel}
                      onConfirmHold={handleHotelConfirmHold}
                      onPrint={handleDirectPrint}
                    />
                  ))}
                  {mainTab === 'cab' && (
                    <div className="col-span-full text-center py-12 bg-white rounded-lg">
                      <div className="text-6xl mb-4">🚕</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Cab Bookings Coming Soon
                      </h3>
                      <p className="text-gray-600">
                        Cab booking management will be available shortly.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-600 mb-6">
                    {mainTab === 'hotel'
                      ? "You don't have any hotel bookings yet."
                      : mainTab === 'cab'
                        ? "You don't have any cab bookings yet."
                        : mainTab === 'insurance'
                          ? "You don't have any insurance bookings yet."
                          : subTab === 'all'
                            ? "You don't have any flight bookings yet. Start planning your next trip!"
                            : subTab === 'upcoming'
                              ? "You don't have any upcoming flight bookings."
                              : subTab === 'past'
                                ? "You don't have any past flight bookings."
                                : "You don't have any cancelled flight bookings."}
                  </p>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Browse{' '}
                    {mainTab === 'hotel'
                      ? 'Hotels'
                      : mainTab === 'cab'
                        ? 'Cabs'
                        : mainTab === 'insurance'
                          ? 'Insurance'
                          : 'Flights'}
                  </button>
                </div>
              )}
            </>
          )} */}
          {/* Bookings Display */}
          {!loading && !error && (
            <>
              {mainTab === 'insurance' ? (
                <InsuranceBookingsPage />
              ) : !user && !guestToken ? (
                // Show Access Booking prompt when not logged in
                <div className="col-span-full">
                  <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="text-6xl mb-4">
                      {mainTab === 'hotel' && '🏨'}
                      {mainTab === 'flight' && '✈️'}
                      {mainTab === 'cab' && '🚕'}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 font-serif">
                      {mainTab === 'hotel' && 'Your Hotel Bookings'}
                      {mainTab === 'flight' && 'Your Flight Bookings'}
                      {mainTab === 'cab' && 'Your Cab Bookings'}
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      To get your booking details, please verify your email address.
                    </p>
                    <button
                      onClick={() => setShowAccessModal(true)}
                      className="px-8 py-3 bg-[#1e243d] hover:bg-[#15192c] text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg text-sm flex items-center gap-2 mx-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Access My Bookings
                    </button>
                  </div>
                </div>
              ) : filteredBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {mainTab === 'flight' && filteredBookings.map((booking) => (
                    <BookingCard
                      key={booking._id || booking.bookingId}
                      booking={booking}
                      onViewDetails={handleViewDetails}
                      onCancelSuccess={handleCancelSuccess}
                      onConfirmBooking={handleConfirmBooking}
                    />
                  ))}
                  {mainTab === 'hotel' && filteredBookings.map((booking) => (
                    <HotelBookingCard
                      key={booking._id}
                      booking={booking}
                      onViewDetails={handleViewDetails}
                      onCancel={handleHotelCancel}
                      onConfirmHold={handleHotelConfirmHold}
                      onPrint={handleDirectPrint}
                    />
                  ))}
                  {mainTab === 'cab' && filteredBookings.map((booking) => (
                    <CabBookingCard
                      key={booking._id || booking.bookingId}
                      booking={booking}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
                  <p className="text-gray-600 mb-6">
                    {mainTab === 'hotel'
                      ? "You don't have any hotel bookings yet."
                      : mainTab === 'cab'
                        ? "You don't have any cab bookings yet."
                        : mainTab === 'insurance'
                          ? "You don't have any insurance bookings yet."
                          : subTab === 'all'
                            ? "You don't have any flight bookings yet. Start planning your next trip!"
                            : subTab === 'upcoming'
                              ? "You don't have any upcoming flight bookings."
                              : subTab === 'past'
                                ? "You don't have any past flight bookings."
                                : "You don't have any cancelled flight bookings."}
                  </p>
                  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Browse{' '}
                    {mainTab === 'hotel'
                      ? 'Hotels'
                      : mainTab === 'cab'
                        ? 'Cabs'
                        : mainTab === 'insurance'
                          ? 'Insurance'
                          : 'Flights'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8 flex justify-center">
              <nav className="flex items-center gap-2">
                <button
                  disabled={!pagination.hasPrevPage}
                  className={`px-3 py-2 rounded-lg border ${pagination.hasPrevPage
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Previous
                </button>
                <span className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  {pagination.currentPage}
                </span>
                <button
                  disabled={!pagination.hasNextPage}
                  className={`px-3 py-2 rounded-lg border ${pagination.hasNextPage
                    ? 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Modals */}
        {showConfirmationDetails && confirmationData && (
          <HoldConfirmationDetailsModal
            data={confirmationData}
            onClose={() => setShowConfirmationDetails(false)}
            onConfirm={handleFinalConfirmation}
          />
        )}

        {isModalOpen && selectedBooking && mainTab === 'flight' && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={handleCloseModal}
            onCancelSuccess={handleCancelSuccess}
          />
        )}

        {isModalOpen && selectedBooking && mainTab === 'hotel' && (
          <HotelBookingDetailsModal
            booking={selectedBooking}
            onClose={handleCloseModal}
            onCancel={handleHotelCancel}
            onConfirmHold={handleHotelConfirmHold}
          />
        )}

        {isModalOpen && selectedBooking && mainTab === 'cab' && (
          <CabBookingDetailsModal
            booking={selectedBooking}
            onClose={handleCloseModal}
          />
        )}

        {/* Hotel Cancel Dialog */}
        {showHotelCancelDialog && selectedBooking && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowHotelCancelDialog(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Hotel Booking?</h3>
                <p className="text-gray-500 mb-4 text-sm">
                  You are about to cancel your hotel booking
                </p>

                {isLoadingHotelCancelCharges ? (
                  <div className="my-4 p-4 bg-gray-50 rounded-lg">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mb-2"></div>
                    <p className="text-sm text-gray-600">Calculating cancellation charges...</p>
                  </div>
                ) : hotelCancelError ? (
                  <div className="my-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{hotelCancelError}</p>
                  </div>
                ) : hotelCancelCharges && hotelCancelCharges.applicableCharge !== undefined ? (
                  <div className="my-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-left">
                    <h4 className="text-sm font-bold text-orange-800 mb-2">Cancellation Summary</h4>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Total Paid:</span>
                      <span className="text-sm font-semibold">
                        {selectedBooking.currencyCode}{' '}
                        {selectedBooking.totalAmount?.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-red-600 font-medium">Cancellation Fee:</span>
                      <span className="text-sm text-red-600 font-bold">
                        {hotelCancelCharges.currency || selectedBooking.currencyCode}{' '}
                        {hotelCancelCharges.applicableCharge?.toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="border-t border-orange-200 my-2 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">Estimated Refund:</span>
                      <span className="text-sm font-bold text-green-600">
                        {selectedBooking.currencyCode}{' '}
                        {Math.max(
                          (selectedBooking.totalAmount || 0) -
                          (hotelCancelCharges.applicableCharge || 0),
                          0,
                        ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                ) : null}

                <p className="text-xs text-red-500 mb-6 font-medium">
                  ⚠️ This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleHotelCancelConfirm}
                    disabled={isHotelCancelling || isLoadingHotelCancelCharges}
                    className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${isHotelCancelling || isLoadingHotelCancelCharges ? 'bg-red-300 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    {isHotelCancelling ? 'Cancelling...' : 'Yes, Cancel Booking'}
                  </button>
                  <button
                    onClick={() => setShowHotelCancelDialog(false)}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50"
                  >
                    Keep Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Printable Components for Direct Card Downloads */}
        {printingBooking && (
          <>
            {printingBooking.status === 'CONFIRMED' && mainTab === 'hotel' && (
              <HotelVoucher booking={printingBooking} />
            )}
            {printingBooking.status === 'CONFIRMED' && mainTab === 'cab' && (
              <CabVoucher booking={printingBooking} />
            )}
            {printingBooking.status === 'CANCELLED' && (
              <CancellationInvoice booking={printingBooking} />
            )}
          </>
        )}

        {/* Access Booking Modal */}
        {showAccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowAccessModal(false);
                resetModal();
              }}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => {
                  setShowAccessModal(false);
                  resetModal();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-[#1E243E] mb-2 font-serif">Access Your Bookings</h2>
                <p className="text-gray-500 text-sm">Enter your email to receive a verification code.</p>
              </div>

              {modalErrorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{modalErrorMsg}</span>
                </div>
              )}

              {modalSuccessMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{modalSuccessMsg}</span>
                </div>
              )}

              {!modalIsOtpSent ? (
                <form onSubmit={handleModalSendOtp} className="space-y-4">
                  <div>
                    <label htmlFor="modal-email" className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-2">
                      Email Address
                    </label>
                    <input
                      id="modal-email"
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={modalEmail}
                      onChange={(e) => setModalEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none transition-all text-sm font-medium bg-[#f8fafc] focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={modalIsSendingOtp}
                    className="w-full bg-[#1e243d] hover:bg-[#15192c] text-white py-3 rounded-xl font-bold transition-colors disabled:bg-gray-400 text-sm"
                  >
                    {modalIsSendingOtp ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleModalVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 tracking-wider uppercase mb-3 text-center">
                      Enter Verification Code
                    </label>
                    <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                      {modalOtpArray.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`modal-otp-input-${idx}`}
                          type="text"
                          maxLength={1}
                          pattern="[0-9]*"
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => handleModalOtpChange(e.target.value, idx)}
                          onKeyDown={(e) => handleModalOtpKeyDown(e, idx)}
                          onPaste={handleModalOtpPaste}
                          className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-gray-200 bg-[#f8fafc] focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                        />
                      ))}
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      Code sent to <span className="font-semibold text-gray-700">{modalEmail}</span>
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={modalIsVerifyingOtp}
                    className="w-full bg-[#1e243d] hover:bg-[#15192c] text-white py-3 rounded-xl font-bold transition-colors disabled:bg-gray-400 text-sm"
                  >
                    {modalIsVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalIsOtpSent(false);
                      setModalSuccessMsg(null);
                      setModalErrorMsg(null);
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 font-semibold"
                  >
                    ← Change Email
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* <PackagesFooter /> */}
        <Footer2 />
      </div>
    </div>
  );
};

export default MyBookingsPage;
