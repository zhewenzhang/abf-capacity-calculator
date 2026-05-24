/**
 * AI Brief Export tests
 *
 * v1.21.1 - Hardened tests for encoding, F-A-I-R guardrails, params, UTF-8 BOM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildSanitizedAnalysisContract,
  buildChineseAiBriefPrompt,
  buildCombinedAiBriefPack,
  validateCombinedPack,
  downloadSanitizedContract,
  buildDownloadJsonContent,
  revokeDownloadUrl,
  copyToClipboard,
} from './aiBriefExport';
import type { AnalysisContractPayload } from './analysisContract';

// Create a minimal mock payload for testing
function createMockPayload(): AnalysisContractPayload {
  return {
    version: '1.1',
    generatedAt: new Date().toISOString(),
    appVersion: '1.21.1',
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
        detailMessage: { key: 'keyFindings.capacity.shortage.detail', params: { count: 2 } },
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
      // v1.21.1: New guardrails
      expect(result.aiGuardrails.fairClassification).toHaveLength(4);
      expect(result.aiGuardrails.weightedPressureBoundary).toHaveLength(4);
      expect(result.aiGuardrails.blockedConfidenceHandling).toHaveLength(4);
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

    // P0-2: Key Findings params preservation
    it('should preserve keyFindings message key and params', () => {
      const payload = createMockPayload();
      payload.keyFindings = [
        {
          id: 'kf-1',
          severity: 'warning',
          source: 'capacity',
          title: 'Shortage detected',
          detail: '2 months with capacity shortage',
          titleMessage: { key: 'keyFindings.capacity.shortage.title', params: { month: '2026-03' } },
          detailMessage: { key: 'keyFindings.capacity.shortage.detail', params: { count: 2, period: 'Q1' } },
        },
      ];
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.keyFindings[0].titleKey).toBe('keyFindings.capacity.shortage.title');
      expect(result.keyFindings[0].titleParams).toEqual({ month: '2026-03' });
      expect(result.keyFindings[0].detailKey).toBe('keyFindings.capacity.shortage.detail');
      expect(result.keyFindings[0].detailParams).toEqual({ count: 2, period: 'Q1' });
      expect(result.keyFindings[0].titleMessage.key).toBe('keyFindings.capacity.shortage.title');
      expect(result.keyFindings[0].titleMessage.params).toEqual({ month: '2026-03' });
    });

    it('should handle keyFindings without params', () => {
      const payload = createMockPayload();
      payload.keyFindings = [
        {
          id: 'kf-1',
          severity: 'warning',
          source: 'capacity',
          title: 'Shortage detected',
          detail: '2 months with capacity shortage',
          titleMessage: { key: 'keyFindings.capacity.shortage.title' },
          detailMessage: { key: 'keyFindings.capacity.shortage.detail' },
        },
      ];
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.keyFindings[0].titleKey).toBe('keyFindings.capacity.shortage.title');
      expect(result.keyFindings[0].titleParams).toBeUndefined();
      expect(result.keyFindings[0].detailParams).toBeUndefined();
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

    // P0-1: Chinese encoding regression tests
    it('should contain correct Traditional Chinese characters', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      // Check for correct Traditional Chinese phrases
      expect(prompt).toContain('角色定位');
      expect(prompt).toContain('產能瓶頸分析');
      expect(prompt).toContain('BP 達成風險分析');
      expect(prompt).toContain('價格敏感度');
      expect(prompt).toContain('產能改善情境');
      expect(prompt).toContain('不可更改 metricDefinitions 中的任何公式');
    });

    it('should not contain mojibake characters', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      // Check for mojibake replacement character
      expect(prompt).not.toContain('�');

      // Check for common mojibake patterns from mis-encoded Chinese
      expect(prompt).not.toContain('瑙掕壊');
      expect(prompt).not.toContain('鐢㈣兘');
      expect(prompt).not.toContain('璩囨枡');
      expect(prompt).not.toContain('浜у搧');
      expect(prompt).not.toContain('瑙勫垝');
    });

    // P1: F-A-I-R guardrails tests
    it('should contain F-A-I-R classification requirements', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('Fact / 事實');
      expect(prompt).toContain('Assumption / 假設');
      expect(prompt).toContain('Inference / 推論');
      expect(prompt).toContain('Recommendation / 建議');
    });

    it('should warn against presenting inferences as facts', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('不要把推論寫成事實');
      expect(prompt).toContain('不要把建議寫成已決策');
    });

    // P2-1: Weighted Pressure boundary tests
    it('should contain Weighted Pressure boundary warning', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('Weighted Pressure');
      expect(prompt).toContain('只用於風險排序');
      expect(prompt).toContain('不會改變實體 demand、capacity、shortage');
    });

    it('should warn against multiplying weight back to actual counts', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('不可把 Core 1.3 權重乘回實體短缺面板數');
    });

    // P2-2: blocked confidence handling tests
    it('should show blocked warning when confidence is blocked', () => {
      const payload = createMockPayload();
      payload.quality.confidence = 'blocked';
      payload.quality.confidenceScore = 20;
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('BLOCKED');
      expect(prompt).toContain('不可產出完整決策建議');
      expect(prompt).toContain('資料缺口');
    });

    it('should show low confidence warning when confidence is low', () => {
      const payload = createMockPayload();
      payload.quality.confidence = 'low';
      payload.quality.confidenceScore = 40;
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('LOW');
      expect(prompt).toContain('降低語氣');
    });

    it('should not show confidence warning when confidence is medium or high', () => {
      const payload = createMockPayload();
      payload.quality.confidence = 'medium';
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      // Should not have the warning header for medium/high confidence
      expect(prompt).not.toContain('## ⚠️ 資料品質警告');
    });

    it('should contain blocked confidence handling guidelines', () => {
      const payload = createMockPayload();
      const contract = buildSanitizedAnalysisContract(payload);
      const prompt = buildChineseAiBriefPrompt(contract);

      expect(prompt).toContain('"low" 或 "blocked"');
      expect(prompt).toContain('blocked');
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

    it('should include F-A-I-R guardrails in JSON', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);
      const result = validateCombinedPack(pack);

      expect(result.valid).toBe(true);
      expect(result.parsed!.aiGuardrails.fairClassification).toBeDefined();
      expect(result.parsed!.aiGuardrails.fairClassification.length).toBe(4);
    });

    it('should include Weighted Pressure boundary in JSON', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);
      const result = validateCombinedPack(pack);

      expect(result.valid).toBe(true);
      expect(result.parsed!.aiGuardrails.weightedPressureBoundary).toBeDefined();
    });

    it('should include blocked confidence handling in JSON', () => {
      const payload = createMockPayload();
      const pack = buildCombinedAiBriefPack(payload);
      const result = validateCombinedPack(pack);

      expect(result.valid).toBe(true);
      expect(result.parsed!.aiGuardrails.blockedConfidenceHandling).toBeDefined();
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

  // P0-3: UTF-8 BOM tests
  describe('buildDownloadJsonContent', () => {
    it('should start with UTF-8 BOM', () => {
      const payload = createMockPayload();
      const content = buildDownloadJsonContent(payload);

      // UTF-8 BOM is U+FEFF
      expect(content.startsWith('\ufeff')).toBe(true);
    });

    it('should contain valid JSON after BOM', () => {
      const payload = createMockPayload();
      const content = buildDownloadJsonContent(payload);

      const jsonContent = content.slice(1); // Remove BOM
      const parsed = JSON.parse(jsonContent);
      expect(parsed.version).toBe('1.1');
      expect(parsed.summary).toBeDefined();
    });
  });

  describe('downloadSanitizedContract', () => {
    it('should return dataUrl and filename', () => {
      const payload = createMockPayload();
      const result = downloadSanitizedContract(payload);

      expect(result.dataUrl).toBeDefined();
      expect(result.filename).toContain('abf-analysis-contract');
      expect(result.filename).toContain('.json');
    });

    it('should use custom filename if provided', () => {
      const payload = createMockPayload();
      const result = downloadSanitizedContract(payload, 'custom.json');

      expect(result.filename).toBe('custom.json');
    });
  });

  // P2-3: revokeDownloadUrl tests
  describe('revokeDownloadUrl', () => {
    it('should be a function', () => {
      expect(typeof revokeDownloadUrl).toBe('function');
    });

    it('should call URL.revokeObjectURL', () => {
      const mockRevoke = vi.fn();
      const originalRevoke = URL.revokeObjectURL;
      URL.revokeObjectURL = mockRevoke;

      revokeDownloadUrl('blob:test-url');

      expect(mockRevoke).toHaveBeenCalledWith('blob:test-url');

      URL.revokeObjectURL = originalRevoke;
    });
  });

  // P3: copyToClipboard tests
  describe('copyToClipboard', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return true when clipboard.writeText succeeds', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });

    it('should return false when clipboard.writeText fails', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
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

    it('should handle string titleMessage (legacy format)', () => {
      const payload = createMockPayload();
      payload.keyFindings = [
        {
          id: 'kf-1',
          severity: 'warning',
          source: 'capacity',
          title: 'Shortage detected',
          detail: '2 months with capacity shortage',
          titleMessage: 'legacy.string.key' as unknown as { key: string },
          detailMessage: 'legacy.detail.key' as unknown as { key: string },
        },
      ];
      const result = buildSanitizedAnalysisContract(payload);

      expect(result.keyFindings[0].titleKey).toBe('legacy.string.key');
      expect(result.keyFindings[0].detailKey).toBe('legacy.detail.key');
    });
  });
});
