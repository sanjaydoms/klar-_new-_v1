import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HotelFilters from '../components/HotelFilters';

/**
 * Each Star Category option is a checkbox whose only visible content is a row
 * of star GLYPHS — there is no text anywhere in the label. Without an explicit
 * name, assistive tech announces five identical unlabelled checkboxes and the
 * filter cannot be operated at all.
 *
 * Every other checkbox in this panel renders a text label (price bucket,
 * locality, property type, amenity, meal plan, supplier), so the star row is
 * the only one that needs this and the only one that can silently lose it: a
 * reviewer looking at the rendered page sees stars and assumes it is labelled.
 */
const draw = (hotels: any[]) =>
  render(<MemoryRouter><HotelFilters hotels={hotels} /></MemoryRouter>);

const hotel = (id: string, starRating: number) =>
  ({ id, name: `Hotel ${id}`, starRating, price: 1000 }) as any;

describe('star category filter is operable without sight', () => {
  it('names every star option with its count', () => {
    draw([hotel('a', 5), hotel('b', 3), hotel('c', 1)]);

    for (const n of [5, 3, 1]) {
      const box = screen.getByLabelText(`${n} star`);
      expect(box).toBeTruthy();
      expect(box.getAttribute('type')).toBe('checkbox');
    }
  });

  it('offers a star option only for ratings that exist in the results', () => {
    // The counts drive the list, so an absent rating must not be offered —
    // a filter that returns nothing is worse than one that is not shown.
    draw([hotel('a', 4)]);

    expect(screen.getByLabelText('4 star')).toBeTruthy();
    expect(screen.queryByLabelText('2 star')).toBeNull();
  });

  it('hides the decorative glyphs from the accessibility tree', () => {
    // Otherwise the name is read twice, once as the label and once as the
    // icons' own content.
    const { container } = draw([hotel('a', 3)]);
    const label = screen.getByLabelText('3 star').closest('label')!;
    expect(label.querySelector('[aria-hidden="true"]')).toBeTruthy();
    expect(container).toBeTruthy();
  });
});
