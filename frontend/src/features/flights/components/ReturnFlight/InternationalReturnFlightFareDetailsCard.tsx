import { X, Check, AlertCircle } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { getFareRule } from '@/api/flightService.api';
import { cabinBaggageOf, refundableLabelFromType } from '@/features/flights/utils/flightDisplay';
import InternationalReturnFlightFareRuleCard from './InternationalReturnFlightFareRuleCard';

interface InternationalReturnFlightFareDetailsCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareData: any;
  /** Auto-continue with this fare (already chosen in the fare chooser). */
  initialFareId?: string | undefined;
  flightType: 'departure' | 'return' | 'roundtrip';
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  travelDate?: string;
  onConfirm: (selectedFareId: string, selectedFareDetails: any) => void;
}

const cabinClassColors = {
  ECONOMY: {
    bg: 'bg-white',
    border: 'border-[#27407C]',
    text: 'text-[#27407C]',
    active: 'border-[#27407C] bg-white',
    inactive: 'border-gray-300 bg-white hover:border-[#27407C]',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    gradient: 'from-blue-50 to-sky-50',
    shadow: 'shadow-blue-100',
  },
  PREMIUM_ECONOMY: {
    bg: 'bg-white',
    border: 'border-[#27407C]',
    text: 'text-[#27407C]',
    active: 'border-[#27407C] bg-white',
    inactive: 'border-gray-300 bg-white hover:border-[#27407C]',
    badge: 'bg-green-100 text-green-800 border-green-200',
    gradient: 'from-green-50 to-emerald-50',
    shadow: 'shadow-green-100',
  },
  BUSINESS: {
    bg: 'bg-white',
    border: 'border-[#27407C]',
    text: 'text-[#27407C]',
    active: 'border-[#27407C] bg-white',
    inactive: 'border-gray-300 bg-white hover:border-[#27407C]',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    gradient: 'from-purple-50 to-fuchsia-50',
    shadow: 'shadow-purple-100',
  },
  FIRST: {
    bg: 'bg-white',
    border: 'border-[#27407C]',
    text: 'text-[#27407C]',
    active: 'border-[#27407C] bg-white',
    inactive: 'border-gray-300 bg-white hover:border-[#27407C]',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    gradient: 'from-amber-50 to-orange-50',
    shadow: 'shadow-amber-100',
  },
};

const getCabinClassStyle = (cabinClass: string) => {
  const normalized = cabinClass?.toUpperCase() || 'ECONOMY';
  return cabinClassColors[normalized as keyof typeof cabinClassColors] || cabinClassColors.ECONOMY;
};

