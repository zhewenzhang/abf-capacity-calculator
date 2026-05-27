/**
 * Tests for AI Copilot Prompt Pack Builder
 *
 * Covers:
 * - buildAiCopilotPromptPack returns a string
 * - Prompt contains schema version
 * - Prompt contains app version
 * - Prompt contains data quality section
 * - Prompt contains capacity section
 * - Prompt contains BP section
 * - Prompt contains scenario section when active
 * - Prompt contains currency assumptions
 * - Prompt contains role information
 * - buildCopilotSystemPrompt returns a string
 * - System prompt contains guardrails
 * - System prompt contains tool descriptions
 * - System prompt mentions no-write warning
 * - Prompt handles empty context gracefully
 * - Prompt handles null scenario summary
 */

import { describe, it, expect } from 'vitest';
import {
  buildAiCopilotPromptPack,
  buildCopilotSystemPrompt,
} from './aiCopilotPrompt';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helper
// ============================================================

function makeContext(overrides: Partial<AiCopilotContext> = {}): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    appVersion: 'v1.39.0',
    projectSummary: {
      totalRevenueUsd: 1000000,
      totalForecastPcs: 50000,
      maxCoreUtilization: 0.85,
      maxBuUtilization: 0.7,
      shortageMonthCount: 2,
      worstBottleneckMonth: '2026-05',
      skuCount: 10,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'medium',
      confidenceScore: 72,
      status: 'warning',
      issueCount: 3,
      topIssues: [
        {
          id: 'issue-1',
          severity: 'error',
          domain: 'products',
          decisionImpact: 'high',
          titleMessage: { key: 'dq.missingAttr' },
        },
        {
          id: 'issue-2',
          severity: 'warning',
          domain: 'forecast',
          decisionImpact: 'medium',
          titleMessage: { key: 'dq.partialYear' },
        },
      ],
    },
    riskBriefSummary: {
      shortageMonths: ['2026-05', '2026-06'],
      topDrivers: [
        {
          dimension: 'product',
          label: 'PROD-001',
          metric: 'revenue share',
          value: 500000,
          share: 50,
          severity: 'critical',
          affectedPeriods: ['2026-05'],
        },
      ],
    },
    scenarioSummary: null,
    bpSummary: {
      yearly: [
        {
          period: '2026',
          targetMillionTwd: 200,
          forecastMillionTwd: 180,
          attainment: 0.9,
          gapMillionTwd: -20,
          status: 'watch',
        },
      ],
      hasAnyMiss: false,
      worstPeriod: '2026',
    },
    capacitySummary: {
      monthlySummaries: [
        {
          month: '2026-05',
          coreUtilization: 0.95,
          buUtilization: 0.8,
          coreShortage: 300,
          buShortage: 0,
          bottleneck: 'Core',
        },
      ],
      worstMonth: '2026-05',
    },
    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: 'USD',
      exchangeRateMode: 'constant',
      usdToTwdRate: 32.5,
      usdToCnyRate: 7.25,
    },
    assumptions: [
      'Working days: 28/month',
      'Core steps fixed to 1',
    ],
    role: 'owner',
    ...overrides,
  };
}

// ============================================================
// buildAiCopilotPromptPack
// ============================================================

