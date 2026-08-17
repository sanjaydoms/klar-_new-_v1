import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import TravelerDropdown from './TravelerDropdown';

/**
 * The traveller card appeared on top of the fields it belongs under.
 *
 * Cause: this component positioned ITSELF (`absolute z-50 mt-1`) while all four
 * call sites wrap it in their own positioned container. An absolutely-positioned
 * child contributes no height, so each wrapper collapsed to a zero-height box
 * and its `bottom-full` / `top-full mt-2` had nothing to offset from. The
 * `mb-24` at the first call site was a 96px workaround for the collapse, not a
 * fix — so the two have to change together, and these lock that pairing in.
 */

const props = {
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: 'ECONOMY',
  onAdultsChange: vi.fn(),
  onChildrenChange: vi.fn(),
  onInfantsChange: vi.fn(),
  onCabinClassChange: vi.fn(),
  onClose: vi.fn(),
} as any;

describe('TravelerDropdown does not position itself', () => {
  it('renders no positioning classes on its root', () => {
    const { container } = render(<TravelerDropdown {...props} />);
    const root = container.firstElementChild as HTMLElement;

    // Any of these re-introduces the collapsed-wrapper bug.
    expect(root.className).not.toMatch(/\babsolute\b/);
    expect(root.className).not.toMatch(/\bfixed\b/);
    expect(root.className).not.toMatch(/\bmt-1\b/);
  });

  it('keeps its own presentation', () => {
    const { container } = render(<TravelerDropdown {...props} />);
    const root = container.firstElementChild as HTMLElement;

    // The card still looks like a card — only positioning moved out.
    expect(root.className).toContain('bg-white');
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('w-80');
  });
});

describe('the call site no longer compensates for it', () => {
  const source = readFileSync(
    resolve(
      __dirname,
      '../../../../components/DashboardComponents/DashboardSearchCard/FlightSearchSection.tsx',
    ),
    'utf8',
  ).replace(/\/\*[\s\S]*?\*\//g, ''); // drop comments explaining the old value

  it('has dropped the 96px mb-24 nudge', () => {
    expect(source).not.toMatch(/\bmb-24\b/);
  });

  it('still anchors the card above the field', () => {
    // Removing mb-24 without keeping bottom-full would drop the card over the
    // form instead.
    expect(source).toMatch(/absolute bottom-full[^"]*z-50/);
  });
});
