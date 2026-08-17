import { describe, it, expect, vi } from 'vitest';
import { render, within } from '@testing-library/react';

import TravellerFormCard from './TravellerFormCard';

/**
 * Autofill was dead across the whole flights funnel: not one control carried
 * `name`, `autoComplete` or a label association. On a phone that is the
 * difference between one tap and typing a passport name by hand.
 *
 * Two things make this form harder than a normal one, and both are asserted
 * below rather than assumed:
 *
 *  - The card renders once PER TRAVELLER. Duplicate `id`s would make every
 *    label focus the first traveller's field.
 *  - Bare repeated tokens (`given-name` on three cards) invite the browser to
 *    fill every traveller with the same person. The `section-*` prefix exists
 *    for exactly this, so each traveller is its own autofill section.
 */

const traveler = {
  type: 'ADULT' as const,
  title: 'Mr',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
};

function renderCard(index = 0) {
  const utils = render(
    <TravellerFormCard
      traveler={traveler}
      index={index}
      travelers={[traveler, traveler]}
      updateTraveler={vi.fn()}
      getDateRangeForType={() => ({ min: '1900-01-01', max: '2026-01-01' })}
      isDateValidForType={() => true}
      validateNameInput={(v: string) => v}
      nameErrors={{}}
      setNameErrors={vi.fn()}
    />,
  );
  return utils;
}

/** The autocomplete token on the control a label points at. */
const tokenFor = (container: HTMLElement, labelText: RegExp) => {
  const field = within(container).getByLabelText(labelText);
  return field.getAttribute('autocomplete');
};

describe('traveller fields are labelled and autofillable', () => {
  it('associates every required field with its label', () => {
    // getByLabelText only resolves through a real htmlFor/id pair, so this is a
    // genuine association test, not a presence check.
    const { container } = renderCard();

    expect(within(container).getByLabelText(/First Name/)).toBeTruthy();
    expect(within(container).getByLabelText(/Last Name/)).toBeTruthy();
    expect(within(container).getByLabelText(/Date of Birth/)).toBeTruthy();
    expect(within(container).getByLabelText(/Title/)).toBeTruthy();
  });

  it('uses the standard token for each field', () => {
    const { container } = renderCard();

    expect(tokenFor(container, /First Name/)).toContain('given-name');
    expect(tokenFor(container, /Last Name/)).toContain('family-name');
    expect(tokenFor(container, /Date of Birth/)).toContain('bday');
    expect(tokenFor(container, /Title/)).toContain('honorific-prefix');
  });

  it('marks the required fields required', () => {
    const { container } = renderCard();
    // Maps to aria-required even with no <form> element in this funnel.
    expect(within(container).getByLabelText(/First Name/)).toHaveProperty('required', true);
    expect(within(container).getByLabelText(/Date of Birth/)).toHaveProperty('required', true);
  });

  it('gives every control a name, so nothing is anonymous to the browser', () => {
    const { container } = renderCard();
    const controls = container.querySelectorAll('input, select');

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.getAttribute('name')).toBeTruthy();
    }
  });
});

describe('each traveller is its own autofill section', () => {
  it('scopes ids by traveller so labels do not cross-focus', () => {
    const first = renderCard(0);
    const second = renderCard(1);

    const a = within(first.container).getByLabelText(/First Name/).id;
    const b = within(second.container).getByLabelText(/First Name/).id;

    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('gives each traveller a distinct autofill section', () => {
    // Without this the browser fills traveller 2 with traveller 1's identity.
    const first = tokenFor(renderCard(0).container, /First Name/);
    const second = tokenFor(renderCard(1).container, /First Name/);

    expect(first).toMatch(/^section-traveller-1 /);
    expect(second).toMatch(/^section-traveller-2 /);
    expect(first).not.toBe(second);
  });

  it('keeps a standard token after the section prefix', () => {
    // Browsers only recognise the field if what follows the prefix is a real
    // token — a bespoke string here would silently disable autofill.
    const token = tokenFor(renderCard(2).container, /Last Name/);
    expect(token).toBe('section-traveller-3 family-name');
  });
});
