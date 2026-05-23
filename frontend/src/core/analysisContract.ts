import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import { METRIC_DEFINITIONS } from './metricDefinitions';
import type { MetricDefinition } from './metricDefinitions';
import { buildDataQualitySummary } from './dataQuality';
import type { DataQualitySummary } from './dataQuality';

export interface AnalysisContractPayload {
  version: '1.0';
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
  ];

  return {
    version: '1.0',
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
  };
}
