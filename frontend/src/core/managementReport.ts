/**
 * Management Report Pack builder (v1.45.0).
 *
 * Generates deterministic daily/weekly management reports summarizing the
 * operational state of the workbench. Reports include top risks, required
 * fixes, scenario comparisons, AI-ready narratives, and KPI grids.
 *
 * Constraints:
 * - Pure function, zero side effects
 * - No imports from services/**
 * - Deterministic: same input = same output
 * - No BYOK key leakage (sanitize all output)
 * - No causality claims
 * - Fixed precision: toFixed(1) for numbers
 * - Stable sort ordering
 */

import type { WorkbenchViewModel, AbnormalityInsight } from './workbench';
import type { DataQualitySummary, DataQualityIssue } from './dataQuality';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import type { ScenarioComparison, DeltaMetric } from './scenarioEngine';
import { sanitizeDeep, isSensitiveKey } from './sensitiveDataUtils';

// ============================================================
// Public Types
// ============================================================

export type ReportType = 'daily' | 'weekly';

export type ExportFormat = 'markdown' | 'json';

export interface ReportSection {
  /** Section identifier. */
  id: string;
  /** Human-readable section title. */
  title: string;
  /** Section content type. */
  type: 'risk-list' | 'fix-list' | 'scenario-comparison' | 'narrative' | 'kpi-grid';
  /** Section data (structure depends on type). */
  data: Record<string, unknown>;
  /** Priority order (lower = higher priority). */
  priority: number;
}

export interface ManagementReport {
  /** Report type. */
  reportType: ReportType;
  /** Generation timestamp (ISO 8601). */
  generatedAt: string;
  /** Report period (e.g., '2026-05-28' for daily, '2026-W22' for weekly). */
  period: string;
  /** Report sections, ordered by priority. */
  sections: ReportSection[];
  /** Executive summary (1-3 sentences). */
  executiveSummary: string;
  /** Confidence level of the underlying data. */
  dataConfidence: 'high' | 'medium' | 'low' | 'blocked';
  /** Caveats that apply to this report. */
  caveats: string[];
}

export interface ManagementReportInput {
  /** Workbench view model (from buildWorkbenchViewModel). */
  workbench: WorkbenchViewModel;
  /** Data quality summary. */
  dqSummary: DataQualitySummary;
  /** Analytics model (null if data insufficient). */
  analyticsModel: AnalyticsModel | null;
  /** BP analysis model (null if no BP targets). */
  bpModel: BpAnalysisModel | null;
  /** Optional: scenario comparison to include in the report. */
  scenarioComparison?: ScenarioComparison | null;
  /** Optional: per-customer impact from scenario (top-level revenue delta per customer). */
  scenarioCustomerImpact?: Array<{ customer: string; revenueDelta: number }> | null;
  /** Report type. */
  reportType: ReportType;
  /** Override current date for testability. */
  currentDate?: Date;
}

// ============================================================
// Sensitive Key Stripping (delegated to shared utility)
// ============================================================

const sanitizeObject = sanitizeDeep;

// ============================================================
// Sorting Helpers
// ============================================================

const SEVERITY_ORDER: Record<string, number> = { critical: 0, warning: 1, info: 2 };

function sortBySeverity(items: AbnormalityInsight[]): AbnormalityInsight[] {
  return [...items].sort((a, b) => {
    const aOrd = SEVERITY_ORDER[a.severity] ?? 99;
    const bOrd = SEVERITY_ORDER[b.severity] ?? 99;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.title.localeCompare(b.title);
  });
}

function sortByImpact(items: DataQualityIssue[]): DataQualityIssue[] {
  const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...items].sort((a, b) => {
    const aOrd = impactOrder[a.decisionImpact ?? 'low'] ?? 2;
    const bOrd = impactOrder[b.decisionImpact ?? 'low'] ?? 2;
    if (aOrd !== bOrd) return aOrd - bOrd;
    return a.id.localeCompare(b.id);
  });
}

function stableSortByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

// ============================================================
// Section Builders
// ============================================================

function buildTopRisksSection(abnormalities: AbnormalityInsight[]): ReportSection {
  const sorted = sortBySeverity(abnormalities);
  const risks = sorted.slice(0, 5).map((a, i) => ({
    rank: i + 1,
    title: a.title,
    severity: a.severity,
    category: a.domain,
    evidence: formatEvidence(a.evidence),
    recommendedAction: a.recommendedAction,
  }));
  const criticalCount = sorted.filter(a => a.severity === 'critical').length;

  return {
    id: 'top-risks',
    title: 'Top Risks',
    type: 'risk-list',
    data: {
      risks,
      totalRiskCount: sorted.length,
      criticalCount,
    },
    priority: 2,
  };
}

