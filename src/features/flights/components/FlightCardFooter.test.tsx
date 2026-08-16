import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlightCardFooter from './FlightCardFooter';

/**
 * These cards printed "REFUNDABLE" and "15 KG / 7 KG" as literals. On one live
 * DEL-BOM day: 3 of 218 fares were Non-Refundable and check-in allowances ran
 * from "1 Piece" to "40 Kg", with 20 fares stating none at all.
 */
describe('FlightCardFooter', () => {
  it('reports what the fare actually says', () => {
    render(
      <FlightCardFooter
        refundable="Non-Refundable"
        checkInBaggage="40 Kg"
        cabinBaggage="7 Kg"
      />,
    );
    expect(screen.getByText('Non-Refundable')).toBeTruthy();
    expect(screen.getByText('40 Kg / 7 Kg')).toBeTruthy();
  });

  it('omits an allowance the supplier did not state, never inventing one', () => {
    render(<FlightCardFooter refundable="Refundable" cabinBaggage="7 Kg" />);
    expect(screen.getByText('7 Kg cabin')).toBeTruthy();
    expect(screen.queryByText(/15 KG/i)).toBeNull();
  });

  it('says nothing when the fare states neither', () => {
    const { container } = render(<FlightCardFooter refundable="Unknown" />);
    expect(container.firstChild).toBeNull();
  });
});
