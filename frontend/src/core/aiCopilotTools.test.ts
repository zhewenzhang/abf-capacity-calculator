import { describe, it, expect } from 'vitest';
import {
  inspectDataQuality,
  explainCapacityRisk,
  explainBpGap,
  suggestDataFixes,
  explainScenarioImpact,
  buildLookAheadFocus,
  routeQuestion,
} from './aiCopilotTools';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helpers — Build minimal AiCopilotContext fixtures
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
      issueCount: 2,
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
// Tool 1: inspectDataQuality
// ============================================================

describe('inspectDataQuality', () => {
  it('should return blocked result when confidence is blocked', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'blocked',
        confidenceScore: 0,
        status: 'error',
        issueCount: 1,
        topIssues: [],
      },
    });
    const result = inspectDataQuality(ctx);
    expect(result.toolName).toBe('inspectDataQuality');
    expect(result.confidence).toBe('blocked');
    expect(result.title).toContain('已封鎖');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should list top issues grouped by decisionImpact (high first)', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'low',
        confidenceScore: 25,
        status: 'error',
        issueCount: 3,
        topIssues: [
          { id: 'low-issue', severity: 'info', domain: 'parameters', decisionImpact: 'low', titleMessage: { key: 'dq.lowIssue' } },
          { id: 'high-issue', severity: 'error', domain: 'forecast', decisionImpact: 'high', titleMessage: { key: 'dq.highIssue' } },
          { id: 'med-issue', severity: 'warning', domain: 'products', decisionImpact: 'medium', titleMessage: { key: 'dq.medIssue' } },
        ],
      },
    });
    const result = inspectDataQuality(ctx);
    expect(result.confidence).toBe('low');
    // Facts should list issues
    expect(result.facts).toEqual(
      expect.arrayContaining([expect.stringContaining('dq.highIssue')])
    );
    // Inferences should mention high impact issues
    expect(result.inferences).toEqual(
      expect.arrayContaining([expect.stringContaining('高影響')])
    );
    // Recommendations should suggest fixing high-impact issues first
    expect(result.recommendations).toEqual(
      expect.arrayContaining([expect.stringContaining('優先修復')])
    );
    // Data should have grouped counts
    expect(result.data.highImpactCount).toBe(1);
    expect(result.data.mediumImpactCount).toBe(1);
    expect(result.data.lowImpactCount).toBe(1);
  });

  it('should handle all issue severities', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'medium',
        confidenceScore: 70,
        status: 'warning',
        issueCount: 2,
        topIssues: [
          { id: 'err-1', severity: 'error', domain: 'capacity', decisionImpact: 'high', titleMessage: { key: 'dq.err1' } },
          { id: 'warn-1', severity: 'warning', domain: 'products', decisionImpact: 'medium', titleMessage: { key: 'dq.warn1' } },
        ],
      },
    });
    const result = inspectDataQuality(ctx);
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('dq.err1')]));
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('dq.warn1')]));
    expect(result.data.highImpactCount).toBe(1);
    expect(result.data.mediumImpactCount).toBe(1);
  });

  it('should have sourceReference to dataQuality module', () => {
    const ctx = makeContext();
    const result = inspectDataQuality(ctx);
    expect(result.sourceReferences).toContain('dataQuality module');
  });

  it('should include assumption that DQ rules are correct', () => {
    const ctx = makeContext();
    const result = inspectDataQuality(ctx);
    expect(result.assumptions).toContain('DQ rules are correct');
  });
});

// ============================================================
// Tool 2: explainCapacityRisk
// ============================================================

