import { useState } from 'react';
import { Flight } from '../../types/types.returnFlight';
import { reviewFlight } from '../../../../api/flights.api';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FareOptionsModalProps {
  modalFlight: Flight;
  // fareModalType is no longer strictly needed for logic if we use a generic callback,
  // but might be useful for display titles if we want to differentiate.
  // We'll keep it simple for now or make it optional string.
  title?: string;
  selectedFareClass: string;
  setSelectedFareClass: (fareClass: string) => void;
  onFareSelected: (flight: Flight) => void;
  setShowFareOptionsModal: (show: boolean) => void;
  onBookNow: () => void;
}

export default function FareOptionsModal({
  modalFlight,
  title,
  selectedFareClass,
  setSelectedFareClass,
  onFareSelected,
  setShowFareOptionsModal,
  onBookNow,
}: FareOptionsModalProps) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // const handleSelectFlight = async (priceId: string) => {
  //   try {
  //     console.log('priceId', priceId);
  //     setIsReviewing(true);
  //     setReviewError('');

  //     // We might need to ensure searchId exists
  //     if (!modalFlight.searchId) {
  //       setReviewError('Missing search information');
  //       return;
  //     }

  //     const response = await reviewFlight(modalFlight.searchId, [priceId]);

  //     if (response.success) {
  //       // Create a new flight object with the selected fare info if needed,
  //       // OR just pass the original modalFlight and let the parent handle the "selected" state
  //       // based on the fact that this specific fare was chosen.
  //       // Actually, the API review confirms the price.
  //       // We might want to attach the selected price ID to the flight object.
  //       const updatedFlight = { ...modalFlight, selectedFareId: priceId };

  //       onFareSelected(updatedFlight);
  //       setShowFareOptionsModal(false);

  //       if (onBookNow) onBookNow();
  //     } else {
  //       setReviewError(response.message || 'Failed to review flight');
  //     }
  //   } catch (err) {
  //     console.error('Error reviewing flight:', err);
  //     setReviewError('An error occurred during flight review');
  //   } finally {
  //     setIsReviewing(false);
  //   }
  // };

  // Map totalPriceList from backend to fareOptions

  const mappedFareOptions: any = {
    economy: [],
    premium: [],
    business: [],
  };

  if (modalFlight.totalPriceList && modalFlight.totalPriceList.length > 0) {
    modalFlight.totalPriceList.forEach((price: any) => {
      const fareClass = price.fareIdentifier?.toLowerCase().includes('business')
        ? 'business'
        : price.fareIdentifier?.toLowerCase().includes('premium')
          ? 'premium'
          : 'economy';

      mappedFareOptions[fareClass].push({
        id: price.id,
        name: price.fareIdentifier || 'ECONOMY',
        price: price.fd?.ADULT?.fC?.TF || 0,
        features: {
          baggage: [
            { text: `${price.fd?.ADULT?.bI?.iB || '15 Kg'} Check-in`, included: true },
            { text: `${price.fd?.ADULT?.bI?.cB || '7 Kg'} Cabin`, included: true },
          ],
          flexibility: [
            {
              text: price.fareIdentifier === 'REFUNDABLE' ? 'Refundable' : 'Non-Refundable',
              included: true,
            },
          ],
          amenities: [{ text: 'Standard Seats', included: true }],
        },
      });
    });
  } else if (modalFlight.fareOptions && modalFlight.fareOptions.length > 0) {
    // Fallback to initial search data if detailed data is missing
    modalFlight.fareOptions.forEach((option: any) => {
      // Identify class from option or default to current selection/economy
      // option might have cabinClass or fareIdentifier
      let fareClass = 'economy';
      if (
        option.cabinClass?.toLowerCase().includes('business') ||
        option.fareIdentifier?.toLowerCase().includes('business')
      )
        fareClass = 'business';
      else if (
        option.cabinClass?.toLowerCase().includes('premium') ||
        option.fareIdentifier?.toLowerCase().includes('premium')
      )
        fareClass = 'premium';

      mappedFareOptions[fareClass].push({
        id: option.id,
        name: option.fareIdentifier || 'Standard Fare',
        price: option.totalFare,
        features: {
          baggage: [
            { text: modalFlight.baggage?.checkIn || '15 Kg Check-in', included: true },
            { text: modalFlight.baggage?.cabin || '7 Kg Cabin', included: true },
          ],
          flexibility: [
            { text: option.refundable !== false ? 'Refundable' : 'Non-Refundable', included: true },
          ],
          amenities: [{ text: 'Standard Seats', included: true }],
        },
      });
    });
  }

  const renderFeatureItem = (feature: { text: string; included: boolean; warning?: boolean }) => (
    <div className="flex items-center gap-1 text-xs">
      {feature.included ? (
        <svg
          className="w-4 h-4 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : feature.warning ? (
        <svg
          className="w-4 h-4 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span
        className={
          feature.included ? 'text-green-600' : feature.warning ? 'text-yellow-600' : 'text-red-600'
        }
      >
        {feature.text}
      </span>
    </div>
  );

  const renderFareCard = (fare: any) => (
    <div
      key={fare.id}
      className="border-2 bg-gray-50 border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors relative"
    >
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">₹ {fare.price.toLocaleString()}</div>
        <div className="text-xs text-gray-500">per adult</div>
        <div className="text-sm font-semibold text-gray-700 mt-1">{fare.name}</div>
      </div>

      <div className="space-y-3 text-sm mb-6">
        <div>
          <div className="font-semibold text-gray-700 mb-1">Baggage</div>
          {fare.features.baggage.map((feature: any, idx: number) => renderFeatureItem(feature))}
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-1">Flexibility</div>
          {fare.features.flexibility.map((feature: any, idx: number) => renderFeatureItem(feature))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          disabled={isReviewing}
          onClick={() => console.log('fare', fare)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isReviewing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isReviewing ? 'SELECTING...' : 'LOCK'}
        </button>
        <button
          disabled={isReviewing}
          onClick={onBookNow}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isReviewing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isReviewing ? 'SELECTING...' : 'SELECT'}
        </button>
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && setShowFareOptionsModal(false)}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl gap-0 overflow-hidden rounded-lg p-0 sm:max-w-4xl" showCloseButton={false}>
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title || 'Fare Options'}</h2>
            <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
              <span className="font-medium">
                {modalFlight.departure?.airport || 'N/A'} → {modalFlight.arrival?.airport || 'N/A'}
              </span>
              <span>
                {typeof modalFlight.airline === 'string'
                  ? modalFlight.airline
                  : modalFlight.airline?.name || 'N/A'}{' '}
                • {modalFlight.departure?.time || '--:--'} - {modalFlight.arrival?.time || '--:--'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowFareOptionsModal(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {reviewError && (
          <div className="bg-red-50 text-red-700 px-6 py-2 text-sm border-b border-red-100 italic">
            {reviewError}
          </div>
        )}

        <div className="border-b border-gray-200">
          <div className="flex">
            {(['economy', 'premium', 'business'] as const).map((fareClass) => {
              const options = mappedFareOptions[fareClass];
              if (options.length === 0) return null;

              return (
                <button
                  key={fareClass}
                  onClick={() => setSelectedFareClass(fareClass)}
                  className={`flex-1 px-6 py-4 text-left transition-colors ${
                    selectedFareClass === fareClass
                      ? 'border-b-4 border-blue-600 bg-blue-50'
                      : 'border-b-4 border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900 capitalize">{fareClass}</div>
                  <div className="text-sm text-gray-600">
                    Starting at ₹ {options[0].price.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mappedFareOptions[selectedFareClass]?.map((fare: any) => renderFareCard(fare))}
          </div>
          {mappedFareOptions[selectedFareClass]?.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              No options available for this class.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
