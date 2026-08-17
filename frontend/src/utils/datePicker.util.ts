import type React from 'react';

/**
 * Open a native date picker when the user clicks anywhere on the field.
 *
 * Chrome only opens the picker from the small calendar glyph inside
 * `<input type="date">`, so clicking the field reads as broken. Worse, most of
 * our date fields put a DECORATIVE lucide <Calendar> next to the input — it
 * looks like the button that opens the picker and does nothing at all.
 *
 * Attach this to the WRAPPER, not the input. A handler on the input never fires
 * when the user clicks the icon beside it, which is the affordance they aim for.
 *
 * `?.()` alone is not a guard: it covers a MISSING method (Safari <16,
 * Firefox <101, jsdom) but not either exception showPicker actually throws —
 * InvalidStateError on a readOnly/disabled input, NotAllowedError without
 * transient user activation. Hence the feature test and the try/catch, with a
 * focus() fallback so unsupported browsers behave as they do today.
 *
 * Lifted from the pattern already in HotelSearchPage.tsx so every date field
 * behaves the same way.
 */
export function openDatePicker(event: React.MouseEvent<HTMLElement>): void {
  const input = event.currentTarget.querySelector('input');
  if (!input) return;

  try {
    if ('showPicker' in HTMLInputElement.prototype) {
      input.showPicker();
    } else {
      input.focus();
    }
  } catch {
    // Non-mutable input, or a click without user activation. Falling back to
    // focus keeps the field typeable rather than throwing into the console.
    input.focus();
  }
}
