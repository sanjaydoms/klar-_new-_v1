import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import HotelCard from './HotelCard';

/**
 * Two hotels on one results page must be comparable at a glance.
 *
 * The headline used to be `basePrice`, which does not mean the same thing for
 * every supplier: TripJack quotes a base with taxes added on top, RateGain
 * usually folds them in. So the same visual slot showed "₹2,516 + ₹130 taxes &
 * fees" next to "₹1,850 incl. taxes & fees" — two different quantities, and the
 * cheaper-LOOKING hotel was not reliably the cheaper one.
 *
 * `price` is the only field whose meaning is supplier-independent (the unified
 * model defines it as the total, always). These lock the headline to it. If one
 * fails, the results page is about to mislead someone on price.
 */

/** TripJack shape: taxes quoted ON TOP of the base. */
const TJ_HOTEL = {
  id: 'TJ:100000001234',
  name: 'Taxes On Top Hotel',
  price: 5292, // 2 nights, all-in
  basePrice: 5032,
  taxAmount: 260,
  taxesIncluded: false,
};

/** RateGain shape: taxes already folded in, no split available. */
const RG_HOTEL = {
  id: 'RG:ChIJabc123',
  name: 'Taxes Included Hotel',
  price: 3700, // 2 nights, all-in
  basePrice: 3700,
  taxAmount: 0,
  taxesIncluded: true,
};

const NIGHTS = 2;

// The card reads the stay length from the search params in sessionStorage, not
// from a prop, so the nightly maths only runs when those are present.
beforeEach(() => {
  sessionStorage.setItem(
    'hotelSearchParams',
    JSON.stringify({ checkIn: '2026-09-15', checkOut: '2026-09-17' }),
  );
});

function renderCard(hotel: Record<string, unknown>) {
  return render(
    <MemoryRouter>
      <HotelCard {...(hotel as any)} />
    </MemoryRouter>,
  );
}

/** The big number on the card, digits only. */
function headlinePrice(container: HTMLElement): number {
  const el = container.querySelector('.text-\\[27\\.04px\\]');
  return Number((el?.textContent ?? '').replace(/[^\d]/g, ''));
}

describe('HotelCard headline price', () => {
  it('shows the all-in per-night price for a supplier that adds taxes on top', () => {
    const { container } = renderCard(TJ_HOTEL);
    // 5292 / 2 = 2646 — NOT the base-derived 2516.
    expect(headlinePrice(container)).toBe(2646);
  });

  it('shows the all-in per-night price for a supplier that includes taxes', () => {
    const { container } = renderCard(RG_HOTEL);
    expect(headlinePrice(container)).toBe(1850);
  });

  it('makes the two suppliers directly comparable', () => {
    const tj = headlinePrice(renderCard(TJ_HOTEL).container);
    const rg = headlinePrice(renderCard(RG_HOTEL).container);

    // Both are now the same quantity: total ÷ nights.
    expect(tj).toBe(Math.round(TJ_HOTEL.price / NIGHTS));
    expect(rg).toBe(Math.round(RG_HOTEL.price / NIGHTS));

    // And the genuinely cheaper stay reads cheaper. Under the old base-price
    // headline this was 2516 vs 1850 — the same ordering by luck, but from
    // quantities that were never comparable.
    expect(rg).toBeLessThan(tj);
  });

  it('never labels the headline as exclusive of taxes', () => {
    renderCard(TJ_HOTEL);
    // The old copy read "+ ₹130 taxes & fees", implying more to pay on top.
    expect(screen.queryByText(/^\+ ₹/)).toBeNull();
    expect(screen.getByText(/Incl\..*taxes & fees/i)).toBeTruthy();
  });

  it('discloses the tax split when the supplier provides one', () => {
    renderCard(TJ_HOTEL);
    expect(screen.getByText(/Incl\. ₹130 taxes & fees/i)).toBeTruthy();
  });

  it('omits the split when the supplier gives none, without changing the number', () => {
    const { container } = renderCard(RG_HOTEL);
    expect(headlinePrice(container)).toBe(1850);
    expect(screen.getByText(/^Incl\. taxes & fees/i)).toBeTruthy();
  });
});
