import { Plane, Loader2, AlertCircle, Clock } from 'lucide-react';
import { InternationalItinerary, InternationalFlightLeg } from '../../types/types.multiCityFlight';
import { useState } from 'react';
import { agreedValue, formatBaggage, refundableTone } from '../FlightCardFooter';
import { getMultiCityFareDetails } from '@/api/flightService.api';
import InternationalMultiFareDetailsCard from './InternationalMultiFareDetailsCard';

interface InternationalMultiFlightComboCardProps {
  itinerary: InternationalItinerary;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
  onFareRuleLoaded?: (fareRuleData: any, flightType: string, fareId: string) => void;
  isReturnFlightSearch?: boolean;
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

const getStopDisplay = (stops: number) => {
  if (stops === 0) return 'Non-stop';
  if (stops === 1) return '1 Stop';
  return `${stops} Stops`;
};

const getCabinClassDisplay = (cabinClass?: string) => {
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
  cabinClass?: string;
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
  stops: number;
}

const DurationStops = ({ duration, stops }: DurationStopsProps) => {
  const stopDisplay = getStopDisplay(stops);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full flex items-center justify-center px-2">
        <div className="w-full border-t-2 border-gray-300 border-dashed"></div>
        <div className="absolute bg-white px-2 flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-1">{stopDisplay}</p>
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
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">TOTAL FOR ALL</p>
      </div>
      <div className="flex flex-col items-end gap-1 w-full">
        <button
          onClick={onSelect}
          disabled={isLoading}
          className={`bg-blue-950 text-white px-8 py-1.5 rounded text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto ${
            isSelected ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-950 hover:bg-blue-800'
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : isSelected ? (
            'Selected ✓'
          ) : (
            'Select'
          )}
        </button>
      </div>
    </div>
  );
};

interface FooterInfoProps {
  legCount: number;
  /** Agreed across the legs, or undefined when they differ — never guessed. */
  refundable?: string | undefined;
  baggage?: string | undefined;
  onViewDetails?: () => void;
}

const FooterInfo = ({ legCount, refundable, baggage, onViewDetails }: FooterInfoProps) => {
  const tone = refundableTone(refundable);
  return (
    <div className="mt-2 pb-2 pt-2 px-4 -mx-4 border-t border-amber-200/60 flex items-center justify-between text-xs bg-gradient-to-r from-rose-50 to-amber-100">
      <div className="flex items-center gap-4">
        {tone && <span className={`font-medium uppercase ${tone}`}>{refundable}</span>}
        {tone && <span className="text-gray-400">|</span>}
        <span className="text-gray-600">
          {legCount} Leg{legCount > 1 ? 's' : ''}
        </span>
        {baggage && (
          <>
            <span className="text-gray-400">|</span>
            <span className="text-gray-600" title="Check-in / cabin baggage">
              {baggage}
            </span>
          </>
        )}
      </div>

      <button
        onClick={onViewDetails}
        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
      >
        Flight Details
      </button>
    </div>
  );
};

/**
 * Main Component
 */
export default function InternationalMultiFlightComboCard({
  itinerary,
  isSelected,
  onSelect,
  onDeselect,
  onFareRuleLoaded,
}: InternationalMultiFlightComboCardProps) {
  const [showFareDetailsPopup, setShowFareDetailsPopup] = useState(false);
  const [flightDetailsData, setFlightDetailsData] = useState<any>(null);
  const [isLoadingFareOptions, setIsLoadingFareOptions] = useState(false);
  const [fareSelectionError, setFareSelectionError] = useState<string | null>(null);
  const [selectedLegIndex, setSelectedLegIndex] = useState<number>(0);

  const { itineraryKey, totalPrice, legs } = itinerary;
  const firstLeg = legs[0];
  const lastLeg = legs[legs.length - 1];
  const totalStops = legs.reduce((sum, leg) => sum + (leg.stops || 0), 0);
  const totalDuration = legs.reduce((sum, leg) => sum + (leg.duration || 0), '');

  const getAirlineLogo = (airlineCode: string) => {
    if (!airlineCode) return null;
    return `/airline-logos/${airlineCode}.png`;
  };

  const handleSelectClick = async () => {
    if (isSelected) {
      onDeselect();
      setShowFareDetailsPopup(false);
      setFlightDetailsData(null);
      setFareSelectionError(null);
    } else {
      await loadFareDetailsForLeg(0);
    }
  };

  const loadFareDetailsForLeg = async (legIndex: number) => {
    setIsLoadingFareOptions(true);
    setFareSelectionError(null);
    setSelectedLegIndex(legIndex);

    try {
      const sessionId = sessionStorage.getItem('multiCitySessionId');
      const leg = legs[legIndex];

      if (!sessionId || !leg) {
        setFareSelectionError('Flight information missing');
        onDeselect();
        return;
      }

      const legIndices = legs.map((_, idx) => idx);

      const fareDetailsResponse = await getMultiCityFareDetails({
        sessionId,
        legIndex: legIndices,
        flightKey: leg.flightKey,
      });

      if (fareDetailsResponse?.success !== false && fareDetailsResponse?.data) {
        setFlightDetailsData({
          data: fareDetailsResponse.data,
          flightType: 'multiCity',
          flight: leg,
          itinerary: itinerary,
        });
        setShowFareDetailsPopup(true);
      } else {
        setFareSelectionError(
          fareDetailsResponse?.message || 'Unable to load fare details. Please try again.',
        );
        onDeselect();
      }
    } catch (error: any) {
      console.error('Error loading fare details:', error);
      setFareSelectionError('Flight not found, search another.');
      onDeselect();
    } finally {
      setIsLoadingFareOptions(false);
    }
  };

  const handleClosePopup = () => {
    setShowFareDetailsPopup(false);
    setFlightDetailsData(null);
    setFareSelectionError(null);
  };

  const handleConfirmFare = (selectedFareId: string, selectedFareDetails: any) => {
    const fromCode = legs[0]?.from?.airportCode || '';
    const toCode = legs[0]?.to?.airportCode || '';
    const fromCity = legs[0]?.from?.city || '';
    const toCity = legs[0]?.to?.city || '';

    const selection = {
      fromLocation: { code: fromCode, city: fromCity },
      toLocation: { code: toCode, city: toCity },
      selectedFareId: selectedFareId,
      fareType: selectedFareDetails?.FareIdentifierType || 'STANDARD',
      totalFare:
        selectedFareDetails?.FareDetails?.AdultFare?.FareComponents?.TotalFare || totalPrice,
      currency: 'INR',
      itinerary: itinerary,
      selectedFareDetails: selectedFareDetails,
    };

    const existingSelections = sessionStorage.getItem('selectedMultiCityFares');
    let selections = existingSelections ? JSON.parse(existingSelections) : [];

    selections = selections.filter(
      (s: any) => !(s.fromLocation?.code === fromCode && s.toLocation?.code === toCode),
    );

    selections.push(selection);
    sessionStorage.setItem('selectedMultiCityFares', JSON.stringify(selections));

    const fareIds = selections.map((s: any) => s.selectedFareId);
    sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));

    window.dispatchEvent(new Event('selectedFaresUpdated'));
    window.dispatchEvent(new CustomEvent('fareIdsUpdated', { detail: fareIds }));

    if (onFareRuleLoaded) {
      onFareRuleLoaded(selectedFareDetails, 'multiCity', selectedFareId);
    }

    onSelect();
    setShowFareDetailsPopup(false);
    setFlightDetailsData(null);
  };

  const handleViewDetails = () => {
    // Handle flight details view
    console.log('View flight details');
  };

  return (
    <>
      <div className="bg-white border border-2 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100 overflow-hidden">
        <div className="p-4 pb-0">
          <div className="flex items-center justify-between gap-4">
            {/* Airline Info - Show first leg airline */}
            <div className="flex-1">
              <AirlineInfo
                airline={firstLeg?.airline || 'Unknown'}
                airlineCode={firstLeg?.airlineCode || ''}
                flightNumber={firstLeg?.flightNumber || 'N/A'}
                cabinClass={firstLeg?.cabinClass || 'Economy'}
              />
            </div>

            {/* Departure - First leg departure */}
            <div className="flex-1">
              <FlightPoint
                time={firstLeg?.from?.time || ''}
                airportCode={firstLeg?.from?.airportCode || 'N/A'}
                date={firstLeg?.from?.date || ''}
              />
            </div>

            {/* Duration & Stops */}
            <div className="flex-[1.5]">
              <DurationStops duration={totalDuration} stops={totalStops} />
            </div>

            {/* Arrival - Last leg arrival */}
            <div className="flex-1">
              <FlightPoint
                time={lastLeg?.to?.time || ''}
                airportCode={lastLeg?.to?.airportCode || 'N/A'}
                date={lastLeg?.to?.date || ''}
              />
            </div>

            {/* Price & Action */}
            <div className="flex-1 flex justify-end">
              <PriceAction
                price={totalPrice}
                isLoading={isLoadingFareOptions}
                isSelected={isSelected}
                onSelect={handleSelectClick}
              />
            </div>
          </div>

          {/* Footer with Refundable Row */}
          <FooterInfo
            legCount={legs.length}
            refundable={agreedValue(legs.map((l) => l.refundable))}
            baggage={formatBaggage(
              agreedValue(legs.map((l) => l.checkInBaggage)),
              agreedValue(legs.map((l) => l.cabinBaggage)),
            )}
            onViewDetails={handleViewDetails}
          />
        </div>
      </div>

      {showFareDetailsPopup && flightDetailsData && (
        <InternationalMultiFareDetailsCard
          isOpen={showFareDetailsPopup}
          onClose={handleClosePopup}
          flightDetails={flightDetailsData}
          onConfirm={handleConfirmFare}
          fromLocation={{
            code: legs[0]?.from?.airportCode || '',
            city: legs[0]?.from?.city || '',
          }}
          toLocation={{
            code: legs[0]?.to?.airportCode || '',
            city: legs[0]?.to?.city || '',
          }}
        />
      )}
    </>
  );
}
