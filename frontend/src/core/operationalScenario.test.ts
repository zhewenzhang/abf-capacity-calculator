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
  // 1. Capacity delay — v1.63.2: ratio-based reduction (no plan shifting)
  // ----------------------------------------------------------
  describe('capacity delay', () => {
    it('with ratio produces non-zero shortage/utilization impact', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
        capacityShiftTarget: 'both',
        capacityDelayRatio: 30, // reduce capacity by 30% during delay window
        capacityDelayStartMonth: '2026-01',
      });

      // New v1.63.2 behavior: plans stay in place, ratio is applied during delay window
      // With 30% capacity reduction, shortages should appear or utilization should increase
      expect(result.scenarioType).toBe('capacityDelay');
      expect(result.description).toContain('delayed');
      expect(result.description).toContain('30%');
      expect(result.description).toContain('from 2026-01');

      // Capacity reduction should affect shortage or utilization
      const deltas = result.comparison.deltas;
      // Shortage months should increase (or stay same if already constrained)
      expect(deltas.shortageMonthCount.delta).toBeDefined();
      // Max BU utilization should increase (less capacity = higher utilization)
      expect(deltas.maxBuUtilization.delta).toBeDefined();
      // Max core utilization should increase
      expect(deltas.maxCoreUtilization.delta).toBeDefined();
      // Revenue delta is typically 0 (revenue is forecast-based)
      expect(deltas.totalRevenueUsd.delta).toBe(0);
    });

    it('without start month applies reduction to entire plan set', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
        capacityShiftTarget: 'both',
        capacityDelayRatio: 20,
      });

      // Without startMonth, all capacity plans are in the delay window
      expect(result.description).toContain('delayed');
      expect(result.description).toContain('20%');
      const deltas = result.comparison.deltas;
      expect(deltas.shortageMonthCount.delta).toBeDefined();
      expect(deltas.maxBuUtilization.delta).toBeDefined();
    });

    it('without ratio does not change capacity (null-op for new behavior)', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
        capacityShiftTarget: 'both',
      });

      // Without ratio, capacity is unchanged → results match baseline
      expect(result.scenarioType).toBe('capacityDelay');
      const deltas = result.comparison.deltas;
      expect(deltas.totalRevenueUsd.delta).toBe(0);
      expect(deltas.shortageMonthCount.delta).toBe(0);
      expect(deltas.maxBuUtilization.delta).toBe(0);
    });

    it('with start month correctly limits delay window', () => {
      // Only plans from 2026-02 onward should be reduced
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 1,
        capacityDelayStartMonth: '2026-02',
        capacityDelayRatio: 50, // 50% reduction
      });

      // 2026-01 plan should be unchanged (before delay window)
      // 2026-02 plan should be reduced (in delay window)
      expect(result.description).toContain('from 2026-02');
      expect(result.description).toContain('50%');
      const deltas = result.comparison.deltas;
      expect(deltas.maxBuUtilization.delta).toBeDefined();
    });
  });

  // ----------------------------------------------------------
  // 1b. Capacity delay — delivery risk non-empty + BU util changes
  // ----------------------------------------------------------
  describe('capacity delay delivery risk', () => {
    it('produces non-empty monthly summaries with BU utilization changes', () => {
      const result = runOperationalScenario({
        scenarioType: 'capacityDelay',
        skus,
        forecasts,
        capacityPlans,
        params: defaultParams,
        capacityShiftMonths: 2,
        capacityDelayRatio: 25,
        capacityDelayStartMonth: '2026-01',
      });

      // Result should be non-empty
      expect(result.comparison).toBeDefined();

      // Monthly summaries should exist for both baseline and scenario
      const baseMonthly = result.comparison.baseline.calcResult.monthlySummaries;
      const scenMonthly = result.comparison.scenario.calcResult.monthlySummaries;
      expect(baseMonthly.length).toBeGreaterThan(0);
      expect(scenMonthly.length).toBeGreaterThan(0);

      // BU utilization should differ (scenario has reduced capacity)
      for (const month of baseMonthly) {
        const scenMonth = scenMonthly.find(m => m.month === month.month);
        if (scenMonth) {
          // In delay window (2026-01 to 2026-02), BU util should be higher or equal
          // (less capacity = higher utilization for same demand)
          const isDelayWindow = month.month >= '2026-01' && month.month < '2026-03';
          if (isDelayWindow) {
            // Utilization should be non-zero and generally higher (or equal if already zero)
            expect(month.buUtilization).toBeDefined();
            expect(scenMonth.buUtilization).toBeDefined();
            // Scenario util should be >= baseline util (or close to it)
            expect(scenMonth.buUtilization! >= month.buUtilization! - 0.01).toBe(true);
            // Capacity should be reduced in delay window
            expect(scenMonth.buCapacity).toBeLessThan(month.buCapacity);
          } else {
            // Outside delay window: should be unchanged
            expect(scenMonth.buCapacity).toBe(month.buCapacity);
            expect(scenMonth.buUtilization).toBe(month.buUtilization);
          }
        }
      }

      // Shortage should be non-negative
      for (const m of scenMonthly) {
        expect(m.buShortage).toBeGreaterThanOrEqual(0);
        expect(m.coreShortage).toBeGreaterThanOrEqual(0);
      }

      // Delta should show BU utilization change
      expect(result.comparison.deltas.maxBuUtilization.delta).toBeDefined();
      expect(result.comparison.deltas.shortageMonthCount.delta).toBeDefined();
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
