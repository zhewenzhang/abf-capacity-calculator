import { describe, it, expect } from 'vitest';
import { buildAiCopilotContext } from './aiCopilotContext';
import { buildAnalyticsModel } from './analytics';
import { buildBpAnalysis } from './bpTargets';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

// ============================================================
// Test helpers
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

/** Build a full 12-month dataset for 2026. */
function buildFullYearData() {
  const sku = makeSku();
  const forecasts: Forecast[] = [];
  const capacityPlans: CapacityPlan[] = [];
  for (let i = 1; i <= 12; i++) {
    const month = `2026-${String(i).padStart(2, '0')}`;
    forecasts.push(makeForecast({ id: `fc-${i}`, month }));
    capacityPlans.push(makeCapacityPlan({ id: `cp-${i}`, month }));
  }
  return { sku, forecasts, capacityPlans };
}

function buildFullContext(
  overrides: {
    skus?: SKU[];
    forecasts?: Forecast[];
    capacityPlans?: CapacityPlan[];
    params?: ProjectParameters;
    role?: 'owner' | 'editor' | 'viewer';
  } = {}
) {
  const { sku, forecasts, capacityPlans } = buildFullYearData();
  const skus = overrides.skus ?? [sku];
  const fc = overrides.forecasts ?? forecasts;
  const cp = overrides.capacityPlans ?? capacityPlans;
  const params = overrides.params ?? defaultParams;

  const model = buildAnalyticsModel(skus, fc, cp, params);
  const bpModel = buildBpAnalysis(
    model.skuResults,
    skus,
    model.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    params.currencySettings ?? { baseCurrency: 'USD', displayCurrency: 'USD', exchangeRateMode: 'constant', constantUsdToTwdRate: 32, yearlyUsdToTwdRates: {}, constantUsdToCnyRate: 7.2, yearlyUsdToCnyRates: {} }
  );

  return buildAiCopilotContext(skus, fc, cp, params, model, bpModel, overrides.role);
}

// ============================================================
// Tests
// ============================================================

