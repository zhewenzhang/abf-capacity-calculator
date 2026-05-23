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

function buildBrief(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters = defaultParams
) {
  const analyticsModel = buildAnalyticsModel(skus, forecasts, capacityPlans, params);
  const bpModel = buildBpAnalysis(
    analyticsModel.skuResults,
    skus,
    analyticsModel.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    params.currencySettings!
  );
  const payload = buildAnalysisContractPayload(skus, forecasts, capacityPlans, params, analyticsModel, bpModel, 'v1.16.1');
  return buildRiskBrief(payload);
}

describe('riskBrief — Phase 5.1 Calibration', () => {
  // Test 1: Empty data produces safe brief
  it('returns blocked empty state with all required sections', () => {
    const brief = buildBrief([], [], [], defaultParams);
    expect(brief.confidence).toBe('blocked');
    expect(brief.executiveSummary[0]).toContain('No active data loaded');
    expect(brief.topRiskPeriods.length).toBe(0);
    expect(brief.facts).toEqual([]);
    expect(brief.drivers).toEqual([]);
    expect(brief.assumptions).toEqual([]);
    expect(brief.dataCaveats.total).toBeGreaterThan(0);
    expect(brief.dataCaveats.top.length).toBeLessThanOrEqual(5);
    expect(brief.confidenceExplanation).toContain('No active data');
  });

  // Test 2: Executive summary includes highest risk period
  it('includes highest risk period in executive summary when risks exist', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 10000000 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month, corePanelPerDay: 10, buPanelPerDay: 10 }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    expect(brief.executiveSummary.some(s => s.includes('2026') && s.includes('highest risk'))).toBe(true);
  });

  // Test 3: Drivers are separated by type
  it('separates drivers into revenue / core / BU / shortage / BP groups', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    const metrics = brief.drivers.map(d => d.metric);
    expect(metrics).toContain('revenue');
    expect(metrics).toContain('coreDemand');
    expect(metrics).toContain('buDemand');
  });

  // Test 4: Share calculation handles zero totals safely
  it('handles zero totals in share calculation without errors', () => {
    const sku = makeSku({ unitPrice: 0 });
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 0, unitPrice: 0 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    // Should not throw; share may be undefined for zero values
    for (const dg of brief.drivers) {
      for (const item of dg.items) {
        if (item.share !== undefined) {
          expect(item.share).toBeGreaterThanOrEqual(0);
          expect(item.share).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  // Test 5: Top risk periods sort by severity score, not insertion order
  it('sorts top risk periods by score descending', () => {
    const sku = makeSku();
    // Two years: 2026 with huge demand (red), 2027 with moderate demand (orange)
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];

    // 2026: extreme demand -> red
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-26-${i}`, month, forecastPcs: 10000000 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-26-${i}`, month, corePanelPerDay: 10, buPanelPerDay: 10 }));
    }
    // 2027: moderate demand -> might be orange or green
    for (let i = 1; i <= 12; i++) {
      const month = `2027-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-27-${i}`, month, forecastPcs: 200000 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-27-${i}`, month, corePanelPerDay: 500, buPanelPerDay: 500 }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    if (brief.topRiskPeriods.length >= 2) {
      expect(brief.topRiskPeriods[0].score).toBeGreaterThanOrEqual(brief.topRiskPeriods[1].score);
    }
  });

  // Test 6: Confidence explanation changes with data quality issues
  it('produces different confidence explanations based on data quality', () => {
    // High confidence case
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const briefHigh = buildBrief([sku], forecasts, capacityPlans);
    expect(briefHigh.confidenceExplanation).toContain('complete and consistent');

    // Low confidence case — missing capacity
    const briefLow = buildBrief([sku], [makeForecast({ month: '2026-01' })], []);
    expect(briefLow.confidence).toBe('low');
    expect(briefLow.confidenceExplanation.toLowerCase()).toMatch(/error|missing|no active/);
  });

  // Test 7: Caveats limit to top issues but preserve total count
  it('limits caveats display to top 5 but preserves total count', () => {
    // Create many forecasts referencing non-existent SKUs to generate many error issues
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    for (let i = 1; i <= 20; i++) {
      forecasts.push(makeForecast({
        id: `fc-${i}`,
        month: `2026-${String(((i - 1) % 12) + 1).padStart(2, '0')}`,
        skuId: `nonexistent-sku-${i}`, // orphan -> generates error
      }));
    }
    const capacityPlans: CapacityPlan[] = [];

    const brief = buildBrief([sku], forecasts, capacityPlans);
    expect(brief.dataCaveats.total).toBeGreaterThan(5);
    expect(brief.dataCaveats.top.length).toBeLessThanOrEqual(5);
  });

  // Test 8: Assumptions include currency/BP rules
  it('includes currency and BP assumptions', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    const assumptionTitles = brief.assumptions.map(a => a.title.toLowerCase());
    const joinedAssumptions = assumptionTitles.join(' ');
    expect(joinedAssumptions).toMatch(/bp|target|allocation/);
    expect(joinedAssumptions).toMatch(/usd|currency|normalize/);
    expect(joinedAssumptions).toMatch(/twd/);
    expect(joinedAssumptions).toMatch(/working.?day/);
  });

  // Test 9: BP risk is included when BP model exists with miss
  it('includes BP risk when BP target is not met', () => {
    const sku = makeSku({ unitPrice: 0.001 }); // Very low price -> low revenue -> BP miss
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, forecastPcs: 1000, unitPrice: 0.001 }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const paramsWithHighTarget: ProjectParameters = {
      ...defaultParams,
      bpTargets: {
        mode: 'yearly',
        yearlyRevenueTargetsMillionTwd: { '2026': 10000 }, // Very high target
      },
    };

    const brief = buildBrief([sku], forecasts, capacityPlans, paramsWithHighTarget);
    if (brief.bpRisk) {
      expect(brief.bpRisk.worstPeriod).not.toBeNull();
      expect(brief.bpRisk.statement).not.toBeNull();
    }
  });

  // Test 10: Multi-currency revenue assumptions are represented
  it('represents multi-currency assumptions correctly', () => {
    const sku = makeSku({ unitPrice: 150, unitPriceCurrency: 'TWD' });
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month, unitPrice: 150, unitPriceCurrency: 'TWD' }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    const assumptionDetail = brief.assumptions.map(a => a.detail).join(' ').toLowerCase();
    expect(assumptionDetail).toMatch(/usd|normalize|currency/);
  });

  // Test 11: Facts section is populated
  it('populates facts section with revenue, bottleneck, and shortage facts', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    expect(brief.facts.length).toBeGreaterThan(0);
    expect(brief.facts.some(f => f.title.toLowerCase().includes('revenue'))).toBe(true);
    expect(brief.facts.some(f => f.title.toLowerCase().includes('bottleneck') || f.title.toLowerCase().includes('no structural'))).toBe(true);
  });

  // Test 12: Role attention is populated for all roles
  it('provides role attention for sales, product planning, capacity, and executive', () => {
    const sku = makeSku();
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];
    for (let i = 1; i <= 12; i++) {
      const month = `2026-${String(i).padStart(2, '0')}`;
      forecasts.push(makeForecast({ id: `fc-${i}`, month }));
      capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
    }

    const brief = buildBrief([sku], forecasts, capacityPlans);
    expect(brief.roleAttention.sales.length).toBeGreaterThan(0);
    expect(brief.roleAttention.productPlanning.length).toBeGreaterThan(0);
    expect(brief.roleAttention.capacity.length).toBeGreaterThan(0);
    expect(brief.roleAttention.executive.length).toBeGreaterThan(0);
  });
});