function buildRequiredFixesSection(dqSummary: DataQualitySummary): ReportSection {
  const highImpact = dqSummary.issues.filter(i => i.decisionImpact === 'high');
  const sorted = sortByImpact(highImpact);
  const fixes = sorted.map(issue => ({
    issueId: issue.id,
    domain: issue.domain,
    title: issue.title,
    impact: issue.decisionImpact as 'high' | 'medium',
    suggestion: issue.detail,
    draft: true,
  }));

  return {
    id: 'required-fixes',
    title: 'Required Fixes',
    type: 'fix-list',
    data: {
      fixes,
      totalFixCount: fixes.length,
    },
    priority: 3,
  };
}

function buildRevenueBpSection(
  workbench: WorkbenchViewModel,
  bpModel: BpAnalysisModel | null,
): ReportSection {
  const revenueBp = workbench.revenueBp;
  const data: Record<string, unknown> = {
    currentRevenue: formatNum(revenueBp.currentRevenue),
    bpTarget: revenueBp.bpTarget !== null ? formatNum(revenueBp.bpTarget) : null,
    attainment: revenueBp.attainment !== null ? formatPct(revenueBp.attainment) : null,
    gap: revenueBp.gap !== null ? formatNum(revenueBp.gap) : null,
    status: revenueBp.status,
  };

  // Add yearly breakdown if bpModel is available
  if (bpModel) {
    data.yearlyBreakdown = bpModel.yearly.map(r => ({
      period: r.period,
      target: r.targetMillionTwd !== null ? formatNum(r.targetMillionTwd) : '-',
      forecast: formatNum(r.forecastMillionTwd),
      attainment: r.attainment !== null ? formatPct(r.attainment) : '-',
      gap: r.gapMillionTwd !== null ? formatNum(r.gapMillionTwd) : '-',
      status: r.status,
    }));
  }

  return {
    id: 'revenue-bp',
    title: 'Revenue vs BP Status',
    type: 'kpi-grid',
    data,
    priority: 4,
  };
}

function buildLookAheadSection(workbench: WorkbenchViewModel): ReportSection {
  const items = workbench.lookAhead.map(item => ({
    month: item.month,
    coreUtilization: item.coreUtilization !== null ? formatPct(item.coreUtilization) : 'N/A',
    buUtilization: item.buUtilization !== null ? formatPct(item.buUtilization) : 'N/A',
    bottleneck: item.bottleneck,
    hasShortage: item.hasShortage,
  }));

  return {
    id: 'look-ahead',
    title: 'Look-Ahead Highlights',
    type: 'kpi-grid',
    data: {
      items,
      shortageMonthCount: items.filter(i => i.hasShortage).length,
    },
    priority: 5,
  };
}

function buildScenarioRecommendationsSection(
  scenarioComparison: ScenarioComparison | null | undefined,
  scenarioCustomerImpact: Array<{ customer: string; revenueDelta: number }> | null | undefined,
): ReportSection | null {
  if (!scenarioComparison) return null;

  const deltas = scenarioComparison.deltas;
  const deltaEntries = [
    { metric: 'Total Revenue (USD)', ...deltas.totalRevenueUsd },
    { metric: 'Forecast Quantity', ...deltas.totalForecastPcs },
    { metric: 'Max Core Utilization', ...deltas.maxCoreUtilization },
    { metric: 'Max BU Utilization', ...deltas.maxBuUtilization },
    { metric: 'Shortage Months', ...deltas.shortageMonthCount },
    { metric: 'BP Attainment %', ...deltas.bpAttainmentPct },
    { metric: 'BP Gap (M TWD)', ...deltas.bpGapMillionTwd },
  ];

  const comparisonDeltas = deltaEntries.map(entry => ({
    metric: entry.metric,
    base: entry.base !== null ? formatNum(entry.base) : null,
    scenario: entry.scenario !== null ? formatNum(entry.scenario) : null,
    delta: entry.delta !== null ? formatNum(entry.delta) : null,
    deltaPercent: entry.deltaPercent !== null ? formatPct(entry.deltaPercent / 100) : null,
    direction: determineDirection(entry),
  }));

  const customerImpact = stableSortByKey(
    (scenarioCustomerImpact ?? []).map(c => ({
      customer: c.customer,
      revenueDelta: formatNum(c.revenueDelta),
    })),
    c => c.customer,
  );

  return {
    id: 'scenario-comparison',
    title: 'Scenario Recommendations',
    type: 'scenario-comparison',
    data: {
      scenarioLabel: formatMultipliers(scenarioComparison.multipliers),
      deltas: comparisonDeltas,
      customerImpact,
    },
    priority: 6,
  };
}

