/**
 * Daily Operations Workbench -- core pure function module.
 *
 * Aggregates cross-domain insights (data quality, capacity risk, BP attainment,
 * scenario what-if, look-ahead focus) into a single WorkbenchViewModel.
 *
 * Constraints:
 * - Pure function, zero side effects
 * - No imports from services/**, no Firestore, no network, no DOM
 * - Reuses existing core modules only
 */

import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { buildDataQualitySummary, type DataQualitySummary, type DataQualityIssue } from './dataQuality';
import {
  buildAnalyticsModel,
  getDashboardHighlights,
  type AnalyticsModel,
  type DashboardHighlights,
} from './analytics';
import {
  buildBpAnalysis,
  computeBpKpi,
  type BpAnalysisModel,
  type BpKpiSummary,
} from './bpTargets';
import { normalizeCurrencySettings } from './currency';

// ============================================================
// Workflow Stage Status
// ============================================================

/**
 * Status of a workflow stage in the Daily Operations Workbench.
 * - 'ready': stage has valid data, no blocking issues
 * - 'warning': stage has data but with warnings
 * - 'blocked': stage has critical issues preventing reliable analysis
 * - 'notStarted': stage has no data at all
 */
export type WorkflowStageStatus = 'ready' | 'warning' | 'blocked' | 'notStarted';

/**
 * A single workflow stage in the Workbench.
 */
export interface WorkflowStage {
  /** Stable identifier (e.g., 'products', 'forecasts', 'capacity'). */
  id: string;
  /** I18n key for the display label. */
  label: string;
  /** Derived status based on data presence and data quality. */
  status: WorkflowStageStatus;
  /** Data quality issues relevant to this stage. */
  issues: Array<{
    id: string;
    severity: 'error' | 'warning' | 'info';
    title: string;
    detail: string;
  }>;
  /** Route path for the call-to-action button (null if no action needed). */
  cta: string | null;
  /** I18n key for the call-to-action button label. */
  ctaLabel: string;
}

// ============================================================
// Abnormality Insights
// ============================================================

/**
 * Domain classification for abnormality insights.
 */
export type AbnormalityDomain = 'data' | 'capacity' | 'sales' | 'bp' | 'scenario';

/**
 * A single abnormality insight surfaced by the Workbench.
 */
export interface AbnormalityInsight {
  /** Which operational domain this abnormality belongs to. */
  domain: AbnormalityDomain;
  /** Severity level. */
  severity: 'critical' | 'warning' | 'info';
  /** Short title (I18n key). */
  title: string;
  /** Detailed explanation (I18n key with params). */
  detail: string;
  /** Supporting evidence (e.g., affected months, SKUs, percentages). */
  evidence: Record<string, string | number | boolean | null>;
  /** Route to the page where the user can investigate further. */
  sourcePage: string;
  /** I18n key for the recommended action. */
  recommendedAction: string;
}

// ============================================================
// Look-Ahead Focus
// ============================================================

/**
 * A single month's look-ahead focus item.
 */
export interface LookAheadFocusItem {
  /** Month in YYYY-MM format. */
  month: string;
  /** Core utilization ratio (0-1+), null if capacity is 0. */
  coreUtilization: number | null;
  /** BU utilization ratio (0-1+), null if capacity is 0. */
  buUtilization: number | null;
  /** Which process is the bottleneck ('Core' | 'BU' | 'None'). */
  bottleneck: 'Core' | 'BU' | 'None';
  /** True if coreShortage > 0 or buShortage > 0. */
  hasShortage: boolean;
}

// ============================================================
// Revenue / BP Summary
// ============================================================

/**
 * Aggregated revenue vs BP target summary.
 */
export interface RevenueBpSummary {
  /** Current forecast revenue in million TWD. */
  currentRevenue: number;
  /** BP target in million TWD (null if no target configured). */
  bpTarget: number | null;
  /** Attainment ratio 0-1 (null if no target). */
  attainment: number | null;
  /** Gap in million TWD (forecast - target, null if no target). */
  gap: number | null;
  /** Status derived from attainment. */
  status: 'met' | 'watch' | 'miss' | 'no-target';
}

// ============================================================
// Scenario Presets
// ============================================================

/**
 * A predefined scenario configuration for quick what-if analysis.
 */
export interface ScenarioPreset {
  /** Unique identifier. */
  id: string;
  /** I18n key for display label. */
  label: string;
  /** I18n key for description. */
  description: string;
  /** Scenario multiplier parameters. */
  params: {
    forecastVolume: number;
    unitPrice: number;
    coreCapacity: number;
    buCapacity: number;
  };
}

