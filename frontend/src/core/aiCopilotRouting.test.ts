/**
 * Tests for AI Copilot Routing — routeQuestion() from aiCopilotTools.ts
 *
 * Covers:
 * - Each of the 6 keyword categories maps to the correct tool
 * - Case insensitivity
 * - Partial keyword matching
 * - Fallback for unknown questions
 * - Mixed keywords (priority ordering)
 * - Empty string handling
 * - Very long question handling
 * - Special characters
 * - Stop-word-only questions
 * - runTool dispatch by tool ID
 */

import { describe, it, expect } from 'vitest';
import { routeQuestion, runTool } from './aiCopilotTools';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helper — Minimal AiCopilotContext fixture
// ============================================================

function makeContext(overrides: Partial<AiCopilotContext> = {}): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    appVersion: 'v1.39.0',
    projectSummary: {
      totalRevenueUsd: 500000,
      totalForecastPcs: 25000,
      maxCoreUtilization: 0.88,
      maxBuUtilization: 0.65,
      shortageMonthCount: 1,
      worstBottleneckMonth: '2026-04',
      skuCount: 3,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'medium',
      confidenceScore: 72,
      status: 'warning',
      issueCount: 1,
      topIssues: [
        {
          id: 'high-issue',
          severity: 'error',
          domain: 'products',
          decisionImpact: 'high',
          titleMessage: { key: 'dq.missingAttr' },
        },
      ],
    },
    riskBriefSummary: {
      shortageMonths: ['2026-04'],
      topDrivers: [],
    },
    scenarioSummary: null,
    bpSummary: {
      yearly: [
        {
          period: '2026',
          targetMillionTwd: 100,
          forecastMillionTwd: 85,
          attainment: 0.85,
          gapMillionTwd: -15,
          status: 'miss',
        },
      ],
      hasAnyMiss: true,
      worstPeriod: '2026',
    },
    capacitySummary: {
      monthlySummaries: [
        {
          month: '2026-04',
          coreUtilization: 0.95,
          buUtilization: 0.7,
          coreShortage: 500,
          buShortage: 0,
          bottleneck: 'Core',
        },
      ],
      worstMonth: '2026-04',
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
// routeQuestion — keyword category routing
// ============================================================

describe('routeQuestion — data quality keywords', () => {
  it('routes "data" keyword to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('data', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes "quality" keyword to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('quality check', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes "missing" keyword to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('missing values', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes "dirty" keyword to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('dirty data everywhere', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes "problem" keyword to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('problem with forecast', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });
});

describe('routeQuestion — capacity keywords', () => {
  it('routes "capacity" keyword to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('capacity analysis', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes "shortage" keyword to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('shortage report', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes "utilization" keyword to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('utilization trends', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes "bottleneck" keyword to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('bottleneck detection', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });
});

describe('routeQuestion — BP keywords', () => {
  it('routes "bp" keyword to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('bp status', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('routes "gap" keyword to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('gap analysis', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('routes "attainment" keyword to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('attainment rate', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('routes "target" keyword to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('target review', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });
});

describe('routeQuestion — fix keywords', () => {
  it('routes "fix" keyword to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = routeQuestion('fix this issue', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('routes "clean" keyword to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = routeQuestion('clean up entries', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('routes "repair" keyword to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = routeQuestion('please repair the entries', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('routes "suggest" keyword to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = routeQuestion('suggest improvements', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });
});

describe('routeQuestion — scenario keywords', () => {
  it('routes "scenario" keyword to explainScenarioImpact', () => {
    const ctx = makeContext();
    const result = routeQuestion('scenario simulation', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('routes "what if" keyword to explainScenarioImpact', () => {
    const ctx = makeContext();
    const result = routeQuestion('what if volume increases', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('routes "multiplier" keyword to explainScenarioImpact', () => {
    const ctx = makeContext();
    const result = routeQuestion('multiplier effect', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });
});

describe('routeQuestion — look-ahead keywords', () => {
  it('routes "look ahead" keyword to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = routeQuestion('look ahead planning', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('routes "focus" keyword to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = routeQuestion('focus on next quarter', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('routes "upcoming" keyword to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = routeQuestion('upcoming months', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });
});

// ============================================================
// routeQuestion — edge cases
// ============================================================

describe('routeQuestion — case insensitivity', () => {
  it('routes uppercase "DATA" to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('DATA QUALITY CHECK', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes mixed case "CaPaCiTy" to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('CaPaCiTy risk', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes mixed case "Bottleneck" to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('Bottleneck Analysis Report', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });
});

describe('routeQuestion — unknown / fallback', () => {
  it('returns unknown toolName for unrecognized question', () => {
    const ctx = makeContext();
    const result = routeQuestion('hello world', ctx);
    expect(result.toolName).toBe('unknown');
    expect(result.confidence).toBe('blocked');
  });

  it('returns unknown with export recommendation for unrecognized question', () => {
    const ctx = makeContext();
    const result = routeQuestion('xyzzy', ctx);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.includes('Export'))).toBe(true);
  });
});

describe('routeQuestion — empty and whitespace', () => {
  it('routes empty string to unknown', () => {
    const ctx = makeContext();
    const result = routeQuestion('', ctx);
    expect(result.toolName).toBe('unknown');
  });

  it('routes whitespace-only string to unknown', () => {
    const ctx = makeContext();
    const result = routeQuestion('   \t\n  ', ctx);
    expect(result.toolName).toBe('unknown');
  });
});

describe('routeQuestion — mixed keyword priority', () => {
  it('data quality keywords take priority over capacity keywords', () => {
    const ctx = makeContext();
    const result = routeQuestion('data quality and capacity risk', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('capacity keywords take priority over BP keywords', () => {
    const ctx = makeContext();
    const result = routeQuestion('capacity shortage and bp gap', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('BP keywords take priority over fix keywords', () => {
    const ctx = makeContext();
    const result = routeQuestion('bp attainment gap needs fix', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });
});

describe('routeQuestion — special characters and long input', () => {
  it('handles question with special characters', () => {
    const ctx = makeContext();
    const result = routeQuestion('data quality @#$%^&*()', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('handles very long question with keyword', () => {
    const ctx = makeContext();
    const longPrefix = 'a'.repeat(5000);
    const result = routeQuestion(`${longPrefix} capacity analysis`, ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('handles question with only stop words', () => {
    const ctx = makeContext();
    const result = routeQuestion('the a an is are was were', ctx);
    expect(result.toolName).toBe('unknown');
  });
});

// ============================================================
// runTool — dispatch by tool ID
// ============================================================

describe('runTool — dispatch by tool ID', () => {
  it('dispatches dataProblems to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = runTool('dataProblems', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('dispatches capacityRisk to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = runTool('capacityRisk', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('dispatches bpGap to explainBpGap', () => {
    const ctx = makeContext();
    const result = runTool('bpGap', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('dispatches suggestFixes to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = runTool('suggestFixes', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('dispatches scenarioImpact to explainScenarioImpact', () => {
    const ctx = makeContext();
    const result = runTool('scenarioImpact', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('dispatches lookAhead to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = runTool('lookAhead', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('falls back to routeQuestion for unknown tool ID', () => {
    const ctx = makeContext();
    const result = runTool('unknownTool', ctx);
    expect(result.toolName).toBe('unknown');
  });

  it('falls back to routeQuestion and routes keyword from tool ID', () => {
    const ctx = makeContext();
    const result = runTool('capacity shortage analysis', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });
});

// ============================================================
// routeQuestion — Traditional Chinese keywords
// ============================================================

describe('routeQuestion — Traditional Chinese keywords', () => {
  it('routes "資料品質" to inspectDataQuality', () => {
    const ctx = makeContext();
    const result = routeQuestion('資料品質如何？', ctx);
    expect(result.toolName).toBe('inspectDataQuality');
  });

  it('routes "產能" to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('產能是否有風險？', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes "瓶頸" to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('瓶頸在哪裡？', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('routes "差距" to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('BP 差距分析', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('routes "達成" to explainBpGap', () => {
    const ctx = makeContext();
    const result = routeQuestion('目標達成率', ctx);
    expect(result.toolName).toBe('explainBpGap');
  });

  it('routes "修復" to suggestDataFixes', () => {
    const ctx = makeContext();
    const result = routeQuestion('請提供修復建議', ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });

  it('routes "情境" to explainScenarioImpact', () => {
    const ctx = makeContext();
    const result = routeQuestion('情境模擬結果', ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('routes "前瞻" to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = routeQuestion('前瞻分析', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('routes "未來" to buildLookAheadFocus', () => {
    const ctx = makeContext();
    const result = routeQuestion('未來六個月的風險', ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('routes "短缺" to explainCapacityRisk', () => {
    const ctx = makeContext();
    const result = routeQuestion('是否有短缺月份？', ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
  });

  it('returns unknown with improved fallback for unrecognized Chinese question', () => {
    const ctx = makeContext();
    const result = routeQuestion('你好世界', ctx);
    expect(result.toolName).toBe('unknown');
    expect(result.caveats.some(c => c.includes('可回答的問題類型'))).toBe(true);
    expect(result.recommendations.some(r => r.includes('關鍵字'))).toBe(true);
  });
});
