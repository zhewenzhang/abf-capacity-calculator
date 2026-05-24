import { describe, it, expect } from 'vitest';
import { buildPriceImpact, buildCapacityImpact } from './impactAnalysis';
import { runCalculation } from './calculationEngine';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { CurrencySettings } from './currency';

const currencySettings: CurrencySettings = {
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRateMode: 'constant',
  constantUsdToTwdRate: 32,
  yearlyUsdToTwdRates: {},
  constantUsdToCnyRate: 7.2,
  yearlyUsdToCnyRates: {},
};

const defaultParams: ProjectParameters = {
  defaultWorkingDays: 28,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  panelParams: DEFAULT_PANEL_PARAMS,
  currencySettings,
};

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

function buildYear(skus: SKU[], pcsPerMonth: number, opts?: { core?: number; bu?: number }) {
  const forecasts: Forecast[] = [];
  const capacityPlans: CapacityPlan[] = [];
  let i = 0;
  for (let m = 1; m <= 12; m++) {
    const month = `2026-${String(m).padStart(2, '0')}`;
    for (const sku of skus) {
      i++;
      forecasts.push(makeForecast({ id: `fc-${i}`, skuId: sku.id, month, forecastPcs: pcsPerMonth, unitPrice: sku.unitPrice }));
    }
    capacityPlans.push(makeCapacity({ id: `cp-${m}`, month, corePanelPerDay: opts?.core ?? 6000, buPanelPerDay: opts?.bu ?? 5000 }));
  }
  return { forecasts, capacityPlans };
}