// ============================================================
// Workbench ViewModel (top-level output)
// ============================================================

/**
 * The complete view model for the Daily Operations Workbench page.
 * Produced by `buildWorkbenchViewModel()`, consumed by React components.
 */
export interface WorkbenchViewModel {
  /** Workflow stages with derived status. */
  stages: WorkflowStage[];
  /** Cross-domain abnormality insights, sorted by severity (critical first). */
  abnormalities: AbnormalityInsight[];
  /** Next 6 months of capacity look-ahead. */
  lookAhead: LookAheadFocusItem[];
  /** Aggregated revenue vs BP target summary. */
  revenueBp: RevenueBpSummary;
  /** Predefined scenario presets for quick what-if. */
  scenarioPresets: ScenarioPreset[];
  /** Data quality confidence level (reused from DataQualitySummary). */
  dqConfidence: 'high' | 'medium' | 'low' | 'blocked';
}

// ============================================================
// Input
// ============================================================

export interface WorkbenchInput {
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  params: ProjectParameters;
  /** Override current date for testability. Defaults to new Date(). */
  currentDate?: Date;
}

// ============================================================
// Scenario Presets Constant
// ============================================================

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'volume-up-10',
    label: 'workbench.scenario.volumeUp10',
    description: 'workbench.scenario.volumeUp10.desc',
    params: { forecastVolume: 1.1, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'volume-down-10',
    label: 'workbench.scenario.volumeDown10',
    description: 'workbench.scenario.volumeDown10.desc',
    params: { forecastVolume: 0.9, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'capacity-up-20',
    label: 'workbench.scenario.capacityUp20',
    description: 'workbench.scenario.capacityUp20.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 1.2, buCapacity: 1.2 },
  },
  {
    id: 'price-up-5',
    label: 'workbench.scenario.priceUp5',
    description: 'workbench.scenario.priceUp5.desc',
    params: { forecastVolume: 1.0, unitPrice: 1.05, coreCapacity: 1.0, buCapacity: 1.0 },
  },
  {
    id: 'stress-test',
    label: 'workbench.scenario.stressTest',
    description: 'workbench.scenario.stressTest.desc',
    params: { forecastVolume: 1.2, unitPrice: 0.95, coreCapacity: 1.0, buCapacity: 1.0 },
  },
];

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Derive workflow stage statuses from data presence and data quality.
 * See architecture doc section 3.3 for derivation table.
 */
