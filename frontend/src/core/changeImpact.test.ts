/**
 * Change Impact tests (Phase 6)
 */

import { describe, it, expect } from 'vitest';
import {
  computeChangeImpact,
} from './changeImpact';
import type { Snapshot } from '../types/snapshot';
import type { SKU, Forecast, ProjectParameters } from '../types';

// Create mock snapshots for testing
function createMockSnapshot(
  id: string,
  name: string,
  skus: SKU[],
  forecasts: Forecast[],
  highlights: Partial<Snapshot['derivedHighlights']>
): Snapshot {
  return {
    id,
    name,
    createdAt: new Date('2026-01-01'),
    createdBy: 'test-user',
    sourceAppVersion: 'v1.22.0',
    scope: 'personal',
    rawInputs: {
      skus,
      forecasts,
      capacityPlans: [],
      parameters: {} as ProjectParameters,
    },
    derivedHighlights: {
      totalRevenueUsd: 1000000,
      totalForecastPcs: 50000,
      maxCoreUtilization: 0.85,
      maxBuUtilization: 0.75,
      shortageMonthCount: 2,
      worstBottleneckMonth: '2026-03',
      bpAttainment: 0.95,
      bpGapMillionTwd: -50,
      keyFindingsCount: 3,
      skuCount: skus.length,
      forecastMonthCount: 12,
      ...highlights,
    },
  };
}

function createMockSku(id: string, skuCode: string, customer: string): SKU {
  return {
    id,
    skuCode,
    customer,
    deviceName: `Device ${id}`,
    osat: 'OSAT-1',
    application: 'HPC',
    productGrade: 'High',
    sizeCategory: 'large',
    chipLengthMm: 50,
    chipWidthMm: 50,
    layerCount: 10,
    unitPrice: 100,
    unitPriceCurrency: 'USD',
  };
}

function createMockForecast(skuId: string, month: string, pcs: number, price: number): Forecast {
  return {
    id: `fcst-${skuId}-${month}`,
    skuId,
    month,
    forecastPcs: pcs,
    unitPrice: price,
  };
}

