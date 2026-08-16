import { Globe } from 'lucide-react';

export type TripType = 'oneway' | 'return' | 'multicity';

const LABELS: Record<TripType, string> = {
  oneway: 'One Way',
  return: 'Round Trip',
  multicity: 'Multi City',
};

/**
 * Trip-type selector and the Explore Everywhere action, per the new landing
 * design: the chosen type is a filled navy pill rather than a blue radio.
 *
 * One component for all three trip screens — the row was duplicated in each,
 * so a style change meant editing the same markup three times.
 */
export default function TripTypeRow({
  tripType,
  onChange,
}: {
  tripType: TripType;
  onChange: (t: TripType) => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {(Object.keys(LABELS) as TripType[]).map((t) => {
          const isActive = tripType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={`flex items-center gap-2.5 rounded-xl px-5 py-3 text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  isActive ? 'border-white' : 'border-gray-400'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              {LABELS[t]}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:text-primary"
      >
        <Globe className="h-4 w-4 text-primary" />
        Explore Everywhere
      </button>
    </div>
  );
}
