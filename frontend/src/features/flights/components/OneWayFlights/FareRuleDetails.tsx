import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

import { getReviewDetails } from '@/api/flightService.api';
import { notifyError } from '@/utils/notify';
import { storeReviewData } from '@/utils/reviewSession';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FareRulesHeader,
  FareRulesFooter,
  FareRulesPanel,
  buildFareSummary,
} from '@/features/flights/components/FareRules/fareRulesShared';

interface FareRulesPageProps {
  onConfirm?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FareRulesPage({ isOpen = true, onClose }: FareRulesPageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { fareRuleData, flightDetails, selectedFare, fareId } = location.state || {};
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
        <DialogContent className="max-w-md rounded-2xl p-6" showCloseButton={false}>
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold text-gray-900">
              No Fare Data Available
            </h2>
            <p className="mb-6 text-gray-600">Please select a fare first to view the rules.</p>
            <Button onClick={handleClose} className="h-10 rounded-lg px-6">
              Go Back to Fares
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { fareRule } = fareRuleData;
  const routeKey = Object.keys(fareRule)[0];
  const ruleData = routeKey && fareRule[routeKey] ? fareRule[routeKey] : undefined;
  const tfr = ruleData?.tfr;

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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-[980px]"
        showCloseButton={false}
      >
        <FareRulesHeader onClose={handleClose} />
        <div className="flex-1 overflow-y-auto">
          <FareRulesPanel tfr={tfr} summary={buildFareSummary(selectedFare)} />
        </div>
        <FareRulesFooter onBack={handleClose} onConfirm={handleConfirm} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  );
}