function deriveWorkflowStages(
  dq: DataQualitySummary,
  model: AnalyticsModel | null,
  _bpModel: BpAnalysisModel | null,
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
): WorkflowStage[] {
  const issues = dq.issues;

  // Helper: filter issues by domain
  function domainIssues(domain: string): DataQualityIssue[] {
    return issues.filter(i => i.domain === domain);
  }

  // Helper: does domain have errors?
  function hasErrors(domain: string): boolean {
    return domainIssues(domain).some(i => i.severity === 'error');
  }

  // Helper: does domain have warnings?
  function hasWarnings(domain: string): boolean {
    return domainIssues(domain).some(i => i.severity === 'warning');
  }

  // Helper: convert DataQualityIssue to the simplified stage issue format
  function toStageIssue(i: DataQualityIssue) {
    return { id: i.id, severity: i.severity, title: i.title, detail: i.detail };
  }

  // Helper: check if BP targets are configured with active non-zero values
  function hasActiveBpTargets(): boolean {
    if (!params.bpTargets) return false;
    const targets = params.bpTargets.yearlyRevenueTargetsMillionTwd;
    return Object.values(targets).some(v => v > 0);
  }

  // Helper: check if there are any BP targets configured at all (even zero)
  function hasAnyBpTargets(): boolean {
    return params.bpTargets !== undefined;
  }

  // --- Products stage ---
  let productsStatus: WorkflowStageStatus;
  if (skus.length === 0) {
    productsStatus = 'blocked';
  } else if (hasErrors('products')) {
    productsStatus = 'blocked';
  } else if (hasWarnings('products')) {
    productsStatus = 'warning';
  } else {
    productsStatus = 'ready';
  }

  // --- Forecasts stage ---
  let forecastsStatus: WorkflowStageStatus;
  if (forecasts.length === 0) {
    forecastsStatus = 'blocked';
  } else if (hasErrors('forecast')) {
    forecastsStatus = 'blocked';
  } else if (hasWarnings('forecast')) {
    forecastsStatus = 'warning';
  } else {
    forecastsStatus = 'ready';
  }

  // --- Capacity stage ---
  // blocked if no capacity plans OR DQ has 'forecast-missing-capacity' error
  const hasMissingCapError = issues.some(i => i.id === 'forecast-missing-capacity');
  let capacityStatus: WorkflowStageStatus;
  if (capacityPlans.length === 0 || hasMissingCapError) {
    capacityStatus = 'blocked';
  } else if (hasErrors('capacity')) {
    capacityStatus = 'blocked';
  } else if (hasWarnings('capacity')) {
    capacityStatus = 'warning';
  } else {
    capacityStatus = 'ready';
  }

  // --- Parameters stage ---
  const hasYieldMatrix = !!params.yieldMatrix;
  const hasPanelParams = !!params.panelParams;
  const hasCurrencyErrors = hasErrors('currency');
  const hasCurrencyOrParamWarnings = hasWarnings('currency') || hasWarnings('parameters');
  let parametersStatus: WorkflowStageStatus;
  if (!hasYieldMatrix || !hasPanelParams || hasCurrencyErrors) {
    parametersStatus = 'blocked';
  } else if (hasCurrencyOrParamWarnings) {
    parametersStatus = 'warning';
  } else {
    parametersStatus = 'ready';
  }

  // --- BP Targets stage ---
  let bpTargetsStatus: WorkflowStageStatus;
  if (!hasAnyBpTargets()) {
    bpTargetsStatus = 'notStarted';
  } else if (!hasActiveBpTargets()) {
    bpTargetsStatus = 'blocked';
  } else if (hasWarnings('bp')) {
    bpTargetsStatus = 'warning';
  } else {
    bpTargetsStatus = 'ready';
  }

  // --- Analysis stage ---
  let analysisStatus: WorkflowStageStatus;
  if (model === null) {
    analysisStatus = 'blocked';
  } else if (model.shortageMonthCount > 0) {
    analysisStatus = 'warning';
  } else {
    analysisStatus = 'ready';
  }

  // --- Scenario stage (always notStarted until user runs one) ---
  const scenarioStatus: WorkflowStageStatus = 'notStarted';

  return [
    {
      id: 'products',
      label: 'workbench.stage.products',
      status: productsStatus,
      issues: domainIssues('products').map(toStageIssue),
      cta: '/products',
      ctaLabel: 'workbench.stage.products.cta',
    },
    {
      id: 'forecasts',
      label: 'workbench.stage.forecasts',
      status: forecastsStatus,
      issues: domainIssues('forecast').map(toStageIssue),
      cta: '/forecasts',
      ctaLabel: 'workbench.stage.forecasts.cta',
    },
    {
      id: 'capacity',
      label: 'workbench.stage.capacity',
      status: capacityStatus,
      issues: domainIssues('capacity').map(toStageIssue),
      cta: '/capacity',
      ctaLabel: 'workbench.stage.capacity.cta',
    },
    {
      id: 'parameters',
      label: 'workbench.stage.parameters',
      status: parametersStatus,
      issues: [...domainIssues('parameters'), ...domainIssues('currency')].map(toStageIssue),
      cta: '/parameters',
      ctaLabel: 'workbench.stage.parameters.cta',
    },
    {
      id: 'bpTargets',
      label: 'workbench.stage.bpTargets',
      status: bpTargetsStatus,
      issues: domainIssues('bp').map(toStageIssue),
      cta: '/bp-targets',
      ctaLabel: 'workbench.stage.bpTargets.cta',
    },
    {
      id: 'analysis',
      label: 'workbench.stage.analysis',
      status: analysisStatus,
      issues: [],
      cta: model === null ? '/products' : null,
      ctaLabel: 'workbench.stage.analysis.cta',
    },
    {
      id: 'scenario',
      label: 'workbench.stage.scenario',
      status: scenarioStatus,
      issues: [],
      cta: '/scenario',
      ctaLabel: 'workbench.stage.scenario.cta',
    },
  ];
}

/**
 * Classify DQ issues and analytics signals into abnormality insights.
 * See architecture doc section 3.4 for classification table.
 */
