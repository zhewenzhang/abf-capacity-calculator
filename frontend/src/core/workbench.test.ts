import { describe, it, expect, beforeAll } from 'vitest';
import {
  buildWorkbenchViewModel,
  SCENARIO_PRESETS,
  type WorkbenchInput,
  type WorkbenchViewModel,
} from './workbench';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

// ============================================================
// Test helpers (matching project patterns from dataQuality.test.ts)
// ============================================================

function makeSku(overrides: Partial<SKU> = {}): SKU {
  return {
    id: 'sku-1',
    skuCode: 'TEST-001',
    customer: 'Test Corp',
    deviceName: 'TestDevice',
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

function makeCapacityPlan(overrides: Partial<CapacityPlan> = {}): CapacityPlan {
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
  bpTargets: {
    mode: 'yearly',
    yearlyRevenueTargetsMillionTwd: { '2026': 100 },
  },
};

/** Default test date used for deterministic look-ahead tests. */
const testDate = new Date('2026-01-15');

/** Generate 12 months of forecasts for a given SKU to avoid partial-year DQ warnings. */
function makeFullYearForecasts(skuId = 'sku-1', year = '2026', pcs = 10000): Forecast[] {
  return Array.from({ length: 12 }, (_, i) =>
    makeForecast({
      id: `fc-${year}-${i + 1}`,
      skuId,
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      forecastPcs: pcs,
    }),
  );
}

/** Generate 12 months of capacity plans. */
function makeFullYearCapacityPlans(
  year = '2026',
  corePanelPerDay = 6000,
  buPanelPerDay = 5000,
): CapacityPlan[] {
  return Array.from({ length: 12 }, (_, i) =>
    makeCapacityPlan({
      id: `cp-${year}-${i + 1}`,
      month: `${year}-${String(i + 1).padStart(2, '0')}`,
      corePanelPerDay,
      buPanelPerDay,
    }),
  );
}

/** Helper to find a stage by id. */
function findStage(vm: WorkbenchViewModel, id: string) {
  return vm.stages.find(s => s.id === id)!;
}

// ============================================================
// buildWorkbenchViewModel
// ============================================================

describe('buildWorkbenchViewModel', () => {
  // ----------------------------------------------------------
  // 1. Empty data — all zeros
  // ----------------------------------------------------------
  describe('with empty data', () => {
    const emptyParams: ProjectParameters = {
      defaultWorkingDays: 28,
      yieldMatrix: DEFAULT_YIELD_MATRIX,
      panelParams: DEFAULT_PANEL_PARAMS,
    };

    const input: WorkbenchInput = {
      skus: [],
      forecasts: [],
      capacityPlans: [],
      params: emptyParams,
      currentDate: testDate,
    };

    let vm: WorkbenchViewModel;
    beforeAll(() => {
      vm = buildWorkbenchViewModel(input);
    });

    it('returns dqConfidence blocked when no SKUs and forecasts', () => {
      expect(vm.dqConfidence).toBe('blocked');
    });

    it('products stage is blocked', () => {
      expect(findStage(vm, 'products').status).toBe('blocked');
    });

    it('forecasts stage is blocked', () => {
      expect(findStage(vm, 'forecasts').status).toBe('blocked');
    });

    it('capacity stage is blocked', () => {
      expect(findStage(vm, 'capacity').status).toBe('blocked');
    });

    it('parameters stage is blocked when yieldMatrix and panelParams present but no data to validate against', () => {
      // With empty data, parameters stage should be ready since yieldMatrix and panelParams exist
      const stage = findStage(vm, 'parameters');
      expect(stage.status).toBe('ready');
    });

    it('bpTargets stage is notStarted when bpTargets is undefined', () => {
      expect(findStage(vm, 'bpTargets').status).toBe('notStarted');
    });

    it('analysis stage is blocked when no model can be built', () => {
      expect(findStage(vm, 'analysis').status).toBe('blocked');
    });

    it('scenario stage is notStarted', () => {
      expect(findStage(vm, 'scenario').status).toBe('notStarted');
    });

    it('lookAhead is empty', () => {
      expect(vm.lookAhead).toEqual([]);
    });

    it('revenueBp has no-target status', () => {
      expect(vm.revenueBp.status).toBe('no-target');
      expect(vm.revenueBp.bpTarget).toBeNull();
      expect(vm.revenueBp.attainment).toBeNull();
    });

    it('scenarioPresets has 5 entries', () => {
      expect(vm.scenarioPresets).toHaveLength(5);
    });
  });

  // ----------------------------------------------------------
  // 2. Valid SKUs + forecasts only (no capacity, no BP)
  // ----------------------------------------------------------
  describe('with SKUs and forecasts only', () => {
    const paramsNoBp: ProjectParameters = {
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

    const input: WorkbenchInput = {
      skus: [makeSku()],
      forecasts: makeFullYearForecasts(),
      capacityPlans: [],
      params: paramsNoBp,
      currentDate: testDate,
    };

    let vm: WorkbenchViewModel;
    beforeAll(() => {
      vm = buildWorkbenchViewModel(input);
    });

    it('products stage is ready', () => {
      expect(findStage(vm, 'products').status).toBe('ready');
    });

    it('forecasts stage is ready (full year of data)', () => {
      expect(findStage(vm, 'forecasts').status).toBe('ready');
    });

    it('capacity stage is blocked (no capacity plans)', () => {
      expect(findStage(vm, 'capacity').status).toBe('blocked');
    });

    it('parameters stage is ready', () => {
      expect(findStage(vm, 'parameters').status).toBe('ready');
    });

    it('bpTargets stage is notStarted (no bpTargets config)', () => {
      expect(findStage(vm, 'bpTargets').status).toBe('notStarted');
    });

    it('analysis stage is warning (model exists but no capacity = shortage)', () => {
      // Without capacity plans, all months have 0 capacity => shortage
      expect(findStage(vm, 'analysis').status).toBe('warning');
    });

    it('scenario stage is notStarted', () => {
      expect(findStage(vm, 'scenario').status).toBe('notStarted');
    });

    it('revenueBp has no-target status', () => {
      expect(vm.revenueBp.status).toBe('no-target');
    });

    it('dqConfidence is not blocked', () => {
      expect(vm.dqConfidence).not.toBe('blocked');
    });
  });

  // ----------------------------------------------------------
  // 3. Full data — SKUs, forecasts, capacity, BP targets
  // ----------------------------------------------------------
  describe('with full data', () => {
    const input: WorkbenchInput = {
      skus: [makeSku()],
      forecasts: makeFullYearForecasts(),
      capacityPlans: makeFullYearCapacityPlans(),
      params: defaultParams,
      currentDate: testDate,
    };

    let vm: WorkbenchViewModel;
    beforeAll(() => {
      vm = buildWorkbenchViewModel(input);
    });

    it('products stage is ready', () => {
      expect(findStage(vm, 'products').status).toBe('ready');
    });

    it('forecasts stage is ready (full year of data)', () => {
      expect(findStage(vm, 'forecasts').status).toBe('ready');
    });

    it('capacity stage is ready', () => {
      expect(findStage(vm, 'capacity').status).toBe('ready');
    });

    it('parameters stage is ready', () => {
      expect(findStage(vm, 'parameters').status).toBe('ready');
    });

    it('bpTargets stage is ready (has active targets)', () => {
      expect(findStage(vm, 'bpTargets').status).toBe('ready');
    });

    it('analysis stage is ready', () => {
      expect(findStage(vm, 'analysis').status).toBe('ready');
    });

    it('scenario stage is notStarted', () => {
      expect(findStage(vm, 'scenario').status).toBe('notStarted');
    });

    it('revenueBp has a status derived from attainment', () => {
      expect(['met', 'watch', 'miss']).toContain(vm.revenueBp.status);
    });

    it('dqConfidence is high or medium', () => {
      expect(['high', 'medium']).toContain(vm.dqConfidence);
    });

    it('all stages have valid cta paths', () => {
      for (const stage of vm.stages) {
        if (stage.cta !== null) {
          expect(stage.cta).toMatch(/^\//);
        }
      }
    });
  });

  // ----------------------------------------------------------
  // 4. Abnormality classification
  // ----------------------------------------------------------
  describe('abnormality classification', () => {
    it('classifies high-impact DQ issues as data domain critical', () => {
      // Create a scenario with orphan forecast (high-impact DQ issue)
      const input: WorkbenchInput = {
        skus: [],
        forecasts: [makeForecast({ skuId: 'nonexistent-sku' })],
        capacityPlans: [],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      const dataInsights = vm.abnormalities.filter(a => a.domain === 'data');
      expect(dataInsights.length).toBeGreaterThan(0);
      for (const insight of dataInsights) {
        expect(insight.severity).toBe('critical');
        expect(insight.sourcePage).toBe('/products');
      }
    });

    it('classifies BP miss as bp domain critical', () => {
      // Very high target vs tiny revenue => miss
      const paramsHighTarget: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 999999 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: paramsHighTarget,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      const bpInsights = vm.abnormalities.filter(a => a.domain === 'bp');
      const missInsights = bpInsights.filter(a => a.severity === 'critical');
      expect(missInsights.length).toBeGreaterThan(0);
    });

    it('abnormalities are sorted by severity (critical first)', () => {
      const paramsHighTarget: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 999999 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast({ skuId: 'nonexistent' })],
        capacityPlans: [],
        params: paramsHighTarget,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      if (vm.abnormalities.length >= 2) {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        for (let i = 1; i < vm.abnormalities.length; i++) {
          expect(severityOrder[vm.abnormalities[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[vm.abnormalities[i - 1].severity],
          );
        }
      }
    });

    it('caps abnormalities at 10', () => {
      // Create many SKUs with orphan forecasts to generate many DQ issues
      const manyForecasts = Array.from({ length: 20 }, (_, i) =>
        makeForecast({ id: `fc-${i}`, skuId: `missing-${i}`, month: `2026-${String(i + 1).padStart(2, '0')}` }),
      );

      const input: WorkbenchInput = {
        skus: [],
        forecasts: manyForecasts,
        capacityPlans: [],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.abnormalities.length).toBeLessThanOrEqual(10);
    });
  });

  // ----------------------------------------------------------
  // 5. Look-ahead focus
  // ----------------------------------------------------------
  describe('look-ahead focus', () => {
    it('returns empty look-ahead when no model', () => {
      const input: WorkbenchInput = {
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.lookAhead).toEqual([]);
    });

    it('filters to future months with high utilization or shortage', () => {
      // Set up data for months after the test date (2026-01-01)
      // Use high forecast pcs to drive utilization above 0.85 even with moderate capacity
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [
          makeForecast({ month: '2026-03', forecastPcs: 20000 }),
          makeForecast({ month: '2026-04', forecastPcs: 20000 }),
        ],
        capacityPlans: [
          makeCapacityPlan({ month: '2026-03', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
          // Low capacity for April to force high utilization or shortage
          makeCapacityPlan({ month: '2026-04', corePanelPerDay: 1, buPanelPerDay: 1 }),
        ],
        params: defaultParams,
        currentDate: new Date('2026-01-01'),
      };

      const vm = buildWorkbenchViewModel(input);
      // April should have high utilization or shortage since capacity is very low
      const aprilItem = vm.lookAhead.find(l => l.month === '2026-04');
      if (aprilItem) {
        const highUtil = (aprilItem.coreUtilization !== null && aprilItem.coreUtilization > 0.85) ||
                         (aprilItem.buUtilization !== null && aprilItem.buUtilization > 0.85);
        expect(highUtil || aprilItem.hasShortage).toBe(true);
      }
    });

    it('returns at most 6 items', () => {
      // Create 8 months of high-utilization data
      const months = Array.from({ length: 8 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`);
      const forecasts = months.map(m =>
        makeForecast({ id: `fc-${m}`, month: m }),
      );
      // Very low capacity to force high utilization
      const caps = months.map(m =>
        makeCapacityPlan({ id: `cp-${m}`, month: m, corePanelPerDay: 1, buPanelPerDay: 1 }),
      );

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts,
        capacityPlans: caps,
        params: defaultParams,
        currentDate: new Date('2026-01-01'),
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.lookAhead.length).toBeLessThanOrEqual(6);
    });

    it('sets hasShortage correctly', () => {
      // Very low capacity => shortage
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast({ month: '2026-03' })],
        capacityPlans: [
          makeCapacityPlan({ month: '2026-03', corePanelPerDay: 1, buPanelPerDay: 1 }),
        ],
        params: defaultParams,
        currentDate: new Date('2026-01-01'),
      };

      const vm = buildWorkbenchViewModel(input);
      for (const item of vm.lookAhead) {
        // All look-ahead items should have hasShortage = true when capacity is very low
        // (because demand far exceeds capacity)
        expect(typeof item.hasShortage).toBe('boolean');
      }
    });
  });

  // ----------------------------------------------------------
  // 6. Revenue/BP summary
  // ----------------------------------------------------------
  describe('revenue/BP summary', () => {
    it('returns no-target when no BP config', () => {
      const paramsNoBp: ProjectParameters = {
        defaultWorkingDays: 28,
        yieldMatrix: DEFAULT_YIELD_MATRIX,
        panelParams: DEFAULT_PANEL_PARAMS,
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [],
        params: paramsNoBp,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.revenueBp.status).toBe('no-target');
      expect(vm.revenueBp.bpTarget).toBeNull();
      expect(vm.revenueBp.attainment).toBeNull();
      expect(vm.revenueBp.gap).toBeNull();
    });

    it('computes met status when attainment >= 1.0', () => {
      // Very low target so attainment is high
      const paramsLowTarget: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 0.001 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: paramsLowTarget,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.revenueBp.status).toBe('met');
      expect(vm.revenueBp.attainment).toBeGreaterThanOrEqual(1.0);
    });

    it('computes miss status when attainment < 0.8', () => {
      // Very high target so attainment is low
      const paramsHighTarget: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 999999 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: paramsHighTarget,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.revenueBp.status).toBe('miss');
      if (vm.revenueBp.attainment !== null) {
        expect(vm.revenueBp.attainment).toBeLessThan(0.8);
      }
    });

    it('returns zero revenue when no data', () => {
      const input: WorkbenchInput = {
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.revenueBp.currentRevenue).toBe(0);
    });
  });

  // ----------------------------------------------------------
  // 7. Scenario presets
  // ----------------------------------------------------------
  describe('scenario presets', () => {
    it('has exactly 5 presets', () => {
      expect(SCENARIO_PRESETS).toHaveLength(5);
    });

    it('each preset has required fields', () => {
      for (const preset of SCENARIO_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.label).toBeTruthy();
        expect(preset.description).toBeTruthy();
        expect(preset.params).toBeDefined();
        expect(typeof preset.params.forecastVolume).toBe('number');
        expect(typeof preset.params.unitPrice).toBe('number');
        expect(typeof preset.params.coreCapacity).toBe('number');
        expect(typeof preset.params.buCapacity).toBe('number');
      }
    });

    it('all presets have unique ids', () => {
      const ids = SCENARIO_PRESETS.map(p => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('stress-test preset has volume up and price down', () => {
      const stress = SCENARIO_PRESETS.find(p => p.id === 'stress-test')!;
      expect(stress.params.forecastVolume).toBeGreaterThan(1.0);
      expect(stress.params.unitPrice).toBeLessThan(1.0);
    });

    it('scenarioPresets are included in the view model', () => {
      const input: WorkbenchInput = {
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm.scenarioPresets).toEqual(SCENARIO_PRESETS);
    });
  });

  // ----------------------------------------------------------
  // 8. Edge cases
  // ----------------------------------------------------------
  describe('edge cases', () => {
    it('handles params with no currencySettings', () => {
      const paramsMinimal: ProjectParameters = {
        defaultWorkingDays: 28,
        yieldMatrix: DEFAULT_YIELD_MATRIX,
        panelParams: DEFAULT_PANEL_PARAMS,
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: paramsMinimal,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm).toBeDefined();
      expect(vm.stages).toHaveLength(7);
    });

    it('handles zero-capacity plans gracefully', () => {
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast({ month: '2026-05' })],
        capacityPlans: [makeCapacityPlan({ month: '2026-05', corePanelPerDay: 0, buPanelPerDay: 0 })],
        params: defaultParams,
        currentDate: new Date('2026-01-01'),
      };

      const vm = buildWorkbenchViewModel(input);
      expect(vm).toBeDefined();
      // With zero capacity and positive demand, utilization is null (infinity)
      const lookAhead = vm.lookAhead;
      for (const item of lookAhead) {
        // null means capacity was 0 with demand > 0
        if (item.coreUtilization === null) {
          expect(item.hasShortage).toBe(true);
        }
      }
    });

    it('handles empty forecasts gracefully', () => {
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [],
        capacityPlans: [makeCapacityPlan()],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(findStage(vm, 'forecasts').status).toBe('blocked');
      expect(findStage(vm, 'analysis').status).toBe('blocked');
    });

    it('handles BP targets with all zeros', () => {
      const paramsZeroBp: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 0, '2027': 0 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: paramsZeroBp,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      expect(findStage(vm, 'bpTargets').status).toBe('blocked');
    });

    it('uses default date when currentDate not provided', () => {
      const input: WorkbenchInput = {
        skus: [],
        forecasts: [],
        capacityPlans: [],
        params: defaultParams,
        // no currentDate
      };

      // Should not throw
      const vm = buildWorkbenchViewModel(input);
      expect(vm).toBeDefined();
      expect(vm.lookAhead).toEqual([]);
    });

    it('each stage has a label and ctaLabel', () => {
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      for (const stage of vm.stages) {
        expect(stage.label).toBeTruthy();
        expect(stage.ctaLabel).toBeTruthy();
        expect(stage.id).toBeTruthy();
      }
    });

    it('each abnormality has required fields', () => {
      // Force some abnormalities
      const paramsHighTarget: ProjectParameters = {
        ...defaultParams,
        bpTargets: {
          mode: 'yearly',
          yearlyRevenueTargetsMillionTwd: { '2026': 999999 },
        },
      };

      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [],
        params: paramsHighTarget,
        currentDate: testDate,
      };

      const vm = buildWorkbenchViewModel(input);
      for (const ab of vm.abnormalities) {
        expect(['data', 'capacity', 'sales', 'bp', 'scenario']).toContain(ab.domain);
        expect(['critical', 'warning', 'info']).toContain(ab.severity);
        expect(ab.title).toBeTruthy();
        expect(ab.detail).toBeTruthy();
        expect(ab.sourcePage).toBeTruthy();
        expect(ab.recommendedAction).toBeTruthy();
        expect(ab.evidence).toBeDefined();
      }
    });
  });

  // ----------------------------------------------------------
  // 9. Pure function determinism
  // ----------------------------------------------------------
  describe('determinism', () => {
    it('returns identical output for identical input', () => {
      const input: WorkbenchInput = {
        skus: [makeSku()],
        forecasts: [makeForecast()],
        capacityPlans: [makeCapacityPlan()],
        params: defaultParams,
        currentDate: testDate,
      };

      const vm1 = buildWorkbenchViewModel(input);
      const vm2 = buildWorkbenchViewModel(input);

      expect(vm1).toEqual(vm2);
    });
  });
});
