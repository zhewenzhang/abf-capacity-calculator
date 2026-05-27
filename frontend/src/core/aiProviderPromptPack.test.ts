/**
 * Tests for AI Provider Prompt Pack Builder (v1.40.0)
 *
 * Covers:
 * - buildProviderPromptPack returns correct shape
 * - System prompt contains guardrails
 * - System prompt contains source references
 * - System prompt contains no-write instruction
 * - System prompt contains FAIR format
 * - System prompt contains currency rules
 * - System prompt contains attribution warning
 * - User message contains question
 * - User message contains context summary
 * - No sensitive keys in output
 * - Different modes produce different notes
 * - Empty question handled
 * - Guardrails array has at least 10 items
 * - Allowed operations listed
 * - Forbidden operations listed
 * - buildProviderSystemPrompt returns string
 * - buildProviderUserMessage returns string
 */

import { describe, it, expect } from 'vitest';
import {
  buildProviderPromptPack,
  buildProviderSystemPrompt,
  buildProviderUserMessage,
} from './aiProviderPromptPack';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helper
// ============================================================

function makeContext(overrides: Partial<AiCopilotContext> = {}): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    appVersion: 'v1.40.0',
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
// buildProviderPromptPack
// ============================================================

describe('buildProviderPromptPack', () => {
  it('returns ProviderPromptPack shape with all required fields', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'What is the capacity risk?', 'local');
    expect(pack).toHaveProperty('systemPrompt');
    expect(pack).toHaveProperty('userMessage');
    expect(pack).toHaveProperty('guardrails');
    expect(pack).toHaveProperty('allowedOperations');
    expect(pack).toHaveProperty('forbiddenOperations');
    expect(pack).toHaveProperty('outputFormat');
  });

  it('system prompt contains guardrails', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('Do not fabricate or invent data');
    expect(pack.systemPrompt).toContain('Do not suggest external API calls');
    expect(pack.systemPrompt).toContain('Do not auto-save');
    expect(pack.systemPrompt).toContain('Do not modify Firestore');
    expect(pack.systemPrompt).toContain('Do not modify calculation formulas');
    expect(pack.systemPrompt).toContain('Do not guess');
    expect(pack.systemPrompt).toContain('Do not confuse USD / TWD / CNY');
    expect(pack.systemPrompt).toContain('Do not claim proportional attribution as causation');
    expect(pack.systemPrompt).toContain('All suggestions and recommendations require explicit human confirmation');
    expect(pack.systemPrompt).toContain('Low confidence must downgrade');
  });

  it('system prompt contains source references', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('[projectSummary]');
    expect(pack.systemPrompt).toContain('[dataQualitySummary]');
    expect(pack.systemPrompt).toContain('[capacitySummary]');
    expect(pack.systemPrompt).toContain('[bpSummary]');
    expect(pack.systemPrompt).toContain('[riskBriefSummary]');
    expect(pack.systemPrompt).toContain('[scenarioSummary]');
    expect(pack.systemPrompt).toContain('[currencyAssumptions]');
    expect(pack.systemPrompt).toContain('[assumptions]');
  });

  it('system prompt contains no-write instruction', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('No-Write Requirement');
    expect(pack.systemPrompt).toContain('human review only');
    expect(pack.systemPrompt).toContain('Please confirm before proceeding');
  });

  it('system prompt contains FAIR format instructions', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('F-A-I-R');
    expect(pack.systemPrompt).toContain('[Fact]');
    expect(pack.systemPrompt).toContain('[Assumption]');
    expect(pack.systemPrompt).toContain('[Inference]');
    expect(pack.systemPrompt).toContain('[Recommendation]');
  });

  it('system prompt contains currency rules', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('Currency / BP Rules');
    expect(pack.systemPrompt).toContain('Always convert currency units before comparison');
    expect(pack.systemPrompt).toContain('state the conversion rate');
  });

  it('system prompt contains attribution warning', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('Attribution Warning');
    expect(pack.systemPrompt).toContain('Proportional patterns are NOT causation');
    expect(pack.systemPrompt).toContain('Never state or imply that a SKU');
  });

  it('user message contains the question', () => {
    const ctx = makeContext();
    const question = 'What are the top capacity risks for Q2 2026?';
    const pack = buildProviderPromptPack(ctx, question, 'local');
    expect(pack.userMessage).toContain(question);
  });

  it('user message contains context summary', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.userMessage).toContain('Project Summary');
    expect(pack.userMessage).toContain('1,000,000');
    expect(pack.userMessage).toContain('Data Quality');
    expect(pack.userMessage).toContain('Capacity Risk');
    expect(pack.userMessage).toContain('BP Attainment');
    expect(pack.userMessage).toContain('Risk Attribution');
    expect(pack.userMessage).toContain('Currency Assumptions');
  });

  it('no sensitive keys in output', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    const allText = pack.systemPrompt + pack.userMessage;
    expect(allText).not.toContain('uid');
    expect(allText).not.toContain('email');
    expect(allText).not.toContain('token');
    expect(allText).not.toContain('apiKey');
    expect(allText).not.toContain('secret');
    expect(allText).not.toContain('password');
    expect(allText).not.toContain('workspaceId');
    expect(allText).not.toContain('userId');
    expect(allText).not.toContain('ownerUid');
  });

  it('different modes produce different notes', () => {
    const ctx = makeContext();
    const localPack = buildProviderPromptPack(ctx, 'q', 'local');
    const mockPack = buildProviderPromptPack(ctx, 'q', 'mock');
    const byokPack = buildProviderPromptPack(ctx, 'q', 'external-byok');

    expect(localPack.systemPrompt).toContain('Running in local deterministic mode');
    expect(mockPack.systemPrompt).toContain('Running in mock provider mode');
    expect(mockPack.systemPrompt).toContain('deterministic test data');
    expect(byokPack.systemPrompt).toContain('External provider mode');
    expect(byokPack.systemPrompt).toContain('extra strictness');

    expect(localPack.systemPrompt).not.toContain('mock provider mode');
    expect(mockPack.systemPrompt).not.toContain('local deterministic mode');
    expect(byokPack.systemPrompt).not.toContain('local deterministic mode');
  });

  it('handles empty question gracefully', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, '', 'local');
    expect(pack.userMessage).toContain('User Question: ');
    expect(typeof pack.systemPrompt).toBe('string');
    expect(typeof pack.userMessage).toBe('string');
  });

  it('guardrails array has at least 10 items', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.guardrails.length).toBeGreaterThanOrEqual(10);
  });

  it('allowed operations are listed', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.allowedOperations).toContain('analyze');
    expect(pack.allowedOperations).toContain('explain');
    expect(pack.allowedOperations).toContain('compare');
    expect(pack.allowedOperations).toContain('recommend');
    expect(pack.allowedOperations).toContain('suggest fixes (draft only)');
  });

  it('forbidden operations are listed', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.forbiddenOperations).toContain('save');
    expect(pack.forbiddenOperations).toContain('write');
    expect(pack.forbiddenOperations).toContain('delete');
    expect(pack.forbiddenOperations).toContain('modify');
    expect(pack.forbiddenOperations).toContain('create');
    expect(pack.forbiddenOperations).toContain('auto-save');
  });

  it('output format field contains FAIR instructions', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.outputFormat).toContain('F-A-I-R');
    expect(pack.outputFormat).toContain('[Fact]');
    expect(pack.outputFormat).toContain('[Assumption]');
    expect(pack.outputFormat).toContain('[Inference]');
    expect(pack.outputFormat).toContain('[Recommendation]');
  });

  it('system prompt contains identity declaration', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('ABF Capacity Calculator AI assistant');
    expect(pack.systemPrompt).toContain('analyze capacity planning data');
  });

  it('system prompt contains context data from the input', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'test question', 'local');
    expect(pack.systemPrompt).toContain('medium');
    expect(pack.systemPrompt).toContain('72');
    expect(pack.systemPrompt).toContain('PROD-001');
  });
});