describe('buildAiCopilotPromptPack', () => {
  it('returns a string', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(typeof result).toBe('string');
  });

  it('contains app version in text', () => {
    const ctx = makeContext({ appVersion: 'v1.39.0' });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('v1.39.0');
  });

  it('contains data quality section header', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('資料品質');
  });

  it('contains data quality confidence and score', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('medium');
    expect(result).toContain('72');
  });

  it('contains data quality issue details', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('dq.missingAttr');
    expect(result).toContain('dq.partialYear');
  });

  it('contains capacity section header', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('產能風險');
  });

  it('contains worst month from capacity summary', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('2026-05');
  });

  it('contains BP section header', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('BP 達成分析');
  });

  it('contains BP yearly data', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('2026');
    expect(result).toContain('200');
    expect(result).toContain('180');
  });

  it('contains currency assumptions section', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('貨幣假設');
    expect(result).toContain('USD');
    expect(result).toContain('32.5');
    expect(result).toContain('7.25');
  });

  it('contains role information', () => {
    const ctx = makeContext({ role: 'editor' });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('editor');
  });

  it('contains AI safety rules section', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('AI 安全規則');
    expect(result).toContain('禁止修改計算公式');
  });

  it('contains risk attribution section with drivers', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('風險歸因');
    expect(result).toContain('PROD-001');
  });

  it('contains assumption conditions', () => {
    const ctx = makeContext();
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('假設條件');
    expect(result).toContain('Working days: 28/month');
  });

  it('includes scenario section when scenario is active', () => {
    const ctx = makeContext({
      scenarioSummary: {
        isActive: true,
        multipliers: {
          forecastVolume: 1.1,
          unitPrice: 1.0,
          coreCapacity: 0.9,
          buCapacity: 1.0,
        },
        deltas: {
          totalRevenueUsd: { base: 1000, scenario: 1100, delta: 100 },
          shortageMonthCount: { base: 2, scenario: 3, delta: 1 },
          bpAttainmentPct: { base: 90, scenario: 85, delta: -5 },
        },
      },
    });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('## 情境分析');
    expect(result).toContain('1.1');
    expect(result).toContain('0.9');
  });

  it('does not include scenario analysis section header when scenario is null', () => {
    const ctx = makeContext({ scenarioSummary: null });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).not.toContain('## 情境分析');
  });

  it('handles empty top issues gracefully', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'high',
        confidenceScore: 95,
        status: 'ok',
        issueCount: 0,
        topIssues: [],
      },
    });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('無重大問題');
  });

  it('handles empty BP yearly array', () => {
    const ctx = makeContext({
      bpSummary: {
        yearly: [],
        hasAnyMiss: false,
        worstPeriod: null,
      },
    });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('所有年度 BP 目標皆已達成');
  });

  it('handles empty risk drivers', () => {
    const ctx = makeContext({
      riskBriefSummary: {
        shortageMonths: [],
        topDrivers: [],
      },
    });
    const result = buildAiCopilotPromptPack(ctx);
    expect(result).toContain('無驅動因子資料');
  });
});

// ============================================================
// buildCopilotSystemPrompt
// ============================================================

describe('buildCopilotSystemPrompt', () => {
  it('returns a string', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(typeof result).toBe('string');
  });

  it('contains identity declaration', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('ABF Capacity Calculator');
    expect(result).toContain('AI 資料分析助手');
  });

  it('contains safety rules about no formula modification', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('禁止修改計算公式');
  });

  it('contains safety rules about no data invention', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('禁止猜測或補充缺失資料');
  });

  it('contains safety rules about currency confusion', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('禁止混淆 USD / TWD / CNY');
  });

  it('contains safety rules about causal distortion', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('比例歸因');
  });

  it('contains blocked confidence rule', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('blocked');
    expect(result).toContain('完整決策建議');
  });

  it('contains low confidence rule', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('low');
    expect(result).toContain('絕對性語氣');
  });

  it('contains FAIR classification rules', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('F-A-I-R');
    expect(result).toContain('Fact');
    expect(result).toContain('Assumption');
    expect(result).toContain('Inference');
    expect(result).toContain('Recommendation');
  });

  it('contains source reference requirement', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('source references');
  });

  it('contains no-write warning about read-only replies', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('人類審閱');
    expect(result).toContain('不可直接驅動系統變更');
  });

  it('contains embedded context JSON', () => {
    const ctx = makeContext();
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('```json');
    expect(result).toContain('schemaVersion');
  });

  it('embeds the context data accurately', () => {
    const ctx = makeContext({ role: 'viewer' });
    const result = buildCopilotSystemPrompt(ctx);
    expect(result).toContain('"viewer"');
  });
});
