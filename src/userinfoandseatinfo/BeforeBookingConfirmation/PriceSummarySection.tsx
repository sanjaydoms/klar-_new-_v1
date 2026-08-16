// PriceSummarySection.tsx
import PriceInformation from '../SeatSelection/PriceInformation';

interface PriceSummarySectionProps {
  timeLeft: number;
  formatTime: (seconds: number) => string;
  reviewData: any;
  selectedSeatPrices: any[];
  selectedMealsPerTravelerPerSegment: any;
  selectedBaggagePerTravelerPerSegment: any;
  makedPrice: any;
  setMakedPrice: (price: any) => void;
  bookingError: string | null;
  isProcessing: boolean;
  handleContinue: () => void;
  getFlightInfoBySegmentId: (segmentId: string) => any;
  walletData: any;
  holdBooking: boolean;
  setHoldBooking: (hold: boolean) => void;
  isConfirmationPage: boolean;
  totalAmount: {
    baseFare: number;
    seatTotal: number;
    markup: number;
    total: number;
  };
}

export default function PriceSummarySection({
  timeLeft,
  formatTime,
  reviewData,
  selectedSeatPrices,
  selectedMealsPerTravelerPerSegment,
  selectedBaggagePerTravelerPerSegment,
  makedPrice,
  setMakedPrice,
  bookingError,
  isProcessing,
  handleContinue,
  getFlightInfoBySegmentId,
  walletData,
  holdBooking,
  setHoldBooking,
  isConfirmationPage,
  totalAmount,
}: PriceSummarySectionProps) {
  return (
    <div className="top-4">
      <PriceInformation
        timeLeft={timeLeft}
        formatTime={formatTime}
        reviewData={reviewData}
        selectedSeatPrices={selectedSeatPrices}
        selectedMealsPerTravelerPerSegment={selectedMealsPerTravelerPerSegment}
        selectedBaggagePerTravelerPerSegment={selectedBaggagePerTravelerPerSegment}
        makedPrice={makedPrice}
        setMakedPrice={setMakedPrice}
        bookingError={bookingError}
        isProcessing={isProcessing}
        handleContinue={handleContinue}
        getFlightInfoBySegmentId={getFlightInfoBySegmentId}
        walletData={walletData}
        holdBooking={holdBooking}
        setHoldBooking={setHoldBooking}
        isConfirmationPage={isConfirmationPage}
        totalAmount={totalAmount}
      />
    </div>
  );
}
