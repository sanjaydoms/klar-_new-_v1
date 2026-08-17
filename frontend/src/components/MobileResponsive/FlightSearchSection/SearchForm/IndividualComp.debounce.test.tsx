import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';

const searchAirports = vi.fn(async (_query: string) => [
  { city: 'Delhi', code: 'DEL', country: 'India', name: 'Indira Gandhi Intl' },
]);

vi.mock('@/services/flightApi', () => ({
  searchAirports: (q: string) => searchAirports(q),
}));

import { FromLocation } from './IndividualComp';

/**
 * These autocompletes ran a full pass over the 8,107-record airport dataset on
 * every keystroke — this one from the very first character, with no minimum
 * length and no debounce at all. Typing a city name meant one scan per letter.
 *
 * Refocusing an input that already has text is deliberately NOT debounced: the
 * list should reappear immediately, not after a pause.
 */

const props = {
  label: 'From',
  placeholder: 'City or Airport',
  location: '',
  code: '',
  airportName: '',
  onLocationChange: vi.fn(),
  onCodeChange: vi.fn(),
};

const typeInto = (input: HTMLElement, text: string) => {
  for (let i = 1; i <= text.length; i++) {
    fireEvent.change(input, { target: { value: text.slice(0, i) } });
  }
};

describe('mobile airport autocomplete debounce', () => {
  beforeEach(() => {
    searchAirports.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches once for a burst of keystrokes, not once per character', () => {
    render(<FromLocation {...props} />);
    const input = screen.getByPlaceholderText('City or Airport');

    typeInto(input, 'delhi'); // 5 characters

    // Nothing yet — the term has not settled.
    expect(searchAirports).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(searchAirports).toHaveBeenCalledTimes(1);
    expect(searchAirports).toHaveBeenCalledWith('delhi');
  });

  it('does not fire on the first character before the delay elapses', () => {
    render(<FromLocation {...props} />);
    const input = screen.getByPlaceholderText('City or Airport');

    fireEvent.change(input, { target: { value: 'd' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(searchAirports).not.toHaveBeenCalled();
  });

  it('restarts the delay while the user keeps typing', () => {
    render(<FromLocation {...props} />);
    const input = screen.getByPlaceholderText('City or Airport');

    fireEvent.change(input, { target: { value: 'de' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.change(input, { target: { value: 'del' } });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // 400ms total, but the pause never reached 300ms.
    expect(searchAirports).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(searchAirports).toHaveBeenCalledTimes(1);
    expect(searchAirports).toHaveBeenCalledWith('del');
  });

  it('clearing the box does not run a search', () => {
    render(<FromLocation {...props} />);
    const input = screen.getByPlaceholderText('City or Airport');

    typeInto(input, 'del');
    fireEvent.change(input, { target: { value: '' } });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(searchAirports).not.toHaveBeenCalled();
  });

  it('refocusing with existing text searches immediately', () => {
    // With a location set the component hides its placeholder, so query by role.
    render(<FromLocation {...props} location="Delhi" />);
    const input = screen.getByRole('textbox');

    // focusIn, not focus: React delegates onFocus via the bubbling focusin
    // event, and a plain `focus` never reaches the handler.
    fireEvent.focusIn(input);

    // No timer advance: this path must not wait.
    expect(searchAirports).toHaveBeenCalledWith('Delhi');
  });
});
