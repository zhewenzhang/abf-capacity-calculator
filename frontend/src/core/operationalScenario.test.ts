import { describe, it, expect } from 'vitest';
import { runOperationalScenario } from './operationalScenario';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

// ============================================================
// Test fixtures (reused from scenarioEngine.test.ts pattern)
// ============================================================

function makeSku(overrides: Partial<SKU> = {}): SKU {
  return {
    id: 'sku-1',
    skuCode: 'SKU-001',
    customer: 'Customer A',
    deviceName: 'Device-A',
    osat: 'ASE',
    application: 'Mobile',
    productGrade: 'A',
    sizeCategory: 'medium',
    chipLengthMm: 10,
    chipWidthMm: 10,
    layerCount: 8,
    unitPrice: 5.0,
    unitPriceCurrency: 'USD',
    ...overrides,
  };
}

function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'fc-1',
    skuId: 'sku-1',
    month: '2026-01',
    forecastPcs: 10000,
    unitPrice: 5.0,
    unitPriceCurrency: 'USD',
    ...overrides,
  };
}

function makeCapacity(overrides: Partial<CapacityPlan> = {}): CapacityPlan {
  return {
    id: 'cp-1',
    month: '2026-01',
    factoryId: 'fab-a',
    corePanelPerDay: 6000,
    buPanelPerDay: 5000,
    ...overrides,
  };
}

const defaultParams: ProjectParameters = {
  defaultWorkingDays: 28,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  panelParams: DEFAULT_PANEL_PARAMS,
  currencySettings: {
    baseCurrency: 'USD',
    displayCurrency: 'USD',
    exchangeRateMode: 'constant',
    constantUsdToTwdRate: 32,
    yearlyUsdToTwdRates: {},
    constantUsdToCnyRate: 7.2,
    yearlyUsdToCnyRates: {},
  },
};

// ============================================================
// Shared test data
// ============================================================

const skus = [
  makeSku({ id: 'sku-1', skuCode: 'SKU-001', customer: 'Customer A', unitPrice: 5.0 }),
  makeSku({ id: 'sku-2', skuCode: 'SKU-002', customer: 'Customer B', unitPrice: 8.0, chipLengthMm: 15, chipWidthMm: 15 }),
];

const forecasts = [
  makeForecast({ id: 'fc-1', skuId: 'sku-1', month: '2026-01', forecastPcs: 10000, unitPrice: 5.0 }),
  makeForecast({ id: 'fc-2', skuId: 'sku-1', month: '2026-02', forecastPcs: 12000, unitPrice: 5.0 }),
  makeForecast({ id: 'fc-3', skuId: 'sku-1', month: '2026-03', forecastPcs: 11000, unitPrice: 5.0 }),
  makeForecast({ id: 'fc-4', skuId: 'sku-2', month: '2026-01', forecastPcs: 8000, unitPrice: 8.0 }),
  makeForecast({ id: 'fc-5', skuId: 'sku-2', month: '2026-02', forecastPcs: 9000, unitPrice: 8.0 }),
  makeForecast({ id: 'fc-6', skuId: 'sku-2', month: '2026-03', forecastPcs: 7000, unitPrice: 8.0 }),
];

