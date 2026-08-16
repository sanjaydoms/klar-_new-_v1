// src/components/InternationalMultiFareRuleCard.tsx

import { useState } from 'react';
import { X, ChevronRight, Calendar, Clock, AlertCircle, Info, Loader2 } from 'lucide-react';
import { getReviewDetails } from '@/api/flightService.api';
import { useNavigate } from 'react-router-dom';
import { storeReviewData } from '@/utils/reviewSession';

interface InternationalMultiFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  fareType: string;
  totalFare: number;
  currency: string;
  onSelect: (reviewData?: any) => void;
  onCancel: () => void;
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  selectedFareId: string;
  travelDate?: string;
  flightDetails?: any;
}

interface TimeWindow {
  st: number;
  et: number;
  amount?: number;
  additionalFee?: number;
  policyInfo?: string;
}

const formatCurrency = (amount: number, currency: string = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatTimeWindow = (st: number, et: number) => {
  if (st === 0 && et === 0) return 'Any time';
  if (st === 0 && et > 0) return `Within ${et} hours`;
  if (st > 0 && et === 999) return `After ${st} hours`;
  return `${st}–${et} hours`;
};

const CancellationRule = ({ window }: { window: TimeWindow }) => {
  const totalFee = (window.amount || 0) + (window.additionalFee || 0);
  const isFree = totalFee === 0;

  return (
    <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">
              {formatTimeWindow(window.st, window.et)}
            </span>
          </div>
          {window.policyInfo && <p className="text-xs text-gray-500 mt-1">{window.policyInfo}</p>}
        </div>
        <div className="text-right">
          {isFree ? (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Free
            </span>
          ) : (
            <div>
              <span className="text-sm font-bold text-red-600">{formatCurrency(totalFee)}</span>
              {window.amount !== window.additionalFee && window.additionalFee !== undefined && (
                <p className="text-[10px] text-gray-400">
                  Fee: {formatCurrency(window.amount || 0)} + Tax:{' '}
                  {formatCurrency(window.additionalFee || 0)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DateChangeRule = ({ window }: { window: TimeWindow }) => {
  const totalFee = (window.amount || 0) + (window.additionalFee || 0);
  const isFree = totalFee === 0;

  return (
    <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">
              {formatTimeWindow(window.st, window.et)}
            </span>
          </div>
          {window.policyInfo && <p className="text-xs text-gray-500 mt-1">{window.policyInfo}</p>}
        </div>
        <div className="text-right">
          {isFree ? (
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Free
            </span>
          ) : (
            <div>
              <span className="text-sm font-bold text-orange-600">{formatCurrency(totalFee)}</span>
              {window.amount !== window.additionalFee && window.additionalFee !== undefined && (
                <p className="text-[10px] text-gray-400">
                  Fee: {formatCurrency(window.amount || 0)} + Tax:{' '}
                  {formatCurrency(window.additionalFee || 0)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NoShowRule = ({ window }: { window: TimeWindow }) => {
  return (
    <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">
              {formatTimeWindow(window.st, window.et)}
            </span>
          </div>
          {window.policyInfo && <p className="text-xs text-gray-500 mt-1">{window.policyInfo}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            Full Fare
          </span>
        </div>
      </div>
    </div>
  );
};

const SeatChargeRule = ({ window }: { window: TimeWindow }) => {
  const totalFee = (window.amount || 0) + (window.additionalFee || 0);

  return (
    <div className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Info className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-700">
              {formatTimeWindow(window.st, window.et)}
            </span>
          </div>
          {window.policyInfo && <p className="text-xs text-gray-500 mt-1">{window.policyInfo}</p>}
        </div>
        <div className="text-right">
          <span className="text-xs font-semibold text-purple-600">{formatCurrency(totalFee)}</span>
        </div>
      </div>
    </div>
  );
};

export default function InternationalMultiFareRuleCard({
  isOpen,
  onClose,
  fareRuleData,
  fareType,
  totalFare,
  currency,
  onSelect,
  onCancel,
  fromLocation,
  toLocation,
  selectedFareId,
  travelDate,
  flightDetails,
}: InternationalMultiFareRuleCardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    'cancellation' | 'dateChange' | 'noShow' | 'seatCharges'
  >('cancellation');
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  if (!isOpen) return null;

  const fareRule = fareRuleData?.data?.fareRules?.[0];
  const summary = fareRuleData?.data?.summary?.summaries?.[0];
  const structuredRules = fareRule?.structuredRules;

  const cancellationWindows = structuredRules?.cancellation?.timeWindows || [];
  const dateChangeWindows = structuredRules?.dateChange?.timeWindows || [];
  const noShowWindows = structuredRules?.noShow?.timeWindows || [];
  const seatChargeWindows = structuredRules?.seatCharges || [];

  const hasCancellationRules = cancellationWindows.length > 0;
  const hasDateChangeRules = dateChangeWindows.length > 0;
  const hasNoShowRules = noShowWindows.length > 0;
  const hasSeatChargeRules = seatChargeWindows.length > 0;

  const tabs = [
    {
      id: 'cancellation' as const,
      label: 'Cancellation',
      count: cancellationWindows.length,
      hasData: hasCancellationRules,
    },
    {
      id: 'dateChange' as const,
      label: 'Date Change',
      count: dateChangeWindows.length,
      hasData: hasDateChangeRules,
    },
    {
      id: 'noShow' as const,
      label: 'No Show',
      count: noShowWindows.length,
      hasData: hasNoShowRules,
    },
    {
      id: 'seatCharges' as const,
      label: 'Seat Charges',
      count: seatChargeWindows.length,
      hasData: hasSeatChargeRules,
    },
  ];

  const handleSelectFare = async () => {
    setIsLoadingReview(true);
    setReviewError(null);

    try {
      const payload = {
        priceIds: [selectedFareId],
      };

      console.log('Calling review API with payload:', payload);

      const reviewResponse = await getReviewDetails(payload);

      console.log(
        '*************** Review API response:',
        JSON.stringify(reviewResponse.data.sessionId, null, 2),
      );
      storeReviewData(reviewResponse);

      sessionStorage.setItem('ancillarySessionId', reviewResponse?.data?.sessionId);
      sessionStorage.setItem('bookingId', reviewResponse?.data?.mappedData?.bookingId);

      if (flightDetails) {
        sessionStorage.setItem('selectedFlightDetails', JSON.stringify(flightDetails));
      }

      onSelect(reviewResponse);
      onClose();

      navigate('/booking/traveller-info');
    } catch (error: any) {
      console.error('Failed to get review details:', error);
      setReviewError(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to load review details. Please try again.',
      );
    } finally {
      setIsLoadingReview(false);
    }
  };

  const renderRules = () => {
    switch (activeTab) {
      case 'cancellation':
        if (!hasCancellationRules) {
          return (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No cancellation rules available for this fare</p>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {cancellationWindows.map((window: TimeWindow, idx: number) => (
              <CancellationRule key={idx} window={window} />
            ))}
          </div>
        );

      case 'dateChange':
        if (!hasDateChangeRules) {
          return (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No date change rules available for this fare</p>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {dateChangeWindows.map((window: TimeWindow, idx: number) => (
              <DateChangeRule key={idx} window={window} />
            ))}
          </div>
        );

      case 'noShow':
        if (!hasNoShowRules) {
          return (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No no-show rules available for this fare</p>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {noShowWindows.map((window: TimeWindow, idx: number) => (
              <NoShowRule key={idx} window={window} />
            ))}
          </div>
        );

      case 'seatCharges':
        if (!hasSeatChargeRules) {
          return (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No seat charge information available for this fare</p>
            </div>
          );
        }
        return (
          <div className="space-y-2">
            {seatChargeWindows.map((window: TimeWindow, idx: number) => (
              <SeatChargeRule key={idx} window={window} />
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-gray-900">Fare Rules & Policies</h2>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {fareType}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {fromLocation?.city} ({fromLocation?.code}) → {toLocation?.city} ({toLocation?.code}
                )
                {travelDate &&
                  ` • ${new Date(travelDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <X size={18} className="text-gray-600" />
            </button>
          </div>

          {summary && (
            <div
              className={`mt-3 p-3 rounded-xl ${summary.isRefundable ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-600">Total Fare</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(totalFare, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-600">Refundability</p>
                  <p
                    className={`text-sm font-semibold ${summary.isRefundable ? 'text-green-600' : 'text-orange-600'}`}
                  >
                    {summary.isRefundable ? 'Refundable' : 'Non-Refundable'}
                  </p>
                </div>
              </div>
              {summary.cancellationFee > 0 && (
                <div className="mt-2 pt-2 border-t border-green-200/50 text-xs text-gray-600">
                  <span>
                    Cancellation Fee:{' '}
                    {formatCurrency(
                      summary.cancellationFee + (summary.cancellationAdditionalFee || 0),
                      currency,
                    )}
                  </span>
                  {summary.cancellationTimeWindow !== 'N/A' && (
                    <span className="ml-2 text-gray-400">• {summary.cancellationTimeWindow}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {reviewError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={18} />
              <span>{reviewError}</span>
              <button
                onClick={() => setReviewError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="px-6 pt-4 pb-2 border-b border-gray-100">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : tab.hasData
                      ? 'text-gray-700 hover:bg-gray-100'
                      : 'text-gray-400 cursor-not-allowed'
                }`}
                disabled={!tab.hasData}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">{renderRules()}</div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={() => {
              onCancel();
              onClose();
            }}
            disabled={isLoadingReview}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSelectFare}
            disabled={isLoadingReview}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingReview ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Select This Fare
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
