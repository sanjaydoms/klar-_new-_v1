import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '@/hooks';
import HotelFilters, { getPropertyTypeLabel } from '@/features/hotels/components/HotelFilters';
import type { FilterState } from '@/features/hotels/components/HotelFilters';
import HotelList from '@/features/hotels/components/HotelList';
import {
  FaChevronRight,
  FaFilter,
  FaTimes,
  FaPen,
  FaFilePdf,
  FaSearch,
  FaList,
  FaMapMarkedAlt,
  FaArrowLeft,
} from 'react-icons/fa';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';

import type { RoomOccupancy, Hotel, HotelSearchResponse } from '@/features/hotels/types/hotelTypes';
import { searchHotels, cancelActiveSearch, getHotelSuggestions, getStaticHotels } from '@/features/hotels/services/hotelSearchService';
import HotelAutocomplete from '@/features/hotels/components/HotelAutocomplete';
import DestinationAutocomplete from '@/features/hotels/components/DestinationAutocomplete';
import RoomGuestSelector from '@/features/hotels/components/RoomGuestSelector';
import { encodeRoomsToUrl, decodeRoomsFromUrl, formatHotelImageUrl, calculateNights, NO_HOTEL_IMAGE, todayLocalStr } from '@/utils/hotelUtils';
import SearchLoader from '@/features/hotels/components/SearchLoader';
import { SearchResultsPdfTemplate } from './SearchResultsPdfTemplate';
import { notifyError } from '@/utils/notify';

interface AdvancedMarkerProps {
  map: google.maps.Map | null;
  position: google.maps.LatLngLiteral;
  title?: string;
  onClick?: () => void;
  price: number;
  isActive: boolean;
}

const AdvancedMarker = ({
  map,
  position,
  title,
  onClick,
  price,
  isActive,
}: AdvancedMarkerProps) => {
  useEffect(() => {
    if (!map) return;

    let marker: any = null;

    (google.maps as any).importLibrary('marker').then((library: any) => {
      const { AdvancedMarkerElement } = library;

      const bubble = document.createElement('div');
      bubble.style.position = 'relative';
      bubble.style.background = isActive ? '#1e1e6e' : '#ffffff';
      bubble.style.border = isActive ? '2px solid #1e1e6e' : '2px solid #2563eb';
      bubble.style.borderRadius = '20px';
      bubble.style.padding = '6px 12px';
      bubble.style.color = isActive ? '#ffffff' : '#1e1e6e';
      bubble.style.fontSize = '12px';
      bubble.style.fontWeight = '800';
      bubble.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
      bubble.style.cursor = 'pointer';
      bubble.style.whiteSpace = 'nowrap';
      bubble.style.fontFamily = "'Inter', sans-serif";
      bubble.style.transition = 'all 0.15s ease-in-out';

      bubble.innerHTML = `
        ₹${Math.round(price).toLocaleString('en-IN')}
        <div class="marker-tail" style="
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%) rotate(45deg);
          width: 10px;
          height: 10px;
          background: ${isActive ? '#1e1e6e' : '#ffffff'};
          border-right: ${isActive ? '2px solid #1e1e6e' : '2px solid #2563eb'};
          border-bottom: ${isActive ? '2px solid #1e1e6e' : '2px solid #2563eb'};
          transition: all 0.15s ease-in-out;
        "></div>
      `;

      if (!isActive) {
        bubble.addEventListener('mouseenter', () => {
          bubble.style.background = '#1e1e6e';
          bubble.style.border = '2px solid #1e1e6e';
          bubble.style.color = '#ffffff';
          bubble.style.transform = 'scale(1.08)';
          const tail = bubble.querySelector('.marker-tail') as HTMLElement;
          if (tail) {
            tail.style.background = '#1e1e6e';
            tail.style.borderRightColor = '#1e1e6e';
            tail.style.borderBottomColor = '#1e1e6e';
          }
        });
        bubble.addEventListener('mouseleave', () => {
          bubble.style.background = '#ffffff';
          bubble.style.border = '2px solid #2563eb';
          bubble.style.color = '#1e1e6e';
          bubble.style.transform = 'scale(1)';
          const tail = bubble.querySelector('.marker-tail') as HTMLElement;
          if (tail) {
            tail.style.background = '#ffffff';
            tail.style.borderRightColor = '#2563eb';
            tail.style.borderBottomColor = '#2563eb';
          }
        });
      }

      marker = new AdvancedMarkerElement({
        map,
        position,
        title,
        content: bubble,
      });

      if (onClick) {
        marker.addListener('click', onClick);
      }
    });

    return () => {
      if (marker) {
        marker.map = null;
      }
    };
  }, [map, position, title, price, isActive, onClick]);

  return null;
};

// ── Google Maps libraries ────────────────────────────────────────────────────
const GOOGLE_MAPS_LIBRARIES: 'places'[] = ['places'];