function classifyAbnormalities(
  dq: DataQualitySummary,
  model: AnalyticsModel | null,
  bpModel: BpAnalysisModel | null,
  highlights: DashboardHighlights | null,
): AbnormalityInsight[] {
  const insights: AbnormalityInsight[] = [];

  // --- Data domain: high-impact DQ issues ---
  for (const issue of dq.issues) {
    if (issue.decisionImpact === 'high') {
      insights.push({
        domain: 'data',
        severity: 'critical',
        title: issue.title,
        detail: issue.detail,
        evidence: { issueId: issue.id, domain: issue.domain },
        sourcePage: '/products',
        recommendedAction: 'workbench.abnormality.data.fix',
      });
    }
  }

  // --- Capacity domain: over-utilization or shortage months ---
  if (model) {
    for (const m of model.monthlySummaries) {
      if (m.coreShortage > 0 || m.buShortage > 0) {
        insights.push({
          domain: 'capacity',
          severity: 'critical',
          title: `Capacity shortage in ${m.month}`,
          detail: `Shortage detected: Core ${m.coreShortage.toFixed(0)} panels, BU ${m.buShortage.toFixed(0)} panels`,
          evidence: {
            month: m.month,
            coreShortage: m.coreShortage,
            buShortage: m.buShortage,
            bottleneck: m.bottleneck,
          },
          sourcePage: '/capacity',
          recommendedAction: 'workbench.abnormality.capacity.shortage',
        });
      } else if (
        (m.coreUtilization !== null && m.coreUtilization > 1.0) ||
        (m.buUtilization !== null && m.buUtilization > 1.0)
      ) {
        insights.push({
          domain: 'capacity',
          severity: 'warning',
          title: `Over-capacity in ${m.month}`,
          detail: `Utilization exceeds 100%: Core ${m.coreUtilization !== null ? (m.coreUtilization * 100).toFixed(1) + '%' : 'N/A'}, BU ${m.buUtilization !== null ? (m.buUtilization * 100).toFixed(1) + '%' : 'N/A'}`,
          evidence: {
            month: m.month,
            coreUtilization: m.coreUtilization,
            buUtilization: m.buUtilization,
          },
          sourcePage: '/capacity',
          recommendedAction: 'workbench.abnormality.capacity.overUtil',
        });
      }
    }
  }

  // --- Sales domain: revenue trend or customer concentration ---
  if (highlights) {
    if (highlights.revenueTrend === 'down') {
      insights.push({
        domain: 'sales',
        severity: 'warning',
        title: 'Revenue trend declining',
        detail: 'Revenue trend is decreasing across periods',
        evidence: { revenueTrend: highlights.revenueTrend },
        sourcePage: '/dashboard',
        recommendedAction: 'workbench.abnormality.sales.trend',
      });
    }

    // Top customer contributing > 50% would require dimension analysis.
    // We use the topCustomer from highlights as a signal.
    if (highlights.topCustomer) {
      // We flag it as info since we cannot compute exact share from highlights alone
      insights.push({
        domain: 'sales',
        severity: 'info',
        title: `Top customer: ${highlights.topCustomer}`,
        detail: 'Customer concentration may be high',
        evidence: { topCustomer: highlights.topCustomer },
        sourcePage: '/dashboard',
        recommendedAction: 'workbench.abnormality.sales.concentration',
      });
    }
  }

  // --- BP domain: miss or watch status ---
  if (bpModel) {
    for (const record of bpModel.yearly) {
      if (record.status === 'miss') {
        insights.push({
          domain: 'bp',
          severity: 'critical',
          title: `BP target missed: ${record.period}`,
          detail: `Attainment ${(record.attainment !== null ? (record.attainment * 100).toFixed(1) : 'N/A')}%, gap ${record.gapMillionTwd !== null ? record.gapMillionTwd.toFixed(1) : 'N/A'}M TWD`,
          evidence: {
            period: record.period,
            target: record.targetMillionTwd,
            forecast: record.forecastMillionTwd,
            attainment: record.attainment,
            gap: record.gapMillionTwd,
          },
          sourcePage: '/bp-targets',
          recommendedAction: 'workbench.abnormality.bp.miss',
        });
      } else if (record.status === 'watch') {
        insights.push({
          domain: 'bp',
          severity: 'warning',
          title: `BP target at risk: ${record.period}`,
          detail: `Attainment ${(record.attainment !== null ? (record.attainment * 100).toFixed(1) : 'N/A')}%, gap ${record.gapMillionTwd !== null ? record.gapMillionTwd.toFixed(1) : 'N/A'}M TWD`,
          evidence: {
            period: record.period,
            target: record.targetMillionTwd,
            forecast: record.forecastMillionTwd,
            attainment: record.attainment,
            gap: record.gapMillionTwd,
          },
          sourcePage: '/bp-targets',
          recommendedAction: 'workbench.abnormality.bp.watch',
        });
      }
    }
  }

  // Sort by severity: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Cap at 10 insights (architecture doc section 9)
  return insights.slice(0, 10);
}

