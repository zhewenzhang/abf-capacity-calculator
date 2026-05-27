/**
 * AI Copilot Fix Drafts (v1.39.0)
 *
 * Produces fix draft suggestions from DataQuality issues.
 *
 * Core safety constraints:
 * - AI does NOT directly modify data
 * - suggestDataFixes only produces fix drafts
 * - Viewer cannot generate executable fix actions
 * - Owner/Editor must also go through confirmation
 * - This version only displays drafts, does not actually save
 * - No invented values: all suggestedValues are placeholders or null
 */

import type { AiCopilotContext } from './aiCopilotContext';
import type { WorkspaceRole } from '../types';

// ============================================================
// Interfaces
// ============================================================

export interface CopilotFixDraft {
  /** Unique draft ID */
  draftId: string;
  /** Issue ID from data quality that triggered this fix */
  issueId: string;
  /** Entity type: 'sku' | 'forecast' | 'capacityPlan' | 'parameter' */
  affectedEntity: string;
  /** Entity identifier (e.g., SKU code, factory name) */
  affectedEntityId: string;
  /** Fields to be modified */
  suggestedFields: Array<{
    fieldName: string;
    currentValue: unknown;
    suggestedValue: unknown;
    reason: string;
  }>;
  /** Why this fix is suggested */
  reason: string;
  /** Which module produced this suggestion */
  sourceReference: string;
  /** Always true — AI never auto-saves */
  requiresHumanConfirmation: true;
  /** Risk level of this fix */
  riskLevel: 'low' | 'medium' | 'high';
  /** Whether viewer can see this draft */
  viewerVisible: boolean;
}

export interface CopilotFixDraftSet {
  drafts: CopilotFixDraft[];
  generatedAt: string;
  summary: string;
  totalDrafts: number;
  highRiskCount: number;
}

// ============================================================
// generateFixDrafts
// ============================================================

/**
 * Analyze context.dataQualitySummary.topIssues and generate fix drafts
 * for each issue.
 *
 * Safety guarantees:
 * - suggestedValue is always a placeholder or null (never invented)
 * - requiresHumanConfirmation is always true
 * - viewerVisible is false for viewer role, true for owner/editor
 * - This version only produces drafts; no actual save is triggered
 */
export function generateFixDrafts(context: AiCopilotContext): CopilotFixDraftSet {
  const issues = context.dataQualitySummary.topIssues;
  const isViewer = context.role === 'viewer';
  const drafts: CopilotFixDraft[] = [];

  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const draft = buildDraftForIssue(issue, i, isViewer);
    if (draft) {
      drafts.push(draft);
    }
  }

  const highRiskCount = drafts.filter(d => d.riskLevel === 'high').length;

  return {
    drafts,
    generatedAt: new Date().toISOString(),
    summary: formatDraftSummaryInternal(drafts.length, highRiskCount),
    totalDrafts: drafts.length,
    highRiskCount,
  };
}

// ============================================================
// Internal: build draft for a single issue
// ============================================================

