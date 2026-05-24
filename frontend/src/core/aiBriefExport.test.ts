/**
 * AI Brief Export tests
 */

import { describe, it, expect } from 'vitest';
import {
  buildSanitizedAnalysisContract,
  buildChineseAiBriefPrompt,
  buildCombinedAiBriefPack,
  validateCombinedPack,
} from './aiBriefExport';
import type { AnalysisContractPayload } from './analysisContract';

// Create a minimal mock payload for testing
function createMockPayload(): AnalysisContractPayload {
  return {
    version: '1.1',
    generatedAt: new Date().toISOString(),
    appVersion: '1.21.0',
    timeRange: {
      months: ['2026-01', '2026-02', '2026-03'],
      years: ['2026'],
    },
    metricDefinitions: [
      {
        id: 'revenueUsd',
        labelKey: 'results.revenue',
        definition: 'Monthly forecast revenue in USD base.',
        formula: 'forecastPcs * unitPriceUsd',
        unit: 'usd',
        source: ['forecasts', 'products', 'calculation'],
        ownerView: ['sales', 'executive'],
      },
    ],
    quality: {
      status: 'warning',
      confidence: 'medium',
      confidenceScore: 75,
      issues: [
        {
          id: 'dq-1',
          severity: 'warning',
          domain: 'capacity',
          title: 'Missing Capacity',
          detail: 'Capacity config missing',
          titleMessage: { key: 'dq.missingCapacity.title' },
          detailMessage: { key: 'dq.missingCapacity.detail' },
        },
      ],
    },
    assumptions: [
      'Working days are fixed across all monthly capacity analyses.',
      'Core steps are fixed to 1 step for all layer count SKUs.',
    ],
    summary: {
      totalRevenueUsd: 1000000,
      totalForecastPcs: 50000,
      maxCoreUtilization: 0.95,
      maxBuUtilization: 0.85,
      shortageMonthCount: 2,
      worstBottleneckMonth: '2026-03',
    },
    yearlyHealth: [
      {
        year: '2026',
        revenue: 1000000,
        forecastPcs: 50000,
        coreDemand: 10000,
        coreCapacity: 11000,
        coreUtil: 0.91,
        buDemand: 8000,
        buCapacity: 10000,
        buUtil: 0.8,
        shortageMonths: ['2026-02', '2026-03'],
        bottleneck: 'Core',
        severity: 'orange',
      },
    ],
    bpAnalysis: {
      yearly: [
        {
          period: '2026',
          targetMillionTwd: 1000,
          forecastMillionTwd: 950,
          attainment: 0.95,
          gapMillionTwd: -50,
          status: 'miss',
        },
      ],
      quarterly: [],
      monthly: [],
      customerRevenueByYear: [],
      skuRevenueByYear: [],
      customerRevenueByQuarter: [],
      skuRevenueByQuarter: [],
      customerRevenueByMonth: [],
      skuRevenueByMonth: [],
    },
    skus: [
      {
        id: 'sku-1',
        skuCode: 'TSMC-001',
        customer: 'TSMC',
        deviceName: 'Device A',
        application: 'HPC',
        productGrade: 'High',
        sizeCategory: 'large',
        chipLengthMm: 50,
        chipWidthMm: 50,
        layerCount: 10,
        unitPrice: 100,
        unitPriceCurrency: 'USD',
        upp: 100,
        osat: 'OSAT-1',
        yieldEstimate: 0.95,
        coreType: 'Standard',
        coreThicknessMm: 0.5,
        abfType: 'Type A',
      },
    ],
    forecasts: [
      {
        id: 'fcst-1',
        skuId: 'sku-1',
        month: '2026-01',
        forecastPcs: 1000,
        unitPrice: 100,
      },
    ],
    matrices: {
      revenueByCustomer: [],
      revenueBySku: [],
      revenueBySize: [],
      coreDemandBySize: [],
      buDemandBySize: [],
      coreDemandByApplication: [],
      buDemandByApplication: [],
    },
    riskAttribution: {
      shortageMonths: ['2026-02', '2026-03'],
      drivers: [
        {
          dimension: 'customer',
          label: 'TSMC',
          metric: 'coreDemand',
          value: 500,
          share: 100,
          severity: 'critical',
          affectedPeriods: ['2026-02', '2026-03'],
          reason: 'TSMC drives core demand during shortage',
          reasonMessage: { key: 'attr.driver.customerCoreReason' },
        },
      ],
      skuHealthSignals: [],
      weightConfig: { coreWeight: 1.3, buWeight: 1.0 },
    },
    bpAttribution: {
      yearly: [],
      quarterly: [],
      monthly: [],
      worstPeriod: '2026',
      topDrivers: [
        {
          dimension: 'customer',
          label: 'TSMC',
          period: '2026',
          forecastRevenueMillionTwd: 600,
          periodTotalRevenueMillionTwd: 1000,
          revenueShare: 60,
          targetMillionTwd: 1000,
          periodGapMillionTwd: -50,
          gapContributionMillionTwd: -30,
          shareOfGap: 60,
          reason: 'customer TSMC contributes 60% of 2026 revenue',
          reasonMessage: { key: 'bpAttr.driver.reason', params: { dimension: 'customer', label: 'TSMC', period: '2026', share: '60', gap: '30' } },
        },
      ],
    },
    priceImpact: {
      mostSensitiveYear: '2026',
      maxAttainmentDeltaPp: 10,
      scenarios: [
        {
          scenarioId: 'price_plus_10pct',
          priceDeltaPct: 0.1,
          yearly: [
            {
              year: '2026',
              baseRevenueMillionTwd: 1000,
              scenarioRevenueMillionTwd: 1100,
              revenueDeltaMillionTwd: 100,
              baseBpAttainment: 0.95,
              scenarioBpAttainment: 1.05,
              bpAttainmentDelta: 0.1,
              baseGapMillionTwd: -50,
              scenarioGapMillionTwd: 50,
            },
          ],
        },
      ],
    },
    capacityImpact: {
      bestScenarioId: 'capacity_core_+10pct',
      scenarios: [
        {
          scenarioId: 'capacity_core_+10pct',
          coreCapacityDeltaPct: 0.1,
          buCapacityDeltaPct: 0,
          shortageMonthsBefore: 2,
          shortageMonthsAfter: 1,
          resolvedShortageMonths: ['2026-02'],
          remainingShortageMonths: ['2026-03'],
          maxCoreUtilBefore: 0.95,
          maxCoreUtilAfter: 0.87,
          maxBuUtilBefore: 0.85,
          maxBuUtilAfter: 0.85,
        },
      ],
    },
    keyFindings: [
      {
        id: 'kf-1',
        severity: 'warning',
        source: 'capacity',
        title: 'Shortage detected',
        detail: '2 months with capacity shortage',
        titleMessage: { key: 'keyFindings.capacity.shortage.title' },
        detailMessage: { key: 'keyFindings.capacity.shortage.detail' },
      },
    ],
  };
}

