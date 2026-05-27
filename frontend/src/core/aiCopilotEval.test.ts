/**
 * AI Copilot Evaluation Harness — Tests
 *
 * Validates the eval harness structure, case coverage, and result shapes.
 * Uses a minimal AiCopilotContext fixture so routeQuestion can execute
 * without external dependencies.
 */

import { describe, it, expect } from 'vitest';
import { getEvalCases, runEvalCase, runAllEvalCases } from './aiCopilotEval';
import type { EvalCase } from './aiCopilotEval';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Fixture — Minimal AiCopilotContext
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
      shortageMonthCount: 0,
      worstBottleneckMonth: null,
      skuCount: 5,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'high',
      confidenceScore: 95,
      status: 'ok',
      issueCount: 0,
      topIssues: [],
    },
    riskBriefSummary: {
      shortageMonths: [],
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
      displayCurrency: 'USD',
      exchangeRateMode: 'constant',
      usdToTwdRate: 32.5,
      usdToCnyRate: 7.25,
    },
    assumptions: ['Working days: 28/month'],
    role: 'owner',
    ...overrides,
  };
}

// ============================================================
// getEvalCases
// ============================================================

describe('getEvalCases', () => {
  it('should return exactly 10 cases', () => {
    const cases = getEvalCases();
    expect(cases.length).toBe(10);
  });

  it('should have required fields for each case', () => {
    const cases = getEvalCases();
    for (const evalCase of cases) {
      expect(evalCase.id).toBeTruthy();
      expect(evalCase.name).toBeTruthy();
      expect(evalCase.question).toBeTruthy();
      expect(evalCase.expectedTool).toBeTruthy();
    }
  });

  it('should cover all 6 tool names', () => {
    const cases = getEvalCases();
    const toolNames = new Set(cases.map(c => c.expectedTool));
    const expectedTools = [
      'inspectDataQuality',
      'explainCapacityRisk',
      'explainBpGap',
      'suggestDataFixes',
      'explainScenarioImpact',
      'buildLookAheadFocus',
    ];
    expect(toolNames.size).toBe(6);
    for (const tool of expectedTools) {
      expect(toolNames.has(tool)).toBe(true);
    }
  });

  it('should have unique case IDs', () => {
    const cases = getEvalCases();
    const ids = cases.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have valid expectedConfidence values', () => {
    const cases = getEvalCases();
    const validConfidences: readonly string[] = ['high', 'medium', 'low'];
    for (const evalCase of cases) {
      expect(validConfidences).toContain(evalCase.expectedConfidence);
    }
  });

  it('should return a defensive copy (not the internal array)', () => {
    const first = getEvalCases();
    const second = getEvalCases();
    expect(first).not.toBe(second);
    expect(first.length).toBe(second.length);
  });

  it('should map each question to the correct tool via the keyword router', () => {
    const ctx = makeContext();
    const cases = getEvalCases();
    for (const evalCase of cases) {
      const report = runAllEvalCases(ctx);
      const match = report.results.find(r => r.caseId === evalCase.id);
      expect(match).toBeDefined();
      expect(match!.actualTool).toBe(evalCase.expectedTool);
    }
  });
});

// ============================================================
// runEvalCase
// ============================================================

describe('runEvalCase', () => {
  it('should return correct EvalResult shape', () => {
    const evalCases = getEvalCases();
    const ctx = makeContext();
    const result = runEvalCase(evalCases[0], ctx);
    expect(typeof result.caseId).toBe('string');
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.actualTool).toBe('string');
    expect(typeof result.actualConfidence).toBe('string');
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should pass when tool name and confidence both match', () => {
    const evalCases = getEvalCases();
    const ctx = makeContext();
    for (const evalCase of evalCases) {
      const result = runEvalCase(evalCase, ctx);
      expect(result.passed).toBe(true);
      expect(result.actualTool).toBe(evalCase.expectedTool);
      expect(result.actualConfidence).toBe(evalCase.expectedConfidence);
    }
  });

  it('should include caseId matching the eval case id', () => {
    const evalCases = getEvalCases();
    const ctx = makeContext();
    for (const evalCase of evalCases) {
      const result = runEvalCase(evalCase, ctx);
      expect(result.caseId).toBe(evalCase.id);
    }
  });

  it('should report failure when tool does not match', () => {
    const ctx = makeContext();
    const badCase: EvalCase = {
      id: 'test-bad',
      name: 'Bad case',
      question: 'What data quality issues exist?',
      expectedTool: 'explainBpGap',
      expectedConfidence: 'high',
      description: 'Intentionally wrong expected tool',
    };
    const result = runEvalCase(badCase, ctx);
    expect(result.passed).toBe(false);
    expect(result.actualTool).toBe('inspectDataQuality');
  });

  it('should not have error field on successful runs', () => {
    const evalCases = getEvalCases();
    const ctx = makeContext();
    const result = runEvalCase(evalCases[0], ctx);
    expect(result.error).toBeUndefined();
  });
});

// ============================================================
// runAllEvalCases
// ============================================================

describe('runAllEvalCases', () => {
  it('should return correct EvalReport shape', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    expect(typeof report.totalCases).toBe('number');
    expect(typeof report.passed).toBe('number');
    expect(typeof report.failed).toBe('number');
    expect(Array.isArray(report.results)).toBe(true);
    expect(typeof report.generatedAt).toBe('string');
  });

  it('should have totalCases equal to results length', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    expect(report.totalCases).toBe(report.results.length);
  });

  it('should have passed + failed equal to totalCases', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    expect(report.passed + report.failed).toBe(report.totalCases);
  });

  it('should pass all 10 cases with a clean high-confidence context', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    expect(report.totalCases).toBe(10);
    expect(report.passed).toBe(10);
    expect(report.failed).toBe(0);
  });

  it('should produce results with valid generatedAt ISO timestamp', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    const parsed = new Date(report.generatedAt);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('should include one result per eval case', () => {
    const ctx = makeContext();
    const report = runAllEvalCases(ctx);
    const evalCases = getEvalCases();
    const resultIds = report.results.map(r => r.caseId);
    const caseIds = evalCases.map(c => c.id);
    expect(resultIds.sort()).toEqual(caseIds.sort());
  });
});