function buildDraftForIssue(
  issue: AiCopilotContext['dataQualitySummary']['topIssues'][number],
  index: number,
  isViewer: boolean
): CopilotFixDraft | null {
  const { id, domain, decisionImpact } = issue;

  const riskLevel: 'low' | 'medium' | 'high' = decisionImpact;
  const draftId = `${Date.now()}-${index}`;
  const sourceReference = 'aiCopilotFixDrafts';

  // --- products domain: SKU issues ---
  if (domain === 'products') {
    if (id.startsWith('sku-missing-attr-')) {
      const skuId = id.replace('sku-missing-attr-', '');
      return {
        draftId,
        issueId: id,
        affectedEntity: 'sku',
        affectedEntityId: skuId,
        suggestedFields: [
          {
            fieldName: 'unitPrice',
            currentValue: null,
            suggestedValue: null,
            reason: 'Unit price is required for revenue calculation. Please enter the correct value.',
          },
          {
            fieldName: 'chipWidthMm',
            currentValue: null,
            suggestedValue: null,
            reason: 'Chip width is required for panel layout calculation. Please enter the correct value.',
          },
        ],
        reason: 'SKU has missing required production attributes that block accurate calculation.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }

    if (id.startsWith('sku-zero-price-')) {
      const skuId = id.replace('sku-zero-price-', '');
      return {
        draftId,
        issueId: id,
        affectedEntity: 'sku',
        affectedEntityId: skuId,
        suggestedFields: [
          {
            fieldName: 'unitPrice',
            currentValue: 0,
            suggestedValue: null,
            reason: 'Zero unit price results in zero revenue. Please enter the correct unit price.',
          },
        ],
        reason: 'SKU unit price is zero, causing revenue calculation to return zero.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }
  }

  // --- forecast domain ---
  if (domain === 'forecast') {
    if (id.startsWith('forecast-partial-year-')) {
      // Pattern: forecast-partial-year-{skuId}-{year}
      const parts = id.replace('forecast-partial-year-', '').split('-');
      const skuId = parts[0];
      return {
        draftId,
        issueId: id,
        affectedEntity: 'forecast',
        affectedEntityId: skuId,
        suggestedFields: [
          {
            fieldName: 'monthlyForecast',
            currentValue: 'partial',
            suggestedValue: null,
            reason: 'Some months are missing forecast data. Please add the missing monthly forecasts.',
          },
        ],
        reason: 'Partial year forecast data detected; missing months affect analysis completeness.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }

    if (id.startsWith('forecast-orphan-sku-')) {
      const forecastId = id.replace('forecast-orphan-sku-', '');
      return {
        draftId,
        issueId: id,
        affectedEntity: 'forecast',
        affectedEntityId: forecastId,
        suggestedFields: [],
        reason: 'Forecast references a non-existent SKU. Please verify the SKU data or remove the orphan forecast.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }

    // Generic forecast issue
    return {
      draftId,
      issueId: id,
      affectedEntity: 'forecast',
      affectedEntityId: 'unknown',
      suggestedFields: [],
      reason: 'Forecast data issue detected. Please review and fix manually.',
      sourceReference,
      requiresHumanConfirmation: true,
      riskLevel,
      viewerVisible: !isViewer,
    };
  }

  // --- capacity domain ---
  if (domain === 'capacity') {
    return {
      draftId,
      issueId: id,
      affectedEntity: 'capacityPlan',
      affectedEntityId: 'unknown',
      suggestedFields: [],
      reason: 'Capacity configuration issue detected. Please add or update capacity plans in the Capacity page.',
      sourceReference,
      requiresHumanConfirmation: true,
      riskLevel,
      viewerVisible: !isViewer,
    };
  }

  // --- currency domain ---
  if (domain === 'currency') {
    if (id.includes('twd-rate')) {
      return {
        draftId,
        issueId: id,
        affectedEntity: 'parameter',
        affectedEntityId: 'currencySettings',
        suggestedFields: [
          {
            fieldName: 'usdToTwdRate',
            currentValue: null,
            suggestedValue: null,
            reason: 'USD to TWD exchange rate is missing. Please set the correct rate in Parameters.',
          },
        ],
        reason: 'Missing TWD exchange rate blocks BP attainment analysis.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }

    if (id.includes('cny-rate')) {
      return {
        draftId,
        issueId: id,
        affectedEntity: 'parameter',
        affectedEntityId: 'currencySettings',
        suggestedFields: [
          {
            fieldName: 'usdToCnyRate',
            currentValue: null,
            suggestedValue: null,
            reason: 'USD to CNY exchange rate is missing. Please set the correct rate in Parameters.',
          },
        ],
        reason: 'Missing CNY exchange rate blocks currency conversion.',
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }
  }

  // --- bp domain ---
  if (domain === 'bp') {
    if (id.startsWith('forecast-missing-bp-target-')) {
      const year = id.replace('forecast-missing-bp-target-', '');
      return {
        draftId,
        issueId: id,
        affectedEntity: 'parameter',
        affectedEntityId: 'bpTargets',
        suggestedFields: [
          {
            fieldName: 'yearlyRevenueTargetsMillionTwd',
            currentValue: null,
            suggestedValue: null,
            reason: `BP target for year ${year} is missing. Please set the target in Parameters.`,
          },
        ],
        reason: `Forecast data exists for ${year} but no BP target is configured.`,
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }

    if (id.startsWith('bp-target-zero-forecast-')) {
      const year = id.replace('bp-target-zero-forecast-', '');
      return {
        draftId,
        issueId: id,
        affectedEntity: 'parameter',
        affectedEntityId: 'bpTargets',
        suggestedFields: [],
        reason: `BP target exists for ${year} but no forecast demand data is available. Please add forecast data or adjust the BP target.`,
        sourceReference,
        requiresHumanConfirmation: true,
        riskLevel,
        viewerVisible: !isViewer,
      };
    }
  }

  // --- Fallback for unknown issue patterns ---
  return {
    draftId,
    issueId: id,
    affectedEntity: 'parameter',
    affectedEntityId: 'unknown',
    suggestedFields: [],
    reason: 'Issue detected. Please review and fix manually.',
    sourceReference,
    requiresHumanConfirmation: true,
    riskLevel,
    viewerVisible: !isViewer,
  };
}

// ============================================================
// validateDraftForRole
// ============================================================

/**
 * Returns true if the role can see and act on this draft.
 * - owner: can see all drafts
 * - editor: can see all drafts
 * - viewer: cannot see any drafts (always returns false)
 */
export function validateDraftForRole(
  _draft: CopilotFixDraft,
  role: WorkspaceRole
): boolean {
  if (role === 'viewer') return false;
  return true; // owner and editor
}

// ============================================================
// formatDraftSummary
// ============================================================

/**
 * Return a human-readable summary of the draft set.
 *
 * Format:
 * "共 N 個修復建議，其中 M 個高風險。所有建議需人工確認後方可執行。"
 */
export function formatDraftSummary(draftSet: CopilotFixDraftSet): string {
  return formatDraftSummaryInternal(draftSet.totalDrafts, draftSet.highRiskCount);
}

function formatDraftSummaryInternal(total: number, highRisk: number): string {
  return `共 ${total} 個修復建議，其中 ${highRisk} 個高風險。所有建議需人工確認後方可執行。`;
}
