import React, { useState, useEffect } from 'react';
import { readFareRules } from '@/features/flights/utils/fareRules';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

interface FareRuleData {
  fareRule: {
    [key: string]: {
      fr: any;
      tfr: {
        NO_SHOW?: Array<{
          policyInfo: string;
          st: string;
          et: string;
        }>;
        DATECHANGE?: Array<{
          amount: number;
          additionalFee: number;
          policyInfo: string;
          FareComponentsSummary: {
            // TripjackRescheduleFee: number;
            AirlineRescheduleFeeTax: number;
            AirlineRescheduleFee: number;
            // TripjackRescheduleFeeTax: number;
          };
          st: string;
          et: string;
        }>;
        CANCELLATION?: Array<{
          amount: number;
          additionalFee: number;
          policyInfo: string;
          FareComponentsSummary: {
            AirlineCancellationFee: number;
            AirlineCancellationFeeTax: number;
            TripjackCancellationFeeTax: number;
            TripjackCancellationFee: number;
          };
          st: string;
          et: string;
        }>;
        SEAT_CHARGEABLE?: Array<{
          policyInfo: string;
          st: string;
          et: string;
        }>;
      };
    };
  };
  status: {
    success: boolean;
    httpStatus: number;
  };
}

const SectionCard: React.FC<SectionCardProps> = ({
  title,
  icon,
  children,
  isOpen = false,
  onToggle,
}) => {
  return (
    <div
      className="bg-white rounded-xl border border-input overflow-hidden mb-3 cursor-pointer transition-all hover:border-primary"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between p-3 sm:p-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {icon && <span className="text-primary">{icon}</span>}
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">{title}</h3>
        </div>
        <svg
          className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-gray-100">{children}</div>
      </div>
    </div>
  );
};

const DomesticFareRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [isChecked, setIsChecked] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>([
    'cancellation',
    'datechange',
    'noshow',
    'seat',
  ]);
  const [fareRuleData, setFareRuleData] = useState<FareRuleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState('₹4,110');

  useEffect(() => {
    const loadFareRuleData = () => {
      try {
        // The fare this screen is about: the leg's own selection first, since
        // 'selectedFareData' is only written on the fallback path.
        const segment = sessionStorage.getItem('selectedSegment');
        const selectedFareStr =
          (segment === 'ONWARD' && sessionStorage.getItem('selectedDepartureFare')) ||
          (segment === 'RETURN' && sessionStorage.getItem('selectedReturnFare')) ||
          sessionStorage.getItem('selectedFareData');
        const selectedFare = selectedFareStr ? JSON.parse(selectedFareStr) : null;

        // Rules belonging to a different fare are not this fare's terms.
        setFareRuleData(readFareRules(selectedFare?.fareId));

        if (selectedFare?.priceSummary?.AdultFare?.total) {
          setTotalAmount(`₹${selectedFare.priceSummary.AdultFare.total.toLocaleString('en-IN')}`);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFareRuleData();
  }, []);

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleBack = () => {
    navigate('/mobile_return_fare_card');
  };

  const handleContinue = () => {
    if (!isChecked) return;

    // Get the selected segment
    const selectedSegment = sessionStorage.getItem('selectedSegment');
    const selectedFareDataStr = sessionStorage.getItem('selectedFareData');

    // Store the fare data based on segment
    if (selectedSegment === 'ONWARD') {
      sessionStorage.setItem('selectedDepartureFare', selectedFareDataStr || '');
    } else if (selectedSegment === 'RETURN') {
      sessionStorage.setItem('selectedReturnFare', selectedFareDataStr || '');
    }

    // Navigate back to flight card
    navigate('/mobile-return-card');
  };

  const getFareRules = () => {
    if (!fareRuleData || !fareRuleData.fareRule) return null;
    const routeKeys = Object.keys(fareRuleData.fareRule);
    if (routeKeys.length === 0) return null;
    const routeKey = routeKeys[0];
    return fareRuleData.fareRule[routeKey as any];
  };

  const rules = getFareRules();

  const getCancellationPolicy = () => {
    if (!rules?.tfr?.CANCELLATION || rules.tfr.CANCELLATION.length === 0) {
      return <p className="text-gray-600">Cancellation charges apply as per airline policy</p>;
    }
    const cancellations = rules.tfr.CANCELLATION;
    return cancellations.map((item, index) => (
      <div key={index} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">
            {item.st}h - {item.et}h before departure
          </span>
          <span className="text-red-600 font-bold text-sm">
            ₹{item.amount + item.additionalFee}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Airline Fee: ₹{item.amount} + Service Fee: ₹{item.additionalFee}
        </div>
        {item.policyInfo && <div className="text-xs text-gray-500 mt-1">{item.policyInfo}</div>}
      </div>
    ));
  };

  const getDateChangePolicy = () => {
    if (!rules?.tfr?.DATECHANGE || rules.tfr.DATECHANGE.length === 0) {
      return <p className="text-gray-600">Date change allowed with applicable fees</p>;
    }
    const dateChanges = rules.tfr.DATECHANGE;
    return dateChanges.map((item, index) => (
      <div key={index} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700">
            {item.st}h - {item.et}h before departure
          </span>
          <span className="text-blue-600 font-bold text-sm">
            ₹{item.amount + item.additionalFee}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Reschedule Fee: ₹{item.amount} + Service Fee: ₹{item.additionalFee}
        </div>
        {item.policyInfo && <div className="text-xs text-gray-500 mt-1">{item.policyInfo}</div>}
      </div>
    ));
  };

  const getNoShowPolicy = () => {
    if (!rules?.tfr?.NO_SHOW || rules.tfr.NO_SHOW.length === 0) {
      return <p className="text-gray-600">No-show penalty applies</p>;
    }
    const noShows = rules.tfr.NO_SHOW;
    return noShows.map((item, index) => (
      <div key={index} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
        <div className="text-gray-700 font-medium">{item.policyInfo}</div>
        <div className="text-xs text-gray-500 mt-1">
          {item.st}h - {item.et}h before departure
        </div>
      </div>
    ));
  };

  const getSeatPolicy = () => {
    if (!rules?.tfr?.SEAT_CHARGEABLE || rules.tfr.SEAT_CHARGEABLE.length === 0) {
      return <p className="text-gray-600">Seat selection available at additional cost</p>;
    }
    const seats = rules.tfr.SEAT_CHARGEABLE;
    return seats.map((item, index) => (
      <div key={index} className="mb-3 pb-3 border-b border-gray-100 last:border-0">
        <div className="text-gray-700 font-medium">{item.policyInfo}</div>
        <div className="text-xs text-gray-500 mt-1">
          {item.st}h - {item.et}h before departure
        </div>
      </div>
    ));
  };

  if (loading) {
    return (
      <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading fare rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="block md:hidden lg:hidden min-h-screen bg-gray-50 p-3 sm:p-4 pb-24">
      <div className="max-w-3xl mx-auto">
        <button
          className="flex items-center text-gray-600 hover:text-gray-800 mb-3 sm:mb-4 transition-colors"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
          <span className="text-xs sm:text-sm font-medium">Back</span>
        </button>

        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">
          Fare Rules & Policies
        </h1>

        <SectionCard
          title="Cancellation Policy"
          isOpen={openSections.includes('cancellation')}
          onToggle={() => toggleSection('cancellation')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        >
          <div className="space-y-2 text-xs sm:text-sm">{getCancellationPolicy()}</div>
        </SectionCard>

        <SectionCard
          title="Date Change Policy"
          isOpen={openSections.includes('datechange')}
          onToggle={() => toggleSection('datechange')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
        >
          <div className="space-y-2 text-xs sm:text-sm">{getDateChangePolicy()}</div>
        </SectionCard>

        <SectionCard
          title="No Show Policy"
          isOpen={openSections.includes('noshow')}
          onToggle={() => toggleSection('noshow')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        >
          <div className="space-y-2 text-xs sm:text-sm">{getNoShowPolicy()}</div>
        </SectionCard>

        <SectionCard
          title="Seat Policy"
          isOpen={openSections.includes('seat')}
          onToggle={() => toggleSection('seat')}
          icon={
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          }
        >
          <div className="space-y-2 text-xs sm:text-sm">{getSeatPolicy()}</div>
        </SectionCard>

        <div className="bg-white rounded-xl border border-input p-4 sm:p-5 mt-4 sm:mt-6">
          <div className="flex items-start space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <input
              type="checkbox"
              id="understand"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-1 w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="understand" className="text-xs sm:text-sm text-gray-600 cursor-pointer">
              I have read and understand the fare rules and policies
            </label>
          </div>

          <button
            onClick={handleContinue}
            disabled={!isChecked}
            className={`w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium text-center transition-colors text-sm sm:text-base flex items-center justify-center ${
              isChecked
                ? 'bg-primary hover:bg-primary text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            I Understand, Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default DomesticFareRulesPage;
