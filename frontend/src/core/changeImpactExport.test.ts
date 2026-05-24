/**
 * Change Impact Export tests (Phase 6)
 */

import { describe, it, expect } from 'vitest';
import {
  buildSanitizedChangeImpactPack,
  buildCombinedChangeImpactPack,
  validateChangeImpactPack,
  buildChangeImpactJsonContent,
} from './changeImpactExport';
import type { ChangeImpactResult } from './changeImpact';

// Create mock change impact result for testing
function createMockChangeImpactResult(): ChangeImpactResult {
  return {
    baseSnapshot: {
      id: 'base-1',
      name: 'Baseline',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    targetSnapshot: {
      id: 'target-1',
      name: 'Budget',
      createdAt: '2026-02-01T00:00:00.000Z',
    },
    generatedAt: '2026-05-24T00:00:00.000Z',
    appVersion: 'v1.22.0',
    summary: {
      revenueDelta: {
        base: 1000000,
        target: 1100000,
        delta: 100000,
        deltaPercent: 10,
      },
      bpAttainmentDelta: {
        base: 0.85,
        target: 0.92,
        delta: 0.07,
        deltaPercent: 8.24,
      },
      bpGapDelta: {
        base: -100,
        target: -50,
        delta: 50,
        deltaPercent: 50,
      },
      maxCoreUtilizationDelta: {
        base: 0.85,
        target: 0.9,
        delta: 0.05,
        deltaPercent: 5.88,
      },
      maxBuUtilizationDelta: {
        base: 0.75,
        target: 0.78,
        delta: 0.03,
        deltaPercent: 4,
      },
      shortageMonthDelta: {
        base: 3,
        target: 1,
        delta: -2,
        deltaPercent: -66.67,
      },
      skuCountDelta: {
        base: 10,
        target: 12,
        delta: 2,
        deltaPercent: 20,
      },
      forecastMonthDelta: {
        base: 12,
        target: 12,
        delta: 0,
        deltaPercent: 0,
      },
    },
    priceQuantityAttribution: {
      priceDrivenDeltaUsd: 30000,
      quantityDrivenDeltaUsd: 70000,
      priceDrivenPercent: 30,
      quantityDrivenPercent: 70,
    },
    topChangedCustomers: [
      {
        id: 'TSMC',
        label: 'TSMC',
        baseRevenueUsd: 600000,
        targetRevenueUsd: 700000,
        revenueDeltaUsd: 100000,
        revenueDeltaPercent: 16.67,
        baseForecastPcs: 6000,
        targetForecastPcs: 7000,
        forecastDeltaPcs: 1000,
      },
    ],
    topChangedSkus: [
      {
        id: 'sku-1',
        label: 'SKU-001',
        baseRevenueUsd: 300000,
        targetRevenueUsd: 400000,
        revenueDeltaUsd: 100000,
        revenueDeltaPercent: 33.33,
        baseForecastPcs: 3000,
        targetForecastPcs: 4000,
        forecastDeltaPcs: 1000,
      },
    ],
    topChangedMonths: [
      {
        id: '2026-03',
        label: '2026-03',
        baseRevenueUsd: 100000,
        targetRevenueUsd: 150000,
        revenueDeltaUsd: 50000,
        revenueDeltaPercent: 50,
        baseForecastPcs: 1000,
        targetForecastPcs: 1500,
        forecastDeltaPcs: 500,
      },
    ],
    attributionDisclaimer: 'Test disclaimer',
  };
}

describe('changeImpactExport', () => {
  describe('buildSanitizedChangeImpactPack', () => {
    it('should build sanitized pack with required fields', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.version).toBe('1.0');
      expect(pack.generatedAt).toBe(result.generatedAt);
      expect(pack.appVersion).toBe(result.appVersion);
      expect(pack.baseSnapshot.id).toBe('base-1');
      expect(pack.targetSnapshot.id).toBe('target-1');
    });

    it('should include summary deltas', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.summary.revenueDelta.delta).toBe(100000);
      expect(pack.summary.bpAttainmentDelta.delta).toBe(0.07);
      expect(pack.summary.shortageMonthDelta.delta).toBe(-2);
    });

    it('should include price vs quantity attribution', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.priceQuantityAttribution.priceDrivenDeltaUsd).toBe(30000);
      expect(pack.priceQuantityAttribution.quantityDrivenDeltaUsd).toBe(70000);
    });

    it('should include AI guardrails', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.aiGuardrails).toBeDefined();
      expect(pack.aiGuardrails.attributionWarning).toHaveLength(4);
      expect(pack.aiGuardrails.factVsInference).toHaveLength(4);
      expect(pack.aiGuardrails.noCausalClaims).toHaveLength(4);
    });

    it('should include analysis prompt', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.analysisPrompt).toContain('ABF');
      expect(pack.analysisPrompt).toContain('變更分析');
    });

    it('should sanitize top changed items', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.topChangedCustomers).toHaveLength(1);
      expect(pack.topChangedCustomers[0].label).toBe('TSMC');
      expect(pack.topChangedCustomers[0].revenueDeltaUsd).toBe(100000);

      expect(pack.topChangedSkus).toHaveLength(1);
      expect(pack.topChangedMonths).toHaveLength(1);
    });
  });

  describe('buildCombinedChangeImpactPack', () => {
    it('should contain prompt and JSON fence', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('ABF');
      expect(pack).toContain('```json');
      expect(pack).toContain('```');
    });

    it('should have valid JSON in fence', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      const validationResult = validateChangeImpactPack(pack);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.parsed).toBeDefined();
    });
  });

  describe('buildChangeImpactJsonContent', () => {
    it('should start with UTF-8 BOM', () => {
      const result = createMockChangeImpactResult();
      const content = buildChangeImpactJsonContent(result);

      // UTF-8 BOM is U+FEFF
      expect(content.startsWith('﻿')).toBe(true);
    });

    it('should contain valid JSON after BOM', () => {
      const result = createMockChangeImpactResult();
      const content = buildChangeImpactJsonContent(result);

      const jsonContent = content.slice(1); // Remove BOM
      const parsed = JSON.parse(jsonContent);
      expect(parsed.version).toBe('1.0');
      expect(parsed.summary).toBeDefined();
    });
  });

  describe('validateChangeImpactPack', () => {
    it('should return valid for correct pack', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);
      const validationResult = validateChangeImpactPack(pack);

      expect(validationResult.valid).toBe(true);
      expect(validationResult.error).toBeUndefined();
    });

    it('should return error for missing JSON fence', () => {
      const validationResult = validateChangeImpactPack('no json here');

      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toContain('JSON fence not found');
    });

    it('should return error for invalid JSON', () => {
      const validationResult = validateChangeImpactPack('```json\nnot valid json\n```');

      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toContain('JSON parse error');
    });

    it('should return error for missing version field', () => {
      const validationResult = validateChangeImpactPack('```json\n{"summary": {}}\n```');

      expect(validationResult.valid).toBe(false);
      expect(validationResult.error).toContain('Missing version field');
    });
  });

  describe('attribution warnings', () => {
    it('should warn against causal claims', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      const noCausalWarning = pack.aiGuardrails.noCausalClaims.some(w =>
        w.includes('caused') || w.includes('因果') || w.includes('responsibility')
      );
      expect(noCausalWarning).toBe(true);
    });

    it('should distinguish fact vs inference', () => {
      const result = createMockChangeImpactResult();
      const pack = buildSanitizedChangeImpactPack(result);

      expect(pack.aiGuardrails.factVsInference).toBeDefined();
      expect(pack.aiGuardrails.factVsInference.some(w => w.includes('Fact') || w.includes('事實'))).toBe(true);
      expect(pack.aiGuardrails.factVsInference.some(w => w.includes('Inference') || w.includes('推論'))).toBe(true);
    });
  });

  describe('Phase 6.1 DeepSeek prompt enhancements', () => {
    it('should include snapshot compare direction (Target - Base)', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('Target − Base');
      expect(pack).toContain('目標快照 − 基準快照');
      expect(pack).toContain('Base Snapshot');
      expect(pack).toContain('Target Snapshot');
    });

    it('should include F-A-I-R classification', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('Fact / 事實');
      expect(pack).toContain('Attribution / 比例歸因');
      expect(pack).toContain('Inference / 推論');
      expect(pack).toContain('Recommendation / 建議');
    });

    it('should include proportional-not-causal warning', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('比例分攤');
      expect(pack).toContain('不是因果關係');
      expect(pack).toContain('一階拆解');
      expect(pack).toContain('不是完整因果模型');
    });

    it('should include currency / BP unit warning', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('USD');
      expect(pack).toContain('百萬 TWD');
      expect(pack).toContain('不可直接比較');
    });

    it('should include no formula modification warning', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('不可修改公式');
      expect(pack).toContain('不可假設不同的計算邏輯');
    });

    it('should include no data supplementation warning', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('不可補充缺失資料');
      expect(pack).toContain('不可自行假設或補充');
    });

    it('should include human review requirement', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('需要人類確認');
      expect(pack).toContain('Questions for Human Review');
    });

    it('should include suggested output format', () => {
      const result = createMockChangeImpactResult();
      const pack = buildCombinedChangeImpactPack(result);

      expect(pack).toContain('Executive Summary');
      expect(pack).toContain('What Changed');
      expect(pack).toContain('Business Impact');
      expect(pack).toContain('Capacity Risk Impact');
      expect(pack).toContain('Top Changes Analysis');
      expect(pack).toContain('Data Caveats');
    });
  });
});
