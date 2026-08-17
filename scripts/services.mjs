/**
 * The single source of truth for what runs locally, what port each thing owns,
 * and what infrastructure it needs.
 *
 * Everything else — `npm run dev`, `npm run doctor`, the port table in the
 * README — reads this file. If you add a service, add it here first.
 *
 * `dir` is relative to the repository root, so it carries the backend/ or
 * frontend/ prefix.
 */

/** The B2C web application. Listed here so one `npm run dev` starts the stack. */
export const FRONTEND = {
  dir: 'frontend', name: 'web', port: 5008, colour: 'magenta',
  summary: 'B2C customer web application (Vite + React)',
  needs: [],
  isFrontend: true,
};

export const SERVICES = [
  {
    dir: 'backend/auth-service', name: 'auth', port: 5010, colour: 'cyan',
    summary: 'Accounts, JWT sessions, wallet, markup master config',
    needs: ['mongo'],
  },
  {
    dir: 'backend/flight-service', name: 'flight', port: 5011, colour: 'blue',
    summary: 'Flight search, booking and ticketing (TripJack)',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'backend/hotel-search-service', name: 'hotel-search', port: 5012, colour: 'green',
    summary: 'Hotel search, suggest, static content, facets',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'backend/hotel-booking-service', name: 'hotel-book', port: 5013, colour: 'magenta',
    summary: 'Hotel pricing, booking, cancellation, vouchers',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'backend/payment-service', name: 'payment', port: 5014, colour: 'yellow',
    summary: 'Razorpay and Cashfree gateways, webhooks',
    needs: ['mongo'],
  },
  {
    dir: 'backend/email-service', name: 'email', port: 5015, colour: 'white',
    summary: 'Transactional mail, queued through BullMQ',
    needs: ['redis'],
  },
  {
    dir: 'backend/cabs-service', name: 'cabs', port: 5016, colour: 'cyan',
    summary: 'Airport transfers and intercity cabs (TripJack Cabs)',
    needs: ['mongo'],
  },
  {
    dir: 'backend/insurance-service', name: 'insurance', port: 5017, colour: 'blue',
    summary: 'Travel insurance (TripJack TripSafe)',
    needs: ['mongo'],
  },
  {
    dir: 'backend/visa-service', name: 'visa', port: 5018, colour: 'green',
    summary: 'Visa products and applications',
    needs: ['mongo'],
  },
  {
    dir: 'backend/charter-service', name: 'charter', port: 5019, colour: 'magenta',
    summary: 'Private charter enquiries and quotes',
    needs: ['mongo'],
  },
  {
    dir: 'backend/tour-package-service', name: 'tour', port: 5020, colour: 'yellow',
    summary: 'Tours and holiday packages',
    needs: ['mongo'],
  },
  {
    dir: 'backend/passport-service', name: 'passport', port: 5021, colour: 'white',
    summary: 'Passport application assistance',
    needs: ['mongo'],
  },
  {
    dir: 'backend/hotel-engine', name: 'engine', port: 5030, colour: 'gray',
    summary: 'Supplier-agnostic hotel OTA engine (not yet wired to the frontend)',
    // Postgres, not MongoDB — and it refuses to start without it.
    needs: [],
    // Excluded from `npm run dev`: nothing calls it yet, it needs a build step
    // the other services do not, and it needs a Postgres nothing else needs.
    excludeFromDevAll: true,
  },
];

/** Everything `npm run dev` and `npm run doctor` know about, frontend included. */
export const ALL = [FRONTEND, ...SERVICES];

export const byName = (name) =>
  ALL.find((s) => s.name === name || s.dir === name || s.dir === `backend/${name}`);
