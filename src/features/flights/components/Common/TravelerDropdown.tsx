import { Minus, Plus } from 'lucide-react';

interface TravelerDropdownProps {
  adults: number;
  children: number;
  infants: number;
  travelClass: string;
  onAddAdult: () => void;
  onRemoveAdult: () => void;
  onAddChild: () => void;
  onRemoveChild: () => void;
  onAddInfant: () => void;
  onRemoveInfant: () => void;
  onClassChange: (cls: string) => void;
  fareType: string;
  onFareTypeChange: (fare: string) => void;
  onClose: () => void;
  validateTravelerCounts: () => { isValid: boolean; error: string | null };
  maxTravelers: number;
  minAdults: number;
}

export default function TravelerDropdown({
  adults,
  children,
  infants,
  travelClass,
  onAddAdult,
  onRemoveAdult,
  onAddChild,
  onRemoveChild,
  onAddInfant,
  onRemoveInfant,
  onClassChange,
  fareType,
  onFareTypeChange,
  onClose,
  validateTravelerCounts,
  maxTravelers,
  minAdults,
}: TravelerDropdownProps) {
  return (
    // Positioning belongs to the caller, not here. This root used to carry
    // `absolute z-50 mt-1`, nested inside call sites that position it
    // themselves (`absolute bottom-full`, `absolute top-full mt-2`, a fixed
    // bottom sheet). An absolutely-positioned child contributes no height, so
    // every one of those wrappers collapsed to a zero-height box and their
    // positioning classes became inert — which is what made the card sit over
    // the fields. The `mb-24` at the first call site was a 96px workaround for
    // this, not a fix; it is removed in the same change.
    <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-xl p-4">
      <div className="space-y-3">
        {/* Adults */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Adults</div>
            <div className="text-sm text-gray-500">12+ years</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRemoveAdult}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                adults > minAdults
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={adults <= minAdults}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{adults}</span>
            <button
              onClick={onAddAdult}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                adults + children + infants < maxTravelers
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={adults + children + infants >= maxTravelers}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Children</div>
            <div className="text-sm text-gray-500">2-12 years</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRemoveChild}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                children > 0
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={children <= 0}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{children}</span>
            <button
              onClick={onAddChild}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                adults + children + infants < maxTravelers
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={adults + children + infants >= maxTravelers}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Infants */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Infants</div>
            <div className="text-sm text-gray-500">Under 2 years</div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onRemoveInfant}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                infants > 0
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={infants <= 0}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{infants}</span>
            <button
              onClick={onAddInfant}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                adults + children + infants < maxTravelers && infants < adults
                  ? 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  : 'border-gray-200 text-gray-300 cursor-not-allowed'
              }`}
              disabled={adults + children + infants >= maxTravelers || infants >= adults}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error message if any */}
        {adults + children + infants >= maxTravelers && (
          <p className="text-sm text-red-600">Maximum {maxTravelers} travelers allowed</p>
        )}
        {infants > adults && (
          <p className="text-sm text-red-600">
            Number of infants cannot exceed number of adults
          </p>
        )}

        {/* Travel Class - Dropdown */}
        <div className="border-t border-gray-100 pt-4">
          <label className="font-medium text-gray-900 mb-2 block">Travel Class</label>
          <select
            value={travelClass}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select Class</option>
            <option value="Economy">Economy</option>
            <option value="Premium Economy">Premium Economy</option>
            <option value="Business">Business</option>
            <option value="First Class">First Class</option>
          </select>
        </div>

        {/* Special Fares - Dropdown */}
        {/* <div className="pt-4 border-t border-gray-100">
                    <label className="font-medium text-gray-900 mb-2 block">Special Fare <span className="text-gray-400 font-normal">(optional)</span></label>
                    <select
                        value={fareType}
                        onChange={(e) => onFareTypeChange(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="Regular">Regular</option>
                        <option value="Student">Student</option>
                        <option value="Senior Citizen">Senior Citizen</option>
                        <option value="Armed Forces">Armed Forces</option>
                    </select>
                </div> */}

        <button
          onClick={() => {
            const validation = validateTravelerCounts();
            if (validation.isValid) {
              onClose();
            }
          }}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
