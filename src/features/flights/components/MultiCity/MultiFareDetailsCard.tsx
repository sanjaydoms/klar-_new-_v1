import { useState } from 'react';
import { X, Check, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { getFareRule } from '@/api/flightService.api';
import MultiFareRuleCard from './MultiFareRuleCard';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MultiFareDetailsCardProps {
  isOpen: boolean;
  onClose: () => void;
  flightDetails: any;
  segmentId: string;
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  travelDate?: string;
  flowType?: string;
}

interface FareRuleData {
  cancellationPolicy?: string;
  dateChangePolicy?: string;
  baggageAllowance?: string;
  fareRules?: any;
  [key: string]: any;
}

// ── Helper functions for cabin class ──────────────────────────────────────
const getCabinDisplayName = (cabinClass: string): string => {
  if (!cabinClass) return 'Economy';
  const lower = cabinClass.toLowerCase();
  if (lower.includes('first')) return 'First Class';
  if (lower.includes('business')) return 'Business Class';
  if (lower.includes('premium') || lower.includes('premium economy')) return 'Premium Economy';
  if (lower.includes('economy')) return 'Economy';
  return cabinClass;
};

const getCabinOrder = (cabinClass: string): number => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('economy')) return 0;     
  if (lower.includes('premium')) return 1;     
  if (lower.includes('business')) return 2;    
  if (lower.includes('first')) return 3;      
  return 4;
};

const getCabinColor = (cabinClass: string): string => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('first')) return 'amber';
  if (lower.includes('business')) return 'purple';
  if (lower.includes('premium')) return 'blue';
  if (lower.includes('economy')) return 'green';
  return 'gray';
};

const getCabinDescription = (cabinClass: string): string => {
  const lower = cabinClass?.toLowerCase() || '';
  if (lower.includes('first')) return 'Ultimate luxury with exclusive services';
  if (lower.includes('business')) return 'Luxury experience with premium services';
  if (lower.includes('premium')) return 'Comfortable seating & priority check-in';
  if (lower.includes('economy')) return 'Affordable fares & value for money';
  return '';
};

// ── Colour palette – cycles per fare card index ───────────────────────────────
const fareStyles = [
  {
    card: 'border border-blue-100 hover:border-blue-300 hover:shadow-md',
    gradient: 'bg-gradient-to-br from-blue-50 via-sky-50 to-white',
    badge: 'bg-blue-100 text-blue-800 border border-blue-200',
    body: 'bg-blue-50/30',
  },
  {
    card: 'border border-green-100 hover:border-green-300 hover:shadow-md',
    gradient: 'bg-gradient-to-br from-green-50 via-emerald-50 to-white',
    badge: 'bg-green-100 text-green-800 border border-green-200',
    body: 'bg-green-50/30',
  },
  {
    card: 'border border-purple-100 hover:border-purple-300 hover:shadow-md',
    gradient: 'bg-gradient-to-br from-purple-50 via-fuchsia-50 to-white',
    badge: 'bg-purple-100 text-purple-800 border border-purple-200',
    body: 'bg-purple-50/30',
  },
  {
    card: 'border border-orange-100 hover:border-orange-300 hover:shadow-md',
    gradient: 'bg-gradient-to-br from-orange-50 via-amber-50 to-white',
    badge: 'bg-orange-100 text-orange-800 border border-orange-200',
    body: 'bg-orange-50/30',
  },
  {
    card: 'border border-rose-100 hover:border-rose-300 hover:shadow-md',
    gradient: 'bg-gradient-to-br from-rose-50 via-pink-50 to-white',
    badge: 'bg-rose-100 text-rose-800 border border-rose-200',
    body: 'bg-rose-50/30',
  },
];

const getFareCardClasses = (
  index: number,
  isSelected: boolean,
): { card: string; gradient: string; badge: string; body: string } => {
  if (isSelected) {
    return {
      card: 'border-2 border-blue-500 shadow-lg shadow-blue-100',
      gradient: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-white',
      badge: 'bg-blue-100 text-blue-800 border border-blue-200',
      body: 'bg-blue-50/30',
    };
  }
  return (fareStyles[index % fareStyles.length] || fareStyles[0]) as {
    card: string;
    gradient: string;
    badge: string;
    body: string;
  };
};

