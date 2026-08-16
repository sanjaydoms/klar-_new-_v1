import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/api/flightService.api', () => ({ getReturnFareDetails: vi.fn() }));

import { getReturnFareDetails } from '@/api/flightService.api';
import FlightCard from './FlightCard';
import { Flight } from '../../types/types.returnFlight';

/**
 * One card now stands for one physical flight with its fare groups listed
 * under it. The fare the user picks — not the cheapest — has to drive the
 * fare-details call and the selection handed back, or the review step prices
 * a fare nobody chose.
 */
const mk = (over: Partial<Flight>): Flight =>
  ({
    flightId: 'k-pub',
    id: 'k-pub',
    segmentId: 'k-pub',
    airline: { code: 'SG', name: 'SpiceJet' },
    airlineCode: 'SG',
    flightNumber: 'SG-476',
    departure: { airportCode: 'DEL', airport: 'Delhi', time: '16:30', date: '20-Sep-26' },
    arrival: { airportCode: 'BOM', airport: 'Mumbai', time: '18:40', date: '20-Sep-26' },
    duration: 130,
    stops: 0,
    price: 7932.5,
    currency: '₹',
    isRefundable: true,
    fareIdentifier: 'PUBLISHED',
    refundable: 'Refundable',
    ...over,
  }) as Flight;

const cheapest = mk({});
const pricier = mk({
  flightId: 'k-eco',
  id: 'k-eco',
  segmentId: 'k-eco',
  price: 8100,
  fareIdentifier: 'ECO VALUE',
  seatsRemaining: 3,
});
const grouped = mk({ variants: [cheapest, pricier] });

function renderCard(props: Partial<React.ComponentProps<typeof FlightCard>> = {}) {
  const onSelect = vi.fn();
  const onDeselect = vi.fn();
  render(
    <FlightCard
      flight={grouped}
      isSelected={false}
      onSelect={onSelect}
      onDeselect={onDeselect}
      onViewDetails={() => {}}
      type="departure"
      isReturnFlightSearch={true}
      {...props}
    />,
  );
  return { onSelect, onDeselect };
}

beforeEach(() => {
  vi.mocked(getReturnFareDetails).mockReset();
  vi.mocked(getReturnFareDetails).mockResolvedValue({ success: true, data: { fares: [] } });
  sessionStorage.clear();
  sessionStorage.setItem('returnFlightSessionId', 'sess-1');
});

describe('return flight card fare variants', () => {
  it('lists every fare group and prices the card from the cheapest', () => {
    renderCard();
    expect(screen.getByText('PUBLISHED')).toBeTruthy();
    expect(screen.getByText('ECO VALUE')).toBeTruthy();
    // headline price + the row in the strip
    expect(screen.getAllByText('₹ 7933').length).toBe(2);
  });

  it('selecting a pricier fare drives its own flightKey and price', async () => {
    const { onSelect } = renderCard();

    fireEvent.click(screen.getByText('ECO VALUE'));
    expect(screen.getAllByText('₹ 8100').length).toBe(2);
    expect(screen.getByText('Seats left: 3')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Select' }));

    await waitFor(() => expect(getReturnFareDetails).toHaveBeenCalled());
    expect(vi.mocked(getReturnFareDetails).mock.calls[0]![0]).toMatchObject({
      flightKey: 'k-eco',
      segment: 'ONWARD',
    });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ flightId: 'k-eco' }));
  });

  it('changing fare after selecting clears the stale selection', () => {
    const { onDeselect } = renderCard({ isSelected: true });
    fireEvent.click(screen.getByText('ECO VALUE'));
    expect(onDeselect).toHaveBeenCalled();
  });

  it('renders no fare strip for a single-fare flight', () => {
    render(
      <FlightCard
        flight={cheapest}
        isSelected={false}
        onSelect={() => {}}
        onDeselect={() => {}}
        onViewDetails={() => {}}
        type="departure"
      />,
    );
    expect(screen.queryByText('ECO VALUE')).toBeNull();
  });
});