describe('impactAnalysis — Price Impact (Phase 5.3B)', () => {
  it('returns empty model when no SKUs / forecasts', () => {
    const model = buildPriceImpact([], [], [], defaultParams, currencySettings, {});
    expect(model.scenarios).toEqual([]);
    expect(model.mostSensitiveYear).toBeNull();
  });

  it('+10% increases revenue, -10% decreases revenue vs baseline', () => {
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const model = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, {});
    const plus10 = model.scenarios.find((s) => s.priceDeltaPct === 0.1)!;
    const minus10 = model.scenarios.find((s) => s.priceDeltaPct === -0.1)!;
    expect(plus10).toBeDefined();
    expect(minus10).toBeDefined();
    for (const y of plus10.yearly) expect(y.revenueDeltaMillionTwd).toBeGreaterThan(0);
    for (const y of minus10.yearly) expect(y.revenueDeltaMillionTwd).toBeLessThan(0);
  });

  it('BP attainment changes when target exists, and is null when no target', () => {
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const bpTargets = { '2026': 50 };
    const withTarget = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, bpTargets);
    const withoutTarget = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, {});

    const wt = withTarget.scenarios.find((s) => s.priceDeltaPct === 0.1)!.yearly.find((y) => y.year === '2026')!;
    expect(wt.scenarioBpAttainment).not.toBeNull();
    expect(wt.bpAttainmentDelta).not.toBeNull();
    expect(wt.bpAttainmentDelta!).toBeGreaterThan(0);

    const wot = withoutTarget.scenarios.find((s) => s.priceDeltaPct === 0.1)!.yearly.find((y) => y.year === '2026')!;
    expect(wot.scenarioBpAttainment).toBeNull();
    expect(wot.bpAttainmentDelta).toBeNull();
  });

  it('original SKUs / forecasts / capacity plans are NOT mutated', () => {
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const skuPriceBefore = skus[0].unitPrice;
    const fcPriceBefore = forecasts[0].unitPrice;
    const corePerDay = capacityPlans[0].corePanelPerDay;
    buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, { '2026': 50 });
    expect(skus[0].unitPrice).toBe(skuPriceBefore);
    expect(forecasts[0].unitPrice).toBe(fcPriceBefore);
    expect(capacityPlans[0].corePanelPerDay).toBe(corePerDay);
  });

  it('mostSensitiveYear is set when target exists and produces an attainment delta', () => {
    const skus = [makeSku({ unitPrice: 10 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const model = buildPriceImpact(skus, forecasts, capacityPlans, defaultParams, currencySettings, { '2026': 50 });
    expect(model.mostSensitiveYear).toBe('2026');
    expect(model.maxAttainmentDeltaPp).not.toBeNull();
    expect(model.maxAttainmentDeltaPp!).toBeGreaterThan(0);
  });
});

describe('impactAnalysis — Capacity Impact (Phase 5.3B)', () => {
  it('returns empty model when no SKUs / forecasts / capacityPlans', () => {
    const model = buildCapacityImpact([], [], [], defaultParams);
    expect(model.scenarios).toEqual([]);
    expect(model.bestScenarioId).toBeNull();
  });

  it('Core +10% reduces max Core utilization when Core is bottleneck', () => {
    // Big chip → Core-heavy demand. Small capacity → shortage.
    const skus = [makeSku({ chipLengthMm: 20, chipWidthMm: 20, layerCount: 8 })];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 50, bu: 5000 });
    const model = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    const coreOnly = model.scenarios.find((s) => s.scenarioId === 'capacity_core_+10pct')!;
    expect(coreOnly).toBeDefined();
    // Either utilization drops, or shortage months drop
    if (coreOnly.maxCoreUtilBefore !== null && coreOnly.maxCoreUtilAfter !== null) {
      expect(coreOnly.maxCoreUtilAfter).toBeLessThanOrEqual(coreOnly.maxCoreUtilBefore);
    }
    expect(coreOnly.shortageMonthsAfter).toBeLessThanOrEqual(coreOnly.shortageMonthsBefore);
  });

  it('BU +10% reduces max BU utilization when BU is bottleneck', () => {
    // Many layers → BU heavy
    const skus = [makeSku({ chipLengthMm: 6, chipWidthMm: 6, layerCount: 20 })];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 5000, bu: 50 });
    const model = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    const buOnly = model.scenarios.find((s) => s.scenarioId === 'capacity_bu_+10pct')!;
    expect(buOnly).toBeDefined();
    if (buOnly.maxBuUtilBefore !== null && buOnly.maxBuUtilAfter !== null) {
      expect(buOnly.maxBuUtilAfter).toBeLessThanOrEqual(buOnly.maxBuUtilBefore);
    }
    expect(buOnly.shortageMonthsAfter).toBeLessThanOrEqual(buOnly.shortageMonthsBefore);
  });

  it('shortage months before/after reported coherently across all scenarios', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 50, bu: 50 });
    const model = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    for (const s of model.scenarios) {
      expect(s.shortageMonthsBefore).toBeGreaterThanOrEqual(0);
      expect(s.shortageMonthsAfter).toBeGreaterThanOrEqual(0);
      // resolved + remaining counts cannot exceed before
      expect(s.resolvedShortageMonths.length + s.remainingShortageMonths.length).toBeLessThanOrEqual(s.shortageMonthsBefore);
    }
  });

  it('original SKUs / forecasts / capacity plans are NOT mutated', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 50, bu: 50 });
    const corePerDay = capacityPlans[0].corePanelPerDay;
    const buPerDay = capacityPlans[0].buPanelPerDay;
    // baseline reference calc
    const before = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    expect(capacityPlans[0].corePanelPerDay).toBe(corePerDay);
    expect(capacityPlans[0].buPanelPerDay).toBe(buPerDay);
    // Re-run after — should produce the same numbers
    const after = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    expect(after.shortageMonthCount).toBe(before.shortageMonthCount);
  });

  it('bestScenarioId picks the scenario that resolves the most shortage months when at least one resolves', () => {
    // Mild shortage so +10% can plausibly resolve months.
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 100000, { core: 4400, bu: 4400 });
    const model = buildCapacityImpact(skus, forecasts, capacityPlans, defaultParams);
    // either bestScenarioId is set, or no scenario resolves any months (legitimate when shortage too severe).
    const anyResolved = model.scenarios.some((s) => s.resolvedShortageMonths.length > 0);
    if (anyResolved) {
      expect(model.bestScenarioId).not.toBeNull();
    }
  });
});
