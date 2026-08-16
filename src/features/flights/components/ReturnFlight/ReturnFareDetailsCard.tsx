import { X, Clock, Plane, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { getFareRule } from '../../../../api/flightService.api';
import ReturnFareRuleCard from './ReturnFareRuleCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ReturnFareDetailsCardProps {
  fare: any;
  onClose: () => void;
  onConfirm: (selectedFareId: string, selectedFareDetails: any) => void;
  flightType?: 'departure' | 'return';
}

// Helper to get cabin class display name
const getCabinDisplayName = (cabinClass: string): string => {
  if (!cabinClass) return 'Economy';
  const lower = cabinClass.toLowerCase();
  if (lower.includes('first')) return 'First Class';
  if (lower.includes('business')) return 'Business Class';
  if (lower.includes('premium') || lower.includes('premium economy')) return 'Premium Economy';
  if (lower.includes('economy')) return 'Economy';
  return cabinClass;
};

// Helper to get cabin class order for sorting
const getCabinOrder = (cabinClass: string): number => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('economy')) return 0;     
  if (lower.includes('premium')) return 1;     
  if (lower.includes('business')) return 2;   
  if (lower.includes('first')) return 3;      
  return 4;
};

// Helper to get color for cabin class
const getCabinColor = (cabinClass: string): string => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('first')) return 'amber';
  if (lower.includes('business')) return 'purple';
  if (lower.includes('premium')) return 'blue';
  if (lower.includes('economy')) return 'green';
  return 'gray';
};

// Helper to get description for cabin class
const getCabinDescription = (cabinClass: string): string => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('first')) return 'Ultimate luxury with exclusive services';
  if (lower.includes('business')) return 'Luxury experience with premium services';
  if (lower.includes('premium')) return 'Comfortable seating & priority check-in';
  if (lower.includes('economy')) return 'Affordable fares & value for money';
  return '';
};

