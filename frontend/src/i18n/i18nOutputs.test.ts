import { describe, it, expect } from 'vitest';
import { translateFor } from './index';
import { buildRiskBrief } from '../core/riskBrief';
import { buildDataQualitySummary } from '../core/dataQuality';
import { buildAnalysisContractPayload } from '../core/analysisContract';
import { buildAnalyticsModel } from '../core/analytics';
import { buildBpAnalysis } from '../core/bpTargets';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS } from '../core/defaults';
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
  bpTargets: { mode: 'yearly', yearlyRevenueTargetsMillionTwd: {} },
};

function buildBrief() {
  const skus = [makeSku()];
  const forecasts = [makeForecast()];
  const plans = [makeCapacityPlan()];
  const model = buildAnalyticsModel(skus, forecasts, plans, defaultParams);
  const bp = buildBpAnalysis(model.skuResults, skus, model.monthlySummaries, {}, defaultParams.currencySettings!);
  const payload = buildAnalysisContractPayload(skus, forecasts, plans, defaultParams, model, bp);
  return buildRiskBrief(payload);
}

describe('Risk Brief — i18n output (EN/zh-TW)', () => {
  it('renders executive summary in both languages without leaking keys', () => {
    const brief = buildBrief();
    expect(brief.executiveSummaryMessages.length).toBeGreaterThan(0);
    for (const m of brief.executiveSummaryMessages) {
      const enOut = translateFor('en', m);
      const zhOut = translateFor('zh-TW', m);
      expect(enOut).not.toBe(m.key);
      expect(zhOut).not.toBe(m.key);
      // unresolved {placeholder} tokens indicate a missing interpolation param
      expect(enOut).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(zhOut).not.toMatch(/\{[a-zA-Z]+\}/);
    }
  });

  it('renders facts titles and details in both languages', () => {
    const brief = buildBrief();
    expect(brief.facts.length).toBeGreaterThan(0);
    for (const fact of brief.facts) {
      for (const lang of ['en', 'zh-TW'] as const) {
        const title = translateFor(lang, fact.titleMessage);
        const detail = translateFor(lang, fact.detailMessage);
        expect(title).not.toBe(fact.titleMessage.key);
        expect(detail).not.toBe(fact.detailMessage.key);
        expect(title).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(detail).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });

  it('renders driver group titles and item reasons in zh-TW', () => {
    const brief = buildBrief();
    expect(brief.drivers.length).toBeGreaterThan(0);
    for (const group of brief.drivers) {
      const zhTitle = translateFor('zh-TW', group.titleMessage);
      expect(zhTitle).not.toBe(group.titleMessage.key);
      for (const item of group.items) {
        const zhReason = translateFor('zh-TW', item.reasonMessage);
        expect(zhReason).not.toBe(item.reasonMessage.key);
      }
    }
  });

  it('renders role-based attention messages in both languages', () => {
    const brief = buildBrief();
    const all = [
      ...brief.roleAttention.salesMessages,
      ...brief.roleAttention.productPlanningMessages,
      ...brief.roleAttention.capacityMessages,
      ...brief.roleAttention.executiveMessages,
    ];
    expect(all.length).toBeGreaterThan(0);
    for (const m of all) {
      for (const lang of ['en', 'zh-TW'] as const) {
        const out = translateFor(lang, m);
        expect(out).not.toBe(m.key);
        expect(out).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });

  it('confidence explanation renders in both languages', () => {
    const brief = buildBrief();
    const enOut = translateFor('en', brief.confidenceExplanationMessage);
    const zhOut = translateFor('zh-TW', brief.confidenceExplanationMessage);
    expect(enOut).not.toBe(brief.confidenceExplanationMessage.key);
    expect(zhOut).not.toBe(brief.confidenceExplanationMessage.key);
    expect(enOut).not.toMatch(/\{[a-zA-Z]+\}/);
    expect(zhOut).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

describe('Data Quality — i18n output (EN/zh-TW)', () => {
  it('blocked state renders in both languages', () => {
    const summary = buildDataQualitySummary({
      skus: [],
      forecasts: [],
      capacityPlans: [],
      params: defaultParams,
    });
    expect(summary.issues.length).toBeGreaterThan(0);
    const issue = summary.issues[0];
    for (const lang of ['en', 'zh-TW'] as const) {
      const title = translateFor(lang, issue.titleMessage);
      const detail = translateFor(lang, issue.detailMessage);
      expect(title).not.toBe(issue.titleMessage.key);
      expect(detail).not.toBe(issue.detailMessage.key);
    }
  });

  it('every issue exposes resolvable titleMessage and detailMessage', () => {
    const summary = buildDataQualitySummary({
      skus: [makeSku({ unitPrice: 0 })],
      forecasts: [makeForecast()],
      capacityPlans: [],
      params: defaultParams,
    });
    expect(summary.issues.length).toBeGreaterThan(0);
    for (const issue of summary.issues) {
      for (const lang of ['en', 'zh-TW'] as const) {
        const title = translateFor(lang, issue.titleMessage);
        const detail = translateFor(lang, issue.detailMessage);
        expect(title).not.toBe(issue.titleMessage.key);
        expect(detail).not.toBe(issue.detailMessage.key);
        expect(title).not.toMatch(/\{[a-zA-Z]+\}/);
        expect(detail).not.toMatch(/\{[a-zA-Z]+\}/);
      }
    }
  });

  it('zh-TW output for currency issues uses Traditional Chinese', () => {
    const summary = buildDataQualitySummary({
      skus: [makeSku({ unitPriceCurrency: 'TWD' })],
      forecasts: [makeForecast({ unitPriceCurrency: 'TWD' })],
      capacityPlans: [makeCapacityPlan()],
      params: {
        ...defaultParams,
        currencySettings: {
          ...defaultParams.currencySettings!,
          displayCurrency: 'TWD',
          constantUsdToTwdRate: 0,
        },
      },
    });
    const twdIssue = summary.issues.find((i) => i.id === 'missing-constant-twd-rate');
    expect(twdIssue).toBeDefined();
    const zh = translateFor('zh-TW', twdIssue!.detailMessage);
    // Traditional Chinese should not contain Simplified-only chars used in test guard
    expect(zh).not.toContain('数据');
    expect(zh.length).toBeGreaterThan(0);
  });
});
