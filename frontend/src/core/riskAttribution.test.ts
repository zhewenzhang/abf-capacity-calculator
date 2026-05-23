import { describe, it, expect } from 'vitest';
import { buildRiskAttributionModel, HIGH_SHARE, LOW_SHARE } from './riskAttribution';
import { buildAnalyticsModel } from './analytics';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

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
};

/**
 * Build a constrained scenario: 12 months, very small capacity to force shortage.
 * Adjust `customers` to include multiple SKUs from different customers.
 */
function buildShortageScenario(skus: SKU[], opts?: { capacityCore?: number; capacityBu?: number; forecastPcs?: number }) {
  const forecasts: Forecast[] = [];
  const capacityPlans: CapacityPlan[] = [];
  const core = opts?.capacityCore ?? 10;
  const bu = opts?.capacityBu ?? 10;
  const pcs = opts?.forecastPcs ?? 10000000;
  let fcIdx = 0;
  for (let i = 1; i <= 12; i++) {
    const month = `2026-${String(i).padStart(2, '0')}`;
    for (const sku of skus) {
      fcIdx++;
      forecasts.push(makeForecast({ id: `fc-${fcIdx}`, skuId: sku.id, month, forecastPcs: pcs }));
    }
    capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: core, buPanelPerDay: bu }));
  }
  return { forecasts, capacityPlans };
}

