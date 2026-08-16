import React from 'react';
import { formatHotelImageUrl } from '@/utils/hotelUtils';

interface SearchInfo {
  location: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{ Adults?: number; Children?: number; numberOfRoom?: number }>;
}

interface HotelRow {
  name: string;
  city: string;
  address: string;
  starRating: number;
  price: number;
  basePrice: number;
  taxAmount: number;
  currency: string;
  mealBasis?: string;
  isRefundable?: boolean;
  allotment?: number | null;
  source?: string;
  images?: string[];
  amenities?: string[];
}

interface SearchResultsPdfTemplateProps {
  hotels: HotelRow[];
  searchInfo: SearchInfo;
  pageNo: number;
  generatedAt?: string;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// SourceBadge removed: it printed "TripJack" / "RateGain" onto a PDF the customer
// downloads. Which wholesaler filled a rate is our supply-chain detail, not a
// property of the stay, and it is the one place supplier identity reached an end
// user through an ungated path — the in-app equivalents are all behind
// `hostname === 'localhost'`.
export const SearchResultsPdfTemplate = React.forwardRef<
  HTMLDivElement,
  SearchResultsPdfTemplateProps
>(({ hotels, searchInfo, pageNo, generatedAt }, ref) => {
  const nights =
    searchInfo.checkIn && searchInfo.checkOut
      ? Math.ceil(
          (new Date(searchInfo.checkOut).getTime() - new Date(searchInfo.checkIn).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

  const totalRooms = searchInfo.rooms?.reduce((acc, r) => acc + (r.numberOfRoom || 1), 0) || 1;
  const totalGuests =
    searchInfo.rooms?.reduce((acc, r) => acc + (r.Adults || 2) + (r.Children || 0), 0) || 2;

  const stayLabel = nights > 0 ? `${nights} Night${nights > 1 ? 's' : ''} Stay` : 'Room Rate';

  return (
    <div
      ref={ref}
      style={{
        width: '1000px',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        position: 'absolute',
        left: '-9999px',
        top: '-99999px',
        zIndex: -1000,
        paddingBottom: '30px',
      }}
    >
      {/* Load Premium Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
          #pdf-root-container, #pdf-root-container * {
            font-family: 'Plus Jakarta Sans', -apple-system, sans-serif !important;
          }
        `,
        }}
      />

      <div id="pdf-root-container">
        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            padding: '34px 44px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Left: Logo + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <img
              src="/klar-logo.png"
              alt="Klar"
              style={{ height: '52px', objectFit: 'contain', filter: 'brightness(10)' }}
              crossOrigin="anonymous"
            />
            <div>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '-0.75px',
                  lineHeight: 1,
                }}
              >
                KLAR
              </div>
              <div
                style={{
                  color: '#cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginTop: '5px',
                  letterSpacing: '0.5px',
                }}
              >
                HOTEL SEARCH RESULTS
              </div>
            </div>
          </div>

          {/* Right: Page info */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '14px 24px',
              textAlign: 'right',
            }}
          >
            <div
              style={{
                color: '#94a3b8',
                fontSize: '9px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              RESULTS PAGE
            </div>
            <div style={{ color: '#ffffff', fontSize: '32px', fontWeight: 800, lineHeight: 1.1 }}>
              #{pageNo}
            </div>
            <div style={{ color: '#cbd5e1', fontSize: '11px', marginTop: '2px', fontWeight: 500 }}>
              {hotels.length} options listed
            </div>
          </div>
        </div>

        {/* ── SEARCH SUMMARY ───────────────────────────────────────────────── */}
        <div style={{ padding: '24px 44px 16px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)',
            }}
          >
            {[
              { icon: '📍', label: 'DESTINATION', value: searchInfo.location || '—', wide: true },
              { icon: '📅', label: 'CHECK-IN', value: formatDate(searchInfo.checkIn) },
              { icon: '📅', label: 'CHECK-OUT', value: formatDate(searchInfo.checkOut) },
              { icon: '🌙', label: 'NIGHTS', value: String(nights) },
              { icon: '🛏', label: 'ROOMS', value: String(totalRooms) },
              { icon: '👤', label: 'GUESTS', value: String(totalGuests) },
            ].map((item, idx, arr) => (
              <React.Fragment key={idx}>
                <div
                  style={{
                    flex: item.wide ? '2.5' : '1',
                    padding: '0 16px',
                    borderRight: idx < arr.length - 1 ? '1px solid #e2e8f0' : 'none',
                  }}
                >
                  <div
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      color: '#6366f1',
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      marginBottom: '4px',
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: item.wide ? '15px' : '13px',
                      fontWeight: 700,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              </React.Fragment>
            ))}
            <div
              style={{ marginLeft: 'auto', paddingLeft: '16px', textAlign: 'right', flexShrink: 0 }}
            >
              <div
                style={{
                  fontSize: '9px',
                  color: '#94a3b8',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                GENERATED
              </div>
              <div
                style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginTop: '4px' }}
              >
                {generatedAt || new Date().toLocaleString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* ── DISCLAIMER ───────────────────────────────────────────────────── */}
        <div style={{ padding: '0 44px 16px' }}>
          <div
            style={{
              background: '#fffbef',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '14px' }}>⚠️</span>
            <span style={{ fontSize: '11px', color: '#92400e', fontWeight: 600 }}>
              Estimated prices shown below include all room rates, applicable taxes, and markup
              fees. Rates are subject to availability.
            </span>
          </div>
        </div>

        {/* ── TABLE HEADER LABEL ───────────────────────────────────────────── */}
        <div
          style={{
            padding: '8px 44px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#1e1b4b',
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Available Properties &amp; Rates
          </div>
          <div
            style={{
              background: '#312e81',
              color: '#ffffff',
              padding: '5px 14px',
              borderRadius: '30px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {hotels.length} Options
          </div>
        </div>

        {/* ── LIST ────────────────────────────────────────────────── */}
        <div style={{ padding: '0 44px 20px' }}>
          {/* List of Premium Cards */}
          {hotels.map((hotel, idx) => {
            const totalPrice = hotel.price || 0;
            const starStr = hotel.starRating > 0 ? '★'.repeat(hotel.starRating) : '';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '20px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  marginBottom: '16px',
                  alignItems: 'stretch',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Index Badge */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    alignSelf: 'flex-start',
                  }}
                >
                  {idx + 1}
                </div>

                {/* Image */}
                <div
                  style={{
                    width: '160px',
                    height: '160px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#f1f5f9',
                    position: 'relative'
                  }}
                >
                  <img
                    src={hotel.images?.[0] ? formatHotelImageUrl(hotel.images[0]) : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80'}
                    crossOrigin="anonymous"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {hotel.starRating > 0 && (
                     <div style={{
                       position: 'absolute', top: '8px', left: '8px', background: 'rgba(15, 23, 42, 0.85)',
                       color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 800
                     }}>
                       {starStr}
                     </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ paddingRight: '16px', flex: 1 }}>
                      <div
                        style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: '1.2',
                          marginBottom: '6px',
                        }}
                      >
                        {hotel.name || '—'}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          fontWeight: 500,
                          marginBottom: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                         <span style={{ color: '#ef4444', fontSize: '14px' }}>📍</span>
                         {hotel.city || hotel.address || '—'}
                      </div>
                    </div>
                    
                    {/* Price */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: 800,
                          color: '#1e1b4b',
                          letterSpacing: '-0.3px',
                        }}
                      >
                        ₹{Math.round(totalPrice).toLocaleString('en-IN')}
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#6366f1',
                          fontWeight: 600,
                          marginTop: '2px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                        }}
                      >
                        {stayLabel}
                      </div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                        (incl. taxes &amp; fees)
                      </div>
                    </div>
                  </div>

                  {/* Amenities */}
                  {hotel.amenities && hotel.amenities.length > 0 && (
                    <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {hotel.amenities.slice(0, 6).map((amenity, i) => (
                          <div key={i} style={{ fontSize: '10px', background: '#f8fafc', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                            {amenity}
                          </div>
                        ))}
                        {hotel.amenities.length > 6 && (
                          <div style={{ fontSize: '10px', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}>
                            +{hotel.amenities.length - 6} More
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <div
          style={{
            background: '#0f172a',
            padding: '20px 44px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
          }}
        >
          <div
            style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 600, letterSpacing: '0.3px' }}
          >
            © {new Date().getFullYear()} KLAR TRAVEL
          </div>
          <div style={{ color: '#cbd5e1', fontSize: '10px', fontWeight: 700 }}>
            PAGE {pageNo} &nbsp;|&nbsp; {hotels.length} PROPERTIES LISTED
          </div>
        </div>
      </div>
    </div>
  );
});

SearchResultsPdfTemplate.displayName = 'SearchResultsPdfTemplate';
