/**
 * The single source of truth for what services exist, what port each one owns
 * locally, and what infrastructure each one needs.
 *
 * Everything else — `npm run dev`, `npm run doctor`, the port table in the
 * README — reads this file. If you add a service, add it here first.
 */

export const SERVICES = [
  {
    dir: 'auth-service', name: 'auth', port: 5010, colour: 'cyan',
    summary: 'Accounts, JWT sessions, wallet, markup master config',
    needs: ['mongo'],
  },
  {
    dir: 'flight-service', name: 'flight', port: 5011, colour: 'blue',
    summary: 'Flight search, booking and ticketing (TripJack)',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'hotel-search-service', name: 'hotel-search', port: 5012, colour: 'green',
    summary: 'Hotel search, suggest, static content, facets',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'hotel-booking-service', name: 'hotel-book', port: 5013, colour: 'magenta',
    summary: 'Hotel pricing, booking, cancellation, vouchers',
    needs: ['mongo', 'redis'],
  },
  {
    dir: 'payment-service', name: 'payment', port: 5014, colour: 'yellow',
    summary: 'Razorpay and Cashfree gateways, webhooks',
    needs: ['mongo'],
  },
  {
    dir: 'email-service', name: 'email', port: 5015, colour: 'white',
    summary: 'Transactional mail, queued through BullMQ',
    needs: ['redis'],
  },
  {
    dir: 'cabs-service', name: 'cabs', port: 5016, colour: 'cyan',
    summary: 'Airport transfers and intercity cabs (TripJack Cabs)',
    needs: ['mongo'],
  },
  {
    dir: 'insurance-service', name: 'insurance', port: 5017, colour: 'blue',
    summary: 'Travel insurance (TripJack TripSafe)',
    needs: ['mongo'],
  },
  {
    dir: 'visa-service', name: 'visa', port: 5018, colour: 'green',
    summary: 'Visa products and applications',
    needs: ['mongo'],
  },
  {
    dir: 'charter-service', name: 'charter', port: 5019, colour: 'magenta',
    summary: 'Private charter enquiries and quotes',
    needs: ['mongo'],
  },
  {
    dir: 'tour-package-service', name: 'tour', port: 5020, colour: 'yellow',
    summary: 'Tours and holiday packages',
    needs: ['mongo'],
  },
  {
    dir: 'passport-service', name: 'passport', port: 5021, colour: 'white',
    summary: 'Passport application assistance',
    needs: ['mongo'],
  },
  {
    dir: 'hotel-engine', name: 'engine', port: 5030, colour: 'gray',
    summary: 'Supplier-agnostic hotel OTA engine (not yet wired to the frontend)',
    // Postgres, not MongoDB — and it refuses to start without it.
    needs: [],
    // Excluded from `npm run dev`: nothing calls it yet, it needs a build step
    // the other services do not, and it needs a Postgres nothing else needs.
    excludeFromDevAll: true,
  },
];

export const byName = (name) =>
  SERVICES.find((s) => s.name === name || s.dir === name);