describe('explainCapacityRisk', () => {
  it('should identify months with shortage', () => {
    const ctx = makeContext({
      capacitySummary: {
        worstMonth: '2026-03',
        monthlySummaries: [
          { month: '2026-01', coreUtilization: 0.5, buUtilization: 0.4, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
          { month: '2026-02', coreUtilization: 0.95, buUtilization: 0.6, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
          { month: '2026-03', coreUtilization: 1.2, buUtilization: 0.8, coreShortage: 500, buShortage: 0, bottleneck: 'Core' },
        ],
      },
      riskBriefSummary: {
        shortageMonths: ['2026-03'],
        topDrivers: [],
      },
    });
    const result = explainCapacityRisk(ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('短缺月份數: 1')]));
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('2026-03')]));
    expect(result.data.shortageMonthCount).toBe(1);
    expect(result.data.worstMonth).toBe('2026-03');
  });

  it('should identify months with high utilization (>0.9)', () => {
    const ctx = makeContext({
      capacitySummary: {
        worstMonth: '2026-06',
        monthlySummaries: [
          { month: '2026-05', coreUtilization: 0.92, buUtilization: 0.7, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
          { month: '2026-06', coreUtilization: 0.88, buUtilization: 0.95, coreShortage: 0, buShortage: 0, bottleneck: 'BU' },
        ],
      },
    });
    const result = explainCapacityRisk(ctx);
    expect(result.data.highUtilMonthCount).toBe(2);
  });

  it('should return healthy result when no issues', () => {
    const ctx = makeContext({
      capacitySummary: {
        worstMonth: null,
        monthlySummaries: [
          { month: '2026-01', coreUtilization: 0.5, buUtilization: 0.4, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
        ],
      },
    });
    const result = explainCapacityRisk(ctx);
    expect(result.recommendations).toEqual(
      expect.arrayContaining([expect.stringContaining('產能充足')])
    );
    expect(result.data.shortageMonthCount).toBe(0);
  });

  it('should reference calculationEngine + analytics', () => {
    const ctx = makeContext();
    const result = explainCapacityRisk(ctx);
    expect(result.sourceReferences).toContain('calculationEngine + analytics');
  });

  it('should include assumption that capacity plan is current', () => {
    const ctx = makeContext();
    const result = explainCapacityRisk(ctx);
    expect(result.assumptions).toContain('capacity plan is current');
  });
});

// ============================================================
// Tool 3: explainBpGap
// ============================================================

describe('explainBpGap', () => {
  it('should report miss status with gap amount', () => {
    const ctx = makeContext({
      bpSummary: {
        yearly: [
          {
            period: '2026',
            targetMillionTwd: 100,
            forecastMillionTwd: 80,
            attainment: 0.8,
            gapMillionTwd: -20,
            status: 'miss',
          },
        ],
        hasAnyMiss: true,
        worstPeriod: '2026',
      },
    });
    const result = explainBpGap(ctx);
    expect(result.toolName).toBe('explainBpGap');
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('miss')]));
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('-20.0M TWD')]));
    expect(result.data.hasAnyMiss).toBe(true);
    expect(result.data.worstPeriod).toBe('2026');
  });

  it('should report all met when no misses', () => {
    const ctx = makeContext({
      bpSummary: {
        yearly: [
          {
            period: '2026',
            targetMillionTwd: 100,
            forecastMillionTwd: 120,
            attainment: 1.2,
            gapMillionTwd: 20,
            status: 'met',
          },
        ],
        hasAnyMiss: false,
        worstPeriod: null,
      },
    });
    const result = explainBpGap(ctx);
    expect(result.data.hasAnyMiss).toBe(false);
    expect(result.inferences).toEqual(
      expect.arrayContaining([expect.stringContaining('均已達成')])
    );
  });

  it('must include the proportional attribution caveat', () => {
    const ctx = makeContext({
      bpSummary: {
        yearly: [
          { period: '2026', targetMillionTwd: 100, forecastMillionTwd: 70, attainment: 0.7, gapMillionTwd: -30, status: 'miss' },
        ],
        hasAnyMiss: true,
        worstPeriod: '2026',
      },
    });
    const result = explainBpGap(ctx);
    expect(result.caveats).toEqual(
      expect.arrayContaining([expect.stringContaining('比例歸因')])
    );
    expect(result.caveats).toEqual(
      expect.arrayContaining([expect.stringContaining('proportional attribution')])
    );
  });

  it('should reference bpTargets module', () => {
    const ctx = makeContext();
    const result = explainBpGap(ctx);
    expect(result.sourceReferences).toContain('bpTargets module');
  });

  it('should include assumption that BP targets are finalized', () => {
    const ctx = makeContext();
    const result = explainBpGap(ctx);
    expect(result.assumptions).toContain('BP targets are finalized');
  });

  it('should report watch status years', () => {
    const ctx = makeContext({
      bpSummary: {
        yearly: [
          { period: '2026', targetMillionTwd: 100, forecastMillionTwd: 85, attainment: 0.85, gapMillionTwd: -15, status: 'watch' },
        ],
        hasAnyMiss: false,
        worstPeriod: '2026',
      },
    });
    const result = explainBpGap(ctx);
    expect(result.inferences).toEqual(
      expect.arrayContaining([expect.stringContaining('watch')])
    );
  });
});

// ============================================================
// Tool 4: suggestDataFixes
// ============================================================

