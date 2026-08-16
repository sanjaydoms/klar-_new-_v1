export const extractFlightDetailsFromOnewayReview = (
  data: any,
  tripIndex?: number,
  segmentIndex?: number,
) => {
  try {
    // If no tripIndex/segmentIndex provided, extract from first available
    if (tripIndex === undefined || segmentIndex === undefined) {
      // Try to get from first trip and first segment
      const firstTrip =
        data?.TripInformation?.[0] ||
        data?.mappedData?.TripInformation?.[0] ||
        data?.data?.TripInformation?.[0] ||
        data?.tripInfos?.[0] ||
        null;

      if (firstTrip) {
        const firstSegment =
          firstTrip?.SegmentInformation?.[0] ||
          firstTrip?.segments?.[0] ||
          firstTrip?.sI?.[0] ||
          null;
        if (firstSegment) {
          return extractSegmentData(firstSegment, data, firstTrip);
        }
      }

      // Try to get from fares
      const fares = data?.data?.fares || data?.fares || [];
      if (fares.length > 0) {
        return extractFareData(fares[0], data);
      }

      // Try to get from search query
      const routeInfos =
        data?.searchQuery?.routeInfos ||
        data?.mappedData?.searchQuery?.routeInfos ||
        data?.data?.searchQuery?.routeInfos ||
        [];
      if (routeInfos.length > 0) {
        return extractRouteData(routeInfos[0], data);
      }

      return null;
    }

    // Original logic with tripIndex and segmentIndex provided
    // 🔥 FIX: Get trip info from multiple possible locations
    const tripInfo =
      data?.TripInformation?.[tripIndex] ||
      data?.mappedData?.TripInformation?.[tripIndex] ||
      data?.data?.TripInformation?.[tripIndex] ||
      data?.tripInfos?.[tripIndex] ||
      data?.tripInfo?.[tripIndex] ||
      null;

    if (!tripInfo) {
      // 🔥 FIX: Try to get from fares if tripInfo is not available
      const fares = data?.data?.fares || data?.fares || [];
      if (fares.length > 0) {
        const fare = fares[tripIndex] || fares[0];
        if (fare) {
          return extractFareData(fare, data);
        }
      }
      return null;
    }

    // Get segment info from multiple possible locations
    const segmentInfo =
      tripInfo?.SegmentInformation?.[segmentIndex] ||
      tripInfo?.segments?.[segmentIndex] ||
      tripInfo?.sI?.[segmentIndex] ||
      tripInfo?.segmentInfo?.[segmentIndex] ||
      null;

    if (!segmentInfo) {
      // 🔥 FIX: Try to get from fares within trip
      const fares = tripInfo?.fares || tripInfo?.FareDetails || [];
      if (fares.length > 0) {
        const fare = fares[segmentIndex] || fares[0];
        if (fare) {
          return extractFareData(fare, data, tripIndex, segmentIndex);
        }
      }
      return null;
    }

    return extractSegmentData(segmentInfo, data, tripInfo);
  } catch (error) {
    console.error('Error extracting flight details from onewayReviewData:', error);
    return null;
  }
};

