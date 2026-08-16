import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  X,
  Clock,
  AlertCircle,
  Check,
  XCircle,
  CalendarX,
  Clock4,
  Ban,
  RefreshCw,
  Armchair,
} from 'lucide-react';

interface ReturnFareRuleCardProps {
  isOpen: boolean;
  onClose: () => void;
  fareRuleData: any;
  onConfirm: () => void;
  fareType: string;
  currency?: string;
}

export default function ReturnFareRuleCard({
  isOpen,
  onClose,
  fareRuleData,
  onConfirm,
  fareType,
  currency = 'INR',
}: ReturnFareRuleCardProps) {
  const [activeTab, setActiveTab] = useState<'cancellation' | 'dateChange' | 'noShow' | 'seat'>(
    'cancellation',
  );

  if (!isOpen) return null;

  // Show loading or error state if no fare rules
  if (!fareRuleData?.fareRule || Object.keys(fareRuleData.fareRule).length === 0) {
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50">
        <div className="bg-white shadow-2xl max-w-2xl w-full p-8">
          <div className="flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mb-4" />
            <p className="text-gray-600 text-center">Fare rules not available for this option.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { data } = fareRuleData;
  const fareRuleObj = fareRuleData.fareRule;
  // const summary = data.summary?.summaries?.[0];

  const firstRouteKey = Object.keys(fareRuleObj)[0];
  const routeData = fareRuleObj[firstRouteKey];
  const fareRules = routeData?.tfr; // This contains CANCELLATION, DATECHANGE, NO_SHOW, SEAT_CHARGEABLE
  const basicFareRules = routeData?.fr;

  const summary = {
    isRefundable: false, // Determine from your data if available
    cancellationFee: fareRules?.CANCELLATION?.[0]?.amount || 0,
    cancellationAdditionalFee: fareRules?.CANCELLATION?.[0]?.additionalFee || 0,
    cancellationTimeWindow: fareRules?.CANCELLATION?.[0]
      ? `${fareRules.CANCELLATION[0].st} - ${fareRules.CANCELLATION[0].et} hours`
      : 'N/A',
    dateChangeFee: fareRules?.DATECHANGE?.[0]?.amount || 0,
    dateChangeAdditionalFee: fareRules?.DATECHANGE?.[0]?.additionalFee || 0,
    dateChangeTimeWindow: fareRules?.DATECHANGE?.[0]
      ? `${fareRules.DATECHANGE[0].st} - ${fareRules.DATECHANGE[0].et} hours`
      : 'N/A',
    dateChangePolicy: fareRules?.DATECHANGE?.[0]?.policyInfo || '',
    noShowPolicy: fareRules?.NO_SHOW?.[0]?.policyInfo || '',
    noShowTimeWindow: fareRules?.NO_SHOW?.[0]
      ? `${fareRules.NO_SHOW[0].st} - ${fareRules.NO_SHOW[0].et} hours`
      : 'N/A',
  };

  const formatCurrency = (amount: number) => {
    if (!amount && amount !== 0) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTimeWindow = (st: string | number, et: string | number) => {
    if (!st && !et) return 'Information not available';

    const start = parseInt(st as string);
    const end = parseInt(et as string);

    if (start === 0 && end === 5) return 'Within 5 hours of departure';
    if (start === 5 && end === 74) return '5 hours to 74 hours before departure';
    if (start === 74 && end === 8760) return 'More than 74 hours before departure';
    if (start === 0 && end === 8760) return 'Anytime';

    return `${start} - ${end} hours before departure`;
  };

  const getTaxDescription = (code: string): string => {
    const taxMap: Record<string, string> = {
      CCF: 'TripJack Cancellation Fee',
      CCFT: 'TripJack Cancellation Fee Tax',
      ACF: 'Airline Cancellation Fee',
      ACFT: 'Airline Cancellation Fee Tax',
      ARF: 'Airline Reschedule Fee',
      ARFT: 'Airline Reschedule Fee Tax',
      CRF: 'Carrier Reschedule Fee',
      CRFT: 'Carrier Reschedule Fee Tax',
      BF: 'Base Fare',
      TAF: 'Taxes And Fees',
      TF: 'Total Fare',
      MF: 'Management Fee',
      MFT: 'Management Fee Tax',
      OT: 'Other Tax',
      YQ: 'Fuel Surcharge',
      WO: 'Airport Tax',
      PSF: 'Passenger Service Fee',
      WC: 'Airport Arrival Tax',
      YM: 'Development Fee',
    };
    return taxMap[code] || code;
  };

  const renderCancellationRules = () => {
    const cancellation = fareRules?.CANCELLATION; // Note: uppercase CANCELLATION
    if (!cancellation || cancellation.length === 0) {
      return <p className="text-gray-500">No cancellation rules available</p>;
    }

    return (
      <div className="space-y-4">
        {summary && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700 mb-1">
              <Ban className="w-4 h-4" />
              <span className="font-medium">Cancellation Summary</span>
            </div>
            <p className="text-sm">
              Cancellation Fee: {formatCurrency(summary.cancellationFee)}
              {summary.cancellationAdditionalFee > 0 &&
                ` + ${formatCurrency(summary.cancellationAdditionalFee)} additional fee`}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Time Window: {summary.cancellationTimeWindow || 'N/A'}
            </p>
          </div>
        )}

        {cancellation.map((window: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(window.st, window.et)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-500">Airline Fee</p>
                <p className="font-semibold">{formatCurrency(window.amount || 0)}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-500">Additional Fee</p>
                <p className="font-semibold">{formatCurrency(window.additionalFee || 0)}</p>
              </div>
            </div>

            {/* {window.FareComponentsSummary &&
              Object.entries(window.FareComponentsSummary).filter(
                ([_, value]) => value && Number(value) > 0,
              ).length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Fee Breakdown</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(window.FareComponentsSummary).map(
                      ([code, amount]: [string, any]) =>
                        amount &&
                        Number(amount) > 0 && (
                          <div key={code} className="text-xs">
                            <span className="text-gray-500">{getTaxDescription(code)}:</span>
                            <span className="font-medium ml-1">{formatCurrency(amount)}</span>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )}

            {window.policyInfo && (
              <p className="text-xs text-gray-500 mt-2 italic">{window.policyInfo}</p>
            )} */}
          </div>
        ))}
      </div>
    );
  };

  const renderDateChangeRules = () => {
    const dateChange = fareRules?.DATECHANGE; // Note: uppercase DATECHANGE
    if (!dateChange || dateChange.length === 0) {
      return <p className="text-gray-500">No date change rules available</p>;
    }

    return (
      <div className="space-y-4">
        {summary && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-700 mb-1">
              <CalendarX className="w-4 h-4" />
              <span className="font-medium">Date Change Summary</span>
            </div>
            <p className="text-sm">
              Date Change Fee: {formatCurrency(summary.dateChangeFee)}
              {summary.dateChangeAdditionalFee > 0 &&
                ` + ${formatCurrency(summary.dateChangeAdditionalFee)} additional fee`}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Time Window: {summary.dateChangeTimeWindow || 'N/A'}
            </p>
            {summary.dateChangePolicy && (
              <p className="text-xs text-blue-600 mt-1">{summary.dateChangePolicy}</p>
            )}
          </div>
        )}

        {dateChange.map((window: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Clock4 className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(window.st, window.et)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-500">Airline Fee</p>
                <p className="font-semibold">{formatCurrency(window.amount || 0)}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-500">Additional Fee</p>
                <p className="font-semibold">{formatCurrency(window.additionalFee || 0)}</p>
              </div>
            </div>

            {/* {window.FareComponentsSummary &&
              Object.entries(window.FareComponentsSummary).filter(
                ([_, value]) => value && Number(value) > 0,
              ).length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-600 mb-2">Fee Breakdown123</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(window.FareComponentsSummary).map(
                      ([code, amount]: [string, any]) =>
                        amount &&
                        Number(amount) > 0 && (
                          <div key={code} className="text-xs">
                            <span className="text-gray-500">{getTaxDescription(code)}:</span>
                            <span className="font-medium ml-1">{formatCurrency(amount)}</span>
                          </div>
                        ),
                    )}
                  </div>
                </div>
              )} */}

            {window.policyInfo && (
              <p className="text-xs text-gray-500 mt-2 italic">{window.policyInfo}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderNoShowRules = () => {
    const noShow = fareRules?.NO_SHOW; // Note: uppercase NO_SHOW
    if (!noShow || noShow.length === 0) {
      return <p className="text-gray-500">No show rules available</p>;
    }

    return (
      <div className="space-y-4">
        {summary && summary.noShowPolicy && (
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-700 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">No Show Policy</span>
            </div>
            <p className="text-sm">{summary.noShowPolicy}</p>
            {summary.noShowTimeWindow && (
              <p className="text-xs text-gray-600 mt-1">Time Window: {summary.noShowTimeWindow}</p>
            )}
          </div>
        )}

        {noShow.map((window: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(window.st, window.et)}
              </span>
            </div>

            {window.policyInfo && (
              <div className="bg-amber-50 border border-amber-100 rounded p-3">
                <p className="text-sm text-amber-800">{window.policyInfo}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSeatCharges = () => {
    const seatCharges = fareRules?.SEAT_CHARGEABLE; // Note: uppercase SEAT_CHARGEABLE
    if (!seatCharges || seatCharges.length === 0) {
      return <p className="text-gray-500">No seat charge information available</p>;
    }

    return (
      <div className="space-y-4">
        {seatCharges.map((charge: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <Armchair className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {formatTimeWindow(charge.st, charge.et)}
              </span>
            </div>

            {charge.policyInfo && (
              <div className="bg-purple-50 border border-purple-100 rounded p-3">
                <p className="text-sm text-purple-800">{charge.policyInfo}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[80vh] w-full max-w-2xl gap-0 overflow-hidden rounded-none p-0 sm:max-w-2xl" showCloseButton={false}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          {/* <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-600" />
                            <h2 className="text-xl font-bold text-gray-900">
                                {fareType} Fare Rules
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div> */}

          {/* Tabs */}
          <div className="flex gap-0 mt-4 w-full">
            <button
              onClick={() => setActiveTab('cancellation')}
              className={`
            flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1
            ${
              activeTab === 'cancellation'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }
        `}
            >
              <Ban className="w-4 h-4" />
              Cancellation
            </button>
            <button
              onClick={() => setActiveTab('dateChange')}
              className={`
            flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1 border-l border-gray-200
            ${
              activeTab === 'dateChange'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }
        `}
            >
              <CalendarX className="w-4 h-4" />
              Date Change
            </button>
            <button
              onClick={() => setActiveTab('noShow')}
              className={`
            flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1 border-l border-gray-200
            ${
              activeTab === 'noShow'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }
        `}
            >
              <AlertCircle className="w-4 h-4" />
              No Show
            </button>
            <button
              onClick={() => setActiveTab('seat')}
              className={`
            flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all flex-1 border-l border-gray-200
            ${
              activeTab === 'seat'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-black hover:bg-gray-200'
            }
        `}
            >
              <Armchair className="w-4 h-4" />
              Seat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {/* Refundable Status */}
          {summary && (
            <div
              className={`mb-4 p-3 rounded-lg ${summary.isRefundable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
            >
              <div className="flex items-center gap-2">
                {summary.isRefundable ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Refundable Fare</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-700">Non-Refundable Fare</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'cancellation' && renderCancellationRules()}
          {activeTab === 'dateChange' && renderDateChangeRules()}
          {activeTab === 'noShow' && renderNoShowRules()}
          {activeTab === 'seat' && renderSeatCharges()}
        </div>

        {/* Footer with Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="h-10 px-6">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="h-10 px-6 shadow-md">
              Confirm Selection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