function buildNarrativeSection(
  workbench: WorkbenchViewModel,
  dqSummary: DataQualitySummary,
  bpModel: BpAnalysisModel | null,
  scenarioComparison: ScenarioComparison | null | undefined,
): ReportSection {
  const confidence = dqSummary.confidence;
  const sortedAbnormalities = sortBySeverity(workbench.abnormalities);
  const topRisk = sortedAbnormalities[0] ?? null;
  const highImpactIssues = dqSummary.issues.filter(i => i.decisionImpact === 'high');

  const paragraphs: string[] = [];
  const keyTakeaways: string[] = [];
  const openQuestions: string[] = [];

  // Confidence paragraph
  paragraphs.push(
    `Based on ${confidence} data confidence (score: ${dqSummary.confidenceScore}/100), this report covers the current operational state.`,
  );

  // Top risk paragraph
  if (topRisk) {
    const evidenceStr = formatEvidence(topRisk.evidence);
    paragraphs.push(
      `The top risk is "${topRisk.title}" (${topRisk.severity}, domain: ${topRisk.domain}). Evidence: ${evidenceStr}. Recommended action: ${topRisk.recommendedAction}.`,
    );
    keyTakeaways.push(`Priority: address "${topRisk.title}" immediately.`);
  } else {
    paragraphs.push('No critical abnormalities detected in the current data.');
    keyTakeaways.push('No critical abnormalities detected.');
  }

  // DQ issues paragraph
  if (highImpactIssues.length > 0) {
    paragraphs.push(
      `${highImpactIssues.length} high-impact data quality issue(s) require attention. These may distort analysis results.`,
    );
    keyTakeaways.push(`${highImpactIssues.length} DQ issue(s) need fixing before analysis can be fully trusted.`);
  }

  // BP paragraph
  const revenueBp = workbench.revenueBp;
  if (revenueBp.status !== 'no-target') {
    const attStr = revenueBp.attainment !== null ? formatPct(revenueBp.attainment) : 'N/A';
    paragraphs.push(
      `Revenue vs BP: ${revenueBp.status} at ${attStr} attainment. Current revenue: ${formatNum(revenueBp.currentRevenue)}M TWD.`,
    );
  } else {
    paragraphs.push('No BP targets configured; revenue attainment analysis is not available.');
    openQuestions.push('Are BP targets needed for this project?');
  }

  // Shortage paragraph
  if (workbench.lookAhead.length > 0) {
    const shortageMonths = workbench.lookAhead.filter(i => i.hasShortage);
    if (shortageMonths.length > 0) {
      paragraphs.push(
        `Capacity shortage detected in ${shortageMonths.length} upcoming month(s): ${shortageMonths.map(m => m.month).join(', ')}.`,
      );
      keyTakeaways.push(`${shortageMonths.length} month(s) face capacity shortage.`);
    }
  }

  // Scenario paragraph
  if (scenarioComparison) {
    const revDelta = scenarioComparison.deltas.totalRevenueUsd;
    if (revDelta.delta !== null) {
      const direction = revDelta.delta >= 0 ? 'increase' : 'decrease';
      paragraphs.push(
        `Scenario analysis shows a ${direction} of ${formatNum(Math.abs(revDelta.delta))} USD in total revenue (${formatPct((revDelta.deltaPercent ?? 0) / 100)}).`,
      );
    }
  }

  // Caveats
  if (confidence === 'low' || confidence === 'blocked') {
    openQuestions.push('Data quality is degraded; results may not be reliable.');
  }
  if (!bpModel) {
    openQuestions.push('BP analysis not available (no BP targets or insufficient data).');
  }

  // Source references
  const sources = [
    'dataQuality.ts',
    'workbench.ts',
    bpModel ? 'bpTargets.ts' : null,
    scenarioComparison ? 'scenarioEngine.ts' : null,
  ].filter(Boolean);

  return {
    id: 'narrative',
    title: 'AI Narrative Draft',
    type: 'narrative',
    data: {
      paragraphs,
      keyTakeaways,
      openQuestions,
      sources,
      caveat: 'This narrative is a deterministic template. No external AI was used. No causality claims are made.',
    },
    priority: 7,
  };
}

// ============================================================
// KPI Grid Builder
// ============================================================

