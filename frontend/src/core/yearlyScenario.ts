/**
 * Yearly Scenario Planning — v1.55
 *
 * Enables per-year scenario assumptions (forecast volume, price, capacity multipliers)
 * and produces per-year baseline/scenario/delta comparison tables.
 *
 * This module does NOT modify calculationEngine.ts. It applies multipliers to the
 * data layer and delegates to existing runCalculation / buildBpAnalysis helpers.
 */

import type { SKU, Forecast, CapacityPlan, ProjectParameters, CalculationResult } from '../types';
import type { BpAnalysisModel } from './bpTargets';
import { normalizeCurrencySettings } from './currency';
import { runCalculation } from './calculationEngine';
import { buildBpAnalysis } from './bpTargets';
import { isValidForecastMonth, filterValidForecasts } from './forecastMonthValidator';

// ============================================================
// Types
// ============================================================

export interface YearlyAssumption {
  forecastMultiplier: number;
  priceMultiplier: number;
  coreCapacityMultiplier: number;
  buCapacityMultiplier: number;
}

export interface YearlyMetric {
  value: number | null;
}

export interface YearlyResultRow {
  year: string;
  baseline: YearlyMetrics;
  scenario: YearlyMetrics;
  delta: YearlyDelta;
}

export interface YearlyMetrics {
  revenueUsd: number;
  forecastPcs: number;
  maxCoreUtilizationPct: number | null;
  maxBuUtilizationPct: number | null;
  shortageMonthCount: number;
  bpAttainmentPct: number | null;
  bpGapMillionTwd: number | null;
}

export interface YearlyDelta {
  revenuePct: number | null;
  forecastPct: number | null;
  coreUtilizationPp: number | null;
  buUtilizationPp: number | null;
  shortageMonthCount: number;
  bpAttainmentPp: number | null;
  bpGapMillionTwd: number | null;
}

export interface YearlyScenarioOutput {
  years: string[];
  assumptions: Record<string, YearlyAssumption>;
  results: YearlyResultRow[];
  summary: YearlyScenarioSummary;
}

export interface YearlyScenarioSummary {
  maxRevenueBoostYear: string | null;
  maxBpGapYear: string | null;
  maxCoreBottleneckYear: string | null;
  maxBuBottleneckYear: string | null;
  totalShortageChange: number;
}

// ============================================================
// Constants
// ============================================================

const MIN_MULTIPLIER = 0;
const MAX_MULTIPLIER = 3;

// ============================================================
// Helpers
// ============================================================

export function defaultAssumption(): YearlyAssumption {
  return {
    forecastMultiplier: 1.0,
    priceMultiplier: 1.0,
    coreCapacityMultiplier: 1.0,
    buCapacityMultiplier: 1.0,
  };
}

export function clampAssumption(a: YearlyAssumption): YearlyAssumption {
  const clamp = (v: number) => Math.max(MIN_MULTIPLIER, Math.min(MAX_MULTIPLIER, v));
  return {
    forecastMultiplier: clamp(a.forecastMultiplier),
    priceMultiplier: clamp(a.priceMultiplier),
    coreCapacityMultiplier: clamp(a.coreCapacityMultiplier),
    buCapacityMultiplier: clamp(a.buCapacityMultiplier),
  };
}

/**
 * Extract unique years from forecasts and capacity plans.
 */
export function extractDataYears(
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[]
): string[] {
  const yearSet = new Set<string>();
  for (const f of forecasts) {
    if (isValidForecastMonth(f.month)) {
      yearSet.add(f.month.substring(0, 4));
    }
  }
  for (const cp of capacityPlans) {
    if (cp.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(cp.month)) {
      yearSet.add(cp.month.substring(0, 4));
    }
  }
  return Array.from(yearSet).sort();
}

/**
 * Build initial visible years from data + reasonable default range.
 */
export function buildScenarioVisibleYears(
  dataYears: string[],
  defaultStart = 2026,
  defaultEnd = 2034
): string[] {
  const yearSet = new Set<number>();
  for (let y = defaultStart; y <= defaultEnd; y++) yearSet.add(y);
  for (const y of dataYears) {
    const n = parseInt(y, 10);
    if (!isNaN(n) && n >= 2000 && n <= 2100) yearSet.add(n);
  }
  return Array.from(yearSet).sort((a, b) => a - b).map(String);
}

