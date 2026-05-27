/**
 * Tests for AI Copilot Fix Drafts (v1.38.0)
 *
 * Verifies:
 * - generateFixDrafts returns correct number of drafts
 * - All drafts have requiresHumanConfirmation: true
 * - Viewer role: all drafts have viewerVisible: false
 * - Owner/Editor role: drafts have viewerVisible: true
 * - No invented values — suggestedValues are placeholders or null
 * - validateDraftForRole: viewer always false, owner/editor always true
 * - formatDraftSummary returns correct format
 * - Empty context (no issues) returns empty draft set
 */

import { describe, it, expect } from 'vitest';
import {
  generateFixDrafts,
  validateDraftForRole,
  formatDraftSummary,
} from './aiCopilotFixDrafts';
import type { AiCopilotContext } from './aiCopilotContext';
import type { CopilotFixDraft, CopilotFixDraftSet } from './aiCopilotFixDrafts';
import type { WorkspaceRole } from '../types';

// ============================================================
// Helpers
// ============================================================

function makeContext(
  topIssues: AiCopilotContext['dataQualitySummary']['topIssues'],
  role: WorkspaceRole = 'owner'
): AiCopilotContext {
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    appVersion: 'v1.38.0',
    projectSummary: {
      totalRevenueUsd: 1000000,
      totalForecastPcs: 50000,
      maxCoreUtilization: 0.95,
      maxBuUtilization: 0.8,
      shortageMonthCount: 0,
      worstBottleneckMonth: null,
      skuCount: 5,
      forecastMonthCount: 12,
    },
    dataQualitySummary: {
      confidence: 'medium',
      confidenceScore: 70,
      status: 'warning',
      issueCount: topIssues.length,
      topIssues,
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
      usdToTwdRate: 32.0,
      usdToCnyRate: 7.2,
    },
    assumptions: [],
    role,
  };
}

function makeIssue(
  id: string,
  domain: string,
  severity: 'error' | 'warning' | 'info' = 'error',
  decisionImpact: 'high' | 'medium' | 'low' = 'high'
): AiCopilotContext['dataQualitySummary']['topIssues'][number] {
  return {
    id,
    severity,
    domain,
    decisionImpact,
    titleMessage: { key: `title.${id}` },
  };
}

// ============================================================
// Tests
// ============================================================

