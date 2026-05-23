import { describe, it, expect } from 'vitest';
import { buildRiskBrief } from './riskBrief';
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

describe('riskBrief', () => {
  it('returns blocked empty state gracefully when no data is loaded', () => {
    const analyticsModel = buildAnalyticsModel([], [], [], defaultParams);
    const bpModel = buildBpAnalysis([], [], [], {}, defaultParams.currencySettings!);
    const payload = buildAnalysisContractPayload([], [], [], defaultParams, analyticsModel, bpModel, 'v1.16.0');

    const brief = buildRiskBrief(payload);
    expect(brief.confidence).toBe('blocked');
    expect(brief.executiveSummary[0]).toContain('No active data loaded');
    expect(brief.topRiskPeriods.length).toBe(0);
    expect(brief.roleAttention.sales[0]).toContain('Import monthly forecasting');
  });

  it('generates accurate risk brief under normal data conditions', () => {
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
    const payload = buildAnalysisContractPayload([sku], forecasts, capacityPlans, defaultParams, analyticsModel, bpModel, 'v1.16.0');

    const brief = buildRiskBrief(payload);
    expect(brief.confidence).toBe('high');
    expect(brief.executiveSummary.length).toBeGreaterThan(0);
    expect(brief.topDrivers.customers[0].label).toBe('Test Corp');
    expect(brief.topDrivers.skus[0].label).toBe('TEST-001');
    expect(brief.roleAttention.sales.length).toBeGreaterThan(0);
    expect(brief.roleAttention.executive.length).toBeGreaterThan(0);
  });

  it('identifies bottleneck risk periods correctly', () => {
    const sku = makeSku();
    // Huge demand to trigger capacity bottleneck (> 100%)
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 10000000 }));
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
    const payload = buildAnalysisContractPayload([sku], forecasts, capacityPlans, defaultParams, analyticsModel, bpModel, 'v1.16.0');

    const brief = buildRiskBrief(payload);
    expect(brief.topRiskPeriods.length).toBeGreaterThan(0);
    expect(brief.topRiskPeriods[0].severity).toBe('red');
    expect(brief.bottleneckSummary.primary).not.toBe('None');
    expect(brief.roleAttention.capacity.some(a => a.includes('Operational Bottleneck'))).toBe(true);
  });
});