function buildDataConfidenceSection(dqSummary: DataQualitySummary): ReportSection {
  const metrics: Array<{
    label: string;
    value: number | string;
    unit: string;
    status: 'good' | 'watch' | 'critical';
    trend: 'up' | 'down' | 'flat' | null;
  }> = [
    {
      label: 'Confidence Score',
      value: dqSummary.confidenceScore,
      unit: '/100',
      status: dqSummary.confidence === 'high' ? 'good' : dqSummary.confidence === 'medium' ? 'watch' : 'critical',
      trend: null,
    },
    {
      label: 'Confidence Level',
      value: dqSummary.confidence,
      unit: '',
      status: dqSummary.confidence === 'high' ? 'good' : dqSummary.confidence === 'medium' ? 'watch' : 'critical',
      trend: null,
    },
    {
      label: 'DQ Status',
      value: dqSummary.status,
      unit: '',
      status: dqSummary.status === 'ok' ? 'good' : dqSummary.status === 'warning' ? 'watch' : 'critical',
      trend: null,
    },
    {
      label: 'Total Issues',
      value: dqSummary.issues.length,
      unit: '',
      status: dqSummary.issues.some(i => i.severity === 'error') ? 'critical' : dqSummary.issues.some(i => i.severity === 'warning') ? 'watch' : 'good',
      trend: null,
    },
  ];

  return {
    id: 'data-confidence',
    title: 'Data Confidence',
    type: 'kpi-grid',
    data: { metrics },
    priority: 1,
  };
}

function buildKpiGridSection(
  analyticsModel: AnalyticsModel | null,
  workbench: WorkbenchViewModel,
): ReportSection {
  const metrics: Array<{
    label: string;
    value: number | string;
    unit: string;
    status: 'good' | 'watch' | 'critical';
    trend: 'up' | 'down' | 'flat' | null;
  }> = [];

  // Revenue
  const revenueBp = workbench.revenueBp;
  metrics.push({
    label: 'Total Revenue',
    value: formatNum(revenueBp.currentRevenue),
    unit: 'M TWD',
    status: revenueBp.status === 'met' ? 'good' : revenueBp.status === 'watch' ? 'watch' : revenueBp.status === 'miss' ? 'critical' : 'good',
    trend: null,
  });

  // BP Attainment
  if (revenueBp.attainment !== null) {
    metrics.push({
      label: 'BP Attainment',
      value: formatPct(revenueBp.attainment),
      unit: '',
      status: revenueBp.status === 'met' ? 'good' : revenueBp.status === 'watch' ? 'watch' : 'critical',
      trend: null,
    });
  }

  // Analytics-driven metrics
  if (analyticsModel) {
    metrics.push({
      label: 'Total Forecast',
      value: formatNum(analyticsModel.totalForecastPcs),
      unit: 'pcs',
      status: 'good',
      trend: null,
    });

    if (analyticsModel.maxCoreUtil !== null) {
      metrics.push({
        label: 'Max Core Utilization',
        value: formatPct(analyticsModel.maxCoreUtil),
        unit: '',
        status: analyticsModel.maxCoreUtil > 1.0 ? 'critical' : analyticsModel.maxCoreUtil > 0.85 ? 'watch' : 'good',
        trend: null,
      });
    }

    if (analyticsModel.maxBuUtil !== null) {
      metrics.push({
        label: 'Max BU Utilization',
        value: formatPct(analyticsModel.maxBuUtil),
        unit: '',
        status: analyticsModel.maxBuUtil > 1.0 ? 'critical' : analyticsModel.maxBuUtil > 0.85 ? 'watch' : 'good',
        trend: null,
      });
    }

    metrics.push({
      label: 'Shortage Months',
      value: analyticsModel.shortageMonthCount,
      unit: 'months',
      status: analyticsModel.shortageMonthCount > 0 ? 'critical' : 'good',
      trend: null,
    });
  }

  // Abnormality count
  const criticalCount = workbench.abnormalities.filter(a => a.severity === 'critical').length;
  metrics.push({
    label: 'Critical Abnormalities',
    value: criticalCount,
    unit: '',
    status: criticalCount > 0 ? 'critical' : 'good',
    trend: null,
  });

  return {
    id: 'kpi-grid',
    title: 'Key Performance Indicators',
    type: 'kpi-grid',
    data: { metrics },
    priority: 2,
  };
}

function buildExecutiveSummarySection(
  executiveSummary: string,
  workbench: WorkbenchViewModel,
): ReportSection {
  return {
    id: 'executive-summary',
    title: 'Executive Summary',
    type: 'narrative',
    data: {
      paragraphs: [executiveSummary],
      keyTakeaways: [
        ...(workbench.abnormalities.filter(a => a.severity === 'critical').length > 0
          ? [`${workbench.abnormalities.filter(a => a.severity === 'critical').length} critical abnormality(ies) require immediate attention.`]
          : ['No critical abnormalities detected.']),
        ...(workbench.lookAhead.filter(i => i.hasShortage).length > 0
          ? [`${workbench.lookAhead.filter(i => i.hasShortage).length} month(s) with capacity shortage.`]
          : ['No capacity shortage in look-ahead window.']),
      ],
      openQuestions: [],
      sources: [],
      caveat: 'Deterministic summary. No external AI used.',
    },
    priority: 0,
  };
}