describe('buildAiCopilotContext', () => {
  // ---- 1. Valid context with all required fields ----
  it('returns valid context with all required fields', () => {
    const ctx = buildFullContext();

    expect(ctx.schemaVersion).toBe('1.0');
    expect(typeof ctx.generatedAt).toBe('string');
    expect(new Date(ctx.generatedAt).toISOString()).toBe(ctx.generatedAt);

    // projectSummary
    expect(ctx.projectSummary).toBeDefined();
    expect(typeof ctx.projectSummary.totalRevenueUsd).toBe('number');
    expect(typeof ctx.projectSummary.totalForecastPcs).toBe('number');
    expect(ctx.projectSummary.skuCount).toBe(1);
    expect(ctx.projectSummary.forecastMonthCount).toBe(12);
    expect(typeof ctx.projectSummary.shortageMonthCount).toBe('number');

    // dataQualitySummary
    expect(ctx.dataQualitySummary).toBeDefined();
    expect(['high', 'medium', 'low', 'blocked']).toContain(ctx.dataQualitySummary.confidence);
    expect(typeof ctx.dataQualitySummary.confidenceScore).toBe('number');
    expect(['ok', 'warning', 'error']).toContain(ctx.dataQualitySummary.status);
    expect(typeof ctx.dataQualitySummary.issueCount).toBe('number');
    expect(Array.isArray(ctx.dataQualitySummary.topIssues)).toBe(true);

    // riskBriefSummary
    expect(ctx.riskBriefSummary).toBeDefined();
    expect(Array.isArray(ctx.riskBriefSummary.shortageMonths)).toBe(true);
    expect(Array.isArray(ctx.riskBriefSummary.topDrivers)).toBe(true);

    // bpSummary
    expect(ctx.bpSummary).toBeDefined();
    expect(Array.isArray(ctx.bpSummary.yearly)).toBe(true);
    expect(typeof ctx.bpSummary.hasAnyMiss).toBe('boolean');

    // capacitySummary
    expect(ctx.capacitySummary).toBeDefined();
    expect(Array.isArray(ctx.capacitySummary.monthlySummaries)).toBe(true);

    // currencyAssumptions
    expect(ctx.currencyAssumptions).toBeDefined();
    expect(ctx.currencyAssumptions.baseCurrency).toBe('USD');

    // assumptions
    expect(Array.isArray(ctx.assumptions)).toBe(true);
    expect(ctx.assumptions.length).toBeGreaterThan(0);

    // role
    expect(ctx.role).toBeDefined();
  });

  // ---- 2. No sensitive keys in output ----
  it('does not contain any sensitive keys in the output', () => {
    // Inject data that contains sensitive keys at various levels
    const sku = makeSku();
    // Cast to allow injecting extra fields for testing
    (sku as unknown as Record<string, unknown>).ownerUid = 'secret-owner-uid';
    (sku as unknown as Record<string, unknown>).email = 'test@example.com';

    const params: ProjectParameters = {
      ...defaultParams,
      // Simulate sensitive data in params
      bpTargets: {
        mode: 'yearly',
        yearlyRevenueTargetsMillionTwd: { '2026': 100 },
      },
    };
    (params as unknown as Record<string, unknown>).workspaceId = 'ws-123';
    (params as unknown as Record<string, unknown>).userId = 'user-abc';

    const { forecasts, capacityPlans } = buildFullYearData();
    const model = buildAnalyticsModel([sku], forecasts, capacityPlans, params);
    const ctx = buildAiCopilotContext([sku], forecasts, capacityPlans, params, model);

    const sensitiveKeys = [
      'uid', 'email', 'token', 'auth', 'apiKey', 'secret',
      'password', 'workspaceId', 'userId', 'ownerUid', 'member',
    ];

    const jsonStr = JSON.stringify(ctx);
    for (const key of sensitiveKeys) {
      expect(jsonStr).not.toContain(`"${key}"`);
    }
  });

  // ---- 3. Includes dataQualitySummary with confidence ----
  it('includes dataQualitySummary with confidence score', () => {
    const ctx = buildFullContext();

    expect(ctx.dataQualitySummary.confidence).toBeDefined();
    expect(ctx.dataQualitySummary.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(ctx.dataQualitySummary.confidenceScore).toBeLessThanOrEqual(100);
    expect(ctx.dataQualitySummary.status).toBeDefined();
    expect(ctx.dataQualitySummary.issueCount).toBeGreaterThanOrEqual(0);
  });

  // ---- 4. Includes currencyAssumptions ----
  it('includes currencyAssumptions with exchange rates', () => {
    const ctx = buildFullContext();

    expect(ctx.currencyAssumptions.baseCurrency).toBe('USD');
    expect(ctx.currencyAssumptions.displayCurrency).toBe('USD');
    expect(ctx.currencyAssumptions.exchangeRateMode).toBe('constant');
    expect(typeof ctx.currencyAssumptions.usdToTwdRate).toBe('number');
    expect(ctx.currencyAssumptions.usdToTwdRate).toBeGreaterThan(0);
    expect(typeof ctx.currencyAssumptions.usdToCnyRate).toBe('number');
    expect(ctx.currencyAssumptions.usdToCnyRate).toBeGreaterThan(0);
  });

  // ---- 5. Includes bpSummary with yearly records ----
  it('includes bpSummary with yearly records and status flags', () => {
    const ctx = buildFullContext();

    expect(ctx.bpSummary.yearly.length).toBeGreaterThan(0);
    const record = ctx.bpSummary.yearly[0];
    expect(record.period).toBe('2026');
    expect(typeof record.forecastMillionTwd).toBe('number');
    expect(typeof ctx.bpSummary.hasAnyMiss).toBe('boolean');

    // Attainment should be null or a number
    if (record.targetMillionTwd !== null) {
      expect(typeof record.attainment).toBe('number');
      expect(typeof record.gapMillionTwd).toBe('number');
    }
  });

  // ---- 6. Includes role field ----
  it('includes role field and defaults to viewer', () => {
    const ctxDefault = buildFullContext();
    expect(ctxDefault.role).toBe('viewer');

    const ctxOwner = buildFullContext({ role: 'owner' });
    expect(ctxOwner.role).toBe('owner');

    const ctxEditor = buildFullContext({ role: 'editor' });
    expect(ctxEditor.role).toBe('editor');
  });

  // ---- 7. Handles empty data (no SKUs, no forecasts) ----
  it('handles empty data gracefully', () => {
    const model = buildAnalyticsModel([], [], [], defaultParams);
    const ctx = buildAiCopilotContext([], [], [], defaultParams, model);

    expect(ctx.schemaVersion).toBe('1.0');
    expect(ctx.projectSummary.totalRevenueUsd).toBe(0);
    expect(ctx.projectSummary.totalForecastPcs).toBe(0);
    expect(ctx.projectSummary.skuCount).toBe(0);
    expect(ctx.projectSummary.forecastMonthCount).toBe(0);
    expect(ctx.projectSummary.shortageMonthCount).toBe(0);
    expect(ctx.dataQualitySummary.confidence).toBe('blocked');
    expect(ctx.bpSummary.yearly).toEqual([]);
    expect(ctx.capacitySummary.monthlySummaries).toEqual([]);
    expect(ctx.role).toBe('viewer');
  });

  // ---- 8. Array capping: topIssues capped to 8 ----
  it('caps topIssues to 8 items', () => {
    // Create enough SKUs and forecasts with various DQ issues to generate > 8 issues
    const skus: SKU[] = [];
    const forecasts: Forecast[] = [];
    const capacityPlans: CapacityPlan[] = [];

    // Generate 15 SKUs with missing attributes (will produce errors)
    for (let i = 0; i < 15; i++) {
      skus.push(makeSku({
        id: `sku-${i}`,
        skuCode: `SKU-${i}`,
        chipLengthMm: 0, // invalid, triggers sku-missing-attr
      }));
      forecasts.push(makeForecast({
        id: `fc-${i}`,
        skuId: `sku-${i}`,
        month: '2026-01',
      }));
    }
    capacityPlans.push(makeCapacityPlan());

    const model = buildAnalyticsModel(skus, forecasts, capacityPlans, defaultParams);
    const ctx = buildAiCopilotContext(skus, forecasts, capacityPlans, defaultParams, model);

    // topIssues must be capped at 8
    expect(ctx.dataQualitySummary.topIssues.length).toBeLessThanOrEqual(8);
  });

  // ---- Additional: topDrivers capped to 5 ----
  it('caps topDrivers to 5 items', () => {
    const ctx = buildFullContext();
    expect(ctx.riskBriefSummary.topDrivers.length).toBeLessThanOrEqual(5);
  });

  // ---- Additional: shortageMonths capped to 12 ----
  it('caps shortageMonths to 12 items', () => {
    const ctx = buildFullContext();
    expect(ctx.riskBriefSummary.shortageMonths.length).toBeLessThanOrEqual(12);
  });

  // ---- Additional: numbers are rounded to 2 decimal places ----
  it('rounds numeric values to 2 decimal places', () => {
    const ctx = buildFullContext();
    // Verify no number has more than 2 decimal places in the serialized output
    // This is a heuristic check on key numeric fields
    const checkTwoDecimals = (val: number | null) => {
      if (val === null) return;
      const str = String(val);
      const parts = str.split('.');
      if (parts.length === 2) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    };
    checkTwoDecimals(ctx.projectSummary.totalRevenueUsd);
    checkTwoDecimals(ctx.projectSummary.totalForecastPcs);
    checkTwoDecimals(ctx.dataQualitySummary.confidenceScore);
    checkTwoDecimals(ctx.currencyAssumptions.usdToTwdRate);
    checkTwoDecimals(ctx.currencyAssumptions.usdToCnyRate);

    for (const r of ctx.bpSummary.yearly) {
      checkTwoDecimals(r.targetMillionTwd);
      checkTwoDecimals(r.forecastMillionTwd);
      checkTwoDecimals(r.attainment);
      checkTwoDecimals(r.gapMillionTwd);
    }
  });

  // ---- Additional: scenarioSummary is null by default ----
  it('sets scenarioSummary to null by default', () => {
    const ctx = buildFullContext();
    expect(ctx.scenarioSummary).toBeNull();
  });

  // ---- Additional: capacitySummary monthly entries match model ----
  it('populates capacitySummary monthlySummaries from model', () => {
    const ctx = buildFullContext();
    expect(ctx.capacitySummary.monthlySummaries.length).toBe(12);
    for (const entry of ctx.capacitySummary.monthlySummaries) {
      expect(entry.month).toMatch(/^\d{4}-\d{2}$/);
      expect(typeof entry.coreShortage).toBe('number');
      expect(typeof entry.buShortage).toBe('number');
      expect(['Core', 'BU', 'None']).toContain(entry.bottleneck);
    }
  });
});