/**
 * Filter forecasts and capacity plans to a specific year, then apply multipliers.
 */
function applyYearlyMultipliers(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  year: string,
  assumption: YearlyAssumption
): { skus: SKU[]; forecasts: Forecast[]; capacityPlans: CapacityPlan[] } {
  const a = clampAssumption(assumption);

  // Only process valid forecasts
  const validForecasts = filterValidForecasts(forecasts);

  const yearForecasts = validForecasts
    .filter((f) => f.month.startsWith(year))
    .map((f) => ({
      ...f,
      forecastPcs: f.forecastPcs * a.forecastMultiplier,
      unitPrice: f.unitPrice * a.priceMultiplier,
    }));

  const yearCapacity = capacityPlans
    .filter((cp) => isValidForecastMonth(cp.month) && cp.month.startsWith(year))
    .map((cp) => ({
      ...cp,
      corePanelPerDay: cp.corePanelPerDay * a.coreCapacityMultiplier,
      buPanelPerDay: cp.buPanelPerDay * a.buCapacityMultiplier,
    }));

  // SKUs are not year-filtered; price multiplier applies to SKU unitPrice
  const scenarioSkus = skus.map((s) => ({
    ...s,
    unitPrice: s.unitPrice > 0 ? s.unitPrice * a.priceMultiplier : s.unitPrice,
  }));

  return { skus: scenarioSkus, forecasts: yearForecasts, capacityPlans: yearCapacity };
}

/**
 * Extract yearly metrics from a CalculationResult + BpAnalysisModel.
 */
function extractMetrics(
  calcResult: CalculationResult,
  bpModel: BpAnalysisModel,
  year: string
): YearlyMetrics {
  // Find BP record for this year
  const bpRecord = bpModel.yearly.find((r) => r.period === year);
  const bpAttainmentPct = bpRecord && bpRecord.attainment !== null
    ? bpRecord.attainment * 100
    : null;
  const bpGapMillionTwd = bpRecord && bpRecord.gapMillionTwd !== null
    ? bpRecord.gapMillionTwd
    : null;

  return {
    revenueUsd: calcResult.totalRevenue,
    forecastPcs: calcResult.totalForecastPcs,
    maxCoreUtilizationPct: calcResult.maxCoreUtilization,
    maxBuUtilizationPct: calcResult.maxBuUtilization,
    shortageMonthCount: calcResult.shortageMonthCount,
    bpAttainmentPct,
    bpGapMillionTwd,
  };
}

function computeYearlyDelta(baseline: YearlyMetrics, scenario: YearlyMetrics): YearlyDelta {
  const pctChange = (base: number, scen: number): number | null => {
    if (base === 0) return null;
    return ((scen - base) / Math.abs(base)) * 100;
  };

  const ppChange = (base: number | null, scen: number | null): number | null => {
    if (base === null || scen === null) return null;
    return scen - base;
  };

  return {
    revenuePct: pctChange(baseline.revenueUsd, scenario.revenueUsd),
    forecastPct: pctChange(baseline.forecastPcs, scenario.forecastPcs),
    coreUtilizationPp: ppChange(baseline.maxCoreUtilizationPct, scenario.maxCoreUtilizationPct),
    buUtilizationPp: ppChange(baseline.maxBuUtilizationPct, scenario.maxBuUtilizationPct),
    shortageMonthCount: scenario.shortageMonthCount - baseline.shortageMonthCount,
    bpAttainmentPp: ppChange(baseline.bpAttainmentPct, scenario.bpAttainmentPct),
    bpGapMillionTwd: scenario.bpGapMillionTwd !== null && baseline.bpGapMillionTwd !== null
      ? scenario.bpGapMillionTwd - baseline.bpGapMillionTwd
      : null,
  };
}

