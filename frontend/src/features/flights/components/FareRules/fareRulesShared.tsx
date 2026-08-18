import { useState } from 'react';
import {
  Clock,
  ArrowLeft,
  X,
  AlertCircle,
  Luggage,
  Info,
  XCircle,
  FileText,
  CalendarDays,
  Armchair,
  Briefcase,
  UtensilsCrossed,
  CheckCircle2,
  BadgeCheck,
  RefreshCw,
  ShieldCheck,
  Headphones,
  Tag,
  Loader2,
} from 'lucide-react';

import { refundableLabelFromType } from '@/features/flights/utils/flightDisplay';
import { cabinBaggageOf } from '@/features/flights/utils/flightDisplay';
import { Button } from '@/components/ui/button';

/**
 * Shared "Fare Rules & Policies" design. One presentational implementation for
 * every flow (one-way / return / multi-city, desktop and mobile): each flow
 * keeps its own data plumbing and confirm/booking handlers and feeds this a
 * TripJack `tfr` block plus an optional normalized fare summary.
 */

export interface FareRulePolicyRule {
  st?: string;
  et?: string;
  amount?: number;
  additionalFee?: number;
  policyInfo?: string;
  FareComponentsSummary?: Record<string, number>;
}

export interface FareRulesTfr {
  CANCELLATION?: FareRulePolicyRule[];
  DATECHANGE?: FareRulePolicyRule[];
  NO_SHOW?: FareRulePolicyRule[];
  SEAT_CHARGEABLE?: FareRulePolicyRule[];
}

/** Everything the Summary tab renders; omit fields that a flow doesn't have. */
export interface FareSummaryInfo {
  fareType?: string;
  cabinClass?: string;
  totalAmount?: number;
  baseFare?: number;
  tax?: number;
  /** e.g. "per adult" — shown under the total. */
  perPaxLabel?: string;
  refundableType?: number;
  cabinBaggage?: string;
  checkInBaggage?: string;
  mealIncluded?: boolean;
  seatsRemaining?: number;
}

export type FareRulesTabId = 'summary' | 'cancellation' | 'datechange' | 'noshow' | 'seat';

/** activeTab -> the TripJack tfr key it renders (toUpperCase() breaks on NO_SHOW / SEAT_CHARGEABLE). */
export const TAB_TFR_KEY: Record<Exclude<FareRulesTabId, 'summary'>, keyof FareRulesTfr> = {
  cancellation: 'CANCELLATION',
  datechange: 'DATECHANGE',
  noshow: 'NO_SHOW',
  seat: 'SEAT_CHARGEABLE',
};

const TRUST_BADGES = [
  { icon: BadgeCheck, title: 'Transparent Policies', text: 'No hidden charges' },
  { icon: RefreshCw, title: 'Flexible Options', text: 'Change or cancel with ease' },
  { icon: ShieldCheck, title: 'Secure Booking', text: 'Your data is protected' },
  { icon: Headphones, title: '24/7 Support', text: "We're here to help" },
];

export const formatFareCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export const getTimeRangeText = (st?: string, et?: string) => {
  const startHour = parseInt(st ?? '', 10);
  const endHour = parseInt(et ?? '', 10);
  if (Number.isNaN(startHour) || Number.isNaN(endHour)) return '';

  if (endHour >= 8760) return `${startHour}+ hours before departure`;
  if (endHour >= 168)
    return `${startHour} hours to ${Math.floor(endHour / 24)} days before departure`;
  if (endHour >= 24) return `${startHour} to ${Math.floor(endHour / 24)} days before departure`;
  return `${startHour} to ${endHour} hours before departure`;
};

/**
 * TripJack's FareComponentsSummary carries the fee taxes on top of the
 * amount (airline) / additionalFee (platform) split — surface them when
 * they are non-zero so the total on the card is fully accounted for.
 */
