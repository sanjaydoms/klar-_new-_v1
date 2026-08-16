import { useState } from 'react';
import { X, Check, AlertCircle, ArrowRight, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { getFareRule } from '@/api/flightService.api';
import { cabinBaggageOf, refundableLabelFromType } from '@/features/flights/utils/flightDisplay';
import InternationalMultiFareRuleCard from './InternationalMultiFareRuleCard';

interface InternationalMultiFareDetailsCardProps {
  isOpen: boolean;
  onClose: () => void;
  flightDetails: any;
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  travelDate?: string;
  onConfirm: (selectedFareId: string, selectedFareDetails: any) => void;
}

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

const getFareCardClasses = (index: number, isSelected: boolean) => {
  if (isSelected) {
    return {
      card: 'border-2 border-[#272E7CD9] shadow-lg shadow-gray-100',
      gradient: 'bg-white',
      badge: 'bg-blue-100 text-blue-800 border border-blue-200',
      body: 'bg-white',
    };
  }
  return {
    card: 'border border-[#272E7CD9] hover:border-[#272E7CD9] hover:shadow-md',
    gradient: 'bg-white',
    badge: 'bg-gray-100 text-gray-800 border border-gray-200',
    body: 'bg-white',
  };
};

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
  <div className="flex items-start gap-1.5 mb-1 text-[10px] text-gray-700 leading-snug">
    {ok ? <GreenCheck /> : <RedCross />}
    <span>{label}</span>
  </div>
);

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[9px] font-bold text-gray-800 uppercase tracking-wide mt-2 mb-1">{label}</p>
);

