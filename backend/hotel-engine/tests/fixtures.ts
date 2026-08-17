import {
  classifyBoard,
  currencyCode,
  dealId,
  deriveCancellationTerms,
  klarHotelId,
  money,
  occupancy,
  room,
  roomRequest,
  supplierCode,
  supplierCostFromTotal,
  supplierHotelId,
  priceFromCost,
  type CustomerPrice,
  type MarkupRule,
  type SupplierDeal,
  type CancellationWindow,
} from '../src/domain/index.js';

export const INR = currencyCode('INR');
export const TJ = supplierCode('TJ');
export const RG = supplierCode('RG');
export const SC = supplierCode('SC');

/** Rupees → Money. Tests read in rupees; the domain works in paise. */
export const rs = (rupees: number) => money(Math.round(rupees * 100), INR);

export const NO_MARKUP: readonly MarkupRule[] = [];

export const PLATFORM_5_PERCENT: readonly MarkupRule[] = [
  {
    layer: 'PLATFORM',
    enabled: true,
    type: 'PERCENTAGE',
    value: 5,
    region: 'ALL',
    basis: 'NET',
  },
];

export const STANDARD_OCCUPANCY = occupancy([roomRequest(2, 0, [])]);

export interface DealSpec {
  supplier: ReturnType<typeof supplierCode>;
  /** Total the supplier charges KLAR, in rupees. */
  totalRupees: number;
  taxRupees?: number;
  board?: string;
  roomName?: string;
  refundable?: boolean;
  freeUntil?: string;
  id?: string;
  nights?: number;
  rules?: readonly MarkupRule[];
  allotment?: number;
  expiresAt?: Date;
}

const HOTEL = klarHotelId('KLAR-TAJ-EXOTICA-GOA');

export function makeDeal(spec: DealSpec): SupplierDeal {
  const nights = spec.nights ?? 3;
  const taxes = rs(spec.taxRupees ?? 0);
  const cost = supplierCostFromTotal({
    total: rs(spec.totalRupees),
    taxes,
    taxesIncludedInBase: false,
  });

  const price: CustomerPrice = priceFromCost(cost, {
    region: 'ALL',
    channel: 'B2C',
    rules: spec.rules ?? NO_MARKUP,
    nights,
    supplier: spec.supplier,
  });

  const windows: CancellationWindow[] =
    spec.freeUntil !== undefined
      ? [
          { from: '2026-01-01T00:00:00Z', penalty: rs(0) },
          { from: spec.freeUntil, penalty: rs(spec.totalRupees) },
        ]
      : [];

  return {
    dealId: dealId(spec.id ?? `${spec.supplier}-${spec.totalRupees}`),
    supplier: spec.supplier,
    klarHotelId: HOTEL,
    supplierHotelId: supplierHotelId(`${spec.supplier}-PROP-1`),
    room: room({ name: spec.roomName ?? 'Deluxe Room' }),
    board: classifyBoard(spec.board ?? 'Room Only'),
    occupancy: STANDARD_OCCUPANCY,
    cancellation: deriveCancellationTerms({
      ...(spec.refundable !== undefined ? { explicit: spec.refundable } : {}),
      windows,
    }),
    cost,
    price,
    token: {
      dealId: dealId(spec.id ?? `${spec.supplier}-${spec.totalRupees}`),
      issuedAt: new Date('2026-08-13T10:00:00Z'),
      expiresAt: spec.expiresAt ?? new Date('2026-08-13T10:20:00Z'),
    },
    ...(spec.allotment !== undefined ? { allotment: spec.allotment } : {}),
    onHoldAllowed: false,
  };
}
