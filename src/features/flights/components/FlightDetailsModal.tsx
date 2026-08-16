import { X, Clock, Plane, MapPin, Luggage, User, CreditCard, Shield } from 'lucide-react';

interface FlightDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightDetails: any;
}

export default function FlightDetailsModal({
  isOpen,
  onClose,
  flightDetails,
}: FlightDetailsModalProps) {
  if (!isOpen || !flightDetails) return null;

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

  /**
   * Get fare option display name
   */
  const getFareDisplayName = (fareIdentifier: string) => {
    const fareMap: Record<string, string> = {
      UPFRONT: 'Upfront Fare',
      PUBLISHED: 'Published Fare',
      SME: 'SME Fare',
      FLEXI_PLUS: 'Flexi Plus',
    };
    return fareMap[fareIdentifier] || fareIdentifier;
  };

  /**
   * Format time from ISO string or return as is
   */
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    // Check if it's an ISO date string
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return timeString;
  };

  /**
   * Format date from ISO string or return as is
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    // Check if it's an ISO date string
    if (dateString.includes('T')) {
      const date = new Date(dateString);
      return date
        .toLocaleDateString('en-US', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
        .replace(/\//g, '/');
    }
    return dateString;
  };

  /**
   * Extract fare details from the complex fare structure
   */
  const extractFareDetails = (fare: any) => {
    if (!fare) return { baseFare: 0, taxesAndFees: 0, totalFare: 0, baggage: null };

    // Try to get from fd.ADULT.fC structure (from your data)
    if (fare.fd?.ADULT?.fC) {
      const fC = fare.fd.ADULT.fC;
      return {
        baseFare: fC.BF || 0,
        taxesAndFees: fC.TAF || 0,
        totalFare: fC.TF || fC.BF + fC.TAF || 0,
        baggage: fare.fd.ADULT.bI || null,
      };
    }

    // Try alternative structures
    if (fare.fd?.ADULT) {
      return {
        baseFare: fare.fd.ADULT.baseFare || 0,
        taxesAndFees: fare.fd.ADULT.taxesAndFees || 0,
        totalFare: fare.fd.ADULT.totalFare || 0,
        baggage: fare.fd.ADULT.baggage || fare.fd.ADULT.bI || null,
      };
    }

    return { baseFare: 0, taxesAndFees: 0, totalFare: 0, baggage: null };
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Flight Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Route Summary */}
          {departure && arrival && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatTime(departure.time)}</p>
                    <p className="font-medium text-gray-700">{departure.airportCode}</p>
                    <p className="text-xs text-gray-500">{formatDate(departure.date)}</p>
                  </div>

                  <div className="flex-1 px-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-full border-t-2 border-gray-300 border-dashed"></div>
                      <div className="absolute bg-blue-50 px-2 flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {Math.floor((totalDuration || 0) / 60)}h {(totalDuration || 0) % 60}m
                        </span>
                      </div>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {totalStops === 0
                        ? 'Non-stop'
                        : `${totalStops} Stop${totalStops > 1 ? 's' : ''}`}
                    </p>
                    {flightNumbers && flightNumbers.length > 0 && (
                      <p className="text-center text-xs text-gray-500 mt-1">
                        Flight: {flightNumbers.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{formatTime(arrival.time)}</p>
                    <p className="font-medium text-gray-700">{arrival.airportCode}</p>
                    <p className="text-xs text-gray-500">{formatDate(arrival.date)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Airport Details */}
          {departure && arrival && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Departure Airport
                </h3>
                <p className="font-semibold">{departure.airportName || 'N/A'}</p>
                <p className="text-sm text-gray-600">
                  {departure.city || 'N/A'} ({departure.airportCode})
                </p>
                {departure.terminal && (
                  <p className="text-sm text-gray-600 mt-1">Terminal: {departure.terminal}</p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  Arrival Airport
                </h3>
                <p className="font-semibold">{arrival.airportName || 'N/A'}</p>
                <p className="text-sm text-gray-600">
                  {arrival.city || 'N/A'} ({arrival.airportCode})
                </p>
                {arrival.terminal && (
                  <p className="text-sm text-gray-600 mt-1">Terminal: {arrival.terminal}</p>
                )}
              </div>
            </div>
          )}

          {/* Airline Information */}
          {airlines && airlines.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-600" />
                Airline Information
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {airlines.map((airline: any, index: number) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="font-bold text-blue-600">{airline.code}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{airline.name}</p>
                      <p className="text-sm text-gray-500">Code: {airline.code}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Segments Details */}
          {segments && segments.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Flight Segments
              </h3>
              <div className="space-y-3">
                {segments.map((segment: any, index: number) => (
                  <div key={segment.id || index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Segment {index + 1}</span>
                      <span className="text-sm text-gray-500">
                        Duration: {Math.floor((segment.duration || 0) / 60)}h{' '}
                        {(segment.duration || 0) % 60}m
                      </span>
                    </div>

                    {/* Departure and Arrival info from segment */}
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div>
                        <p className="font-medium">
                          {segment.da?.code || segment.departure?.airportCode || 'N/A'}
                        </p>
                        <p className="text-gray-500">
                          {formatTime(segment.dt || segment.departure?.time)}
                        </p>
                      </div>
                      <Plane className="w-4 h-4 text-gray-400" />
                      <div className="text-right">
                        <p className="font-medium">
                          {segment.aa?.code || segment.arrival?.airportCode || 'N/A'}
                        </p>
                        <p className="text-gray-500">
                          {formatTime(segment.at || segment.arrival?.time)}
                        </p>
                      </div>
                    </div>

                    {/* Flight details */}
                    {segment.fD && (
                      <div className="text-xs text-gray-500 border-t pt-2 mt-2">
                        <span>Aircraft: {segment.fD.eT || 'N/A'} | </span>
                        <span>Flight: {segment.fN || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fare Options */}
          {fareOptions && fareOptions.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Fare Options
              </h3>
              <div className="space-y-3">
                {fareOptions.map((fare: any, index: number) => {
                  const fareDetails = extractFareDetails(fare);

                  return (
                    <div
                      key={fare.id || index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-blue-600">
                          {getFareDisplayName(fare.fareIdentifier)}
                        </span>
                        <span className="text-lg font-bold">
                          ₹{fareDetails.totalFare?.toFixed(2) || 'N/A'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Base Fare</p>
                          <p className="font-medium">
                            ₹{fareDetails.baseFare?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Taxes & Fees</p>
                          <p className="font-medium">
                            ₹{fareDetails.taxesAndFees?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Baggage Info */}
                      {fareDetails.baggage && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {fareDetails.baggage.iB && (
                              <span className="flex items-center gap-1">
                                <Luggage className="w-4 h-4" />
                                Check-in: {fareDetails.baggage.iB}
                              </span>
                            )}
                            {fareDetails.baggage.cB && (
                              <span className="flex items-center gap-1">
                                <Luggage className="w-4 h-4" />
                                Cabin: {fareDetails.baggage.cB}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Additional fare info from your data structure */}
                      {fare.fd?.ADULT?.fC && (
                        <div className="mt-2 text-xs text-gray-500">
                          <span>Cabin: {fare.fd.ADULT.cc || ''} | </span>
                          <span>Fare Basis: {fare.fd.ADULT.fB || 'N/A'}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price Summary from tripInfo */}
          {tripInfo?.totalPriceList && tripInfo.totalPriceList.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Price Summary
              </h3>
              <div className="bg-gray-50 rounded-lg p-4">
                {tripInfo.totalPriceList.map((price: any, index: number) => {
                  const fareDetails = extractFareDetails(price);

                  return (
                    <div
                      key={index}
                      className="mb-3 pb-3 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {getFareDisplayName(price.fareIdentifier)}
                        </span>
                        <span className="font-bold">
                          ₹{fareDetails.totalFare?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Base: ₹{fareDetails.baseFare?.toFixed(2)}</span>
                        <span>Taxes: ₹{fareDetails.taxesAndFees?.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
            <Shield className="w-5 h-5 text-green-600" />
            <span>All fares include taxes and fees. Baggage allowances may vary by fare type.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