export default function InternationalMultiFareDetailsCard({
  isOpen,
  onClose,
  flightDetails,
  fromLocation,
  toLocation,
  travelDate,
  onConfirm,
}: InternationalMultiFareDetailsCardProps) {
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareDetails, setSelectedFareDetails] = useState<any>(null);
  const [isFlightSummaryExpanded, setIsFlightSummaryExpanded] = useState(false);
  const [showFareRuleCard, setShowFareRuleCard] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<any>(null);
  const [isLoadingFareRule, setIsLoadingFareRule] = useState(false);
  const [fareRuleError, setFareRuleError] = useState<string | null>(null);
  const [activeCabinClass, setActiveCabinClass] = useState<string>('ECONOMY');

  if (!isOpen) return null;
  if (!flightDetails?.data) return null;

  const flightData = flightDetails.data;
  const segments = flightData.segments || [];
  const fares = flightData.fares || [];

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Get unique cabin classes from fares
  const getCabinClasses = () => {
    const cabinSet = new Set<string>();
    fares.forEach((fare: any) => {
      const fareData = fare.FareDetails?.AdultFare || fare.passengerBreakup?.AdultFare || fare;
      const cabin = fareData.CabinClass || 'ECONOMY';
      cabinSet.add(cabin);
    });
    return Array.from(cabinSet);
  };

  // Get filtered fares by cabin class
  const getFilteredFares = () => {
    return fares.filter((fare: any) => {
      const fareData = fare.FareDetails?.AdultFare || fare.passengerBreakup?.AdultFare || fare;
      return (fareData.CabinClass || 'ECONOMY') === activeCabinClass;
    });
  };

  const cabinClasses = getCabinClasses();
  const filteredFares = getFilteredFares();

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
          hour12: false,
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
      refundable: refundableLabelFromType(fareData.RefundableType),
      bookingClass: fareData.ClassCode || 'N/A',
      seatsRemaining: fareData.SeatsRemaining || 0,
      mealIncluded: fareData.MealIncluded || false,
      fareIdentifier: fare.FareIdentifierType || 'STANDARD',
    };
  };

  const handleFareCardClick = async (fare: any) => {
    const fareId = fare.fareId || fare.FareIdentifierType || fare.id;

    if (!fareId) {
      console.error('No fare ID found:', fare);
      setFareRuleError('Invalid fare selection. Please try again.');
      return;
    }

    setSelectedFareId(fareId);
    setSelectedFareDetails(fare);
    setFareRuleError(null);
    setIsLoadingFareRule(true);

    try {
      const response = await getFareRule({
        flowType: 'SEARCH',
        id: fareId,
      });

      console.log('The FARE RULE:\n', response);

      if (!response || (!response.fareRule && !response.data)) {
        throw new Error('No fare rule data received');
      }

      const transformedData = transformFareRuleResponse(response);

      if (!transformedData?.data?.fareRules?.length) {
        setFareRuleError('No fare rules available for this option.');
        setShowFareRuleCard(false);
      } else {
        setFareRuleData(transformedData);
        setShowFareRuleCard(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch fare rule:', error);
      setFareRuleError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load fare rules. Please try again.',
      );
      setShowFareRuleCard(false);
    } finally {
      setIsLoadingFareRule(false);
    }
  };

  const transformFareRuleResponse = (response: any) => {
    let fareRuleData = response.fareRule || response.data?.fareRule || response;

    const routeKey = Object.keys(fareRuleData || {})[0];
    const routeData = fareRuleData?.[routeKey as string];

    if (!routeData?.tfr && !routeData?.FareRules) {
      const alternateData = response.data?.fareRules?.[0] || response.fareRules?.[0];
      if (alternateData) {
        return {
          data: {
            fareRules: [alternateData],
            summary: {
              summaries: [
                {
                  isRefundable: alternateData.isRefundable || false,
                  cancellationFee: alternateData.cancellationFee || 0,
                  dateChangeFee: alternateData.dateChangeFee || 0,
                  noShowPolicy: alternateData.noShowPolicy || 'N/A',
                },
              ],
            },
          },
        };
      }
      return { data: { fareRules: [{}], summary: {} } };
    }

    const tfr = routeData.tfr || routeData.FareRules;

    if (!tfr) {
      return { data: { fareRules: [{}], summary: {} } };
    }

    const cancellationWindows = (tfr.CANCELLATION || tfr.cancellation || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount || item.fee,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
      fcs: item.FareComponentsSummary,
    }));

    const dateChangeWindows = (tfr.DATECHANGE || tfr.dateChange || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount || item.fee,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
      fcs: item.FareComponentsSummary,
    }));

    const noShowWindows = (tfr.NO_SHOW || tfr.noShow || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      policyInfo: item.policyInfo,
    }));

    const seatCharges = (tfr.SEAT_CHARGEABLE || tfr.seatChargeable || []).map((item: any) => ({
      st: item.st,
      et: item.et,
      amount: item.amount,
      additionalFee: item.additionalFee,
      policyInfo: item.policyInfo,
    }));

    const firstCancellation = cancellationWindows[0];
    const firstDateChange = dateChangeWindows[0];
    const firstNoShow = noShowWindows[0];

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

  const handleFareSelection = (reviewData?: any) => {
    if (selectedFareId && selectedFareDetails) {
      onConfirm(selectedFareId, {
        ...selectedFareDetails,
        reviewData: reviewData,
      });
      onClose();
    }
  };

  const handleCloseFareRule = () => {
    setShowFareRuleCard(false);
    setFareRuleData(null);
  };

  const FareCard = ({ fare, index }: { fare: any; index: number }) => {
    const details = extractFareDetails(fare);
    const isSelected = selectedFareId === (fare.fareId || fare.FareIdentifierType || fare.id);
    const isLoading = isLoadingFareRule && isSelected;
    const lowSeat = details.seatsRemaining <= 4;
    const { card, gradient, badge, body } = getFareCardClasses(index, isSelected);

    return (
      <div
        onClick={() => !isLoading && handleFareCardClick(fare)}
        className={`flex-none w-60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 ${card} ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className={`${gradient} px-4 pt-3 pb-2.5`}>
          {isSelected && (
            <div
              className="h-1 bg-gradient-to-r from-blue-500 to-indigo-400 rounded-full mb-2"
              style={{
                marginLeft: '-16px',
                marginRight: '-16px',
                marginTop: '-12px',
                width: 'calc(100% + 32px)',
              }}
            />
          )}

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none tracking-tight">
                {formatCurrency(details.totalFare)}
              </p>
              <p className="text-[9px] text-gray-400 mt-1">
                Base {formatCurrency(details.baseFare)} + Tax {formatCurrency(details.taxesAndFees)}
              </p>
            </div>
            {isLoading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
            {isSelected && !isLoading && (
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
              {details.fareIdentifier}
            </span>
            {/* <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${lowSeat ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {details.seatsRemaining} seats left
                        </span> */}
          </div>
        </div>

        <div className={`${body} px-4 pb-2.5 pt-1`}>
          <SectionLabel label="Baggage" />
          {cabinBaggageOf(details.baggage) && (
            <FeatureRow ok label={`${cabinBaggageOf(details.baggage)} Cabin Baggage`} />
          )}
          {details.baggage?.CheckInBaggage && (
            <FeatureRow ok label={`${details.baggage.CheckInBaggage} Check-in Baggage`} />
          )}

          <SectionLabel label="Flexibility" />
          {details.refundable ? (
            <FeatureRow
              ok={/^refundable$/i.test(details.refundable)}
              label={details.refundable}
            />
          ) : (
            <FeatureRow ok={false} label="Refundability not stated by the airline" />
          )}

          <SectionLabel label="Seats, Meals & More" />
          <FeatureRow ok label={`${details.cabinClass} · Class ${details.bookingClass}`} />
          <FeatureRow
            ok={details.mealIncluded}
            label={details.mealIncluded ? 'Meal Included' : 'Meal Not Included'}
          />

          <div className="mt-1 pt-1.5 border-t border-gray-100 text-[8px] text-gray-400">
            Fare Basis: {details.fareBasis}
          </div>

          {/* Book Now Button with Seats Left */}
          <div className="mt-2 flex items-center justify-between">
            {lowSeat && (
              <div className="text-[10px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                Only {details.seatsRemaining} seats left!
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoading) handleFareCardClick(fare);
              }}
              className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 ml-auto"
              style={{ backgroundColor: '#FF0004' }}
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SegmentDisplay = () => {
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const departureDateTime = formatDateTime(firstSegment?.DepartureTime);
    const arrivalDateTime = formatDateTime(lastSegment?.ArrivalTime);
    const totalDuration = segments.reduce((sum: number, seg: any) => sum + (seg.Duration || 0), 0);
    const stops = segments.length - 1;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl overflow-hidden">
        <button
          onClick={() => setIsFlightSummaryExpanded(!isFlightSummaryExpanded)}
          className="w-full flex items-center justify-between p-4 hover:bg-blue-100/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-xs text-gray-500">Flight Summary</p>
              <p className="text-sm font-semibold text-gray-700">
                {firstSegment?.DepartureAirport?.AirlineCode} →{' '}
                {lastSegment?.ArrivalAirport?.AirlineCode}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDuration(totalDuration)}</span>
              <span>•</span>
              <span>{stops === 0 ? 'Direct' : `${stops} Stop${stops > 1 ? 's' : ''}`}</span>
            </div>
          </div>
          {isFlightSummaryExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {isFlightSummaryExpanded && (
          <div className="p-4 pt-0 border-t border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500">
                  {firstSegment?.DepartureAirport?.AirlineCode}
                </p>
                <p className="text-xl font-bold text-gray-900">{departureDateTime.time}</p>
                <p className="text-xs text-gray-600">{firstSegment?.DepartureAirport?.city}</p>
                <p className="text-xs text-gray-400">{departureDateTime.date}</p>
                {firstSegment?.DepartureAirport?.terminal && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Terminal: {firstSegment.DepartureAirport.terminal}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center px-4 flex-1">
                <p className="text-xs text-gray-500">{formatDuration(totalDuration)}</p>
                <div className="relative w-full my-2">
                  <div className="w-full h-px bg-gray-300" />
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-50 to-indigo-50 px-2">
                    <ArrowRight className="w-3 h-3 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-blue-600 font-medium">
                  {stops === 0 ? 'Non-stop' : `${stops} Stop${stops > 1 ? 's' : ''}`}
                </p>
              </div>

              <div className="text-center flex-1">
                <p className="text-xs text-gray-500">{lastSegment?.ArrivalAirport?.AirlineCode}</p>
                <p className="text-xl font-bold text-gray-900">{arrivalDateTime.time}</p>
                <p className="text-xs text-gray-600">{lastSegment?.ArrivalAirport?.city}</p>
                <p className="text-xs text-gray-400">{arrivalDateTime.date}</p>
                {lastSegment?.ArrivalAirport?.terminal && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Terminal: {lastSegment.ArrivalAirport.terminal}
                  </p>
                )}
              </div>
            </div>

            {segments.length > 1 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Flight Segments:</p>
                <div className="space-y-2">
                  {segments.map((segment: any, idx: number) => {
                    const segDeparture = formatDateTime(segment.DepartureTime);
                    const segArrival = formatDateTime(segment.ArrivalTime);
                    const isLast = idx === segments.length - 1;

                    return (
                      <div key={idx} className="text-xs text-gray-600 bg-white/50 rounded-lg p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {segment.FlightDetails?.AirlineCode}
                            {segment.FlightDetails?.FlightNumber}
                          </span>
                          <span className="text-gray-400">{formatDuration(segment.Duration)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            <span className="font-semibold">{segDeparture.time}</span>
                            <span className="text-gray-400 ml-1">
                              {segment.DepartureAirport?.AirlineCode}
                            </span>
                          </div>
                          <ArrowRight className="w-3 h-3 text-gray-400 mx-2" />
                          <div>
                            <span className="font-semibold">{segArrival.time}</span>
                            <span className="text-gray-400 ml-1">
                              {segment.ArrivalAirport?.AirlineCode}
                            </span>
                          </div>
                        </div>
                        {!isLast && segments[idx + 1] && (
                          <div className="mt-1 text-center text-[10px] text-amber-600">
                            Layover:{' '}
                            {formatDuration(
                              (new Date(segments[idx + 1].DepartureTime).getTime() -
                                new Date(segment.ArrivalTime).getTime()) /
                                (1000 * 60),
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-gray-200 text-center">
              <p className="text-sm font-semibold text-gray-700">
                {segments[0]?.FlightDetails?.AirlineInfo?.AirlineName || 'Airline'} •
                {segments.map((seg: any, idx: number) => (
                  <span key={idx}>
                    {idx > 0 && ' → '}
                    {seg.FlightDetails?.AirlineCode}
                    {seg.FlightDetails?.FlightNumber}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] md:h-[92vh] lg:h-[95vh] overflow-hidden flex flex-col">
          <div className="px-6 pt-6 pb-2 border-b border-gray-100">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Fare Option</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Click a fare card to view rules and select your preferred fare
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            <SegmentDisplay />
          </div>

          <div className="overflow-y-auto flex-1 px-6 pt-2 pb-5">
            {/* Cabin Class Tabs */}
            <div className="mb-0">
              <div className="flex gap-2 overflow-x-auto pb-0 pt-1">
                {cabinClasses.map((cabin) => {
                  const isActive = activeCabinClass === cabin;
                  const displayName = cabin;
                  const count = fares.filter((fare: any) => {
                    const fareData =
                      fare.FareDetails?.AdultFare || fare.passengerBreakup?.AdultFare || fare;
                    return (fareData.CabinClass || 'ECONOMY') === cabin;
                  }).length;

                  return (
                    <button
                      key={cabin}
                      onClick={() => setActiveCabinClass(cabin)}
                      className={`px-4 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap relative
                        ${
                          isActive
                            ? 'text-[#27407C] border-t-[3px] border-r-2 border-l-2 border-b-0 border-[#27407C] rounded-t-lg -mb-[1px]'
                            : 'text-gray-600 hover:text-[#27407C]'
                        }`}
                    >
                      {displayName}
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded-full
                        ${isActive ? 'bg-[#27407C] text-white' : 'bg-gray-200 text-gray-500'}
                    `}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {/* Divider between tabs and fare cards */}
              <div className="border-t border-[#27407C] mt-0" style={{ borderWidth: '1px' }} />
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 mt-6">
              {filteredFares.length === 0 ? (
                <div className="w-full text-center py-8 text-gray-500">
                  No fares available for {activeCabinClass} class
                </div>
              ) : (
                filteredFares.map((fare: any, idx: number) => (
                  <FareCard key={fare.fareId || fare.id || idx} fare={fare} index={idx} />
                ))
              )}
            </div>

            {fareRuleError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={18} />
                <span>{fareRuleError}</span>
                <button
                  onClick={() => setFareRuleError(null)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {fares.length === 0 && (
              <div className="flex items-center gap-2 mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle size={18} />
                <span className="text-sm">No fare options available for this flight</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
            <div>
              {selectedFareId && selectedFareDetails && !showFareRuleCard && (
                <p className="text-sm text-gray-600">
                  Selected fare:{' '}
                  <span className="font-bold text-gray-900">
                    {formatCurrency(extractFareDetails(selectedFareDetails).totalFare)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              {selectedFareId && !showFareRuleCard && (
                <button
                  onClick={() => handleFareSelection()}
                  className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Confirm Selection
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFareRuleCard && fareRuleData && selectedFareId && selectedFareDetails && (
        <InternationalMultiFareRuleCard
          isOpen={showFareRuleCard}
          onClose={handleCloseFareRule}
          fareRuleData={fareRuleData}
          fareType={
            selectedFareDetails.FareIdentifierType || selectedFareDetails.fareType || 'STANDARD'
          }
          totalFare={extractFareDetails(selectedFareDetails).totalFare}
          currency="INR"
          onSelect={handleFareSelection}
          onCancel={handleCloseFareRule}
          fromLocation={fromLocation}
          toLocation={toLocation}
          selectedFareId={selectedFareId}
          travelDate={travelDate}
          flightDetails={flightDetails}
        />
      )}
    </>
  );
}