const feeBreakdownRows = (rule: FareRulePolicyRule, kind: 'cancellation' | 'reschedule') => {
  const fcs = rule.FareComponentsSummary || {};
  const airlineTax =
    kind === 'cancellation' ? fcs.AirlineCancellationFeeTax : fcs.AirlineRescheduleFeeTax;
  const platformTax =
    kind === 'cancellation' ? fcs.TripjackCancellationFeeTax : fcs.TripjackRescheduleFeeTax;
  const rows = [
    { label: 'Airline', value: rule.amount || 0 },
    { label: 'Fee', value: rule.additionalFee || 0 },
  ];
  if (airlineTax && airlineTax > 0) rows.push({ label: 'Airline Tax', value: airlineTax });
  if (platformTax && platformTax > 0) rows.push({ label: 'Fee Tax', value: platformTax });
  return rows;
};

/**
 * Maps a TripjackFieldMapper-shaped fare (FareDetails.AdultFare + priceSummary,
 * as returned by /fare/oneway|return|multicity and carried in the flows'
 * selectedFare) onto the summary the panel renders. Tolerates any subset.
 */
export function buildFareSummary(selectedFare: any): FareSummaryInfo | undefined {
  if (!selectedFare) return undefined;
  const adult = selectedFare.FareDetails?.AdultFare;
  const price = selectedFare.priceSummary?.AdultFare;
  return {
    fareType: selectedFare.FareIdentifierType,
    cabinClass: adult?.CabinClass,
    totalAmount: price?.total ?? adult?.FareComponents?.TotalFare,
    baseFare: price?.baseFare,
    tax: price?.tax,
    perPaxLabel: 'per adult',
    refundableType: adult?.RefundableType,
    cabinBaggage: cabinBaggageOf(adult?.BaggageInfo),
    checkInBaggage: (adult?.BaggageInfo?.CheckInBaggage || '').trim(),
    mealIncluded: typeof adult?.MealIncluded === 'boolean' ? adult.MealIncluded : undefined,
    seatsRemaining: adult?.SeatsRemaining,
  };
}

/** Klar-branded modal/page header from the shared design. */
export function FareRulesHeader({
  onClose,
  onBack,
}: {
  onClose?: (() => void) | undefined;
  onBack?: (() => void) | undefined;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3 sm:gap-4">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <img
          src="/logo/KLARBlue.png"
          alt="Klar Travels"
          className="hidden h-10 w-auto object-contain sm:block"
        />
        <div>
          <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">
            Fare Rules & Policies
          </h1>
          <p className="text-xs text-gray-500 sm:text-sm">
            Review the fare rules before confirming your booking
          </p>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

/** "Back to Fares" / "Confirm & Proceed to Booking" bar from the shared design. */
export function FareRulesFooter({
  onBack,
  onConfirm,
  isLoading,
  backLabel = 'Back to Fares',
  confirmLabel = 'Confirm & Proceed to Booking',
  confirmDisabled = false,
}: {
  onBack: () => void;
  onConfirm: () => void;
  isLoading?: boolean | undefined;
  backLabel?: string | undefined;
  confirmLabel?: string | undefined;
  confirmDisabled?: boolean | undefined;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-4 sm:px-6">
      <Button variant="outline" onClick={onBack} className="h-10 rounded-lg px-5">
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Button>
      <Button
        onClick={onConfirm}
        disabled={isLoading || confirmDisabled}
        className="h-10 rounded-lg px-6 font-semibold shadow-md"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          confirmLabel
        )}
      </Button>
    </div>
  );
}

/**
 * The tab bar + tab content of the shared design. Owns the active-tab state;
 * tabs without data are disabled, and Summary is omitted when no summary/tfr
 * content exists for it. Must sit inside a scrollable parent.
 */
