import { Flight } from '../types/types.returnFlight';

export function mapSegmentResponseToFlight(apiData: any): Flight {
  // Handle both { data: ... } and direct data object response
  const data = apiData.data || apiData;

  console.log('mapSegmentResponseToFlight: extracted data:', data);

  if (!data) throw new Error('Invalid flight data: data is missing');

  const firstSegment = data.segments[0];
  const lastSegment = data.segments[data.segments.length - 1];

  // Format times nicely (you can use date-fns or moment)
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  // Use fareOptions if available (from detailed segment API), otherwise fallback to tripInfo
  const fareOptions = data.fareOptions || data.tripInfo?.totalPriceList || [];
  console.log('mapSegmentResponseToFlight: fareOptions found:', fareOptions?.length);
  const publishedFare = fareOptions[0]?.fd || data.tripInfo?.totalPriceList?.[0]?.fd;
  const adultFare = publishedFare?.ADULT?.fC?.TF || 0;
  const childFare = publishedFare?.CHILD?.fC?.TF || adultFare;

  return {
    id: data.flightId || data.fareOptions?.[0]?.id || `flight-${Date.now()}`,
    searchId: data.searchId || '',
    airline: firstSegment.fD.aI.name,
    airlineCode: firstSegment.fD.aI.code,
    isLcc: firstSegment.fD.aI.isLcc,
    flightNumber: data.flightNumbers?.join(' + ') || firstSegment.fD.fN,
    departure: {
      airport: data.departure.airportCode,
      airportName: data.departure.airportName,
      city: data.departure.city,
      terminal: data.departure.terminal,
      time: data.departure.time, // already formatted in your API response
      date: data.departure.date,
    },
    arrival: {
      airport: data.arrival.airportCode,
      airportName: data.arrival.airportName,
      city: data.arrival.city,
      terminal: data.arrival.terminal,
      time: data.arrival.time,
      date: data.arrival.date,
    },
    duration: formatDuration(data.totalDuration),
    totalDurationMinutes: data.totalDuration,
    stops: data.totalStops,
    stopInfo:
      data.totalStops === 0
        ? 'Non-stop'
        : `${data.totalStops} stop${data.totalStops > 1 ? 's' : ''} via ${data.segments[0].aa.city}`,
    price: adultFare + childFare, // total for the booking (1A+1C)
    pricePerAdult: adultFare,
    pricePerChild: childFare,
    totalPriceList: fareOptions,
    baggage: {
      checkIn: publishedFare?.ADULT?.bI?.iB || 'Not specified',
      cabin: publishedFare?.ADULT?.bI?.cB || 'Not specified',
    },
    class: publishedFare?.ADULT?.cc || 'ECONOMY',
    fareBasis: publishedFare?.ADULT?.fB || '',
    // `refundable` on a Flight is the search normalizer's LABEL ("Refundable" /
    // "Partially Refundable" / …), which the fare-variant strip renders. This
    // mapper used to put a boolean in the same slot; nothing read it.
    isRefundable: publishedFare?.ADULT?.rT !== 0, // rT=0 usually means non-refundable
    segments: data.segments.map((seg: any, idx: number) => ({
      flightNumber: seg.fD.fN,
      airline: seg.fD.aI.name,
      departureAirport: seg.da.code,
      departureTime: formatTime(seg.dt),
      arrivalAirport: seg.aa.code,
      arrivalTime: formatTime(seg.at),
      durationMinutes: seg.duration,
      layoverMinutes: idx < data.segments.length - 1 ? data.segments[idx + 1]?.cT : undefined,
      aircraft: seg.fD.eT,
    })),
  };
}
