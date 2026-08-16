import React, { useState } from 'react';
import { FlightData } from '../../types/types.oneWayFlight';

interface OneWayFareOptionsModalProps {
  show: boolean;
  onClose: () => void;
  selectedFlight: FlightData | null;
  onBookNow?: () => void;
}

export default function OneWayFareOptionsModal({
  show,
  onClose,
  selectedFlight,
  onBookNow,
}: OneWayFareOptionsModalProps) {
  const [selectedFareClass, setSelectedFareClass] = useState('economy');

  if (!show || !selectedFlight) return null;

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Flight Details and Fare Options available for you!
            </h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span className="font-medium">
                {selectedFlight.from === 'BOM' ? 'New Delhi' : selectedFlight.from} →{' '}
                {selectedFlight.to === 'IXC' ? 'Bengaluru' : selectedFlight.to}
              </span>
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">AI</span>
              <span>
                Air India • Thu, 25 Dec 25 • Departure at 21:30 - Arrival at 00:30 (+1 day)
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Fare Class Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setSelectedFareClass('economy')}
              className={`flex-1 px-6 py-4 text-left transition-colors ${
                selectedFareClass === 'economy'
                  ? 'border-b-4 border-blue-600 bg-blue-50'
                  : 'border-b-4 border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">Economy</div>
              <div className="text-sm text-gray-600">Starting at ₹ 7,221</div>
              <div className="text-xs text-gray-500 mt-1">Affordable fares & value for money</div>
            </button>
            <button
              onClick={() => setSelectedFareClass('premium')}
              className={`flex-1 px-6 py-4 text-left transition-colors ${
                selectedFareClass === 'premium'
                  ? 'border-b-4 border-blue-600 bg-blue-50'
                  : 'border-b-4 border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">Premium Economy</div>
              <div className="text-sm text-gray-600">Starting at ₹ 9,787</div>
              <div className="text-xs text-gray-500 mt-1">
                Comfortable seating & priority check-in
              </div>
            </button>
            <button
              onClick={() => setSelectedFareClass('business')}
              className={`flex-1 px-6 py-4 text-left transition-colors ${
                selectedFareClass === 'business'
                  ? 'border-b-4 border-blue-600 bg-blue-50'
                  : 'border-b-4 border-transparent hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold text-gray-900">Business Class</div>
              <div className="text-sm text-gray-600">Starting at ₹ 35,583</div>
              <div className="text-xs text-gray-500 mt-1">
                Luxury experience with premium services
              </div>
            </button>
          </div>
        </div>

        {/* Fare Options Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {selectedFareClass === 'economy' && (
            <div className="grid grid-cols-3 gap-4">
              {/* ECO VALUE */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">₹ 7,221</div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">ECO VALUE</div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>15 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 3,000 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-600 text-xs">
                      <svg
                        className="w-4 h-4"
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
                      <span>Date Change fee starts at ₹ 3,100 up to 2 hrs before departure</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free Seats</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Complimentary Meals</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>FLAT ₹ 150 OFF using MMTSUPER</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>

              {/* ECO VALUE PLUS */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors relative">
                <div className="absolute top-2 right-2 bg-black text-white text-xs px-2 py-1 rounded">
                  ✨ ECO VALUE PLUS
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 line-through text-sm">₹ 7,620</span>
                    <span className="text-2xl font-bold text-gray-900">₹ 7,340</span>
                  </div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">ECO VALUE PLUS</div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>15 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 3,000 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Date Change fee starts at ₹ 3,000</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free Seats</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Complimentary Meals</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-yellow-600 text-xs font-medium">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>FLAT ₹ 150 OFF using MMTSUPER</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>

              {/* ECO CLASSIC */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">₹ 7,749</div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">ECO CLASSIC</div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>15 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 3,000 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Date Change fee ₹ 1,000 up to 2 hrs before departure</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free Seats</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Complimentary Meals</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedFareClass === 'premium' && (
            <div className="grid grid-cols-2 gap-4">
              {/* PREMIUM VALUE */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">₹ 9,787</div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">PREMIUM VALUE</div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">ALL FARES INCLUDE</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Complimentary meal</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>15 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 5,000 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Date Change fee starts at ₹ 3,000</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free seats</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">FLAT ₹ 152 OFF using MMTSUPER</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>

              {/* PREMIUM FLEX */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-gray-900">₹ 11,557</div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">PREMIUM FLEX</div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">ALL FARES INCLUDE</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Complimentary meal</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>25 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 999 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free Date Change up to 2 hrs before departure</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free seats</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">
                      FLAT ₹ 20 OFF using MMTSUPER | FLAT 12% OFF on KOTA...
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedFareClass === 'business' && (
            <div className="grid grid-cols-2 gap-4">
              {/* BUSINESS VALUE */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 line-through text-sm">₹ 36,083</span>
                    <span className="text-2xl font-bold text-gray-900">₹ 35,583</span>
                  </div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">BUSINESS VALUE</div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">ALL FARES INCLUDE</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Complimentary meal</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>30 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-yellow-600 text-xs">
                      <svg
                        className="w-4 h-4"
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
                      <span>Date Change fee starts at ₹ 15,250 up to 2 hrs before departure</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free seats</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Prioritized Check-in and Bag tagging</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">FLAT ₹ 500 OFF using MMTLUXURY</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>

              {/* BUSINESS FLEX */}
              <div className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-gray-400 line-through text-sm">₹ 43,183</span>
                    <span className="text-2xl font-bold text-gray-900">₹ 42,683</span>
                  </div>
                  <div className="text-xs text-gray-500">per adult</div>
                  <div className="text-sm font-semibold text-gray-700 mt-1">BUSINESS FLEX</div>
                </div>

                <div className="bg-gray-50 rounded p-3 mb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">ALL FARES INCLUDE</div>
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <svg
                      className="w-4 h-4 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Complimentary meal</span>
                  </div>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Baggage</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>7 Kgs Cabin Baggage</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>35 Kgs Check-in Baggage</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Lower Cancellation fee ₹ 3,000 onwards</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Date Change fee starts at ₹ 250</span>
                    </div>
                  </div>

                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Seats, Meals & More</div>
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Free seats</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-600">FLAT ₹ 500 OFF using MMTLUXURY</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    LOCK PRICE
                  </button>
                  <button
                    onClick={() => {
                      if (selectedFlight) {
                        sessionStorage.setItem(
                          'selectedFlight',
                          JSON.stringify({
                            tripType: 'oneway',
                            airline: selectedFlight.airline,
                            flightNumber: selectedFlight.flightNumber,
                            from: selectedFlight.from,
                            to: selectedFlight.to,
                            departureDate: selectedFlight.departureDate,
                            departureTime: selectedFlight.departureTime,
                            arrivalDate: selectedFlight.arrivalDate,
                            arrivalTime: selectedFlight.arrivalTime,
                            duration: selectedFlight.duration,
                            stops: `${selectedFlight.stops} Stop${selectedFlight.stops !== 1 ? 's' : ''}`,
                            basefare: selectedFlight.price,
                            taxes: 1503,
                            insurance: 0,
                          }),
                        );
                        onBookNow?.();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    BOOK NOW
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
