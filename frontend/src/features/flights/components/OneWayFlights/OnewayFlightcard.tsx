import { useState } from 'react';
import { Heart, Plane } from 'lucide-react';
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
      const dateObj = new Date(parseInt('20' + year), monthIndex, parseInt(day as string));
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      // "Sun, 16 Aug 2026" — the results design's format.
      return `${dayName}, ${day} ${month} 20${year}`;
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
    <div className="flex items-start gap-3">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
        {airlineLogo ? (
          <img
            src={airlineLogo}
            alt={airline}
            className="h-9 w-9 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-bold text-primary">${airlineCode || airline?.substring(0, 2)}</span>`;
            }}
          />
        ) : (
          <span className="text-sm font-bold text-primary">
            {airlineCode || airline?.substring(0, 2) || 'NA'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-primary">{airline || 'N/A'}</p>
        <p className="text-xs text-gray-500">{flightNumber || 'N/A'}</p>
        <p className="text-xs text-gray-500">{cabinClassDisplay}</p>
        {/* Aircraft is ours, not in the mockup — it is one of the TripJack
            fields the search response carries. */}
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
  city?: string;
  align?: 'left' | 'right';
}

const FlightPoint = ({
  time,
  airportCode,
  date,
  terminal,
  city,
  align = 'left',
}: FlightPointProps) => {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-xl font-bold text-primary">{formatTime(time)}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-primary">
        {airportCode || 'N/A'}
        {terminal && <span className="ml-1 text-xs font-medium text-gray-400">{terminal}</span>}
      </p>
      {city && <p className="text-xs text-gray-500">{city}</p>}
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
    <div className="flex w-full flex-col items-center">
      <p className="mb-1.5 text-xs text-gray-500">{formatDuration(duration)}</p>

      <div className="relative flex w-full items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <Plane className="mx-1 h-4 w-4 rotate-90 text-primary" />
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <p className="mt-1.5 text-xs font-medium text-[var(--color-brand-red)]">{stopDisplay}</p>
    </div>
  );
};

interface PriceActionProps {
  price: number;
  isLoading: boolean;
  onSelect: () => void;
  onViewDetails: () => void;
}

const PriceAction = ({
  price,
  isLoading,
  onSelect,
  onViewDetails,
}: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-xl font-bold text-primary">₹ {price != null ? Math.round(price).toLocaleString('en-IN') : '0'}</p>
      <p className="-mt-1 text-xs text-gray-500">per adult</p>
      <div className="mt-1 flex w-full flex-col items-stretch gap-2 xl:flex-row xl:justify-end">
        <Button
          variant="outline"
          onClick={onViewDetails}
          className="h-10 w-full rounded-lg border-border px-4 text-[13px] font-medium text-primary xl:w-auto"
        >
          View Details
        </Button>
        <Button
          onClick={onSelect}
          disabled={isLoading}
          className="h-10 w-full rounded-lg bg-primary px-7 text-[13px] font-semibold text-white hover:bg-primary/90 xl:w-auto"
        >
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_10px_30px_-20px_rgba(15,30,77,0.45)] transition-shadow duration-300 hover:shadow-[0_16px_40px_-22px_rgba(15,30,77,0.5)]">
        <button
          type="button"
          aria-label="Save to wishlist"
          className="absolute right-4 top-4 text-gray-300 transition-colors hover:text-[var(--color-brand-red)]"
        >
          <Heart className="h-5 w-5" />
        </button>

        <div className="px-5 pt-5">
          <div className="flex items-start justify-between gap-6">
            <div className="w-[150px] shrink-0 xl:w-[180px]">
              <AirlineInfo
                airline={flight.airline}
                airlineCode={flight.airlineCode || ''}
                flightNumber={flight.flightNumber}
                cabinClass={flight.cabinClass}
                aircraft={formatAircraft((flight as any).aircraftTypes)}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-4 pr-4">
              <FlightPoint
                time={flight.from?.time}
                airportCode={flight.from?.airportCode}
                date={flight.from?.date}
                terminal={formatTerminal(flight.from?.terminal)}
                city={(flight.from as any)?.city}
              />

              <div className="min-w-[110px] flex-1 pt-1">
                <DurationStops duration={flight.duration} stopDetails={flight.stopDetails} />
              </div>

              <FlightPoint
                time={flight.to?.time}
                airportCode={flight.to?.airportCode}
                date={flight.to?.date}
                terminal={formatTerminal(flight.to?.terminal)}
                city={(flight.to as any)?.city}
                align="right"
              />
            </div>

            <div className="w-[185px] shrink-0 border-l border-border pl-5">
              <PriceAction
                price={activeFare.price}
                isLoading={isLoading}
                onSelect={handleDisplayFare}
                onViewDetails={handleViewDetails}
              />
            </div>
          </div>

          {/* Ours, from the search response rather than the mockup. */}
          {(arrivesNextDay || (typeof seatsLeft === 'number' && seatsLeft <= 6)) && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              {arrivesNextDay && (
                <span className="font-medium text-gray-500">✈ Arrives next day</span>
              )}
              {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
                <span className="font-semibold text-[var(--color-brand-red)]">
                  Seats left: {seatsLeft}
                </span>
              )}
            </div>
          )}

          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={setFareIndex} />

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
