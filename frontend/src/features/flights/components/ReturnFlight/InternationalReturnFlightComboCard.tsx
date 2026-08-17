import { Plane, Loader2, AlertCircle, Clock } from 'lucide-react';
import { PairedFlight } from '../../types/types.returnFlight';
import { useState } from 'react';
import { getReturnFareDetails } from '@/api/flightService.api';
import InternationalReturnFlightFareDetailsCard from './InternationalReturnFlightFareDetailsCard';
import FlightCardFooter from '../FlightCardFooter';

interface InternationalReturnFlightComboCardProps {
  comboFlight: PairedFlight;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onwardFareRuleLoaded?:
    | ((fareRuleData: any, flightType: string, fareId: string) => void)
    | undefined;
  returnFareRuleLoaded?:
    | ((fareRuleData: any, flightType: string, fareId: string) => void)
    | undefined;
  isReturnFlightSearch?: boolean;
}

// Helper functions - SAME as OneWay
const formatDuration = (duration: string) => {
  if (!duration) return 'N/A';
  return duration;
};

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
  if (stopDetails.count === 1) {
    const stopCity = stopDetails.stopCities?.[0] || '';
    return `1 Stop via ${stopCity}`;
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

/**
 * Sub-components - MATCHING OneWay design
 */
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
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
        {airlineLogo ? (
          <img
            src={airlineLogo}
            alt={airline}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<span className="text-lg font-bold text-blue-600">${airlineCode || airline?.substring(0, 2)}</span>`;
            }}
          />
        ) : (
          <span className="text-lg font-bold text-blue-600">
            {airlineCode || airline?.substring(0, 2) || 'NA'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-sm">{airline || 'N/A'}</p>
        <p className="text-xs text-gray-500">{flightNumber || 'N/A'}</p>
        <p className="text-xs text-gray-500">{cabinClassDisplay}</p>
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
      <p className="text-lg font-bold">{airportCode || 'N/A'}</p>
      <p className="text-sm font-medium">{formatTime(time)}</p>
      <p className="text-xs text-gray-500">{formatDateDisplay(date)}</p>
    </div>
  );
};

interface DurationStopsProps {
  duration: string;
  stopDetails: any;
}

const DurationStops = ({ duration, stopDetails }: DurationStopsProps) => {
  const stopDisplay = getStopDisplay(stopDetails);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Duration */}
      <p className="text-sm text-gray-600 mb-1">{formatDuration(duration)}</p>

      {/* Line */}
      <div className="relative w-full flex items-center">
        <div className="w-full border-t-2 border-dashed border-gray-300"></div>

        {/* Dots */}
        <div className="absolute left-0 w-2 h-2 bg-indigo-700 rounded-full -translate-x-1/2"></div>
        <div className="absolute right-0 w-2 h-2 bg-indigo-700 rounded-full translate-x-1/2"></div>
      </div>

      {/* Stops */}
      <p className="text-red-600 text-sm font-medium mt-1">{stopDisplay}</p>
    </div>
  );
};

interface PriceActionProps {
  price: number;
  isLoading: boolean;
  isFareSelected: boolean;
  onSelect: () => void;
  fareSelectionError?: string | null;
  label?: string;
}

const PriceAction = ({
  price,
  isLoading,
  isFareSelected,
  onSelect,
  fareSelectionError,
  label = 'PER ADULT',
}: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-right">
        <p className="text-xl font-bold text-black">₹ {price?.toFixed(0) || '0'}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <div className="flex flex-col items-end gap-1 w-full">
        {fareSelectionError && (
          <div className="text-red-600 text-xs flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{fareSelectionError}</span>
          </div>
        )}
        <button
          onClick={onSelect}
          disabled={isLoading}
          className={`bg-blue-950 text-white px-8 py-1.5 rounded text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
            isFareSelected ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-950 hover:bg-blue-800'
          }`}
        >
          {isLoading ? 'Loading...' : isFareSelected ? 'Selected ✓' : 'Select'}
        </button>
      </div>
    </div>
  );
};


/**
 * Main Component - MATCHING OneWay design
 */
export default function InternationalReturnFlightComboCard({
  comboFlight,
  isSelected,
  onSelect,
  onDeselect,
  onwardFareRuleLoaded,
  returnFareRuleLoaded,
  isReturnFlightSearch = false,
}: InternationalReturnFlightComboCardProps) {
  const [showFareDetails, setShowFareDetails] = useState(false);
  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [isLoadingFare, setIsLoadingFare] = useState(false);
  const [fareSelectionError, setFareSelectionError] = useState<string | null>(null);
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);

  const onward = comboFlight.onward;
  const returnFlight = comboFlight.return;

  const handleSelectClick = async () => {
    if (isSelected && selectedFareId) {
      onDeselect();
      setShowFareDetails(false);
      setFlightDetails(null);
      setSelectedFareId(null);
      setFareSelectionError(null);
      return;
    }

    setFareSelectionError(null);
    setIsLoadingFare(true);

    try {
      const sessionId = sessionStorage.getItem('returnFlightSessionId');
      const onwardFlightKey = onward.segmentId || onward.flightId;

      if (!sessionId || !onwardFlightKey) {
        setFareSelectionError('Flight information missing');
        return;
      }

      const fareDetailsResponse = await getReturnFareDetails({
        sessionId,
        flightKey: onwardFlightKey,
        segment: 'ONWARD',
      });

      if (fareDetailsResponse?.success !== false && fareDetailsResponse?.data) {
        setFlightDetails({
          data: fareDetailsResponse.data,
        });
        setShowFareDetails(true);
        onSelect();
      } else {
        setFareSelectionError(
          fareDetailsResponse?.message || 'Unable to load fare details. Please try again.',
        );
        onDeselect();
      }
    } catch (error) {
      console.error('Error fetching fare details:', error);
      setFareSelectionError('Unable to load fare options. Please try again.');
      onDeselect();
    } finally {
      setIsLoadingFare(false);
    }
  };

  const handleCloseFareDetails = () => {
    setShowFareDetails(false);
    setFlightDetails(null);
  };

  const handleFareConfirm = (selectedFareId: string, selectedFareDetails: any) => {
    setSelectedFareId(selectedFareId);

    if (onwardFareRuleLoaded) {
      onwardFareRuleLoaded(selectedFareDetails, 'departure', selectedFareId);
    }
    if (returnFareRuleLoaded) {
      returnFareRuleLoaded(selectedFareDetails, 'return', selectedFareId);
    }

    sessionStorage.setItem('selectedRoundTripFareId', selectedFareId);
    sessionStorage.setItem(
      'selectedRoundTripFareData',
      JSON.stringify({
        fareId: selectedFareId,
        fareDetails: selectedFareDetails,
        flightType: 'roundtrip',
        onwardFlightId: onward.flightId,
        returnFlightId: returnFlight.flightId,
        timestamp: new Date().toISOString(),
      }),
    );

    setShowFareDetails(false);
    setFlightDetails(null);
  };

  const handleViewDetails = () => {
    // Handle flight details view
    console.log('View flight details');
  };

  const isFareSelected = !!selectedFareId;

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border"
        style={{ border: '0.4px solid #F3393F' }}
      >
        <div className="p-4 pb-0">
          {/* Round Trip Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Round Trip</span>
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                Best Price
              </span>
            </div>
          </div>

          {/* Onward Flight - MATCHES OneWay layout */}
          <div className="flex items-center justify-between gap-4">
            {/* Airline Info */}
            <div className="flex-1">
              <AirlineInfo
                airline={onward.airline}
                airlineCode={onward.airlineCode || ''}
                flightNumber={onward.flightNumber}
                cabinClass={onward.cabinClass}
              />
            </div>

            {/* Departure */}
            <div className="flex-1">
              <FlightPoint
                time={onward.departure?.time}
                airportCode={onward.departure?.airportCode}
                date={onward.departure?.date}
              />
            </div>

            {/* Duration & Stops */}
            <div className="flex-[1.5]">
              <DurationStops duration={onward.duration} stopDetails={onward.stopDetails} />
            </div>

            {/* Arrival */}
            <div className="flex-1">
              <FlightPoint
                time={onward.arrival?.time}
                airportCode={onward.arrival?.airportCode}
                date={onward.arrival?.date}
              />
            </div>

            {/* Price & Action */}
            <div className="flex-1 flex justify-end">
              <PriceAction
                price={comboFlight.totalPrice || 0}
                isLoading={isLoadingFare}
                isFareSelected={isFareSelected}
                onSelect={handleSelectClick}
                fareSelectionError={fareSelectionError}
                label="TOTAL FOR BOTH"
              />
            </div>
          </div>

          {/* Return Flight - MATCHES OneWay layout */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Airline Info */}
              <div className="flex-1">
                <AirlineInfo
                  airline={returnFlight.airline}
                  airlineCode={returnFlight.airlineCode || ''}
                  flightNumber={returnFlight.flightNumber}
                  cabinClass={returnFlight.cabinClass}
                />
              </div>

              {/* Departure */}
              <div className="flex-1">
                <FlightPoint
                  time={returnFlight.departure?.time}
                  airportCode={returnFlight.departure?.airportCode}
                  date={returnFlight.departure?.date}
                />
              </div>

              {/* Duration & Stops */}
              <div className="flex-[1.5]">
                <DurationStops
                  duration={returnFlight.duration}
                  stopDetails={returnFlight.stopDetails}
                />
              </div>

              {/* Arrival */}
              <div className="flex-1">
                <FlightPoint
                  time={returnFlight.arrival?.time}
                  airportCode={returnFlight.arrival?.airportCode}
                  date={returnFlight.arrival?.date}
                />
              </div>

              {/* Return Flight Label */}
              <div className="flex-1 flex justify-end">
                <div className="text-right">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    Return
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - MATCHES OneWay exactly */}
          <FlightCardFooter
            refundable={comboFlight.refundable}
            checkInBaggage={comboFlight.checkInBaggage}
            cabinBaggage={comboFlight.cabinBaggage}
          />
        </div>
      </div>

      {showFareDetails && flightDetails && isReturnFlightSearch && (
        <InternationalReturnFlightFareDetailsCard
          isOpen={showFareDetails}
          onClose={handleCloseFareDetails}
          fareData={flightDetails}
          flightType="roundtrip"
          fromLocation={{
            code: onward.departure?.airportCode,
            city: onward.departure?.city,
          }}
          toLocation={{
            code: onward.arrival?.airportCode,
            city: onward.arrival?.city,
          }}
          travelDate={onward.departure?.date}
          onConfirm={handleFareConfirm}
        />
      )}
    </>
  );
}
