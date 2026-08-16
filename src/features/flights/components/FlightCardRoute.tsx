import { Plane } from 'lucide-react';
import { formatAircraft, formatTerminal } from '../utils/flightDisplay';

/**
 * Airline block + the two endpoints + the leg between them: the part of a
 * results card that is identical on oneway, return and multicity.
 *
 * The three cards had their own copies, which is how they drifted apart. Each
 * still owns its own action column — they select very differently.
 */
export interface FlightEndpoint {
  time?: string | undefined;
  airportCode?: string | undefined;
  city?: string | undefined;
  date?: string | undefined;
  terminal?: string | undefined;
}

interface FlightCardRouteProps {
  airline: string;
  airlineCode?: string | undefined;
  flightNumber?: string | undefined;
  cabinClass?: string | undefined;
  aircraftTypes?: string[] | undefined;
  from: FlightEndpoint;
  to: FlightEndpoint;
  duration: string;
  stopsLabel: string;
  /** Compact spacing for the narrow return columns. */
  dense?: boolean;
}

const CABIN: Record<string, string> = {
  ECONOMY: 'Economy',
  PREMIUM_ECONOMY: 'Premium Economy',
  BUSINESS: 'Business',
  FIRST: 'First Class',
};

const formatTime = (time?: string) => {
  if (!time) return '--:--';
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const ampm = (hours as number) >= 12 ? 'PM' : 'AM';
  const hours12 = (hours as number) % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

/** "28-Aug-26" -> "Fri, 28 Aug 2026"; anything else is passed through. */
export const formatCardDate = (value?: string) => {
  if (!value) return '';
  const [day, month, year] = value.split('-');
  if (!day || !month || !year) return value;
  const parsed = new Date(`${month} ${day}, 20${year}`);
  const weekday = Number.isNaN(parsed.getTime())
    ? ''
    : `${parsed.toLocaleDateString('en-US', { weekday: 'short' })}, `;
  return `${weekday}${day} ${month} 20${year}`;
};

const Endpoint = ({ point, align }: { point: FlightEndpoint; align: 'left' | 'right' }) => {
  const terminal = formatTerminal(point.terminal);
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p className="text-xl font-bold text-primary">{formatTime(point.time)}</p>
      <p className="mt-0.5 text-[15px] font-semibold text-primary">
        {point.airportCode || 'N/A'}
        {terminal && <span className="ml-1 text-xs font-medium text-gray-400">{terminal}</span>}
      </p>
      {point.city && <p className="text-xs text-gray-500">{point.city}</p>}
      {point.date && <p className="text-xs text-gray-500">{formatCardDate(point.date)}</p>}
    </div>
  );
};

export default function FlightCardRoute({
  airline,
  airlineCode,
  flightNumber,
  cabinClass,
  aircraftTypes,
  from,
  to,
  duration,
  stopsLabel,
  dense = false,
}: FlightCardRouteProps) {
  const logo = airlineCode ? `/airline-logos/${airlineCode}.png` : null;
  const aircraft = formatAircraft(aircraftTypes);

  return (
    <div className={dense ? 'space-y-3' : 'flex items-start gap-6'}>
      <div className={`flex items-start gap-3 ${dense ? '' : 'w-[150px] shrink-0 xl:w-[180px]'}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
          {logo ? (
            <img
              src={logo}
              alt={airline}
              className="h-9 w-9 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = `<span class="text-sm font-bold text-primary">${airlineCode || airline?.substring(0, 2)}</span>`;
              }}
            />
          ) : (
            <span className="text-sm font-bold text-primary">
              {airlineCode || airline?.substring(0, 2) || 'NA'}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] font-semibold text-primary">{airline || 'N/A'}</p>
          <p className="text-xs text-gray-500">{flightNumber || 'N/A'}</p>
          <p className="text-xs text-gray-500">
            {cabinClass ? CABIN[cabinClass] || cabinClass : 'Economy'}
          </p>
          {/* From the search response, not the design: one code per segment. */}
          {aircraft && <p className="text-xs text-gray-400">Aircraft {aircraft}</p>}
        </div>
      </div>

      <div className={dense ? '' : 'flex min-w-0 flex-1 items-start justify-between gap-4'}>
        <div className={dense ? 'flex items-start justify-between gap-3' : 'contents'}>
          <Endpoint point={from} align="left" />
          {!dense && (
            <div className="min-w-[110px] flex-1 pt-1">
              <Leg duration={duration} stopsLabel={stopsLabel} />
            </div>
          )}
          <Endpoint point={to} align="right" />
        </div>
        {dense && (
          <div className="mt-3">
            <Leg duration={duration} stopsLabel={stopsLabel} />
          </div>
        )}
      </div>
    </div>
  );
}

function Leg({ duration, stopsLabel }: { duration: string; stopsLabel: string }) {
  return (
    <div className="flex w-full flex-col items-center">
      <p className="mb-1.5 text-xs text-gray-500">{duration || 'N/A'}</p>
      <div className="relative flex w-full items-center">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <Plane className="mx-1 h-4 w-4 rotate-90 text-primary" />
        <span className="flex-1 border-t border-dashed border-gray-300" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <p className="mt-1.5 text-xs font-medium text-[var(--color-brand-red)]">{stopsLabel}</p>
    </div>
  );
}
