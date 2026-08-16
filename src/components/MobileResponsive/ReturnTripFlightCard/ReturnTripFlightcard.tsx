import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../DashboardPage/BottomNav';
import FlightCard from './FlightCard';
import { groupAndMap } from '@/features/flights/utils/groupFareVariants';
import TripHeader from './TripHeader';
import {
  FlightType,
  InternationalFlightPair,
  TripDetails,
  Flight,
  SelectedFlight,
} from '@/types/returnMobileFlight.type';
import InternationalFlightCard from './InternationalFlightCard';
import { notifyError } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';
import {
  getReturnFareDetails,
  getReviewDetails,
  getSeatDetails,
  getMealsAndBaggages,
} from '@/api/flightService.api';

const ReturnTripFlightcard: React.FC = () => {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  // Two independent lists. These used to be zipped into "pairs" by index, and
  // when the two sides differed in length the shorter one was padded by
  // wrapping with a modulo — so the shorter column repeated its first flights
  // as if they were extra options.
  const [onwardFlights, setOnwardFlights] = useState<Flight[]>([]);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [internationalPairs, setInternationalPairs] = useState<InternationalFlightPair[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flightType, setFlightType] = useState<FlightType>('domestic');
  const [selectingFlight, setSelectingFlight] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedDeparture, setSelectedDeparture] = useState<SelectedFlight | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<SelectedFlight | null>(null);
  const [selectedInternational, setSelectedInternational] =
    useState<InternationalFlightPair | null>(null);

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [tripDetails, setTripDetails] = useState<TripDetails>({
    date: '',
    returnDate: '',
    travellers: [
      { type: 'adult' as const, count: 2 },
      { type: 'child' as const, count: 0 },
      { type: 'infant' as const, count: 0 },
    ],
    class: 'Economy',
  });
  const [tempDetails, setTempDetails] = useState<TripDetails>({
    date: '',
    returnDate: '',
    travellers: [
      { type: 'adult' as const, count: 2 },
      { type: 'child' as const, count: 0 },
      { type: 'infant' as const, count: 0 },
    ],
    class: 'Economy',
  });

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, [isEditing, onwardFlights, returnFlights, internationalPairs]);

  // Load selected flights from sessionStorage on mount
  useEffect(() => {
    const loadSelectedFlights = () => {
      try {
        const selectedDepartureStr = sessionStorage.getItem('selectedDeparture');
        const selectedReturnStr = sessionStorage.getItem('selectedReturn');
        const selectedInternationalStr = sessionStorage.getItem('selectedInternational');

        if (selectedDepartureStr) {
          try {
            const departure = JSON.parse(selectedDepartureStr);
            setSelectedDeparture(departure);
          } catch (e) {
            console.error('Error parsing departure:', e);
          }
        }

        if (selectedReturnStr) {
          try {
            const returnFlight = JSON.parse(selectedReturnStr);
            setSelectedReturn(returnFlight);
          } catch (e) {
            console.error('Error parsing return:', e);
          }
        }

        if (selectedInternationalStr) {
          try {
            const international = JSON.parse(selectedInternationalStr);
            setSelectedInternational(international);
          } catch (e) {
            console.error('Error parsing international:', e);
          }
        }
      } catch (error) {
        console.error('Error loading selected flights:', error);
      }
    };

    loadSelectedFlights();
  }, []);

  useEffect(() => {
    const loadFlightData = () => {
      try {
        const storedData = sessionStorage.getItem('roundFlightResults');

        if (storedData) {
          const parsedData = JSON.parse(storedData);

          let flightsData = null;
          let isInternational = false;

          if (parsedData.onward && parsedData.return) {
            flightsData = parsedData;
            setFlightType('domestic');
          } else if (parsedData.flights && parsedData.flights.onward && parsedData.flights.return) {
            flightsData = parsedData.flights;
            setFlightType('domestic');
          } else if (
            parsedData.data &&
            parsedData.data.flights &&
            parsedData.data.flights.onward &&
            parsedData.data.flights.return
          ) {
            flightsData = parsedData.data.flights;
            setFlightType('domestic');
          } else if (
            parsedData.success &&
            parsedData.data &&
            parsedData.data.flights &&
            parsedData.data.flights.onward &&
            parsedData.data.flights.return
          ) {
            flightsData = parsedData.data.flights;
            setFlightType('domestic');
          } else if (parsedData.roundTrips) {
            flightsData = parsedData;
            setFlightType('international');
            isInternational = true;
          } else if (parsedData.flights && parsedData.flights.roundTrips) {
            flightsData = parsedData.flights;
            setFlightType('international');
            isInternational = true;
          } else if (
            parsedData.data &&
            parsedData.data.flights &&
            parsedData.data.flights.roundTrips
          ) {
            flightsData = parsedData.data.flights;
            setFlightType('international');
            isInternational = true;
          } else if (
            parsedData.success &&
            parsedData.data &&
            parsedData.data.flights &&
            parsedData.data.flights.roundTrips
          ) {
            flightsData = parsedData.data.flights;
            setFlightType('international');
            isInternational = true;
          }

          if (flightsData) {
            if (isInternational) {
              const roundTrips = flightsData.roundTrips || flightsData;
              setInternationalPairs(roundTrips);
            } else {
              // TripJack returns one entry per fare group, so both lists carry
              // near-duplicate cards until they are folded back together.
              setOnwardFlights(groupAndMap<any, Flight>(flightsData.onward || flightsData, (f) => f));
              setReturnFlights(groupAndMap<any, Flight>(flightsData.return || [], (f) => f));
            }
          }
        }

        const searchParams = sessionStorage.getItem('flightSearchParams');
        if (searchParams) {
          const params = JSON.parse(searchParams);
          setTripDetails((prev) => ({
            ...prev,
            date: params.departureDate || '',
            returnDate: params.returnDate || '',
            travellers: params.travelerDetails
              ? [
                  { type: 'adult' as const, count: params.travelerDetails.adults || 2 },
                  { type: 'child' as const, count: params.travelerDetails.children || 0 },
                  { type: 'infant' as const, count: params.travelerDetails.infants || 0 },
                ]
              : prev.travellers,
            class: params.class || 'Economy',
          }));
          setTempDetails((prev) => ({
            ...prev,
            date: params.departureDate || '',
            returnDate: params.returnDate || '',
            travellers: params.travelerDetails
              ? [
                  { type: 'adult' as const, count: params.travelerDetails.adults || 2 },
                  { type: 'child' as const, count: params.travelerDetails.children || 0 },
                  { type: 'infant' as const, count: params.travelerDetails.infants || 0 },
                ]
              : prev.travellers,
            class: params.class || 'Economy',
          }));
        }
      } catch (error) {
        console.error('Error loading flight data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFlightData();
  }, []);

  const extractPriceId = (flightData: any): string | null => {
    if (!flightData) return null;

    // Try different possible paths
    if (flightData.data?.fares?.[0]?.fareId) {
      return flightData.data.fares[0].fareId;
    }
    if (flightData.data?.fareId) {
      return flightData.data.fareId;
    }
    if (flightData.fareId) {
      return flightData.fareId;
    }
    if (flightData.priceId) {
      return flightData.priceId;
    }
    return null;
  };

  const handleDomesticFlightSelect = async (flight: Flight, label: string) => {
    if (selectingFlight) return;

    setSelectingFlight(true);

    try {
      const sessionId = sessionStorage.getItem('roundFlightSessionId');

      if (!sessionId) {
        console.error('No session ID found');
        setSelectingFlight(false);
        return;
      }

      const segment = label.toLowerCase() === 'departure' ? 'ONWARD' : 'RETURN';

      const payload = {
        sessionId: sessionId,
        flightKey: flight.flightKey,
        segment: segment,
      };

      const response = await getReturnFareDetails(payload);

      if (response.success && response.data) {
        const selectedFlightData: SelectedFlight = {
          flight: flight,
          fareData: response.data,
          price: flight.price || 0,
          segment: label.toLowerCase() === 'departure' ? 'departure' : 'return',
          flightKey: flight.flightKey,
        };

        if (label.toLowerCase() === 'departure') {
          setSelectedDeparture(selectedFlightData);
          sessionStorage.setItem('selectedDeparture', JSON.stringify(selectedFlightData));
        } else {
          setSelectedReturn(selectedFlightData);
          sessionStorage.setItem('selectedReturn', JSON.stringify(selectedFlightData));
        }

        sessionStorage.setItem('fareDetails', JSON.stringify(response));
        sessionStorage.setItem('selectedFlight', JSON.stringify(flight));
        sessionStorage.setItem('selectedSegment', segment);

        navigate('/mobile_return_fare_card');
      } else {
        notifyError('Failed to fetch fare details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching fare:', error);
      notifyError('An error occurred while fetching fare details. Please try again.');
    } finally {
      setSelectingFlight(false);
    }
  };

  const handleInternationalFlightSelect = async (onward: Flight, returnFlight: Flight) => {
    if (selectingFlight) return;

    setSelectingFlight(true);

    try {
      const sessionId = sessionStorage.getItem('roundFlightSessionId');

      if (!sessionId) {
        console.error('No session ID found');
        setSelectingFlight(false);
        return;
      }

      const payload = {
        sessionId: sessionId,
        flightKey: onward.flightKey,
        segment: 'ONWARD',
      };

      const response = await getReturnFareDetails(payload);

      if (response.success && response.data) {
        const selectedInternationalData: InternationalFlightPair = {
          onward: onward,
          return: returnFlight,
          totalPrice: (onward.price || 0) + (returnFlight.price || 0),
        };

        setSelectedInternational(selectedInternationalData);
        sessionStorage.setItem('selectedInternational', JSON.stringify(selectedInternationalData));

        sessionStorage.setItem('fareDetails', JSON.stringify(response));
        sessionStorage.setItem('selectedFlight', JSON.stringify(onward));
        sessionStorage.setItem('selectedReturnFlight', JSON.stringify(returnFlight));
        sessionStorage.setItem('selectedSegment', 'ONWARD');

        navigate('/mobile-oneway-fare-card');
      } else {
        notifyError('Failed to fetch fare details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching fare:', error);
      notifyError('An error occurred while fetching fare details. Please try again.');
    } finally {
      setSelectingFlight(false);
    }
  };

  const handleContinueToNext = async () => {
    if (flightType === 'domestic') {
      if (selectedDeparture && selectedReturn) {
        try {
          // Get fare IDs from consolidated session storage
          const fareIdsStr = sessionStorage.getItem('returnDomesticFareIds');
          let priceIds: string[] = [];

          if (fareIdsStr) {
            try {
              const fareIdEntries = JSON.parse(fareIdsStr);
              if (Array.isArray(fareIdEntries)) {
                // Extract just the fare IDs from the array
                priceIds = fareIdEntries.map((entry) => entry.fareId).filter(Boolean);
              }
            } catch (e) {
              console.error('Error parsing fare IDs:', e);
            }
          }

          // Fallback: try to get from individual session storage keys
          if (priceIds.length === 0) {
            const departureFareStr = sessionStorage.getItem('selectedDepartureFare');
            if (departureFareStr) {
              try {
                const departureFare = JSON.parse(departureFareStr);
                if (departureFare.fareId) {
                  priceIds.push(departureFare.fareId);
                }
              } catch (e) {
                console.error('Error parsing departure fare:', e);
              }
            }

            const returnFareStr = sessionStorage.getItem('selectedReturnFare');
            if (returnFareStr) {
              try {
                const returnFare = JSON.parse(returnFareStr);
                if (returnFare.fareId) {
                  priceIds.push(returnFare.fareId);
                }
              } catch (e) {
                console.error('Error parsing return fare:', e);
              }
            }
          }

          // Final fallback: try to extract from selected objects
          if (priceIds.length === 0) {
            const departurePriceId = extractPriceId(selectedDeparture.fareData);
            if (departurePriceId) {
              priceIds.push(departurePriceId);
            }

            const returnPriceId = extractPriceId(selectedReturn.fareData);
            if (returnPriceId) {
              priceIds.push(returnPriceId);
            }
          }

          if (priceIds.length === 0) {
            console.error('No price IDs found');
            notifyError('Unable to find fare information. Please try again.');
            return;
          }

          // Show loading state
          setIsSubmitting(true);

          // Call getReviewDetails with both price IDs
          const reviewResponse = await getReviewDetails({ priceIds });

          if (reviewResponse?.success) {
            // Store review data
            storeReviewData(reviewResponse);

            // Get booking ID from review response
            const bookingId =
              reviewResponse.data?.bookingId ||
              reviewResponse.data?.booking_id ||
              reviewResponse.bookingId ||
              reviewResponse.booking_id;

            const sessionId = sessionStorage.getItem('roundFlightSessionId') || '';

            // Call APIs in parallel for better performance
            const apiCalls = [];

            if (bookingId) {
              apiCalls.push(
                getSeatDetails({ bookingId })
                  .then((response) => {
                    if (response?.success) {
                      sessionStorage.setItem('seatData', JSON.stringify(response));
                    }
                    return response;
                  })
                  .catch((error) => {
                    console.error('Error fetching seat details:', error);
                    return null;
                  }),
              );
            }

            if (sessionId) {
              apiCalls.push(
                getMealsAndBaggages(sessionId)
                  .then((response) => {
                    if (response?.success) {
                      sessionStorage.setItem('ancillaryData', JSON.stringify(response));
                    }
                    return response;
                  })
                  .catch((error) => {
                    console.error('Error fetching ancillary details:', error);
                    return null;
                  }),
              );
            }

            // Wait for all API calls to complete (or fail)
            await Promise.allSettled(apiCalls);

            // Calculate total price
            const totalPrice = selectedDeparture.price + selectedReturn.price;
            sessionStorage.setItem('selectedDeparture', JSON.stringify(selectedDeparture));
            sessionStorage.setItem('selectedReturn', JSON.stringify(selectedReturn));
            sessionStorage.setItem('totalRoundTripPrice', String(totalPrice));

            // Navigate to ancillary page
            navigate('/mobile-ancillary-flight-details');
          } else {
            notifyError('Failed to get review details. Please try again.');
          }
        } catch (error) {
          console.error('Error in continue flow:', error);
          notifyError('An error occurred. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        notifyError('Please select both departure and return flights');
      }
    } else {
      // International flight flow
      if (selectedInternational) {
        try {
          // For international flights, we need to get fare IDs from session storage
          // since Flight type doesn't have fareData
          const fareIdsStr = sessionStorage.getItem('returnDomesticFareIds');
          let priceIds: string[] = [];

          if (fareIdsStr) {
            try {
              const fareIdEntries = JSON.parse(fareIdsStr);
              if (Array.isArray(fareIdEntries)) {
                priceIds = fareIdEntries.map((entry) => entry.fareId).filter(Boolean);
              }
            } catch (e) {
              console.error('Error parsing fare IDs:', e);
            }
          }

          // Fallback: try to get from individual session storage keys
          if (priceIds.length === 0) {
            const onwardFareStr = sessionStorage.getItem('selectedDepartureFare');
            if (onwardFareStr) {
              try {
                const onwardFare = JSON.parse(onwardFareStr);
                if (onwardFare.fareId) {
                  priceIds.push(onwardFare.fareId);
                }
              } catch (e) {
                console.error('Error parsing onward fare:', e);
              }
            }

            const returnFareStr = sessionStorage.getItem('selectedReturnFare');
            if (returnFareStr) {
              try {
                const returnFare = JSON.parse(returnFareStr);
                if (returnFare.fareId) {
                  priceIds.push(returnFare.fareId);
                }
              } catch (e) {
                console.error('Error parsing return fare:', e);
              }
            }
          }

          if (priceIds.length === 0) {
            console.error('No price IDs found for international flight');
            notifyError('Unable to find fare information. Please try again.');
            return;
          }

          setIsSubmitting(true);

          const reviewResponse = await getReviewDetails({ priceIds });

          if (reviewResponse?.success) {
            storeReviewData(reviewResponse);

            const bookingId =
              reviewResponse.data?.bookingId ||
              reviewResponse.data?.booking_id ||
              reviewResponse.bookingId ||
              reviewResponse.booking_id;

            const sessionId = sessionStorage.getItem('roundFlightSessionId') || '';

            const apiCalls = [];

            if (bookingId) {
              apiCalls.push(
                getSeatDetails({ bookingId })
                  .then((response) => {
                    if (response?.success) {
                      sessionStorage.setItem('seatData', JSON.stringify(response));
                    }
                    return response;
                  })
                  .catch((error) => {
                    console.error('Error fetching seat details:', error);
                    return null;
                  }),
              );
            }

            if (sessionId) {
              apiCalls.push(
                getMealsAndBaggages(sessionId)
                  .then((response) => {
                    if (response?.success) {
                      sessionStorage.setItem('ancillaryData', JSON.stringify(response));
                    }
                    return response;
                  })
                  .catch((error) => {
                    console.error('Error fetching ancillary details:', error);
                    return null;
                  }),
              );
            }

            await Promise.allSettled(apiCalls);

            sessionStorage.setItem('selectedInternational', JSON.stringify(selectedInternational));
            navigate('/mobile-passenger-details');
          } else {
            notifyError('Failed to get review details. Please try again.');
          }
        } catch (error) {
          console.error('Error in international continue flow:', error);
          notifyError('An error occurred. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
      } else {
        notifyError('Please select an international flight');
      }
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      setTempDetails({ ...tripDetails });
    }
    setIsEditing(!isEditing);
  };

  const handleCancel = () => {
    setTripDetails({ ...tempDetails });
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripDetails((prev) => ({
      ...prev,
      date: e.target.value,
    }));
  };

  const handleReturnDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripDetails((prev) => ({
      ...prev,
      returnDate: e.target.value,
    }));
  };

  const handleTravellerChange = (type: 'adult' | 'child' | 'infant', value: number) => {
    setTripDetails((prev) => ({
      ...prev,
      travellers: prev.travellers.map((t) => (t.type === type ? { ...t, count: value } : t)),
    }));
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTripDetails((prev) => ({
      ...prev,
      class: e.target.value,
    }));
  };

  // const isDomesticBothSelected = flightType === 'domestic' && selectedDeparture && selectedReturn;
  const isDomesticBothSelected =
    flightType === 'domestic' && !!(selectedDeparture && selectedReturn);
  // const isInternationalSelected = flightType === 'international' && selectedInternational;
  const isInternationalSelected = flightType === 'international' && !!selectedInternational;

  if (isLoading) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-3 sm:p-4 pb-24 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-gray-600">Loading flights...</p>
        </div>
      </div>
    );
  }

  if (flightType === 'domestic' && onwardFlights.length === 0 && returnFlights.length === 0) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-3 sm:p-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600">No domestic flights found. Please try searching again.</p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (flightType === 'international' && internationalPairs.length === 0) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 p-3 sm:p-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600">
              No international flights found. Please try searching again.
            </p>
            <button
              onClick={() => navigate(-1)}
              className="mt-4 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="block md:hidden lg:hidden min-h-screen bg-gray-100 pb-24">
      <div className="max-w-6xl mx-auto">
        <div ref={headerRef} className="sticky top-0 z-50 bg-gray-100" style={{ top: 0 }}>
          <TripHeader
            firstOnwardFlight={onwardFlights[0] ?? null}
            internationalPairs={internationalPairs}
            flightType={flightType}
            isEditing={isEditing}
            tripDetails={tripDetails}
            selectedDeparture={selectedDeparture}
            selectedReturn={selectedReturn}
            selectedInternational={selectedInternational}
            isDomesticBothSelected={isDomesticBothSelected}
            isInternationalSelected={isInternationalSelected}
            onEditToggle={handleEditToggle}
            onCancel={handleCancel}
            onSave={handleSave}
            onDateChange={handleDateChange}
            onReturnDateChange={handleReturnDateChange}
            onTravellerChange={handleTravellerChange}
            onClassChange={handleClassChange}
            onBack={() => navigate(-1)}
            onContinue={handleContinueToNext}
            isSubmitting={isSubmitting}
          />
        </div>

        <div
          className="px-3 sm:px-4 pb-4 pt-4 sm:pt-5"
          style={{ height: `calc(100vh - ${headerHeight + 60}px)` }}
        >
          {flightType === 'domestic' ? (
            <div className="flex gap-2 sm:gap-3 h-full">
              <div
                className="flex-1 overflow-y-auto scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <div className="space-y-2 sm:space-y-3 pr-1">
                  {onwardFlights.map((flight, index) => (
                    <div key={`departure-${flight.flightKey || index}`}>
                      <FlightCard
                        flight={flight}
                        label="Departure"
                        isSelected={(flight.variants ?? [flight]).some(
                          (v) => v.flightKey === selectedDeparture?.flightKey,
                        )}
                        onSelect={handleDomesticFlightSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="flex-1 overflow-y-auto scrollbar-hide"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                <div className="space-y-2 sm:space-y-3 pl-1">
                  {returnFlights.map((flight, index) => (
                    <div key={`return-${flight.flightKey || index}`}>
                      <FlightCard
                        flight={flight}
                        label="Return"
                        isSelected={(flight.variants ?? [flight]).some(
                          (v) => v.flightKey === selectedReturn?.flightKey,
                        )}
                        onSelect={handleDomesticFlightSelect}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              className="h-full overflow-y-auto scrollbar-hide"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="space-y-3 sm:space-y-4">
                {internationalPairs.map((pair, index) => (
                  <div key={`international-${index}`}>
                    <InternationalFlightCard
                      onward={pair.onward}
                      return={pair.return}
                      totalPrice={pair.totalPrice}
                      refundable={pair.refundable}
                      checkInBaggage={pair.checkInBaggage}
                      cabinBaggage={pair.cabinBaggage}
                      isSelected={
                        selectedInternational?.onward?.flightKey === pair.onward.flightKey
                      }
                      onSelect={handleInternationalFlightSelect}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ReturnTripFlightcard;