describe('suggestDataFixes', () => {
  it('should generate fix suggestions for high-impact issues', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'low',
        confidenceScore: 25,
        status: 'error',
        issueCount: 2,
        topIssues: [
          { id: 'forecast-orphan-sku-abc', severity: 'error', domain: 'forecast', decisionImpact: 'high', titleMessage: { key: 'dq.orphan' } },
          { id: 'missing-constant-twd-rate', severity: 'error', domain: 'currency', decisionImpact: 'high', titleMessage: { key: 'dq.twdRate' } },
        ],
      },
    });
    const result = suggestDataFixes(ctx);
    expect(result.toolName).toBe('suggestDataFixes');
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.caveats).toEqual(
      expect.arrayContaining([expect.stringContaining('DRAFT')])
    );
    expect((result.data.fixSuggestions as unknown[]).length).toBe(2);
  });

  it('should return no issues message when no high-impact issues', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'high',
        confidenceScore: 100,
        status: 'ok',
        issueCount: 0,
        topIssues: [],
      },
    });
    const result = suggestDataFixes(ctx);
    expect(result.recommendations).toEqual(
      expect.arrayContaining([expect.stringContaining('無需修復')])
    );
    expect((result.data.fixSuggestions as unknown[]).length).toBe(0);
  });

  it('all suggestions should be marked as drafts', () => {
    const ctx = makeContext({
      dataQualitySummary: {
        confidence: 'medium',
        confidenceScore: 50,
        status: 'warning',
        issueCount: 1,
        topIssues: [
          { id: 'sku-missing-attr-sku1', severity: 'error', domain: 'products', decisionImpact: 'high', titleMessage: { key: 'dq.skuMissing' } },
        ],
      },
    });
    const result = suggestDataFixes(ctx);
    expect(result.caveats).toEqual(
      expect.arrayContaining([expect.stringContaining('DRAFT')])
    );
    const suggestions = result.data.fixSuggestions as Array<{ draft: boolean }>;
    for (const s of suggestions) {
      expect(s.draft).toBe(true);
    }
  });

  it('should reference dataQuality + dataQualityRemediation', () => {
    const ctx = makeContext();
    const result = suggestDataFixes(ctx);
    expect(result.sourceReferences).toContain('dataQuality + dataQualityRemediation');
  });

  it('should include assumption that fix suggestions are based on standard patterns', () => {
    const ctx = makeContext();
    const result = suggestDataFixes(ctx);
    expect(result.assumptions).toContain('fix suggestion is based on standard patterns');
  });
});

// ============================================================
// Tool 5: explainScenarioImpact
// ============================================================

describe('explainScenarioImpact', () => {
  it('should return no-scenario message when scenarioSummary is null', () => {
    const ctx = makeContext({ scenarioSummary: null });
    const result = explainScenarioImpact(ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
    expect(result.summary).toContain('沒有啟動的情境模擬');
    expect(result.data.isActive).toBe(false);
  });

  it('should interpret active scenario with deltas', () => {
    const ctx = makeContext({
      scenarioSummary: {
        isActive: true,
        multipliers: { forecastVolume: 1.1, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
        deltas: {
          totalRevenueUsd: { base: 100000, scenario: 110000, delta: 10000 },
          shortageMonthCount: { base: 2, scenario: 1, delta: -1 },
          bpAttainmentPct: { base: 90, scenario: 95, delta: 5 },
        },
      },
    });
    const result = explainScenarioImpact(ctx);
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('1.1')]));
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('營收變化')]));
    expect(result.data.isActive).toBe(true);
  });

  it('should include scenario engine as source reference', () => {
    const ctx = makeContext({
      scenarioSummary: {
        isActive: true,
        multipliers: { forecastVolume: 0.9, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
        deltas: {
          totalRevenueUsd: { base: 100000, scenario: 90000, delta: -10000 },
          shortageMonthCount: { base: 1, scenario: 2, delta: 1 },
          bpAttainmentPct: { base: 90, scenario: 85, delta: -5 },
        },
      },
    });
    const result = explainScenarioImpact(ctx);
    expect(result.sourceReferences).toContain('scenarioEngine');
  });

  it('should assume scenario multipliers are user-defined', () => {
    const ctx = makeContext({
      scenarioSummary: {
        isActive: true,
        multipliers: { forecastVolume: 1.0, unitPrice: 1.1, coreCapacity: 1.0, buCapacity: 1.0 },
        deltas: {
          totalRevenueUsd: { base: 100, scenario: 110, delta: 10 },
          shortageMonthCount: { base: 0, scenario: 0, delta: 0 },
          bpAttainmentPct: { base: null, scenario: null, delta: null },
        },
      },
    });
    const result = explainScenarioImpact(ctx);
    expect(result.assumptions).toContain('scenario multipliers are user-defined');
  });
});

