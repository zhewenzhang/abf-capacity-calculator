/**
 * Tests for AI Copilot Viewer Role Restrictions
 *
 * Covers:
 * - Viewer cannot see fix suggestions (viewerVisible: false)
 * - Viewer can still use inspectDataQuality
 * - Viewer can still use explainCapacityRisk
 * - Viewer can still use explainBpGap
 * - Viewer can still use explainScenarioImpact
 * - Viewer can still use buildLookAheadFocus
 * - Context builder produces viewer role correctly
 * - Fix draft validation rejects viewer role
 * - Export works for viewer
 * - Owner/editor see fix suggestions
 */

import { describe, it, expect } from 'vitest';
import {
  inspectDataQuality,
  explainCapacityRisk,
  explainBpGap,
  suggestDataFixes,
  explainScenarioImpact,
  buildLookAheadFocus,
} from './aiCopilotTools';
import {
  generateFixDrafts,
  validateDraftForRole,
} from './aiCopilotFixDrafts';
import { buildAiCopilotExportJson, buildAiCopilotCombinedPack } from './aiCopilotExport';
import { validateContext } from './aiCopilotGuardrails';
import type { AiCopilotContext } from './aiCopilotContext';

// ============================================================
// Test Helper
// ============================================================

function makeViewerContext(overrides: Partial<AiCopilotContext> = {}): AiCopilotContext {
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
    role: 'viewer',
    ...overrides,
  };
}

function makeIssue(
  id: string,
  domain: string,
  decisionImpact: 'high' | 'medium' | 'low' = 'high',
  severity: 'error' | 'warning' | 'info' = 'error'
) {
  return {
    id,
    severity,
    domain,
    decisionImpact,
    titleMessage: { key: `dq.${id}` },
  };
}

// ============================================================
// Viewer: tool access (not blocked)
// ============================================================

describe('viewer role — tool access', () => {
  it('viewer can use inspectDataQuality', () => {
    const ctx = makeViewerContext();
    const result = inspectDataQuality(ctx);
    expect(result.toolName).toBe('inspectDataQuality');
    expect(result.confidence).not.toBe('blocked');
  });

  it('viewer can use explainCapacityRisk', () => {
    const ctx = makeViewerContext();
    const result = explainCapacityRisk(ctx);
    expect(result.toolName).toBe('explainCapacityRisk');
    expect(result.confidence).not.toBe('blocked');
  });

  it('viewer can use explainBpGap', () => {
    const ctx = makeViewerContext();
    const result = explainBpGap(ctx);
    expect(result.toolName).toBe('explainBpGap');
    expect(result.confidence).not.toBe('blocked');
  });

  it('viewer can use explainScenarioImpact', () => {
    const ctx = makeViewerContext();
    const result = explainScenarioImpact(ctx);
    expect(result.toolName).toBe('explainScenarioImpact');
  });

  it('viewer can use buildLookAheadFocus', () => {
    const ctx = makeViewerContext();
    const result = buildLookAheadFocus(ctx);
    expect(result.toolName).toBe('buildLookAheadFocus');
  });

  it('viewer can use suggestDataFixes (returns result, not blocked at tool level)', () => {
    const ctx = makeViewerContext();
    const result = suggestDataFixes(ctx);
    expect(result.toolName).toBe('suggestDataFixes');
  });
});

// ============================================================
// Viewer: fix drafts are hidden
// ============================================================

describe('viewer role — fix draft visibility', () => {
  it('viewer fix drafts have viewerVisible: false', () => {
    const ctx = makeViewerContext({
      dataQualitySummary: {
        confidence: 'medium',
        confidenceScore: 60,
        status: 'warning',
        issueCount: 2,
        topIssues: [
          makeIssue('sku-missing-attr-PROD1', 'products', 'high'),
          makeIssue('forecast-orphan-sku-F001', 'forecast', 'high'),
        ],
      },
    });
    const drafts = generateFixDrafts(ctx);
    expect(drafts.drafts.length).toBe(2);
    for (const draft of drafts.drafts) {
      expect(draft.viewerVisible).toBe(false);
    }
  });

  it('owner fix drafts have viewerVisible: true', () => {
    const ctx = makeViewerContext({
      role: 'owner',
      dataQualitySummary: {
        confidence: 'medium',
        confidenceScore: 60,
        status: 'warning',
        issueCount: 1,
        topIssues: [makeIssue('sku-missing-attr-PROD1', 'products', 'high')],
      },
    });
    const drafts = generateFixDrafts(ctx);
    expect(drafts.drafts.length).toBe(1);
    expect(drafts.drafts[0].viewerVisible).toBe(true);
  });

  it('editor fix drafts have viewerVisible: true', () => {
    const ctx = makeViewerContext({
      role: 'editor',
      dataQualitySummary: {
        confidence: 'medium',
        confidenceScore: 60,
        status: 'warning',
        issueCount: 1,
        topIssues: [makeIssue('sku-zero-price-PROD2', 'products', 'high')],
      },
    });
    const drafts = generateFixDrafts(ctx);
    expect(drafts.drafts.length).toBe(1);
    expect(drafts.drafts[0].viewerVisible).toBe(true);
  });
});

// ============================================================
// validateDraftForRole
// ============================================================

describe('validateDraftForRole — viewer rejection', () => {
  const sampleDraft = {
    draftId: 'd-001',
    issueId: 'sku-missing-attr-X',
    affectedEntity: 'sku',
    affectedEntityId: 'X',
    suggestedFields: [],
    reason: 'test',
    sourceReference: 'test',
    requiresHumanConfirmation: true as const,
    riskLevel: 'high' as const,
    viewerVisible: false,
  };

  it('returns false for viewer role', () => {
    expect(validateDraftForRole(sampleDraft, 'viewer')).toBe(false);
  });

  it('returns true for owner role', () => {
    expect(validateDraftForRole(sampleDraft, 'owner')).toBe(true);
  });

  it('returns true for editor role', () => {
    expect(validateDraftForRole(sampleDraft, 'editor')).toBe(true);
  });
});

// ============================================================
// Context validation with viewer role
// ============================================================

describe('viewer role — context validation', () => {
  it('viewer context passes guardrail validation', () => {
    const ctx = makeViewerContext();
    const result = validateContext(ctx);
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('context role field is set to viewer', () => {
    const ctx = makeViewerContext();
    expect(ctx.role).toBe('viewer');
  });
});

// ============================================================
// Export works for viewer
// ============================================================

describe('viewer role — export', () => {
  it('buildAiCopilotExportJson works for viewer context', () => {
    const ctx = makeViewerContext();
    const json = buildAiCopilotExportJson(ctx);
    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.schemaVersion).toBe('1.0');
  });

  it('buildAiCopilotCombinedPack works for viewer context', () => {
    const ctx = makeViewerContext();
    const pack = buildAiCopilotCombinedPack(ctx);
    expect(typeof pack).toBe('string');
    expect(pack).toContain('ABF Capacity Calculator');
    expect(pack).toContain('```json');
  });
});