// ============================================================
// buildProviderSystemPrompt
// ============================================================

describe('buildProviderSystemPrompt', () => {
  it('returns a string', () => {
    const ctx = makeContext();
    const result = buildProviderSystemPrompt(ctx, 'local');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains identity and mode', () => {
    const ctx = makeContext();
    const result = buildProviderSystemPrompt(ctx, 'mock');
    expect(result).toContain('ABF Capacity Calculator');
    expect(result).toContain('mock provider mode');
  });
});

// ============================================================
// buildProviderUserMessage
// ============================================================

describe('buildProviderUserMessage', () => {
  it('returns a string', () => {
    const ctx = makeContext();
    const result = buildProviderUserMessage(ctx, 'What is the bottleneck?');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains the question', () => {
    const ctx = makeContext();
    const result = buildProviderUserMessage(ctx, 'What is the bottleneck?');
    expect(result).toContain('What is the bottleneck?');
  });

  it('contains FAIR response request', () => {
    const ctx = makeContext();
    const result = buildProviderUserMessage(ctx, 'test');
    expect(result).toContain('FAIR-labeled response');
    expect(result).toContain('source references');
  });

  it('contains context data', () => {
    const ctx = makeContext();
    const result = buildProviderUserMessage(ctx, 'test');
    expect(result).toContain('Project Summary');
    expect(result).toContain('1,000,000');
    expect(result).toContain('Currency Assumptions');
  });
});
