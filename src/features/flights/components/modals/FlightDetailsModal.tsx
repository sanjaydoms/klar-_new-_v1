import { useState } from 'react';
import {
  X,
  Clock,
  Plane,
  MapPin,
  Luggage,
  User,
  CreditCard,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FlightDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightDetails: any;
  flightType?: 'departure' | 'return';
}

export default function FlightDetailsModal({
  isOpen,
  onClose,
  flightDetails,
  flightType = 'departure',
}: FlightDetailsModalProps) {
  const [expandedSegments, setExpandedSegments] = useState<number[]>([]);

  if (!isOpen || !flightDetails) return null;

  console.log('Flight Details we are getting', flightDetails);

  const { data } = flightDetails;
  if (!data) return null;

  const {
    departure,
    arrival,
    airlines,
    segments,
    totalDuration,
    totalStops,
    fareOptions,
    tripInfo,
    flightNumbers,
  } = data;

  const toggleSegment = (index: number) => {
    setExpandedSegments((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const getFareDisplayName = (fareIdentifier: string) => {
    const fareMap: Record<string, string> = {
      UPFRONT: 'Upfront Fare',
      PUBLISHED: 'Published Fare',
      SME: 'SME Fare',
      FLEXI_PLUS: 'Flexi Plus',
    };
    return fareMap[fareIdentifier] || fareIdentifier;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    if (timeString.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) return timeString;
    return timeString;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return `${day?.padStart(2, '0')}/${month?.padStart(2, '0')}/${year}`;
    }
    return dateString;
  };

  const extractFareDetails = (fare: any) => {
    if (!fare)
      return {
        baseFare: 0,
        taxesAndFees: 0,
        totalFare: 0,
        baggage: null,
        cabinClass: '',
        fareBasis: 'N/A',
        isRefundable: false,
        bookingClass: 'N/A',
      };
    if (fare.fd?.ADULT?.fC) {
      const fC = fare.fd.ADULT.fC;
      return {
        baseFare: fC.BF || 0,
        taxesAndFees: fC.TAF || 0,
        totalFare: fC.TF || fC.BF + fC.TAF || 0,
        baggage: fare.fd.ADULT.bI || null,
        cabinClass: fare.fd.ADULT.cc || '',
        fareBasis: fare.fd.ADULT.fB || 'N/A',
        isRefundable: fare.fd.ADULT.rT === 1,
        bookingClass: fare.fd.ADULT.cB || 'N/A',
      };
    }
    if (fare.fd?.ADULT) {
      return {
        baseFare: fare.fd.ADULT.baseFare || 0,
        taxesAndFees: fare.fd.ADULT.taxesAndFees || 0,
        totalFare: fare.fd.ADULT.totalFare || 0,
        baggage: fare.fd.ADULT.baggage || fare.fd.ADULT.bI || null,
        cabinClass: fare.fd.ADULT.cabinClass || fare.fd.ADULT.cc || '',
        fareBasis: fare.fd.ADULT.fareBasis || fare.fd.ADULT.fB || 'N/A',
        isRefundable: fare.fd.ADULT.isRefundable || fare.fd.ADULT.rT === 1,
        bookingClass: fare.fd.ADULT.bookingClass || fare.fd.ADULT.cB || 'N/A',
      };
    }
    return {
      baseFare: 0,
      taxesAndFees: 0,
      totalFare: 0,
      baggage: null,
      cabinClass: '',
      fareBasis: 'N/A',
      isRefundable: false,
      bookingClass: 'N/A',
    };
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const accentColor = flightType === 'departure' ? '#3b82f6' : '#16a34a';
  const accentBg = flightType === 'departure' ? '#eff6ff' : '#f0fdf4';
  const accentBorder = flightType === 'departure' ? '#bfdbfe' : '#bbf7d0';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '16px',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div
        style={{
          background: '#fff',
          borderRadius: 18,
          width: '100%',
          maxWidth: 780,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 24px 64px rgba(0,0,0,0.16)',
        }}
      >
        {/* ── Sticky header ─────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: '1.5px solid #f3f4f6',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: accentBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plane
                size={16}
                color={accentColor}
                style={{ transform: flightType === 'return' ? 'rotate(180deg)' : 'none' }}
              />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827' }}>
                {flightType === 'departure' ? 'Departure' : 'Return'} Flight Details
              </div>
              {departure && arrival && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                  {departure.airportCode} → {arrival.airportCode} · {formatDate(departure.date)}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} color="#374151" />
          </button>
        </div>

        {/* ── Scrollable body ───────────────────────────────────────── */}
        <div
          style={{
            overflowY: 'auto',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {/* Route summary card */}
          {departure && arrival && (
            <div
              style={{
                background: accentBg,
                border: `1.5px solid ${accentBorder}`,
                borderRadius: 14,
                padding: '20px 24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                {/* Departure */}
                <div style={{ textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {formatTime(departure.time)}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginTop: 4 }}>
                    {departure.airportCode}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {departure.city || ''}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>
                    {formatDate(departure.date)}
                  </div>
                  {departure.terminal && (
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: accentColor,
                        marginTop: 4,
                        background: '#fff',
                        borderRadius: 20,
                        padding: '2px 8px',
                        display: 'inline-block',
                      }}
                    >
                      T-{departure.terminal}
                    </div>
                  )}
                </div>

                {/* Middle */}
                <div style={{ flex: 1, textAlign: 'center', padding: '0 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      justifyContent: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Clock size={13} color="#9ca3af" />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                      {formatDuration(totalDuration)}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: 2, background: '#d1d5db' }}>
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: totalStops === 0 ? '#22c55e' : '#f59e0b',
                        border: '2px solid #fff',
                        boxShadow: `0 0 0 1.5px ${totalStops === 0 ? '#22c55e' : '#f59e0b'}`,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: totalStops === 0 ? '#22c55e' : '#f59e0b',
                      marginTop: 6,
                    }}
                  >
                    {totalStops === 0
                      ? 'Non-stop'
                      : `${totalStops} Stop${totalStops > 1 ? 's' : ''}`}
                  </div>
                  {flightNumbers && flightNumbers.length > 0 && (
                    <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 4 }}>
                      {flightNumbers.join(' · ')}
                    </div>
                  )}
                </div>

                {/* Arrival */}
                <div style={{ textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                    {formatTime(arrival.time)}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginTop: 4 }}>
                    {arrival.airportCode}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    {arrival.city || ''}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 2 }}>
                    {formatDate(arrival.date)}
                  </div>
                  {arrival.terminal && (
                    <div
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: '#16a34a',
                        marginTop: 4,
                        background: '#fff',
                        borderRadius: 20,
                        padding: '2px 8px',
                        display: 'inline-block',
                      }}
                    >
                      T-{arrival.terminal}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Airline info */}
          {airlines && airlines.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 10,
                }}
              >
                <Plane size={15} color={accentColor} /> Airline Information
              </div>
              <div
                style={{
                  background: '#f9fafb',
                  border: '1.5px solid #f3f4f6',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {airlines.map((airline: any, index: number) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: accentBg,
                        border: `1.5px solid ${accentBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontWeight: 800, color: accentColor, fontSize: 14 }}>
                        {airline.code}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>
                        {airline.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 1 }}>
                        Code: {airline.code}
                      </div>
                      {airline.isLcc && (
                        <span
                          style={{
                            fontSize: 10.5,
                            background: '#fff7ed',
                            color: '#c2410c',
                            border: '1px solid #fdba74',
                            borderRadius: 20,
                            padding: '1px 8px',
                            marginTop: 4,
                            display: 'inline-block',
                          }}
                        >
                          Low Cost Carrier
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments */}
          {segments && segments.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 10,
                }}
              >
                <MapPin size={15} color={accentColor} />
                Flight Segments {segments.length > 1 && `(${segments.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {segments.map((segment: any, index: number) => {
                  const isExpanded = expandedSegments.includes(index);
                  const departureCode = segment.da?.code || segment.departure?.airportCode;
                  const arrivalCode = segment.aa?.code || segment.arrival?.airportCode;
                  const departureTime = segment.dt || segment.departure?.time;
                  const arrivalTime = segment.at || segment.arrival?.time;

                  return (
                    <div
                      key={segment.id || index}
                      style={{
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => segments.length > 1 && toggleSegment(index)}
                        style={{
                          background: '#f9fafb',
                          padding: '10px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: segments.length > 1 ? 'pointer' : 'default',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              background: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: 20,
                              padding: '2px 10px',
                              color: '#374151',
                            }}
                          >
                            Segment {index + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                            {departureCode} → {arrivalCode}
                          </span>
                          <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
                            {formatDuration(segment.duration || 0)}
                          </span>
                        </div>
                        {segments.length > 1 && (
                          <button
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp size={16} color="#6b7280" />
                            ) : (
                              <ChevronDown size={16} color="#6b7280" />
                            )}
                          </button>
                        )}
                      </div>

                      {(isExpanded || segments.length === 1) && (
                        <div style={{ padding: '14px 16px' }}>
                          <div
                            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}
                          >
                            <div>
                              <div style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 4 }}>
                                Departure
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                                {departureCode}
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                {segment.da?.city || segment.departure?.city || ''}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#374151',
                                  fontWeight: 600,
                                  marginTop: 4,
                                }}
                              >
                                {formatTime(departureTime)}
                              </div>
                              <div style={{ fontSize: 10.5, color: '#9ca3af' }}>
                                {formatDate(departureTime)}
                              </div>
                              {segment.da?.terminal && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: accentColor,
                                    marginTop: 4,
                                  }}
                                >
                                  Terminal {segment.da.terminal}
                                </div>
                              )}
                            </div>

                            <div style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 4 }}>
                                Duration
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                                {formatDuration(segment.duration || 0)}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: segment.stops === 0 ? '#22c55e' : '#f59e0b',
                                  fontWeight: 600,
                                  marginTop: 4,
                                }}
                              >
                                {segment.stops === 0
                                  ? 'Direct'
                                  : `${segment.stops} stop${segment.stops > 1 ? 's' : ''}`}
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 4 }}>
                                Arrival
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                                {arrivalCode}
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                {segment.aa?.city || segment.arrival?.city || ''}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#374151',
                                  fontWeight: 600,
                                  marginTop: 4,
                                }}
                              >
                                {formatTime(arrivalTime)}
                              </div>
                              <div style={{ fontSize: 10.5, color: '#9ca3af' }}>
                                {formatDate(arrivalTime)}
                              </div>
                              {segment.aa?.terminal && (
                                <div
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 600,
                                    color: '#16a34a',
                                    marginTop: 4,
                                  }}
                                >
                                  Terminal {segment.aa.terminal}
                                </div>
                              )}
                            </div>
                          </div>

                          {segment.fD && (
                            <div
                              style={{
                                marginTop: 12,
                                paddingTop: 10,
                                borderTop: '1px solid #f3f4f6',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 6,
                                fontSize: 11.5,
                                color: '#6b7280',
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 600, color: '#374151' }}>Aircraft:</span>{' '}
                                {segment.fD.eT || 'N/A'}
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, color: '#374151' }}>
                                  Flight No:
                                </span>{' '}
                                {segment.fN || segment.fD.fN || 'N/A'}
                              </div>
                              {segment.fD.aI && (
                                <>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#374151' }}>
                                      Operated by:
                                    </span>{' '}
                                    {segment.fD.aI.name}
                                  </div>
                                  <div>
                                    <span style={{ fontWeight: 600, color: '#374151' }}>Code:</span>{' '}
                                    {segment.fD.aI.code}
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fare options */}
          {fareOptions && fareOptions.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 10,
                }}
              >
                <CreditCard size={15} color={accentColor} /> Available Fare Options
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  overflowX: 'auto',
                  paddingBottom: 8,
                  scrollbarWidth: 'thin',
                }}
              >
                {fareOptions.map((fare: any, index: number) => {
                  const fareDetails = extractFareDetails(fare);
                  return (
                    <div
                      key={fare.id || index}
                      style={{
                        flex: '0 0 230px',
                        minWidth: 230,
                        border: '1.5px solid #e5e7eb',
                        borderRadius: 12,
                        padding: '14px',
                        background: '#fff',
                        transition: 'box-shadow 0.15s',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: accentColor }}>
                          {getFareDisplayName(fare.fareIdentifier)}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            background: accentBg,
                            color: accentColor,
                            border: `1px solid ${accentBorder}`,
                            borderRadius: 20,
                            padding: '2px 8px',
                          }}
                        >
                          {fareDetails.cabinClass}
                        </span>
                      </div>

                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#111827',
                          letterSpacing: '-0.5px',
                          marginBottom: 2,
                        }}
                      >
                        ₹{fareDetails.totalFare?.toLocaleString('en-IN') || 'N/A'}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 12 }}>
                        Base ₹{fareDetails.baseFare?.toLocaleString('en-IN')} + Tax ₹
                        {fareDetails.taxesAndFees?.toLocaleString('en-IN')}
                      </div>

                      {fareDetails.baggage && (
                        <div
                          style={{
                            borderTop: '1px solid #f3f4f6',
                            paddingTop: 10,
                            marginBottom: 10,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: '#111827',
                              textTransform: 'uppercase',
                              letterSpacing: 0.4,
                              marginBottom: 6,
                            }}
                          >
                            Baggage
                          </div>
                          {fareDetails.baggage.cB && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#374151',
                                marginBottom: 4,
                              }}
                            >
                              <Luggage size={12} color="#9ca3af" /> {fareDetails.baggage.cB} cabin
                            </div>
                          )}
                          {fareDetails.baggage.iB && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 12,
                                color: '#374151',
                              }}
                            >
                              <Luggage size={12} color="#9ca3af" /> {fareDetails.baggage.iB}{' '}
                              check-in
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            background: fareDetails.isRefundable ? '#f0fdf4' : '#fef2f2',
                            color: fareDetails.isRefundable ? '#15803d' : '#dc2626',
                            border: `1px solid ${fareDetails.isRefundable ? '#86efac' : '#fca5a5'}`,
                            borderRadius: 20,
                            padding: '2px 8px',
                          }}
                        >
                          {fareDetails.isRefundable ? 'Refundable' : 'Non-refundable'}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            background: '#f3f4f6',
                            color: '#374151',
                            borderRadius: 20,
                            padding: '2px 8px',
                          }}
                        >
                          Class {fareDetails.bookingClass}
                        </span>
                      </div>

                      <div style={{ fontSize: 10, color: '#c4c9d4', marginTop: 8 }}>
                        Fare Basis: {fareDetails.fareBasis}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price summary */}
          {tripInfo?.totalPriceList && tripInfo.totalPriceList.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: 10,
                }}
              >
                <User size={15} color={accentColor} /> Price Summary
              </div>
              <div
                style={{
                  background: '#f9fafb',
                  border: '1.5px solid #f3f4f6',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {tripInfo.totalPriceList.map((price: any, index: number) => {
                  const fareDetails = extractFareDetails(price);
                  const isLast = index === tripInfo.totalPriceList.length - 1;
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '12px 16px',
                        borderBottom: isLast ? 'none' : '1px solid #f3f4f6',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                          {getFareDisplayName(price.fareIdentifier)}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                          ₹{fareDetails.totalFare?.toLocaleString('en-IN') || 'N/A'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 11.5,
                          color: '#9ca3af',
                        }}
                      >
                        <span>Base ₹{fareDetails.baseFare?.toLocaleString('en-IN')}</span>
                        <span>Tax ₹{fareDetails.taxesAndFees?.toLocaleString('en-IN')}</span>
                        {fareDetails.cabinClass && <span>{fareDetails.cabinClass}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info note */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: accentBg,
              border: `1px solid ${accentBorder}`,
              borderRadius: 12,
              padding: '12px 16px',
            }}
          >
            <Shield size={16} color={accentColor} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827', marginBottom: 3 }}>
                Important Information
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                All fares include taxes and fees. Baggage allowances may vary by fare type. Please
                check the fare rules before booking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
