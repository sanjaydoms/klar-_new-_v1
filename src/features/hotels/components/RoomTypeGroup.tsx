import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaCamera, FaChevronRight, FaCheckCircle } from 'react-icons/fa';
import { Utensils, X, CheckCircle2, XCircle, ChevronDown } from 'lucide-react';
import {
  formatHotelImageUrl,
  formatBedConfig,
  computeRoomDisplayPricing,
} from '../../../utils/hotelUtils';
import { getItemWithTTL } from '../../../utils/localStorageWithTTL';
import { useAuth } from '../../authentication/hooks/useAuth';
import { precheckTJ } from '../services/tripjackBookingService';

const inr = (n: number) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "BED AND BREAKFAST" → "Bed And Breakfast" */
const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};
const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(String(iso).replace(' ', 'T'));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Hover popover showing the cancellation policy, MMT-style. Rendered in a portal
 * so it escapes the card's scroll/overflow clipping. Anchored to the trigger rect.
 */
const CancellationPopover: React.FC<{
  rect: DOMRect;
  isRefundable: boolean;
  freeUntil?: string | null | undefined;
  checkIn?: string | null | undefined;
  policies?: any[] | undefined;
}> = ({ rect, isRefundable, freeUntil, checkIn, policies = [] }) => {
  const WIDTH = 340;
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - WIDTH - 12));
  const top = rect.bottom + 10;

  return createPortal(
    <div
      style={{ position: 'fixed', left, top, width: WIDTH, zIndex: 9999 }}
      className="rounded-xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.18)] border border-gray-100 p-4 animate-in fade-in zoom-in-95 duration-100"
    >
      <p className="text-[15px] font-bold text-gray-900 mb-3">Cancellation Policy</p>

      {isRefundable ? (
        <>
          {/* Timeline bar */}
          <div className="flex rounded-full overflow-hidden h-5 text-[10px] font-bold text-white mb-1">
            <div className="bg-[#0FA47F] flex-1 flex items-center justify-center">100% Refund</div>
            <div className="bg-[#F6E2B3] text-[#8A6D1B] flex-[0.9] flex items-center justify-center">
              Non Refundable
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mb-3">
            <div className="flex flex-col">
              <span className="font-bold text-gray-800">Now</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-gray-800">{fmtDate(freeUntil) || '—'}</span>
              <span>free until</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bold text-gray-800">{fmtDate(checkIn) || '—'}</span>
              <span>check-in</span>
            </div>
          </div>
          <p className="text-[12px] text-gray-600 leading-relaxed">
            Free cancellation (100% refund) if you cancel before{' '}
            <b className="text-gray-800">{fmtDateTime(freeUntil) || 'the deadline'}</b>. Cancellations
            after that are charged 100% of the booking amount.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-[13px] font-bold text-red-600">Non-Refundable</span>
          </div>
          <p className="text-[12px] text-gray-600 leading-relaxed">
            This rate cannot be cancelled, changed or refunded. If you cancel or don&apos;t show up,
            you&apos;ll be charged 100% of the booking amount.
          </p>
        </>
      )}

      {policies.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          {policies.slice(0, 4).map((p: any, i: number) => (
            <div key={i} className="flex justify-between text-[11.5px] text-gray-600 py-0.5">
              <span>{fmtDate(p.from || p.toDate) || 'Policy'}</span>
              <span className="font-semibold">
                {Number(p.amount) === 0 ? 'No charge' : `₹ ${inr(Number(p.amount))}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
};

/** Derive a stable, human-readable refundable label + boolean for one rate option. */
const deriveRefundable = (
  option: any,
): { label: string; isRefundable: boolean } => {
  if (option.refundableLabel) {
    return {
      label: option.refundableLabel,
      isRefundable: !/non[-\s]?refundable/i.test(option.refundableLabel),
    };
  }
  if (typeof option.isRefundable === 'boolean') {
    return {
      label: option.isRefundable ? 'Free Cancellation' : 'Non-Refundable',
      isRefundable: option.isRefundable,
    };
  }
  const policies = option.cancellationPolicies || [];
  const refundable = policies.some((p: any) => p.isRefundable || parseFloat(p.amount) === 0);
  return {
    label: refundable ? 'Free Cancellation' : 'Non-Refundable',
    isRefundable: refundable,
  };
};

interface RoomOptionRowProps {
  option: any;
  nights: number;
  hotelData: any;
  checkIn?: string | null | undefined;
  /** 'book' → precheck + navigate to booking. 'select' → tentatively pick for a slot. */
  mode?: 'book' | 'select';
  onBook: (option: any) => void;
  onRequireLogin?: (() => void) | undefined;
  buttonLabel?: string | undefined;
  highlight?: boolean | undefined;
  selected?: boolean | undefined;
}

/** One selectable rate (board + cancellation + price + book) inside a room-type group. */
const RoomOptionRow: React.FC<RoomOptionRowProps> = ({
  option,
  nights,
  hotelData,
  checkIn,
  mode = 'book',
  onBook,
  onRequireLogin,
  buttonLabel,
  highlight,
  selected,
}) => {
  const { isAuthenticated } = useAuth();
  const [isPrechecking, setIsPrechecking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cxlRect, setCxlRect] = useState<DOMRect | null>(null);
  const cxlRef = useRef<HTMLSpanElement>(null);

  const pricing = useMemo(
    () => computeRoomDisplayPricing(option, nights),
    [option, nights],
  );
  const { label: cancelLabel, isRefundable } = deriveRefundable(option);
  const isTJ = !!hotelData?.id?.startsWith?.('TJ:');

  const boardRaw =
    option.boardName ||
    option.mealBasis ||
    (option.roomInfo && option.roomInfo[0]?.mealBasis) ||
    '';
  const board = boardRaw ? titleCase(boardRaw) : 'Board not specified';

  // MMT-style headline: lead with the room offer, e.g. "Room With Free
  // Cancellation | Bed And Breakfast" — all derived from real supplier fields.
  const headline = (() => {
    const parts: string[] = [isRefundable ? 'Room With Free Cancellation' : 'Non-Refundable Room'];
    const b = board.toLowerCase();
    if (boardRaw && b !== 'room only' && b !== 'board not specified') parts.push(board);
    return parts.join(' | ');
  })();

  const offers: any[] = option.offers || [];
  const inclusions: string[] = option.inclusions || [];
  const cancellationPolicies: any[] = option.cancellationPolicies || [];
  const rateComments: string = option.rateComments || '';
  const hasDetails = cancellationPolicies.length > 0 || !!rateComments || inclusions.length > 0;

  const handleBook = async () => {
    const localToken = getItemWithTTL('token') || localStorage.getItem('authToken');
    if (!isAuthenticated && !localToken && onRequireLogin) {
      onRequireLogin();
      return;
    }

    // Selection mode: just record the pick for this slot — no precheck / navigation.
    if (mode === 'select') {
      onBook(option);
      return;
    }

    setErrorMsg(null);
    setIsPrechecking(true);
    try {
      if (isTJ) {
        const res: any = await precheckTJ({
          propertyId: hotelData.id,
          optionId: option.rateKey || option.optionId || '',
          reviewHash: option.reviewHash || '',
          correlationId: option.correlationId || '',
          hid: option.hid || '',
        });
        const ok =
          res?.status === 'success' || res?.status === true || res?.statusCode === 200;
        if (!ok) {
          setErrorMsg(res?.message || 'This rate is no longer available. Please pick another.');
          return;
        }
      }
      onBook(option);
    } catch (err: any) {
      let msg =
        err?.response?.data?.description ||
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err?.message ||
        'This rate is no longer available. Please try again.';
      if (
        String(msg).toLowerCase().includes('expired') ||
        err?.response?.data?.errors?.[0]?.errCode === '2503'
      ) {
        msg = 'Session expired. Please refresh the page and try again.';
      }
      setErrorMsg(msg);
    } finally {
      setIsPrechecking(false);
    }
  };

  return (
    <div
      className={`flex flex-col md:flex-row md:items-stretch justify-between gap-5 rounded-xl border p-5 sm:p-6 min-h-[190px] transition-colors ${
        selected
          ? 'border-green-500 bg-green-50'
          : highlight
            ? 'border-[#F2383E]/30 bg-[#FFF9F9]'
            : 'border-[#E5E7EB] bg-white hover:bg-[#FAFAFB]'
      }`}
    >
      {/* Left: headline + cancellation + meal + inclusions + more details */}
      <div className="flex flex-col gap-3 min-w-0 flex-1">
        <h4
          className="text-[17px] sm:text-[19px] font-bold text-[#111827] leading-snug"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {headline}
        </h4>

        {/* Cancellation — prominent, with date. Hover shows the policy popover. */}
        <span
          ref={cxlRef}
          onMouseEnter={() => cxlRef.current && setCxlRect(cxlRef.current.getBoundingClientRect())}
          onMouseLeave={() => setCxlRect(null)}
          className={`inline-flex w-fit items-center gap-2 text-[14px] font-semibold cursor-help border-b border-dashed border-gray-300 ${
            isRefundable ? 'text-[#0B8A6B]' : 'text-[#D64545]'
          }`}
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {isRefundable ? (
            <CheckCircle2 size={17} className="shrink-0" />
          ) : (
            <XCircle size={17} className="shrink-0" />
          )}
          {cancelLabel}
        </span>
        {cxlRect && (
          <CancellationPopover
            rect={cxlRect}
            isRefundable={isRefundable}
            freeUntil={option.freeCancellationUntil}
            checkIn={checkIn}
            policies={cancellationPolicies}
          />
        )}

        {/* Meal / board */}
        {boardRaw && (
          <span
            className="inline-flex items-center gap-2 text-[13px] text-[#4B5563]"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <Utensils size={15} className="shrink-0 text-[#6B7280]" />
            {board}
          </span>
        )}

        {/* Inclusions */}
        {inclusions.length > 0 && (
          <div className="flex flex-col gap-1">
            {inclusions.slice(0, 2).map((inc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-emerald-700 font-medium"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                {inc}
              </span>
            ))}
          </div>
        )}

        {/* More Details expander */}
        {hasDetails && (
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="inline-flex items-center gap-1 text-[13px] font-bold text-[#2563EB] hover:text-[#1D4ED8] self-start mt-auto"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            More Details
            <ChevronDown
              size={15}
              className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        {showDetails && hasDetails && (
          <div className="mt-1 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] p-3 flex flex-col gap-2">
            {cancellationPolicies.length > 0 && (
              <div>
                <p className="text-[12px] font-bold text-[#374151] mb-1">Cancellation Policy</p>
                {cancellationPolicies.slice(0, 4).map((p: any, i: number) => (
                  <p key={i} className="text-[11.5px] text-[#4B5563] leading-relaxed">
                    {p.from || p.toDate
                      ? `${new Date((p.from || p.toDate).replace(' ', 'T')).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}: `
                      : ''}
                    {Number(p.amount) === 0
                      ? 'Free cancellation (no charge)'
                      : `Charge ₹ ${inr(Number(p.amount))}`}
                  </p>
                ))}
              </div>
            )}
            {rateComments && (
              <p className="text-[11.5px] text-[#4B5563] leading-relaxed whitespace-pre-line">
                {rateComments.replace(/<[^>]+>/g, ' ').slice(0, 400)}
              </p>
            )}
          </div>
        )}

        {/* Offers */}
        {offers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {offers.slice(0, 2).map((offer: any, i: number) => (
              <span
                key={i}
                className="bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] text-[11.5px] font-semibold px-2.5 py-1 rounded"
              >
                {(offer.name || offer.description || 'Offer').replace(/\s?\(\d+\)/g, '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right: price + book */}
      <div className="flex flex-row md:flex-col items-end md:items-end justify-between md:justify-center gap-4 shrink-0 md:w-[220px] md:border-l md:border-[#F1F3F5] md:pl-6">
        <div className="flex flex-col items-start md:items-end">
          <span
            className="font-extrabold text-[#111827] text-[28px] sm:text-[32px] leading-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            ₹{inr(pricing.perNight)}
          </span>
          <span className="text-[12px] font-medium text-[#6B7280] mt-1.5">per night</span>
          {pricing.taxPerNight > 0 ? (
            <span className="text-[12px] font-medium text-[#6B7280] mt-0.5">
              + ₹{inr(pricing.taxPerNight)} taxes &amp; fees
            </span>
          ) : (
            <span className="text-[12px] font-medium text-[#6B7280] mt-0.5">
              Incl. taxes &amp; fees
            </span>
          )}
          <span className="text-[13px] font-semibold text-[#374151] mt-2">
            Total: ₹{inr(pricing.total)}
          </span>
        </div>

        <button
          onClick={handleBook}
          disabled={isPrechecking}
          className="h-12 px-7 md:w-full rounded-lg font-bold text-white text-[14px] sm:text-[15px] tracking-wide flex items-center justify-center transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: isPrechecking ? '#9CA3AF' : selected ? '#16a34a' : '#F2383E',
            fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.5px',
          }}
        >
          {isPrechecking ? (
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Verifying
            </span>
          ) : selected ? (
            <span className="flex items-center gap-1.5">
              <FaCheckCircle size={14} /> SELECTED
            </span>
          ) : (
            buttonLabel || (mode === 'select' ? 'SELECT' : 'BOOK NOW')
          )}
        </button>

        {errorMsg && (
          <div className="w-full p-2 bg-red-50 border border-red-200 rounded text-[12px] text-red-700 font-semibold">
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
};

export interface RoomTypeGroupProps {
  roomTypeName: string;
  options: any[];
  hotelData: any;
  searchParams: any;
  nights: number;
  /** 'book' → precheck + navigate. 'select' → tentatively pick for a multi-room slot. */
  mode?: 'book' | 'select';
  onBook: (option: any) => void;
  onRequireLogin?: (() => void) | undefined;
  buttonLabel?: string | undefined;
  /** In select mode, marks which option is currently chosen for this slot. */
  isOptionSelected?: ((option: any) => boolean) | undefined;
  /** Fallback amenities (hotel-level) when a room has none of its own. */
  fallbackAmenities?: string[];
}

/**
 * MMT-style room block: the room *type* (image, name, capacity, bed, amenities) is
 * shown once as a constant header, and its multiple rate options (boards / cancellation
 * / price) stack in a scrollable list on the right — instead of repeating a full card
 * per rate option.
 */
const MAX_ROOM_IMAGES = 8;

export const RoomTypeGroup: React.FC<RoomTypeGroupProps> = ({
  roomTypeName,
  options,
  hotelData,
  searchParams,
  nights,
  mode = 'book',
  onBook,
  onRequireLogin,
  buttonLabel,
  isOptionSelected,
  fallbackAmenities = [],
}) => {
  const rep = options[0] || {};
  const isMulti = options.length > 1;

  // ── Shared images across the room type ──
  const images: string[] = useMemo(() => {
    const collected = new Set<string>();
    options.forEach((o) => (o.images || []).forEach((img: string) => {
      const url = formatHotelImageUrl(img);
      if (url) collected.add(url);
    }));
    return Array.from(collected);
  }, [options]);

  const [imgIdx, setImgIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxImages = Math.min(images.length, MAX_ROOM_IMAGES);

  useEffect(() => {
    if (!isHovered || maxImages <= 1) return;
    const t = setInterval(() => setImgIdx((p) => (p + 1) % maxImages), 2500);
    return () => clearInterval(t);
  }, [isHovered, maxImages]);

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const target = c.clientWidth * imgIdx;
    if (Math.abs(c.scrollLeft - target) > 10) c.scrollTo({ left: target, behavior: 'smooth' });
  }, [imgIdx]);

  const goImage = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (maxImages <= 1) return;
    setImgIdx((p) => (p + dir + maxImages) % maxImages);
  };

  // ── Capacity / bed / amenities from representative option ──
  const totalAdults =
    rep.roomInfo?.reduce((s: number, r: any) => s + (r.adt || r.adults || 0), 0) ||
    rep.adults ||
    searchParams?.rooms?.[0]?.Adults ||
    2;
  const totalChildren =
    rep.roomInfo?.reduce((s: number, r: any) => s + (r.chd || r.children || 0), 0) ||
    rep.children ||
    searchParams?.rooms?.[0]?.Children ||
    0;

  const bedLabel = useMemo(() => {
    const raw = options.map((o) => o.bed_config).find(Boolean);
    const formatted = typeof raw === 'object' ? formatBedConfig(raw) : raw;
    if (
      typeof formatted === 'string' &&
      formatted.trim() &&
      !['null', 'undefined'].includes(formatted.toLowerCase())
    ) {
      return formatted;
    }
    return null;
  }, [options]);

  const amenities: string[] = useMemo(() => {
    const own = new Set<string>();
    options.forEach((o) => (o.amenities || []).forEach((a: string) => a && own.add(a)));
    const list = Array.from(own);
    return list.length > 0 ? list : fallbackAmenities;
  }, [options, fallbackAmenities]);

  // Cheapest option drives the "from" price shown in the header.
  const cheapest = useMemo(() => {
    let best = computeRoomDisplayPricing(rep, nights);
    options.forEach((o) => {
      const p = computeRoomDisplayPricing(o, nights);
      if (p.perNight < best.perNight) best = p;
    });
    return best;
  }, [options, nights, rep]);

  return (
    // Rounded corners are handled on the inner pieces (no overflow-hidden) so the
    // cancellation hover popover can escape the card bounds.
    <div className="bg-white rounded-[10px] border border-[#E5E7EB] shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] w-full flex flex-col lg:flex-row items-stretch">
      {/* ── LEFT: constant room-type panel — stays fixed while the options scroll. ── */}
      <div className="flex flex-col shrink-0 w-full lg:w-[360px] border-b lg:border-b-0 lg:border-r border-[#F3F4F6]">
        {/* Image carousel */}
        <div
          className="relative overflow-hidden bg-[#D9D9D9] group/room w-full h-[220px] sm:h-[280px] rounded-t-[10px] lg:rounded-tr-none lg:rounded-tl-[10px]"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {images.length > 0 ? (
            <div
              ref={scrollRef}
              className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
            >
              {images.slice(0, maxImages).map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${roomTypeName} - ${i + 1}`}
                  loading="lazy"
                  className="w-full h-full object-cover object-center shrink-0 snap-start"
                  style={{ minWidth: '100%' }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <FaCamera size={28} className="mb-2 opacity-20" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30">
                No Photo
              </span>
            </div>
          )}
          {maxImages > 1 && (
            <>
              <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/room:opacity-100 transition-opacity z-20">
                <button
                  onClick={goImage(-1)}
                  className="w-7 h-7 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm"
                >
                  <FaChevronRight className="rotate-180" size={10} />
                </button>
                <button
                  onClick={goImage(1)}
                  className="w-7 h-7 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-full backdrop-blur-sm"
                >
                  <FaChevronRight size={10} />
                </button>
              </div>
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                {images.slice(0, maxImages).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Room-type meta */}
        <div className="p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="font-bold text-[#111827] text-[18px] leading-snug"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {roomTypeName}
            </h3>
            <span className="text-[10px] font-medium text-[#6B7280] shrink-0 pt-1 tracking-wide">
              MAX {totalAdults + totalChildren} GUESTS
            </span>
          </div>

          <p className="text-[13px] text-[#4B5563]" style={{ fontFamily: 'Inter, sans-serif' }}>
            Fits {totalAdults} Adult{totalAdults > 1 ? 's' : ''}
            {totalChildren > 0 ? ` · ${totalChildren} Child${totalChildren > 1 ? 'ren' : ''}` : ''}
          </p>

          {bedLabel && (
            <span className="flex items-center gap-1.5 text-[13px] text-[#4B5563]">
              <span>🛏</span>
              <span>{bedLabel}</span>
            </span>
          )}

          {amenities.length > 0 && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
              {amenities.slice(0, 6).map((a, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 truncate text-[11px] text-[#4B5563]"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  <span className="w-1 h-1 rounded-full bg-[#6B7280] shrink-0" />
                  {a}
                </span>
              ))}
              {amenities.length > 6 && (
                <button
                  onClick={() => setShowAmenities(true)}
                  className="text-[11.5px] text-blue-600 hover:text-blue-800 font-bold text-left mt-0.5 hover:underline"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  + {amenities.length - 6} More
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: rate options. Single option → plain single card (no options chrome);
             multiple → MMT-style scrollable list with an options header. ── */}
      <div
        className={`flex flex-col flex-1 min-w-0 p-4 ${
          isMulti ? '' : 'justify-center'
        }`}
      >
        {isMulti && (
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[12px] font-bold text-[#374151] uppercase tracking-wide"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {options.length} Options
            </span>
            <span className="text-[11px] text-[#6B7280]">
              from <b className="text-[#111827]">₹{inr(cheapest.perNight)}</b>/night
            </span>
          </div>
        )}

        {/* Options scroll INSIDE the card (MMT behaviour): the room panel on the
            left stays put while these rate cards move under the cursor. On mobile
            they flow with the page. */}
        <div
          className={`flex flex-col gap-3 ${
            options.length > 2
              ? 'lg:max-h-[560px] lg:overflow-y-auto lg:pr-2 custom-scrollbar'
              : ''
          }`}
        >
          {options.map((option, i) => (
            <RoomOptionRow
              key={option.rateKey || option.optionId || i}
              option={option}
              nights={nights}
              hotelData={hotelData}
              checkIn={searchParams?.checkIn || searchParams?.checkin}
              mode={mode}
              onBook={onBook}
              onRequireLogin={onRequireLogin}
              buttonLabel={buttonLabel}
              highlight={isMulti && i === 0}
              selected={isOptionSelected ? isOptionSelected(option) : false}
            />
          ))}
        </div>
      </div>

      {/* Amenities modal */}
      {showAmenities && (
        <div
          onClick={() => setShowAmenities(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4 z-[9999]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-start p-5 border-b border-gray-100 bg-[#FAFAFA]">
              <div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug">{roomTypeName}</h2>
                <p className="text-xs text-gray-500 mt-1">Room facilities and amenities</p>
              </div>
              <button
                onClick={() => setShowAmenities(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3.5">
                {amenities.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowAmenities(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center gap-1"
              >
                <FaCheckCircle size={12} /> Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomTypeGroup;