function buildSummary(results: YearlyResultRow[]): YearlyScenarioSummary {
  let maxRevenueBoostYear: string | null = null;
  let maxRevenueBoost = -Infinity;
  let maxBpGapYear: string | null = null;
  let maxBpGap = -Infinity;
  let maxCoreBottleneckYear: string | null = null;
  let maxCoreBottleneck = -Infinity;
  let maxBuBottleneckYear: string | null = null;
  let maxBuBottleneck = -Infinity;
  let totalShortageChange = 0;

  for (const r of results) {
    // Revenue boost
    if (r.delta.revenuePct !== null && r.delta.revenuePct > maxRevenueBoost) {
      maxRevenueBoost = r.delta.revenuePct;
      maxRevenueBoostYear = r.year;
    }
    // BP gap (most negative = biggest gap)
    if (r.scenario.bpGapMillionTwd !== null && r.scenario.bpGapMillionTwd < maxBpGap) {
      maxBpGap = r.scenario.bpGapMillionTwd;
      maxBpGapYear = r.year;
    }
    // Core bottleneck
    if (r.scenario.maxCoreUtilizationPct !== null && r.scenario.maxCoreUtilizationPct > maxCoreBottleneck) {
      maxCoreBottleneck = r.scenario.maxCoreUtilizationPct;
      maxCoreBottleneckYear = r.year;
    }
    // BU bottleneck
    if (r.scenario.maxBuUtilizationPct !== null && r.scenario.maxBuUtilizationPct > maxBuBottleneck) {
      maxBuBottleneck = r.scenario.maxBuUtilizationPct;
      maxBuBottleneckYear = r.year;
    }
    totalShortageChange += r.delta.shortageMonthCount;
  }

  return {
    maxRevenueBoostYear,
    maxBpGapYear,
    maxCoreBottleneckYear,
    maxBuBottleneckYear,
    totalShortageChange,
  };
}

// ============================================================
// Main entry point
// ============================================================

/**
 * Run yearly scenario: for each year, compute baseline (original data) and
 * scenario (with multipliers applied), then produce per-year comparison.
 */
export function runYearlyScenario(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  assumptions: Record<string, YearlyAssumption>,
  visibleYears: string[]
): YearlyScenarioOutput {
  const currencySettings = normalizeCurrencySettings(params.currencySettings);
  const bpTargets = params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
  const results: YearlyResultRow[] = [];

  // Filter invalid months before any calculation
  const validForecasts = filterValidForecasts(forecasts);
  const validCapacity = capacityPlans.filter((cp) => isValidForecastMonth(cp.month));

  for (const year of visibleYears) {
    const assumption = assumptions[year] ?? defaultAssumption();

    // Baseline: run calculation with valid data only
    const baseCalcResult = runCalculation(skus, validForecasts, validCapacity, params);
    const baseBpModel = buildBpAnalysis(
      baseCalcResult.skuResults,
      skus,
      baseCalcResult.monthlySummaries,
      bpTargets,
      currencySettings
    );

    // For scenario, apply multipliers to year-specific data
    const yearData = applyYearlyMultipliers(skus, validForecasts, validCapacity, year, assumption);

    // Build full scenario data: replace that year's data with modified data
    const scenarioForecasts = [
      ...validForecasts.filter((f) => !f.month.startsWith(year)),
      ...yearData.forecasts,
    ];
    const scenarioCapacity = [
      ...validCapacity.filter((cp) => !cp.month.startsWith(year)),
      ...yearData.capacityPlans,
    ];

    const scenarioCalcResult = runCalculation(
      yearData.skus,
      scenarioForecasts,
      scenarioCapacity,
      params
    );
    const scenarioBpModel = buildBpAnalysis(
      scenarioCalcResult.skuResults,
      yearData.skus,
      scenarioCalcResult.monthlySummaries,
      bpTargets,
      currencySettings
    );

    const baselineMetrics = extractMetrics(baseCalcResult, baseBpModel, year);
    const scenarioMetrics = extractMetrics(scenarioCalcResult, scenarioBpModel, year);
    const delta = computeYearlyDelta(baselineMetrics, scenarioMetrics);

    results.push({
      year,
      baseline: baselineMetrics,
      scenario: scenarioMetrics,
      delta,
    });
  }

  return {
    years: visibleYears,
    assumptions,
    results,
    summary: buildSummary(results),
  };
}
