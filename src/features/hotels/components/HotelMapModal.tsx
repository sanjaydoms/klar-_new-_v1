import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { X, Star, MapPin } from 'lucide-react';
import type { Hotel } from '@/features/hotels/types/hotelTypes';
import { formatHotelImageUrl } from '@/utils/hotelUtils';

/* ─── Global CSS injected once ─── */
const CAROUSEL_CSS = `
  /* Modal open animation */
  @keyframes klar-modal-in {
    from { opacity: 0; transform: scale(0.97) translateY(12px); }
    to   { opacity: 1; transform: scale(1)    translateY(0);    }
  }
  @keyframes klar-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes klar-no-hotels {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  .klar-modal-body  { animation: klar-modal-in  0.38s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .klar-backdrop    { animation: klar-fade-in    0.25s ease both; }
  .klar-no-hotels-msg { animation: klar-no-hotels 0.32s ease both; }

  /* Card — hover only, NO entrance animation */
  .klar-card:hover .klar-card-img { transform: scale(1.07); }
  .klar-card-img { transition: transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
  .klar-card:hover { box-shadow: 0 12px 28px rgba(30,30,110,0.22) !important; }

  /* Scrollbar hide */
  .klar-hide-scrollbar::-webkit-scrollbar { display: none; }
  .klar-hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }

  /* Leaflet Popups style */
  .leaflet-popup-content-wrapper {
    border-radius: 18px !important;
    box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  .leaflet-popup-tip-container { display: none; }
  .leaflet-popup-content { margin: 0 !important; width: auto !important; }
`;

let cssInjected = false;
const injectCSS = () => {
  if (cssInjected) return;
  const style = document.createElement('style');
  style.textContent = CAROUSEL_CSS;
  document.head.appendChild(style);
  cssInjected = true;
};

