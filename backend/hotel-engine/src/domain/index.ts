/**
 * The KLAR hotel domain.
 *
 * Pure by contract: no imports outside this folder, no I/O, no clock reads, no
 * randomness, no environment access. `tests/domain-purity.test.ts` enforces it.
 * Anything that needs the world belongs in a module or in infrastructure.
 */

export * from './shared/brand.js';
export * from './shared/errors.js';
export * from './shared/money.js';
export * from './shared/tristate.js';
export * from './shared/stay.js';

export * from './hotel/canonical-hotel.js';
export * from './hotel/match-confidence.js';
export * from './hotel/name-normalization.js';

export * from './destination/canonical-destination.js';

export * from './rate/board.js';
export * from './rate/room.js';
export * from './rate/occupancy.js';
export * from './rate/cancellation.js';

export * from './pricing/supplier-cost.js';
export * from './pricing/customer-price.js';
export * from './pricing/markup.js';

export * from './deal/supplier-deal.js';
export * from './deal/equivalence.js';
export * from './deal/selection.js';

export * from './search/request.js';
export * from './search/result.js';

export * from './revalidation/revalidation.js';
export * from './booking/booking.js';
