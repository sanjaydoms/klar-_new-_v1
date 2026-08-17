import { useRef, useCallback, useEffect, useState } from 'react';
import HotelCard from './HotelCard';
import type { Hotel } from '../types/hotelTypes';
import { getPropertyTypeLabel } from './HotelFilters';

interface HotelListProps {
  hotels?: Hotel[];
  isLoading?: boolean;
  isFetchingMore?: boolean;
  currentPage?: number;
  /** Suppliers still have a page left. Authoritative; replaces the old count comparison. */
  hasMore?: boolean;
  onPageChange?: (page: number) => void;
  /** Browsing without dates — cards hide price and prompt for dates instead of "Select". */
  isExploreMode?: boolean;
}

const mapHotelToCardProps = (hotel: Hotel, index: number) => {
  return {
    id: hotel.id || `hotel-${index}`,
    name: hotel.name || 'Unnamed Property',
    location:
      hotel.city && hotel.address
        ? `${hotel.address}, ${hotel.city}`
        : hotel.address || hotel.city || 'Location details unavailable',
    distance: hotel.distance || '',
    rating: hotel.starRating || hotel.rating || 0,
    reviews: hotel.reviews || 0,
    reviewScore: hotel.reviewScore?.toString() || '0.0',
    reviewLabel: hotel.reviewLabel || '',
    price: hotel.price || 0,
    apiPrice: (hotel as any).apiPrice || hotel.price || 0,
    // ── New pricing fields for MMT-style display ────────────────────────
    basePrice: hotel.basePrice ?? hotel.price ?? 0,
    taxAmount: hotel.taxAmount ?? 0,
    taxesIncluded: hotel.taxesIncluded ?? (hotel.taxAmount === 0 || hotel.taxAmount == null),
    // ─────────────────────────────────────────────────────────────────
    originalPrice: hotel.originalPrice ?? null,
    discount: hotel.discount ?? null,
    image: hotel.images?.[0] ?? '',
    images: hotel.images || [],
    allotment: hotel.allotment ?? null,
    propertyCode: hotel.propertyCode ?? null,
    brandCode: hotel.brandCode ?? null,
    city: hotel.city ?? null,
    address: hotel.address ?? null,
    amenities: hotel.amenities ?? null,
    cancellationPolicy: hotel.cancellationPolicy ?? null,
    description: hotel.description ?? null,
    checkInTime: hotel.checkInTime ?? null,
    checkOutTime: hotel.checkOutTime ?? null,
    rateComments: hotel.rateComments ?? null,
    hotelBoards: hotel.hotelBoards || [],
    hotelSegments: hotel.hotelSegments && hotel.hotelSegments.length > 0 
      ? hotel.hotelSegments 
      : [getPropertyTypeLabel(hotel)].filter(Boolean),
    source: hotel.source,
    altDeal: hotel.altDeal,
    isRefundable: hotel.isRefundable,
    inclusions: hotel.inclusions || [],
    correlationId: (hotel as any).correlationId || '',
    rawPayload: (hotel as any).rawPayload || null,
  };
};

const SkeletonHotelCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse flex flex-col md:flex-row w-full mb-6 min-h-[220px]">
    {/* Image Skeleton */}
    <div className="md:w-[280px] w-full h-[200px] md:h-auto bg-gray-200 rounded-xl flex-shrink-0" />

    {/* Content Skeleton */}
    <div className="md:pl-6 py-4 md:py-1 flex-1 flex flex-col justify-between">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded-md w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded-md w-1/2"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded-lg w-12 ml-4"></div>
        </div>

        {/* Star Rating Skeleton */}
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-4 bg-gray-200 rounded-full" />
          ))}
        </div>

        {/* Feature Tags Skeleton */}
        <div className="flex flex-wrap gap-2 mt-4">
          <div className="h-6 bg-gray-100 rounded-full w-24"></div>
          <div className="h-6 bg-gray-100 rounded-full w-32"></div>
          <div className="h-6 bg-gray-100 rounded-full w-20"></div>
        </div>
      </div>

      {/* Bottom Row Skeleton */}
      <div className="flex justify-between items-end mt-6 pt-4 border-t border-gray-50">
        <div className="space-y-2">
          <div className="h-3 bg-gray-100 rounded w-32"></div>
          <div className="h-3 bg-gray-100 rounded w-28"></div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-10 bg-blue-100/50 rounded-xl w-32"></div>
        </div>
      </div>
    </div>
  </div>
);

