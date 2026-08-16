import { useState, useMemo } from 'react';
import { FlightData } from '../../types/types.oneWayFlight';
import OneWayFlightCard from './OnewayFlightcard';
import { groupFareVariants, durationToMinutes } from '../../utils/groupFareVariants';

interface OneWayFlightListProps {
  flights?: FlightData[] | any;
  onViewFareRules?: (flight: FlightData, fare: any) => void;
}

export default function OneWayFlightList({ flights = [] }: OneWayFlightListProps) {
  const [expandedFlightId, setExpandedFlightId] = useState<string | null>(null);

  const safeFlights = useMemo(() => {
    if (Array.isArray(flights)) {
      return flights;
    }

    if (flights?.flights && Array.isArray(flights.flights)) {
      return flights.flights;
    }

    if (flights?.data?.flights && Array.isArray(flights.data.flights)) {
      return flights.data.flights;
    }

    if (flights?.onwardFlights && Array.isArray(flights.onwardFlights)) {
      return flights.onwardFlights;
    }

    if (flights?.data?.flights?.onward && Array.isArray(flights.data.flights.onward)) {
      return flights.data.flights.onward;
    }

    if (flights?.flights?.onward && Array.isArray(flights.flights.onward)) {
      return flights.flights.onward;
    }

    return [];
  }, [flights]);

  if (safeFlights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500 mb-4">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No flights found</h3>
          <p className="text-gray-500">
            Try adjusting your search filters or try a different date.
          </p>
        </div>
      </div>
    );
  }

  const toggleExpand = (flightId: string) => {
    setExpandedFlightId((prev) => (prev === flightId ? null : flightId));
  };

  const getUniqueKey = (flight: FlightData, index: number): string => {
    if (flight?.flightKey) {
      return `${flight.flightKey}-${index}`;
    }
    if (flight?.flightNumber) {
      return `${flight.flightNumber}-${index}`;
    }
    return `flight-${index}`;
  };

  const groups = groupFareVariants<FlightData>(safeFlights);
  const cheapestOverall = groups.reduce(
    (best: FlightData | null, g) =>
      !best || (g.cheapest as any).price < (best as any).price ? g.cheapest : best,
    null,
  );
  const fastestOverall = groups.reduce(
    (best: FlightData | null, g) =>
      !best ||
      durationToMinutes((g.cheapest as any).duration) < durationToMinutes((best as any).duration)
        ? g.cheapest
        : best,
    null,
  );

  return (
    <div className="space-y-4">
      {cheapestOverall && fastestOverall && (
        <div className="flex flex-wrap gap-3">
          <div className="rounded-lg border border-accent/50 bg-card px-4 py-2 shadow-sm">
            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
              Cheapest
            </span>
            <p className="font-display text-sm font-medium text-primary">
              ₹{(cheapestOverall as any).price?.toFixed(0)} · {(cheapestOverall as any).duration}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-2 shadow-sm">
            <span className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#b68d40]">
              Fastest
            </span>
            <p className="font-display text-sm font-medium text-primary">
              ₹{(fastestOverall as any).price?.toFixed(0)} · {(fastestOverall as any).duration}
            </p>
          </div>
        </div>
      )}
      {groups.map((group, index) => {
        const flight = group.cheapest;
        const flightId = flight?.flightKey || flight?.flightNumber || `flight-${index}`;
        return (
          <OneWayFlightCard
            key={getUniqueKey(flight, index)}
            flight={flight}
            variants={group.variants}
            isExpanded={expandedFlightId === flightId}
            onToggleExpand={() => toggleExpand(flightId)}
          />
        );
      })}
    </div>
  );
}