const getFareCardClasses = (cabinClass: string, isSelected: boolean) => {
  if (isSelected) {
    return {
      card: `border-2 border-[#272E7CD9] shadow-lg`,
      gradient: 'bg-white',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      body: 'bg-white',
    };
  }
  return {
    card: `border border-[#272E7CD9] hover:border-[#272E7CD9] hover:shadow-md`,
    gradient: 'bg-white',
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
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
  <div className="flex items-start gap-1.5 mb-1 text-xs text-gray-700 leading-snug">
    {ok ? <GreenCheck /> : <RedCross />}
    <span>{label}</span>
  </div>
);

const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wide mt-2 mb-1">{label}</p>
);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const transformFareData = (fare: any) => {
  if (!fare?.data?.fares) return [];

  return fare.data.fares.map((fareItem: any, index: number) => {
    const adultFare = fareItem.FareDetails?.AdultFare || fareItem.passengerBreakup?.AdultFare || {};
    const fareComponents = adultFare.FareComponents || {};
    const baggageInfo = adultFare.BaggageInfo || {};
    const additionalFare = adultFare.AdditionalFareComponents?.TotalAdditionalFare || {};

    const totalFare =
      fareComponents.TotalFare ||
      fareComponents.NetFare ||
      fareItem.priceSummary?.AdultFare?.total ||
      0;
    const baseFare = fareComponents.BaseFare || fareItem.priceSummary?.AdultFare?.baseFare || 0;

    let taxFare = fareComponents.TotalAdditionalFare || fareItem.priceSummary?.AdultFare?.tax || 0;
    if (taxFare === 0 && Object.keys(additionalFare).length > 0) {
      taxFare = Object.values(additionalFare).reduce(
        (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
        0,
      );
    }

    // Was defaulted to '7 Kgs' / '15 Kgs' for fares that state neither.
    const cabinBaggage = cabinBaggageOf(baggageInfo);
    const checkInBaggage = baggageInfo.CheckInBaggage || '';

    const fareIdentifier =
      fareItem.FareIdentifierType || fareItem.meta?.fareType || `FARE ${index + 1}`;
    const seatsRemaining = adultFare.SeatsRemaining || 9;
    const refundableType = adultFare.RefundableType;
    const cabinClass = adultFare.CabinClass || 'ECONOMY';
    const classCode = adultFare.ClassCode || 'N/A';
    const fareBasis = adultFare.FareBasis || 'N/A';
    const mealIncluded = adultFare.MealIncluded || false;

    return {
      id: fareItem.fareId || fareItem.SegmentID || `fare_${index}`,
      fareIdentifier: fareIdentifier,
      cabinClass: cabinClass,
      fd: {
        ADULT: {
          fC: {
            TF: totalFare,
            BF: baseFare,
            TAF: taxFare,
          },
          bI: {
            cB: cabinBaggage,
            iB: checkInBaggage,
          },
          // Pass rT THROUGH: `isRefundable ? 1 : 0` turned 2 (partially
          // refundable) and an unstated type into a hard 0.
          rT: refundableType,
          sR: seatsRemaining,
          cc: cabinClass,
          cB: classCode,
          mI: mealIncluded,
          fB: fareBasis,
        },
      },
    };
  });
};

export default function InternationalReturnFlightFareDetailsCard({
  isOpen,
  onClose,
  fareData,
  initialFareId,
  flightType,
  fromLocation,
  toLocation,
  travelDate,
  onConfirm,
}: InternationalReturnFlightFareDetailsCardProps) {
  const [selectedFareId, setSelectedFareId] = useState<string | null>(null);
  const [selectedFareDetails, setSelectedFareDetails] = useState<any>(null);
  const [showFareRuleCard, setShowFareRuleCard] = useState(false);
  const [fareRuleData, setFareRuleData] = useState<any>(null);
  const [loadingFareId, setLoadingFareId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeCabinClass, setActiveCabinClass] = useState<string>('ALL');

  if (!isOpen) return null;

  const fareOptions = transformFareData(fareData);

  // Group fares by cabin class
  const groupedFares = useMemo(() => {
    const groups: Record<string, any[]> = {};
    fareOptions.forEach((fare: any) => {
      const cabin = fare.cabinClass || 'ECONOMY';
      if (!groups[cabin]) {
        groups[cabin] = [];
      }
      groups[cabin].push(fare);
    });
    return groups;
  }, [fareOptions]);

  // Get cabin classes - only show actual cabin classes, NO "ALL" tab
  const cabinClasses = useMemo(() => {
    return Object.keys(groupedFares).sort();
  }, [groupedFares]);

  // Set default active tab to first available cabin class if "ALL" was previously selected
  useMemo(() => {
    if (activeCabinClass === 'ALL' && cabinClasses.length > 0) {
      setActiveCabinClass(cabinClasses[0]);
    }
  }, [cabinClasses, activeCabinClass]);

  const getCabinDisplayName = (cabin: string) => {
    const names: Record<string, string> = {
      ECONOMY: 'Economy',
      PREMIUM_ECONOMY: 'Premium Economy',
      BUSINESS: 'Business',
      FIRST: 'First',
    };
    return names[cabin] || cabin;
  };

  const getCabinStartingPrice = (cabin: string) => {
    const fares = groupedFares[cabin] || [];
    if (fares.length === 0) return null;
    const prices = fares.map((f: any) => f.fd?.ADULT?.fC?.TF || 0);
    return Math.min(...prices);
  };

  const getCabinCount = (cabin: string) => {
    return (groupedFares[cabin] || []).length;
  };

  const getFilteredFares = () => {
    return groupedFares[activeCabinClass] || [];
  };

  /** See FareDetailsCard: the chooser's pick continues without re-asking. */
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (!initialFareId || autoSelectedRef.current) return;
    const list = fareData?.data?.fares || [];
    const match = list.find((f: any) => f?.fareId === initialFareId) || list[0];
    if (match) {
      autoSelectedRef.current = true;
      handleFareSelect({ id: match.fareId || initialFareId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFareId, fareData]);

  // Headless failure ends the flow quietly — the legacy list must never show.
  useEffect(() => {
    if (initialFareId && errorBanner) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorBanner]);

  const handleFareSelect = async (fareOption: any) => {
    setSelectedFareId(fareOption.id);
    setSelectedFareDetails(fareOption);
    setErrorBanner(null);

    try {
      setLoadingFareId(fareOption.id);
      const response = await getFareRule({
        flowType: 'SEARCH',
        id: fareOption.id,
      });

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
      const fareDataToStore = {
        fareId: selectedFareId,
        fareDetails: selectedFareDetails,
        flightType: flightType,
        timestamp: new Date().toISOString(),
      };

      sessionStorage.setItem('selectedRoundTripFareId', selectedFareId);
      sessionStorage.setItem('selectedRoundTripFareData', JSON.stringify(fareDataToStore));
      sessionStorage.setItem('selectedDepartureFareId', selectedFareId);
      sessionStorage.setItem('selectedReturnFareId', selectedFareId);

      onConfirm(selectedFareId, selectedFareDetails);
      setShowFareRuleCard(false);
      onClose();
    }
  };

  const handleCloseFareRule = () => {
    setShowFareRuleCard(false);
    setFareRuleData(null);
  };

  const FareCard = ({ fareOption, index }: { fareOption: any; index: number }) => {
    const fd = fareOption?.fd?.ADULT;
    const fC = fd?.fC;
    const bI = fd?.bI;
    const isSelected = selectedFareId === fareOption.id;
    const isLoading = loadingFareId === fareOption.id;
    const lowSeat = (fd?.sR || 0) <= 4;
    const cabinStyle = getCabinClassStyle(fareOption.cabinClass);
    const { card, gradient, badge, body } = getFareCardClasses(fareOption.cabinClass, isSelected);

    const totalFare = fC?.TF || 0;
    const baseFare = fC?.BF || 0;
    const taxFare = fC?.TAF || 0;
    const refundable = refundableLabelFromType(fd?.rT);

    return (
      <div
        onClick={() => !isLoading && handleFareSelect(fareOption)}
        className={`flex-none w-56 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 ${card} ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <div className={`${gradient} px-4 pt-3 pb-2 relative`}>
          {isSelected && !isLoading && (
            <div
              className="h-1 bg-[#272E7CD9] rounded-full mb-3"
              style={{
                marginLeft: '-16px',
                marginRight: '-16px',
                marginTop: '-16px',
                width: 'calc(100% + 32px)',
              }}
            />
          )}

          <div className="flex items-start justify-between mb-1">
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">
                {formatCurrency(totalFare)}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">per adult</p>
              <div className="mt-1.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>
                  {fareOption.fareIdentifier || 'STANDARD'}
                </span>
              </div>
            </div>
            {isSelected && !isLoading && (
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            {isLoading && (
              <div className="w-5 h-5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent shrink-0" />
            )}
          </div>
        </div>

        <div className={`${body} px-4 pb-2 pt-1`}>
          {/* Baggage Section */}
          <SectionLabel label="Baggage" />
          {bI?.cB && <FeatureRow ok label={`${bI.cB} Cabin Baggage`} />}
          {bI?.iB && <FeatureRow ok label={`${bI.iB} Check-in Baggage`} />}
          {!bI?.cB && !bI?.iB && (
            <FeatureRow ok={false} label="Baggage not stated by the airline" />
          )}

          {/* Flexibility Section */}
          <SectionLabel label="Flexibility" />
          {refundable ? (
            <FeatureRow ok={/^refundable$/i.test(refundable)} label={refundable} />
          ) : (
            <FeatureRow ok={false} label="Refundability not stated by the airline" />
          )}

          {/* Seats, Meals & More */}
          <SectionLabel label="Seats, Meals & More" />
          <FeatureRow ok label={`${fd?.cc || 'ECONOMY'} · Class ${fd?.cB || 'N/A'}`} />
          <FeatureRow ok={!!fd?.mI} label={fd?.mI ? 'Complimentary Meals' : 'Meal Not Included'} />

          <div className="mt-1 pt-1 border-t border-gray-100 text-[9px] text-gray-400">
            Fare Basis: {fd?.fB || 'N/A'}
          </div>

          {/* Book Now Button with Seats Left on left side */}
          <div className="mt-2 flex items-center justify-between">
            {lowSeat && (
              <div className="text-[10px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                Only {fd?.sR || 0} seats left!
              </div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!isLoading) handleFareSelect(fareOption);
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

  const filteredFares = getFilteredFares();

  return (
    <>
      {initialFareId && !showFareRuleCard && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-xl">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm font-medium text-primary">Preparing your fare…</span>
          </div>
        </div>
      )}
      {!initialFareId && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto flex flex-col">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Flight Details and Fare Options</h2>
              <p className="text-sm text-gray-600 mt-1 font-medium">
                {fromLocation?.city} ({fromLocation?.code}) → {toLocation?.city} ({toLocation?.code}
                )
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {travelDate &&
                  `${new Date(travelDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>
          {/* Cabin Class Tabs - Only cabin classes, NO "ALL" tab */}
          {cabinClasses.length > 0 && (
            <div className="px-6 pt-4 pb-0">
              <div className="flex gap-12 overflow-x-auto">
                {cabinClasses.map((cabin) => {
                  const isActive = activeCabinClass === cabin;
                  const count = getCabinCount(cabin);
                  const startPrice = getCabinStartingPrice(cabin);
                  const displayName = getCabinDisplayName(cabin);

                  return (
                    <button
                      key={cabin}
                      onClick={() => setActiveCabinClass(cabin)}
                      className={`text-sm font-medium transition-all duration-200 whitespace-nowrap relative flex flex-col items-start px-8 pt-4 pb-5 min-w-[180px]
                            ${isActive ? 'text-[#101828]' : 'text-gray-500 hover:text-[#101828]'}`}
                    >
                      {/* Active tab border with curved corners - fully covering the tab */}
                      {isActive && (
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            borderTop: '3px solid #27407C',
                            borderRight: '2px solid #27407C',
                            borderLeft: '2px solid #27407C',
                            borderBottom: 'none',
                            borderRadius: '8px 8px 0 0',
                            top: '0px',
                            left: '0px',
                            right: '0px',
                            bottom: '0px',
                            width: '100%',
                            height: '100%',
                          }}
                        />
                      )}
                      <span
                        className={`relative z-10 text-base font-semibold ${isActive ? 'text-[#101828]' : 'text-gray-700'}`}
                      >
                        {displayName}
                      </span>
                      {startPrice && (
                        <span
                          className={`text-[11px] font-normal relative z-10 mt-0.5
                                ${isActive ? 'text-[#101828]' : 'text-gray-400'}`}
                        >
                          Starting at {formatCurrency(startPrice)}
                        </span>
                      )}
                      {count > 0 && (
                        <span
                          className={`text-[10px] font-normal relative z-10
                                ${isActive ? 'text-[#101828]' : 'text-gray-400'}`}
                        >
                          {count} {count === 1 ? 'fare' : 'fares'} available
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Divider line between tabs and fare cards */}
              <div className="border-t border-[#27407C] mt-0" style={{ borderWidth: '1px' }} />
            </div>
          )}

          {/* Error Banner */}
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

          {/* Fare Cards */}
          <div className="flex-1 px-6 py-5">
            {filteredFares.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-sm">
                  No fares available for {getCabinDisplayName(activeCabinClass)} class
                </div>
              </div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3">
                {filteredFares.map((fareOption: any, idx: number) => (
                  <FareCard key={fareOption.id || idx} fareOption={fareOption} index={idx} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Click on any fare to view rules and select for your journey
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {showFareRuleCard && fareRuleData && (
        <InternationalReturnFlightFareRuleCard
          refundable={refundableLabelFromType(selectedFareDetails?.fd?.ADULT?.rT)}
          isOpen={showFareRuleCard}
          onClose={handleCloseFareRule}
          fareRuleData={fareRuleData}
          fareType="Round Trip"
          currency="INR"
          onConfirm={handleConfirmFareRule}
          selectedFareId={selectedFareId}
        />
      )}
    </>
  );
}
