import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import { FromLocation, ToLocation } from './IndividualComp';

interface RoundTripFormProps {
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

const RoundTripForm: React.FC<RoundTripFormProps> = ({
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
          <div
            className="border border-primary/10 rounded-full p-2 hover:bg-primary/20 transition-colors cursor-pointer"
            onClick={onSwap}
          >
            <ArrowRightLeft size={15} className="text-primary" />
          </div>
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

export default RoundTripForm;
