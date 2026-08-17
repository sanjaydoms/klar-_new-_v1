import { useState, useEffect } from 'react';
import { refundableLabelFromType } from '@/features/flights/utils/flightDisplay';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  ArrowLeft,
  X,
  AlertCircle,
  CreditCard,
  Luggage,
  User,
  Info,
  Check,
  XCircle,
} from 'lucide-react';

import { getReviewDetails } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FareRulesPageProps {
  onConfirm?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FareRulesPage({ onConfirm, isOpen = true, onClose }: FareRulesPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { fareRuleData, flightDetails, selectedFare, fareId } = location.state || {};
  const [activeTab, setActiveTab] = useState<
    'cancellation' | 'datechange' | 'noshow' | 'seat' | 'summary'
  >('summary');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  if (!fareRuleData) {
    return (
      <Dialog open onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md p-6" showCloseButton={false}>
          <div className="text-center">
            <div className="bg-yellow-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Fare Data Available</h2>
            <p className="text-gray-600 mb-6">Please select a fare first to view the rules.</p>
            <Button onClick={handleClose} className="h-10 px-6">
              Go Back to Fares
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { fareRule, status } = fareRuleData;
  const routeKey = Object.keys(fareRule)[0];
  const ruleData = routeKey && fareRule[routeKey] ? fareRule[routeKey] : undefined;
  const { tfr } = ruleData;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const getTimeRangeText = (st: string, et: string) => {
    const startHour = parseInt(st);
    const endHour = parseInt(et);

    if (endHour >= 8760) return `${startHour}+ hours before departure`;
    if (endHour >= 168)
      return `${startHour} hours to ${Math.floor(endHour / 24)} days before departure`;
    if (endHour >= 24) return `${startHour} to ${Math.floor(endHour / 24)} days before departure`;
    return `${startHour} to ${endHour} hours before departure`;
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const payload = {
        priceIds: [fareId],
      };

      const reviewData = await getReviewDetails(payload);

      console.log('************ Review data we got\n', reviewData);

      if (reviewData && reviewData.success === false) {
        let errorMessage = reviewData.message || 'Failed to get review details';

        if (reviewData.errorCode) {
          errorMessage += `\nError Code: ${reviewData.errorCode}`;
        }

        if (reviewData.details) {
          errorMessage += `\n${reviewData.details}`;
        }

        if (reviewData.referenceId) {
          errorMessage += `\nReference ID: ${reviewData.referenceId}`;
        }

        notifyError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Validate response structure before proceeding
      if (!reviewData || !reviewData.data) {
        console.error('Invalid response structure: Missing data');
        notifyError('Invalid response from server. Please try again.');
        setIsLoading(false);
        return;
      }

      // Check for error in nested status (backward compatibility)
      if (reviewData.data.status && reviewData.data.status.success === false) {
        const errorMessage = reviewData.data.status.message || 'Failed to get review details';
        notifyError(errorMessage);
        setIsLoading(false);
        return;
      }

      // Check for mappedData
      if (!reviewData.data.mappedData) {
        console.error('Missing mappedData in response');
        notifyError('Invalid response structure: Missing booking data');
        setIsLoading(false);
        return;
      }

      // Check for required data before proceeding
      if (!reviewData.data.mappedData.bookingId) {
        console.error('Missing bookingId in response');
        notifyError('Unable to proceed: Booking ID not received');
        setIsLoading(false);
        return;
      }

      if (!reviewData.data.sessionId) {
        console.error('Missing sessionId in response');
        notifyError('Unable to proceed: Session ID not received');
        setIsLoading(false);
        return;
      }

      // Clear existing session data
      const keysToCheck = ['bookingId', 'onewayReviewData', 'ancillarySessionId'];
      keysToCheck.forEach((key) => {
        if (sessionStorage.getItem(key)) {
          console.log(`Clearing existing ${key} from session storage`);
          sessionStorage.removeItem(key);
        }
      });

      // Store data in session storage
      storeReviewData(reviewData);
      sessionStorage.setItem('ancillarySessionId', reviewData.data.sessionId);
      sessionStorage.setItem('bookingId', reviewData.data.mappedData.bookingId);

      console.log(
        '***************** THE REVIEW DATA WE GOT\n',
        JSON.stringify(reviewData.data, null, 2),
      );

      // Verify data was stored correctly
      const verifyBookingId = sessionStorage.getItem('bookingId');
      const verifySessionId = sessionStorage.getItem('ancillarySessionId');

      if (!verifyBookingId || !verifySessionId) {
        console.error('Failed to save data to session storage');
        notifyError('Failed to save booking information. Please try again.');
        setIsLoading(false);
        return;
      }

      // Reset loading state
      setIsLoading(false);

      // Close popup and navigate in the same tick
      if (onClose) {
        onClose();
      }

      // Navigate to traveller info page
      navigate('/booking/traveller-info', {
        state: {
          reviewData,
          fareRuleData,
          flightDetails,
          selectedFare,
          fareId,
        },
        replace: true, // Use replace to prevent going back to this page
      });
    } catch (error: any) {
      console.error('Error calling review API:', error);

      let errorMessage = 'Failed to get review details. Please try again.';
      let errorDetails = '';

      if (error.response?.data?.success === false) {
        errorMessage = error.response.data.message || errorMessage;

        if (error.response.data.errorCode) {
          errorDetails += `\nError Code: ${error.response.data.errorCode}`;
        }
        if (error.response.data.details) {
          errorDetails += `\n${error.response.data.details}`;
        }
        if (error.response.data.referenceId) {
          errorDetails += `\nReference ID: ${error.response.data.referenceId}`;
        }
      } else if (error.response?.data?.status?.message) {
        errorMessage = error.response.data.status.message;
        if (error.response.data.status.httpStatus) {
          errorDetails += `\nStatus: ${error.response.data.status.httpStatus}`;
        }
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        const apiError = error.response.data.errors[0];
        errorMessage = apiError.message || errorMessage;

        if (apiError.errCode) {
          errorDetails += `\nError Code: ${apiError.errCode}`;
        }
        if (apiError.details) {
          errorDetails += `\n${apiError.details}`;
        }
        if (apiError.id) {
          errorDetails += `\nReference ID: ${apiError.id}`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      const fullErrorMessage = errorMessage + errorDetails;
      notifyError(fullErrorMessage);
      setIsLoading(false);
      return;
    }
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: Info, hasData: true },
    { id: 'cancellation', label: 'Cancellation', icon: X, hasData: tfr?.CANCELLATION?.length > 0 },
    {
      id: 'datechange',
      label: 'Date Change',
      icon: Calendar,
      hasData: tfr?.DATECHANGE?.length > 0,
    },
    { id: 'noshow', label: 'No Show', icon: Clock, hasData: tfr?.NO_SHOW?.length > 0 },
    { id: 'seat', label: 'Seat Policy', icon: Luggage, hasData: tfr?.SEAT_CHARGEABLE?.length > 0 },
  ];

  if (!fareRuleData && !location.state) {
    return (
      <Dialog open onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-md p-6" showCloseButton={false}>
          <div className="text-center">
            <div className="bg-yellow-50 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Fare Data Available</h2>
            <p className="text-gray-600 mb-6">Please select a fare first to view the rules.</p>
            <Button onClick={handleClose} className="h-10 px-6">
              Go Back to Fares
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 rounded-none p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm print:shadow-none flex-shrink-0">
            <div className="px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-gray-100 rounded-full transition-colors print:hidden"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Fare Rules & Policies</h1>
                    <p className="text-xs text-gray-500">
                      Review the fare rules before confirming your booking
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Tabs Navigation */}
              <div className="bg-white border border-gray-200 border-b-0 overflow-x-auto print:hidden">
                <div className="flex flex-wrap">
                  {tabs.map((tab, index) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = tab.hasData === false;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => !isDisabled && setActiveTab(tab.id as any)}
                        disabled={isDisabled}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase transition-all flex-1 min-w-[80px] ${
                          isActive
                            ? 'bg-[#FF0004] text-white'
                            : 'bg-white text-[#4A5565] hover:bg-gray-50'
                        } ${index > 0 ? 'border-l border-gray-200' : ''} ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="bg-white border border-gray-200 p-6 print:shadow-none print:border">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                  <div className="space-y-6">
                    {/* Refundable status */}
                    {(() => {
                      // rT 2 is PARTIALLY refundable; `=== 1` labelled it
                      // "Non-Refundable Fare" on the gate the user confirms.
                      const refundable = refundableLabelFromType(
                        selectedFare?.FareDetails?.AdultFare?.RefundableType,
                      );
                      if (!refundable) return null;
                      const fullyRefundable = /^refundable$/i.test(refundable);
                      return (
                        <div
                          className={`p-3 border flex items-center gap-2 ${
                            fullyRefundable
                              ? 'bg-green-50 border-green-200'
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          {fullyRefundable ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span
                            className={`text-sm font-semibold ${
                              fullyRefundable ? 'text-green-800' : 'text-red-800'
                            }`}
                          >
                            {refundable} Fare
                          </span>
                        </div>
                      );
                    })()}

                    {/* Selected Fare Information */}
                    {selectedFare && (
                      <div className="bg-gray-50 border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-800 mb-3">Fare Summary</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Fare Type</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {selectedFare.FareIdentifierType || 'Standard'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Cabin Class</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {selectedFare.FareDetails?.AdultFare?.CabinClass || 'Economy'}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-gray-500">Total Amount</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {formatCurrency(selectedFare.priceSummary?.AdultFare?.total || 0)}
                            </p>
                            {/* <p className="text-xs text-gray-500">
                              Base:{' '}
                              {formatCurrency(selectedFare.priceSummary?.AdultFare?.baseFare || 0)}{' '}
                              + Tax:{' '}
                              {formatCurrency(selectedFare.priceSummary?.AdultFare?.tax || 0)}
                            </p> */}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Baggage Information */}
                    {selectedFare?.FareDetails?.AdultFare?.BaggageInfo && (
                      <div className="bg-gray-50 border border-gray-200 p-4">
                        <h3 className="text-sm font-bold text-gray-800 mb-3">
                          Baggage Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">Cabin Baggage</p>
                            <p className="text-base font-semibold text-gray-900">
                              {selectedFare.FareDetails.AdultFare.BaggageInfo.ClassCode || 'N/A'}
                            </p>
                          </div>
                          <div className="bg-white p-3 border border-gray-100">
                            <p className="text-xs text-gray-500">Check-in Baggage</p>
                            <p className="text-base font-semibold text-gray-900">
                              {selectedFare.FareDetails.AdultFare.BaggageInfo.CheckInBaggage ||
                                'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Available Policies Summary */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 mb-3">Available Policies</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-red-50 p-3 border border-red-200">
                          <X className="w-5 h-5 text-red-600 mb-1" />
                          <p className="text-xs font-semibold text-gray-900">Cancellation</p>
                          <p className="text-xs text-gray-600">
                            {tfr?.CANCELLATION?.length > 0
                              ? `${tfr.CANCELLATION.length} policy(s)`
                              : 'Not available'}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-3 border border-blue-200">
                          <Calendar className="w-5 h-5 text-blue-600 mb-1" />
                          <p className="text-xs font-semibold text-gray-900">Date Change</p>
                          <p className="text-xs text-gray-600">
                            {tfr?.DATECHANGE?.length > 0
                              ? `${tfr.DATECHANGE.length} policy(s)`
                              : 'Not available'}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 border border-orange-200">
                          <Clock className="w-5 h-5 text-orange-600 mb-1" />
                          <p className="text-xs font-semibold text-gray-900">No Show</p>
                          <p className="text-xs text-gray-600">
                            {tfr?.NO_SHOW?.length > 0
                              ? `${tfr.NO_SHOW.length} policy(s)`
                              : 'Not available'}
                          </p>
                        </div>
                        <div className="bg-purple-50 p-3 border border-purple-200">
                          <Luggage className="w-5 h-5 text-purple-600 mb-1" />
                          <p className="text-xs font-semibold text-gray-900">Seat Policy</p>
                          <p className="text-xs text-gray-600">
                            {tfr?.SEAT_CHARGEABLE?.length > 0
                              ? `${tfr.SEAT_CHARGEABLE.length} policy(s)`
                              : 'Not available'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cancellation Tab */}
                {activeTab === 'cancellation' &&
                  tfr?.CANCELLATION &&
                  tfr.CANCELLATION.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-red-100 flex items-center justify-center">
                          <X className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Cancellation Policy</h3>
                          <p className="text-sm text-gray-500">
                            Review cancellation charges based on time period
                          </p>
                        </div>
                      </div>
                      {tfr.CANCELLATION.map((rule: any, index: number) => (
                        <div
                          key={index}
                          className="bg-gray-50 p-5 border border-gray-200 hover:shadow-md transition-shadow"
                        >
                          <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                            <div className="flex-1">
                              <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold mb-3">
                                <Clock className="w-3 h-3" />
                                Policy {index + 1}
                              </div>
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Time Period
                              </p>
                              <p className="text-lg font-medium text-gray-900">
                                {getTimeRangeText(rule.st, rule.et)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Cancellation Fee
                              </p>
                              <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(rule.amount + (rule.additionalFee || 0))}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Airline: {formatCurrency(rule.amount)}
                                <br />
                                Fee: {formatCurrency(rule.additionalFee || 0)}
                              </p>
                            </div>
                          </div>
                          {rule.policyInfo && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm text-gray-600 flex items-start gap-2">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                {rule.policyInfo}
                              </p>
                            </div>
                          )}
                          {/* {rule.FareComponentsSummary && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="bg-white p-3">
                                <p className="text-xs text-gray-500">Airline Cancellation Fee</p>
                                <p className="text-base font-semibold text-gray-900">
                                  {formatCurrency(
                                    rule.FareComponentsSummary.AirlineCancellationFee,
                                  )}
                                </p>
                              </div>
                              <div className="bg-white p-3">
                                <p className="text-xs text-gray-500">Tripjack Cancellation Fee</p>
                                <p className="text-base font-semibold text-gray-900">
                                  {formatCurrency(
                                    rule.FareComponentsSummary.TripjackCancellationFee,
                                  )}
                                </p>
                              </div>
                            </div>
                          )} */}
                        </div>
                      ))}
                    </div>
                  )}

                {/* Date Change Tab */}
                {activeTab === 'datechange' && tfr?.DATECHANGE && tfr.DATECHANGE.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Date Change Policy</h3>
                        <p className="text-sm text-gray-500">
                          Review rescheduling charges based on time period
                        </p>
                      </div>
                    </div>
                    {tfr.DATECHANGE.map((rule: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-5 border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div className="flex-1">
                            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold mb-3">
                              <Clock className="w-3 h-3" />
                              Policy {index + 1}
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Time Period</p>
                            <p className="text-lg font-medium text-gray-900">
                              {getTimeRangeText(rule.st, rule.et)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Reschedule Fee
                            </p>
                            <p className="text-2xl font-bold text-blue-600">
                              {formatCurrency(rule.amount + (rule.additionalFee || 0))}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Airline: {formatCurrency(rule.amount)}
                              <br />
                              Fee: {formatCurrency(rule.additionalFee || 0)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {rule.policyInfo}
                          </p>
                        </div>
                        {/* {rule.FareComponentsSummary && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-white p-3">
                              <p className="text-xs text-gray-500">Airline Reschedule Fee</p>
                              <p className="text-base font-semibold text-gray-900">
                                {formatCurrency(rule.FareComponentsSummary.AirlineRescheduleFee)}
                              </p>
                            </div>
                            <div className="bg-white p-3">
                              <p className="text-xs text-gray-500">Tripjack Reschedule Fee</p>
                              <p className="text-base font-semibold text-gray-900">
                                {formatCurrency(rule.FareComponentsSummary.TripjackRescheduleFee)}
                              </p>
                            </div>
                          </div>
                        )} */}
                      </div>
                    ))}
                  </div>
                )}

                {/* No Show Tab */}
                {activeTab === 'noshow' && tfr?.NO_SHOW && tfr.NO_SHOW.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-orange-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">No Show Policy</h3>
                        <p className="text-sm text-gray-500">Review penalties for no-show cases</p>
                      </div>
                    </div>
                    {tfr.NO_SHOW.map((rule: any, index: number) => (
                      <div key={index} className="bg-orange-50 p-5 border border-orange-200">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-orange-800 mb-2">
                              Policy Information
                            </p>
                            <p className="text-base text-orange-800">{rule.policyInfo}</p>
                            {rule.st && rule.et && (
                              <div className="mt-3 pt-2 border-t border-orange-200">
                                <p className="text-xs text-orange-600">
                                  Applicable: {getTimeRangeText(rule.st, rule.et)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Seat Policy Tab */}
                {activeTab === 'seat' && tfr?.SEAT_CHARGEABLE && tfr.SEAT_CHARGEABLE.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-10 h-10 bg-purple-100 flex items-center justify-center">
                        <Luggage className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Seat Selection Policy</h3>
                        <p className="text-sm text-gray-500">
                          View seat selection charges and availability
                        </p>
                      </div>
                    </div>
                    {tfr.SEAT_CHARGEABLE.map((rule: any, index: number) => (
                      <div key={index} className="bg-purple-50 p-5 border border-purple-200">
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-purple-800 mb-2">
                              Policy {index + 1}
                            </p>
                            <p className="text-base font-medium text-purple-800">
                              {rule.policyInfo}
                            </p>
                            {rule.st && rule.et && (
                              <div className="mt-3 pt-2 border-t border-purple-200">
                                <p className="text-xs text-purple-600">
                                  Available: {getTimeRangeText(rule.st, rule.et)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State for Tabs with No Data */}
                {activeTab !== 'summary' &&
                  (!tfr?.[activeTab.toUpperCase()] ||
                    tfr[activeTab.toUpperCase()].length === 0) && (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Info className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Information Available
                      </h3>
                      <p className="text-gray-500">
                        No policy information is available for this section.
                      </p>
                    </div>
                  )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-end pb-4 print:hidden">
                <Button variant="outline" onClick={handleClose} className="h-10 px-5">
                  Back to Fares
                </Button>
                <Button onClick={handleConfirm} disabled={isLoading} className="h-10 px-5 shadow-md">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Confirm & Proceed to Booking'
                  )}
                </Button>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
