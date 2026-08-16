import { Plane, Clock, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { Flight } from '../../types/types.returnFlight';
import { useState } from 'react';
import ReturnFareDetailsCard from './ReturnFareDetailsCard';
import FareVariantRows from '../FareVariantRows';
import { getReturnFareDetails } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';
import { Button } from '@/components/ui/button';

interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  /** Called with the fare variant the user has active on this card. */
  onSelect: (chosen?: Flight) => void;
  onDeselect: () => void;
  onViewDetails: () => void;
  type: 'departure' | 'return';
  onFareRuleLoaded?: ((fareRuleData: any, flightType: string, fareId: string) => void) | undefined;
  isReturnFlightSearch?: boolean;
}

const formatTime = (time: string) => {
  if (!time) return '--:--';
  try {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')}${ampm}`;
  } catch {
    return time;
  }
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthIndex = monthNames.indexOf(month as string);
      const monthNum = (monthIndex + 1).toString().padStart(2, '0');
      const dateObj = new Date(parseInt('20' + year), monthIndex, parseInt(day as string));
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName}, ${day}-${monthNum}-20${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getStopDisplay = (stopDetails: any) => {
  if (!stopDetails) return 'Non-stop';
  if (stopDetails.count === 0) return 'Non-stop';

  // If we have stopCities array
  if (stopDetails.stopCities && stopDetails.stopCities.length > 0) {
    if (stopDetails.count === 1) {
      return `1 Stop via ${stopDetails.stopCities[0]}`;
    } else if (stopDetails.count > 1) {
      return `${stopDetails.count} Stops via ${stopDetails.stopCities.join(', ')}`;
    }
  }

  // If we have stopNames array
  if (stopDetails.stopNames && stopDetails.stopNames.length > 0) {
    if (stopDetails.count === 1) {
      return `1 Stop via ${stopDetails.stopNames[0]}`;
    } else if (stopDetails.count > 1) {
      return `${stopDetails.count} Stops via ${stopDetails.stopNames.join(', ')}`;
    }
  }

  // If we have stopCodes array
  if (stopDetails.stopCodes && stopDetails.stopCodes.length > 0) {
    if (stopDetails.count === 1) {
      return `1 Stop via ${stopDetails.stopCodes[0]}`;
    } else if (stopDetails.count > 1) {
      return `${stopDetails.count} Stops via ${stopDetails.stopCodes.join(', ')}`;
    }
  }

  // Fallback - just show count
  if (stopDetails.count === 1) {
    return '1 Stop';
  }
  return `${stopDetails.count} Stops`;
};

const getCabinClassDisplay = (cabinClass: string) => {
  if (!cabinClass) return 'Economy';
  const classMap: Record<string, string> = {
    ECONOMY: 'Economy',
    PREMIUM_ECONOMY: 'Premium Economy',
    BUSINESS: 'Business',
    FIRST: 'First Class',
  };
  return classMap[cabinClass] || cabinClass.charAt(0) + cabinClass.slice(1).toLowerCase();
};

interface AirlineInfoProps {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
}

const AirlineInfo = ({ airline, airlineCode, flightNumber, cabinClass }: AirlineInfoProps) => {
  const airlineLogo = airlineCode ? `/airline-logos/${airlineCode}.png` : null;
  const cabinClassDisplay = getCabinClassDisplay(cabinClass);

  return (
    <div className="flex items-center gap-1 sm:gap-2 -ml-1 sm:-ml-2">
      <div className="w-7 h-7 sm:w-8 md:w-9 flex items-center justify-center flex-shrink-0">
        {airlineLogo ? (
          <img
            src={airlineLogo}
            alt={airline}
            className="w-5 h-5 sm:w-6 md:w-7 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<span className="text-[10px] sm:text-xs md:text-sm font-bold text-blue-600">${airlineCode || airline?.substring(0, 2)}</span>`;
            }}
          />
        ) : (
          <span className="text-[6px] sm:text-[8px] md:text-[10px] font-bold text-blue-600">
            {airlineCode || airline?.substring(0, 2) || 'NA'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-[10px] sm:text-xs md:text-sm">{airline || 'N/A'}</p>
        <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-500">
          {flightNumber || 'N/A'}
        </p>
        <p className="text-[8px] sm:text-[10px] md:text-xs text-gray-500">{cabinClassDisplay}</p>
      </div>
    </div>
  );
};

interface FlightPointProps {
  time: string;
  airportCode: string;
  date: string;
}

const FlightPoint = ({ time, airportCode, date }: FlightPointProps) => {
  return (
    <div className="text-center">
      <p className="text-[8px] sm:text-[10px] md:text-sm font-bold">{airportCode || 'N/A'}</p>
      <p className="text-[7px] sm:text-[9px] md:text-xs font-medium">{formatTime(time)}</p>
      <p className="text-xs text-gray-500">{formatDateDisplay(date)}</p>
    </div>
  );
};

interface DurationStopsProps {
  duration: string;
  stopDetails: any;
}

const DurationStops = ({ duration, stopDetails }: DurationStopsProps) => {
  console.log('🛑 DurationStops stopDetails:', stopDetails);
  const stopDisplay = getStopDisplay(stopDetails);
  console.log('📝 Final stopDisplay:', stopDisplay);

  return (
    <div className="flex flex-col items-center w-full">
      <p className="text-[8px] sm:text-[10px] md:text-sm text-gray-600 mb-0.5">
        {duration || '0h 0m'}
      </p>

      <div className="relative w-full flex items-center">
        <div className="w-full border-t border-dashed border-gray-300"></div>
        <div className="absolute left-0 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-indigo-700 rounded-full -translate-x-1/2"></div>
        <div className="absolute right-0 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-indigo-700 rounded-full translate-x-1/2"></div>
      </div>

      <p className="text-red-600 text-[5px] sm:text-[7px] md:text-[9px] font-medium mt-0.5">
        {stopDisplay}
      </p>
    </div>
  );
};

interface PriceActionProps {
  price: number;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

const PriceAction = ({ price, isLoading, isSelected, onSelect, onDeselect }: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-left">
        <p className="text-base sm:text-lg md:text-xl font-bold text-black text-left -ml-20 sm:-ml-24 md:-ml-28">
          ₹ {price?.toFixed(0) || '0'}
        </p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide text-left -ml-16 sm:-ml-20 md:-ml-24">
          PER ADULT
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 w-full">
        <Button
          onClick={isSelected ? onDeselect : onSelect}
          disabled={isLoading}
          variant={isSelected ? 'secondary' : 'accent'}
          className="w-full px-8 sm:w-auto"
        >
          {isLoading ? 'Loading...' : isSelected ? 'Selected' : 'Select'}
        </Button>
      </div>
    </div>
  );
};

interface FooterInfoProps {
  onViewDetails?: () => void;
  flightType: 'departure' | 'return';
}

const FooterInfo = ({ onViewDetails }: FooterInfoProps) => {
  return (
    <div
      className="mt-2 pb-2 pt-2 px-4 -mx-4 border-t flex items-center justify-between text-xs"
      style={{
        borderTop: '1px solid rgba(203, 139, 12, 0.25)',
        background:
          'linear-gradient(90deg, rgba(250, 197, 93, 0.25) 11.01%, rgba(203, 139, 12, 0.25) 59.57%)',
      }}
    >
      <div className="flex items-center gap-25">
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-green-600 font-medium font-semibold">REFUNDABLE</span>
        </div>

        <div className="flex items-center gap-1">
          <img src="/logo/luggage.png" alt="Baggage" className="w-4 h-4 object-contain" />
          <span className="text-gray-600">15 KG / 7 KG</span>
        </div>
      </div>

      {/* <button
        onClick={onViewDetails}
        className="flex items-center gap-1 text-gray-900 hover:text-blue-800 hover:underline font-medium"
      >
        <span>Flight Details</span>
        <ChevronDown className="w-4 h-4" />
      </button> */}
    </div>
  );
};

export default function FlightCard({
  flight,
  isSelected,
  onSelect,
  onDeselect,
  onViewDetails,
  type,
  onFareRuleLoaded,
  isReturnFlightSearch = false,
}: FlightCardProps) {
  const [showFareDetailsPopup, setShowFareDetailsPopup] = useState(false);
  const [flightDetailsData, setFlightDetailsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Fare groups of this physical flight; the chosen one drives price, the
  // fare-details call and what gets stored as the selection.
  const fares = flight.variants && flight.variants.length > 0 ? flight.variants : [flight];
  const [fareIndex, setFareIndex] = useState(0);
  const activeFare = fares[Math.min(fareIndex, fares.length - 1)] ?? flight;
  const seatsLeft = activeFare.seatsRemaining;

  const departureAirportCode = flight.departure?.airportCode || 'N/A';
  const departureTime = flight.departure?.time || '--:--';
  const departureDate = flight.departure?.date || '';

  const arrivalAirportCode = flight.arrival?.airportCode || 'N/A';
  const arrivalTime = flight.arrival?.time || '--:--';
  const arrivalDate = flight.arrival?.date || '';

  const duration =
    typeof flight.duration === 'number'
      ? `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m`
      : flight.duration || '0h 0m';

  const getCheapestFare = () => {
    if (activeFare.fareOptions && activeFare.fareOptions.length > 0) {
      const cheapest = Math.min(...activeFare.fareOptions.map((f) => f.totalFare));
      return cheapest;
    }
    return activeFare.price || 0;
  };

  const getCabinClass = () => {
    if (activeFare.fareOptions && activeFare.fareOptions.length > 0) {
      return activeFare.fareOptions[0]?.cabinClass;
    }
    return activeFare.class || '';
  };

  // Switching fare invalidates a selection made on the previous one — the
  // parent holds the variant, not the card.
  const handleFareChange = (index: number) => {
    setFareIndex(index);
    if (isSelected) onDeselect();
  };

  const cheapestFare = getCheapestFare();
  const cabinClass = getCabinClass();

  const handleSelectClick = async () => {
    if (isSelected) {
      onDeselect();
      setShowFareDetailsPopup(false);
      setFlightDetailsData(null);
    } else {
      setIsLoading(true);

      try {
        const sessionId = sessionStorage.getItem('returnFlightSessionId');
        const flightKey = activeFare.segmentId || activeFare.flightId || activeFare.flightKey;

        if (!sessionId || !flightKey) {
          notifyError('Flight information missing');
          onDeselect();
          return;
        }

        const segment = type === 'return' ? 'RETURN' : 'ONWARD';

        const fareDetailsResponse = await getReturnFareDetails({
          sessionId,
          flightKey,
          segment,
        });

        if (fareDetailsResponse?.success !== false && fareDetailsResponse?.data) {
          setFlightDetailsData({
            data: fareDetailsResponse.data,
          });
          setShowFareDetailsPopup(true);
          onSelect(activeFare);
        } else {
          notifyError(
            fareDetailsResponse?.message || 'Unable to load fare details. Please try again.',
          );
          onDeselect();
        }
      } catch {
        notifyError('Flight not found, search another.');
        onDeselect();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleClosePopup = () => {
    setShowFareDetailsPopup(false);
    setFlightDetailsData(null);
  };

  const handleConfirmFare = (selectedFareId: string, selectedFareDetails: any) => {
    if (onFareRuleLoaded) {
      onFareRuleLoaded(selectedFareDetails, type, selectedFareId);
    }

    if (type === 'departure') {
      sessionStorage.setItem('selectedDepartureFareId', selectedFareId);
      sessionStorage.setItem(
        'selectedDepartureFareData',
        JSON.stringify({
          fareId: selectedFareId,
          fareDetails: selectedFareDetails,
          flightType: 'departure',
          flightId: activeFare.flightId,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (type === 'return') {
      sessionStorage.setItem('selectedReturnFareId', selectedFareId);
      sessionStorage.setItem(
        'selectedReturnFareData',
        JSON.stringify({
          fareId: selectedFareId,
          fareDetails: selectedFareDetails,
          flightType: 'return',
          flightId: activeFare.flightId,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    setShowFareDetailsPopup(false);
    setFlightDetailsData(null);
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border ${
          isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100'
        }`}
      >
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <AirlineInfo
                airline={
                  typeof flight.airline === 'string'
                    ? flight.airline
                    : flight.airline?.name || 'N/A'
                }
                airlineCode={flight.airlineCode || ''}
                flightNumber={flight.flightNumber || ''}
                cabinClass={cabinClass || 'Economy'}
              />
            </div>

            <div className="flex-1">
              <FlightPoint
                time={departureTime}
                airportCode={departureAirportCode}
                date={departureDate}
              />
            </div>

            <div className="flex-[1.5]">
              <DurationStops
                duration={duration}
                stopDetails={flight.stopDetails || { count: flight.stops || 0 }}
              />
            </div>

            <div className="flex-1">
              <FlightPoint time={arrivalTime} airportCode={arrivalAirportCode} date={arrivalDate} />
            </div>

            <div className="flex-1 flex justify-end">
              <PriceAction
                price={cheapestFare}
                isLoading={isLoading}
                isSelected={isSelected}
                onSelect={handleSelectClick}
                onDeselect={handleSelectClick}
              />
            </div>
          </div>

          {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
            <p className="mt-2 text-xs font-semibold text-destructive">Seats left: {seatsLeft}</p>
          )}

          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={handleFareChange} />

          <FooterInfo onViewDetails={onViewDetails} flightType={type} />
        </div>
      </div>

      {showFareDetailsPopup && flightDetailsData && isReturnFlightSearch && (
        <ReturnFareDetailsCard
          fare={flightDetailsData}
          onClose={handleClosePopup}
          onConfirm={handleConfirmFare}
          flightType={type}
        />
      )}
    </>
  );
}