/* ─── Price bubble icon ─── */
const createPriceIcon = (price: number | null | undefined, isActive = false) => {
  const label = price && price > 0 ? `₹${price.toLocaleString()}` : '•';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: absolute;
        transform: translate(-50%, calc(-100% - 8px));
        background: ${isActive ? '#1e1e6e' : 'white'};
        color: ${isActive ? '#ffffff' : '#1e1e6e'};
        border: 2px solid #1e1e6e;
        border-radius: 20px;
        padding: 5px 11px;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
        box-shadow: ${isActive ? '0 4px 14px rgba(30,30,110,0.40)' : '0 2px 8px rgba(0,0,0,0.22)'};
        font-family: 'Inter', system-ui, sans-serif;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s, color 0.2s;
      ">
        ${label}
        <div style="
          position: absolute; bottom: -8px; left: 50%;
          transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 8px solid #1e1e6e;
        "></div>
      </div>
    `,
    iconSize: undefined,
    iconAnchor: [0, 0],
    popupAnchor: [0, -36],
  });
};

/* ─── Types ─── */
interface HotelMapModalProps {
  hotels: Hotel[];
  isOpen: boolean;
  onClose: () => void;
}

/* ─── MapInitialCenterer ─── */
const MapInitialCenterer = ({
  hotels,
  isOpen,
}: {
  hotels: Hotel[];
  isOpen: boolean;
}) => {
  const map = useMap();
  const lastRepositionRef = useRef<string>('');

  useEffect(() => {
    if (!isOpen || hotels.length === 0 || !map) return;

    // Unique key to avoid looping/re-triggering unless search parameters or list changes
    const hotelsKey = hotels.map((h) => `${h.id}-${h.latitude}-${h.longitude}`).join(',');
    if (lastRepositionRef.current === hotelsKey) return;

    const runReposition = () => {
      const mappable = hotels.filter(
        (h) => h.latitude && h.longitude && !isNaN(Number(h.latitude)) && !isNaN(Number(h.longitude))
      );
      if (mappable.length === 0) return;

      const bounds = L.latLngBounds(mappable.map((h) => [Number(h.latitude), Number(h.longitude)]));
      const geomCenter = bounds.getCenter();

      // Compute padding at the bottom (for the carousel cards, approx 35% of map height)
      const height = map.getSize().y;
      const paddingBottom = height > 0 ? height * 0.35 : 220;

      // Find the zoom level where all markers fit with this padding
      const boundsZoom = map.getBoundsZoom(bounds, false, L.point(0, paddingBottom));
      
      // Default to zoom level 13 unless zooming out further is required to fit all hotels
      const targetZoom = boundsZoom < 13 ? boundsZoom : 13;

      if (height > 0) {
        // Project geomCenter into absolute pixels at the target zoom level
        const centerProj = map.project(geomCenter, targetZoom);

        // We want the geomCenter of markers to sit in the upper portion of the viewport (at 30% Y).
        // The viewport center is always at 50% Y.
        // So the new map center needs to be shifted south (higher pixel Y value) by 20% of the viewport height.
        const offsetProj = L.point(centerProj.x, centerProj.y + (height * 0.20));

        // Unproject back to LatLng
        const offsetLatLng = map.unproject(offsetProj, targetZoom);

        // Smooth transition over 700ms using flyTo
        map.flyTo(offsetLatLng, targetZoom, {
          animate: true,
          duration: 0.7,
        });
      } else {
        // Fallback setView
        map.setView(geomCenter, targetZoom);
      }

      lastRepositionRef.current = hotelsKey;
    };

    // Small timeout to allow Leaflet's container sizes to settle
    const timer = setTimeout(runReposition, 120);
    return () => clearTimeout(timer);
  }, [isOpen, hotels, map]);

  return null;
};

/* ─── BoundsWatcher ─── */
const BoundsWatcher = ({
  hotels,
  onVisibleChange,
}: {
  hotels: Hotel[];
  onVisibleChange: (visible: Hotel[]) => void;
}) => {
  const map = useMap();
  // Store latest values in refs so computeVisible never needs to be recreated
  const hotelsRef = useRef(hotels);
  const onVisibleChangeRef = useRef(onVisibleChange);
  hotelsRef.current = hotels;
  onVisibleChangeRef.current = onVisibleChange;

  // Created once — reads from refs, never causes re-renders via deps
  const computeVisible = useCallback((mapInstance: L.Map) => {
    const bounds = mapInstance.getBounds();
    const visible = hotelsRef.current.filter(
      (h) => h.latitude && h.longitude && bounds.contains([Number(h.latitude), Number(h.longitude)]),
    );
    onVisibleChangeRef.current(visible);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useMapEvents({
    moveend: () => computeVisible(map),
    zoomend: () => computeVisible(map),
    load:    () => computeVisible(map),
  });

  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => computeVisible(map), 350);
    return () => clearTimeout(t);
  }, [map, computeVisible]);

  return null;
};

/* ─── MapController ─── */
const MapController = React.forwardRef<
  { panTo: (lat: number, lng: number) => void },
  { markerRefs: React.MutableRefObject<Record<string, L.Marker | null>> }
>(({ markerRefs }, ref) => {
  const map = useMap();
  React.useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number) => {
      map.panTo([lat, lng], { animate: true, duration: 0.6, easeLinearity: 0.25 });
      setTimeout(() => {
        Object.values(markerRefs.current).forEach((marker) => {
          if (!marker) return;
          const pos = marker.getLatLng();
          if (Math.abs(pos.lat - lat) < 0.001 && Math.abs(pos.lng - lng) < 0.001) {
            marker.openPopup();
          }
        });
      }, 500);
    },
  }));
  return null;
});
MapController.displayName = 'MapController';

/* ─── HotelMapModal ─── */
const HotelMapModal: React.FC<HotelMapModalProps> = ({ hotels, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [visibleHotels, setVisibleHotels] = useState<Hotel[]>([]);
  const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs    = useRef<Record<string, HTMLDivElement | null>>({});
  const markerRefs  = useRef<Record<string, L.Marker | null>>({});
  const mapControllerRef = useRef<{ panTo: (lat: number, lng: number) => void } | null>(null);

  // Inject CSS once on mount
  useEffect(() => { injectCSS(); }, []);

  // Update carousel when map bounds change — no remount, no animation
  const handleVisibleChange = useCallback((visible: Hotel[]) => {
    setVisibleHotels(visible);
  }, []);

  // Bubble click → highlight card + smooth-scroll carousel
  const handleBubbleClick = useCallback((hotel: Hotel) => {
    setActiveHotelId(hotel.id);
    setTimeout(() => {
      const card = cardRefs.current[hotel.id];
      if (card && carouselRef.current) {
        carouselRef.current.scrollTo({
          left: card.offsetLeft - carouselRef.current.offsetLeft - 16,
          behavior: 'smooth',
        });
      }
    }, 60);
  }, []);

  // Card click → smooth-pan map + open popup
  const handleCardClick = useCallback((hotel: Hotel) => {
    setActiveHotelId(hotel.id);
    if (hotel.latitude && hotel.longitude && mapControllerRef.current) {
      mapControllerRef.current.panTo(Number(hotel.latitude), Number(hotel.longitude));
    }
  }, []);

  if (!isOpen) return null;

  const mappableHotels = hotels.filter(
    (h) => h.latitude && h.longitude && !isNaN(Number(h.latitude)) && !isNaN(Number(h.longitude)),
  );

  const defaultCenter: [number, number] =
    mappableHotels.length > 0 && mappableHotels[0]?.latitude && mappableHotels[0]?.longitude
      ? [Number(mappableHotels[0].latitude), Number(mappableHotels[0].longitude)]
      : [48.8566, 2.3522];

  return createPortal(
    /* Backdrop */
    <div className="klar-backdrop fixed inset-0 z-[99999] bg-black/45 backdrop-blur-md flex items-center justify-center">

      {/* Modal shell */}
      <div
        className="klar-modal-body w-[96vw] h-[94vh] rounded-[2rem] shadow-2xl overflow-hidden relative border border-white/20 bg-gray-100"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* ── Floating Header ── */}
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-[400] w-11/12 max-w-4xl
                     bg-white/82 backdrop-blur-xl border border-white/55 text-[#1e1e6e] px-5 py-3.5
                     rounded-2xl shadow-xl flex justify-between items-center"
          style={{ transition: 'background 0.3s ease, box-shadow 0.3s ease' }}
        >
          <div className="flex items-center gap-3.5">
            <div className="bg-[#1e1e6e] p-2.5 rounded-xl text-white shadow-md">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold tracking-tight leading-tight">
                Interactive Map Explorer
              </h2>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mt-0.5">
                {mappableHotels.length} Properties Validated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-gray-100 hover:bg-red-50 hover:text-red-500 text-gray-500 rounded-xl shadow-sm"
            style={{ transition: 'background 0.2s ease, color 0.2s ease, transform 0.22s ease' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(90deg)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg)')}
          >
            <X size={19} strokeWidth={3} />
          </button>
        </div>

        {/* ── Map + Carousel container ── */}
        <div className="w-full h-full relative">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            scrollWheelZoom
            className="w-full h-full"
            style={{ zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
            {mappableHotels.length > 0 && <MapInitialCenterer hotels={mappableHotels} isOpen={isOpen} />}
            <BoundsWatcher hotels={mappableHotels} onVisibleChange={handleVisibleChange} />
            <MapController ref={mapControllerRef} markerRefs={markerRefs} />

            {mappableHotels.map((hotel, index) => {
              const jitter = ((index % 10) - 5) * 0.0001;
              const lat = Number(hotel.latitude) + jitter;
              const lng = Number(hotel.longitude) + jitter;
              const isActive = activeHotelId === hotel.id;

              return (
                <Marker
                  key={`${hotel.id}-${index}`}
                  position={[lat, lng]}
                  icon={createPriceIcon(hotel.price, isActive)}
                  ref={(m) => { markerRefs.current[hotel.id] = m; }}
                  eventHandlers={{ click: () => handleBubbleClick(hotel) }}
                >
                  <Popup className="hotel-popup-modern">
                    <div
                      onClick={() => navigate(`/hotels/${hotel.id}`, { state: { hotel } })}
                      className="w-[240px] flex flex-col cursor-pointer group rounded-2xl overflow-hidden
                                 bg-white hover:shadow-xl border border-gray-100 m-0 !p-0"
                      style={{ transition: 'box-shadow 0.25s ease' }}
                    >
                      <div className="w-full h-[140px] relative overflow-hidden">
                        <img
                          src={formatHotelImageUrl(hotel.images?.[0] || '')}
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-110"
                          style={{ transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        {hotel.price && hotel.price > 0 && (
                          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md text-[#1e1e6e]
                                          text-sm font-black px-3 py-1.5 rounded-lg shadow-xl border border-white/20">
                            ₹{hotel.price.toLocaleString()}
                          </div>
                        )}
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white
                                        px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Star size={10} className="fill-amber-400 text-amber-400" />
                          <span className="text-[10px] font-bold">
                            {hotel.starRating || hotel.rating || 'New'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4
                          className="font-extrabold text-sm text-gray-900 leading-tight mb-1 group-hover:text-blue-600 line-clamp-1"
                          style={{ transition: 'color 0.2s ease' }}
                        >
                          {hotel.name}
                        </h4>
                        <p className="text-[11px] text-gray-500 font-medium truncate flex items-center gap-1">
                          <MapPin size={10} />
                          {hotel.city || hotel.address || 'Unknown Location'}
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* ── Carousel overlay ── */}
          <div
            style={{
              position: 'absolute',
              bottom: 0, left: 0, right: 0,
              zIndex: 500,
              background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.22) 60%, transparent 100%)',
              paddingBottom: '16px',
              paddingTop: '44px',
              pointerEvents: 'none',
            }}
          >
            {visibleHotels.length === 0 ? (
              /* No hotels pill */
              <div
                key="no-hotels"
                className="klar-no-hotels-msg"
                style={{
                  pointerEvents: 'auto',
                  margin: '0 auto',
                  width: 'fit-content',
                  background: 'rgba(255,255,255,0.97)',
                  borderRadius: '14px',
                  padding: '11px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '9px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151',
                  fontFamily: "'Inter', sans-serif",
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '17px' }}>🔍</span>
                No hotels found in this area
              </div>
            ) : (
              /* Scrollable card strip — stable, no remount */
              <div
                ref={carouselRef}
                className="klar-hide-scrollbar"
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  overflowX: 'auto',
                  gap: '10px',
                  paddingLeft: '16px',
                  paddingRight: '16px',
                  paddingBottom: '4px',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {visibleHotels.map((hotel) => {
                  const isHighlighted = activeHotelId === hotel.id;
                  const stars = hotel.starRating || hotel.rating || 0;
                  const hasDiscount = hotel.originalPrice && hotel.originalPrice > (hotel.price || 0);
                  const discountPct = hasDiscount
                    ? Math.round(((hotel.originalPrice! - (hotel.price || 0)) / hotel.originalPrice!) * 100)
                    : 0;

                  return (
                    <div
                      key={hotel.id}
                      ref={(el) => { cardRefs.current[hotel.id] = el; }}
                      onClick={() => handleCardClick(hotel)}
                      className="klar-card"
                      style={{
                        flexShrink: 0,
                        width: 'clamp(155px, 20vw, 200px)',
                        background: '#ffffff',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        willChange: 'transform, box-shadow',
                        // Only these two change per interaction — no entrance animations
                        boxShadow: isHighlighted
                          ? '0 0 0 3px #1e1e6e, 0 10px 28px rgba(30,30,110,0.32)'
                          : '0 4px 16px rgba(0,0,0,0.18)',
                        transform: isHighlighted ? 'translateY(-6px) scale(1.045)' : 'translateY(0) scale(1)',
                        transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease, border-color 0.18s ease',
                        border: isHighlighted ? '2px solid #1e1e6e' : '2px solid transparent',
                      }}
                    >
                      {/* Image */}
                      <div style={{
                        position: 'relative',
                        height: 'clamp(85px, 11vw, 115px)',
                        background: '#f3f4f6',
                        overflow: 'hidden',
                      }}>
                        <img
                          src={
                            hotel.images && hotel.images.length > 0
                              ? formatHotelImageUrl(hotel.images[0])
                              : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70'
                          }
                          alt={hotel.name}
                          className="klar-card-img"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=70';
                          }}
                        />
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 60%)',
                          pointerEvents: 'none',
                        }} />
                        {stars > 0 && (
                          <div style={{
                            position: 'absolute', top: '6px', left: '6px',
                            background: 'rgba(30,30,110,0.90)', color: '#fff',
                            borderRadius: '6px', padding: '2px 6px',
                            fontSize: '10px', fontWeight: '700',
                            display: 'flex', alignItems: 'center', gap: '2px',
                            backdropFilter: 'blur(4px)',
                          }}>
                            <span style={{ color: '#fbbf24' }}>★</span> {stars}
                          </div>
                        )}
                        {hasDiscount && discountPct > 0 && (
                          <div style={{
                            position: 'absolute', top: '6px', right: '6px',
                            background: '#ef4444', color: '#fff',
                            borderRadius: '6px', padding: '2px 6px',
                            fontSize: '9px', fontWeight: '800',
                          }}>
                            -{discountPct}%
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div style={{ padding: '8px 10px 10px' }}>
                        <p style={{
                          margin: '0 0 2px', fontWeight: '700', fontSize: '11px', color: '#111827',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '1.3',
                        }}>
                          {hotel.name}
                        </p>
                        <p style={{
                          margin: '0 0 6px', fontSize: '10px', color: '#6b7280',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          display: 'flex', alignItems: 'center', gap: '2px',
                        }}>
                          <span style={{ fontSize: '9px' }}>📍</span>
                          {hotel.city || hotel.address || 'Unknown Location'}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e1e6e' }}>
                            ₹{Math.round(hotel.price || 0).toLocaleString('en-IN')}
                          </span>
                          {hasDiscount && (
                            <span style={{ fontSize: '10px', color: '#9ca3af', textDecoration: 'line-through' }}>
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
      </div>
    </div>,
    document.body,
  );
};

export default HotelMapModal;