describe('changeImpact', () => {
  describe('computeChangeImpact', () => {
    it('should compute revenue delta correctly', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot(
        'base-1',
        'Base',
        skus,
        [],
        { totalRevenueUsd: 1000000 }
      );
      const targetSnapshot = createMockSnapshot(
        'target-1',
        'Target',
        skus,
        [],
        { totalRevenueUsd: 1100000 }
      );

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.summary.revenueDelta.base).toBe(1000000);
      expect(result.summary.revenueDelta.target).toBe(1100000);
      expect(result.summary.revenueDelta.delta).toBe(100000);
      expect(result.summary.revenueDelta.deltaPercent).toBe(10);
    });

    it('should compute BP attainment delta correctly', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, [], {
        bpAttainment: 0.85,
      });
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, [], {
        bpAttainment: 0.92,
      });

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.summary.bpAttainmentDelta.base).toBe(0.85);
      expect(result.summary.bpAttainmentDelta.target).toBe(0.92);
      expect(result.summary.bpAttainmentDelta.delta).toBeCloseTo(0.07);
    });

    it('should compute shortage month delta correctly', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, [], {
        shortageMonthCount: 3,
      });
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, [], {
        shortageMonthCount: 1,
      });

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.summary.shortageMonthDelta.base).toBe(3);
      expect(result.summary.shortageMonthDelta.target).toBe(1);
      expect(result.summary.shortageMonthDelta.delta).toBe(-2);
    });

    it('should handle null values correctly', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, [], {
        maxCoreUtilization: null,
      });
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, [], {
        maxCoreUtilization: 0.9,
      });

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.summary.maxCoreUtilizationDelta.base).toBe(0);
      expect(result.summary.maxCoreUtilizationDelta.target).toBe(0.9);
    });

    it('should compute top changed customers', () => {
      const baseSkus = [
        createMockSku('sku-1', 'SKU-001', 'TSMC'),
        createMockSku('sku-2', 'SKU-002', 'AMD'),
      ];
      const targetSkus = [
        createMockSku('sku-1', 'SKU-001', 'TSMC'),
        createMockSku('sku-2', 'SKU-002', 'AMD'),
        createMockSku('sku-3', 'SKU-003', 'NVIDIA'),
      ];

      const baseForecasts = [
        createMockForecast('sku-1', '2026-01', 1000, 100),
        createMockForecast('sku-2', '2026-01', 500, 100),
      ];
      const targetForecasts = [
        createMockForecast('sku-1', '2026-01', 1500, 100),
        createMockForecast('sku-2', '2026-01', 500, 100),
        createMockForecast('sku-3', '2026-01', 2000, 100),
      ];

      const baseSnapshot = createMockSnapshot('base-1', 'Base', baseSkus, baseForecasts, {});
      const targetSnapshot = createMockSnapshot('target-1', 'Target', targetSkus, targetForecasts, {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.topChangedCustomers.length).toBeGreaterThan(0);
      expect(result.topChangedCustomers.some(c => c.label === 'NVIDIA')).toBe(true);
    });

    it('should compute top changed SKUs', () => {
      const skus = [
        createMockSku('sku-1', 'SKU-001', 'TSMC'),
        createMockSku('sku-2', 'SKU-002', 'AMD'),
      ];

      const baseForecasts = [
        createMockForecast('sku-1', '2026-01', 1000, 100),
        createMockForecast('sku-2', '2026-01', 500, 100),
      ];
      const targetForecasts = [
        createMockForecast('sku-1', '2026-01', 2000, 100), // Doubled
        createMockForecast('sku-2', '2026-01', 500, 100),
      ];

      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, baseForecasts, {});
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, targetForecasts, {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.topChangedSkus.length).toBeGreaterThan(0);
      // SKU-001 should have the largest change
      expect(result.topChangedSkus[0].label).toBe('SKU-001');
    });

    it('should compute top changed months', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];

      const baseForecasts = [
        createMockForecast('sku-1', '2026-01', 1000, 100),
        createMockForecast('sku-1', '2026-02', 1000, 100),
      ];
      const targetForecasts = [
        createMockForecast('sku-1', '2026-01', 1500, 100),
        createMockForecast('sku-1', '2026-02', 500, 100),
      ];

      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, baseForecasts, {});
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, targetForecasts, {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.topChangedMonths.length).toBeGreaterThan(0);
    });

    it('should compute price vs quantity attribution', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];

      const baseForecasts = [
        createMockForecast('sku-1', '2026-01', 1000, 100),
      ];
      const targetForecasts = [
        createMockForecast('sku-1', '2026-01', 1200, 110), // 20% more qty, 10% higher price
      ];

      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, baseForecasts, {});
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, targetForecasts, {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.priceQuantityAttribution).toBeDefined();
      expect(result.priceQuantityAttribution.priceDrivenDeltaUsd).not.toBe(0);
      expect(result.priceQuantityAttribution.quantityDrivenDeltaUsd).not.toBe(0);
    });

    it('should include attribution disclaimer', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot('base-1', 'Base', skus, [], {});
      const targetSnapshot = createMockSnapshot('target-1', 'Target', skus, [], {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.attributionDisclaimer).toContain('proportional');
      expect(result.attributionDisclaimer).toContain('NOT causal');
    });

    it('should include snapshot metadata', () => {
      const skus = [createMockSku('sku-1', 'SKU-001', 'TSMC')];
      const baseSnapshot = createMockSnapshot('base-1', 'Baseline', skus, [], {});
      const targetSnapshot = createMockSnapshot('target-1', 'Budget', skus, [], {});

      const result = computeChangeImpact(baseSnapshot, targetSnapshot);

      expect(result.baseSnapshot.id).toBe('base-1');
      expect(result.baseSnapshot.name).toBe('Baseline');
      expect(result.targetSnapshot.id).toBe('target-1');
      expect(result.targetSnapshot.name).toBe('Budget');
    });
  });
});
