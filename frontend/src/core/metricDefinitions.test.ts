import { describe, it, expect } from 'vitest';
import { METRIC_DEFINITIONS } from './metricDefinitions';

describe('metricDefinitions', () => {
  it('should have METRIC_DEFINITIONS list', () => {
    expect(METRIC_DEFINITIONS).toBeDefined();
    expect(METRIC_DEFINITIONS.length).toBeGreaterThan(0);
  });

  it('should have unique metric IDs', () => {
    const ids = METRIC_DEFINITIONS.map(m => m.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should include core metrics', () => {
    const ids = METRIC_DEFINITIONS.map(m => m.id);
    expect(ids).toContain('revenueUsd');
    expect(ids).toContain('coreUtilization');
    expect(ids).toContain('bpAttainment');
    expect(ids).toContain('buUtilization');
  });

  it('should have valid structure for all metrics', () => {
    for (const m of METRIC_DEFINITIONS) {
      expect(m.id).toBeTypeOf('string');
      expect(m.labelKey).toBeTypeOf('string');
      expect(m.definition).toBeTypeOf('string');
      expect(m.formula).toBeTypeOf('string');
      expect(m.unit).toBeTypeOf('string');
      expect(Array.isArray(m.source)).toBe(true);
      expect(m.source.length).toBeGreaterThan(0);
      expect(Array.isArray(m.ownerView)).toBe(true);
      expect(m.ownerView.length).toBeGreaterThan(0);
    }
  });
});