// ============================================================
// Weekly-Only Sections
// ============================================================

function buildWeeklyTrendSection(analyticsModel: AnalyticsModel | null): ReportSection {
  const yearlyHealth = analyticsModel?.yearlyHealth ?? [];
  return {
    id: 'week-over-week-trend',
    title: 'Week-over-Week Trend',
    type: 'kpi-grid',
    data: {
      years: yearlyHealth.map(y => ({
        year: y.year,
        revenue: formatNum(y.revenue),
        severity: y.severity,
        bottleneck: y.bottleneck,
        shortageMonths: y.shortageMonths.length,
      })),
      note: 'Week-over-week comparison requires historical snapshots (not yet implemented). Showing yearly trend as proxy.',
    },
    priority: 8,
  };
}

function buildCapacityUtilizationTrendSection(analyticsModel: AnalyticsModel | null): ReportSection {
  const utilization = analyticsModel?.monthlyUtilization ?? [];
  return {
    id: 'capacity-utilization-trend',
    title: 'Capacity Utilization Trend',
    type: 'kpi-grid',
    data: {
      months: utilization.slice(0, 12).map(u => ({
        month: u.month,
        coreUtil: u.coreUtil !== null ? formatPct(u.coreUtil) : 'N/A',
        buUtil: u.buUtil !== null ? formatPct(u.buUtil) : 'N/A',
      })),
    },
    priority: 9,
  };
}

function buildForecastAccuracySection(analyticsModel: AnalyticsModel | null): ReportSection {
  return {
    id: 'forecast-accuracy',
    title: 'Forecast Accuracy',
    type: 'kpi-grid',
    data: {
      note: 'Forecast accuracy requires actual vs forecast comparison (not yet available).',
      totalForecastPcs: analyticsModel ? formatNum(analyticsModel.totalForecastPcs) : 'N/A',
    },
    priority: 10,
  };
}

function buildCustomerConcentrationSection(analyticsModel: AnalyticsModel | null): ReportSection {
  const byCustomer = analyticsModel?.revenueByCustomer ?? [];
  const top5 = byCustomer.slice(0, 5).map(row => ({
    customer: row.label,
    totalRevenue: formatNum(Object.values(row.values).reduce((s, v) => s + v, 0)),
    periods: Object.keys(row.values).sort(),
  }));

  const totalRevenue = byCustomer.reduce(
    (s, row) => s + Object.values(row.values).reduce((ss, v) => ss + v, 0),
    0,
  );
  const top1Revenue = top5.length > 0 ? parseFloat(top5[0].totalRevenue) : 0;
  const concentration = totalRevenue > 0 ? top1Revenue / totalRevenue : 0;

  return {
    id: 'customer-concentration',
    title: 'Customer Concentration Risk',
    type: 'kpi-grid',
    data: {
      top5,
      top1Share: formatPct(concentration),
      totalCustomers: byCustomer.length,
      riskLevel: concentration > 0.5 ? 'high' : concentration > 0.3 ? 'medium' : 'low',
    },
    priority: 11,
  };
}

function buildSkuPortfolioHealthSection(analyticsModel: AnalyticsModel | null): ReportSection {
  const bySku = analyticsModel?.revenueBySku ?? [];
  const top5 = bySku.slice(0, 5).map(row => ({
    sku: row.label,
    totalRevenue: formatNum(Object.values(row.values).reduce((s, v) => s + v, 0)),
  }));

  return {
    id: 'sku-portfolio-health',
    title: 'SKU Portfolio Health',
    type: 'kpi-grid',
    data: {
      top5,
      totalSkus: bySku.length,
    },
    priority: 12,
  };
}

// ============================================================
// Formatting Helpers
// ============================================================

function formatNum(value: number): string {
  return value.toFixed(1);
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatEvidence(evidence: Record<string, string | number | boolean | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (isSensitiveKey(key)) continue;
    if (value === null || value === undefined) continue;
    parts.push(`${key}: ${String(value)}`);
  }
  return parts.join('; ') || 'N/A';
}