const HotelList = ({
  hotels,
  isLoading = false,
  isFetchingMore = false,
  currentPage = 1,
  hasMore = false,
  onPageChange,
  isExploreMode = false,
}: HotelListProps) => {
  const observer = useRef<IntersectionObserver | null>(null);
  // Highest page we've already asked the parent to load. Guards against firing
  // the same page twice while `isFetchingMore` is still catching up, without a
  // wall-clock debounce (which could skip a page and never retry it).
  const lastRequestedPageRef = useRef<number>(1);

  // `onPageChange` is a fresh closure on every parent render. Held in a ref so it
  // can stay out of the pagination effect's deps — otherwise that effect re-runs
  // on every parent render and can fire again off a stale `isIntersecting`.
  const onPageChangeRef = useRef(onPageChange);

  const CHUNK = 15;
  const LOAD_MARGIN_PX = 1000; // keep in sync with the observer's rootMargin

  const [renderedCount, setRenderedCount] = useState(CHUNK);

  // The live sentinel node, so we can re-test its geometry directly instead of
  // waiting for the observer to report another crossing (see `step` below).
  const sentinelNodeRef = useRef<HTMLDivElement | null>(null);

  // Monotonic "do one step" token. The load effect depends on ONLY this, which
  // is what stops the runaway described below.
  const [loadTick, setLoadTick] = useState(0);
  const requestStep = useCallback(() => setLoadTick((t) => t + 1), []);

  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  // Reset rendered count when hotels array completely changes (new search)
  useEffect(() => {
    setRenderedCount(CHUNK);
    lastRequestedPageRef.current = 1;
  }, [hotels?.[0]?.id]);

  const [isIntersecting, setIsIntersecting] = useState(false);

  const lastHotelElementRef = useCallback(
    (node: HTMLDivElement) => {
      sentinelNodeRef.current = node;
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver(
        (entries) => {
          setIsIntersecting(entries[0]!.isIntersecting);
        },
        {
          rootMargin: `${LOAD_MARGIN_PX}px`, // Load next chunk when within 1000px of the bottom (like MMT)
        },
      );

      if (node) observer.current.observe(node);
    },
    [isLoading],
  );

  /** Is the sentinel within the load margin *right now*, per live geometry? */
  const sentinelInView = useCallback(() => {
    const node = sentinelNodeRef.current;
    if (!node) return false;
    const rect = node.getBoundingClientRect();
    return rect.top <= window.innerHeight + LOAD_MARGIN_PX;
  }, []);

  // An intersection turning true is one reason to take a step.
  useEffect(() => {
    if (isIntersecting) requestStep();
  }, [isIntersecting, requestStep]);

  // So is finishing a fetch, or the list growing: the sentinel may still be in
  // view with no *new* observer crossing coming, which is how pagination used to
  // stall with the spinner on screen.
  useEffect(() => {
    if (isFetchingMore) return;
    const raf = requestAnimationFrame(() => {
      if (sentinelInView()) requestStep();
    });
    return () => cancelAnimationFrame(raf);
  }, [isFetchingMore, hotels?.length, sentinelInView, requestStep]);

  // ── ONE step per tick ──────────────────────────────────────────────────────
  //
  // This effect previously listed `renderedCount` in its deps AND called
  // `setRenderedCount` in its body, while `isIntersecting` stayed true for the
  // whole synchronous React cycle (IntersectionObserver callbacks are async, so
  // the observer cannot report "no longer in view" until after the commit). Each
  // +15 therefore re-ran the effect, which added another +15, until the loop
  // exhausted the array — every hotel in memory rendered in one shot and the
  // chunking never actually happened.
  //
  // Now the effect depends on `loadTick` alone, so it can only run once per
  // token. It then schedules the *next* token after paint, and only if the
  // sentinel is genuinely still within the load margin. That kills the runaway
  // without reintroducing a stall: continuation is driven by real geometry
  // rather than by waiting for another observer crossing that may never come.
  useEffect(() => {
    if (loadTick === 0 || isFetchingMore || !hotels) return;

    if (renderedCount < hotels.length) {
      setRenderedCount((c) => Math.min(c + CHUNK, hotels.length));
      const raf = requestAnimationFrame(() => {
        if (sentinelInView()) requestStep();
      });
      return () => cancelAnimationFrame(raf);
    }

    if (hasMore) {
      // Fire each page at most once, keyed on page number. The previous 1s
      // wall-clock debounce *skipped* (and never rescheduled) a page wanted
      // within 1s of the last fetch; once pages started returning from cache in
      // tens of ms, consecutive pages tripped it and — with the sentinel still
      // on-screen and no dependency changing — pagination stalled with no way to
      // resume short of a manual scroll.
      const nextPage = currentPage + 1;
      if (nextPage > lastRequestedPageRef.current) {
        lastRequestedPageRef.current = nextPage;
        onPageChangeRef.current?.(nextPage);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadTick]);

  if (isLoading && currentPage === 1) {
    return (
      <div className="w-full">
        <div className="mb-4">
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse mb-6 hidden md:block" />
        </div>
        {[...Array(5)].map((_, i) => (
          <SkeletonHotelCard key={i} />
        ))}
      </div>
    );
  }

  if (!hotels || hotels.length === 0) {
    return (
      <div className="w-full bg-white p-8 rounded-lg shadow-sm text-center">
        <p className="text-gray-600 text-lg">No hotels found matching your criteria.</p>
        <p className="text-gray-500 text-sm mt-2">Try adjusting your search parameters.</p>
      </div>
    );
  }

  const renderedHotels = hotels.slice(0, renderedCount);
  const hasMoreToRender = renderedCount < hotels.length;
  const hasMoreToFetch = hasMore;

  return (
    <div className="w-full min-w-0">
      {renderedHotels.map((hotel, index) => (
        <HotelCard key={`${hotel.id}-${index}`} {...mapHotelToCardProps(hotel, index)} isExploreMode={isExploreMode} />
      ))}

      {/* Intersection Observer Target */}
      {(hasMoreToRender || hasMoreToFetch) && (
        <div ref={lastHotelElementRef} className="flex justify-center mt-8 mb-4 min-h-[50px]">
          {(isFetchingMore || hasMoreToRender) && (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelList;
