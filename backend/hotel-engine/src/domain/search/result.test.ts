import { describe, expect, it } from 'vitest';
import { supplierCode } from '../shared/brand.js';
import {
  incompleteSuppliers,
  priceGuaranteeFor,
  type SupplierAttempt,
} from './result.js';

const TJ = supplierCode('TJ');
const RG = supplierCode('RG');

const attempt = (
  supplier: ReturnType<typeof supplierCode>,
  status: SupplierAttempt['status'],
): SupplierAttempt => ({
  supplier,
  status,
  durationMs: 1_000,
  hotelsReturned: status === 'SUCCESS' ? 20 : 0,
  dealsReturned: status === 'SUCCESS' ? 60 : 0,
  supplierPagesConsumed: 1,
});

/**
 * Brief §20: do not claim the displayed price is the cheapest when a supplier
 * never answered. The reference implementation swallowed supplier failures
 * entirely (D-8), so this distinction could not even be expressed.
 */
describe('price guarantee honesty (brief §20)', () => {
  it('is BEST_AVAILABLE when every supplier answered', () => {
    expect(priceGuaranteeFor([attempt(TJ, 'SUCCESS'), attempt(RG, 'SUCCESS')])).toBe(
      'BEST_AVAILABLE',
    );
  });

  it('counts a supplier that answered "nothing available" as having answered', () => {
    expect(priceGuaranteeFor([attempt(TJ, 'SUCCESS'), attempt(RG, 'EMPTY')])).toBe(
      'BEST_AVAILABLE',
    );
  });

  it('is PARTIAL when a supplier timed out (brief §52 scenario 3)', () => {
    const attempts = [attempt(TJ, 'SUCCESS'), attempt(RG, 'TIMEOUT')];
    expect(priceGuaranteeFor(attempts)).toBe('PARTIAL');
    expect(incompleteSuppliers(attempts)).toEqual([RG]);
  });

  it('is PARTIAL the other way round too (brief §52 scenario 4)', () => {
    const attempts = [attempt(TJ, 'TIMEOUT'), attempt(RG, 'SUCCESS')];
    expect(priceGuaranteeFor(attempts)).toBe('PARTIAL');
    expect(incompleteSuppliers(attempts)).toEqual([TJ]);
  });

  it('is PARTIAL when a supplier only got through some of its pages', () => {
    expect(priceGuaranteeFor([attempt(TJ, 'SUCCESS'), attempt(RG, 'PARTIAL')])).toBe('PARTIAL');
  });

  it('does not treat a disabled or ineligible supplier as a gap', () => {
    // An operator switching a supplier off, or a supplier that does not serve
    // this market, is not a hole in the comparison.
    const attempts = [attempt(TJ, 'SUCCESS'), attempt(RG, 'DISABLED')];
    expect(incompleteSuppliers(attempts)).toEqual([]);
    expect(priceGuaranteeFor(attempts)).toBe('BEST_AVAILABLE');
    expect(priceGuaranteeFor([attempt(TJ, 'SUCCESS'), attempt(RG, 'NOT_ELIGIBLE')])).toBe(
      'BEST_AVAILABLE',
    );
  });

  it('reports every failing supplier when all of them fail (brief §52 scenario 6)', () => {
    const attempts = [attempt(TJ, 'ERROR'), attempt(RG, 'TIMEOUT')];
    expect(incompleteSuppliers(attempts)).toEqual([TJ, RG]);
    expect(priceGuaranteeFor(attempts)).toBe('PARTIAL');
  });
});
