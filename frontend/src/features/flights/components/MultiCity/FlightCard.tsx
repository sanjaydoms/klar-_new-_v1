import { useState } from 'react';
import { FlightOption } from '../../types/types.multiCityFlight';
import MultiFlightDetailsModal from './MultiFlightDetailsModalProps';
import MultiFareDetailsCard from './MultiFareDetailsCard';
import { getMultiCityFareDetails } from '@/api/flightService.api';
import { Button } from '@/components/ui/button';
import FareVariantRows from '../FareVariantRows';
import FlightCardRoute from '../FlightCardRoute';
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



const getStopDisplay = (stopDetails: any) => {
  if (!stopDetails) return 'Non-stop';
  if (stopDetails.count === 0) return 'Non-stop';
  if (stopDetails.count === 1) {
    const stopCity = stopDetails.stopCities?.[0] || '';
    return `1 Stop via ${stopCity}`;
  }
  return `${stopDetails.count} Stops`;
};


/**
 * Sub-components - MATCHING OneWay exactly
 */
interface PriceActionProps {
  price: number;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

const PriceAction = ({ price, isLoading, isSelected, onSelect }: PriceActionProps) => {
  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-xl font-bold text-primary">
        ₹ {price != null ? Math.round(price).toLocaleString('en-IN') : '0'}
      </p>
      <p className="-mt-1 text-xs text-gray-500">per adult</p>
      <Button
        onClick={onSelect}
        disabled={isLoading}
        className={`mt-1 h-10 w-full rounded-lg px-7 text-[13px] font-semibold ${
          isSelected
            ? 'bg-secondary text-primary hover:bg-secondary/80'
            : 'bg-primary text-white hover:bg-primary/90'
        }`}
      >
        {isLoading ? 'Loading...' : isSelected ? 'Selected ✓' : 'Select'}
      </Button>
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
        className={`overflow-hidden rounded-2xl border bg-card shadow-[0_10px_30px_-24px_rgba(15,30,77,0.5)] transition-shadow duration-300 hover:shadow-md ${
          isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-border'
        }`}
      >
        <div className="px-5 pt-5">
          <div className="flex items-start gap-6">
            <FlightCardRoute
              airline={flight.airline?.name || ''}
              airlineCode={flight.airline?.code}
              flightNumber={flight.flightNumber}
              cabinClass={flight.cabinClass}
              aircraftTypes={activeFare.aircraftTypes}
              from={{
                time: flight.departure?.time,
                airportCode: flight.departure?.airportCode,
                city: flight.departure?.city,
                date: flight.departure?.date,
                terminal: activeFare.departure?.terminal,
              }}
              to={{
                time: flight.arrival?.time,
                airportCode: flight.arrival?.airportCode,
                city: flight.arrival?.city,
                date: flight.arrival?.date,
                terminal: activeFare.arrival?.terminal,
              }}
              duration={formatDuration(flight.duration || 0)}
              stopsLabel={getStopDisplay(stopDetails)}
            />

            <div className="w-[185px] shrink-0 border-l border-border pl-5">
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