// ── Inline Map for search results ────────────────────────────────────────────
const SearchResultsMap = ({
  hotels,
  onHotelClick,
}: {
  hotels: Hotel[];
  onHotelClick?: (hotel: Hotel) => void;
}) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeHotel, setActiveHotel] = useState<Hotel | null>(null);
  const [visibleHotels, setVisibleHotels] = useState<Hotel[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const hotelsWithCoords = useMemo(
    () => hotels.filter((h) => h.latitude && h.longitude).slice(0, 100),
    [hotels],
  );
  const center = useMemo(() => {
    if (hotelsWithCoords.length > 0) {
      const lats = hotelsWithCoords.map((h) => parseFloat(String(h.latitude)));
      const lngs = hotelsWithCoords.map((h) => parseFloat(String(h.longitude)));
      return {
        lat: lats.reduce((a, b) => a + b, 0) / lats.length,
        lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
      };
    }
    return { lat: 20.5937, lng: 78.9629 };
  }, [hotelsWithCoords]);

  // Update visible hotels based on map bounds
  const updateVisibleHotels = useCallback(() => {
    if (!map) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const visible = hotelsWithCoords.filter((h) => {
      const lat = parseFloat(String(h.latitude));
      const lng = parseFloat(String(h.longitude));
      return bounds.contains({ lat, lng });
    });
    setVisibleHotels(visible);
  }, [map, hotelsWithCoords]);

  // When map or hotels change, recalculate visible hotels
  useEffect(() => {
    if (!map) return;
    updateVisibleHotels();
    const boundsListener = map.addListener('bounds_changed', updateVisibleHotels);
    return () => {
      google.maps.event.removeListener(boundsListener);
    };
  }, [map, updateVisibleHotels]);

  // When a bubble is clicked, highlight + scroll carousel to that card
  const handleBubbleClick = useCallback((hotel: Hotel) => {
    setActiveHotel(hotel);
    // Scroll carousel to the card
    setTimeout(() => {
      const card = cardRefs.current[hotel.id];
      if (card && carouselRef.current) {
        carouselRef.current.scrollTo({
          left: card.offsetLeft - carouselRef.current.offsetLeft - 12,
          behavior: 'smooth',
        });
      }
    }, 50);
  }, []);

  // When a card is clicked, pan map to hotel and open popup
  const handleCardClick = useCallback((hotel: Hotel) => {
    if (map) {
      map.panTo({
        lat: parseFloat(String(hotel.latitude)),
        lng: parseFloat(String(hotel.longitude)),
      });
    }
    setActiveHotel(hotel);
  }, [map]);

  if (!isLoaded)
    return (
      <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading map...</span>
      </div>
    );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={12}
        onLoad={(mapInstance) => {
          setMap(mapInstance);
        }}
        onUnmount={() => setMap(null)}
        options={{
          mapId: 'DEMO_MAP_ID',
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {hotelsWithCoords.map((hotel) => (
          <AdvancedMarker
            key={hotel.id}
            map={map}
            position={{
              lat: parseFloat(String(hotel.latitude)),
              lng: parseFloat(String(hotel.longitude)),
            }}
            title={hotel.name}
            price={hotel.price || 0}
            isActive={activeHotel?.id === hotel.id}
            onClick={() => handleBubbleClick(hotel)}
          />
        ))}

        {activeHotel && (
          <InfoWindowF
            position={{
              lat: parseFloat(String(activeHotel.latitude)),
              lng: parseFloat(String(activeHotel.longitude)),
            }}
            onCloseClick={() => setActiveHotel(null)}
          >
            <div
              style={{
                width: '240px',
                fontFamily: "'Inter', sans-serif",
                background: '#ffffff',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image Section */}
              <div
                style={{
                  width: '100%',
                  height: '120px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#f3f4f6',
                }}
              >
                <img
                  src={
                    activeHotel.images && activeHotel.images.length > 0
                      ? formatHotelImageUrl(activeHotel.images[0])
                      : NO_HOTEL_IMAGE
                  }
                  alt={activeHotel.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = NO_HOTEL_IMAGE;
                  }}
                />

                {/* Star Rating Badge */}
                {(activeHotel.starRating ?? 0) > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      background: 'rgba(30, 30, 110, 0.95)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10px',
                      fontWeight: '700',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    <span style={{ color: '#fbbf24', fontSize: '11px' }}>★</span>
                    <span>{activeHotel.starRating}</span>
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <h4
                    style={{
                      fontWeight: '800',
                      fontSize: '13px',
                      color: '#111827',
                      margin: 0,
                      lineHeight: '1.3',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {activeHotel.name}
                  </h4>

                  <p
                    style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      margin: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ color: '#9ca3af' }}>📍</span>
                    {activeHotel.city || activeHotel.address || 'Unknown Location'}
                  </p>
                </div>

                {/* Price and Action */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    borderTop: '1px solid #f3f4f6',
                    paddingTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        textTransform: 'uppercase',
                        color: '#9ca3af',
                        fontWeight: '700',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Price/Night
                    </span>
                    <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e1e6e' }}>
                      ₹{Math.round(activeHotel.price || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {onHotelClick && (
                    <button
                      onClick={() => onHotelClick(activeHotel)}
                      style={{
                        background: '#1e1e6e',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(30, 30, 110, 0.2)',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.background = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.background = '#1e1e6e';
                      }}
                    >
                      Select
                    </button>
                  )}
                </div>
              </div>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* ── Hotel Card Carousel (fixed at bottom of map) ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 70%, transparent 100%)',
          paddingBottom: '12px',
          paddingTop: '32px',
          pointerEvents: 'none',
        }}
      >
        {visibleHotels.length === 0 ? (
          /* No hotels in viewport */
          <div
            style={{
              pointerEvents: 'auto',
              margin: '0 auto',
              width: 'fit-content',
              background: 'rgba(255,255,255,0.97)',
              borderRadius: '12px',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              fontSize: '13px',
              fontWeight: '600',
              color: '#374151',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ fontSize: '16px' }}>🔍</span>
            No hotels found in this area
          </div>
        ) : (
          /* Carousel */
          <div
            ref={carouselRef}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              overflowX: 'auto',
              gap: '10px',
              paddingLeft: '12px',
              paddingRight: '12px',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
            className="hide-scrollbar"
          >
            {visibleHotels.map((hotel) => {
              const isHighlighted = activeHotel?.id === hotel.id;
              const stars = hotel.starRating || 0;
              const hasDiscount = hotel.originalPrice && hotel.originalPrice > (hotel.price || 0);
              const discountPct = hasDiscount
                ? Math.round(((hotel.originalPrice! - (hotel.price || 0)) / hotel.originalPrice!) * 100)
                : 0;

              return (
                <div
                  key={hotel.id}
                  ref={(el) => { cardRefs.current[hotel.id] = el; }}
                  onClick={() => handleCardClick(hotel)}
                  style={{
                    flexShrink: 0,
                    width: 'clamp(160px, 22vw, 210px)',
                    background: '#ffffff',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    boxShadow: isHighlighted
                      ? '0 0 0 3px #1e1e6e, 0 8px 24px rgba(30,30,110,0.30)'
                      : '0 4px 16px rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    transform: isHighlighted ? 'translateY(-4px) scale(1.03)' : 'none',
                    transition: 'all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    border: isHighlighted ? '2px solid #1e1e6e' : '2px solid transparent',
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {/* Hotel Image */}
                  <div style={{ position: 'relative', height: 'clamp(90px, 12vw, 120px)', background: '#f3f4f6' }}>
                    <img
                      src={
                        hotel.images && hotel.images.length > 0
                          ? formatHotelImageUrl(hotel.images[0])
                          : NO_HOTEL_IMAGE
                      }
                      alt={hotel.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = NO_HOTEL_IMAGE;
                      }}
                    />
                    {/* Star rating overlay */}
                    {stars > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: 'rgba(30,30,110,0.92)',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span style={{ color: '#fbbf24' }}>★</span> {stars}
                      </div>
                    )}
                    {/* Discount badge */}
                    {hasDiscount && discountPct > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: '#ef4444',
                          color: '#fff',
                          borderRadius: '6px',
                          padding: '2px 6px',
                          fontSize: '9px',
                          fontWeight: '800',
                        }}
                      >
                        -{discountPct}%
                      </div>
                    )}
                  </div>

                  {/* Card Details */}
                  <div style={{ padding: '8px 10px 10px' }}>
                    {/* Hotel Name */}
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontWeight: '700',
                        fontSize: '11px',
                        color: '#111827',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.3',
                      }}
                    >
                      {hotel.name}
                    </p>

                    {/* Location */}
                    <p
                      style={{
                        margin: '0 0 6px',
                        fontSize: '10px',
                        color: '#6b7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <span style={{ fontSize: '9px' }}>📍</span>
                      {hotel.city || hotel.address || 'Unknown Location'}
                    </p>

                    {/* Price Row */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e1e6e' }}>
                        ₹{Math.round(hotel.price || 0).toLocaleString('en-IN')}
                      </span>
                      {hasDiscount && (
                        <span
                          style={{ fontSize: '10px', color: '#9ca3af', textDecoration: 'line-through' }}
                        >
                          ₹{Math.round(hotel.originalPrice!).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: '9px', color: '#9ca3af' }}>per night</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const getHotelLocality = (
  address: string | undefined,
  name: string | undefined,
  searchedCityStr: string
): string => {
  if (!address) return '';

  const addressParts = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const validParts = addressParts.filter((p) => {
    const lower = p.toLowerCase();

    // Exclude if it contains the searched city name
    if (searchedCityStr && lower.includes(searchedCityStr)) return false;

    // Exclude common legacy city names
    if (
      lower.includes('madras') ||
      lower.includes('bombay') ||
      lower.includes('calcutta') ||
      lower.includes('bengaluru') ||
      lower.includes('bangalore')
    )
      return false;

    // Exclude country variations
    if (lower === 'in' || lower === 'india' || lower === 'ind') return false;

    // Exclude if it contains numbers (removes pin codes, floor numbers, street numbers, plot numbers)
    if (/\d/.test(p)) return false;

    // Exclude if it contains specific address/landmark keywords
    const actualInvalidKeywords = [
      'floor',
      'near',
      'opp',
      'opposite',
      'behind',
      'next to',
      'beside',
      'road',
      'rd',
      'street',
      'st',
      'marg',
      'highway',
      'expressway',
      'gali',
      'hotel',
      'resort',
      'room',
      'shop',
      'building',
      'tower',
      'mansion',
      'court',
      'galaxy',
      'line',
      'block',
      'plot',
      'estate',
      'cross',
      'main',
    ];

    // Check word match for short keywords to avoid false positives (e.g. "st" in "East")
    const words = lower.split(/\s+/).map((w) => w.replace(/[^a-z]/g, ''));
    if (words.some((w) => actualInvalidKeywords.includes(w))) return false;

    // Exclude if the part is too long (likely a full unformatted address line rather than a locality)
    if (p.length > 25) return false;

    // Exclude if it matches hotel name
    if (name && lower === name.toLowerCase()) return false;

    return true;
  });

  if (validParts.length > 0) {
    // Take the last valid part, which is usually the broadest locality before city/pincode
    const locality = validParts[validParts.length - 1];

    if (locality.length > 2) {
      return locality
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return '';
};

const HotelSearchPage = () => {
  // Markup is applied on the backend (single source of truth); no client-side markup.
  const [searchParams, setSearchParams] = useState<{
    location: string;
    destinationCode: string;
    checkIn: string;
    checkOut: string;
    rooms: RoomOccupancy[];
    bookForGroup: boolean;
    hotelId?: string | undefined;
    PropertyId?: string;
    echotoken?: string;
    Currency?: string;
  } | null>(null);

  // allHotels = full unfiltered API result
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [facets, setFacets] = useState<any>(null);
  const [meta, setMeta] = useState<HotelSearchResponse['meta']>(null);
  // Only show loader if we have params but NO cached results — avoids loader flash on back navigation
  const [isLoading, setIsLoading] = useState(() => {
    const hasParams = !!sessionStorage.getItem('hotelSearchParams');
    const hasResults = !!sessionStorage.getItem('hotelSearchResults');
    // If results are already cached, never start in loading state
    if (hasResults) return false;
    return hasParams;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  // Explore Mode: browsing a property type with no dates yet. Results come from
  // the local static catalogue instead of a live supplier search.
  const [isExploreMode, setIsExploreMode] = useState(false);
  // Whether any supplier still has a page left. Replaces the old
  // `loadedCount < totalRecords` test, which compared against a summed provider
  // upper bound (6,179 TripJack candidate ids + 384 RateGain properties) and so
  // kept requesting pages long after the hotels ran out.
  const [hasMore, setHasMore] = useState(false);
  // Properties we hold for this destination ("40 of 6,179"). Display only — it is
  // deliberately NOT wired to pagination, which is what broke before.
  const [inventoryCount, setInventoryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track only the LATEST batch of hotels fetched (page-specific, not cumulative)
  const [currentBatchHotels, setCurrentBatchHotels] = useState<Hotel[]>([]);
  // The PDF template is rasterised into ONE canvas by html2canvas and then
  // sliced across the PDF's pages. Chrome caps canvas height at ~32,767px and
  // each row is ~200px, so an uncapped export of a long result list silently
  // produces a blank document.
  const PDF_MAX_ROWS = 40;
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  // MMT sort options
  const SORT_OPTIONS = [
    { id: 'price_asc', label: 'Price (Low to High)' },
    { id: 'price_desc', label: 'Price (High to Low)' },
    { id: 'rating_desc', label: 'User Rating (Highest)' },
    { id: 'price_rating', label: 'Lowest Price & Best Rated' },
  ];

  const [sortBy, setSortBy] = useState<string>('price_asc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // View mode: list vs map
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  // Inline search bar
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Top locations filter (dynamic from API)
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Active filter state
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    starRatings: [],
    priceRange: [0, 0],
    mealTypes: [],
    propertyTypes: [],
    amenities: [],
    searchText: '',
    showOnlyAltDeals: false,
    providers: [],
    // Mirrored by resetFilters. The two literals must carry the same keys:
    // when they diverge, a filter is one shape on first load and another
    // after "Clear all", and every consumer is written against only one.
    priceRanges: [],
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();

  // Use a ref to track the last searched parameters and avoid redundant calls
  const lastSearchKeyRef = useRef<string>('');
  const isMountedRef = useRef<boolean>(false);

  const resetFilters = useCallback(() => {
    setActiveFilters({
      starRatings: [],
      priceRange: [0, 0],
      mealTypes: [],
      propertyTypes: [],
      amenities: [],
      searchText: '',
      showOnlyAltDeals: false,
      providers: [],
      priceRanges: [],
    });
    setSelectedLocations([]);
    setSearchText('');
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelActiveSearch(); // clear any in-flight search when leaving the page
      document.title = 'Klar Travels'; // reset title on unmount
    };
  }, []);

  useEffect(() => {
    const city = urlSearchParams.get('city');
    const destCode = urlSearchParams.get('destCode');
    const checkin = urlSearchParams.get('checkin');
    const checkout = urlSearchParams.get('checkout');
    const roomsStr = urlSearchParams.get('rooms');
    const starFilterParam = urlSearchParams.get('starFilter');
    const propertyTypeParam = urlSearchParams.get('propertyType');
    const amenityFilterParam = urlSearchParams.get('amenityFilter');
    const exploreParam = urlSearchParams.get('explore') === 'true';

    // Pre-apply star rating filter from URL (e.g. from "5 Star Hotels in X" footer links)
    if (starFilterParam) {
      const stars = starFilterParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0);
      if (stars.length > 0) {
        setActiveFilters(prev => ({ ...prev, starRatings: stars }));
      }
    }

    // Pre-apply property type filter from URL (e.g. from ChooseYourSpace cards).
    // Skipped in Explore Mode — the static endpoint already filtered server-side,
    // and its slimmer hotel objects (no accTypeDesc/amenities) would make the
    // client-side classifier miss and hide every result.
    if (propertyTypeParam && !exploreParam) {
      setActiveFilters(prev => ({
        ...prev,
        propertyTypes: [propertyTypeParam],
      }));
    }

    // Pre-apply amenity filter from URL (e.g. Beachfront from ChooseYourSpace)
    if (amenityFilterParam) {
      setActiveFilters(prev => ({
        ...prev,
        amenities: [...(prev.amenities || []), amenityFilterParam],
      }));
    }

    // ── Explore Mode: instant browse from the local catalogue, no dates ──────
    if (exploreParam && city) {
      setIsExploreMode(true);
      const exploreKey = `explore-${city}-${destCode}-${propertyTypeParam || ''}`;
      if (exploreKey !== lastSearchKeyRef.current) {
        lastSearchKeyRef.current = exploreKey;
        setSearchParams({
          location: city,
          destinationCode: destCode || '',
          checkIn: '',
          checkOut: '',
          rooms: decodeRoomsFromUrl(roomsStr),
          bookForGroup: false,
        });
        // Explore Mode never uses date-scoped session cache — clear any stale
        // live-search result so leaving Explore Mode doesn't show old hotels.
        sessionStorage.removeItem('hotelSearchParams');
        sessionStorage.removeItem('hotelSearchResults');
        document.title = `${propertyTypeParam || 'Hotels'} in ${city} | Klar`;
        handleExploreSearch(city, propertyTypeParam || undefined, 1);
      }
      return;
    }
    setIsExploreMode(false);

    const searchKey = `${city}-${destCode}-${checkin}-${checkout}-${roomsStr}`;

    // Avoid redundant calls if the search key hasn't changed
    if (searchKey === lastSearchKeyRef.current && !location.state?.triggerSearch) {
      return;
    }

    const storedParams = sessionStorage.getItem('hotelSearchParams');
    const storedResults = sessionStorage.getItem('hotelSearchResults');

    let currentParams = null;
    let triggerSearchFromLink = false;

    if (city && checkin && checkout) {
      currentParams = {
        location: city,
        destinationCode: destCode || '',
        checkIn: checkin,
        checkOut: checkout,
        rooms: decodeRoomsFromUrl(roomsStr),
        bookForGroup: false,
      };

      // Check if params in URL differ from session storage
      let paramsMatch = false;
      if (storedParams) {
        try {
          const parsed = JSON.parse(storedParams);
          if (
            parsed.location === city &&
            parsed.checkIn === checkin &&
            parsed.checkOut === checkout &&
            JSON.stringify(parsed.rooms) === JSON.stringify(currentParams.rooms)
          ) {
            paramsMatch = true;
          }
        } catch (e) { }
      }

      if (!paramsMatch) {
        sessionStorage.setItem('hotelSearchParams', JSON.stringify(currentParams));
        sessionStorage.removeItem('hotelSearchResults');
        triggerSearchFromLink = true;
      }
      setSearchParams(currentParams);
    } else if (storedParams) {
      try {
        currentParams = JSON.parse(storedParams);
        setSearchParams(currentParams);
        // Sync back to URL keep it shareable
        if (isMountedRef.current) {
          setUrlSearchParams(
            {
              city: currentParams.location || '',
              destCode: currentParams.destinationCode || '',
              checkin: currentParams.checkIn || '',
              checkout: currentParams.checkOut || '',
              rooms: encodeRoomsToUrl(currentParams.rooms),
            },
            { replace: true },
          );
        }
      } catch (error) {
        console.error('Error parsing search params:', error);
      }
    }

    if (storedResults && !triggerSearchFromLink && !location.state?.triggerSearch) {
      try {
        const results: HotelSearchResponse = JSON.parse(storedResults);
        setAllHotels(results.hotels || []);
        setHasMore(results.hasMore ?? false);
        setInventoryCount(results.inventoryCount ?? results.hotels?.length ?? 0);
        setMeta(results.meta);
      } catch (error) {
        console.error('Error parsing search results:', error);
      }
    }

    if (
      currentParams &&
      (triggerSearchFromLink ||
        location.state?.triggerSearch ||
        (!storedResults && !triggerSearchFromLink))
    ) {
      lastSearchKeyRef.current = searchKey;
      handleInitialSearch(currentParams);
      // clear triggerSearch state to avoid loop
      if (location.state?.triggerSearch) {
        window.history.replaceState({}, document.title);
      }
    } else if (searchKey !== '----') {
      lastSearchKeyRef.current = searchKey;
    }
  }, [location.search, location.state]);



  const handleInitialSearch = async (params: any) => {
    try {
      if (!params.location) {
        setIsLoading(false);
        return;
      }



      setError(null);
      setAllHotels([]);
      setCurrentBatchHotels([]);
      setHasMore(false); // a fresh search must not inherit the previous one's paging state
      setInventoryCount(0);

      const storedParamsStr = sessionStorage.getItem('hotelSearchParams');
      if (storedParamsStr) {
        try {
          const storedParams = JSON.parse(storedParamsStr);
          if (storedParams.location !== params.location) {
            setSelectedLocations([]);
          }
        } catch (e) { }
      } else {
        resetFilters();
      }
      // Bug 1.43 fix: update page title to reflect search context
      document.title = `Hotels in ${params.location} | Klar`;
      const apiParams = {
        destination: params.hotelId || params.location,
        hotelId: params.hotelId,
        destinationCode: params.destinationCode,
        checkin: params.checkIn,
        checkout: params.checkOut,
        rooms: params.rooms.map((room: any) => ({
          numberOfRoom: room.numberOfRoom || 1,
          Adults: room.Adults || 2,
          Children: room.Children || 0,
          childrenAges: room.childrenAges || [],
          paxes: room.paxes || [],
        })),
        countryCode: 'IN',
        currency: params.Currency || 'INR',
        pageNo: 1,
      };

      const response = await searchHotels(apiParams);
      if (response.hotels.length === 0) {
        setError(
          `No hotels found in "${params.location}". Please check the spelling or try selecting a location from the suggestions.`,
        );
      }
      setAllHotels(response.hotels);
      setCurrentBatchHotels(response.hotels); // page 1 batch = all hotels from page 1
      setHasMore(response.hasMore ?? false);
      setInventoryCount(response.inventoryCount ?? response.hotels.length);
      setFacets(response.facets);
      setMeta(response.meta);
      sessionStorage.setItem('hotelSearchResults', JSON.stringify(response));
    } catch (error) {
      console.error('Initial search failed', error);
      setError(
        'Something went wrong while searching for hotels. Please check your internet connection or try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Explore Mode fetch: instant browse from the local static catalogue, no
   * live supplier round-trip and no dates. Page 1 replaces the list; later
   * pages (from HotelList's infinite scroll) append, same shape as the live
   * search path.
   */
  const handleExploreSearch = async (
    city: string,
    propertyType: string | undefined,
    page: number,
  ) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setCurrentPage(page);
    if (page > 1) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
      setError(null);
      setAllHotels([]);
      setCurrentBatchHotels([]);
      setHasMore(false);
      setInventoryCount(0);
    }

    try {
      const response = await getStaticHotels(city, propertyType, page);
      if (page === 1) {
        if (response.hotels.length === 0) {
          setError(
            `No ${propertyType ? propertyType.toLowerCase() + ' ' : ''}properties found in "${city}" yet.`,
          );
        }
        setAllHotels(response.hotels);
        setCurrentBatchHotels(response.hotels);
      } else {
        setAllHotels((prev) => {
          const existingIds = new Set(prev.map((h) => h.id));
          const newUnique = response.hotels.filter((h) => !existingIds.has(h.id));
          return [...prev, ...newUnique];
        });
        setCurrentBatchHotels(response.hotels);
      }
      setHasMore(response.hasMore ?? false);
      setInventoryCount(response.inventoryCount ?? response.hotels.length);
    } catch (error) {
      console.error('Explore search failed', error);
      if (page === 1) {
        setError('Could not load properties right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  const isFetchingRef = useRef<boolean>(false);

  const handleSearch = async (page = 1, isFilterUpdate = false, overrideRooms?: any[]) => {
    if (isExploreMode) {
      const propertyTypeParam = urlSearchParams.get('propertyType') || undefined;
      const city = urlSearchParams.get('city') || searchParams?.location || '';
      if (city) handleExploreSearch(city, propertyTypeParam, page);
      return;
    }

    if (!searchParams || isFetchingRef.current) return;

    if (!searchParams.location) {
      return;
    }

    const currentRooms = overrideRooms || searchParams.rooms;

    if (searchParams.hotelId && page === 1) {
      isFetchingRef.current = false;
      const roomsStr = encodeRoomsToUrl(currentRooms);
      navigate(
        `/hotels/${searchParams.hotelId}?city=${encodeURIComponent(searchParams.location)}&checkin=${searchParams.checkIn}&checkout=${searchParams.checkOut}&rooms=${roomsStr}`,
      );
      return;
    }

    if (page > 1) {
      setIsFetchingMore(true);
    } else {
      setIsLoading(true);
    }

    isFetchingRef.current = true;
    setCurrentPage(page);

    if (page === 1) {
      setError(null);
      setAllHotels([]);
      setCurrentBatchHotels([]);
      setHasMore(false); // a fresh search must not inherit the previous one's paging state
      setInventoryCount(0);

      const storedParamsStr = sessionStorage.getItem('hotelSearchParams');
      if (storedParamsStr) {
        try {
          const storedParams = JSON.parse(storedParamsStr);
          if (storedParams.location !== searchParams.location) {
            setSelectedLocations([]);
          }
        } catch (e) { }
      }
      setUrlSearchParams(
        {
          city: searchParams.location || '',
          destCode: searchParams.destinationCode || '',
          checkin: searchParams.checkIn || '',
          checkout: searchParams.checkOut || '',
          rooms: encodeRoomsToUrl(currentRooms),
        },
        { replace: true },
      );
      sessionStorage.setItem('hotelSearchParams', JSON.stringify({ ...searchParams, rooms: currentRooms }));
    }

    try {
      const apiParams = {
        destination: searchParams.hotelId || searchParams.location,
        hotelId: searchParams.hotelId,
        destinationCode: searchParams.destinationCode,
        checkin: searchParams.checkIn,
        checkout: searchParams.checkOut,
        rooms: currentRooms.map((room: any) => ({
          numberOfRoom: room.numberOfRoom || 1,
          Adults: room.Adults || 2,
          Children: room.Children || 0,
          childrenAges: room.childrenAges || [],
          paxes: room.paxes || [],
        })),
        countryCode: 'IN',
        currency: searchParams.Currency || 'INR',
        pageNo: page,
        filters: activeFilters,
        sortBy: sortBy,
      };

      const startTime = Date.now();
      if (page > 1) {
        console.log(`[PAGINATION] 🚀 Infinite Scroll started for Page ${page}...`);
        console.log(`[PAGINATION] 📦 Request Payload:`, JSON.stringify(apiParams, null, 2));
      }

      const response = await searchHotels(apiParams);
      const duration = Date.now() - startTime;

      if (page === 1) {
        if (response.hotels.length === 0) {
          setError(
            `No hotels found in "${searchParams.location}". Please check the spelling or try selecting a location from the suggestions.`,
          );
        }
        const hotelsWithBatch = response.hotels.map(h => ({ ...h, fetchBatch: page }));
        setAllHotels(hotelsWithBatch);
        setCurrentBatchHotels(hotelsWithBatch); // page 1 batch
        setFacets(response.facets);
        // The destination's total property count ("Showing 3,519 Properties in
        // Hyderabad") — a display-only figure from the backend, stable across
        // pages, far larger than the handful loaded so far.
        setInventoryCount(response.inventoryCount ?? response.hotels.length);
        sessionStorage.setItem('hotelSearchResults', JSON.stringify({ ...response, hotels: hotelsWithBatch }));
      } else {
        console.log(`[PAGINATION] ⏱️ Response received in ${duration}ms`);

        setAllHotels((prev) => {
          // Deduplicate based on id (frontend-mapped property)
          const existingIds = new Set(prev.map((h) => h.id));
          const newUniqueHotels = response.hotels
            .filter((h) => !existingIds.has(h.id))
            .map(h => ({ ...h, fetchBatch: page }));
          const skippedCount = response.hotels.length - newUniqueHotels.length;

          if (skippedCount > 0) {
            console.log(
              `[PAGINATION] ⚠️ Skipped ${skippedCount} hotels already in list (Duplicates).`,
            );
          }
          console.log(
            `[PAGINATION] ✅ UI Updated: Added ${newUniqueHotels.length} new hotels to the list.`,
          );
          return [...prev, ...newUniqueHotels];
        });

        // For PDF: track exactly the hotels from this page's API response (not cumulative)
        const batchHotels = response.hotels.map(h => ({ ...h, fetchBatch: page }));
        setCurrentBatchHotels(batchHotels);

        const storedResults = sessionStorage.getItem('hotelSearchResults');
        if (storedResults) {
          try {
            const parsed = JSON.parse(storedResults);
            // Also deduplicate for storage
            const existingIds = new Set(parsed.hotels.map((h: any) => h.id));
            const uniqueForStorage = batchHotels.filter((h: any) => !existingIds.has(h.id));
            parsed.hotels = [...parsed.hotels, ...uniqueForStorage];
            sessionStorage.setItem('hotelSearchResults', JSON.stringify(parsed));
          } catch (e) { }
        }
      }

      // A page that brought nothing back means the suppliers are exhausted,
      // regardless of what they claimed. Belt and braces against a bad hasMore.
      if (page > 1 && response.hotels.length === 0) {
        setHasMore(false);
      } else {
        setHasMore(response.hasMore ?? false);
      }
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (error) {
      console.error('Search failed', error);
      if (page === 1) {
        setError(
          'Something went wrong while searching for hotels. Please check your internet connection or try again.',
        );
      }
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
      isFetchingRef.current = false;
    }
  };

  // ── PDF Generation ──────────────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!pdfTemplateRef.current || isPdfGenerating) return;
    setIsPdfGenerating(true);
    try {
      const canvas = await html2canvas(pdfTemplateRef.current, {
        scale: 1.8,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3',
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const ratio = canvas.height / canvas.width;
      const imgH = pdfW * ratio;

      let yPos = 0;
      let heightLeft = imgH;

      pdf.addImage(imgData, 'PNG', 0, yPos, pdfW, imgH);
      heightLeft -= pdfH;

      while (heightLeft > 0) {
        yPos -= pdfH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, yPos, pdfW, imgH);
        heightLeft -= pdfH;
      }

      const dest = searchParams?.location?.replace(/\s+/g, '_') || 'Results';
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`Klar_Hotels_${dest}_Page${currentPage}_${dateStr}.pdf`);
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      notifyError('Failed to generate PDF: ' + (err?.message || 'Unknown error.'));
    } finally {
      setIsPdfGenerating(false);
    }
  }, [pdfTemplateRef, isPdfGenerating, searchParams, currentPage]);

  const handleAutocompleteChange = (loc: string, code: string, hId?: string) => {
    setSearchParams((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        location: loc,
        destinationCode: code,
        hotelId: hId,
      };
    });
  };

  const handleLocationToggle = useCallback((loc: string) => {
    setSelectedLocations((prev) =>
      prev.includes(loc) ? prev.filter((l) => l !== loc) : [...prev, loc],
    );
  }, []);

  const handleClearLocations = useCallback(() => {
    setSelectedLocations([]);
  }, []);

  // SearchResultsMap component moved to top level

  // ── Client-side filtering ────────────────────────────────────────────────────
  const hotelsWithMarkup = useMemo(() => {
    // Prices already include markup from the backend (single source of truth).
    // The frontend no longer applies markup — it renders backend prices verbatim.
    return allHotels.map((hotel) => ({
      ...hotel,
      apiPrice: hotel.price || 0,
      price: hotel.price || 0,
      basePrice: hotel.basePrice ?? hotel.price ?? 0,
      originalPrice: hotel.originalPrice,
      altDeal: hotel.altDeal,
    }));
  }, [allHotels]);

  // Compute nights once from searchParams so both filteredHotels and HotelFilters use the same value
  const nights = useMemo(() => {
    if (!searchParams?.checkIn || !searchParams?.checkOut) return 1;
    const d1 = new Date(searchParams.checkIn);
    const d2 = new Date(searchParams.checkOut);
    const n = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return n > 0 ? n : 1;
  }, [searchParams?.checkIn, searchParams?.checkOut]);

  const filterHotelsList = useCallback(
    (options: { excludeLocation?: boolean; excludePrice?: boolean } = {}) => {
      if (!hotelsWithMarkup.length) return [];

      return hotelsWithMarkup
        .filter((hotel) => {
          // 0. Inline search text
          if (searchText.trim()) {
            const q = searchText.toLowerCase();
            const name = (hotel.name || '').toLowerCase();
            const city = (hotel.city || '').toLowerCase();
            const address = (hotel.address || '').toLowerCase();
            if (!name.includes(q) && !city.includes(q) && !address.includes(q)) return false;
          }

          // 0b. Top locations filter
          if (!options.excludeLocation && selectedLocations.length > 0) {
            const searchedCityStr = (searchParams?.location || '').toLowerCase().trim();
            const normalized = getHotelLocality(hotel.address, hotel.name, searchedCityStr);
            if (!normalized || !selectedLocations.includes(normalized)) {
              return false;
            }
          }

          return true;
        })
        .filter((hotel) => {
          // 1. Text search (hotel name or city)
          if (activeFilters.searchText && activeFilters.searchText.trim()) {
            const q = activeFilters.searchText.toLowerCase();
            const name = (hotel.name || '').toLowerCase();
            const city = (hotel.city || '').toLowerCase();
            const address = (hotel.address || '').toLowerCase();
            if (!name.includes(q) && !city.includes(q) && !address.includes(q)) return false;
          }

          // 2. Star rating
          if (activeFilters.starRatings.length > 0) {
            if (!activeFilters.starRatings.includes(hotel.starRating || 0)) return false;
          }

          // 3. Price ranges from dynamic buckets
          if (!options.excludePrice) {
            const priceRanges = activeFilters.priceRanges;
            const hasPriceFilter = priceRanges && priceRanges.length > 0;
            if (hasPriceFilter) {
              const effectiveBasePrice = (hotel as any).basePrice ?? hotel.price;
              const pNight = effectiveBasePrice ? Math.round(effectiveBasePrice / nights) : 0;
              const match = priceRanges.some(([min, max]: [number, number]) => pNight >= min && pNight <= max);
              if (!match) return false;
            }
          }

          // 4. Meal types
          if (activeFilters.mealTypes.length > 0) {
            const hotelMealTypes = (hotel as any).mealBasis ? [(hotel as any).mealBasis] : ((hotel as any).hotelBoards || []);
            if (hotelMealTypes.length === 0) return false;

            const hasMatch = hotelMealTypes.some((t: string) => activeFilters.mealTypes.includes(t));
            if (!hasMatch) return false;
          }

          // 5. Property types
          if (activeFilters.propertyTypes.length > 0) {
            const hotelPropType = getPropertyTypeLabel(hotel);
            if (!hotelPropType || !activeFilters.propertyTypes.includes(hotelPropType)) return false;
          }

          // 6. Amenities — hotel must have ALL selected amenities
          if (activeFilters.amenities.length > 0) {
            const hotelAmenities = (hotel.amenities || []).map((a) => a.toLowerCase());
            const allPresent = activeFilters.amenities.every((a) =>
              hotelAmenities.some((ha) => ha.includes(a.toLowerCase())),
            );
            if (!allPresent) return false;
          }

          // 7. Alternative Deals (mapped from both providers)
          if (activeFilters.showOnlyAltDeals) {
            if (!hotel.altDeal) return false;
          }

          // 8. Providers/Sources
          if (activeFilters.providers && activeFilters.providers.length > 0) {
            if (!hotel.source || !activeFilters.providers.includes(hotel.source)) return false;
          }

          return true;
        });
    },
    [hotelsWithMarkup, searchText, selectedLocations, activeFilters, nights, searchParams]
  );

  const hotelsFilteredExcludingLocation = useMemo(
    () => filterHotelsList({ excludeLocation: true }),
    [filterHotelsList]
  );

  const hotelsFilteredExcludingPrice = useMemo(
    () => filterHotelsList({ excludePrice: true }),
    [filterHotelsList]
  );

  // ── Top Locations from API ───────────────────────────────────────────────────
  const topLocations = useMemo(() => {
    const locationCount: Record<string, number> = {};
    const searchedCityStr = (searchParams?.location || '').toLowerCase().trim();

    hotelsFilteredExcludingLocation.forEach((h) => {
      const normalized = getHotelLocality(h.address, h.name, searchedCityStr);
      if (normalized) {
        locationCount[normalized] = (locationCount[normalized] || 0) + 1;
      }
    });

    return Object.entries(locationCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [hotelsFilteredExcludingLocation, searchParams?.location]);


  const filteredHotels = useMemo(() => {
    const filtered = filterHotelsList();

    return [...filtered].sort((a, b) => {
      // 1. Keep pagination batches in order (newest chunk at the bottom)
      const batchA = (a as any).fetchBatch || 0;
      const batchB = (b as any).fetchBatch || 0;
      if (batchA !== batchB) return batchA - batchB;

      // 2. Sort within the batch
      if (!sortBy || sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'rating_desc') {
        const rd = (b.starRating || 0) - (a.starRating || 0);
        return rd !== 0 ? rd : (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_rating') {
        const scoreA = (a.price || 0) * 0.5 + (5 - (a.starRating || 0)) * 10000 * 0.5;
        const scoreB = (b.price || 0) * 0.5 + (5 - (b.starRating || 0)) * 10000 * 0.5;
        return scoreA - scoreB;
      }
      return 0;
    });
  }, [filterHotelsList, sortBy]);

  const searchSuggestions = useMemo(() => {
    if (!searchText.trim()) return [];
    const lowerQuery = searchText.toLowerCase();
    // Unique list of hotels matching search text
    const matches = allHotels.filter((h) => h.name.toLowerCase().includes(lowerQuery));
    const uniqueMatches = Array.from(new Map(matches.map((h) => [h.name, h])).values());
    return uniqueMatches.slice(0, 5);
  }, [searchText, allHotels]);

  const handleSearchSubmit = useCallback((text: string) => {
    setSearchText(text);
    setActiveFilters((prev) => ({ ...prev, searchText: text }));
    setShowSuggestions(false);
  }, []);

  return (
    <>
      {isLoading && currentPage === 1 && (
        <SearchLoader location={searchParams?.location || 'Selected Location'} />
      )}

      <div className="w-full min-h-screen bg-gray-50 flex flex-col pt-0 pb-[120px] md:pb-0">
        {/* Mobile Compact Header */}
        <div className="lg:hidden bg-[#1e1e6e] text-white px-4 py-3 flex justify-between items-center sticky top-[64px] z-[70] shadow-md">
          <div className="flex flex-col truncate pr-4 justify-center">
            <span className="font-bold text-[15px] leading-tight truncate">
              {searchParams?.location || 'Selected Location'}
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
              •{' '}
              {searchParams?.rooms?.reduce(
                (acc, r) => acc + (r.Adults || 0) + (r.Children || 0),
                0,
              ) || 2}{' '}
              Guests
            </span>
          </div>
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full transition-colors flex-shrink-0 flex items-center justify-center"
          >
            <FaPen size={10} />
          </button>
        </div>

        {/* Search Header - Hidden on mobile unless opened */}
        <div
          className={`${isMobileSearchOpen ? 'block' : 'hidden'} lg:block bg-white pt-0 pb-3 sticky top-[114px] lg:top-[64px] z-[60] shadow-md border-b border-gray-200 px-4 md:px-8 xl:px-12`}
        >
          <div
            className="w-full mx-auto flex flex-col lg:flex-row items-stretch justify-between gap-3 lg:gap-3 bg-white border border-gray-200 rounded-[12px] p-3 shadow-sm"
            style={{ minHeight: '76px' }}
          >
            {/* Fields row */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-2 items-stretch w-full lg:flex-1">
              {/* Destination */}
              <div className="group relative flex-[2.2] w-full min-w-0 bg-gray-50 border border-gray-200 hover:border-[#272E7C]/40 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 cursor-text">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <FaSearch className="text-[#272E7C] w-2.5 h-2.5 shrink-0" />
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
                    className="w-full h-full bg-transparent !border-0 text-[15px] font-semibold text-gray-900 focus:outline-none focus:!ring-0 p-0 placeholder-gray-400 truncate"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  />
                </div>
              </div>

              {/* Check In */}
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
                {/* Hidden date input */}
                <input
                  type="date"
                  value={searchParams?.checkIn || ''}
                  min={todayLocalStr()}
                  onChange={(e) =>
                    setSearchParams((prev) => (prev ? { ...prev, checkIn: e.target.value } : null))
                  }
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                  style={{ colorScheme: 'light' }}
                />
                {/* Label row */}
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
                {/* Formatted display value */}
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

              {/* Check Out */}
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
                {/* Hidden date input */}
                <input
                  type="date"
                  value={searchParams?.checkOut || ''}
                  min={searchParams?.checkIn || todayLocalStr()}
                  onChange={(e) =>
                    setSearchParams((prev) => (prev ? { ...prev, checkOut: e.target.value } : null))
                  }
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                  style={{ colorScheme: 'light' }}
                />
                {/* Label row */}
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
                {/* Formatted display value */}
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
              <div
                onClick={(e) => {
                  // Only forward click to the trigger button — never when the dropdown
                  // panel itself or any of its children is the click target
                  const btn = e.currentTarget.querySelector<HTMLButtonElement>(':scope > button');
                  if (btn && e.target === e.currentTarget) {
                    btn.click();
                  }
                }}
                className="group relative flex-1 w-full bg-gray-50 border border-gray-200 hover:border-[#272E7C]/60 focus-within:border-[#272E7C] focus-within:bg-white rounded-[8px] px-3 py-2 flex flex-col justify-between transition-all duration-150 overflow-visible cursor-pointer"
              >
                {/* Label row (non-interactive, behind button) */}
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
                    setSearchParams((prev) => (prev ? { ...prev, rooms } : null))
                  }
                  onApply={(newRooms) => {
                    handleSearch(1, false, newRooms);
                    setIsMobileSearchOpen(false);
                  }}
                  className="!border-none !bg-transparent text-[14px] font-semibold !text-gray-900 focus:!ring-0 p-0 w-full text-left mt-0.5"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                />
              </div>
            </div>

            {/* Search Button */}
            <div className="w-full lg:w-[120px] flex-shrink-0 flex items-stretch">
              <button
                onClick={() => {
                  handleSearch(1);
                  setIsMobileSearchOpen(false);
                }}
                disabled={isLoading}
                className="w-full h-full min-h-[52px] rounded-[10px] font-bold text-[13px] text-[#1A1F4D] transition-all duration-200 active:scale-95 hover:brightness-105 flex items-center justify-center gap-2 px-4 shadow-md uppercase tracking-wide disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #F8A90D 0%, #EFC269 100%)' }}
              >
                <FaSearch className="w-3.5 h-3.5" />
                {isLoading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>

        <div className="w-full mx-auto px-4 md:px-8 xl:px-12 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 mb-3 md:mb-6 font-sans">
            <div className="flex items-center gap-0">
              <span
                onClick={() => navigate('/')}
                className="cursor-pointer hover:underline text-[#1A1F4D] font-normal text-base leading-none"
              >
                Home
              </span>
              <FaChevronRight
                className="mx-2 text-[#1A1F4D]/50"
                style={{ width: '6.75px', height: '10.34px' }}
              />
              <span className="text-[#000000] font-semibold text-base leading-none">
                Hotels In {searchParams?.location || 'Selected Location'}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch lg:items-start mt-8 md:mt-12">
            {/* Sidebar - Hidden on mobile */}
            <div className="hidden lg:block w-full lg:w-[280px] flex-shrink-0 lg:sticky lg:top-[120px] z-10 pb-4 max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
              <HotelFilters
                hotels={hotelsWithMarkup}
                isLoading={isLoading}
                filteredHotels={filteredHotels}
                hotelsForPriceCounts={hotelsFilteredExcludingPrice}
                onFilterChange={setActiveFilters}
                activeFilters={activeFilters}
                topLocations={topLocations}
                selectedLocations={selectedLocations}
                onLocationToggle={handleLocationToggle}
                onClearLocations={handleClearLocations}
                facets={facets}
                nights={nights}
              />

              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="w-full mt-4 bg-white border border-blue-200 text-blue-500 font-bold py-3 rounded shadow-sm uppercase text-sm flex justify-center items-center hover:bg-blue-50"
              >
                SCROLL TO TOP <span className="ml-2">↑</span>
              </button>
            </div>

            {/* Mobile Filter Toggle Button */}
            {!isLoading && allHotels.length > 0 && (
              <div className="lg:hidden fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[80]">
                <button
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="bg-[#0b58e6] text-white px-5 py-2.5 rounded-full shadow-[0_8px_16px_rgba(11,88,230,0.4)] font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider border-[1.5px] border-white whitespace-nowrap active:scale-95 transition-transform"
                >
                  <FaFilter size={11} /> Sort & Filter
                </button>
              </div>
            )}

            {/* Mobile Filter Modal */}
            {isMobileFilterOpen && (
              <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col lg:hidden animate-in slide-in-from-bottom-full duration-300">
                <div className="bg-white p-4 flex justify-between items-center border-b shadow-sm sticky top-0 z-10">
                  <h2 className="font-bold text-lg text-gray-900">Sort & Filter</h2>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 pb-24">
                  <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-3 text-sm">Sort By</h3>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 px-3 py-2.5 rounded-lg text-sm text-gray-700 outline-none focus:border-blue-500"
                    >
                      <option value="">Recommended</option>
                      <option value="price_asc">Price ( Low to High )</option>
                      <option value="price_desc">Price ( High to Low )</option>
                      <option value="rating_desc">Rating ( High to Low )</option>
                      <option value="rating_asc">Rating ( Low to High )</option>
                    </select>
                  </div>
                  <HotelFilters
                    hotels={hotelsWithMarkup}
                    isLoading={isLoading}
                    filteredHotels={filteredHotels}
                    hotelsForPriceCounts={hotelsFilteredExcludingPrice}
                    onFilterChange={setActiveFilters}
                    activeFilters={activeFilters}
                    topLocations={topLocations}
                    selectedLocations={selectedLocations}
                    onLocationToggle={handleLocationToggle}
                    onClearLocations={handleClearLocations}
                    facets={facets}
                    nights={nights}
                  />
                </div>
                <div className="bg-white p-4 border-t sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl uppercase text-sm tracking-wide active:scale-95 transition-transform"
                  >
                    Apply & Show Results
                  </button>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-grow w-full min-w-0">
              {/* Results Header Row */}
              <div className="flex flex-col gap-2 md:gap-3 mb-3 md:mb-4">
                {/* Title + PDF + View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 w-full min-w-0">
                  <div className="flex-grow min-w-0">
                    {isLoading ? (
                      <div className="h-7 w-full max-w-xs bg-gray-200 animate-pulse rounded-lg" />
                    ) : (
                      <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => navigate(-1)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors shrink-0"
                          title="Go Back"
                        >
                          <FaArrowLeft className="text-[#1A1F4D] text-[14px] sm:text-[18px]" />
                        </button>
                        <span className="line-clamp-2 leading-tight flex-grow min-w-0 overflow-hidden text-ellipsis">
                          Showing {(inventoryCount || allHotels.length).toLocaleString('en-IN')}{' '}
                          {(inventoryCount || allHotels.length) === 1 ? 'Property' : 'Properties'} in{' '}
                          <span className="text-[#1e1e6e]">
                            {searchParams?.location || 'Selected Location'}
                          </span>

                        </span>
                      </h2>
                    )}
                  </div>
                  {!isLoading && (
                    <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar pb-1 sm:pb-0 w-full sm:w-auto justify-start sm:justify-end">
                      {/* View Toggle */}
                      <div className="flex border border-gray-200 rounded-md overflow-hidden shrink-0">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'list'
                            ? 'bg-[#1e1e6e] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <FaList size={11} /> List
                        </button>
                        <button
                          onClick={() => setViewMode('map')}
                          className={`px-3 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${viewMode === 'map'
                            ? 'bg-[#1e1e6e] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                          <FaMapMarkedAlt size={11} /> Map
                        </button>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="relative">
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="appearance-none w-[219px] h-[37px] border border-[#D4D4D4] rounded-[6px] px-[10px] pr-8 text-xs font-semibold text-gray-700 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          style={{
                            fontFamily: 'Inter, sans-serif'
                          }}
                        >
                          <option value="">Sort By : Recommended</option>
                          <option value="price_asc">Sort By : Price ( Low to High )</option>
                          <option value="price_desc">Sort By : Price ( High to Low )</option>
                          <option value="rating_desc">Sort By : Rating ( High to Low )</option>
                          <option value="rating_asc">Sort By : Rating ( Low to High )</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>


              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex items-start gap-3 shadow-sm animate-in fade-in duration-500">
                  <div className="bg-red-500 p-1.5 rounded-full shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-[14px]">Search Error</h4>
                    <p className="text-[12px] mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
              )}




              {/* Map View */}
              {viewMode === 'map' && !isLoading && (
                <div
                  className="w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-4"
                  style={{ height: '70vh' }}
                >
                  <SearchResultsMap
                    hotels={filteredHotels}
                    onHotelClick={(hotel) => {
                      const r = encodeRoomsToUrl(searchParams?.rooms || []);
                      navigate(
                        `/hotels/${hotel.id}?city=${encodeURIComponent(searchParams?.location || '')}&checkin=${searchParams?.checkIn || ''}&checkout=${searchParams?.checkOut || ''}&rooms=${r}`,
                        { state: { hotel, searchParams } },
                      );
                    }}
                  />
                </div>
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <HotelList
                  hotels={filteredHotels}
                  isLoading={isLoading}
                  isFetchingMore={isFetchingMore}
                  currentPage={currentPage}
                  hasMore={hasMore}
                  onPageChange={handleSearch}
                  isExploreMode={isExploreMode}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden PDF Template - rendered off-screen for capture */}
      {filteredHotels.length > 0 && searchParams && (
        <SearchResultsPdfTemplate
          ref={pdfTemplateRef}
          // Was `currentBatchHotels` — the LAST page fetched, not the results.
          // After scrolling, the export held an arbitrary tail batch labelled as
          // if it were the search results. Export what the user is looking at,
          // capped so html2canvas stays under the browser's ~32,767px canvas
          // height limit (one canvas is sliced across the PDF's pages).
          hotels={filteredHotels.slice(0, PDF_MAX_ROWS).map((h) => ({
            name: h.name,
            city: h.city || '',
            address: h.address || '',
            starRating: h.starRating || 0,
            price: h.price || 0,
            basePrice: (h as any).basePrice ?? h.price ?? 0,
            taxAmount: (h as any).taxAmount || 0,
            currency: (h as any).currency || 'INR',
            mealBasis: (h as any).mealBasis || '',
            isRefundable: (h as any).isRefundable,
            allotment: (h as any).allotment ?? null,
            source: (h as any).source,
            images: h.images || [],
            amenities: h.amenities || [],
          }))}
          searchInfo={{
            location: searchParams.location,
            checkIn: searchParams.checkIn,
            checkOut: searchParams.checkOut,
            rooms: searchParams.rooms,
          }}
          pageNo={currentPage}
          generatedAt={new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        />
      )}
    </>
  );
};

/** Scan all possible sources for meal types in a hotel */
const getHotelMealTypes = (hotel: Hotel): string[] => {
  const types = new Set<string>();

  if (Array.isArray(hotel.hotelBoards) && hotel.hotelBoards.length > 0) {
    hotel.hotelBoards.forEach((b) => {
      if (typeof b === 'string' && b.trim()) {
        const titleCase = b
          .trim()
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        types.add(titleCase);
      }
    });
  }

  if (hotel.mealBasis && typeof hotel.mealBasis === 'string' && hotel.mealBasis.trim()) {
    const titleCase = hotel.mealBasis
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    types.add(titleCase);
  }

  return Array.from(types);
};

export default HotelSearchPage;