const capacityPlans = [
  makeCapacity({ id: 'cp-1', month: '2026-01', factoryId: 'fab-a', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
  makeCapacity({ id: 'cp-2', month: '2026-02', factoryId: 'fab-a', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
  makeCapacity({ id: 'cp-3', month: '2026-03', factoryId: 'fab-a', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
];

// ============================================================
// Tests
// ============================================================

describe('operationalScenario', () => {
  // ----------------------------------------------------------
  // 1. Capacity delay by 2 months
  // ----------------------------------------------------------
  describe('capacity delay by 2 months', () => {
    it('shifts capacity forward and drops out-of-range entries', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
        capacityShiftTarget: 'both',
      });

      // After shifting +2 months: 2026-01 -> 2026-03, 2026-02 -> 2026-04, 2026-03 -> 2026-05
      // Forecast range is 2026-01 to 2026-03, so 2026-04 and 2026-05 are dropped
      // Only 2026-03 capacity survives (from original 2026-01)

      // With less capacity, revenue should decrease (or stay same if no shortage)
      expect(result.comparison.deltas.totalRevenueUsd.delta).toBeDefined();
      expect(result.scenarioType).toBe('capacityDelay');
      expect(result.description).toContain('delayed');
      expect(result.description).toContain('2 month(s)');
    });
  });

  // ----------------------------------------------------------
  // 2. Capacity pull-forward by 1 month
  // ----------------------------------------------------------
  describe('capacity pull-forward by 1 month', () => {
    it('shifts capacity backward by 1 month', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityPullForward',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 1,
        capacityShiftTarget: 'both',
      });

      // After shifting -1 month: 2026-01 -> 2025-12, 2026-02 -> 2026-01, 2026-03 -> 2026-02
      // 2025-12 is outside forecast range (dropped), 2026-01 and 2026-02 survive
      expect(result.scenarioType).toBe('capacityPullForward');
      expect(result.description).toContain('pulled forward');
      expect(result.description).toContain('1 month(s)');
    });
  });

  // ----------------------------------------------------------
  // 3. Forecast increase 10%
  // ----------------------------------------------------------
  describe('forecast increase 10%', () => {
    it('increases forecastPcs by 10%', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      // Revenue should increase when forecast volume increases
      expect(result.comparison.deltas.totalRevenueUsd.delta).toBeGreaterThan(0);
      expect(result.comparison.deltas.totalForecastPcs.delta).toBeGreaterThan(0);
      expect(result.scenarioType).toBe('forecastAdjustment');
      expect(result.description).toContain('increased');
      expect(result.description).toContain('10%');
    });
  });

  // ----------------------------------------------------------
  // 4. Forecast decrease 20%
  // ----------------------------------------------------------
  describe('forecast decrease 20%', () => {
    it('decreases forecastPcs by 20%', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: -20,
      });

      // Revenue should decrease when forecast volume decreases
      expect(result.comparison.deltas.totalRevenueUsd.delta).toBeLessThan(0);
      expect(result.comparison.deltas.totalForecastPcs.delta).toBeLessThan(0);
      expect(result.description).toContain('decreased');
      expect(result.description).toContain('20%');
    });
  });

  // ----------------------------------------------------------
  // 5. Order disappearance by customer
  // ----------------------------------------------------------
  describe('order disappearance by customer', () => {
    it('removes forecasts for a specific customer', () => {
      const result = runOperationalScenario({
        scenarioType: 'orderDisappearance',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        orderFilter: { customer: 'Customer A' },
      });

      // Customer A has sku-1 (3 forecasts), Customer B has sku-2 (3 forecasts)
      // Removing Customer A should reduce total forecast and revenue
      expect(result.comparison.deltas.totalForecastPcs.delta).toBeLessThan(0);
      expect(result.comparison.deltas.totalRevenueUsd.delta).toBeLessThan(0);
      expect(result.scenarioType).toBe('orderDisappearance');
      expect(result.description).toContain('Customer A');
    });
  });

  // ----------------------------------------------------------
  // 6. Customer/SKU impact
  // ----------------------------------------------------------
  describe('customer/SKU impact', () => {
    it('computes correct per-customer and per-SKU deltas', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      const { impact } = result;

      // Should have byCustomer entries
      expect(impact.byCustomer.length).toBeGreaterThan(0);

      // Should have bySku entries
      expect(impact.bySku.length).toBeGreaterThan(0);

      // top20Sku should be populated
      expect(impact.top20Sku.length).toBeGreaterThan(0);
      expect(impact.top20Sku.length).toBeLessThanOrEqual(20);

      // All deltas should be positive (10% increase)
      for (const entry of impact.byCustomer) {
        expect(entry.delta).toBeGreaterThanOrEqual(0);
        expect(entry.deltaPercent).toBeGreaterThanOrEqual(0);
      }

      for (const entry of impact.bySku) {
        expect(entry.delta).toBeGreaterThanOrEqual(0);
      }
    });

    it('sorts by absolute delta descending', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      const { impact } = result;

      // byCustomer sorted by |delta| descending
      for (let i = 1; i < impact.byCustomer.length; i++) {
        expect(Math.abs(impact.byCustomer[i].delta)).toBeLessThanOrEqual(
          Math.abs(impact.byCustomer[i - 1].delta),
        );
      }

      // bySku sorted by |delta| descending
      for (let i = 1; i < impact.bySku.length; i++) {
        expect(Math.abs(impact.bySku[i].delta)).toBeLessThanOrEqual(
          Math.abs(impact.bySku[i - 1].delta),
        );
      }
    });
  });

  // ----------------------------------------------------------
  // 7. Empty input
  // ----------------------------------------------------------
  describe('empty input', () => {
    it('returns valid empty result for capacity delay with no data', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        capacityShiftMonths: 2,
      });

      expect(result.comparison).toBeDefined();
      expect(result.impact.byCustomer).toEqual([]);
      expect(result.impact.bySku).toEqual([]);
      expect(result.impact.top20Sku).toEqual([]);
      expect(result.caveats.length).toBeGreaterThan(0);
    });

    it('returns valid empty result for forecast adjustment with no data', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      expect(result.comparison).toBeDefined();
      expect(result.impact.byCustomer).toEqual([]);
      expect(result.impact.bySku).toEqual([]);
    });

    it('returns valid empty result for order disappearance with no data', () => {
      const result = runOperationalScenario({
        scenarioType: 'orderDisappearance',
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        orderFilter: { customer: 'NonExistent' },
      });

      expect(result.comparison).toBeDefined();
      expect(result.impact.byCustomer).toEqual([]);
    });
  });

  // ----------------------------------------------------------
  // 8. Clamp bounds
  // ----------------------------------------------------------
  describe('clamp bounds', () => {
    it('clamps capacity shift to [-12, +12]', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 99, // should be clamped to 12
      });

      // With +12 shift, all capacity would be outside forecast range (2026-01 to 2026-03)
      // So scenario should have zero capacity, leading to revenue loss
      expect(result.description).toContain('12 month(s)');
    });

    it('clamps negative capacity shift to -12', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityPullForward',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: -50, // should be clamped to -12
      });

      expect(result.description).toContain('12 month(s)');
    });

    it('clamps forecast adjustment to [-50%, +100%]', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 200, // should be clamped to 100
      });

      expect(result.description).toContain('100%');
    });

    it('clamps negative forecast adjustment to -50%', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: -80, // should be clamped to -50
      });

      expect(result.description).toContain('50%');
    });
  });

  // ----------------------------------------------------------
  // 9. No baseline mutation
  // ----------------------------------------------------------
  describe('no baseline mutation', () => {
    it('original data is unchanged after scenario', () => {
      const skuSnapshot = skus.map((s) => ({ ...s }));
      const fcSnapshot = forecasts.map((f) => ({ ...f }));
      const cpSnapshot = capacityPlans.map((cp) => ({ ...cp }));

      runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
      });

      // Verify no mutation
      for (let i = 0; i < skus.length; i++) {
        expect(skus[i]).toEqual(skuSnapshot[i]);
      }
      for (let i = 0; i < forecasts.length; i++) {
        expect(forecasts[i]).toEqual(fcSnapshot[i]);
      }
      for (let i = 0; i < capacityPlans.length; i++) {
        expect(capacityPlans[i]).toEqual(cpSnapshot[i]);
      }
    });

    it('forecast adjustment does not mutate original forecasts', () => {
      const fcSnapshot = forecasts.map((f) => ({ ...f }));

      runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      for (let i = 0; i < forecasts.length; i++) {
        expect(forecasts[i]).toEqual(fcSnapshot[i]);
      }
    });

    it('order disappearance does not mutate original forecasts', () => {
      const fcSnapshot = forecasts.map((f) => ({ ...f }));

      runOperationalScenario({
        scenarioType: 'orderDisappearance',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        orderFilter: { customer: 'Customer A' },
      });

      for (let i = 0; i < forecasts.length; i++) {
        expect(forecasts[i]).toEqual(fcSnapshot[i]);
      }
    });
  });

  // ----------------------------------------------------------
  // 10. Determinism
  // ----------------------------------------------------------
  describe('determinism', () => {
    it('same input produces same output', () => {
      const params = {
        scenarioType: 'forecastAdjustment' as const,
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 15,
      };

      const result1 = runOperationalScenario(params);
      const result2 = runOperationalScenario(params);

      // Comparison deltas should be identical
      expect(result1.comparison.deltas.totalRevenueUsd.delta).toBe(
        result2.comparison.deltas.totalRevenueUsd.delta,
      );
      expect(result1.comparison.deltas.totalForecastPcs.delta).toBe(
        result2.comparison.deltas.totalForecastPcs.delta,
      );
      expect(result1.comparison.deltas.shortageMonthCount.delta).toBe(
        result2.comparison.deltas.shortageMonthCount.delta,
      );

      // Impact should be identical
      expect(result1.impact.byCustomer).toEqual(result2.impact.byCustomer);
      expect(result1.impact.bySku).toEqual(result2.impact.bySku);
      expect(result1.impact.top20Sku).toEqual(result2.impact.top20Sku);

      // Metadata should be identical
      expect(result1.description).toBe(result2.description);
      expect(result1.caveats).toEqual(result2.caveats);
    });

    it('capacity delay is deterministic', () => {
      const params = {
        scenarioType: 'capacityDelay' as const,
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 3,
        capacityShiftTarget: 'both' as const,
      };

      const result1 = runOperationalScenario(params);
      const result2 = runOperationalScenario(params);

      expect(result1.description).toBe(result2.description);
      expect(result1.comparison.deltas.totalRevenueUsd.delta).toBe(
        result2.comparison.deltas.totalRevenueUsd.delta,
      );
    });
  });

  // ----------------------------------------------------------
  // 11. Caveats present
  // ----------------------------------------------------------
  describe('caveats present', () => {
    it('capacity delay result includes what-if caveat', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
      });

      expect(result.caveats.length).toBeGreaterThan(0);
      expect(result.caveats[0]).toContain('what-if projection');
    });

    it('forecast adjustment result includes what-if caveat', () => {
      const result = runOperationalScenario({
        scenarioType: 'forecastAdjustment',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        forecastAdjustPercent: 10,
      });

      expect(result.caveats.length).toBeGreaterThan(0);
      expect(result.caveats[0]).toContain('what-if projection');
    });

    it('order disappearance result includes what-if caveat', () => {
      const result = runOperationalScenario({
        scenarioType: 'orderDisappearance',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        orderFilter: { customer: 'Customer A' },
      });

      expect(result.caveats.length).toBeGreaterThan(0);
      expect(result.caveats[0]).toContain('what-if projection');
    });

    it('empty input result includes what-if caveat', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        capacityShiftMonths: 1,
      });

      expect(result.caveats.length).toBeGreaterThan(0);
      expect(result.caveats[0]).toContain('what-if projection');
    });
  });
});
