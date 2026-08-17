import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * `/before/booking` must not change component while someone is on it.
 *
 * BeforeBooking and MobilePaymentPage are not responsive variants of one screen
 * — they read DIFFERENT sessionStorage keys (`onewayReviewData`/`seatSelection`
 * vs `reviewData`/`selectedItems`). A resize listener swapped between them
 * whenever the window crossed 768px, so dragging a browser narrower on the review
 * screen mounted a component whose keys were never written: a blank summary and
 * ₹0.00 rows, one step before payment.
 *
 * Source-level guards. Rendering the real thing would need the whole booking
 * funnel in sessionStorage, and the property that matters here — that nothing
 * re-decides after mount — is a property of the code, not of one render.
 */

const routes = readFileSync(resolve(__dirname, 'index.tsx'), 'utf8');

/** The BeforeBookingView declaration, comments stripped. */
const view = (() => {
  const start = routes.indexOf('const BeforeBookingView');
  const end = routes.indexOf('};', start) + 2;
  return routes
    .slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
})();

describe('BeforeBookingView decides once', () => {
  it('exists and still chooses between the two screens', () => {
    expect(view).toContain('MobilePaymentPage');
    expect(view).toContain('BeforeBooking');
  });

  it('does not listen for resize', () => {
    // The regression, exactly.
    expect(view).not.toMatch(/addEventListener\(\s*['"]resize['"]/);
    expect(view).not.toMatch(/\bhandleResize\b/);
  });

  it('does not re-set its breakpoint state after mount', () => {
    // A lazy initialiser is fine; a setter being called is not.
    expect(view).not.toMatch(/setIsMobile\s*\(/);
  });

  it('reads the viewport width exactly once', () => {
    expect((view.match(/window\.innerWidth/g) ?? []).length).toBe(1);
  });
});

describe('/before/booking is registered once', () => {
  it('has no duplicate route for the same path', () => {
    // ROUTES.MOBILE_REVIEW is the same literal string as ROUTES.BEFORE_BOOKING,
    // so registering both put two Routes on one path.
    const registrations = routes.match(/<Route\s+path=\{ROUTES\.(BEFORE_BOOKING|MOBILE_REVIEW)\}/g) ?? [];
    expect(registrations).toHaveLength(1);
  });

  it('still registers the review route', () => {
    expect(routes).toMatch(/<Route\s+path=\{ROUTES\.BEFORE_BOOKING\}/);
  });
});

describe('the two review screens share one storage channel', () => {
  // The screens converged on utils/reviewSession.ts (one key, one shape).
  // This guard fails if either screen grows a direct sessionStorage read of
  // the review keys again — all access must stay behind the accessor.
  const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8');

  it('both screens read through readReviewData, never getItem', () => {
    const desktop = src('userinfoandseatinfo/BeforeBookingConfirmation.tsx');
    const mobile = src('components/MobileResponsive/MobileReview/MobilePaymentPage.tsx');

    for (const screen of [desktop, mobile]) {
      expect(screen).toContain('readReviewData');
      expect(screen).not.toContain("getItem('onewayReviewData')");
      expect(screen).not.toContain("getItem('reviewData')");
    }
  });

  it('the screen choice is data-driven, not viewport-only', () => {
    expect(routes).toContain("getItem('seatSelection')");
    expect(routes).toContain("getItem('selectedItems')");
  });
});