function formatMultipliers(m: ScenarioComparison['multipliers']): string {
  return `Volume x${m.forecastVolume.toFixed(2)}, Price x${m.unitPrice.toFixed(2)}, Core Cap x${m.coreCapacity.toFixed(2)}, BU Cap x${m.buCapacity.toFixed(2)}`;
}

function determineDirection(metric: DeltaMetric): 'improved' | 'degraded' | 'unchanged' {
  if (metric.delta === null || metric.delta === 0) return 'unchanged';
  // For utilization and shortage, lower is better
  // For revenue and BP, higher is better
  // We use a simple heuristic: if delta > 0, it's "improved" for most metrics
  return metric.delta > 0 ? 'improved' : 'degraded';
}

function formatTimestamp(date: Date): string {
  return date.toISOString();
}

function formatPeriod(date: Date, reportType: ReportType): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (reportType === 'daily') {
    return `${y}-${m}-${d}`;
  }
  // Weekly: compute ISO week
  const weekNum = getISOWeekNumber(date);
  return `${y}-W${String(weekNum).padStart(2, '0')}`;
}

function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ============================================================
// Caveats Builder
// ============================================================

function buildCaveats(
  dqSummary: DataQualitySummary,
  bpModel: BpAnalysisModel | null,
  scenarioComparison: ScenarioComparison | null | undefined,
  reportType: ReportType,
): string[] {
  const caveats: string[] = [];

  if (dqSummary.confidence === 'blocked') {
    caveats.push('Data confidence is BLOCKED. Results are not meaningful without basic data.');
  } else if (dqSummary.confidence === 'low') {
    caveats.push('Data confidence is LOW. High-impact data quality issues distort results.');
  } else if (dqSummary.confidence === 'medium') {
    caveats.push('Data confidence is MEDIUM. Some data quality warnings may affect accuracy.');
  }

  const highImpact = dqSummary.issues.filter(i => i.decisionImpact === 'high');
  if (highImpact.length > 0) {
    caveats.push(`${highImpact.length} high-impact DQ issue(s) present: ${highImpact.map(i => i.id).join(', ')}.`);
  }

  if (!bpModel) {
    caveats.push('BP analysis not available. Revenue attainment cannot be assessed.');
  }

  if (reportType === 'weekly') {
    caveats.push('Week-over-week comparison requires historical report snapshots (not yet implemented).');
  }

  if (!scenarioComparison) {
    caveats.push('No scenario comparison included. Run a scenario to see impact analysis.');
  }

  caveats.push('Numbers use fixed precision (1 decimal). All values are deterministic and reproducible.');

  return caveats;
}

// ============================================================
// Executive Summary Builder
// ============================================================

