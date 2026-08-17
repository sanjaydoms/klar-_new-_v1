import { describe, expect, it } from 'vitest';
import { searchId, supplierCode } from '../../domain/shared/brand.js';
import type { SearchDiagnostics, SupplierAttempt } from '../../domain/search/result.js';
import { MetricsRegistry } from './registry.js';

const TJ = supplierCode('TJ');
const RG = supplierCode('RG');

function diagnostics(over: Partial<SearchDiagnostics> = {}): SearchDiagnostics {
  return {
    searchId: searchId('KLAR-SRCH-1'),
    totalDurationMs: 500,
    deadlineMs: 15_000,
    deadlineHit: false,
    attempts: [],
    cache: 'MISS',
    hotelsBeforeMerge: 0,
    hotelsAfterMerge: 0,
    mergesPerformed: 0,
    mergesRejectedLowConfidence: 0,
    enrichmentCallsIssued: 0,
    enrichmentCallsSucceeded: 0,
    enrichmentSkipped: 0,
    ...over,
  };
}

const attempt = (over: Partial<SupplierAttempt> = {}): SupplierAttempt => ({
  supplier: TJ,
  status: 'SUCCESS',
  durationMs: 100,
  hotelsReturned: 5,
  dealsReturned: 5,
  supplierPagesConsumed: 1,
  retryable: false,
  ...over,
});

describe('MetricsRegistry', () => {
  it('counts total searches', () => {
    const registry = new MetricsRegistry();
    registry.record(diagnostics());
    registry.record(diagnostics());

    expect(registry.toPrometheusText()).toContain('klar_searches_total 2');
  });

  it('breaks cache results out by label', () => {
    const registry = new MetricsRegistry();
    registry.record(diagnostics({ cache: 'HIT' }));
    registry.record(diagnostics({ cache: 'HIT' }));
    registry.record(diagnostics({ cache: 'MISS' }));

    const text = registry.toPrometheusText();
    expect(text).toContain('klar_search_cache_result_total{result="HIT"} 2');
    expect(text).toContain('klar_search_cache_result_total{result="MISS"} 1');
  });

  it('counts only deadline hits, not every search', () => {
    const registry = new MetricsRegistry();
    registry.record(diagnostics({ deadlineHit: true }));
    registry.record(diagnostics({ deadlineHit: false }));

    expect(registry.toPrometheusText()).toContain('klar_search_deadline_hit_total 1');
  });

  it('sums duration and counts it separately, so the mean is derivable', () => {
    const registry = new MetricsRegistry();
    registry.record(diagnostics({ totalDurationMs: 300 }));
    registry.record(diagnostics({ totalDurationMs: 700 }));

    const text = registry.toPrometheusText();
    expect(text).toContain('klar_search_duration_ms_sum 1000');
    expect(text).toContain('klar_search_duration_ms_count 2');
  });

  it('breaks supplier attempts out by supplier and status', () => {
    const registry = new MetricsRegistry();
    registry.record(
      diagnostics({
        attempts: [attempt({ supplier: TJ, status: 'SUCCESS' }), attempt({ supplier: RG, status: 'ERROR' })],
      }),
    );
    registry.record(diagnostics({ attempts: [attempt({ supplier: TJ, status: 'SUCCESS' })] }));

    const text = registry.toPrometheusText();
    expect(text).toContain('klar_supplier_attempts_total{supplier="TJ",status="SUCCESS"} 2');
    expect(text).toContain('klar_supplier_attempts_total{supplier="RG",status="ERROR"} 1');
  });

  it('produces valid Prometheus text — every non-comment, non-empty line matches metric or bucket syntax', () => {
    const registry = new MetricsRegistry();
    registry.record(diagnostics({ attempts: [attempt()] }));

    const lines = registry.toPrometheusText().split('\n').filter((l) => l.length > 0);
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      expect(line).toMatch(/^[a-z_]+(\{[a-z]+="[^"]*"(,[a-z]+="[^"]*")*\})? -?\d+(\.\d+)?$/);
    }
  });
});