// 🔥 Helper function to extract segment data
const extractSegmentData = (segmentInfo: any, data: any, tripInfo?: any) => {
  try {
    // Extract departure and arrival airports
    const departureAirport =
      segmentInfo?.DepartureAirport ||
      segmentInfo?.da ||
      segmentInfo?.departureAirport ||
      segmentInfo?.origin ||
      {};

    const arrivalAirport =
      segmentInfo?.ArrivalAirport ||
      segmentInfo?.aa ||
      segmentInfo?.arrivalAirport ||
      segmentInfo?.destination ||
      {};

    // Extract flight details
    const flightDetailsData =
      segmentInfo?.FlightDetails ||
      segmentInfo?.fD ||
      segmentInfo?.flightDesignator ||
      segmentInfo?.flightDetails ||
      {};

    const airlineInfo =
      flightDetailsData?.AirlineInfo || flightDetailsData?.al || flightDetailsData?.airline || {};

    // Extract timings
    const departureTime =
      segmentInfo?.DepartureTime || segmentInfo?.dt || segmentInfo?.departureTime || '';

    const arrivalTime =
      segmentInfo?.ArrivalTime || segmentInfo?.at || segmentInfo?.arrivalTime || '';

    const duration = segmentInfo?.Duration || segmentInfo?.duration || 0;

    // Get pax info
    const paxInfo =
      data?.searchQuery?.paxInfo ||
      data?.mappedData?.searchQuery?.paxInfo ||
      data?.data?.searchQuery?.paxInfo ||
      data?.paxInfo ||
      {};

    // Get SSR info
    const ssrInfo = segmentInfo?.ssrInfo || segmentInfo?.SSRInfo || {};

    // Get fare details
    const totalPriceList =
      segmentInfo?.totalPriceList ||
      segmentInfo?.TotalPriceList ||
      tripInfo?.TotalPriceList ||
      tripInfo?.totalPriceList ||
      [];

    const fareDetails =
      totalPriceList?.[0]?.FareDetails?.AdultFare ||
      totalPriceList?.[0]?.FareDetails?.ADULT ||
      totalPriceList?.[0]?.fd?.ADULT ||
      totalPriceList?.[0]?.passengerBreakup?.AdultFare ||
      {};

    const baggage = fareDetails?.BaggageInfo || fareDetails?.bI || {};

    // Calculate total passengers
    const adultCount = paxInfo?.AdultFare || paxInfo?.ADULT || 1;
    const childCount = paxInfo?.ChildFare || paxInfo?.CHILD || 0;
    const infantCount = paxInfo?.INFANT || paxInfo?.infant || 0;
    const totalPassengers = adultCount + childCount + infantCount;

    // Format duration
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    const formattedDuration = `${hours}h ${minutes}m`;

    // Format date and time
    const formatDateTime = (dateTimeStr: string) => {
      if (!dateTimeStr) return { date: '', time: '' };
      try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) {
          const parts = dateTimeStr.split('T');
          if (parts.length === 2) {
            return {
              date: parts[0] || '',
              time: parts[1]?.substring(0, 5) || '',
            };
          }
          return { date: dateTimeStr, time: '' };
        }
        return {
          date: date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          time: date.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        };
      } catch (error) {
        return { date: dateTimeStr, time: '' };
      }
    };

    const formatDateFull = (dateTimeStr: string) => {
      if (!dateTimeStr) return '';
      try {
        const date = new Date(dateTimeStr);
        if (isNaN(date.getTime())) {
          const parts = dateTimeStr.split('T');
          return parts[0] || dateTimeStr;
        }
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      } catch (error) {
        return dateTimeStr;
      }
    };

    const departure = formatDateTime(departureTime);
    const arrival = formatDateTime(arrivalTime);

    // Get refundable type
    const refundableType = fareDetails?.RefundableType || fareDetails?.rT || 0;

    // Format baggage
    let checkInBaggage = baggage?.CheckInBaggage || baggage?.iB || baggage?.checkIn || '';

    if (checkInBaggage) {
      checkInBaggage = checkInBaggage.replace('Kilograms', 'Kg').trim();
    }

    const cabinBaggage = baggage?.CabinBaggage || baggage?.cB || baggage?.cabin || '';

    // Get segment stops
    const stops = segmentInfo?.NumberOfStops || segmentInfo?.stops || 0;

    // Get stopover info
    const stopOverInfo = segmentInfo?.StopOverInfo || segmentInfo?.so || [];

    // Get connecting time if any
    const connectingTime = segmentInfo?.cT || segmentInfo?.connectingTime || 0;

    return {
      // Basic flight info
      origin:
        departureAirport?.city || departureAirport?.cityCode || departureAirport?.code || 'N/A',
      destination:
        arrivalAirport?.city || arrivalAirport?.cityCode || arrivalAirport?.code || 'N/A',
      originAirport:
        departureAirport?.AirlineName ||
        departureAirport?.name ||
        departureAirport?.airportName ||
        'N/A',
      destinationAirport:
        arrivalAirport?.AirlineName || arrivalAirport?.name || arrivalAirport?.airportName || 'N/A',

      // Timing info
      departureDate: departure.date || '',
      departureTime: departure.time || '',
      arrivalDate: formatDateFull(arrivalTime),
      arrivalTime: arrival.time || '',
      duration: formattedDuration,

      // Flight details
      stops: stops,
      airline: airlineInfo?.AirlineName || airlineInfo?.name || airlineInfo?.airlineName || 'N/A',
      flightNumber:
        flightDetailsData?.FlightNumber ||
        flightDetailsData?.fN ||
        flightDetailsData?.flightNumber ||
        'N/A',

      // Refund info
      refundableType: refundableType,

      // Baggage info
      baggage: {
        checkIn: checkInBaggage || 'N/A',
        cabin: cabinBaggage || 'N/A',
      },

      // Passenger counts
      passengerCount: totalPassengers || 1,
      adultCount: adultCount || 1,
      childCount: childCount || 0,
      infantCount: infantCount || 0,

      // SSR options
      baggageOptions: ssrInfo.BAGGAGE || ssrInfo.baggage || [],
      mealOptions: ssrInfo.MEAL || ssrInfo.meal || [],

      // Additional info
      segmentId: segmentInfo?.id || segmentInfo?.segmentId || null,
      connectingTime: connectingTime,
      stopOverInfo: stopOverInfo,

      // Price details
      priceDetails: fareDetails || {},

      // Segment and trip info
      segmentNumber: 1,
      totalSegments: 1,
    };
  } catch (error) {
    console.error('Error extracting segment data:', error);
    return null;
  }
};