describe('aiBriefExport', () => {
  describe('buildSanitizedAnalysisContract', () => {
    it('should preserve key analysis fields', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.version).toBe('1.1');
      expect(result.summary.totalRevenueUsd).toBe(1000000);
      expect(result.summary.shortageMonthCount).toBe(2);
      expect(result.yearlyHealth).toHaveLength(1);
      expect(result.keyFindings).toHaveLength(1);
    });

    it('should preserve bpAttribution data', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.bpAttribution.worstPeriod).toBe('2026');
      expect(result.bpAttribution.topDrivers).toHaveLength(1);
    });

    it('should preserve priceImpact and capacityImpact', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.priceImpact.scenarios).toHaveLength(1);
      expect(result.capacityImpact.scenarios).toHaveLength(1);
    });

    it('should remove sensitive keys like uid, email, token', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);
      const jsonStr = JSON.stringify(result);

      expect(jsonStr).not.toContain('secret-token');
      expect(jsonStr).not.toContain('user-uid');
    });

    it('should include aiGuardrails', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.aiGuardrails).toBeDefined();
      expect(result.aiGuardrails.doNotModify).toHaveLength(4);
      expect(result.aiGuardrails.currencyHandling).toHaveLength(4);
      expect(result.aiGuardrails.attributionWarning).toHaveLength(4);
      expect(result.aiGuardrails.dataQualityWarning).toHaveLength(3);
    });

    it('should include proportional note in bpAttribution', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.bpAttribution.proportionalNote).toContain('proportional');
      expect(result.bpAttribution.proportionalNote).toContain('not strict causal');
    });

    it('should simplify quality structure', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.quality.confidence).toBe('medium');
      expect(result.quality.score).toBe(75);
      expect(result.quality.issueCount).toBe(1);
      expect(result.quality.topIssues).toHaveLength(1);
    });

    it('should create SKU summary without internal IDs', () => {
      const payload = createMockPayload();
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.skuSummary).toHaveLength(1);
      expect(result.skuSummary[0].skuCode).toBe('TSMC-001');
      expect(result.skuSummary[0].customer).toBe('TSMC');
    });
  });

  describe('buildChineseAiBriefPrompt', () => {
    it('should contain role definition', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('ABF 載板產能與產品規劃分析顧問');
    });

    it('should contain analysis tasks', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('產能瓶頸分析');
      expect(prompt).toContain('BP 達成風險分析');
      expect(prompt).toContain('價格變動敏感度');
      expect(prompt).toContain('產能改善情境');
    });

    it('should contain guardrails about not modifying formulas', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('嚴格禁止事項');
      expect(prompt).toContain('不可更改 metricDefinitions 中的任何公式');
    });

    it('should contain guardrails about not supplementing data', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('自行補充資料');
      expect(prompt).toContain('不可假設缺失的資料');
    });

    it('should contain currency handling warnings', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('混淆貨幣單位');
      expect(prompt).toContain('營收以 USD 計算');
      expect(prompt).toContain('BP 目標以「百萬 TWD」計算');
    });

    it('should contain attribution vs causation warning', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('混淆比例歸因與因果關係');
      expect(prompt).toContain('比例歸因');
    });

    it('should contain output format sections', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('一句話結論');
      expect(prompt).toContain('前三大風險');
      expect(prompt).toContain('各角色行動建議');
    });

    it('should end with JSON fence notice', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('以下是受控 Analysis Contract JSON');
    });

    it('should include actual data values from contract', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('缺口月份數: 2');
      expect(prompt).toContain('信心分數: 75/100');
    });
  });

  describe('buildCombinedAiBriefPack', () => {
    it('should contain prompt and JSON fence', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);

      expect(pack).toContain('ABF 載板產能與產品規劃分析顧問');
      expect(pack).toContain('```json');
      expect(pack).toContain('```');
    });

    it('should have valid JSON in fence', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);

      const result = validateCombinedPack(pack);
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
    });

    it('should include all required fields in parsed JSON', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);

      const result = validateCombinedPack(pack);
      expect(result.valid).toBe(true);
      expect(result.parsed!.version).toBe('1.1');
      expect(result.parsed!.summary).toBeDefined();
      expect(result.parsed!.aiGuardrails).toBeDefined();
    });
  });

  describe('validateCombinedPack', () => {
    it('should return valid for correct pack', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);
      const result = validateCombinedPack(pack);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error for missing JSON fence', () => {
      const result = validateCombinedPack('no json here');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON fence not found');
    });

    it('should return error for invalid JSON', () => {
      const result = validateCombinedPack('```json\nnot valid json\n```');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('JSON parse error');
    });
  });

  describe('edge cases', () => {
    it('should handle empty keyFindings', () => {
      const payload = createMockPayload();
      payload.keyFindings = [];
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.keyFindings).toHaveLength(0);
    });

    it('should handle missing bpAnalysis', () => {
      const payload = createMockPayload();
      payload.bpAnalysis = undefined;
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.bpAnalysis).toBeUndefined();
    });

    it('should handle null utilization values', () => {
      const payload = createMockPayload();
      payload.summary.maxCoreUtilization = null;
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.summary.maxCoreUtilization).toBeNull();
    });

    it('should handle no shortage months', () => {
      const payload = createMockPayload();
      payload.summary.shortageMonthCount = 0;
      payload.summary.worstBottleneckMonth = null;
      const result = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(result);

      expect(result.summary.shortageMonthCount).toBe(0);
      expect(prompt).toContain('缺口月份數: 0');
    });
  });
});
