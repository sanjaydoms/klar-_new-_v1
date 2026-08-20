import { Flight } from '../../types/types.returnFlight';
import { useState } from 'react';
import ReturnFareDetailsCard from './ReturnFareDetailsCard';
import FareVariantRows from '../FareVariantRows';
import FlightCardRoute from '../FlightCardRoute';
import FlightCardFooter from '../FlightCardFooter';
import { getReturnFareDetails } from '@/api/flightService.api';
import FareSelectModal, { mapDetailedFare, getPaxText } from '../modals/FareSelectModal';
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


interface PriceActionProps {
  price: number;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

const PriceAction = ({ price, isLoading, isSelected, onSelect, onDeselect }: PriceActionProps) => {
  return (
    <div className="flex w-full items-end justify-between gap-3">
      <div>
        <p className="text-lg font-bold text-primary">
          ₹ {price != null ? Math.round(price).toLocaleString('en-IN') : '0'}
        </p>
        <p className="text-[10px] tracking-wide text-gray-500 uppercase">Per adult</p>
      </div>
      <Button
        onClick={isSelected ? onDeselect : onSelect}
        disabled={isLoading}
        className={`h-10 rounded-lg px-6 text-[13px] font-semibold ${
          isSelected
            ? 'bg-secondary text-primary hover:bg-secondary/80'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {isLoading ? 'Loading...' : isSelected ? 'Selected' : 'Select'}
      </Button>
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
  const [showFareSelect, setShowFareSelect] = useState(false);
  // The fare picked in the chooser; ReturnFareDetailsCard auto-continues with it.
  const [pendingFareId, setPendingFareId] = useState<string | null>(null);
  const [fullFares, setFullFares] = useState<any[] | null>(null);
  const [isLoadingFares, setIsLoadingFares] = useState(false);
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

  const fareKeyOf = (fare: any) => fare.segmentId || fare.flightId || fare.flightKey;

  /** The pre-chooser booking path, now parameterised on the chosen fare. */
  const proceedWithFare = async (fare: any) => {
    setPendingFareId(fare?.fareId ?? null);
    setIsLoading(true);
    try {
      const sessionId = sessionStorage.getItem('returnFlightSessionId');
      const flightKey = fareKeyOf(fare);

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
        onSelect(fare);
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
  };

  /**
   * The search keeps only the cheapest fare of each supplier entry, so the
   * chooser opens on the variants instantly and upgrades to the complete
   * per-entry fare lists from the fare endpoint (same pattern as one-way).
   */
  const openFareSelect = async () => {
    setShowFareSelect(true);
    if (fullFares) return;

    const sessionId = sessionStorage.getItem('returnFlightSessionId');
    if (!sessionId) return;

    setIsLoadingFares(true);
    try {
      const segment = type === 'return' ? 'RETURN' : 'ONWARD';
      const keyed = fares
        .map((f: any) => ({ base: f, key: fareKeyOf(f) }))
        .filter((x: any) => x.key);
      const uniq = [...new Map(keyed.map((x: any) => [x.key, x])).values()] as any[];
      const results = await Promise.all(
        uniq.map((x: any) =>
          getReturnFareDetails({ sessionId, flightKey: x.key, segment }).catch(() => null),
        ),
      );
      const merged: any[] = [];
      const seen = new Set<string>();
      results.forEach((res: any, i) => {
        const data = res?.data || res;
        (data?.fares || []).forEach((raw: any) => {
          const mapped = mapDetailedFare(raw, uniq[i].key, uniq[i].base);
          if (mapped && mapped.price != null && !seen.has(mapped.fareId)) {
            seen.add(mapped.fareId);
            merged.push(mapped);
          }
        });
      });
      if (merged.length >= fares.length) {
        merged.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        setFullFares(merged);
      }
    } finally {
      setIsLoadingFares(false);
    }
  };

  const handleSelectClick = () => {
    if (isSelected) {
      onDeselect();
      setShowFareDetailsPopup(false);
      setFlightDetailsData(null);
    } else {
      openFareSelect();
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
        className={`overflow-hidden rounded-2xl border bg-card shadow-[0_10px_30px_-24px_rgba(15,30,77,0.5)] transition-shadow duration-300 hover:shadow-md ${
          isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
        }`}
      >
        <div className="px-4 pt-4">
          {/* The return columns are narrow, so the route stacks. */}
          <FlightCardRoute
            dense
            airline={
              typeof flight.airline === 'string' ? flight.airline : flight.airline?.name || 'N/A'
            }
            airlineCode={flight.airlineCode}
            flightNumber={flight.flightNumber}
            cabinClass={cabinClass || 'Economy'}
            aircraftTypes={activeFare.aircraftTypes}
            from={{
              time: departureTime,
              airportCode: departureAirportCode,
              city: activeFare.departure?.airport,
              date: departureDate,
              terminal: activeFare.departure?.terminal,
            }}
            to={{
              time: arrivalTime,
              airportCode: arrivalAirportCode,
              city: activeFare.arrival?.airport,
              date: arrivalDate,
              terminal: activeFare.arrival?.terminal,
            }}
            duration={duration}
            stopsLabel={getStopDisplay(flight.stopDetails || { count: flight.stops || 0 })}
          />

          <div className="mt-3 flex items-end justify-between gap-3 border-t border-border pt-3">
            <PriceAction
              price={cheapestFare}
              isLoading={isLoading}
              isSelected={isSelected}
              onSelect={handleSelectClick}
              onDeselect={handleSelectClick}
            />
          </div>

          {typeof seatsLeft === 'number' && seatsLeft <= 6 && (
            <p className="mt-2 text-xs font-semibold text-destructive">Seats left: {seatsLeft}</p>
          )}

          <FareVariantRows fares={fares} activeIndex={fareIndex} onSelectFare={handleFareChange} />

          <FlightCardFooter
            refundable={activeFare.refundable}
            checkInBaggage={activeFare.checkInBaggage}
            cabinBaggage={activeFare.cabinBaggage}
          />
        </div>
      </div>

      <FareSelectModal
        isOpen={showFareSelect}
        onClose={() => setShowFareSelect(false)}
        flight={flight}
        fares={fullFares ?? fares}
        paxText={getPaxText()}
        isLoading={isLoading}
        isLoadingFares={isLoadingFares}
        onBookFare={(fare) => {
          setShowFareSelect(false);
          proceedWithFare(fare);
        }}
      />

      {showFareDetailsPopup && flightDetailsData && isReturnFlightSearch && (
        <ReturnFareDetailsCard
          initialFareId={pendingFareId ?? undefined}
          fare={flightDetailsData}
          onClose={handleClosePopup}
          onConfirm={handleConfirmFare}
          flightType={type}
        />
      )}
    </>
  );
}
