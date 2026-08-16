// MultiFareRuleCard.tsx – production-safe version
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  X,
  Clock,
  AlertCircle,
  Check,
  Info,
  Shield,
  Ban,
  ArrowRight,
  Armchair,
  CalendarX,
  Clock4,
  RefreshCw,
  XCircle,
} from 'lucide-react';

interface MultiFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  fareType: string;
  totalFare?: number;
  currency?: string;
  onSelect: () => void;
  onCancel: () => void;
  fromLocation?: { code: string; city: string };
  toLocation?: { code: string; city: string };
  selectedFareId?: string;
}

interface TimeWindow {
  et: string;
  st: string;
  amount?: number;
  additionalFee?: number;
  policyInfo?: string;
  fcs?: any;
}

export default function MultiFareRuleCard({
  isOpen,
  onClose,
  fareRuleData,
  fareType,
  totalFare,
  currency = 'INR',
  onSelect,
  onCancel,
  fromLocation,
  toLocation,
  selectedFareId,
}: MultiFareRuleCardProps) {
  const [activeTab, setActiveTab] = useState<'cancellation' | 'dateChange' | 'noShow' | 'seat'>(
    'cancellation',
  );

  if (!isOpen) return null;
  if (!fareRuleData?.data) return null;

  const ruleData = fareRuleData.data;
  const fareRules = ruleData.fareRules?.[0]?.structuredRules;
  const summary = ruleData.summary?.summaries?.[0];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatTimeWindow = (st: string, et: string) => {
    const start = parseInt(st);
    const end = parseInt(et);
    if (start === 0 && end === 5) return 'Within 5 hours of departure';
    if (start === 5 && end === 74) return '5 to 74 hours before departure';
    if (start === 74 && end === 8760) return 'More than 74 hours before departure';
    if (start === 0 && end === 8760) return 'Anytime';
    return `${start}–${end} hours before departure`;
  };

  const getTaxDescription = (code: string): string => {
    const taxMap: Record<string, string> = {
      CCF: 'Platform Cancellation Fee',
      CCFT: 'Platform Cancellation Fee Tax',
      ACF: 'Airline Cancellation Fee',
      ACFT: 'Airline Cancellation Fee Tax',
      ARF: 'Airline Reschedule Fee',
      ARFT: 'Airline Reschedule Fee Tax',
      CRF: 'Carrier Reschedule Fee',
      CRFT: 'Carrier Reschedule Fee Tax',
      BF: 'Base Fare',
      TAF: 'Taxes & Fees',
      TF: 'Total Fare',
      MF: 'Management Fee',
      YQ: 'Fuel Surcharge',
      WO: 'Airport Tax',
      PSF: 'Passenger Service Fee',
      TripjackCancellationFee: 'Platform Cancellation Fee',
      TripjackRescheduleFee: 'Platform Reschedule Fee',
      AirlineCancellationFee: 'Airline Cancellation Fee',
      AirlineRescheduleFee: 'Airline Reschedule Fee',
    };
    return taxMap[code] ?? code;
  };

  // ── Tab renderers ──────────────────────────────────────────────────────
  const renderCancellationRules = () => {
    const cancellation = fareRules?.cancellation;
    if (!cancellation || !cancellation.timeWindows || cancellation.timeWindows.length === 0) {
      return <EmptyState message="No cancellation rules available" />;
    }

    return (
      <div className="space-y-3">
        {summary && summary.cancellationFee !== undefined && (
          <SummaryBanner
            color="red"
            icon={<Ban className="w-4 h-4 text-red-600" />}
            title="Cancellation Summary"
          >
            <p className="text-sm text-gray-700">
              Fee: {formatCurrency(summary.cancellationFee ?? 0)} +{' '}
              {formatCurrency(summary.cancellationAdditionalFee ?? 0)} additional
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Window: {summary.cancellationTimeWindow || 'N/A'}
            </p>
          </SummaryBanner>
        )}
        {cancellation.timeWindows.map((w: TimeWindow, i: number) => (
          <FeeWindow
            key={i}
            window={w}
            formatCurrency={formatCurrency}
            formatTimeWindow={formatTimeWindow}
            getTaxDescription={getTaxDescription}
            icon={<Clock className="w-4 h-4 text-red-400" />}
          />
        ))}
      </div>
    );
  };

  const renderDateChangeRules = () => {
    const dateChange = fareRules?.dateChange;
    if (!dateChange || !dateChange.timeWindows || dateChange.timeWindows.length === 0) {
      return <EmptyState message="No date change rules available" />;
    }

    return (
      <div className="space-y-3">
        {summary && summary.dateChangeFee !== undefined && (
          <SummaryBanner
            color="blue"
            icon={<CalendarX className="w-4 h-4 text-blue-600" />}
            title="Date Change Summary"
          >
            <p className="text-sm text-gray-700">
              Fee: {formatCurrency(summary.dateChangeFee ?? 0)} +{' '}
              {formatCurrency(summary.dateChangeAdditionalFee ?? 0)} additional
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Window: {summary.dateChangeTimeWindow || 'N/A'}
            </p>
            {summary.dateChangePolicy && summary.dateChangePolicy !== 'N/A' && (
              <p className="text-xs text-blue-600 mt-1 font-medium">{summary.dateChangePolicy}</p>
            )}
          </SummaryBanner>
        )}
        {dateChange.timeWindows.map((w: TimeWindow, i: number) => (
          <FeeWindow
            key={i}
            window={w}
            formatCurrency={formatCurrency}
            formatTimeWindow={formatTimeWindow}
            getTaxDescription={getTaxDescription}
            icon={<Clock4 className="w-4 h-4 text-blue-400" />}
          />
        ))}
      </div>
    );
  };

  const renderNoShowRules = () => {
    const noShow = fareRules?.noShow;
    if (!noShow || !noShow.timeWindows || noShow.timeWindows.length === 0) {
      return <EmptyState message="No show rules not available" />;
    }

    return (
      <div className="space-y-3">
        {summary && summary.noShowPolicy && summary.noShowPolicy !== 'N/A' && (
          <SummaryBanner
            color="orange"
            icon={<AlertCircle className="w-4 h-4 text-orange-600" />}
            title="No Show Policy"
          >
            <p className="text-sm text-gray-700">{summary.noShowPolicy}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Window: {summary.noShowTimeWindow || 'N/A'}
            </p>
          </SummaryBanner>
        )}
        {noShow.timeWindows.map((w: TimeWindow, i: number) => (
          <div key={i} className="border border-amber-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(w.st, w.et)}
              </span>
            </div>
            {w.policyInfo && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                <p className="text-sm text-amber-800">{w.policyInfo}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSeatCharges = () => {
    const seatCharges = fareRules?.seatCharges;
    if (!seatCharges || seatCharges.length === 0) {
      return <EmptyState message="No seat charge information available" />;
    }

    return (
      <div className="space-y-3">
        {seatCharges.map((charge: TimeWindow, i: number) => (
          <div key={i} className="border border-purple-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Armchair className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(charge.st, charge.et)}
              </span>
            </div>
            {charge.amount !== undefined && charge.amount > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Fee: {formatCurrency(charge.amount)} + {formatCurrency(charge.additionalFee || 0)}{' '}
                additional
              </div>
            )}
            {charge.policyInfo && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mt-2">
                <p className="text-sm text-purple-800">{charge.policyInfo}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    {
      key: 'cancellation',
      label: 'Cancellation',
      icon: <Ban className="w-3 h-3" />,
      active: 'bg-red-100 text-red-700',
    },
    {
      key: 'dateChange',
      label: 'Date Change',
      icon: <CalendarX className="w-3 h-3" />,
      active: 'bg-blue-100 text-blue-700',
    },
    {
      key: 'noShow',
      label: 'No Show',
      icon: <AlertCircle className="w-3 h-3" />,
      active: 'bg-orange-100 text-orange-700',
    },
    {
      key: 'seat',
      label: 'Seat',
      icon: <Armchair className="w-3 h-3" />,
      active: 'bg-purple-100 text-purple-700',
    },
  ] as const;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-none p-0 sm:max-w-2xl" showCloseButton={false}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-4">
          {/* <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-blue-600" />
                            <h2 className="text-lg font-bold text-gray-900">
                                {fareType} Fare Rules
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div> */}

          {/* Route strip */}
          {/* {fromLocation && toLocation && (
                        <div className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                            <Shield className="w-3 h-3 text-gray-400" />
                            <span className="font-semibold text-gray-800">{fromLocation.city}</span>
                            <span className="text-gray-400">({fromLocation.code})</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className="font-semibold text-gray-800">{toLocation.city}</span>
                            <span className="text-gray-400">({toLocation.code})</span>
                            {summary?.route && (
                                <span className="ml-1 bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                    {summary.route}
                                </span>
                            )}
                        </div>
                    )} */}

          {/* Tabs */}
          <div className="flex flex-wrap">
            {tabs.map(({ key, label, icon, active }, index) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center justify-center gap-1 px-4 py-2 text-xs font-semibold uppercase transition-all flex-1 min-w-[80px] ${
                  activeTab === key
                    ? 'bg-[#FF0004] text-white'
                    : 'bg-white text-[#4A5565] hover:bg-gray-50'
                } ${index > 0 ? 'border-l border-gray-200' : ''}`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Refundable status */}
          {summary?.refundable && (
            <div
              className={`mb-4 p-3 rounded-xl border flex items-center gap-2 ${
                /^refundable$/i.test(summary.refundable)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              {/^refundable$/i.test(summary.refundable) ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span
                className={`text-sm font-semibold ${
                  /^refundable$/i.test(summary.refundable) ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {summary.refundable} Fare
              </span>
            </div>
          )}

          {activeTab === 'cancellation' && renderCancellationRules()}
          {activeTab === 'dateChange' && renderDateChangeRules()}
          {activeTab === 'noShow' && renderNoShowRules()}
          {activeTab === 'seat' && renderSeatCharges()}
        </div>

        {/* ── Total fare strip ──────────────────────────────────── */}
        {totalFare && totalFare > 0 && (
          <div className="px-6 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">Total Fare</span>
            <span className="text-lg font-bold text-blue-600">{formatCurrency(totalFare)}</span>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
              onClose();
            }}
            className="h-10 px-5"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              const newSelection = {
                fromLocation,
                toLocation,
                selectedFareId,
                fareType,
                totalFare,
                currency,
              };

              // Get existing selections
              const raw = sessionStorage.getItem('selectedMultiCityFares');
              let selections: any[] = raw ? JSON.parse(raw) : [];

              // Remove existing selection for this route if any
              if (fromLocation && toLocation) {
                selections = selections.filter(
                  (s: any) =>
                    !(
                      s.fromLocation?.code === fromLocation.code &&
                      s.toLocation?.code === toLocation.code
                    ),
                );
              }

              // Add new selection
              selections.push(newSelection);

              // Store back to sessionStorage
              sessionStorage.setItem('selectedMultiCityFares', JSON.stringify(selections));

              // Also store just the fare IDs separately for easy access
              const fareIds = selections.map((s) => s.selectedFareId);
              sessionStorage.setItem('selectedFareIds', JSON.stringify(fareIds));

              // Dispatch event to notify other components
              window.dispatchEvent(new Event('selectedFaresUpdated'));
              window.dispatchEvent(new CustomEvent('fareIdsUpdated', { detail: fareIds }));

              onSelect();
              onClose();
            }}
            className="h-10 px-5 shadow-md"
          >
            Select This Fare
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Small helpers ──────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
      <Info className="w-4 h-4" />
      {message}
    </div>
  );
}

function SummaryBanner({
  color,
  icon,
  title,
  children,
}: {
  color: 'red' | 'blue' | 'orange';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const palette: Record<string, string> = {
    red: 'bg-red-50 border-red-100',
    blue: 'bg-blue-50 border-blue-100',
    orange: 'bg-orange-50 border-orange-100',
  };
  const titleColor: Record<string, string> = {
    red: 'text-red-800',
    blue: 'text-blue-800',
    orange: 'text-orange-800',
  };

  return (
    <div className={`border rounded-xl p-3.5 ${palette[color]}`}>
      <div className={`flex items-center gap-2 font-semibold text-sm mb-2 ${titleColor[color]}`}>
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function FeeWindow({
  window: w,
  formatCurrency,
  formatTimeWindow,
  getTaxDescription,
  icon,
}: {
  window: TimeWindow;
  formatCurrency: (n: number) => string;
  formatTimeWindow: (st: string, et: string) => string;
  getTaxDescription: (code: string) => string;
  icon: React.ReactNode;
}) {
  const hasBreakdown = w.fcs && Object.entries(w.fcs).some(([, v]) => v && Number(v) > 0);

  return (
    <div className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-sm font-medium text-gray-700">{formatTimeWindow(w.st, w.et)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Airline Fee</p>
          <p className="font-semibold text-sm mt-0.5">{formatCurrency(w.amount ?? 0)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Additional Fee</p>
          <p className="font-semibold text-sm mt-0.5">{formatCurrency(w.additionalFee ?? 0)}</p>
        </div>
      </div>

      {hasBreakdown && (
        <div className="mt-3 pt-2.5 border-t border-gray-100">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Fee Breakdown
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(w.fcs!).map(([code, amount]: [string, any]) =>
              amount && Number(amount) > 0 ? (
                <div key={code} className="text-xs flex justify-between">
                  <span className="text-gray-500">{getTaxDescription(code)}</span>
                  <span className="font-medium ml-2">{formatCurrency(Number(amount))}</span>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}

      {w.policyInfo && <p className="text-xs text-gray-400 mt-2 italic">{w.policyInfo}</p>}
    </div>
  );
}
