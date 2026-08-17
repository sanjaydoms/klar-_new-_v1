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
 * WCAG 2.1.1 (Level A) on the primary revenue path.
 *
 * The suggestion buttons carried only `onMouseDown`. They are real <button>
 * elements, so Tab reached them and they looked interactive — but Enter and
 * Space fire `click`, which nothing listened for. A keyboard-only traveller
 * could open the list, move through it, press Enter, and nothing happened: they
 * could not choose an airport, so they could not book a flight.
 *
 * mousedown still runs preventDefault, because that is what stops the input
 * blurring and unmounting the list before the click lands. It just no longer
 * carries the selection.
 */

const settle = async () => {
  await act(async () => {
    vi.advanceTimersByTime(300);
  });
};

async function openWithResults(onChange = vi.fn(), onSelect = vi.fn()) {
  render(<LocationAutocomplete value="" onChange={onChange} onSelect={onSelect} />);
  const input = screen.getByRole('textbox');
  fireEvent.focusIn(input);
  fireEvent.change(input, { target: { value: 'del' } });
  await settle();
  return { input, onChange, onSelect };
}

describe('airport suggestions are keyboard operable', () => {
  beforeEach(() => {
    searchAirports.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects on Enter from a focused suggestion', async () => {
    const { onSelect } = await openWithResults();

    const option = screen.getByText('Indira Gandhi Intl').closest('button')!;
    option.focus();
    // What a browser dispatches for Enter on a focused button.
    fireEvent.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]![0]).toMatchObject({ code: 'DEL' });
  });

  it('selects exactly once on a mouse click, not twice', async () => {
    // Regression guard for the obvious wrong fix: adding onClick while leaving
    // selection on onMouseDown makes a mouse click select twice.
    const { onSelect } = await openWithResults();

    const option = screen.getByText('Indira Gandhi Intl').closest('button')!;
    fireEvent.mouseDown(option);
    fireEvent.click(option);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('still prevents the input blurring while a suggestion is pressed', async () => {
    await openWithResults();

    const option = screen.getByText('Indira Gandhi Intl').closest('button')!;
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    option.dispatchEvent(event);

    // If this stops being prevented, the list unmounts before the click lands
    // and mouse selection breaks.
    expect(event.defaultPrevented).toBe(true);
  });

  it('writes the chosen airport back through onChange', async () => {
    const { onChange } = await openWithResults();

    const option = screen.getByText('Jolly Grant').closest('button')!;
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith('Dehradun (DED), India');
  });

  it('every suggestion is a real button, so Tab reaches it', async () => {
    await openWithResults();

    const options = screen.getAllByRole('button');
    expect(options.length).toBeGreaterThan(0);
    for (const el of options) {
      expect(el.tagName).toBe('BUTTON');
      expect(el.getAttribute('disabled')).toBeNull();
    }
  });
});
