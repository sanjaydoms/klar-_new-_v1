/**
 * The one horizontal rail every block of the landing page sits on.
 *
 * The nav, the hero copy, the search card and the promise strip each carried
 * their own container, and they had drifted into two different widths — the nav
 * and hero on 1400, the card and strip on 1240. At 1440px that put the headline
 * at x=40 and the card at x=144, so nothing on the page lined up with anything
 * else. Four copies of a layout constant is how that happens; this is one.
 *
 * 1400 rather than 1240 because the nav cannot be narrower: logo, eight service
 * tabs, My Trips, Wishlist and Login already fill it.
 */
export const LANDING_RAIL = 'mx-auto w-full max-w-[1400px] px-6';
