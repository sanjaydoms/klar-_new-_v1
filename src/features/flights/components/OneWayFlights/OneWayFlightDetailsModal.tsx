import React from 'react';
import { Plane } from 'lucide-react';
import { FlightData } from '../../types/types.oneWayFlight';

interface OneWayFlightDetailsModalProps {
  show: boolean;
  onClose: () => void;
  selectedFlight: FlightData | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function OneWayFlightDetailsModal({
  show,
  onClose,
  selectedFlight,
  activeTab,
  setActiveTab,
}: OneWayFlightDetailsModalProps) {
  if (!show || !selectedFlight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('flight-details')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'flight-details'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              FLIGHT DETAILS
            </button>
            <button
              onClick={() => setActiveTab('fare-summary')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'fare-summary'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              FARE SUMMARY
            </button>
            <button
              onClick={() => setActiveTab('cancellation')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'cancellation'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              CANCELLATION
            </button>
            <button
              onClick={() => setActiveTab('date-change')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                activeTab === 'date-change'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              DATE CHANGE
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'flight-details' && (
            <div>
              {/* Route Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                {selectedFlight.from === 'BOM' ? 'Mumbai' : selectedFlight.from} to{' '}
                {selectedFlight.to === 'IXC' ? 'Chandigarh' : selectedFlight.to},{' '}
                {new Date(selectedFlight.departureDate).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short',
                })}
              </h3>

              {/* Airline Info */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Plane className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selectedFlight.airline}</div>
                  <div className="text-sm text-gray-600">
                    {selectedFlight.flightNumber} (Airbus A321)
                  </div>
                </div>
              </div>

              {/* Flight Journey Details */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-8">
                  {/* Departure */}
                  <div className="flex-1">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedFlight.departureTime}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(selectedFlight.departureDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </div>
                    <div className="text-sm font-medium text-gray-700">Terminal 1T</div>
                    <div className="text-sm text-gray-600">
                      {selectedFlight.from === 'BOM' ? 'Mumbai' : selectedFlight.from}, India
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex-1 flex flex-col items-center px-8">
                    <div className="text-sm text-gray-600 mb-2">{selectedFlight.duration}</div>
                    <div className="w-full relative">
                      <div className="h-1 bg-green-500 rounded-full"></div>
                      <div className="absolute top-1/2 left-0 w-2 h-2 bg-green-500 rounded-full transform -translate-y-1/2"></div>
                      <div className="absolute top-1/2 right-0 w-2 h-2 bg-green-500 rounded-full transform -translate-y-1/2"></div>
                    </div>
                    {selectedFlight.stops > 0 && (
                      <div className="text-xs text-red-500 mt-2 font-medium">
                        {selectedFlight.stops} Stop{selectedFlight.stops > 1 ? 's' : ''} via{' '}
                        {selectedFlight.viaCity}
                      </div>
                    )}
                  </div>

                  {/* Arrival */}
                  <div className="flex-1 text-right">
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                      {selectedFlight.arrivalTime}
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      {new Date(selectedFlight.arrivalDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })}
                    </div>
                    <div className="text-sm font-medium text-gray-700">Terminal 1T</div>
                    <div className="text-sm text-gray-600">
                      {selectedFlight.to === 'IXC' ? 'Chandigarh' : selectedFlight.to}, India
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">BAGGAGE :</div>
                    <div className="text-sm font-medium text-gray-900">ADULT</div>
                    <div className="text-sm text-gray-600">15 Kgs (1 piece only)</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">CHECK-IN</div>
                    <div className="text-sm text-gray-600">7 Kgs (1 piece only)</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">CABIN</div>
                    <div className="text-sm text-gray-600">{selectedFlight.class}</div>
                  </div>
                </div>

                {/* Amenities */}
                <div className="flex items-center gap-6 mt-6 pt-6 border-t">
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    <span className="text-sm">3-3 Layout</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm">Beverage Available</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fare-summary' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Fare Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-700">Base Fare (1 Adult)</span>
                  <span className="font-semibold">
                    ₹ {Math.floor(selectedFlight.price * 0.75).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-700">Taxes & Fees</span>
                  <span className="font-semibold">
                    ₹ {Math.floor(selectedFlight.price * 0.25).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg">
                  <span>Total Amount</span>
                  <span className="text-blue-600">
                    ₹ {selectedFlight.price.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cancellation' && (
            <div>
              <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-900 mb-2">Cancellation Charges</h3>
                <p className="text-sm text-gray-600">
                  {selectedFlight.refundable
                    ? 'The following charges will be applicable for cancellation:'
                    : 'This fare is non-refundable. Cancellation will result in 100% loss of fare.'}
                </p>
              </div>

              {selectedFlight.refundable ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Time Frame
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                          Airline Charges + MMT Fee
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">0 hours to 2 hours*</div>
                          <div className="text-xs text-gray-500 mt-1">
                            *From the time of departure
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-semibold text-red-600">Non Refundable</div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">2 hours to 3 days*</div>
                          <div className="text-xs text-gray-500 mt-1">
                            *From the time of departure
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-semibold text-gray-900">₹ 3,500 + ₹ 300</div>
                          <div className="text-xs text-gray-500 mt-1">per passenger</div>
                        </td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">3 days to 365 days*</div>
                          <div className="text-xs text-gray-500 mt-1">
                            *From the time of departure
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="font-semibold text-gray-900">₹ 3,000 + ₹ 300</div>
                          <div className="text-xs text-gray-500 mt-1">per passenger</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div>
                      <div className="font-semibold text-red-900 mb-2">Non-Refundable Fare</div>
                      <p className="text-sm text-red-800">
                        This ticket cannot be cancelled or refunded. In case of cancellation, the
                        entire ticket amount will be forfeited. Please review your travel plans
                        carefully before booking.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <div className="font-semibold mb-1">Important Information</div>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Airline cancellation charges are indicative and may vary</li>
                      <li>• Convenience fee is non-refundable</li>
                      <li>• Refund will be processed within 7-10 business days</li>
                      <li>• All refunds will be credited to the original payment method</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'date-change' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Date Change Policy</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700">
                    Date changes are subject to availability and fare difference. Additional charges
                    may apply.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">0-2 hours before departure</span>
                    <span className="font-semibold text-red-600">Not allowed</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">2-24 hours before departure</span>
                    <span className="font-semibold">₹ 3,500 + fare difference</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-gray-700">More than 24 hours before departure</span>
                    <span className="font-semibold">₹ 2,500 + fare difference</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