// ============================================================
// Tool 6: buildLookAheadFocus
// ============================================================

describe('buildLookAheadFocus', () => {
  it('should identify upcoming months with risk', () => {
    // Use months far in the future to ensure they are "upcoming"
    const ctx = makeContext({
      capacitySummary: {
        worstMonth: '2099-03',
        monthlySummaries: [
          { month: '2099-01', coreUtilization: 0.5, buUtilization: 0.4, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
          { month: '2099-02', coreUtilization: 0.95, buUtilization: 0.6, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
          { month: '2099-03', coreUtilization: 1.1, buUtilization: 0.7, coreShortage: 300, buShortage: 0, bottleneck: 'Core' },
          { month: '2099-04', coreUtilization: 0.9, buUtilization: 0.92, coreShortage: 0, buShortage: 100, bottleneck: 'BU' },
          { month: '2099-05', coreUtilization: 0.5, buUtilization: 0.5, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
        ],
      },
    });
    const result = buildLookAheadFocus(ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
    expect(result.facts).toEqual(expect.arrayContaining([expect.stringContaining('需關注月份數')]));
    // Should have at least one concern month (02: high util, 03: shortage, 04: high BU util)
    expect((result.data.concernMonths as unknown[]).length).toBeGreaterThan(0);
  });

  it('should return healthy result when no upcoming risks', () => {
    const ctx = makeContext({
      capacitySummary: {
        worstMonth: null,
        monthlySummaries: [
          { month: '2099-01', coreUtilization: 0.3, buUtilization: 0.2, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
        ],
      },
    });
    const result = buildLookAheadFocus(ctx);
    expect(result.recommendations).toEqual(
      expect.arrayContaining([expect.stringContaining('產能充裕')])
    );
  });

  it('should reference calculationEngine + analytics', () => {
    const ctx = makeContext();
    const result = buildLookAheadFocus(ctx);
    expect(result.sourceReferences).toContain('calculationEngine + analytics');
  });

  it('should include assumption that current capacity plan continues', () => {
    const ctx = makeContext();
    const result = buildLookAheadFocus(ctx);
    expect(result.assumptions).toContain('current capacity plan continues');
  });
});

// ============================================================
// routeQuestion
// ============================================================

describe('routeQuestion', () => {
  const ctx = makeContext();

  it('should route data/quality keywords to inspectDataQuality', () => {
    const result = routeQuestion('What is the data quality?', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('should route "missing" keyword to inspectDataQuality', () => {
    const result = routeQuestion('What data is missing?', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('should route "dirty" keyword to inspectDataQuality', () => {
    const result = routeQuestion('Is my data dirty?', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('should route capacity/shortage keywords to explainCapacityRisk', () => {
    const result = routeQuestion('What is the capacity risk?', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('should route "bottleneck" keyword to explainCapacityRisk', () => {
    const result = routeQuestion('Where is the bottleneck?', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('should route "utilization" keyword to explainCapacityRisk', () => {
    const result = routeQuestion('Show me utilization details', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('should route bp/gap keywords to explainBpGap', () => {
    const result = routeQuestion('What is the BP gap?', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('should route "attainment" keyword to explainBpGap', () => {
    const result = routeQuestion('Show BP attainment', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('should route "target" keyword to explainBpGap', () => {
    const result = routeQuestion('Are we on target?', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('should route fix/clean keywords to suggestDataFixes', () => {
    const result = routeQuestion('How can I fix the errors?', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('should route "suggest" keyword to suggestDataFixes', () => {
    const result = routeQuestion('Suggest improvements', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('should route scenario/what-if keywords to explainScenarioImpact', () => {
    const result = routeQuestion('What if I change the scenario?', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('should route "multiplier" keyword to explainScenarioImpact', () => {
    const result = routeQuestion('What does this multiplier do?', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('should route look-ahead/focus keywords to buildLookAheadFocus', () => {
    const result = routeQuestion('Show me the look ahead', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('should route "upcoming" keyword to buildLookAheadFocus', () => {
    const result = routeQuestion('What are the upcoming risks?', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('should return unknown for unrecognized questions', () => {
    const result = routeQuestion('Hello, how are you?', ctx);
    expect(result.toolName).toBe('unknown');
    expect(result.confidence).toBe('blocked');
    expect(result.title).toBe('無法辨識問題');
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it('should return blocked confidence for unknown questions', () => {
    const result = routeQuestion('xyzzy', ctx);
    expect(result.confidence).toBe('blocked');
    expect(result.caveats).toEqual(
      expect.arrayContaining([expect.stringContaining('本地模式')])
    );
  });
});
