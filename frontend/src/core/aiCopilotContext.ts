/**
 * AI Copilot Context Builder (v1.38.0)
 *
 * Builds a compact, sanitized context object for the AI Data Copilot MVP.
 *
 * Key constraints:
 * - Pure function, zero side effects (no Firestore, no services, no network)
 * - All sensitive keys (uid, email, token, auth, apiKey, secret, password,
 *   workspaceId, userId, ownerUid, member) are recursively stripped via sanitizeDeep()
 * - Arrays are capped: topIssues 8, topDrivers 5, shortageMonths 12
 * - Numbers rounded to 2 decimal places
 *
 * Consumes existing core modules: analytics, dataQuality, riskAttribution, bpTargets, currency.
 */

import type {
  SKU,
  Forecast,
  CapacityPlan,
  ProjectParameters,
  WorkspaceRole,
} from '../types';
import type { AnalyticsModel } from './analytics';
import { buildDataQualitySummary } from './dataQuality';
import { buildRiskAttributionModel } from './riskAttribution';
import type { BpAnalysisModel } from './bpTargets';
import { normalizeCurrencySettings } from './currency';

// ============================================================
// Constants
// ============================================================

const SENSITIVE_KEYS = [
  'uid',
  'email',
  'token',
  'auth',
  'apiKey',
  'secret',
  'password',
  'workspaceId',
  'userId',
  'ownerUid',
  'member',
];

const MAX_TOP_ISSUES = 8;
const MAX_TOP_DRIVERS = 5;
const MAX_SHORTAGE_MONTHS = 12;

// ============================================================
// sanitizeDeep
// ============================================================

function sanitizeDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeDeep(item)) as unknown as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) continue;
    result[key] = sanitizeDeep(value);
  }
  return result as T;
}

// ============================================================
// Helpers
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ============================================================
// AiCopilotContext Interface
// ============================================================

export interface AiCopilotContext {
  readonly schemaVersion: '1.0';
  readonly generatedAt: string;
  readonly appVersion: string;
  readonly projectSummary: {
    totalRevenueUsd: number;
    totalForecastPcs: number;
    maxCoreUtilization: number | null;
    maxBuUtilization: number | null;
    shortageMonthCount: number;
    worstBottleneckMonth: string | null;
    skuCount: number;
    forecastMonthCount: number;
  };
  readonly dataQualitySummary: {
    confidence: 'high' | 'medium' | 'low' | 'blocked';
    confidenceScore: number;
    status: 'ok' | 'warning' | 'error';
    issueCount: number;
    topIssues: Array<{
      id: string;
      severity: 'error' | 'warning' | 'info';
      domain: string;
      decisionImpact: 'high' | 'medium' | 'low';
      titleMessage: { key: string; params?: Record<string, string | number> };
    }>;
  };
  readonly riskBriefSummary: {
    shortageMonths: string[];
    topDrivers: Array<{
      dimension: string;
      label: string;
      metric: string;
      value: number;
      share?: number;
      severity: 'critical' | 'warning' | 'info';
      affectedPeriods: string[];
    }>;
  };
  readonly scenarioSummary: null | {
    isActive: boolean;
    multipliers: { forecastVolume: number; unitPrice: number; coreCapacity: number; buCapacity: number };
    deltas: { totalRevenueUsd: { base: number|null; scenario: number|null; delta: number|null }; shortageMonthCount: { base: number|null; scenario: number|null; delta: number|null }; bpAttainmentPct: { base: number|null; scenario: number|null; delta: number|null } };
  };
  readonly bpSummary: {
    yearly: Array<{ period: string; targetMillionTwd: number|null; forecastMillionTwd: number; attainment: number|null; gapMillionTwd: number|null; status: string }>;
    hasAnyMiss: boolean;
    worstPeriod: string | null;
  };
  readonly capacitySummary: {
    monthlySummaries: Array<{ month: string; coreUtilization: number|null; buUtilization: number|null; coreShortage: number; buShortage: number; bottleneck: string }>;
    worstMonth: string | null;
  };
  readonly currencyAssumptions: {
    baseCurrency: 'USD';
    displayCurrency: string;
    exchangeRateMode: string;
    usdToTwdRate: number;
    usdToCnyRate: number;
  };
  readonly assumptions: string[];
  readonly role: WorkspaceRole;
}

// ============================================================
// buildAiCopilotContext
// ============================================================

/**
 * Build a compact, sanitized AI Copilot context for the Data Copilot MVP.
 *
 * @param skus - SKU definitions
 * @param forecasts - monthly forecast records
 * @param capacityPlans - factory capacity plans
 * @param params - project parameters (yield matrix, panel layout, currency, BP targets)
 * @param model - pre-computed analytics model
 * @param bpModel - optional BP analysis model
 * @param role - workspace role for UI permission checks (defaults to 'viewer')
 */
