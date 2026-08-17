import { useState } from 'react';
import { refundableLabelFromType } from '@/features/flights/utils/flightDisplay';
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
  Calendar,
  ArrowRight,
  Info,
  Briefcase,
  Package,
} from 'lucide-react';

interface MultiFlightDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightDetails: any;
}

export default function MultiFlightDetailsModal({
  isOpen,
  onClose,
  flightDetails,
}: MultiFlightDetailsModalProps) {
  const [expandedSegments, setExpandedSegments] = useState<number[]>([]);
  const [selectedFareIndex, setSelectedFareIndex] = useState<number>(0);

  if (!isOpen || !flightDetails) return null;

  // Extract data from the response structure
  const { data } = flightDetails;

  // Check if data exists
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
    flightId,
  } = data;

  /**
   * Toggle segment expansion
   */
  const toggleSegment = (index: number) => {
    setExpandedSegments((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  /**
   * Get fare option display name
   */
  const getFareDisplayName = (fareIdentifier: string) => {
    const fareMap: Record<string, string> = {
      UPFRONT: 'Upfront Fare',
      PUBLISHED: 'Published Fare',
      SME: 'SME Fare',
      FLEXI_PLUS: 'Flexi Plus',
      REGULAR: 'Regular Fare',
      PREMIUM: 'Premium Fare',
    };
    return fareMap[fareIdentifier] || fareIdentifier;
  };

  /**
   * Format time from various formats
   */
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';

    // Handle ISO format (2026-02-27T12:45)
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }

    // Handle "12:45 pm" format
    if (timeString.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
      return timeString;
    }

    return timeString;
  };

  /**
   * Format date from various formats
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    // Handle ISO format
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    // Handle "27/2/2026" format – safe split with fallbacks
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      const day = parts[0] ?? '1';
      const month = parts[1] ?? '1';
      const year = parts[2] ?? '2000';
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }

    return dateString;
  };

  /**
   * Extract fare details from the complex fare structure
   */
  const extractFareDetails = (fare: any) => {
    if (!fare)
      return {
        baseFare: 0,
        taxesAndFees: 0,
        totalFare: 0,
        baggage: null,
        cabinClass: '',
        fareBasis: 'N/A',
        refundable: '',
        bookingClass: 'N/A',
        penalties: null,
      };

    // Try to get from fd.ADULT.fC structure
    if (fare.fd?.ADULT?.fC) {
      const fC = fare.fd.ADULT.fC;
      return {
        baseFare: fC.BF || 0,
        taxesAndFees: fC.TAF || 0,
        totalFare: fC.TF || fC.BF + fC.TAF || 0,
        baggage: fare.fd.ADULT.bI || null,
        cabinClass: fare.fd.ADULT.cc || '',
        fareBasis: fare.fd.ADULT.fB || 'N/A',
        // rT 2 is PARTIALLY refundable; `=== 1` reported that as non-refundable,
        // as it did a fare that states no type at all.
        refundable: refundableLabelFromType(fare.fd.ADULT.rT),
        bookingClass: fare.fd.ADULT.cB || 'N/A',
        penalties: fare.fd.ADULT.penalties || null,
      };
    }

    // Try alternative structures
    if (fare.fd?.ADULT) {
      return {
        baseFare: fare.fd.ADULT.baseFare || 0,
        taxesAndFees: fare.fd.ADULT.taxesAndFees || 0,
        totalFare: fare.fd.ADULT.totalFare || 0,
        baggage: fare.fd.ADULT.baggage || fare.fd.ADULT.bI || null,
        cabinClass: fare.fd.ADULT.cabinClass || fare.fd.ADULT.cc || '',
        fareBasis: fare.fd.ADULT.fareBasis || fare.fd.ADULT.fB || 'N/A',
        refundable: refundableLabelFromType(fare.fd.ADULT.rT),
        bookingClass: fare.fd.ADULT.bookingClass || fare.fd.ADULT.cB || 'N/A',
        penalties: fare.fd.ADULT.penalties || null,
      };
    }

    return {
      baseFare: 0,
      taxesAndFees: 0,
      totalFare: 0,
      baggage: null,
      cabinClass: '',
      fareBasis: 'N/A',
      refundable: '',
      bookingClass: 'N/A',
      penalties: null,
    };
  };

  /**
   * Format duration from minutes to hours and minutes
   */
  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-xl">
          <div className="flex items-center gap-3">
            <Plane className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Flight Details</h2>
            {flightId && (
              <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-500">
                #{flightId}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Route Summary Card */}
          {departure && arrival && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                {/* Departure */}
                <div className="text-center flex-1">
                  <p className="text-4xl font-bold">{formatTime(departure.time)}</p>
                  <p className="text-2xl font-semibold mt-1">{departure.airportCode}</p>
                  <p className="text-sm opacity-90 mt-1">{departure.city || ''}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Calendar className="w-4 h-4 opacity-75" />
                    <p className="text-xs opacity-90">{formatDate(departure.date)}</p>
                  </div>
                  {departure.terminal && (
                    <p className="text-xs bg-white/20 inline-block px-2 py-1 rounded-full mt-2">
                      Terminal {departure.terminal}
                    </p>
                  )}
                </div>

                {/* Flight Path */}
                <div className="flex-1 px-6">
                  <div className="relative">
                    <div className="w-full h-0.5 bg-white/30"></div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-white/20 rounded-full px-3 py-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{formatDuration(totalDuration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Plane className="w-4 h-4 opacity-75" />
                    <span className="text-sm font-medium">
                      {totalStops === 0
                        ? 'Non-stop'
                        : `${totalStops} Stop${totalStops > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  {flightNumbers && flightNumbers.length > 0 && (
                    <p className="text-xs text-center opacity-75 mt-1">
                      Flight: {flightNumbers.join(', ')}
                    </p>
                  )}
                </div>

                {/* Arrival */}
                <div className="text-center flex-1">
                  <p className="text-4xl font-bold">{formatTime(arrival.time)}</p>
                  <p className="text-2xl font-semibold mt-1">{arrival.airportCode}</p>
                  <p className="text-sm opacity-90 mt-1">{arrival.city || ''}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Calendar className="w-4 h-4 opacity-75" />
                    <p className="text-xs opacity-90">{formatDate(arrival.date)}</p>
                  </div>
                  {arrival.terminal && (
                    <p className="text-xs bg-white/20 inline-block px-2 py-1 rounded-full mt-2">
                      Terminal {arrival.terminal}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Airline Information */}
          {airlines && airlines.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Plane className="w-5 h-5 text-blue-600" />
                Operating Airlines
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {airlines.map((airline: any, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600 text-lg">{airline.code}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{airline.name}</p>
                      <p className="text-sm text-gray-500">Code: {airline.code}</p>
                      {airline.isLcc && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Low Cost Carrier
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Flight Segments */}
          {segments && segments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Journey Segments {segments.length > 1 && `(${segments.length} segments)`}
              </h3>
              <div className="space-y-3">
                {segments.map((segment: any, index: number) => {
                  const isExpanded = expandedSegments.includes(index);
                  const departureCode = segment.da?.code || segment.departure?.airportCode;
                  const arrivalCode = segment.aa?.code || segment.arrival?.airportCode;
                  const departureTime = segment.dt || segment.departure?.time;
                  const arrivalTime = segment.at || segment.arrival?.time;
                  const departureCity = segment.da?.city || segment.departure?.city || '';
                  const arrivalCity = segment.aa?.city || segment.arrival?.city || '';

                  return (
                    <div
                      key={segment.id || index}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Segment Header */}
                      <div
                        className={`bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors`}
                        onClick={() => toggleSegment(index)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-full shadow-sm">
                            Segment {index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {departureCode} <ArrowRight className="w-3 h-3 inline mx-1" />{' '}
                            {arrivalCode}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDuration(segment.duration || 0)}
                          </span>
                        </div>
                        <button className="text-gray-500">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Segment Details */}
                      {isExpanded && (
                        <div className="p-4">
                          {/* Route */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Departure</p>
                              <p className="font-semibold text-gray-900 text-lg">{departureCode}</p>
                              <p className="text-sm text-gray-600">{departureCity}</p>
                              <p className="text-sm font-medium text-gray-800 mt-2">
                                {formatTime(departureTime)}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(departureTime)}</p>
                              {segment.da?.terminal && (
                                <p className="text-xs font-medium text-blue-600 mt-1">
                                  Terminal {segment.da.terminal}
                                </p>
                              )}
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500 mb-1">Duration</p>
                              <p className="font-semibold text-gray-900 text-lg">
                                {formatDuration(segment.duration || 0)}
                              </p>
                              <div className="relative my-3">
                                <div className="w-full h-0.5 bg-gray-200"></div>
                                <Plane className="w-4 h-4 text-blue-600 absolute -top-1 left-1/2 transform -translate-x-1/2" />
                              </div>
                              <p className="text-xs font-medium text-gray-600">
                                {segment.stops === 0
                                  ? 'Direct Flight'
                                  : `${segment.stops} Stop${segment.stops > 1 ? 's' : ''}`}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs text-gray-500 mb-1">Arrival</p>
                              <p className="font-semibold text-gray-900 text-lg">{arrivalCode}</p>
                              <p className="text-sm text-gray-600">{arrivalCity}</p>
                              <p className="text-sm font-medium text-gray-800 mt-2">
                                {formatTime(arrivalTime)}
                              </p>
                              <p className="text-xs text-gray-500">{formatDate(arrivalTime)}</p>
                              {segment.aa?.terminal && (
                                <p className="text-xs font-medium text-green-600 mt-1">
                                  Terminal {segment.aa.terminal}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Flight Details */}
                          {segment.fD && (
                            <div className="bg-blue-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-600" />
                                Flight Information
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-xs text-gray-500">Flight Number</p>
                                  <p className="font-medium text-gray-900">
                                    {segment.fN || segment.fD.fN || 'N/A'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Aircraft</p>
                                  <p className="font-medium text-gray-900">
                                    {segment.fD.eT || 'N/A'}
                                  </p>
                                </div>
                                {segment.fD.aI && (
                                  <>
                                    <div>
                                      <p className="text-xs text-gray-500">Airline</p>
                                      <p className="font-medium text-gray-900">
                                        {segment.fD.aI.name}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-gray-500">Airline Code</p>
                                      <p className="font-medium text-gray-900">
                                        {segment.fD.aI.code}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Stopover Information (if applicable) */}
                          {segment.stops > 0 && segment.so && segment.so.length > 0 && (
                            <div className="mt-3 bg-yellow-50 rounded-lg p-3">
                              <p className="text-xs font-medium text-yellow-800 mb-2">
                                Stopover Information
                              </p>
                              {segment.so.map((stop: any, idx: number) => (
                                <div key={idx} className="text-xs text-yellow-700">
                                  {stop.city} ({stop.airportCode}) - {stop.duration} minutes stop
                                </div>
                              ))}
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

          {/* Fare Options */}
          {fareOptions && fareOptions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-600" />
                Fare Options
              </h3>

              {/* Fare Type Tabs */}
              <div className="flex flex-wrap gap-2 mb-4">
                {fareOptions.map((fare: any, index: number) => {
                  const fareDetails = extractFareDetails(fare);
                  const isActive = selectedFareIndex === index;
                  return (
                    <button
                      key={fare.id || index}
                      onClick={() => setSelectedFareIndex(index)}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 ring-2 ring-blue-400 ring-offset-1'
                          : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      {getFareDisplayName(fare.fareIdentifier)}
                      <span
                        className={`ml-2 text-xs font-normal ${
                          isActive ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        ₹{fareDetails.totalFare?.toFixed(0)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Fare Details */}
              {fareOptions[selectedFareIndex] && (
                <div className="border-2 border-blue-200 rounded-xl overflow-hidden">
                  {(() => {
                    const fare = fareOptions[selectedFareIndex];
                    const fareDetails = extractFareDetails(fare);

                    return (
                      <div>
                        {/* Fare Header */}
                        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-bold text-blue-900">
                                {getFareDisplayName(fare.fareIdentifier)}
                              </h4>
                              <p className="text-sm text-blue-700">
                                Fare Basis: {fareDetails.fareBasis}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-blue-700">Total Fare</p>
                              <p className="text-3xl font-bold text-blue-900">
                                ₹
                                {fareDetails.totalFare?.toLocaleString('en-IN', {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Fare Details */}
                        <div className="p-6">
                          {/* Price Breakdown */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-500 mb-1">Base Fare</p>
                              <p className="text-2xl font-bold text-gray-900">
                                ₹
                                {fareDetails.baseFare?.toLocaleString('en-IN', {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-sm text-gray-500 mb-1">Taxes & Fees</p>
                              <p className="text-2xl font-bold text-gray-900">
                                ₹
                                {fareDetails.taxesAndFees?.toLocaleString('en-IN', {
                                  maximumFractionDigits: 0,
                                })}
                              </p>
                            </div>
                          </div>

                          {/* Baggage Information */}
                          <div className="mb-6">
                            <h5 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4 text-blue-600" />
                              Baggage Allowance
                            </h5>
                            {fareDetails.baggage ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {fareDetails.baggage.iB && (
                                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                                    <Briefcase className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Check-in Baggage
                                      </p>
                                      <p className="text-lg font-bold text-gray-900">
                                        {fareDetails.baggage.iB}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {fareDetails.baggage.cB && (
                                  <div className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg">
                                    <Luggage className="w-5 h-5 text-gray-500 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        Cabin Baggage
                                      </p>
                                      <p className="text-lg font-bold text-gray-900">
                                        {fareDetails.baggage.cB}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">Baggage details not available</p>
                            )}
                          </div>

                          {/* Fare Rules */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div
                              className={`p-3 rounded-lg ${
                                !fareDetails.refundable
                                  ? 'bg-gray-50'
                                  : /^refundable$/i.test(fareDetails.refundable)
                                    ? 'bg-green-50'
                                    : 'bg-red-50'
                              }`}
                            >
                              <p
                                className={`text-sm font-medium ${
                                  !fareDetails.refundable
                                    ? 'text-gray-500'
                                    : /^refundable$/i.test(fareDetails.refundable)
                                      ? 'text-green-700'
                                      : 'text-red-700'
                                }`}
                              >
                                {fareDetails.refundable || 'Refundability not stated'}
                              </p>
                              {/* 'Free cancellation within 24 hours' / 'No refunds after
                                  booking' sat here — invented terms. The real windows come
                                  from the fare-rule call. */}
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg">
                              <p className="text-sm font-medium text-gray-700">Booking Class</p>
                              <p className="text-lg font-bold text-gray-900">
                                {fareDetails.bookingClass}
                              </p>
                            </div>
                          </div>

                          {/* Cabin Class */}
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-purple-700">Cabin Class</p>
                            <p className="text-lg font-bold text-purple-900">
                              {fareDetails.cabinClass}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Price Summary from tripInfo */}
          {tripInfo?.totalPriceList && tripInfo.totalPriceList.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                All Fare Options Summary
              </h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {tripInfo.totalPriceList.map((price: any, index: number) => {
                    const fareDetails = extractFareDetails(price);

                    return (
                      <div key={index} className="p-4 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">
                              {getFareDisplayName(price.fareIdentifier)}
                            </span>
                            <span className="ml-2 text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                              {fareDetails.cabinClass}
                            </span>
                          </div>
                          <span className="font-bold text-lg text-blue-600">
                            ₹
                            {fareDetails.totalFare?.toLocaleString('en-IN', {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>
                            Base: ₹
                            {fareDetails.baseFare?.toLocaleString('en-IN', {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <span>
                            Taxes: ₹
                            {fareDetails.taxesAndFees?.toLocaleString('en-IN', {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          {fareDetails.refundable && (
                            <span
                              className={
                                /^refundable$/i.test(fareDetails.refundable)
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              {fareDetails.refundable}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Important Information */}
          <div className="flex items-start gap-3 text-sm text-gray-600 bg-blue-50 rounded-lg p-4">
            <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900 mb-1">Important Information</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>All fares include taxes and fees</li>
                <li>Baggage allowances may vary by fare type</li>
                <li>Please check fare rules before booking</li>
                <li>Prices are per adult and may vary based on availability</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
