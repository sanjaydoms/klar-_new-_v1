import React from 'react';
import { ArrowRightLeft, Plus, X } from 'lucide-react';
import { FromLocation, ToLocation, DateField } from './IndividualComp';

export interface CitySegment {
  id: number;
  from: string;
  fromCode: string;
  fromAirportName: string;
  to: string;
  toCode: string;
  toAirportName: string;
  departureDate: string;
}

interface MultiCityFormProps {
  segments: CitySegment[];
  onUpdateSegment: (id: number, field: string, value: string) => void;
  onAddSegment: () => void;
  onRemoveSegment: (id: number) => void;
  // ===== ADDED VALIDATION PROPS =====
  errors?: { [key: number]: { from?: string; to?: string } };
  touched?: { [key: string]: boolean };
  dateErrors?: { [key: number]: string };
  minDates?: { [key: number]: string };
}

const MultiCityForm: React.FC<MultiCityFormProps> = ({
  segments,
  onUpdateSegment,
  onAddSegment,
  onRemoveSegment,
  errors = {},
  touched = {},
  dateErrors = {},
  minDates = {},
}) => {
  return (
    <div className="w-full space-y-4">
      {segments.map((segment, index) => (
        <div key={segment.id} className="relative">
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Segment {index + 1}
            </div>

            <div className="flex items-center w-full gap-4">
              <div className="flex-1 min-w-0">
                <FromLocation
                  label="From"
                  placeholder="New Delhi"
                  location={segment.from}
                  code={segment.fromCode}
                  airportName={segment.fromAirportName || 'Indira Gandhi Int...'}
                  onLocationChange={(value, code, airportName) => {
                    onUpdateSegment(segment.id, 'from', value);
                    onUpdateSegment(segment.id, 'fromCode', code || '');
                    onUpdateSegment(segment.id, 'fromAirportName', airportName || '');
                  }}
                  onCodeChange={(value) => onUpdateSegment(segment.id, 'fromCode', value)}
                  // ===== ADDED =====
                  error={errors[segment.id]?.from}
                  touched={touched[`segment_${segment.id}_from`]}
                />
              </div>

              <div className="flex-shrink-0">
                <div className="border border-primary/10 rounded-full p-2 bg-white">
                  <ArrowRightLeft size={15} className="text-primary" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <ToLocation
                  label="To"
                  placeholder="Dubai"
                  location={segment.to}
                  code={segment.toCode}
                  airportName={segment.toAirportName || 'Dubai International...'}
                  onLocationChange={(value, code, airportName) => {
                    onUpdateSegment(segment.id, 'to', value);
                    onUpdateSegment(segment.id, 'toCode', code || '');
                    onUpdateSegment(segment.id, 'toAirportName', airportName || '');
                  }}
                  onCodeChange={(value) => onUpdateSegment(segment.id, 'toCode', value)}
                  // ===== ADDED =====
                  error={errors[segment.id]?.to}
                  touched={touched[`segment_${segment.id}_to`]}
                />
              </div>
            </div>

            <div className="mt-3">
              <DateField
                label="Departure Date"
                value={segment.departureDate}
                onChange={(value) => onUpdateSegment(segment.id, 'departureDate', value)}
                min={new Date().toISOString().split('T')[0]}
                error={dateErrors[segment.id]}
                touched={touched[`segment_${segment.id}_date`]}
              />
            </div>
          </div>

          {segments.length > 2 && (
            <button
              onClick={() => onRemoveSegment(segment.id)}
              className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors shadow-sm"
            >
              <X size={16} className="text-red-600" />
            </button>
          )}
        </div>
      ))}

      {segments.length < 4 && (
        <button
          onClick={onAddSegment}
          className="w-full py-3 border-2 border-dashed border-primary/30 rounded-xl text-primary font-medium hover:bg-[#F5E7E7] transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          <span>Add Another City</span>
        </button>
      )}
    </div>
  );
};

export default MultiCityForm;
