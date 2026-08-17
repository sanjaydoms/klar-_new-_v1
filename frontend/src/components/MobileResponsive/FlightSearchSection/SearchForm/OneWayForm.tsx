import React from 'react';
import { FromLocation, ToLocation } from './IndividualComp';
import SwapButton from './SwapButton';

interface OneWayFormProps {
  from: string;
  fromCode: string;
  fromAirportName: string;
  to: string;
  toCode: string;
  toAirportName: string;
  onFromChange: (city: string, code: string, airportName: string) => void;
  onFromCodeChange: (value: string) => void;
  onToChange: (city: string, code: string, airportName: string) => void;
  onToCodeChange: (value: string) => void;
  onSwap?: () => void;
}

const OneWayForm: React.FC<OneWayFormProps> = ({
  from,
  fromCode,
  fromAirportName,
  to,
  toCode,
  toAirportName,
  onFromChange,
  onFromCodeChange,
  onToChange,
  onToCodeChange,
  onSwap,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center w-full gap-4">
        <div className="flex-1 min-w-0">
          <FromLocation
            label="From"
            placeholder="Delhi"
            location={from}
            code={fromCode}
            airportName={fromAirportName}
            onLocationChange={onFromChange}
            onCodeChange={onFromCodeChange}
          />
        </div>

        <div className="flex-shrink-0">
          <SwapButton onSwap={() => onSwap?.()} />
        </div>

        <div className="flex-1 min-w-0">
          <ToLocation
            label="To"
            placeholder="Dubai"
            location={to}
            code={toCode}
            airportName={toAirportName}
            onLocationChange={onToChange}
            onCodeChange={onToCodeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default OneWayForm;