// 🔥 Helper function to extract fare data when segment info is not available
const extractFareData = (fare: any, data: any, tripIndex?: number, segmentIndex?: number) => {
  try {
    const fareDetails =
      fare?.FareDetails?.AdultFare ||
      fare?.FareDetails?.ADULT ||
      fare?.passengerBreakup?.AdultFare ||
      fare?.fd?.ADULT ||
      {};

    const baggage = fareDetails?.BaggageInfo || fareDetails?.bI || {};

    // Get route info from search query
    const routeInfos =
      data?.searchQuery?.routeInfos ||
      data?.mappedData?.searchQuery?.routeInfos ||
      data?.data?.searchQuery?.routeInfos ||
      [];

    const route = routeInfos[tripIndex || 0] || routeInfos[0] || {};

    // Get pax info
    const paxInfo =
      data?.searchQuery?.paxInfo ||
      data?.mappedData?.searchQuery?.paxInfo ||
      data?.data?.searchQuery?.paxInfo ||
      {};

    const adultCount = paxInfo?.AdultFare || paxInfo?.ADULT || 1;
    const childCount = paxInfo?.ChildFare || paxInfo?.CHILD || 0;
    const infantCount = paxInfo?.INFANT || paxInfo?.infant || 0;
    const totalPassengers = adultCount + childCount + infantCount;

    return {
      origin: route?.fromCityOrAirport?.city || route?.fromCityOrAirport?.code || 'N/A',
      destination: route?.toCityOrAirport?.city || route?.toCityOrAirport?.code || 'N/A',
      originAirport: route?.fromCityOrAirport?.code || 'N/A',
      destinationAirport: route?.toCityOrAirport?.code || 'N/A',
      departureDate: route?.travelDate || 'N/A',
      departureTime: 'N/A',
      arrivalDate: 'N/A',
      arrivalTime: 'N/A',
      duration: 'N/A',
      stops: 0,
      airline: fare?.airline || fare?.airlineName || 'N/A',
      flightNumber: fare?.flightNumber || 'N/A',
      refundableType: fareDetails?.RefundableType || fareDetails?.rT || 0,
      baggage: {
        checkIn: baggage?.CheckInBaggage || baggage?.iB || 'N/A',
        cabin: baggage?.CabinBaggage || baggage?.cB || 'N/A',
      },
      passengerCount: totalPassengers || 1,
      adultCount: adultCount || 1,
      childCount: childCount || 0,
      infantCount: infantCount || 0,
      baggageOptions: [],
      mealOptions: [],
      segmentId: fare?.segmentId || fare?.SegmentID || null,
      connectingTime: 0,
      stopOverInfo: [],
      priceDetails: fareDetails || {},
      segmentNumber: (segmentIndex || 0) + 1,
      totalSegments: 1,
    };
  } catch (error) {
    console.error('Error extracting fare data:', error);
    return null;
  }
};

// 🔥 Helper function to extract route data from search query
const extractRouteData = (route: any, data: any) => {
  try {
    const paxInfo =
      data?.searchQuery?.paxInfo ||
      data?.mappedData?.searchQuery?.paxInfo ||
      data?.data?.searchQuery?.paxInfo ||
      {};

    const adultCount = paxInfo?.AdultFare || paxInfo?.ADULT || 1;
    const childCount = paxInfo?.ChildFare || paxInfo?.CHILD || 0;
    const infantCount = paxInfo?.INFANT || paxInfo?.infant || 0;
    const totalPassengers = adultCount + childCount + infantCount;

    return {
      origin: route?.fromCityOrAirport?.city || route?.fromCityOrAirport?.code || 'N/A',
      destination: route?.toCityOrAirport?.city || route?.toCityOrAirport?.code || 'N/A',
      originAirport: route?.fromCityOrAirport?.code || 'N/A',
      destinationAirport: route?.toCityOrAirport?.code || 'N/A',
      departureDate: route?.travelDate || 'N/A',
      departureTime: 'N/A',
      arrivalDate: 'N/A',
      arrivalTime: 'N/A',
      duration: 'N/A',
      stops: 0,
      airline: 'N/A',
      flightNumber: 'N/A',
      refundableType: 0,
      baggage: {
        checkIn: 'N/A',
        cabin: 'N/A',
      },
      passengerCount: totalPassengers || 1,
      adultCount: adultCount || 1,
      childCount: childCount || 0,
      infantCount: infantCount || 0,
      baggageOptions: [],
      mealOptions: [],
      segmentId: null,
      connectingTime: 0,
      stopOverInfo: [],
      priceDetails: {},
      segmentNumber: 1,
      totalSegments: 1,
    };
  } catch (error) {
    console.error('Error extracting route data:', error);
    return null;
  }
};
