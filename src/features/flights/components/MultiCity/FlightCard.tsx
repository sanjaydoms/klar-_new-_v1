import { useState } from 'react';
import { FlightOption } from '../../types/types.multiCityFlight';
import MultiFlightDetailsModal from './MultiFlightDetailsModalProps';
import MultiFareDetailsCard from './MultiFareDetailsCard';
import { getMultiCityFareDetails } from '@/api/flightService.api';
import { Button } from '@/components/ui/button';
import FareVariantRows from '../FareVariantRows';
import FlightCardFooter from '../FlightCardFooter';

interface FlightCardProps {
  flight: FlightOption;
  isSelected: boolean;
  /** Called with the fare variant the user has active on this card. */
  onSelect: (chosen?: FlightOption) => void;
  onViewDetails: (fareRuleData?: any) => void;
  getFlightPrice: (flight: FlightOption) => number;
  legIndex?: number;
}

// Helper functions - MATCHING OneWay exactly
const formatDuration = (duration: number | string) => {
  if (!duration) return 'N/A';
  if (typeof duration === 'number') {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h ${minutes}m`;
  }
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
 * Sub-components - MATCHING OneWay exactly
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
  duration: string | number;
  stopDetails: any;
}

const DurationStops = ({ duration, stopDetails }: DurationStopsProps) => {
  const stopDisplay = getStopDisplay(stopDetails);
  const durationDisplay =
    typeof duration === 'number' ? `${Math.floor(duration / 60)}h ${duration % 60}m` : duration;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Duration */}
      <p className="text-sm text-gray-600 mb-1">{formatDuration(durationDisplay)}</p>

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
  isSelected: boolean;
  onSelect: () => void;
}

const PriceAction = ({ price, isLoading, isSelected, onSelect }: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-right">
        <p className="text-xl font-bold text-black">₹ {price?.toFixed(0) || '0'}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">PER ADULT</p>
      </div>
      <div className="flex flex-col items-end gap-1 w-full">
        <Button
          onClick={onSelect}
          disabled={isLoading}
          variant={isSelected ? 'secondary' : 'accent'}
          className="w-full px-8 sm:w-auto"
        >
          {isLoading ? 'Loading...' : isSelected ? 'Selected ✓' : 'Select'}
        </Button>
      </div>
    </div>
  );
};


/**
 * Main Component - MATCHING OneWay exactly
 */
export default function FlightCard({
  flight,
  isSelected,
  onSelect,
  onViewDetails,
  getFlightPrice,
  legIndex,
}: FlightCardProps) {
  const [showFlightDetailsModal, setShowFlightDetailsModal] = useState(false);
  const [selectedFlightDetails, setSelectedFlightDetails] = useState<any>(null);
  const [showFareDetailsModal, setShowFareDetailsModal] = useState(false);
  const [selectedFareDetails, setSelectedFareDetails] = useState<any>(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  // Fare groups of this physical flight; the chosen one drives price, the
  // fare-details call and what gets stored as the selection.
  const fares = flight.variants && flight.variants.length > 0 ? flight.variants : [flight];
  const [fareIndex, setFareIndex] = useState(0);
  const activeFare = fares[Math.min(fareIndex, fares.length - 1)] ?? flight;
  const seatsLeft = activeFare.seatsRemaining;

  const handleViewDetails = () => {
    setShowFlightDetailsModal(true);
  };

  const price = getFlightPrice(activeFare);

  // Prepare stopDetails object to match OneWay format
  const stopDetails = {
    count: flight.stops || 0,
    stopCities: flight.stopCities || [],
  };

  const handleSelectClick = async () => {
    if (isSelected) {
      onSelect(activeFare);
      return;
    }

    const segmentId = activeFare.segmentId;
    if (!segmentId) {
      console.error('No segment ID available for this flight');
      return;
    }

    try {
      setIsLoading(true);
      setSelectedSegmentId(segmentId);

      const sessionId = sessionStorage.getItem('multiCitySessionId');
      if (!sessionId) {
        console.error('No session ID found in sessionStorage');
        return;
      }

      const filterSegmentId = activeFare.segmentId?.split(',')[0] ?? '';
      if (!filterSegmentId) {
        console.error('Segment ID not found');
        return;
      }

      const fareDetails = await getMultiCityFareDetails({
        sessionId: String(sessionId),
        legIndex: [legIndex ?? flight.legIndex ?? 0],
        flightKey: filterSegmentId,
      });

      console.log('Multi-city fare details:', JSON.stringify(fareDetails, null, 2));
      setSelectedFareDetails(fareDetails);
      setShowFareDetailsModal(true);
      onSelect(activeFare);
    } catch (error) {
      console.error('Failed to fetch fare details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border"
        style={{ border: '0.4px solid #F3393F' }}
      >
        {/* Main Flight Info */}
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between gap-4">
            {/* Airline Info */}
            <div className="flex-1">
              <AirlineInfo
                airline={flight.airline?.name || ''}
                airlineCode={flight.airline?.code || ''}
                flightNumber={flight.flightNumber || ''}
                cabinClass={flight.cabinClass || ''}
              />
            </div>

            {/* Departure */}
            <div className="flex-1">
              <FlightPoint
                time={flight.departure?.time}
                airportCode={flight.departure?.airportCode}
                date={flight.departure?.date}
              />
            </div>

            {/* Duration & Stops */}
            <div className="flex-[1.5]">
              <DurationStops duration={flight.duration || 0} stopDetails={stopDetails} />
            </div>

            {/* Arrival */}
            <div className="flex-1">
              <FlightPoint
                time={flight.arrival?.time}
                airportCode={flight.arrival?.airportCode}
                date={flight.arrival?.date}
              />
            </div>

            {/* Price & Action */}
            <div className="flex-1 flex justify-end">
              <PriceAction
                price={price}
                isLoading={isLoading}
                isSelected={isSelected}
                onSelect={handleSelectClick}
              />
            </div>
          </div>

          {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
            <p className="mt-2 text-xs font-semibold text-destructive">Seats left: {seatsLeft}</p>
          )}

          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={setFareIndex} />

          {/* Footer with Refundable Row */}
          <FlightCardFooter
            refundable={activeFare.refundable}
            checkInBaggage={activeFare.checkInBaggage}
            cabinBaggage={activeFare.cabinBaggage}
          />
        </div>
      </div>

      {showFlightDetailsModal && selectedFlightDetails && (
        <MultiFlightDetailsModal
          isOpen={showFlightDetailsModal}
          onClose={() => setShowFlightDetailsModal(false)}
          flightDetails={selectedFlightDetails}
        />
      )}

      {showFareDetailsModal && selectedFareDetails && (
        <MultiFareDetailsCard
          isOpen={showFareDetailsModal}
          onClose={() => {
            setShowFareDetailsModal(false);
            setSelectedFareDetails(null);
          }}
          flightDetails={selectedFareDetails}
          segmentId={selectedSegmentId}
          fromLocation={{
            code: flight.departure?.airportCode || '',
            city: flight.departure?.city || flight.departure?.airportCode || '',
          }}
          toLocation={{
            code: flight.arrival?.airportCode || '',
            city: flight.arrival?.city || flight.arrival?.airportCode || '',
          }}
          travelDate={flight.departure?.date}
        />
      )}
    </>
  );
}