// ── SVG micro-icons ───────────────────────────────────────────────────────────
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
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const FeatureRow = ({ ok, label }: { ok: boolean; label: string }) => (
  <div className="flex items-start gap-1.5 mb-1.5 text-xs text-gray-700 leading-snug">
    {ok ? <GreenCheck /> : <RedCross />}
    <span>{label}</span>
  </div>
);
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide mt-3 mb-1.5">{label}</p>
);

export default function MultiFareDetailsCard({
  isOpen,
  onClose,
  flightDetails,
  fromLocation,
  toLocation,
  travelDate,
  flowType = 'SEARCH',
}: MultiFareDetailsCardProps) {
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [fareRuleData, setFareRuleData] = useState<FareRuleData | null>(null);
  const [isLoadingFareRule, setIsLoadingFareRule] = useState(false);
  const [fareRuleError, setFareRuleError] = useState<string | null>(null);
  const [showFareRuleCard, setShowFareRuleCard] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('');

  if (!isOpen) return null;
  if (!flightDetails?.data) return null;

  const flightData = flightDetails.data;
  const segments = flightData.segments || [];
  const fares = flightData.fares || [];

  // ── Transform API response to expected format ───────────────────────────────
  const transformFareRuleResponse = (response: any) => {
    // Get the first route key (like "BOM-HYD")
    const routeKey = Object.keys(response.fareRule || {})[0];
    const routeData = response.fareRule?.[routeKey];

    if (!routeData?.tfr) {
      return { data: { fareRules: [{}], summary: {} } };
    }

    const tfr = routeData.tfr;

    // Transform cancellation data
    const cancellationWindows = (tfr.CANCELLATION || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
      fcs: item.FareComponentsSummary,
    }));

    // Transform date change data
    const dateChangeWindows = (tfr.DATECHANGE || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
      fcs: item.FareComponentsSummary,
    }));

    // Transform no show data
    const noShowWindows = (tfr.NO_SHOW || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      policyInfo: item.policyInfo,
    }));

    // Transform seat charges
    const seatCharges = (tfr.SEAT_CHARGEABLE || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
    }));

    // Calculate summary data from first window of each type
    const firstCancellation = tfr.CANCELLATION?.[0];
    const firstDateChange = tfr.DATECHANGE?.[0];
    const firstNoShow = tfr.NO_SHOW?.[0];

    // Determine if fare is refundable (fee is 0)
    const isRefundable = firstCancellation?.amount === 0 && firstCancellation?.additionalFee === 0;

    return {
      data: {
        fareRules: [
          {
            structuredRules: {
              cancellation: { timeWindows: cancellationWindows },
              dateChange: { timeWindows: dateChangeWindows },
              noShow: { timeWindows: noShowWindows },
              seatCharges: seatCharges,
            },
          },
        ],
        summary: {
          summaries: [
            {
              isRefundable: isRefundable,
              cancellationFee: firstCancellation?.amount || 0,
              cancellationAdditionalFee: firstCancellation?.additionalFee || 0,
              cancellationTimeWindow: firstCancellation
                ? `${firstCancellation.st}–${firstCancellation.et} hours`
                : 'N/A',
              dateChangeFee: firstDateChange?.amount || 0,
              dateChangeAdditionalFee: firstDateChange?.additionalFee || 0,
              dateChangeTimeWindow: firstDateChange
                ? `${firstDateChange.st}–${firstDateChange.et} hours`
                : 'N/A',
              dateChangePolicy: firstDateChange?.policyInfo || 'N/A',
              noShowPolicy: firstNoShow?.policyInfo || 'N/A',
              noShowTimeWindow: firstNoShow ? `${firstNoShow.st}–${firstNoShow.et} hours` : 'N/A',
              route: routeKey,
            },
          ],
        },
      },
    };
  };

  const handleFareSelectAndClose = () => {
    setShowFareRuleCard(false);
    onClose();
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    if (timeString.includes('T')) {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
    return timeString;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    if (dateString.includes('T')) {
      return new Date(dateString).toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
    }
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      const day = parts[0] ?? '1';
      const month = parts[1] ?? '1';
      const year = parts[2] ?? '2000';
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString(
        'en-US',
        { day: 'numeric', month: 'short', weekday: 'short' },
      );
    }
    return dateString;
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return { date: 'N/A', time: 'N/A' };
    if (dateTimeString.includes('T')) {
      const date = new Date(dateTimeString);
      return {
        date: date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          weekday: 'short',
        }),
        time: date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
      };
    }
    return { date: dateTimeString, time: 'N/A' };
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const extractFareDetails = (fare: any) => {
    const fareData = fare.FareDetails?.AdultFare || fare.passengerBreakup?.AdultFare || fare;

    return {
      baseFare:
        fareData.FareComponents?.BaseFare || fareData.priceSummary?.AdultFare?.baseFare || 0,
      taxesAndFees:
        fareData.FareComponents?.TotalAdditionalFare || fareData.priceSummary?.AdultFare?.tax || 0,
      totalFare: fareData.FareComponents?.TotalFare || fareData.priceSummary?.AdultFare?.total || 0,
      baggage: fareData.BaggageInfo || { CheckInBaggage: 'N/A', ClassCode: 'N/A' },
      cabinClass: fareData.CabinClass || 'ECONOMY',
      fareBasis: fareData.FareBasis || 'N/A',
      isRefundable: fareData.RefundableType === 1,
      bookingClass: fareData.ClassCode || 'N/A',
      seatsRemaining: fareData.SeatsRemaining || 0,
      mealIncluded: fareData.MealIncluded || false,
      fareIdentifier: fare.FareIdentifierType || 'STANDARD',
    };
  };

  const handleFareSelect = async (fareId: string) => {
    setSelectedFareId(fareId);
    setFareRuleError(null);
    setIsLoadingFareRule(true);
    try {
      const response = await getFareRule({
        flowType: flowType,
        id: fareId,
      });
      console.log(JSON.stringify(response, null, 2));

      // Transform the backend response to match expected structure
      const transformedData = transformFareRuleResponse(response);
      setFareRuleData(transformedData);
      setShowFareRuleCard(true);
    } catch (error) {
      console.error('Failed to fetch fare rule:', error);
      setFareRuleError('Failed to load fare rules. Please try again.');
    } finally {
      setIsLoadingFareRule(false);
    }
  };

  const getSelectedFareTotal = () => {
    if (!selectedFareId) return 0;
    const selectedFare = fares.find((f: any) => f.fareId === selectedFareId);
    return selectedFare ? extractFareDetails(selectedFare).totalFare : 0;
  };

  // Get airline info from first segment
  const airlineInfo = segments[0]?.FlightDetails?.AirlineInfo || {};
  const flightNumbers = segments
    .map(
      (seg: any) =>
        `${seg.FlightDetails?.AirlineCode || ''}${seg.FlightDetails?.FlightNumber || ''}`,
    )
    .filter(Boolean);

  // Get total duration and stops
  const totalDuration = segments.reduce((sum: number, seg: any) => sum + (seg.Duration || 0), 0);
  const totalStops = segments.length - 1;

  // Get departure and arrival info
  const firstSegment = segments[0];
  const lastSegment = segments[segments.length - 1];
  const departureInfo = firstSegment?.DepartureAirport || {};
  const arrivalInfo = lastSegment?.ArrivalAirport || {};
  const departureTime = firstSegment?.DepartureTime;
  const arrivalTime = lastSegment?.ArrivalTime;

  // Group fares by cabin class
  const groupedFares: { [key: string]: any[] } = {};

  fares.forEach((fareOption: any) => {
    const details = extractFareDetails(fareOption);
    const cabinClass = details.cabinClass || 'ECONOMY';
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
  // ── Fare card component ───────────────────────────────────────────────────
  const FareCard = ({ fare, index }: { fare: any; index: number }) => {
    const details = extractFareDetails(fare);
    const isSelected = selectedFareId === fare.fareId;
    const isLoading = isLoadingFareRule && isSelected;
    const lowSeat = details.seatsRemaining <= 4;
    const cabinColor = getCabinColor(details.cabinClass);

    return (
      <div
        onClick={() => handleFareSelect(fare.fareId)}
        className={`border border-[#272E7CD9] rounded-lg p-5 transition-all duration-200 min-h-[320px] flex flex-col ${
          isSelected
            ? 'border-2 border-blue-500 shadow-lg shadow-blue-100'
            : 'hover:border-gray-300'
        } ${isLoading ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
      >
        {/* Price and Fare Name */}
        <div className="flex flex-col items-start gap-1.5 mb-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(details.totalFare)}
            </span>
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
          <span className="text-sm font-bold text-gray-700">{details.fareIdentifier}</span>
        </div>

        {/* Details Grid - Row layout with items stacked vertically */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Baggage - Row 1 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Baggage</p>
            <div className="mt-0.5 text-xs text-gray-600 space-y-0.5">
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>{details.baggage?.ClassCode || '7 Kg'} Cabin Baggage</span>
              </div>
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>{details.baggage?.CheckInBaggage || 'Not included'} Check-in Baggage</span>
              </div>
            </div>
          </div>

          {/* Flexibility - Row 2 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Flexibility</p>
            <div className="mt-0.5 text-xs text-gray-600">
              <div className="flex items-start gap-1.5">
                {details.isRefundable ? <GreenCheck /> : <RedCross />}
                <span>{details.isRefundable ? 'Refundable' : 'Non-Refundable'}</span>
              </div>
            </div>
          </div>

          {/* Seats, Meals & More - Row 3 */}
          <div>
            <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Seats, Meals & More
            </p>
            <div className="mt-0.5 text-xs text-gray-600 space-y-0.5">
              <div className="flex items-start gap-1.5">
                <GreenCheck />
                <span>
                  {details.cabinClass} · Class {details.bookingClass}
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                {details.mealIncluded ? <GreenCheck /> : <RedCross />}
                <span>{details.mealIncluded ? 'Meal Included' : 'Meal Not Included'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits and Actions */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-bold text-gray-600">
              {details.seatsRemaining} seats left
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="accent"
              className="rounded-full px-6 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleFareSelect(fare.fareId);
              }}
            >
              BOOK NOW
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ── Segment Card Component for displaying flight segments with terminal, date, and time ──
  const SegmentCard = ({ segment, index }: { segment: any; index: number }) => {
    const isLast = index === segments.length - 1;
    const flightDetails = segment.FlightDetails || {};
    const airlineInfo = flightDetails.AirlineInfo || {};
    const departureAirport = segment.DepartureAirport || {};
    const arrivalAirport = segment.ArrivalAirport || {};

    const departureDateTime = formatDateTime(segment.DepartureTime);
    const arrivalDateTime = formatDateTime(segment.ArrivalTime);

    return (
      <div className="relative">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="text-xs font-semibold text-gray-700">
                {airlineInfo.AirlineCode} {flightDetails.FlightNumber}
              </div>
              <div className="text-xs text-gray-400">{flightDetails.EquipmentType}</div>
            </div>
            <div className="text-xs text-gray-400">
              Duration: {formatDuration(segment.Duration)}
            </div>
          </div>

          <div className="flex items-center justify-between">
            {/* Departure */}
            <div className="text-left flex-1">
              <div className="text-sm font-bold text-gray-900">{departureDateTime.time}</div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">
                {departureAirport.AirlineCode}
              </div>
              <div className="text-xs text-gray-600">{departureAirport.city}</div>
              {departureAirport.terminal && (
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Terminal: {departureAirport.terminal}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-1">{departureDateTime.date}</div>
            </div>

            {/* Arrow/Route */}
            <div className="flex-1 px-4">
              <div className="relative flex items-center">
                <div className="flex-1 h-px bg-gray-300"></div>
                {segment.NumberOfStops === 0 && (
                  <div className="mx-2 text-[10px] text-gray-400">Direct</div>
                )}
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>
            </div>

            {/* Arrival */}
            <div className="text-right flex-1">
              <div className="text-sm font-bold text-gray-900">{arrivalDateTime.time}</div>
              <div className="text-xs font-semibold text-gray-700 mt-0.5">
                {arrivalAirport.AirlineCode}
              </div>
              <div className="text-xs text-gray-600">{arrivalAirport.city}</div>
              {arrivalAirport.terminal && (
                <div className="text-[11px] text-gray-500 mt-0.5">
                  Terminal: {arrivalAirport.terminal}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-1">{arrivalDateTime.date}</div>
            </div>
          </div>
        </div>

        {!isLast && (
          <div className="flex justify-center my-2">
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <ArrowRight size={12} />
              <span>
                Layover:{' '}
                {formatDuration(
                  segments[index + 1]?.DepartureTime && segment.ArrivalTime
                    ? (new Date(segments[index + 1].DepartureTime).getTime() -
                        new Date(segment.ArrivalTime).getTime()) /
                        (1000 * 60)
                    : 0,
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Format departure and arrival with terminal info for main display
  const mainDepartureDateTime = formatDateTime(departureTime);
  const mainArrivalDateTime = formatDateTime(arrivalTime);

  // Get stop text
  const getStopText = (stops: number) => {
    if (stops === 0) return 'Non-stop';
    if (stops === 1) return '1 Stop';
    return `${stops} Stops`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100vh-6rem)] w-full max-w-5xl flex-col gap-0 overflow-y-auto rounded-2xl p-0 scrollbar-hide sm:max-w-5xl" showCloseButton={false}>
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-gray-100 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Flight Details and Fare Options available for you!
            </h2>
            <p className="text-xs font-bold text-gray-600 mt-1">
              {firstSegment?.DepartureAirport?.city || 'New Delhi'} →{' '}
              {lastSegment?.ArrivalAirport?.city || 'Bengaluru'}
              <span className="text-xs text-gray-400 ml-2">
                {airlineInfo.AirlineName || flightData.airlines?.[0]?.name || ''} •{' '}
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
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
          >
            <X size={14} className="text-gray-600" />
          </button>
        </div>

        {/* ── Cabin Class Tabs ─────────────────────────────────────── */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 overflow-x-auto border-b-2 border-[#27407C]">
            {sortedCabinNames.map((cabinName) => {
              const faresInGroup = groupedFares[cabinName] || [];
              const color = getCabinColor(cabinName);
              const minFare =
                faresInGroup.length > 0
                  ? Math.min(
                      ...faresInGroup.map((f: any) => {
                        const details = extractFareDetails(f);
                        return details.totalFare || 0;
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

        {/* ── Fare Options by Active Tab ─────────────────────────── */}
        <div className="flex-1 px-6 pt-6 pb-4">
          {activeTab && groupedFares[activeTab] && groupedFares[activeTab].length > 0 && (
            <div className="w-full">
              <div className="flex gap-4 overflow-x-auto pb-2">
                {groupedFares[activeTab].map((fare: any, idx: number) => (
                  <div
                    key={fare.fareId || idx}
                    className="min-w-[240px] max-w-[280px] flex-shrink-0"
                  >
                    <FareCard fare={fare} index={idx} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {fareRuleError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={14} />
              {fareRuleError}
            </div>
          )}

          {/* {!selectedFareId && fares.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-4 text-xs text-amber-600">
                            <AlertCircle size={12} />
                            Click a fare card above to view rules and confirm your selection
                        </div>
                    )} */}

          {fares.length === 0 && (
            <div className="flex items-center gap-1.5 mt-4 text-xs text-red-600">
              <AlertCircle size={12} />
              No fare options available for this flight
            </div>
          )}
        </div>
      </DialogContent>

      {showFareRuleCard && fareRuleData && selectedFareId && (
        <MultiFareRuleCard
          isOpen={showFareRuleCard}
          onClose={() => {
            setShowFareRuleCard(false);
            setFareRuleData(null);
          }}
          fareRuleData={fareRuleData}
          fareType={
            fares.find((f: { fareId: string }) => f.fareId === selectedFareId)
              ?.FareIdentifierType || 'STANDARD'
          }
          totalFare={getSelectedFareTotal()}
          currency="INR"
          onSelect={handleFareSelectAndClose}
          onCancel={() => {
            setShowFareRuleCard(false);
            setFareRuleData(null);
          }}
          selectedFareId={selectedFareId}
          {...(fromLocation ? { fromLocation } : {})}
          {...(toLocation ? { toLocation } : {})}
        />
      )}
    </Dialog>
  );
}
