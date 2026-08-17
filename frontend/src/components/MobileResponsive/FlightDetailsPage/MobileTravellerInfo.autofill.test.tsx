import { describe, it, expect, vi } from 'vitest';
import { render, within, fireEvent } from '@testing-library/react';

vi.mock('../DashboardPage/BottomNav', () => ({ default: () => null }));

import MobileTravellerInfo from './MobileTravellerInfo';

/**
 * The mobile funnel is where autofill matters most — typing a passport name on a
 * phone keyboard is exactly what one-tap fill exists to avoid — and this form
 * had none of it: no name, no autoComplete, no label association.
 *
 * The structural difference from desktop matters for the tests: this screen
 * shows ONE traveller at a time behind passenger tabs. Ids cannot collide, but
 * switching tabs re-renders the same fields in the same DOM position, so each
 * passenger still needs a distinct id and autofill section or the browser
 * treats passenger 2's name field as passenger 1's, offering (and remembering)
 * the wrong person.
 */

const traveler = {
  type: 'ADULT' as const,
  title: 'Mr',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
};

function renderForm(activePassenger = 0) {
  return render(
    <MobileTravellerInfo
      travelers={[traveler, traveler]}
      passengerKeys={['P1', 'P2']}
      activePassenger={activePassenger}
      onTravelerUpdate={vi.fn()}
      email=""
      mobileNumber=""
      emergencyContact={{ name: '', email: '', phone: '' }}
    />,
  );
}

const tokenFor = (container: HTMLElement, labelText: RegExp) =>
  within(container).getByLabelText(labelText).getAttribute('autocomplete');

describe('mobile traveller fields are labelled and autofillable', () => {
  it('associates the identity fields with their labels', () => {
    const { container } = renderForm();

    expect(within(container).getByLabelText(/FIRST NAME/)).toBeTruthy();
    expect(within(container).getByLabelText(/LAST NAME/)).toBeTruthy();
    expect(within(container).getByLabelText(/DATE OF BIRTH/)).toBeTruthy();
    expect(within(container).getByLabelText(/TITLE/)).toBeTruthy();
  });

  it('uses standard tokens behind the section prefix', () => {
    const { container } = renderForm();

    expect(tokenFor(container, /FIRST NAME/)).toContain('given-name');
    expect(tokenFor(container, /LAST NAME/)).toContain('family-name');
    expect(tokenFor(container, /DATE OF BIRTH/)).toContain('bday');
  });

  it('wires the contact block with plain tokens — one booker, no section needed', () => {
    const { container } = renderForm();

    expect(tokenFor(container, /E-MAIL/)).toBe('email');
    expect(tokenFor(container, /MOBILE NUMBER/)).toBe('tel-national');
  });

  it('keeps the emergency contact in its own section', () => {
    // A different person from the booker: plain email/tel here would offer the
    // booker's own details for the wrong human.
    const { container } = renderForm();

    expect(tokenFor(container, /^EMAIL/)).toBe('section-emergency email');
    expect(tokenFor(container, /^PHONE NUMBER/)).toBe('section-emergency tel-national');
    expect(tokenFor(container, /CONTACT NAME/)).toBe('section-emergency name');
  });

  it('gives every non-checkbox control a name', () => {
    const { container } = renderForm();
    const controls = container.querySelectorAll(
      'input:not([type="checkbox"]), select, textarea',
    );

    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) {
      expect(control.getAttribute('name'), `${control.id || control.outerHTML.slice(0, 60)}`).toBeTruthy();
    }
  });
});

describe('switching passenger tabs re-keys the fields', () => {
  it('gives each passenger a distinct field id', () => {
    const first = renderForm(0);
    const second = renderForm(1);

    const a = within(first.container).getByLabelText(/FIRST NAME/).id;
    const b = within(second.container).getByLabelText(/FIRST NAME/).id;

    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('gives each passenger a distinct autofill section', () => {
    const first = tokenFor(renderForm(0).container, /FIRST NAME/);
    const second = tokenFor(renderForm(1).container, /FIRST NAME/);

    expect(first).toBe('section-traveller-1 given-name');
    expect(second).toBe('section-traveller-2 given-name');
  });
});

describe('emergency country code is independent of the booker', () => {
  it('changing the emergency dial code does not touch booker countryCode', () => {
    const onCountryCodeChange = vi.fn();
    const { container } = render(
      <MobileTravellerInfo
        travelers={[traveler]}
        passengerKeys={['P1']}
        countryCode="+91"
        onCountryCodeChange={onCountryCodeChange}
        emergencyContact={{ name: '', email: '', phone: '' }}
      />,
    );
    const select = within(container).getByLabelText('Emergency contact country code');
    fireEvent.change(select, { target: { value: '+1' } });

    expect(onCountryCodeChange).not.toHaveBeenCalled();
    expect((select as HTMLSelectElement).value).toBe('+1');
  });
});
