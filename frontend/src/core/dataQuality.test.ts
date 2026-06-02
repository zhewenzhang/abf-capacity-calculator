import { describe, it, expect } from 'vitest';
import { buildDataQualitySummary } from './dataQuality';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

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

describe('dataQuality', () => {
  it('returns confidence blocked when no SKUs and forecasts are present', () => {
    const summary = buildDataQualitySummary({
      skus: [],
      forecasts: [],
      capacityPlans: [],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('blocked');
    expect(summary.status).toBe('ok');
    expect(summary.issues.length).toBe(1);
    expect(summary.issues[0].id).toBe('no-data-blocked');
  });

  it('returns high confidence for correct input data', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts,
      capacityPlans,
      params: defaultParams,
    });
    expect(summary.confidence).toBe('high');
    expect(summary.status).toBe('ok');
  });

  it('returns low confidence when SKU missing production attributes', () => {
    const sku = makeSku({ chipLengthMm: 0, layerCount: 0 });
    const fc = makeForecast();
    const cp = makeCapacityPlan();
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('low');
    expect(summary.status).toBe('error');
    expect(summary.issues.some(i => i.id.startsWith('sku-missing-attr'))).toBe(true);
  });

  it('returns medium confidence when SKU unitPrice is zero', () => {
    const sku = makeSku({ unitPrice: 0 });
    const fc = makeForecast({ unitPrice: 0 });
    const cp = makeCapacityPlan();
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('medium');
    expect(summary.status).toBe('warning');
    expect(summary.issues.some(i => i.id.startsWith('sku-zero-price'))).toBe(true);
  });

  it('returns low confidence when there are orphan forecasts', () => {
    const sku = makeSku();
    const fc = makeForecast({ skuId: 'non-existent-sku' });
    const cp = makeCapacityPlan();
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('low');
    expect(summary.status).toBe('error');
    expect(summary.issues.some(i => i.id.startsWith('forecast-orphan-sku'))).toBe(true);
  });

  it('detects multiple orphan forecasts for the same missing SKU', () => {
    const sku = makeSku();
    const orphanSkuId = 'afc9a5ff-cfe8-41f6-adb0-16bdf361302e';
    const orphanFcs = [
      makeForecast({ id: 'fc-o1', skuId: orphanSkuId, month: '2026-01' }),
      makeForecast({ id: 'fc-o2', skuId: orphanSkuId, month: '2026-02' }),
      makeForecast({ id: 'fc-o3', skuId: orphanSkuId, month: '2026-03' }),
    ];
    const cp = makeCapacityPlan();
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: orphanFcs,
      capacityPlans: [cp],
      params: defaultParams,
    });
    const orphanIssues = summary.issues.filter(i => i.id.startsWith('forecast-orphan-sku'));
    expect(orphanIssues.length).toBe(3);
    expect(summary.status).toBe('error');
    // Each orphan should have decisionImpact 'high'
    for (const issue of orphanIssues) {
      expect(issue.decisionImpact).toBe('high');
    }
  });

  it('returns low confidence when forecast month has no capacity plan', () => {
    const sku = makeSku();
    const fc = makeForecast({ month: '2026-02' });
    const cp = makeCapacityPlan({ month: '2026-01' });
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('low');
    expect(summary.status).toBe('error');
    expect(summary.issues.some(i => i.id === 'forecast-missing-capacity')).toBe(true);
  });

  it('returns low confidence when layered SKU demand exists but BU capacity is 0', () => {
    const sku = makeSku({ layerCount: 8 }); // buSteps = max(8/2 - 1, 0) = 3 > 0
    const fc = makeForecast({ forecastPcs: 100 });
    const cp = makeCapacityPlan({ buPanelPerDay: 0 }); // BU capacity is 0
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: defaultParams,
    });
    expect(summary.confidence).toBe('low');
    expect(summary.status).toBe('error');
    expect(summary.issues.some(i => i.id === 'bu-demand-zero-capacity')).toBe(true);
  });

  it('returns low confidence if TWD exchange rate is missing but needed', () => {
    const sku = makeSku({ unitPriceCurrency: 'TWD' });
    const fc = makeForecast();
    const cp = makeCapacityPlan();
    const paramsMissingTwd: ProjectParameters = {
      ...defaultParams,
      currencySettings: {
        baseCurrency: 'USD',
        displayCurrency: 'USD',
        exchangeRateMode: 'constant',
        constantUsdToTwdRate: 0, // missing/invalid
        yearlyUsdToTwdRates: {},
        constantUsdToCnyRate: 7.2,
        yearlyUsdToCnyRates: {},
      },
    };
    const summary = buildDataQualitySummary({
      skus: [sku],
      forecasts: [fc],
      capacityPlans: [cp],
      params: paramsMissingTwd,
    });
    expect(summary.confidence).toBe('low');
    expect(summary.status).toBe('error');
    expect(summary.issues.some(i => i.id === 'missing-constant-twd-rate')).toBe(true);
  });
});
