import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import OnewayFlightSearchEditSection from './OnewayFlightSearchEditSection';

interface OnewayFlightHeaderProps {
  from?: string;
  to?: string;
  isEditing: boolean;
  onEditToggle: () => void;
  onCancel: () => void;
  onSave: () => void;
  tripDetails: {
    date: string;
    travellers: Array<{ type: 'adult' | 'child' | 'infant'; count: number }>;
    class: string;
  };
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTravellerChange: (type: 'adult' | 'child' | 'infant', value: number) => void;
  onClassChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  formatDate: (dateStr: string) => string;
  getTravellerDisplay: () => string;
}

const OnewayFlightHeader: React.FC<OnewayFlightHeaderProps> = ({
  from = 'DEL',
  to = 'DXB',
  isEditing,
  onEditToggle,
  onCancel,
  onSave,
  tripDetails,
  onDateChange,
  onTravellerChange,
  onClassChange,
  onFromChange,
  onToChange,
  formatDate,
  getTravellerDisplay,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="sticky top-0 z-50 bg-gray-100 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Back Button */}
          <button
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-md"
            onClick={handleBack}
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" strokeWidth={2.5} />
          </button>

          {/* Route Display */}
          <span
            className="font-bold tracking-normal text-xl sm:text-3xl"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 700,
              color: '#060E49',
              verticalAlign: 'middle',
            }}
          >
            {from}
          </span>
          <span
            className="font-bold text-xl sm:text-3xl"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 700,
              color: '#060E49',
              verticalAlign: 'middle',
            }}
          >
            →
          </span>
          <span
            className="font-bold tracking-normal text-xl sm:text-3xl"
            style={{
              fontFamily: 'Playfair Display, serif',
              fontWeight: 700,
              color: '#060E49',
              verticalAlign: 'middle',
            }}
          >
            {to}
          </span>
        </div>

        {/* Edit/Save/Cancel Buttons */}
        {/* {isEditing ? (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 font-medium text-xs sm:text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={onEditToggle}
            className="text-gray-700 hover:text-gray-900 transition-colors"
            title="Edit trip details"
            aria-label="Edit trip details"
          >
            <Pencil className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
          </button>
        )} */}
      </div>

      {/* Trip Details Display */}
      <div className="text-xs sm:text-sm text-gray-500 mt-3">
        {/* {isEditing ? (
          <OnewayFlightSearchEditSection
            tripDetails={tripDetails}
            from={from}
            to={to}
            onDateChange={onDateChange}
            onTravellerChange={onTravellerChange}
            onClassChange={onClassChange}
            onFromChange={onFromChange}
            onToChange={onToChange}
          />
        ) : (
          <span className="text-xs sm:text-sm">
            {from} → {to} • {formatDate(tripDetails.date)} • {getTravellerDisplay()} •{' '}
            {tripDetails.class}
          </span>
        )} */}

        <span className="text-xs sm:text-sm">
          {from} → {to} • {formatDate(tripDetails.date)} • {getTravellerDisplay()} •{' '}
          {tripDetails.class}
        </span>
      </div>
    </div>
  );
};

export default OnewayFlightHeader;