export function buildAiCopilotContext(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  model: AnalyticsModel,
  bpModel?: BpAnalysisModel | null,
  role?: WorkspaceRole
): AiCopilotContext {
  // --- Data Quality ---
  const dq = buildDataQualitySummary({ skus, forecasts, capacityPlans, params });

  // --- Risk Attribution ---
  const risk = buildRiskAttributionModel(model, skus, bpModel ?? undefined);

  // --- Currency ---
  const currencySettings = normalizeCurrencySettings(params.currencySettings);

  // --- Capacity monthly summaries (derived from model) ---
  const capacityMonthlySummaries = model.monthlySummaries.map(s => ({
    month: s.month,
    coreUtilization: s.coreUtilization !== null ? round2(s.coreUtilization) : null,
    buUtilization: s.buUtilization !== null ? round2(s.buUtilization) : null,
    coreShortage: round2(s.coreShortage),
    buShortage: round2(s.buShortage),
    bottleneck: s.bottleneck,
  }));

  // --- BP summary ---
  const bpYearly = (bpModel?.yearly ?? []).map(r => ({
    period: r.period,
    targetMillionTwd: r.targetMillionTwd !== null ? round2(r.targetMillionTwd) : null,
    forecastMillionTwd: round2(r.forecastMillionTwd),
    attainment: r.attainment !== null ? round2(r.attainment) : null,
    gapMillionTwd: r.gapMillionTwd !== null ? round2(r.gapMillionTwd) : null,
    status: r.status,
  }));
  const hasAnyMiss = bpYearly.some(r => r.status === 'miss');
  const worstPeriod = bpYearly
    .filter(r => r.status === 'miss' || r.status === 'watch')
    .sort((a, b) => (a.attainment ?? Infinity) - (b.attainment ?? Infinity))[0]?.period ?? null;

  // --- Forecast month count ---
  const forecastMonthCount = new Set(forecasts.map(f => f.month)).size;

  // --- Top issues (capped at 8, prioritized by decisionImpact) ---
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const topIssues = [...dq.issues]
    .sort((a, b) => {
      const ai = impactOrder[a.decisionImpact ?? 'low'] ?? 2;
      const bi = impactOrder[b.decisionImpact ?? 'low'] ?? 2;
      if (ai !== bi) return ai - bi;
      // Within same impact level, errors first
      const sevOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
      return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2);
    })
    .slice(0, MAX_TOP_ISSUES)
    .map(issue => ({
      id: issue.id,
      severity: issue.severity,
      domain: issue.domain,
      decisionImpact: (issue.decisionImpact ?? 'low') as 'high' | 'medium' | 'low',
      titleMessage: {
        key: issue.titleMessage.key,
        ...(issue.titleMessage.params ? { params: issue.titleMessage.params } : {}),
      },
    }));

  // --- Top risk drivers (capped at 5) ---
  const topDrivers = risk.drivers.slice(0, MAX_TOP_DRIVERS).map(d => ({
    dimension: d.dimension,
    label: d.label,
    metric: d.metric,
    value: round2(d.value),
    ...(d.share !== undefined ? { share: round2(d.share) } : {}),
    severity: d.severity,
    affectedPeriods: d.affectedPeriods,
  }));

  // --- Shortage months (capped at 12) ---
  const shortageMonths = risk.shortageMonths.slice(0, MAX_SHORTAGE_MONTHS);

  // --- Build context ---
  const context: AiCopilotContext = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    appVersion: '',

    projectSummary: {
      totalRevenueUsd: round2(model.totalRevenue),
      totalForecastPcs: round2(model.totalForecastPcs),
      maxCoreUtilization: model.maxCoreUtil !== null ? round2(model.maxCoreUtil) : null,
      maxBuUtilization: model.maxBuUtil !== null ? round2(model.maxBuUtil) : null,
      shortageMonthCount: model.shortageMonthCount,
      worstBottleneckMonth: model.worstMonth,
      skuCount: skus.length,
      forecastMonthCount,
    },

    dataQualitySummary: {
      confidence: dq.confidence,
      confidenceScore: round2(dq.confidenceScore),
      status: dq.status,
      issueCount: dq.issues.length,
      topIssues,
    },

    riskBriefSummary: {
      shortageMonths,
      topDrivers,
    },

    // Scenario summary is null by default; consumers may inject it externally
    scenarioSummary: null,

    bpSummary: {
      yearly: bpYearly,
      hasAnyMiss,
      worstPeriod,
    },

    capacitySummary: {
      monthlySummaries: capacityMonthlySummaries,
      worstMonth: model.worstMonth,
    },

    currencyAssumptions: {
      baseCurrency: 'USD',
      displayCurrency: currencySettings.displayCurrency,
      exchangeRateMode: currencySettings.exchangeRateMode,
      usdToTwdRate: round2(currencySettings.constantUsdToTwdRate),
      usdToCnyRate: round2(currencySettings.constantUsdToCnyRate),
    },

    assumptions: [
      `Working days are fixed at ${params.defaultWorkingDays ?? 28} days/month across all capacity analyses.`,
      'Core steps are fixed to 1 step for all layer count SKUs.',
      'BU steps are derived from layer count: max(layerCount / 2 - 1, 0).',
      'All revenue calculations normalize to USD before aggregation.',
      'BP Gap Attribution is proportional (revenue-share based), not strict causal attribution.',
      'Weighted Pressure Index is analysis-only ranking weight (Core 1.3 / BU 1.0), not a capacity formula.',
    ],

    role: role ?? 'viewer',
  };

  // --- Recursive sensitive-key strip (safety net) ---
  return sanitizeDeep(context);
}
