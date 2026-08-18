import { useState } from 'react';
import { Heart, Plane, Clock } from 'lucide-react';
import FareDetailsCard from './FareDetailsCard';
import FareSelectModal, { mapDetailedFare, getPaxText } from '../modals/FareSelectModal';
import FlightDetailsModal from '../FlightDetailsModal';
import FareVariantRows from '../FareVariantRows';
import { refundableTone, formatBaggage } from '../FlightCardFooter';
import { CheckCircle, AlertCircle } from 'lucide-react';
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
      <div className="flex flex-col items-start gap-1">
        <p className="text-[15px] font-semibold leading-tight text-primary">{airline || 'N/A'}</p>
        {flightNumber && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            {flightNumber}
          </span>
        )}
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <Plane className="h-3 w-3 text-gray-400" />
          {cabinClassDisplay}
        </p>
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
  const alignCls = align === 'right' ? 'items-end text-right' : 'items-start text-left';
  return (
    <div className={'flex flex-col gap-1 ' + alignCls}>
      <span className="rounded-lg bg-[#1A1F4D] px-3 py-1.5 text-sm font-bold tracking-wide text-white">
        {formatTime(time)}
      </span>
      <p className="text-[15px] font-bold text-primary">
        {airportCode || 'N/A'}
        {terminal && <span className="ml-1.5 text-[11px] font-medium text-gray-400">{terminal}</span>}
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
      <p className="mb-1.5 flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3.5 w-3.5 text-gray-400" />
        {formatDuration(duration)}
      </p>

      <div className="relative flex w-full items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <span className="mx-1 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
          <Plane className="h-3.5 w-3.5 rotate-45 text-primary" />
        </span>
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>

      <p className="mt-1.5 text-xs font-semibold text-[var(--color-brand-red)]">{stopDisplay}</p>
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
    <div className="flex flex-col gap-2 sm:items-end">
      <div className="flex items-baseline gap-2 sm:flex-col sm:items-end sm:gap-0">
        <p className="text-xl font-bold text-primary">
          ₹ {price != null ? Math.round(price).toLocaleString('en-IN') : '0'}
        </p>
        <p className="text-xs text-gray-500">per adult</p>
      </div>
      <div className="mt-1 flex w-full flex-row items-stretch gap-2 sm:flex-col">
        <Button
          variant="outline"
          onClick={onViewDetails}
          className="h-10 w-full rounded-lg border-border px-4 text-[13px] font-medium text-primary"
        >
          View Details
        </Button>
        <Button
          onClick={onSelect}
          disabled={isLoading}
          className="h-10 w-full rounded-lg bg-primary px-7 text-[13px] font-semibold text-white hover:bg-primary/90"
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
  const [showFareSelect, setShowFareSelect] = useState(false);
  // The fare picked in the chooser; FareDetailsCard auto-continues with it.
  const [pendingFareId, setPendingFareId] = useState<string | null>(null);
  const [fullFares, setFullFares] = useState<any[] | null>(null);
  const [isLoadingFares, setIsLoadingFares] = useState(false);

  /**
   * The search response keeps only the CHEAPEST fare of each supplier entry
   * (~70% of fares are dropped). The fare endpoint returns an entry's complete
   * totalPriceList, so the chooser opens on the search variants instantly and
   * upgrades to the full list as soon as every variant's entry is fetched.
   */
  const openFareSelect = async () => {
    setShowFareSelect(true);
    if (fullFares) return; // already fetched for this card

    const sessionId = sessionStorage.getItem('onewayFlightSessionId');
    if (!sessionId) return; // chooser still works on the search variants

    setIsLoadingFares(true);
    try {
      const keys = [...new Set(fares.map((f: any) => f.flightKey).filter(Boolean))];
      const results = await Promise.all(
        keys.map((k) =>
          getOnewayFareDetails({ sessionId, flightKey: k as string }).catch(() => null),
        ),
      );
      const merged: any[] = [];
      const seen = new Set<string>();
      results.forEach((res: any, i) => {
        const data = res?.data || res;
        (data?.fares || []).forEach((raw: any) => {
          const mapped = mapDetailedFare(raw, keys[i] as string, flight);
          if (mapped && mapped.price != null && !seen.has(mapped.fareId)) {
            seen.add(mapped.fareId);
            merged.push(mapped);
          }
        });
      });
      // Only upgrade when the fetch genuinely knows more than the search did.
      if (merged.length >= fares.length) {
        merged.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        setFullFares(merged);
      }
    } finally {
      setIsLoadingFares(false);
    }
  };

  const handleDisplayFare = async (fareToBook?: any) => {
    const fare = fareToBook ?? activeFare;
    setPendingFareId(fareToBook?.fareId ?? null);
    try {
      setIsLoading(true);

      const sessionId = sessionStorage.getItem('onewayFlightSessionId');
      const flightKey = fare.flightKey || fare.segmentId || fare.id;

      if (!flightKey) {
        setSelectedFare(fare);
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
        if (fareToBook) {
          // The chooser picked a fare but the session is gone — say so instead
          // of mounting the legacy card with nothing to show.
          notifyError('This fare is no longer available. Please search again.');
          return;
        }
        setSelectedFare(fare);
        setShowFareCard(true);
      } else {
        setSelectedFare(response);
        setShowFareCard(true);
      }
    } catch (error) {
      console.error('Error fetching fare details:', error);
      if (fareToBook) {
        notifyError('This fare is no longer available. Please search again.');
        return;
      }
      setSelectedFare(fare);
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

        <div className="px-4 pt-4 sm:px-5 sm:pt-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="shrink-0 lg:w-[170px]">
              <AirlineInfo
                airline={flight.airline}
                airlineCode={flight.airlineCode || ''}
                flightNumber={flight.flightNumber}
                cabinClass={flight.cabinClass}
                aircraft={formatAircraft((flight as any).aircraftTypes)}
              />
            </div>

            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 sm:gap-4 lg:pr-4">
              <FlightPoint
                time={flight.from?.time}
                airportCode={flight.from?.airportCode}
                date={flight.from?.date}
                terminal={formatTerminal(flight.from?.terminal)}
                city={(flight.from as any)?.city}
              />

              <div className="min-w-[90px] flex-1 pt-1 sm:min-w-[110px]">
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

            <div className="shrink-0 border-t border-border pt-4 lg:w-[190px] lg:border-t-0 lg:border-l lg:pl-5 lg:pt-0">
              <PriceAction
                price={activeFare.price}
                isLoading={isLoading}
                onSelect={openFareSelect}
                onViewDetails={handleViewDetails}
              />
            </div>
          </div>

          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={setFareIndex} />

          {/* Footer strip per the results design: next-day marker, the fare's
              refundability as a toned pill, and its baggage allowance. Values
              come from the ACTIVE fare's search data — anything the supplier
              did not state is omitted, never defaulted. Seats-left is ours. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-100 py-3 text-xs">
            {arrivesNextDay && (
              <span className="flex items-center gap-1.5 font-medium text-gray-500">
                <Plane className="h-3.5 w-3.5 text-gray-400" />
                Arrives next day
              </span>
            )}

            {(() => {
              const label = (activeFare as any).refundable?.trim();
              const tone = refundableTone(label);
              if (!tone) return null;
              const isBad = tone === 'text-destructive';
              const pill = isBad
                ? 'border-red-200 bg-red-50 ' + tone
                : tone === 'text-amber-600'
                  ? 'border-amber-200 bg-amber-50 ' + tone
                  : 'border-green-200 bg-green-50 ' + tone;
              return (
                <span
                  className={'flex items-center gap-1 rounded-full border px-3 py-1 font-semibold uppercase tracking-wide ' + pill}
                >
                  {isBad ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  {label}
                </span>
              );
            })()}

            {(() => {
              const baggage = formatBaggage(
                (activeFare as any).checkInBaggage,
                (activeFare as any).cabinBaggage,
              );
              if (!baggage) return null;
              return (
                <span
                  className="flex items-center gap-1.5 text-gray-600"
                  title="Check-in / cabin baggage"
                >
                  <img src="/logo/luggage.png" alt="" className="h-4 w-4 object-contain" />
                  {baggage}
                </span>
              );
            })()}

            {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
              <span className="ml-auto font-semibold text-[var(--color-brand-red)]">
                Seats left: {seatsLeft}
              </span>
            )}
          </div>
        </div>
      </div>

      <FareSelectModal
        paxText={getPaxText()}
        isOpen={showFareSelect}
        onClose={() => setShowFareSelect(false)}
        flight={flight}
        fares={fullFares ?? fares}
        isLoadingFares={isLoadingFares}
        isLoading={isLoading}
        onBookFare={(fare) => {
          setShowFareSelect(false);
          handleDisplayFare(fare);
        }}
      />

      {/* Fare Details Card */}
      {showFareCard && selectedFare && (
        <FareDetailsCard
          initialFareId={pendingFareId ?? undefined}
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