export default function ReturnFareDetailsCard({
  fare,
  onClose,
  onConfirm,
  flightType,
}: ReturnFareDetailsCardProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareDetails, setSelectedFareDetails] = useState<any>(null);
  const [showFareRuleCard, setShowFareRuleCard] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<any>(null);
  const [loadingFareId, setLoadingFareId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.includes(sectionId);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const getStopText = (stops: number) => {
    if (stops === 0) return 'Non-stop';
    if (stops === 1) return '1 Stop';
    return `${stops} Stops`;
  };

  if (!fare?.data) return null;

  const { data } = fare;
  const segments = data?.segments || [];
  const fareOptions = data.fares || [];

  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];

  // Group fares by cabin class
  const groupedFares: { [key: string]: any[] } = {};

  fareOptions.forEach((fareOption: any) => {
    const adultFare =
      fareOption.FareDetails?.AdultFare || fareOption.passengerBreakup?.AdultFare || {};
    const cabinClass = adultFare.CabinClass || 'ECONOMY';
    const displayName = getCabinDisplayName(cabinClass);

    if (!groupedFares[displayName]) {
      groupedFares[displayName] = [];
    }
    groupedFares[displayName].push(fareOption);
  });

  // Sort cabin classes
  const sortedCabinNames = Object.keys(groupedFares).sort((a, b) => {
    return getCabinOrder(a) - getCabinOrder(b);
  });

  // Set active tab to first cabin class if not set
  if (sortedCabinNames.length > 0 && !activeTab) {
    setActiveTab(sortedCabinNames[0] as string);
  }

  // SVG helpers
  const GreenCheck = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="8" fill="#22c55e" fillOpacity="0.15" />
      <path
        d="M4.5 8l2.5 2.5 4.5-4.5"
        stroke="#22c55e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const RedCross = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
      <circle cx="8" cy="8" r="8" fill="#ef4444" fillOpacity="0.12" />
      <path
        d="M5.5 5.5l5 5M10.5 5.5l-5 5"
        stroke="#ef4444"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );

  const handleFareSelect = async (fareOption: any) => {
    setSelectedFareId(fareOption.fareId);
    setSelectedFareDetails(fareOption);
    setErrorBanner(null);

    // Fetch fare rules for the selected fare
    try {
      setLoadingFareId(fareOption.fareId);
      const response = await getFareRule({
        flowType: 'SEARCH',
        id: fareOption.fareId,
      });
      console.log(JSON.stringify(response, null, 2));

      // Check if response is valid
      if (response?.fareRule && Object.keys(response.fareRule).length > 0) {
        setFareRuleData(response);
        setShowFareRuleCard(true);
      } else {
        setErrorBanner('Fare rules not available for this option. Please try another fare.');
      }
    } catch (error) {
      console.error('Error fetching fare rule:', error);
      setErrorBanner('Failed to fetch fare rules. Please try again.');
    } finally {
      setLoadingFareId(null);
    }
  };

  const handleConfirmFareRule = () => {
    if (selectedFareId && selectedFareDetails) {
      // Store with flight type info
      const fareData = {
        fareId: selectedFareId,
        fareDetails: selectedFareDetails,
        flightType: flightType,
        timestamp: new Date().toISOString(),
      };

      // Store based on flight type
      if (flightType === 'departure') {
        sessionStorage.setItem('selectedDepartureFareId', selectedFareId);
        sessionStorage.setItem('selectedDepartureFareData', JSON.stringify(fareData));
        console.log('✅ Departure fare ID stored from FareDetailsCard:', selectedFareId);
      } else {
        sessionStorage.setItem('selectedReturnFareId', selectedFareId);
        sessionStorage.setItem('selectedReturnFareData', JSON.stringify(fareData));
        console.log('✅ Return fare ID stored from FareDetailsCard:', selectedFareId);
      }

      onConfirm(selectedFareId, selectedFareDetails);
      setShowFareRuleCard(false);
      onClose();
    }
  };

  const handleCloseFareRule = () => {
    setShowFareRuleCard(false);
    setFareRuleData(null);
  };

  // ── Fare Card Component ──────────────────────────────────────────────
  const FareOptionRow = ({
    fareOption,
    cabinColor,
    isSelected,
  }: {
    fareOption: any;
    cabinColor: string;
    isSelected: boolean;
  }) => {
    const adultFare =
      fareOption.FareDetails?.AdultFare || fareOption.passengerBreakup?.AdultFare || {};
    const fareComponents = adultFare.FareComponents || {};
    const baggageInfo = adultFare.BaggageInfo || {};
    const additionalFare = adultFare.AdditionalFareComponents?.TotalAdditionalFare || {};

    // Calculate total fare
    const totalFare =
      fareComponents.TotalFare ||
      fareComponents.NetFare ||
      fareOption.priceSummary?.AdultFare?.total ||
      0;
    const baseFare = fareComponents.BaseFare || fareOption.priceSummary?.AdultFare?.baseFare || 0;

    // Calculate tax fare
    let taxFare =
      fareComponents.TotalAdditionalFare || fareOption.priceSummary?.AdultFare?.tax || 0;
    if (taxFare === 0 && Object.keys(additionalFare).length > 0) {
      taxFare = Object.values(additionalFare).reduce(
        (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
        0,
      );
    }

    // Extract baggage info
    const cabinBaggage = baggageInfo.ClassCode || '7 Kgs';
    const checkInBaggage = baggageInfo.CheckInBaggage || '15 Kgs';

    const isRefundable = adultFare.RefundableType === 1;
    const isMealIncluded = adultFare.MealIncluded === true;
    const cabinClass = adultFare.CabinClass || 'ECONOMY';
    const classCode = adultFare.ClassCode || 'N/A';
    const fareIdentifier = fareOption.FareIdentifierType || 'STANDARD';
    const seatsRemaining = adultFare.SeatsRemaining || 0;

    const isLoading = loadingFareId === fareOption.fareId;

    return (
      <div
        className={`border border-[#272E7CD9] rounded-lg p-8 mb-4 transition-all duration-200 min-h-[400px] flex flex-col ${
          isSelected
            ? 'border-2 border-blue-500 shadow-lg shadow-blue-100'
            : 'hover:border-gray-300'
        } ${isLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => !isLoading && handleFareSelect(fareOption)}
      >
        {/* Price and Fare Name */}
        <div className="flex flex-col items-start gap-2 mb-4 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalFare)}</span>
            <span className="text-xs text-gray-500">per adult</span>
            {isSelected && !isLoading && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#2563eb" strokeWidth="1.5" />
                  <path
                    d="M4.5 8l2.5 2.5 4.5-4.5"
                    stroke="#2563eb"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Selected
              </span>
            )}
            {isLoading && (
              <span className="inline-flex items-center">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-gray-700">{fareIdentifier}</span>
        </div>

        {/* Details Grid - Row layout with items stacked vertically */}
        <div className="flex flex-col gap-3 flex-1">
          {/* Baggage - Row 1 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Baggage</p>
            <div className="mt-1 text-xs text-gray-600 space-y-1">
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>{cabinBaggage} Cabin Baggage</span>
              </div>
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>{checkInBaggage} Check-in Baggage</span>
              </div>
            </div>
          </div>

          {/* Flexibility - Row 2 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Flexibility</p>
            <div className="mt-1 text-xs text-gray-600">
              <div className="flex items-start gap-1.5">
                {isRefundable ? <GreenCheck /> : <RedCross />}
                <span>{isRefundable ? 'Refundable' : 'Non-Refundable'}</span>
              </div>
            </div>
          </div>

          {/* Seats, Meals & More - Row 3 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Seats, Meals & More
            </p>
            <div className="mt-1 text-xs text-gray-600 space-y-1">
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>
                  {cabinClass} · Class {classCode}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                {isMealIncluded ? <GreenCheck /> : <RedCross />}
                <span>{isMealIncluded ? 'Meal Included' : 'Meal Not Included'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits and Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-600">{seatsRemaining} seats left</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              className="rounded-full px-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleFareSelect(fareOption);
              }}
            >
              BOOK NOW
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 overflow-y-auto rounded-2xl p-0 scrollbar-hide sm:max-w-5xl" showCloseButton={false}>
          {/* ── Header ───────────────────────────────────────────── */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Flight Details and Fare Options available for you!
              </h2>
              <p className="text-sm font-bold text-gray-600 mt-1">
                {firstSegment?.DepartureAirport?.city || 'New Delhi'} →{' '}
                {lastSegment?.ArrivalAirport?.city || 'Bengaluru'}
                <span className="text-xs text-gray-400 ml-2">
                  {firstSegment?.FlightDetails?.AirlineInfo?.AirlineName || data.airlines?.[0]?.name || ''} •{' '}
                  {firstSegment?.DepartureTime
                    ? new Date(firstSegment.DepartureTime).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                        year: '2-digit',
                      })
                    : ''}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            >
              <X size={15} className="text-gray-600" />
            </button>
          </div>

          {/* ── Cabin Class Tabs ─────────────────────────────────────── */}
          <div className="px-6 pt-4">
            <div className="flex gap-1 overflow-x-auto border-b-2 border-[#27407C]">
              {sortedCabinNames.map((cabinName) => {
                const fares = groupedFares[cabinName] || [];
                const minFare =
                  fares.length > 0
                    ? Math.min(
                        ...fares.map((f: any) => {
                          const adultFare =
                            f.FareDetails?.AdultFare || f.passengerBreakup?.AdultFare || {};
                          const fareComponents = adultFare.FareComponents || {};
                          return (
                            fareComponents.TotalFare ||
                            fareComponents.NetFare ||
                            f.priceSummary?.AdultFare?.total ||
                            0
                          );
                        }),
                      )
                    : 0;
                const isActive = activeTab === cabinName;

                return (
                  <button
                    key={cabinName}
                    onClick={() => setActiveTab(cabinName)}
                    className={`px-4 py-3 text-left transition-all ${
                      isActive
                        ? 'border-[#27407C] bg-white text-gray-900'
                        : 'border-transparent bg-white text-gray-500 hover:text-gray-700'
                    }`}
                    style={{
                      borderWidth: isActive ? '3px 2px 0px 2px' : '0px',
                      borderStyle: 'solid',
                      borderColor: isActive ? '#27407C' : 'transparent',
                      borderRadius: '8px 8px 0px 0px',
                    }}
                  >
                    <div
                      className={`font-semibold text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}
                    >
                      {cabinName}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-[#001289]' : 'text-gray-400'}`}>
                      Starting at {formatCurrency(minFare)}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                      {getCabinDescription(cabinName)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Error Banner ─────────────────────────────────────────── */}
          {errorBanner && (
            <div className="mx-6 mt-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{errorBanner}</span>
              <button
                onClick={() => setErrorBanner(null)}
                className="hover:bg-red-100 p-1 rounded-full transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Fare Options by Active Tab ─────────────────────────── */}
          <div className="flex-1 px-6 py-4">
            {activeTab && groupedFares[activeTab] && groupedFares[activeTab].length > 0 && (
              <div className="w-full">
                {/* Fare Options for this cabin class - HORIZONTAL LAYOUT */}
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {groupedFares[activeTab].map((fareOption: any) => (
                    <div
                      key={fareOption.fareId}
                      className="min-w-[240px] max-w-[280px] flex-shrink-0"
                    >
                      <FareOptionRow
                        fareOption={fareOption}
                        cabinColor={getCabinColor(activeTab)}
                        isSelected={selectedFareId === fareOption.fareId}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fare Rule Card Modal */}
      {showFareRuleCard && fareRuleData && (
        <ReturnFareRuleCard
          isOpen={showFareRuleCard}
          onClose={handleCloseFareRule}
          fareRuleData={fareRuleData}
          onConfirm={handleConfirmFareRule}
          fareType="Return Flight"
          currency="INR"
        />
      )}
    </>
  );
}