export function FareRulesPanel({
  tfr,
  summary,
  showSummary = true,
}: {
  tfr?: FareRulesTfr | undefined;
  summary?: FareSummaryInfo | undefined;
  showSummary?: boolean | undefined;
}) {
  const hasSummaryTab = showSummary && Boolean(summary);
  const firstPolicyTab: FareRulesTabId =
    (['cancellation', 'datechange', 'noshow', 'seat'] as const).find(
      (id) => (tfr?.[TAB_TFR_KEY[id]]?.length ?? 0) > 0,
    ) ?? 'cancellation';
  const [activeTab, setActiveTab] = useState<FareRulesTabId>(
    hasSummaryTab ? 'summary' : firstPolicyTab,
  );

  const refundable = refundableLabelFromType(summary?.refundableType);
  const seatComplimentary = Boolean(
    tfr?.SEAT_CHARGEABLE?.some((rule) => /complimentary|free/i.test(rule?.policyInfo || '')),
  );

  const tabs: Array<{
    id: FareRulesTabId;
    label: string;
    icon: typeof FileText;
    iconClass: string;
    hasData: boolean;
  }> = [
    ...(hasSummaryTab
      ? [
          {
            id: 'summary' as const,
            label: 'Summary',
            icon: FileText,
            iconClass: 'text-primary',
            hasData: true,
          },
        ]
      : []),
    {
      id: 'cancellation',
      label: 'Cancellation',
      icon: XCircle,
      // Filled red badge like the design — reads on both white and navy.
      iconClass: 'fill-brand-red text-white',
      hasData: (tfr?.CANCELLATION?.length ?? 0) > 0,
    },
    {
      id: 'datechange',
      label: 'Date Change',
      icon: CalendarDays,
      iconClass: 'text-primary',
      hasData: (tfr?.DATECHANGE?.length ?? 0) > 0,
    },
    {
      id: 'noshow',
      label: 'No Show',
      icon: Clock,
      iconClass: 'text-amber-500',
      hasData: (tfr?.NO_SHOW?.length ?? 0) > 0,
    },
    {
      id: 'seat',
      label: 'Seat Policy',
      icon: Armchair,
      iconClass: 'text-violet-500',
      hasData: (tfr?.SEAT_CHARGEABLE?.length ?? 0) > 0,
    },
  ];

  const includedItems: Array<{ icon: typeof Luggage; label: string }> = [];
  if (summary?.checkInBaggage)
    includedItems.push({ icon: Luggage, label: `${summary.checkInBaggage} Check-in Baggage` });
  if (summary?.mealIncluded === true)
    includedItems.push({ icon: UtensilsCrossed, label: 'Complimentary Meal' });
  if (seatComplimentary)
    includedItems.push({ icon: Armchair, label: 'Standard Seat Selection' });

  const activeTfrRules: FareRulePolicyRule[] =
    activeTab !== 'summary' ? (tfr?.[TAB_TFR_KEY[activeTab]] ?? []) : [];

  return (
    <div className="px-4 pt-5 pb-6 sm:px-6">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isDisabled = !tab.hasData;

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'border-primary bg-primary text-white shadow-md'
                  : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 hover:bg-gray-50'
              } ${isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
            >
              <Icon
                className={`h-4.5 w-4.5 shrink-0 ${
                  // The red cancellation badge keeps its fill everywhere;
                  // other icons flip to white on the navy active tab.
                  tab.id === 'cancellation' ? tab.iconClass : isActive ? 'text-white' : tab.iconClass
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {/* Summary */}
        {activeTab === 'summary' && summary && (
          <div>
            <div className="grid gap-5 md:grid-cols-5">
              {/* Refundability */}
              {refundable && (
                <div
                  className={`rounded-xl border p-5 md:col-span-2 ${
                    refundable === 'Refundable'
                      ? 'border-green-200 bg-green-50'
                      : refundable === 'Partially Refundable'
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {refundable === 'Non-Refundable' ? (
                      <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                    ) : (
                      <CheckCircle2
                        className={`mt-0.5 h-6 w-6 shrink-0 ${
                          refundable === 'Refundable' ? 'text-green-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                    <div>
                      <p
                        className={`font-display text-lg font-bold ${
                          refundable === 'Refundable'
                            ? 'text-green-700'
                            : refundable === 'Partially Refundable'
                              ? 'text-amber-700'
                              : 'text-red-700'
                        }`}
                      >
                        {refundable} Fare
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {refundable === 'Refundable'
                          ? 'You can cancel your booking and get a refund as per policy.'
                          : refundable === 'Partially Refundable'
                            ? 'You may receive a partial refund on cancellation as per policy.'
                            : 'This fare is non-refundable. Cancellation charges apply as per policy.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fare Summary */}
              <div className={refundable ? 'md:col-span-3' : 'md:col-span-5'}>
                <h3 className="font-display text-lg font-bold text-gray-900">Fare Summary</h3>
                <div className="mt-2 grid grid-cols-3 gap-4 rounded-xl border border-gray-200 bg-white p-5">
                  <div>
                    <p className="text-xs text-gray-500">Fare Type</p>
                    <p className="mt-1 text-sm font-bold break-words text-gray-900">
                      {summary.fareType || 'Standard'}
                    </p>
                  </div>
                  {/* Cells render only when the flow actually knows the value —
                      a guessed "Economy" or "₹0" would be wrong information. */}
                  {summary.cabinClass && (
                    <div>
                      <p className="text-xs text-gray-500">Cabin Class</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{summary.cabinClass}</p>
                    </div>
                  )}
                  {(summary.totalAmount ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-gray-500">Total Amount</p>
                      <p className="mt-0.5 text-2xl font-extrabold text-blue-600">
                        {formatFareCurrency(summary.totalAmount!)}
                      </p>
                      {summary.perPaxLabel && (
                        <p className="text-xs text-gray-500">{summary.perPaxLabel}</p>
                      )}
                      {(summary.baseFare ?? 0) > 0 && (
                        <p className="mt-0.5 text-[11px] text-gray-400">
                          Base {formatFareCurrency(summary.baseFare!)} + Taxes{' '}
                          {formatFareCurrency(summary.tax || 0)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {/* Baggage Information */}
              {(summary.cabinBaggage || summary.checkInBaggage) && (
                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-gray-700" />
                    <h3 className="font-display text-lg font-bold text-gray-900">
                      Baggage Information
                    </h3>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                        <Luggage className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Cabin Baggage</p>
                        <p className="text-base font-bold text-gray-900">
                          {summary.cabinBaggage || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                        <Luggage className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Check-in Baggage</p>
                        <p className="text-base font-bold text-gray-900">
                          {summary.checkInBaggage || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* What's Included */}
              {(includedItems.length > 0 || (summary.seatsRemaining ?? 0) > 0) && (
                <div className="rounded-xl border-t border-gray-200 p-5 md:border-t-0">
                  <h3 className="font-display text-lg font-bold text-gray-900">What's Included</h3>
                  <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                    {includedItems.map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div key={item.label} className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50">
                            <ItemIcon className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {(summary.seatsRemaining ?? 0) > 0 && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Only {summary.seatsRemaining} seat
                      {(summary.seatsRemaining ?? 0) > 1 ? 's' : ''} left at this fare
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Trust strip */}
            <div className="mt-6 -mx-4 -mb-6 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-200 bg-slate-100/80 px-4 py-5 sm:-mx-6 sm:px-6 lg:grid-cols-4">
              {TRUST_BADGES.map((badge) => {
                const BadgeIcon = badge.icon;
                return (
                  <div key={badge.title} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                      <BadgeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{badge.title}</p>
                      <p className="text-xs text-gray-500">{badge.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancellation */}
        {activeTab === 'cancellation' && activeTfrRules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <X className="h-5 w-5 text-brand-red" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-gray-900">
                  Cancellation Policy
                </h3>
                <p className="text-sm text-gray-500">
                  Review cancellation charges based on time period
                </p>
              </div>
            </div>
            {activeTfrRules.map((rule, index) => (
              <div key={index} className="rounded-xl border border-red-200 bg-red-50/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                      <Tag className="h-3 w-3" />
                      Policy {index + 1}
                    </span>
                    <p className="mt-3 text-xs font-semibold text-gray-500">Time Period</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900">
                      {getTimeRangeText(rule.st, rule.et)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-500">Cancellation Fee</p>
                    <p className="mt-0.5 text-2xl font-extrabold text-brand-red">
                      {formatFareCurrency((rule.amount || 0) + (rule.additionalFee || 0))}
                    </p>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {feeBreakdownRows(rule, 'cancellation').map((row) => (
                        <p key={row.label}>
                          {row.label}: {formatFareCurrency(row.value)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                {rule.policyInfo && (
                  <div className="mt-4 border-t border-red-200 pt-3">
                    <p className="flex items-start gap-2 text-sm font-medium text-red-600">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {rule.policyInfo}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Date Change */}
        {activeTab === 'datechange' && activeTfrRules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-gray-900">
                  Date Change Policy
                </h3>
                <p className="text-sm text-gray-500">
                  Review rescheduling charges based on time period
                </p>
              </div>
            </div>
            {activeTfrRules.map((rule, index) => (
              <div key={index} className="rounded-xl border border-blue-200 bg-blue-50/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                      <Tag className="h-3 w-3" />
                      Policy {index + 1}
                    </span>
                    <p className="mt-3 text-xs font-semibold text-gray-500">Time Period</p>
                    <p className="mt-0.5 text-lg font-bold text-gray-900">
                      {getTimeRangeText(rule.st, rule.et)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-500">Reschedule Fee</p>
                    <p className="mt-0.5 text-2xl font-extrabold text-blue-600">
                      {formatFareCurrency((rule.amount || 0) + (rule.additionalFee || 0))}
                    </p>
                    <div className="mt-1 space-y-0.5 text-xs text-gray-500">
                      {feeBreakdownRows(rule, 'reschedule').map((row) => (
                        <p key={row.label}>
                          {row.label}: {formatFareCurrency(row.value)}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                {rule.policyInfo && (
                  <div className="mt-4 border-t border-blue-200 pt-3">
                    <p className="flex items-start gap-2 text-sm font-medium text-blue-700">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      {rule.policyInfo}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Show */}
        {activeTab === 'noshow' && activeTfrRules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-gray-900">No Show Policy</h3>
                <p className="text-sm text-gray-500">Review penalties for no-show cases</p>
              </div>
            </div>
            {activeTfrRules.map((rule, index) => (
              <div key={index} className="rounded-xl border border-orange-200 bg-orange-50/70 p-5">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-orange-800">Policy Information</p>
                    <p className="mt-1.5 text-sm font-medium text-orange-800">{rule.policyInfo}</p>
                    {rule.st && rule.et && (
                      <p className="mt-3 border-t border-orange-200 pt-2 text-xs font-medium text-orange-600">
                        Applicable: {getTimeRangeText(rule.st, rule.et)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Seat Policy */}
        {activeTab === 'seat' && activeTfrRules.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                <Armchair className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-gray-900">
                  Seat Selection Policy
                </h3>
                <p className="text-sm text-gray-500">
                  View seat selection charges and availability
                </p>
              </div>
            </div>
            {activeTfrRules.map((rule, index) => (
              <div key={index} className="rounded-xl border border-violet-200 bg-violet-50/60 p-5">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                  <Tag className="h-3 w-3" />
                  Policy {index + 1}
                </span>
                <p className="mt-3 text-base font-semibold text-violet-700">{rule.policyInfo}</p>
                {(rule.amount || 0) + (rule.additionalFee || 0) > 0 && (
                  <p className="mt-2 text-sm font-bold text-violet-700">
                    Seat Fee:{' '}
                    {formatFareCurrency((rule.amount || 0) + (rule.additionalFee || 0))}
                  </p>
                )}
                {rule.st && rule.et && (
                  <p className="mt-2 text-xs font-medium text-violet-500">
                    Available: {getTimeRangeText(rule.st, rule.et)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {activeTab !== 'summary' && activeTfrRules.length === 0 && (
          <div className="py-14 text-center">
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <FileText className="h-8 w-8 text-gray-400" />
              <span className="absolute -right-0.5 bottom-0 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-white ring-2 ring-white">
                !
              </span>
            </div>
            <h3 className="font-display text-xl font-bold text-gray-900">
              No Information Available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No policy information is available for this section.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