/**
 * Compute look-ahead focus: next 6 months from current date with
 * utilization > 85% or shortage.
 * See architecture doc section 3.5.
 */
function computeLookAheadFocus(
  monthlySummaries: AnalyticsModel['monthlySummaries'],
  currentDate: Date,
): LookAheadFocusItem[] {
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // Filter to future months (>= currentMonth)
  const futureMonths = monthlySummaries.filter(m => m.month >= currentMonth);

  // Filter to months with high utilization or shortage
  const focusMonths = futureMonths.filter(
    m =>
      (m.coreUtilization !== null && m.coreUtilization > 0.85) ||
      (m.buUtilization !== null && m.buUtilization > 0.85) ||
      m.coreShortage > 0 ||
      m.buShortage > 0,
  );

  // Return next 6 months (or fewer if data ends sooner)
  return focusMonths.slice(0, 6).map(m => ({
    month: m.month,
    coreUtilization: m.coreUtilization,
    buUtilization: m.buUtilization,
    bottleneck: m.bottleneck,
    hasShortage: m.coreShortage > 0 || m.buShortage > 0,
  }));
}

/**
 * Derive revenue vs BP summary from analytics model and BP KPI.
 * See architecture doc section 3.6.
 */
function deriveRevenueBpSummary(
  bpKpi: BpKpiSummary,
): RevenueBpSummary {
  const currentRevenue = bpKpi.totalForecastMillionTwd;
  const bpTarget = bpKpi.totalTargetMillionTwd;
  const attainment = bpKpi.overallAttainment;
  const gap = bpKpi.totalGapMillionTwd;

  let status: RevenueBpSummary['status'];
  if (attainment === null) {
    status = 'no-target';
  } else if (attainment >= 1.0) {
    status = 'met';
  } else if (attainment >= 0.8) {
    status = 'watch';
  } else {
    status = 'miss';
  }

  return { currentRevenue, bpTarget, attainment, gap, status };
}

// ============================================================
// Main Pure Function
// ============================================================

/**
 * Build the complete WorkbenchViewModel from raw service data.
 * Pure function: same input always produces same output, no side effects.
 */
export function buildWorkbenchViewModel(input: WorkbenchInput): WorkbenchViewModel {
  const { skus, forecasts, capacityPlans, params, currentDate } = input;
  const effectiveDate = currentDate ?? new Date();

  // --- Step 1: Build existing derived models ---
  const dqSummary: DataQualitySummary = buildDataQualitySummary({
    skus,
    forecasts,
    capacityPlans,
    params,
  });

  // Build analytics model only when data is present
  let model: AnalyticsModel | null = null;
  if (skus.length > 0 && forecasts.length > 0) {
    model = buildAnalyticsModel(skus, forecasts, capacityPlans, params);
  }

  // Build highlights only when model exists
  let highlights: DashboardHighlights | null = null;
  if (model) {
    highlights = getDashboardHighlights(model);
  }

  // Build BP analysis only when model exists
  let bpModel: BpAnalysisModel | null = null;
  let bpKpi: BpKpiSummary | null = null;
  if (model) {
    const currencySettings = normalizeCurrencySettings(params.currencySettings);
    const bpTargets = params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
    bpModel = buildBpAnalysis(
      model.skuResults,
      skus,
      model.monthlySummaries,
      bpTargets,
      currencySettings,
    );
    bpKpi = computeBpKpi(bpModel.yearly);
  }

  // --- Step 2: Derive workbench-specific views ---
  const stages = deriveWorkflowStages(
    dqSummary,
    model,
    bpModel,
    skus,
    forecasts,
    capacityPlans,
    params,
  );

  const abnormalities = classifyAbnormalities(dqSummary, model, bpModel, highlights);

  const lookAhead = model
    ? computeLookAheadFocus(model.monthlySummaries, effectiveDate)
    : [];

  const revenueBp: RevenueBpSummary = bpKpi
    ? deriveRevenueBpSummary(bpKpi)
    : {
        currentRevenue: 0,
        bpTarget: null,
        attainment: null,
        gap: null,
        status: 'no-target',
      };

  return {
    stages,
    abnormalities,
    lookAhead,
    revenueBp,
    scenarioPresets: SCENARIO_PRESETS,
    dqConfidence: dqSummary.confidence,
  };
}
