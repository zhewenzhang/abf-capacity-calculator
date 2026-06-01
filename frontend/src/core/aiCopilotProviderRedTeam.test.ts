import { describe, it, expect } from 'vitest';
import { getProviderById } from './aiProviderAdapter';
import type { AiProviderAdapter, ProviderConfig, ProviderRequest } from './aiProviderAdapter';
import { validateProviderOutput } from './aiCopilotOutputValidation';
import { buildProviderPromptPack } from './aiProviderPromptPack';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helpers
// ============================================================

function makeContext(): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-05-27T00:00:00Z',
    appVersion: '1.40.0-test',
    projectSummary: {
      totalRevenueUsd: 3000000,
      totalForecastPcs: 100000,
      maxCoreUtilization: 0.88,
      maxBuUtilization: 0.75,
      shortageMonthCount: 1,
      worstBottleneckMonth: '2026-07',
      skuCount: 8,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'high',
      confidenceScore: 92,
      status: 'ok',
      issueCount: 0,
      topIssues: [],
    },
    riskBriefSummary: {
      shortageMonths: ['2026-07'],
      topDrivers: [],
    },
    scenarioSummary: null,
    bpSummary: {
      yearly: [],
      hasAnyMiss: false,
      worstPeriod: null,
    },
    capacitySummary: {
      monthlySummaries: [],
      worstMonth: null,
    },
    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: 'TWD',
      exchangeRateMode: 'constant',
      usdToTwdRate: 32.0,
      usdToCnyRate: 7.25,
    },
    assumptions: [],
    role: 'owner',
  } as unknown as AiCopilotContext;
}

function getMockProvider(): AiProviderAdapter {
  const provider = getProviderById('mock');
  if (!provider) throw new Error('Mock provider not found');
  return provider;
}

function getProxyProvider(): AiProviderAdapter {
  const provider = getProviderById('deepseek-proxy');
  if (!provider) throw new Error('Proxy provider not found');
  return provider;
}

// ============================================================
// Provider-Specific Red Team Tests
// ============================================================

describe('AI Copilot Provider Red Team Tests', () => {
  // -----------------------------------------------------------------------
  // 1. Mock provider returns safe content
  // -----------------------------------------------------------------------
  it('1. Mock provider completion output passes validation', async () => {
    const mock = getMockProvider();
    const config: ProviderConfig = { providerId: 'mock' };
    const request: ProviderRequest = {
      systemPrompt: 'Analyze capacity data.',
      userMessage: 'What is the capacity risk?',
      context: {},
      maxTokens: 2000,
    };

    const response = await mock.runCompletion(config, request);
    const validation = validateProviderOutput(response.content);

    // Mock provider output should not trigger any blocked violations
    expect(validation.status).not.toBe('blocked');
    expect(response.confidence).not.toBe('blocked');
  });

  // -----------------------------------------------------------------------
  // 2. Proxy provider validates config successfully (no API key required)
  // -----------------------------------------------------------------------
  it('2. Proxy provider validates config successfully without API key', () => {
    const proxy = getProxyProvider();
    const config: ProviderConfig = { providerId: 'deepseek-proxy' };
    const result = proxy.validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // 3. Proxy provider does not require API key
  // -----------------------------------------------------------------------
  it('3. Proxy provider does not require API key', () => {
    const proxy = getProxyProvider();
    expect(proxy.capabilities.requiresApiKey).toBe(false);

    // Config without API key is valid
    const resultNoKey = proxy.validateConfig({
      providerId: 'deepseek-proxy',
    });
    expect(resultNoKey.valid).toBe(true);

    // Empty config is also valid
    const resultEmpty = proxy.validateConfig({ providerId: '' });
    expect(resultEmpty.valid).toBe(true);
  });

  // -----------------------------------------------------------------------
  // 4. Provider prompt pack has no-write rule
  // -----------------------------------------------------------------------
  it('4. Provider prompt pack contains no-write or "do not save" guardrail', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'Analyze the data', 'mock');

    const guardrailsText = pack.guardrails.join('\n').toLowerCase();
    const hasNoWrite =
      guardrailsText.includes('no-write') ||
      guardrailsText.includes('do not save') ||
      guardrailsText.includes('do not auto-save') ||
      guardrailsText.includes('do not modify');

    expect(hasNoWrite).toBe(true);

    // Also check forbidden operations
    const forbiddenText = pack.forbiddenOperations.join('\n').toLowerCase();
    expect(forbiddenText).toContain('save');
    expect(forbiddenText).toContain('write');
  });

  // -----------------------------------------------------------------------
  // 5. Provider prompt pack has no-fabrication rule
  // -----------------------------------------------------------------------
  it('5. Provider prompt pack contains "do not fabricate" or "do not invent" guardrail', () => {
    const ctx = makeContext();
    const pack = buildProviderPromptPack(ctx, 'Analyze the data', 'mock');

    const guardrailsText = pack.guardrails.join('\n').toLowerCase();
    const hasNoFabrication =
      guardrailsText.includes('do not fabricate') ||
      guardrailsText.includes('do not invent') ||
      guardrailsText.includes('not fabricate') ||
      guardrailsText.includes('not invent');

    expect(hasNoFabrication).toBe(true);
  });
});
