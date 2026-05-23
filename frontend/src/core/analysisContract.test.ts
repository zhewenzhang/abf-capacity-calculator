import { describe, it, expect } from 'vitest';
import { buildAnalysisContractPayload } from './analysisContract';
import { buildAnalyticsModel } from './analytics';
import { buildBpAnalysis } from './bpTargets';
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

describe('analysisContract', () => {
  it('should generate complete AnalysisContractPayload', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const analyticsModel = buildAnalyticsModel([sku], forecasts, capacityPlans, defaultParams);
    const bpModel = buildBpAnalysis(
      analyticsModel.skuResults,
      [sku],
      analyticsModel.monthlySummaries,
      defaultParams.bpTargets!.yearlyRevenueTargetsMillionTwd,
      defaultParams.currencySettings!
    );

    const payload = buildAnalysisContractPayload(
      [sku],
      forecasts,
      capacityPlans,
      defaultParams,
      analyticsModel,
      bpModel,
      'v1.16.0'
    );

    expect(payload).toBeDefined();
    expect(payload.version).toBe('1.0');
    expect(payload.appVersion).toBe('v1.16.0');
    expect(payload.generatedAt).toBeDefined();
    expect(payload.timeRange.months).toContain('2026-01');
    expect(payload.timeRange.years).toContain('2026');
    expect(payload.metricDefinitions.length).toBeGreaterThan(0);
    expect(payload.quality.confidence).toBe('high');
    expect(payload.assumptions.length).toBeGreaterThan(0);
    expect(payload.summary.totalRevenueUsd).toBe(600000);
    expect(payload.summary.totalForecastPcs).toBe(120000);
    expect(payload.yearlyHealth.length).toBe(1);
    expect(payload.bpAnalysis).toBeDefined();
    expect(payload.matrices.revenueByCustomer.length).toBeGreaterThan(0);
    expect(payload.matrices.revenueBySku.length).toBeGreaterThan(0);
    expect(payload.riskAttribution).toBeDefined();
    expect(payload.riskAttribution.shortageMonths).toBeDefined();
    expect(Array.isArray(payload.riskAttribution.drivers)).toBe(true);
    expect(Array.isArray(payload.riskAttribution.skuHealthSignals)).toBe(true);
  });

  it('exposes riskAttribution drivers in shortage scenarios', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 10_000_000 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 10, buPanelPerDay: 10 }));
    }
    const analyticsModel = buildAnalyticsModel([sku], forecasts, capacityPlans, defaultParams);
    const bpModel = buildBpAnalysis(
      analyticsModel.skuResults,
      [sku],
      analyticsModel.monthlySummaries,
      defaultParams.bpTargets!.yearlyRevenueTargetsMillionTwd,
      defaultParams.currencySettings!
    );
    const payload = buildAnalysisContractPayload(
      [sku], forecasts, capacityPlans, defaultParams, analyticsModel, bpModel, 'v1.17.0'
    );
    expect(payload.riskAttribution.shortageMonths.length).toBeGreaterThan(0);
    expect(payload.riskAttribution.drivers.length).toBeGreaterThan(0);
  });
});