describe('aiCopilotFixDrafts', () => {
  describe('generateFixDrafts', () => {
    it('returns correct number of drafts for each issue', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('missing-constant-twd-rate', 'currency', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.totalDrafts).toBe(3);
      expect(result.drafts).toHaveLength(3);
    });

    it('all drafts have requiresHumanConfirmation: true', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('forecast-partial-year-sku3-2026', 'forecast', 'warning', 'medium'),
        makeIssue('forecast-missing-capacity', 'capacity', 'error', 'high'),
        makeIssue('missing-constant-cny-rate', 'currency', 'error', 'high'),
        makeIssue('forecast-missing-bp-target-2027', 'bp', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      for (const draft of result.drafts) {
        expect(draft.requiresHumanConfirmation).toBe(true);
      }
    });

    it('viewer role: all drafts have viewerVisible: false', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('forecast-missing-capacity', 'capacity', 'error', 'high'),
      ];
      const ctx = makeContext(issues, 'viewer');
      const result = generateFixDrafts(ctx);

      expect(result.drafts.length).toBeGreaterThan(0);
      for (const draft of result.drafts) {
        expect(draft.viewerVisible).toBe(false);
      }
    });

    it('owner role: drafts have viewerVisible: true', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues, 'owner');
      const result = generateFixDrafts(ctx);

      for (const draft of result.drafts) {
        expect(draft.viewerVisible).toBe(true);
      }
    });

    it('editor role: drafts have viewerVisible: true', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
      ];
      const ctx = makeContext(issues, 'editor');
      const result = generateFixDrafts(ctx);

      for (const draft of result.drafts) {
        expect(draft.viewerVisible).toBe(true);
      }
    });

    it('no invented values — suggestedValues are placeholders or null', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('missing-constant-twd-rate', 'currency', 'error', 'high'),
        makeIssue('missing-yearly-cny-rate', 'currency', 'error', 'high'),
        makeIssue('forecast-missing-bp-target-2027', 'bp', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      for (const draft of result.drafts) {
        for (const field of draft.suggestedFields) {
          // suggestedValue must be null or a non-numeric placeholder string
          if (field.suggestedValue !== null) {
            expect(typeof field.suggestedValue).toBe('string');
            // Must not be a number disguised as a value
            expect(Number(field.suggestedValue)).toBeNaN();
          }
        }
      }
    });

    it('empty context (no issues) returns empty draft set', () => {
      const ctx = makeContext([]);
      const result = generateFixDrafts(ctx);

      expect(result.drafts).toHaveLength(0);
      expect(result.totalDrafts).toBe(0);
      expect(result.highRiskCount).toBe(0);
    });

    it('maps product issues to sku entity type', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].affectedEntity).toBe('sku');
      expect(result.drafts[0].affectedEntityId).toBe('sku1');
      expect(result.drafts[1].affectedEntity).toBe('sku');
      expect(result.drafts[1].affectedEntityId).toBe('sku2');
    });

    it('maps forecast issues to forecast entity type', () => {
      const issues = [
        makeIssue('forecast-partial-year-sku3-2026', 'forecast', 'warning', 'medium'),
        makeIssue('forecast-orphan-sku-fc1', 'forecast', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].affectedEntity).toBe('forecast');
      expect(result.drafts[0].affectedEntityId).toBe('sku3');
      expect(result.drafts[1].affectedEntity).toBe('forecast');
      expect(result.drafts[1].affectedEntityId).toBe('fc1');
    });

    it('maps capacity issues to capacityPlan entity type', () => {
      const issues = [
        makeIssue('forecast-missing-capacity', 'capacity', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].affectedEntity).toBe('capacityPlan');
    });

    it('maps currency issues to parameter entity type', () => {
      const issues = [
        makeIssue('missing-constant-twd-rate', 'currency', 'error', 'high'),
        makeIssue('missing-yearly-cny-rate', 'currency', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].affectedEntity).toBe('parameter');
      expect(result.drafts[0].affectedEntityId).toBe('currencySettings');
      expect(result.drafts[1].affectedEntity).toBe('parameter');
      expect(result.drafts[1].affectedEntityId).toBe('currencySettings');
    });

    it('maps bp issues to parameter entity type', () => {
      const issues = [
        makeIssue('forecast-missing-bp-target-2027', 'bp', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].affectedEntity).toBe('parameter');
      expect(result.drafts[0].affectedEntityId).toBe('bpTargets');
    });

    it('maps risk level from decisionImpact', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('capacity-without-forecast', 'capacity', 'info', 'low'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.drafts[0].riskLevel).toBe('high');
      expect(result.drafts[1].riskLevel).toBe('medium');
      expect(result.drafts[2].riskLevel).toBe('low');
    });

    it('counts high risk drafts correctly', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('missing-constant-twd-rate', 'currency', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(result.highRiskCount).toBe(2);
    });

    it('generates unique draft IDs', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      const ids = result.drafts.map(d => d.draftId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('includes generatedAt timestamp in ISO format', () => {
      const ctx = makeContext([]);
      const result = generateFixDrafts(ctx);

      expect(result.generatedAt).toBeDefined();
      // Verify it's a valid ISO date string
      expect(() => new Date(result.generatedAt)).not.toThrow();
      expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
    });
  });

  describe('validateDraftForRole', () => {
    const sampleDraft: CopilotFixDraft = {
      draftId: 'test-1',
      issueId: 'sku-missing-attr-sku1',
      affectedEntity: 'sku',
      affectedEntityId: 'sku1',
      suggestedFields: [],
      reason: 'test',
      sourceReference: 'test',
      requiresHumanConfirmation: true,
      riskLevel: 'high',
      viewerVisible: true,
    };

    it('owner can see and act on drafts', () => {
      expect(validateDraftForRole(sampleDraft, 'owner')).toBe(true);
    });

    it('editor can see and act on drafts', () => {
      expect(validateDraftForRole(sampleDraft, 'editor')).toBe(true);
    });

    it('viewer cannot see or act on drafts', () => {
      expect(validateDraftForRole(sampleDraft, 'viewer')).toBe(false);
    });

    it('viewer always returns false regardless of viewerVisible flag', () => {
      const viewerVisibleDraft = { ...sampleDraft, viewerVisible: true };
      expect(validateDraftForRole(viewerVisibleDraft, 'viewer')).toBe(false);
    });
  });

  describe('formatDraftSummary', () => {
    it('returns correct format with counts', () => {
      const draftSet: CopilotFixDraftSet = {
        drafts: [],
        generatedAt: new Date().toISOString(),
        summary: '',
        totalDrafts: 5,
        highRiskCount: 2,
      };

      const result = formatDraftSummary(draftSet);
      expect(result).toBe('共 5 個修復建議，其中 2 個高風險。所有建議需人工確認後方可執行。');
    });

    it('returns correct format with zero counts', () => {
      const draftSet: CopilotFixDraftSet = {
        drafts: [],
        generatedAt: new Date().toISOString(),
        summary: '',
        totalDrafts: 0,
        highRiskCount: 0,
      };

      const result = formatDraftSummary(draftSet);
      expect(result).toBe('共 0 個修復建議，其中 0 個高風險。所有建議需人工確認後方可執行。');
    });

    it('matches the summary field from generateFixDrafts', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('sku-zero-price-sku2', 'products', 'warning', 'medium'),
        makeIssue('missing-constant-twd-rate', 'currency', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      expect(formatDraftSummary(result)).toBe(result.summary);
    });
  });

  describe('sourceReference', () => {
    it('all drafts have sourceReference set', () => {
      const issues = [
        makeIssue('sku-missing-attr-sku1', 'products', 'error', 'high'),
        makeIssue('forecast-missing-capacity', 'capacity', 'error', 'high'),
      ];
      const ctx = makeContext(issues);
      const result = generateFixDrafts(ctx);

      for (const draft of result.drafts) {
        expect(draft.sourceReference).toBe('aiCopilotFixDrafts');
      }
    });
  });
});
