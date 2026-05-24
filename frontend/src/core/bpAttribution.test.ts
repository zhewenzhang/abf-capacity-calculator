import { describe, it, expect } from 'vitest';
import { buildBpAttributionModel } from './bpAttribution';
import { buildBpAnalysis } from './bpTargets';
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

function buildYear(skus: SKU[], pcsPerMonth: number) {
  const forecasts: Forecast[] = [];
  const capacityPlans: CapacityPlan[] = [];
  let i = 0;
  for (let m = 1; m <= 12; m++) {
    const month = `2026-${String(m).padStart(2, '0')}`;
    for (const sku of skus) {
      i++;
      forecasts.push(makeForecast({ id: `fc-${i}`, skuId: sku.id, month, forecastPcs: pcsPerMonth, unitPrice: sku.unitPrice }));
    }
    capacityPlans.push(makeCapacity({ id: `cp-${m}`, month }));
  }
  return { forecasts, capacityPlans };
}

describe('bpAttribution — Phase 5.3B BP gap attribution', () => {
  it('returns empty model when no BP analysis is provided', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const model = buildBpAttributionModel(undefined, calc.skuResults, skus, currencySettings);
    expect(model.yearly).toEqual([]);
    expect(model.worstPeriod).toBeNull();
  });

  it('produces drivers when BP miss exists', () => {
    const skus = [makeSku({ unitPrice: 5 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    // Set a BP target well above forecast revenue to force a miss.
    const bpTargets = { '2026': 100000 };
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, bpTargets, currencySettings);
    const model = buildBpAttributionModel(bp, calc.skuResults, skus, currencySettings);
    expect(model.yearly.length).toBeGreaterThan(0);
    expect(model.worstPeriod).toBe('2026');
  });

  it('does NOT produce drivers when no target is configured', () => {
    const skus = [makeSku()];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, {}, currencySettings);
    const model = buildBpAttributionModel(bp, calc.skuResults, skus, currencySettings);
    expect(model.yearly).toEqual([]);
    expect(model.worstPeriod).toBeNull();
  });

  it('proportional gap contribution sums to ≈ period gap per dimension', () => {
    const skuA = makeSku({ id: 'a', skuCode: 'A', customer: 'Cust-A', unitPrice: 5 });
    const skuB = makeSku({ id: 'b', skuCode: 'B', customer: 'Cust-B', unitPrice: 5 });
    const { forecasts, capacityPlans } = buildYear([skuA, skuB], 1000);
    const calc = runCalculation([skuA, skuB], forecasts, capacityPlans, defaultParams);
    const bpTargets = { '2026': 50000 };
    const bp = buildBpAnalysis(calc.skuResults, [skuA, skuB], calc.monthlySummaries, bpTargets, currencySettings);
    const model = buildBpAttributionModel(bp, calc.skuResults, [skuA, skuB], currencySettings);

    const yearlyRec = bp.yearly.find((r) => r.period === '2026')!;
    const expectedAbsGap = Math.abs(yearlyRec.gapMillionTwd ?? 0);
    expect(expectedAbsGap).toBeGreaterThan(0);

    // Sum customer-dimension gap contribution magnitudes for 2026 — proportional → ≈ total gap
    const customer2026 = model.yearly.filter((d) => d.dimension === 'customer' && d.period === '2026');
    expect(customer2026.length).toBeGreaterThan(0);
    const sumAbs = customer2026.reduce((s, d) => s + Math.abs(d.gapContributionMillionTwd), 0);
    // Proportional sum equals period gap exactly when all drivers in the dimension are captured.
    expect(sumAbs).toBeCloseTo(expectedAbsGap, 1);
  });

  it('larger customer ranks higher in customer dimension', () => {
    const skuBig = makeSku({ id: 'big', skuCode: 'BIG', customer: 'Big Co', unitPrice: 50 });
    const skuSmall = makeSku({ id: 'small', skuCode: 'SMALL', customer: 'Small Co', unitPrice: 1 });
    const { forecasts, capacityPlans } = buildYear([skuBig, skuSmall], 1000);
    const calc = runCalculation([skuBig, skuSmall], forecasts, capacityPlans, defaultParams);
    const bpTargets = { '2026': 100000 };
    const bp = buildBpAnalysis(calc.skuResults, [skuBig, skuSmall], calc.monthlySummaries, bpTargets, currencySettings);
    const model = buildBpAttributionModel(bp, calc.skuResults, [skuBig, skuSmall], currencySettings);
    const customer2026 = model.yearly.filter((d) => d.dimension === 'customer' && d.period === '2026');
    // Big Co should appear before Small Co (sorted by abs gap contribution desc)
    const idxBig = customer2026.findIndex((d) => d.label.includes('Big Co'));
    const idxSmall = customer2026.findIndex((d) => d.label.includes('Small Co'));
    expect(idxBig).toBeGreaterThanOrEqual(0);
    expect(idxSmall).toBeGreaterThanOrEqual(0);
    expect(idxBig).toBeLessThan(idxSmall);
  });

  it('uses TWD conversion path so CNY-based exchange settings do not break attribution', () => {
    const skus = [makeSku({ unitPrice: 5 })];
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const altCurrency: CurrencySettings = {
      ...currencySettings,
      constantUsdToTwdRate: 30, // different rate but still USD→TWD
    };
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, { '2026': 100000 }, altCurrency);
    const model = buildBpAttributionModel(bp, calc.skuResults, skus, altCurrency);
    expect(model.yearly.length).toBeGreaterThan(0);
    // every driver carries a TWD-million revenue figure (positive)
    for (const d of model.yearly) {
      expect(d.forecastRevenueMillionTwd).toBeGreaterThan(0);
    }
  });

  it('topDrivers is limited to TOP_N_OVERALL (5)', () => {
    // 10 customers, each a distinct SKU
    const skus: SKU[] = [];
    for (let i = 0; i < 10; i++) {
      skus.push(makeSku({ id: `s${i}`, skuCode: `S-${i}`, customer: `C-${i}`, unitPrice: 5 }));
    }
    const { forecasts, capacityPlans } = buildYear(skus, 1000);
    const calc = runCalculation(skus, forecasts, capacityPlans, defaultParams);
    const bp = buildBpAnalysis(calc.skuResults, skus, calc.monthlySummaries, { '2026': 100000 }, currencySettings);
    const model = buildBpAttributionModel(bp, calc.skuResults, skus, currencySettings);
    expect(model.topDrivers.length).toBeLessThanOrEqual(5);
  });
});
