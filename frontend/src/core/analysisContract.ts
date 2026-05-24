import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import { METRIC_DEFINITIONS } from './metricDefinitions';
import type { MetricDefinition } from './metricDefinitions';
import { buildDataQualitySummary } from './dataQuality';
import type { DataQualitySummary } from './dataQuality';
import { buildRiskAttributionModel } from './riskAttribution';
import type { RiskAttributionModel } from './riskAttribution';
import { buildBpAttributionModel } from './bpAttribution';
import type { BpAttributionModel } from './bpAttribution';
import { buildPriceImpact, buildCapacityImpact } from './impactAnalysis';
import type { PriceImpactModel, CapacityImpactModel } from './impactAnalysis';
import { buildKeyFindings } from './keyFindings';
import type { KeyFinding } from './keyFindings';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

/**
 * Analysis Contract payload — versioned, deterministic, AI-ready.
 *
 * v1.0 (Phase 5.2) — capacity / BP / risk attribution.
 * v1.1 (Phase 5.3B) — adds bpAttribution, priceImpact, capacityImpact, keyFindings.
 *   All new fields are deterministic; no AI API is involved.
 */
export interface AnalysisContractPayload {
  version: '1.1';
  generatedAt: string;
  appVersion?: string;
  timeRange: {
    months: string[];
    years: string[];
  };
  metricDefinitions: MetricDefinition[];
  quality: DataQualitySummary;
  assumptions: string[];
  summary: {
    totalRevenueUsd: number;
    totalForecastPcs: number;
    maxCoreUtilization: number | null;
    maxBuUtilization: number | null;
    shortageMonthCount: number;
    worstBottleneckMonth: string | null;
  };
  yearlyHealth: AnalyticsModel['yearlyHealth'];
  bpAnalysis?: BpAnalysisModel;
  skus: SKU[];
  forecasts: Forecast[];
  matrices: {
    revenueByCustomer: AnalyticsModel['revenueByCustomer'];
    revenueBySku: AnalyticsModel['revenueBySku'];
    revenueBySize: AnalyticsModel['revenueBySize'];
    coreDemandBySize: AnalyticsModel['coreDemandBySize'];
    buDemandBySize: AnalyticsModel['buDemandBySize'];
    coreDemandByApplication: AnalyticsModel['coreDemandByApplication'];
    buDemandByApplication: AnalyticsModel['buDemandByApplication'];
  };
  riskAttribution: RiskAttributionModel;
  /** Phase 5.3B — deterministic proportional attribution of BP gap. */
  bpAttribution: BpAttributionModel;
  /** Phase 5.3B — read-only -10/-5/+5/+10% price scenarios. */
  priceImpact: PriceImpactModel;
  /** Phase 5.3B — read-only Core/BU +10% capacity scenarios. */
  capacityImpact: CapacityImpactModel;
  /** Phase 5.3B — at most 5 deterministic decision-level highlights. */
  keyFindings: KeyFinding[];
}

export function buildAnalysisContractPayload(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  model: AnalyticsModel,
  bpModel?: BpAnalysisModel,
  appVersion?: string
): AnalysisContractPayload {
  const quality = buildDataQualitySummary({ skus, forecasts, capacityPlans, params });

  const allMonths = Array.from(new Set(forecasts.map((f) => f.month))).sort();
  const allYears = Array.from(new Set(allMonths.map((m) => m.substring(0, 4)))).sort();

  const workingDays = params.defaultWorkingDays ?? 28;
  const assumptions = [
    `Working days are fixed across all monthly capacity analyses (Default: ${workingDays} days/month).`,
    'Core steps are fixed to 1 step for all layer count SKUs.',
    'Build-up (BU) steps are derived from layer count: max(layerCount / 2 - 1, 0).',
    'Calculation engines normalize TWD and CNY product/forecast prices to USD before revenue calculation.',
    'BP Target revenue is set in Million TWD. BP Attainment analysis converts USD revenue to TWD per month before target comparison.',
    'Weighted Pressure Index is an analysis-only ranking weight (default Core 1.3 / BU 1.0); capacity / BP / currency core formulas are unchanged.',
    'BP Gap Attribution is proportional (revenue-share based), not strict causal attribution.',
    'Price / Capacity Impact scenarios are deterministic read-only re-runs of the calculation engine; they do not mutate inputs or write to Firebase.',
  ];

  const riskAttribution = buildRiskAttributionModel(model, skus, bpModel);
  const bpTargetsMillionTwd = params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
  const currencySettings = params.currencySettings ?? DEFAULT_CURRENCY_SETTINGS;
  const bpAttribution = buildBpAttributionModel(bpModel, model.skuResults, skus, currencySettings);
  const priceImpact = buildPriceImpact(
    skus,
    forecasts,
    capacityPlans,
    params,
    currencySettings,
    bpTargetsMillionTwd
  );
  const capacityImpact = buildCapacityImpact(skus, forecasts, capacityPlans, params);
  const keyFindings = buildKeyFindings({
    risk: riskAttribution,
    bp: bpModel,
    bpAttribution,
    priceImpact,
    capacityImpact,
    dataQuality: quality,
  });

  return {
    version: '1.1',
    generatedAt: new Date().toISOString(),
    appVersion,
    timeRange: {
      months: allMonths,
      years: allYears,
    },
    metricDefinitions: METRIC_DEFINITIONS,
    quality,
    assumptions,
    skus,
    forecasts,
    summary: {
      totalRevenueUsd: model.totalRevenue,
      totalForecastPcs: model.totalForecastPcs,
      maxCoreUtilization: model.maxCoreUtil,
      maxBuUtilization: model.maxBuUtil,
      shortageMonthCount: model.shortageMonthCount,
      worstBottleneckMonth: model.worstMonth,
    },
    yearlyHealth: model.yearlyHealth,
    bpAnalysis: bpModel,
    matrices: {
      revenueByCustomer: model.revenueByCustomer,
      revenueBySku: model.revenueBySku,
      revenueBySize: model.revenueBySize,
      coreDemandBySize: model.coreDemandBySize,
      buDemandBySize: model.buDemandBySize,
      coreDemandByApplication: model.coreDemandByApplication,
      buDemandByApplication: model.buDemandByApplication,
    },
    riskAttribution,
    bpAttribution,
    priceImpact,
    capacityImpact,
    keyFindings,
  };
}
