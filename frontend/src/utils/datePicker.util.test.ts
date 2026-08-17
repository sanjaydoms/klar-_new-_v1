import { describe, it, expect, vi, afterEach } from 'vitest';

import { openDatePicker } from './datePicker.util';

/**
 * Chrome opens a date picker only from the small glyph inside
 * `<input type="date">`, so clicking the field reads as broken. Our date fields
 * also sit next to a DECORATIVE lucide <Calendar> that looks like the button
 * and does nothing — which is why this must live on the wrapper. A handler on
 * the input never fires for the click a user actually aims at.
 */

/** A field wrapper: decorative icon + the real input, as the app renders it. */
function field(attrs: Partial<HTMLInputElement> = {}) {
  const wrapper = document.createElement('div');
  const icon = document.createElement('svg');
  const input = document.createElement('input');
  input.type = 'date';
  Object.assign(input, attrs);
  wrapper.append(icon, input);
  document.body.append(wrapper);
  return { wrapper, icon, input };
}

const clickOn = (wrapper: HTMLElement, target: Element) =>
  openDatePicker({ currentTarget: wrapper, target } as any);

afterEach(() => {
  document.body.innerHTML = '';
  delete (HTMLInputElement.prototype as any).showPicker;
});

describe('openDatePicker', () => {
  it('opens the picker when the field is clicked', () => {
    const showPicker = vi.fn();
    (HTMLInputElement.prototype as any).showPicker = showPicker;

    const { wrapper, input } = field();
    clickOn(wrapper, input);

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('opens the picker when the decorative icon is clicked', () => {
    // The regression the whole fix is about: an input-level handler misses this.
    const showPicker = vi.fn();
    (HTMLInputElement.prototype as any).showPicker = showPicker;

    const { wrapper, icon } = field();
    clickOn(wrapper, icon);

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('falls back to focus where showPicker does not exist', () => {
    // Safari <16, Firefox <101, jsdom. Must not throw.
    const { wrapper, input } = field();
    const focus = vi.spyOn(input, 'focus');

    expect(() => clickOn(wrapper, input)).not.toThrow();
    expect(focus).toHaveBeenCalled();
  });

  it('survives showPicker throwing, and still focuses', () => {
    // showPicker throws InvalidStateError on a non-mutable input and
    // NotAllowedError without transient user activation. `?.()` guards neither —
    // only a missing method — which is why this is a try/catch, not a `?.()`.
    (HTMLInputElement.prototype as any).showPicker = () => {
      throw new DOMException('NotAllowedError');
    };

    const { wrapper, input } = field();
    const focus = vi.spyOn(input, 'focus');

    expect(() => clickOn(wrapper, input)).not.toThrow();
    expect(focus).toHaveBeenCalled();
  });

  it('does nothing when the wrapper holds no input', () => {
    const wrapper = document.createElement('div');
    document.body.append(wrapper);

    expect(() => clickOn(wrapper, wrapper)).not.toThrow();
  });
});