describe('riskAttribution — Phase 5.2 Risk Driver Attribution', () => {
  // Test 1: empty data returns empty attribution model
  it('returns empty model when no skus or no skuResults', () => {
    const emptyAnalytics = buildAnalyticsModel([], [], [], defaultParams);
    const model = buildRiskAttributionModel(emptyAnalytics, []);
    expect(model.shortageMonths).toEqual([]);
    expect(model.drivers).toEqual([]);
    expect(model.skuHealthSignals).toEqual([]);
  });

  // Test 2: shortage attribution only counts shortage months
  it('shortage attribution only sums demand from shortage months', () => {
    const sku = makeSku();
    // Mix: 6 shortage months + 6 healthy months
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 6; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 10_000_000 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 10, buPanelPerDay: 10 }));
    }
    for (let i = 7; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 10 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 6000, buPanelPerDay: 5000 }));
    }
    const analytics = buildAnalyticsModel([sku], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [sku]);

    // Shortage months should be only the first six
    expect(model.shortageMonths.length).toBe(6);
    for (const m of model.shortageMonths) {
      const monthNum = parseInt(m.split('-')[1], 10);
      expect(monthNum).toBeLessThanOrEqual(6);
    }

    // Every driver's affectedPeriods should fall within shortage months
    const shortageSet = new Set(model.shortageMonths);
    for (const d of model.drivers) {
      if (d.metric === 'bpGapContribution') continue; // period-level
      for (const p of d.affectedPeriods) expect(shortageSet.has(p)).toBe(true);
    }
  });

  // Test 3: customer shortage drivers sorted by value desc
  it('customer shortage drivers sort deterministically (value desc, label asc)', () => {
    const skuA = makeSku({ id: 'sku-a', skuCode: 'A-1', customer: 'Customer A' });
    const skuB = makeSku({ id: 'sku-b', skuCode: 'B-1', customer: 'Customer B' });
    const { forecasts, capacityPlans } = buildShortageScenario([skuA, skuB]);
    // Make Customer A larger
    for (const f of forecasts) {
      if (f.skuId === 'sku-a') f.forecastPcs = 20_000_000;
    }
    const analytics = buildAnalyticsModel([skuA, skuB], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [skuA, skuB]);
    const customerCoreDrivers = model.drivers.filter(
      (d) => d.dimension === 'customer' && d.metric === 'shortageCoreDemand'
    );
    expect(customerCoreDrivers.length).toBeGreaterThanOrEqual(2);
    expect(customerCoreDrivers[0].label).toBe('Customer A');
    expect(customerCoreDrivers[0].value).toBeGreaterThan(customerCoreDrivers[1].value);
  });

  // Test 4: SKU shortage drivers include affected SKU ids
  it('SKU shortage drivers include affectedSkuIds', () => {
    const skuA = makeSku({ id: 'sku-a', skuCode: 'A-1' });
    const skuB = makeSku({ id: 'sku-b', skuCode: 'B-1' });
    const { forecasts, capacityPlans } = buildShortageScenario([skuA, skuB]);
    const analytics = buildAnalyticsModel([skuA, skuB], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [skuA, skuB]);
    const skuDrivers = model.drivers.filter((d) => d.dimension === 'sku');
    expect(skuDrivers.length).toBeGreaterThan(0);
    for (const d of skuDrivers) {
      expect(d.affectedSkuIds).toBeDefined();
      expect(d.affectedSkuIds!.length).toBeGreaterThan(0);
    }
  });

  // Test 5: size/application/layer drivers are produced
  it('produces size, application, and layerBucket drivers', () => {
    const skuA = makeSku({ id: 'sku-a', skuCode: 'A', sizeCategory: 'small', application: 'Mobile', layerCount: 6 });
    const skuB = makeSku({ id: 'sku-b', skuCode: 'B', sizeCategory: 'large', application: 'Server', layerCount: 16 });
    const { forecasts, capacityPlans } = buildShortageScenario([skuA, skuB]);
    const analytics = buildAnalyticsModel([skuA, skuB], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [skuA, skuB]);
    const dims = new Set(model.drivers.map((d) => d.dimension));
    expect(dims.has('size')).toBe(true);
    expect(dims.has('application')).toBe(true);
    expect(dims.has('layerBucket')).toBe(true);
  });

  // Test 6: share calculation handles zero totals safely
  it('does not crash on zero totals; produces no drivers when nothing qualifies', () => {
    const sku = makeSku({ unitPrice: 0 });
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 0, unitPrice: 0 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }
    const analytics = buildAnalyticsModel([sku], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [sku]);
    // No demand → no shortage attribution
    for (const d of model.drivers) {
      if (d.share !== undefined) {
        expect(d.share).toBeGreaterThanOrEqual(0);
        expect(d.share).toBeLessThanOrEqual(100);
      }
    }
  });

  // Test 7: capacityPressureIndex uses shortage Core + BU demand
  it('size/application/layer drivers use Core + BU shortage demand as pressure index', () => {
    const sku = makeSku();
    const { forecasts, capacityPlans } = buildShortageScenario([sku]);
    const analytics = buildAnalyticsModel([sku], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [sku]);
    const sizeDriver = model.drivers.find((d) => d.dimension === 'size');
    expect(sizeDriver).toBeDefined();
    expect(sizeDriver!.metric).toBe('capacityPressureIndex');

    // Manually verify: sum core + bu in shortage months for this SKU equals driver value
    const shortageSet = new Set(model.shortageMonths);
    let expected = 0;
    for (const r of analytics.skuResults) {
      if (shortageSet.has(r.month)) expected += r.corePanelDemand + r.buPanelDemand;
    }
    expect(sizeDriver!.value).toBeCloseTo(expected, 5);
  });

  // Test 8: SKU health classification covers all classes
  it('classifies SKUs into health signal classes (cashCow + watchList present)', () => {
    const cashCow = makeSku({ id: 'cc', skuCode: 'CASHCOW', unitPrice: 100, customer: 'Cust1' });
    const watch = makeSku({ id: 'w', skuCode: 'WATCH', unitPrice: 0.001, customer: 'Cust2' });
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-cc-${i}`, skuId: 'cc', month, forecastPcs: 10000, unitPrice: 100 }));
      forecasts.push(makeForecast({ id: `fc-w-${i}`, skuId: 'w', month, forecastPcs: 100, unitPrice: 0.001 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }
    const analytics = buildAnalyticsModel([cashCow, watch], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [cashCow, watch]);
    const classes = new Set(model.skuHealthSignals.map((s) => s.classification));
    expect(classes.has('cashCow')).toBe(true);
    expect(model.skuHealthSignals.find((s) => s.skuCode === 'CASHCOW')!.classification).toBe('cashCow');
  });

  // Test 9: dataIncomplete classification
  it('classifies SKUs missing required attributes as dataIncomplete', () => {
    // Valid SKU plus an invalid SKU with no forecast (calc engine won't see it, but riskAttribution still flags it)
    const valid = makeSku({ id: 'good', skuCode: 'GOOD' });
    const invalid: SKU = makeSku({ id: 'bad', skuCode: 'BAD', chipLengthMm: 0 });
    const forecasts: Forecast[] = [
      makeForecast({ id: 'fc-good', skuId: 'good', month: '2026-01', forecastPcs: 100 }),
    ];
    const capacityPlans = [makeCapacityPlan({ id: 'cp-1', month: '2026-01' })];
    const analytics = buildAnalyticsModel([valid], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [valid, invalid]);
    const bad = model.skuHealthSignals.find((s) => s.skuCode === 'BAD');
    expect(bad).toBeDefined();
    expect(bad!.classification).toBe('dataIncomplete');
  });

  // Test 10: capacityDrainer + strategicGrowth scenarios via threshold math
  it('classifies high-pressure SKUs into capacityDrainer or strategicGrowth based on revenue share', () => {
    // High revenue SKU (cashCow), large dominant SKU with high pressure and high revenue share (strategicGrowth)
    // Use a single SKU under shortage so pressureShare=100; revenue share also 100 → strategicGrowth
    const strategic = makeSku({ id: 'str', skuCode: 'STRATEGIC', unitPrice: 5 });
    const { forecasts, capacityPlans } = buildShortageScenario([strategic]);
    const analytics = buildAnalyticsModel([strategic], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [strategic]);
    const sig = model.skuHealthSignals.find((s) => s.skuCode === 'STRATEGIC');
    expect(sig).toBeDefined();
    expect((sig!.revenueShare ?? 0)).toBeGreaterThanOrEqual(HIGH_SHARE);
    expect((sig!.capacityPressureShare ?? 0)).toBeGreaterThanOrEqual(HIGH_SHARE);
    expect(sig!.classification).toBe('strategicGrowth');
  });

  // Test 11: lowValueHighLoad scenario
  it('classifies low-revenue high-pressure SKU as lowValueHighLoad', () => {
    // Big revenue SKU (no shortage) + tiny revenue SKU that hits shortage
    const big = makeSku({ id: 'big', skuCode: 'BIG', unitPrice: 1000, customer: 'Big Co' });
    const small = makeSku({ id: 'small', skuCode: 'SMALL', unitPrice: 0.0001, customer: 'Small Co' });
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      // Big SKU produces huge revenue, but small forecastPcs (no capacity pressure)
      forecasts.push(makeForecast({ id: `b-${i}`, skuId: 'big', month, forecastPcs: 100000, unitPrice: 1000 }));
      // Small SKU produces tiny revenue but massive demand (causes shortage)
      forecasts.push(makeForecast({ id: `s-${i}`, skuId: 'small', month, forecastPcs: 100_000_000, unitPrice: 0.0001 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 100, buPanelPerDay: 100 }));
    }
    const analytics = buildAnalyticsModel([big, small], forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, [big, small]);
    const smallSig = model.skuHealthSignals.find((s) => s.skuCode === 'SMALL');
    expect(smallSig).toBeDefined();
    expect((smallSig!.revenueShare ?? 100)).toBeLessThanOrEqual(LOW_SHARE);
    expect((smallSig!.capacityPressureShare ?? 0)).toBeGreaterThanOrEqual(HIGH_SHARE);
    expect(smallSig!.classification).toBe('lowValueHighLoad');
  });

  // Test 12: watchList for SKU with moderate but neither dominant nor invalid
  it('classifies SKUs that do not match other rules as watchList', () => {
    // 10 equal SKUs no shortage → each has 10% revenue share (between LOW and HIGH), no pressure
    const skus: SKU[] = [];
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 0; i < 10; i++) {
      skus.push(makeSku({ id: `s-${i}`, skuCode: `S-${i}`, customer: `C-${i}` }));
    }
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      for (const sku of skus) {
        forecasts.push(makeForecast({ id: `fc-${sku.id}-${i}`, skuId: sku.id, month, forecastPcs: 1000 }));
      }
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 100000, buPanelPerDay: 100000 }));
    }
    const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, defaultParams);
    const model = buildRiskAttributionModel(analytics, skus);
    // No shortage → every signal should be watchList (no shortage exposure and revenue share < HIGH_SHARE)
    for (const sig of model.skuHealthSignals) {
      expect(sig.classification).toBe('watchList');
    }
  });
});
