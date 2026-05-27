import { describe, it, expect } from 'vitest';
import {
  defaultMultipliers,
  clampMultipliers,
  applyScenarioMultipliers,
  computeScenarioComparison,
} from './scenarioEngine';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { DataQualitySummary } from './dataQuality';

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

const mockDqSummary: DataQualitySummary = {
  status: 'ok',
  confidence: 'high',
  confidenceScore: 100,
  issues: [],
};

describe('scenarioEngine', () => {
  const skus = [
    makeSku({ id: 'sku-1', skuCode: 'SKU-001', unitPrice: 5.0 }),
    makeSku({ id: 'sku-2', skuCode: 'SKU-002', unitPrice: 8.0, chipLengthMm: 15, chipWidthMm: 15 }),
  ];

  const forecasts = [
    makeForecast({ id: 'fc-1', skuId: 'sku-1', month: '2026-01', forecastPcs: 10000, unitPrice: 5.0 }),
    makeForecast({ id: 'fc-2', skuId: 'sku-1', month: '2026-02', forecastPcs: 12000, unitPrice: 5.0 }),
    makeForecast({ id: 'fc-3', skuId: 'sku-2', month: '2026-01', forecastPcs: 8000, unitPrice: 8.0 }),
  ];

  const capacityPlans = [
    makeCapacity({ id: 'cp-1', month: '2026-01', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
    makeCapacity({ id: 'cp-2', month: '2026-02', corePanelPerDay: 6000, buPanelPerDay: 5000 }),
  ];

  it('defaultMultipliers returns all 1.0', () => {
    const m = defaultMultipliers();
    expect(m.forecastVolume).toBe(1.0);
    expect(m.unitPrice).toBe(1.0);
    expect(m.coreCapacity).toBe(1.0);
    expect(m.buCapacity).toBe(1.0);
  });

  it('clampMultipliers clamps to [0.5, 2.0]', () => {
    expect(clampMultipliers({ forecastVolume: 0.3, unitPrice: 3.0, coreCapacity: 0.0, buCapacity: -1.0 })).toEqual({
      forecastVolume: 0.5,
      unitPrice: 2.0,
      coreCapacity: 0.5,
      buCapacity: 0.5,
    });
    expect(clampMultipliers({ forecastVolume: 1.5, unitPrice: 1.0, coreCapacity: 2.0, buCapacity: 0.5 })).toEqual({
      forecastVolume: 1.5,
      unitPrice: 1.0,
      coreCapacity: 2.0,
      buCapacity: 0.5,
    });
  });

  it('default multiplier (all 1.0) produces identical results to baseline', () => {
    const multipliers = defaultMultipliers();
    const comparison = computeScenarioComparison(
      skus, forecasts, capacityPlans, defaultParams, multipliers, mockDqSummary
    );
    expect(comparison.deltas.totalRevenueUsd.delta).toBe(0);
    expect(comparison.deltas.totalForecastPcs.delta).toBe(0);
    expect(comparison.deltas.shortageMonthCount.delta).toBe(0);
    expect(comparison.baseline.calcResult.totalRevenue).toBe(comparison.scenario.calcResult.totalRevenue);
    expect(comparison.baseline.calcResult.totalForecastPcs).toBe(comparison.scenario.calcResult.totalForecastPcs);
  });

  it('forecastVolume: 1.1 increases forecastPcs by 10% in cloned data, does NOT mutate original', () => {
    const originalFcs = forecasts.map((f) => ({ ...f }));
    const result = applyScenarioMultipliers(skus, forecasts, capacityPlans, {
      ...defaultMultipliers(),
      forecastVolume: 1.1,
    });
    expect(result.forecasts[0].forecastPcs).toBeCloseTo(10000 * 1.1, 5);
    expect(result.forecasts[1].forecastPcs).toBeCloseTo(12000 * 1.1, 5);
    expect(result.forecasts[2].forecastPcs).toBeCloseTo(8000 * 1.1, 5);
    expect(forecasts[0].forecastPcs).toBe(originalFcs[0].forecastPcs);
    expect(forecasts[1].forecastPcs).toBe(originalFcs[1].forecastPcs);
  });

  it('unitPrice: 0.9 decreases unitPrice by 10% in cloned SKU and Forecast, does NOT mutate originals', () => {
    const origSkus = skus.map((s) => ({ ...s }));
    const origFcs = forecasts.map((f) => ({ ...f }));
    const result = applyScenarioMultipliers(skus, forecasts, capacityPlans, {
      ...defaultMultipliers(),
      unitPrice: 0.9,
    });
    expect(result.skus[0].unitPrice).toBeCloseTo(5.0 * 0.9, 5);
    expect(result.skus[1].unitPrice).toBeCloseTo(8.0 * 0.9, 5);
    expect(result.forecasts[0].unitPrice).toBeCloseTo(5.0 * 0.9, 5);
    expect(skus[0].unitPrice).toBe(origSkus[0].unitPrice);
    expect(skus[1].unitPrice).toBe(origSkus[1].unitPrice);
    expect(forecasts[0].unitPrice).toBe(origFcs[0].unitPrice);
  });

  it('coreCapacity: 1.2 increases corePanelPerDay by 20%, does NOT mutate original', () => {
    const origCps = capacityPlans.map((cp) => ({ ...cp }));
    const result = applyScenarioMultipliers(skus, forecasts, capacityPlans, {
      ...defaultMultipliers(),
      coreCapacity: 1.2,
    });
    expect(result.capacityPlans[0].corePanelPerDay).toBeCloseTo(6000 * 1.2, 5);
    expect(result.capacityPlans[1].corePanelPerDay).toBeCloseTo(6000 * 1.2, 5);
    expect(capacityPlans[0].corePanelPerDay).toBe(origCps[0].corePanelPerDay);
    expect(capacityPlans[1].corePanelPerDay).toBe(origCps[1].corePanelPerDay);
  });

  it('buCapacity: 0.8 decreases buPanelPerDay by 20%, does NOT mutate original', () => {
    const origCps = capacityPlans.map((cp) => ({ ...cp }));
    const result = applyScenarioMultipliers(skus, forecasts, capacityPlans, {
      ...defaultMultipliers(),
      buCapacity: 0.8,
    });
    expect(result.capacityPlans[0].buPanelPerDay).toBeCloseTo(5000 * 0.8, 5);
    expect(result.capacityPlans[1].buPanelPerDay).toBeCloseTo(5000 * 0.8, 5);
    expect(capacityPlans[0].buPanelPerDay).toBe(origCps[0].buPanelPerDay);
    expect(capacityPlans[1].buPanelPerDay).toBe(origCps[1].buPanelPerDay);
  });

  it('baseline objects are NOT mutated after applyScenarioMultipliers', () => {
    const skuSnapshot = skus.map((s) => ({ ...s }));
    const fcSnapshot = forecasts.map((f) => ({ ...f }));
    const cpSnapshot = capacityPlans.map((cp) => ({ ...cp }));

    applyScenarioMultipliers(skus, forecasts, capacityPlans, {
      forecastVolume: 1.5,
      unitPrice: 0.7,
      coreCapacity: 2.0,
      buCapacity: 0.5,
    });

    for (let i = 0; i < skus.length; i++) {
      expect(skus[i].unitPrice).toBe(skuSnapshot[i].unitPrice);
    }
    for (let i = 0; i < forecasts.length; i++) {
      expect(forecasts[i].forecastPcs).toBe(fcSnapshot[i].forecastPcs);
      expect(forecasts[i].unitPrice).toBe(fcSnapshot[i].unitPrice);
    }
    for (let i = 0; i < capacityPlans.length; i++) {
      expect(capacityPlans[i].corePanelPerDay).toBe(cpSnapshot[i].corePanelPerDay);
      expect(capacityPlans[i].buPanelPerDay).toBe(cpSnapshot[i].buPanelPerDay);
    }
  });

  it('deltas: when multiplier > 1.0, revenue delta should be positive (for volume/price)', () => {
    const comparison = computeScenarioComparison(
      skus, forecasts, capacityPlans, defaultParams,
      { ...defaultMultipliers(), forecastVolume: 1.1, unitPrice: 1.1 },
      mockDqSummary
    );
    expect(comparison.deltas.totalRevenueUsd.delta).toBeGreaterThan(0);
    expect(comparison.deltas.totalForecastPcs.delta).toBeGreaterThan(0);
  });

  it('deltas: when multiplier = 1.0, all deltas should be 0', () => {
    const comparison = computeScenarioComparison(
      skus, forecasts, capacityPlans, defaultParams,
      defaultMultipliers(),
      mockDqSummary
    );
    expect(comparison.deltas.totalRevenueUsd.delta).toBe(0);
    expect(comparison.deltas.totalForecastPcs.delta).toBe(0);
    expect(comparison.deltas.shortageMonthCount.delta).toBe(0);
  });
});
