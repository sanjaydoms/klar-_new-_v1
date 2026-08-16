import { useState } from 'react';
import FareDetailsCard from './FareDetailsCard';
import FlightDetailsModal from '../FlightDetailsModal';
import FareVariantRows from '../FareVariantRows';
import FlightCardFooter from '../FlightCardFooter';
import { formatAircraft, formatTerminal } from '../../utils/flightDisplay';
import { FlightData } from '../../types/types.oneWayFlight';
import { getOnewayFareDetails } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';
import { Button } from '@/components/ui/button';

interface OneWayFlightCardProps {
  flight: FlightData;
  /** Fare variants of this physical flight (incl. `flight`), cheapest first. */
  variants?: FlightData[];
  isExpanded: boolean;
  onToggleExpand: (flightId: string) => void;
}

// Helper functions
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
 * Sub-components
 */
interface AirlineInfoProps {
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabinClass: string;
  aircraft?: string;
}

const AirlineInfo = ({
  airline,
  airlineCode,
  flightNumber,
  cabinClass,
  aircraft,
}: AirlineInfoProps) => {
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
        {aircraft && <p className="text-xs text-gray-400">Aircraft {aircraft}</p>}
      </div>
    </div>
  );
};

interface FlightPointProps {
  time: string;
  airportCode: string;
  date: string;
  terminal?: string;
}

const FlightPoint = ({ time, airportCode, date, terminal }: FlightPointProps) => {
  return (
    <div className="text-center">
      <p className="text-lg font-bold">
        {airportCode || 'N/A'}
        {terminal && <span className="ml-1 text-xs font-medium text-gray-500">{terminal}</span>}
      </p>
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
  onSelect: () => void;
}

const PriceAction = ({ price, isLoading, onSelect }: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="text-right">
        <p className="font-display text-2xl font-medium text-primary">₹ {price?.toFixed(0) || '0'}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">PER ADULT</p>
      </div>
      <div className="flex flex-col items-end gap-1 w-full">
        <Button variant="accent" onClick={onSelect} disabled={isLoading} className="w-full px-8 sm:w-auto">
          {isLoading ? 'Loading...' : 'Select'}
        </Button>
      </div>
    </div>
  );
};


/**
 * Main Component
 */
export default function OneWayFlightCard({
  flight,
  variants,
  isExpanded: _isExpanded,
  onToggleExpand: _onToggleExpand,
}: OneWayFlightCardProps) {
  const fares = variants && variants.length > 0 ? variants : [flight];
  const [fareIndex, setFareIndex] = useState(0);
  // The chosen fare drives price, fareId/flightKey and the booking flow.
  const activeFare = fares[Math.min(fareIndex, fares.length - 1)] ?? flight;
  const arrivesNextDay =
    !!flight.from?.date && !!flight.to?.date && flight.from.date !== flight.to.date;
  const seatsLeft = (activeFare as any).seatsRemaining;
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [flightDetails, setFlightDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFare, setSelectedFare] = useState<any>(null);
  const [showFareCard, setShowFareCard] = useState(false);

  const handleDisplayFare = async () => {
    try {
      setIsLoading(true);

      const sessionId = sessionStorage.getItem('onewayFlightSessionId');
      const flightKey = activeFare.flightKey || activeFare.segmentId || activeFare.id;

      if (!flightKey) {
        setSelectedFare(activeFare);
        setShowFareCard(true);
        return;
      }

      if (!sessionId) {
        notifyError('Session expired. Please search for flights again.');
        return;
      }

      const payload = {
        sessionId: sessionId,
        flightKey: flightKey,
      };

      const response = await getOnewayFareDetails(payload);

      if (response && response.success === false) {
        setSelectedFare(activeFare);
        setShowFareCard(true);
      } else {
        setSelectedFare(response);
        setShowFareCard(true);
      }
    } catch (error) {
      console.error('Error fetching fare details:', error);
      setSelectedFare(activeFare);
      setShowFareCard(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = () => {
    setShowDetailsModal(true);
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border border-l-[3px] border-l-accent bg-card shadow-md transition-shadow duration-300 hover:shadow-lg">
        {/* Main Flight Info */}
        <div className="p-4 pb-0">
          {' '}
          {/* Changed: removed bottom padding */}
          <div className="flex items-center justify-between gap-4">
            {/* Airline Info */}
            <div className="flex-1">
              <AirlineInfo
                airline={flight.airline}
                airlineCode={flight.airlineCode || ''}
                flightNumber={flight.flightNumber}
                cabinClass={flight.cabinClass}
                aircraft={formatAircraft((flight as any).aircraftTypes)}
              />
            </div>

            {/* Departure */}
            <div className="flex-1">
              <FlightPoint
                time={flight.from?.time}
                airportCode={flight.from?.airportCode}
                date={flight.from?.date}
                terminal={formatTerminal(flight.from?.terminal)}
              />
            </div>

            {/* Duration & Stops */}
            <div className="flex-[1.5]">
              <DurationStops duration={flight.duration} stopDetails={flight.stopDetails} />
            </div>

            {/* Arrival */}
            <div className="flex-1">
              <FlightPoint
                time={flight.to?.time}
                airportCode={flight.to?.airportCode}
                date={flight.to?.date}
                terminal={formatTerminal(flight.to?.terminal)}
              />
            </div>

            {/* Price & Action */}
            <div className="flex-1 flex justify-end">
              <PriceAction
                price={activeFare.price}
                isLoading={isLoading}
                onSelect={handleDisplayFare}
              />
            </div>
          </div>
          {(arrivesNextDay || (typeof seatsLeft === 'number' && seatsLeft <= 6)) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {arrivesNextDay && (
                <span className="font-medium text-gray-400">✈ Arrives next day</span>
              )}
              {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
                <span className="font-semibold text-destructive">Seats left: {seatsLeft}</span>
              )}
            </div>
          )}
          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={setFareIndex} />
          {/* Footer with Refundable Row - No margin, minimal padding */}
          <FlightCardFooter
            refundable={(activeFare as any).refundable}
            checkInBaggage={(activeFare as any).checkInBaggage}
            cabinBaggage={(activeFare as any).cabinBaggage}
          />
        </div>
      </div>

      {/* Fare Details Card */}
      {showFareCard && selectedFare && (
        <FareDetailsCard
          fare={selectedFare}
          airlineName={flight.airline}
          onClose={() => setShowFareCard(false)}
          onConfirm={() => {
            setShowFareCard(false);
          }}
          flightType="departure"
          flowType="SEARCH"
        />
      )}

      {/* Flight Details Modal */}
      <FlightDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        flightDetails={flightDetails}
      />
    </>
  );
}
