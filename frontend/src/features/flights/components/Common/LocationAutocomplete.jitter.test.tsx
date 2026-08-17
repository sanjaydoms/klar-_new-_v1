import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';

const searchAirports = vi.fn(async (_query: string) => [
  { city: 'Delhi', code: 'DEL', country: 'India', name: 'Indira Gandhi Intl' },
  { city: 'Dehradun', code: 'DED', country: 'India', name: 'Jolly Grant' },
]);

vi.mock('../../../../services/flightApi', () => ({
  searchAirports: (q: string) => searchAirports(q),
}));

import LocationAutocomplete from './LocationAutocomplete';

/**
 * The dropdown used to swap between a ~56px "Loading..." box and a list of up to
 * 20 rows, so it collapsed and sprang back on every search, and resized again
 * whenever the result count changed. It is `absolute`, so this never reflowed the
 * page — the panel itself was the thing jumping, right under the cursor.
 *
 * The fix is a floor height plus skeleton rows at real row height. These lock in
 * that the panel keeps that floor in every state it can be in.
 */

const FLOOR = 'min-h-[13.5rem]';

const panel = () => document.querySelector('.absolute.z-50') as HTMLElement | null;

describe('airport dropdown holds its size', () => {
  beforeEach(() => {
    searchAirports.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Focus opens the panel; typing then fills it. */
  const open = () => {
    render(<LocationAutocomplete value="" onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    fireEvent.focusIn(input); // React delegates onFocus via focusin
    fireEvent.change(input, { target: { value: 'del' } });
    return input;
  };

  /** Advance past the debounce and let the search promise settle. */
  const settle = async () => {
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
  };

  it('reserves the floor height once results arrive', async () => {
    open();
    await settle();

    expect(screen.getByText('Indira Gandhi Intl')).toBeTruthy();
    const el = panel();
    expect(el).not.toBeNull();
    expect(el!.className).toContain(FLOOR);
  });

  it('renders skeleton rows rather than a collapsed text box while loading', () => {
    open();
    // Fire the debounce but do NOT flush the search promise, so loading is what
    // renders.
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // The old markup was a single centred "Loading..." string ~56px tall.
    expect(screen.queryByText('Loading...')).toBeNull();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(panel()!.className).toContain(FLOOR);
  });

  it('shows an empty state instead of vanishing when nothing matches', async () => {
    // Regression: the panel's own condition was `suggestions.length > 0 ||
    // isLoading`, so it unmounted the moment results hit zero — making the
    // "No locations found" branch inside it unreachable. The dropdown just
    // disappeared mid-type.
    searchAirports.mockResolvedValueOnce([]);
    open();
    await settle();

    const empty = screen.getByText('No locations found');
    // The message is centred inside the same reserved height, so the panel does
    // not shrink to a one-line box.
    expect(empty.className).toContain(FLOOR);
  });

  it('still caps and scrolls for long lists', async () => {
    open();
    await settle();

    const el = panel()!;
    // The floor must not have replaced the ceiling.
    expect(el.className).toContain('max-h-80');
    expect(el.className).toContain('overflow-y-auto');
  });
});
