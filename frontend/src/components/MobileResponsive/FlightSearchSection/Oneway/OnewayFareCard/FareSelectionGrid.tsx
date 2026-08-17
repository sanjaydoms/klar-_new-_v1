import React from 'react';
import FareCard from './FareCard';

interface FareData {
  fareId: string;
  FareIdentifierType: string;
  priceSummary: {
    AdultFare: {
      total: number;
      baseFare: number;
      tax: number;
      netFare: number;
    };
  };
  passengerBreakup: {
    AdultFare: {
      BaggageInfo: {
        CheckInBaggage: string;
        ClassCode: string;
      };
      CabinClass: string;
      ClassCode: string;
      RefundableType: number;
      SeatsRemaining: number;
    };
  };
}

interface FareSelectionGridProps {
  fares?: FareData[];
  onFareSelect?: (fareType: string, fareData?: FareData) => void;
  selectedFare?: string | null;
}

const FareSelectionGrid: React.FC<FareSelectionGridProps> = ({
  fares = [],
  onFareSelect,
  selectedFare = null,
}) => {
  const getFareType = (fareIdentifierType: string): 'VALUE' | 'FLEXI' | 'PREMIUM' => {
    if (fareIdentifierType.includes('FLEXI')) return 'FLEXI';
    if (fareIdentifierType.includes('PREMIUM')) return 'PREMIUM';
    if (fareIdentifierType.includes('CORPORATE') || fareIdentifierType.includes('SME'))
      return 'PREMIUM';
    return 'VALUE';
  };

  const getFareTitle = (fareIdentifierType: string): string => {
    if (fareIdentifierType.includes('FLEXI')) return 'FLEXI';
    if (fareIdentifierType.includes('PREMIUM')) return 'PREMIUM';
    if (fareIdentifierType === 'CORPORATE') return 'CORPORATE';
    if (fareIdentifierType === 'SME') return 'SME';
    return 'VALUE';
  };

  const getFareSubtitle = (fareIdentifierType: string): string => {
    if (fareIdentifierType.includes('FLEXI')) return 'Free Changes';
    if (fareIdentifierType.includes('PREMIUM')) return 'Maximum Perks';
    if (fareIdentifierType === 'CORPORATE') return 'Corporate Benefits';
    if (fareIdentifierType === 'SME') return 'SME Benefits';
    return 'Economy';
  };

  const getFareFeatures = (fare: FareData) => {
    const features = [];
    const baggageInfo = fare.passengerBreakup?.AdultFare?.BaggageInfo;

    if (baggageInfo?.ClassCode) {
      features.push(`${baggageInfo.ClassCode} Cabin Baggage`);
    }
    if (baggageInfo?.CheckInBaggage) {
      features.push(baggageInfo.CheckInBaggage);
    }

    const fareType = fare.FareIdentifierType || '';
    if (fareType.includes('FLEXI')) {
      features.push('Free Date Change');
      features.push('Refundable');
    } else if (fareType.includes('PREMIUM')) {
      features.push('Free Seat Selection');
      features.push('Complimentary Meal');
    } else if (fareType.includes('CORPORATE')) {
      features.push('Corporate Benefits');
    } else if (fareType.includes('SME')) {
      features.push('SME Benefits');
    } else {
      features.push('Standard Seat Selection');
      features.push('No-Date-Change-Flexibility');
    }

    return features;
  };

  const getTotalFare = (fare: FareData): string => {
    const total = fare.priceSummary?.AdultFare?.total || 0;
    return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isPopular = (fareIdentifierType: string): boolean => {
    return fareIdentifierType.includes('FLEXI');
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5">
      {fares.map((fare, index) => {
        const fareType = getFareType(fare.FareIdentifierType || '');
        const title = getFareTitle(fare.FareIdentifierType || '');
        const isSelected = selectedFare === title;

        return (
          <FareCard
            key={index}
            type={fareType}
            title={title}
            subtitle={getFareSubtitle(fare.FareIdentifierType || '')}
            price={getTotalFare(fare)}
            features={getFareFeatures(fare)}
            isPopular={isPopular(fare.FareIdentifierType || '')}
            isSelected={isSelected}
            onSelect={() => onFareSelect?.(title, fare)}
          />
        );
      })}
    </div>
  );
};

export default FareSelectionGrid;