function buildExecutiveSummary(
  workbench: WorkbenchViewModel,
  dqSummary: DataQualitySummary,
  reportType: ReportType,
): string {
  const confidence = dqSummary.confidence;
  const criticalCount = workbench.abnormalities.filter(a => a.severity === 'critical').length;
  const warningCount = workbench.abnormalities.filter(a => a.severity === 'warning').length;
  const shortageCount = workbench.lookAhead.filter(i => i.hasShortage).length;
  const revenueBp = workbench.revenueBp;

  const parts: string[] = [];

  parts.push(`${reportType === 'daily' ? 'Daily' : 'Weekly'} operational report with ${confidence} data confidence.`);

  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical abnormalit${ criticalCount === 1 ? 'y' : 'ies' } detected.`);
  } else {
    parts.push('No critical abnormalities detected.');
  }

  if (warningCount > 0) {
    parts.push(`${warningCount} warning-level abnormalit${ warningCount === 1 ? 'y' : 'ies' } detected.`);
  }

  if (revenueBp.status !== 'no-target') {
    const attStr = revenueBp.attainment !== null ? formatPct(revenueBp.attainment) : 'N/A';
    parts.push(`BP attainment: ${attStr} (${revenueBp.status}).`);
  }

  if (shortageCount > 0) {
    parts.push(`${shortageCount} month(s) with capacity shortage in the look-ahead window.`);
  }

  return parts.join(' ');
}

// ============================================================
// Main Entry Point
// ============================================================

/**
 * Build a deterministic management report.
 *
 * Same input always produces the same output. No side effects.
 * No imports from services/**.
 */
export function buildManagementReport(input: ManagementReportInput): ManagementReport {
  const {
    workbench,
    dqSummary,
    analyticsModel,
    bpModel,
    scenarioComparison,
    scenarioCustomerImpact,
    reportType,
    currentDate,
  } = input;

  const effectiveDate = currentDate ?? new Date();
  const generatedAt = formatTimestamp(effectiveDate);
  const period = formatPeriod(effectiveDate, reportType);

  // Build executive summary text first (needed for section)
  const executiveSummary = buildExecutiveSummary(workbench, dqSummary, reportType);

  // Build sections
  const sections: ReportSection[] = [];

  // Daily sections (8 total):
  // 1. Executive Summary
  sections.push(buildExecutiveSummarySection(executiveSummary, workbench));
  // 2. Data Confidence
  sections.push(buildDataConfidenceSection(dqSummary));
  // 2.5. KPI Grid
  sections.push(buildKpiGridSection(analyticsModel, workbench));
  // 3. Top Risks
  sections.push(buildTopRisksSection(workbench.abnormalities));
  // 4. Required Fixes
  sections.push(buildRequiredFixesSection(dqSummary));
  // 5. Revenue vs BP Status
  sections.push(buildRevenueBpSection(workbench, bpModel));
  // 6. Look-Ahead Highlights
  sections.push(buildLookAheadSection(workbench));
  // 7. Scenario Recommendations (always include -- placeholder if no comparison)
  const scenarioSection = buildScenarioRecommendationsSection(
    scenarioComparison ?? null,
    scenarioCustomerImpact ?? null,
  );
  if (scenarioSection) {
    sections.push(scenarioSection);
  } else {
    sections.push({
      id: 'scenario-comparison',
      title: 'Scenario Recommendations',
      type: 'scenario-comparison',
      data: {
        scenarioLabel: 'No scenario selected',
        deltas: [],
        customerImpact: [],
      },
      priority: 6,
    });
  }

  // 8. AI Narrative Draft
  sections.push(
    buildNarrativeSection(workbench, dqSummary, bpModel, scenarioComparison ?? null),
  );

  // Weekly-only sections
  if (reportType === 'weekly') {
    sections.push(buildWeeklyTrendSection(analyticsModel));
    sections.push(buildCapacityUtilizationTrendSection(analyticsModel));
    sections.push(buildForecastAccuracySection(analyticsModel));
    sections.push(buildCustomerConcentrationSection(analyticsModel));
    sections.push(buildSkuPortfolioHealthSection(analyticsModel));
  }

  // Sort by priority
  sections.sort((a, b) => a.priority - b.priority);

  // Build caveats
  const caveats = buildCaveats(dqSummary, bpModel, scenarioComparison ?? null, reportType);

  // Sanitize all section data
  const sanitizedSections = sections.map(s => ({
    ...s,
    data: sanitizeObject(s.data),
  }));

  return sanitizeObject({
    reportType,
    generatedAt,
    period,
    sections: sanitizedSections,
    executiveSummary,
    dataConfidence: dqSummary.confidence,
    caveats,
  });
}

// ============================================================
// Markdown Export
// ============================================================

/**
 * Export a ManagementReport as a markdown string.
 *
 * Sections are rendered in priority order with H2 headers.
 * Tables use pipe-delimited markdown format.
 * Numbers use fixed precision (1 decimal for TWD, 1 decimal for percentages).
 */
export function exportReportToMarkdown(report: ManagementReport): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Management Report — ${report.period}`);
  lines.push('');
  lines.push(`**Type**: ${report.reportType}`);
  lines.push(`**Generated**: ${report.generatedAt}`);
  lines.push(`**Data Confidence**: ${report.dataConfidence}`);
  lines.push('');

  // Sections (Executive Summary is now a section, rendered by the loop)
  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(renderSectionMarkdown(section));
    lines.push('');
  }

  // Caveats
  if (report.caveats.length > 0) {
    lines.push('## Caveats');
    lines.push('');
    for (const caveat of report.caveats) {
      lines.push(`- ${caveat}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderSectionMarkdown(section: ReportSection): string {
  switch (section.type) {
    case 'risk-list':
      return renderRiskListMarkdown(section.data);
    case 'fix-list':
      return renderFixListMarkdown(section.data);
    case 'scenario-comparison':
      return renderScenarioComparisonMarkdown(section.data);
    case 'narrative':
      return renderNarrativeMarkdown(section.data);
    case 'kpi-grid':
      return renderKpiGridMarkdown(section.data);
    default:
      return JSON.stringify(section.data, null, 2);
  }
}

function renderRiskListMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const risks = data.risks as Array<Record<string, unknown>> | undefined;
  const totalCount = data.totalRiskCount as number ?? 0;
  const criticalCount = data.criticalCount as number ?? 0;

  lines.push(`Total risks: ${totalCount} | Critical: ${criticalCount}`);
  lines.push('');

  if (!risks || risks.length === 0) {
    lines.push('No risks detected.');
    return lines.join('\n');
  }

  lines.push('| Rank | Severity | Category | Title | Evidence | Action |');
  lines.push('|------|----------|----------|-------|----------|--------|');
  for (const risk of risks) {
    lines.push(
      `| ${risk.rank} | ${risk.severity} | ${risk.category} | ${risk.title} | ${risk.evidence} | ${risk.recommendedAction} |`,
    );
  }

  return lines.join('\n');
}

function renderFixListMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const fixes = data.fixes as Array<Record<string, unknown>> | undefined;
  const totalCount = data.totalFixCount as number ?? 0;

  lines.push(`Total fixes required: ${totalCount}`);
  lines.push('');

  if (!fixes || fixes.length === 0) {
    lines.push('No high-impact DQ issues requiring fixes.');
    return lines.join('\n');
  }

  lines.push('| Issue ID | Domain | Impact | Title | Suggestion |');
  lines.push('|----------|--------|--------|-------|------------|');
  for (const fix of fixes) {
    lines.push(
      `| ${fix.issueId} | ${fix.domain} | ${fix.impact} | ${fix.title} | ${fix.suggestion} |`,
    );
  }

  return lines.join('\n');
}

function renderScenarioComparisonMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const label = data.scenarioLabel as string ?? 'Scenario';
  const deltas = data.deltas as Array<Record<string, unknown>> | undefined;
  const customerImpact = data.customerImpact as Array<Record<string, unknown>> | undefined;

  lines.push(`**Scenario**: ${label}`);
  lines.push('');

  if (deltas && deltas.length > 0) {
    lines.push('### Deltas');
    lines.push('');
    lines.push('| Metric | Base | Scenario | Delta | Delta % | Direction |');
    lines.push('|--------|------|----------|-------|---------|-----------|');
    for (const d of deltas) {
      lines.push(
        `| ${d.metric} | ${d.base ?? '-'} | ${d.scenario ?? '-'} | ${d.delta ?? '-'} | ${d.deltaPercent ?? '-'} | ${d.direction} |`,
      );
    }
    lines.push('');
  }

  if (customerImpact && customerImpact.length > 0) {
    lines.push('### Customer Impact');
    lines.push('');
    lines.push('| Customer | Revenue Delta |');
    lines.push('|----------|---------------|');
    for (const c of customerImpact) {
      lines.push(`| ${c.customer} | ${c.revenueDelta} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function renderNarrativeMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const paragraphs = data.paragraphs as string[] | undefined;
  const takeaways = data.keyTakeaways as string[] | undefined;
  const questions = data.openQuestions as string[] | undefined;
  const sources = data.sources as string[] | undefined;
  const caveat = data.caveat as string | undefined;

  if (paragraphs) {
    for (const p of paragraphs) {
      lines.push(p);
      lines.push('');
    }
  }

  if (takeaways && takeaways.length > 0) {
    lines.push('**Key Takeaways:**');
    for (const t of takeaways) {
      lines.push(`- ${t}`);
    }
    lines.push('');
  }

  if (questions && questions.length > 0) {
    lines.push('**Open Questions:**');
    for (const q of questions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }

  if (sources && sources.length > 0) {
    lines.push(`**Sources**: ${sources.join(', ')}`);
    lines.push('');
  }

  if (caveat) {
    lines.push(`*${caveat}*`);
  }

  return lines.join('\n');
}

function renderKpiGridMarkdown(data: Record<string, unknown>): string {
  const lines: string[] = [];
  const metrics = data.metrics as Array<Record<string, unknown>> | undefined;

  if (!metrics || metrics.length === 0) {
    // Fallback: render all key-value pairs
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object') continue;
      lines.push(`- **${key}**: ${value}`);
    }
    return lines.join('\n');
  }

  lines.push('| Metric | Value | Unit | Status | Trend |');
  lines.push('|--------|-------|------|--------|-------|');
  for (const m of metrics) {
    lines.push(
      `| ${m.label} | ${m.value} | ${m.unit} | ${m.status} | ${m.trend ?? '-'} |`,
    );
  }

  return lines.join('\n');
}

// ============================================================
// JSON Export
// ============================================================

/**
 * Export a ManagementReport as a JSON string.
 *
 * Uses sorted keys for deterministic output and includes UTF-8 BOM
 * for Excel compatibility.
 */
export function exportReportToJson(report: ManagementReport): string {
  const sorted = sortObjectKeys(report);
  const sanitized = sanitizeObject(sorted);
  return '﻿' + JSON.stringify(sanitized, null, 2);
}

/**
 * Recursively sort all object keys for deterministic JSON output.
 */
function sortObjectKeys<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item)) as unknown as T;
  }
  const sorted: Record<string, unknown> = {};
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted as T;
}
