import type { SKU, Forecast, CapacityPlan, ProjectParameters, CalculationResult } from '../types';
import type { BpAnalysisModel } from './bpTargets';
import type { DataQualitySummary } from './dataQuality';
import { normalizeCurrencySettings } from './currency';
import { runCalculation } from './calculationEngine';
import { buildBpAnalysis } from './bpTargets';
import { buildDataQualitySummary } from './dataQuality';
import { filterValidForecasts } from './forecastMonthValidator';

export interface ScenarioMultipliers {
  forecastVolume: number;
  unitPrice: number;
  coreCapacity: number;
  buCapacity: number;
}

export interface ScenarioDeltas {
  totalRevenueUsd: DeltaMetric;
  totalForecastPcs: DeltaMetric;
  maxCoreUtilization: DeltaMetric;
  maxBuUtilization: DeltaMetric;
  shortageMonthCount: DeltaMetric;
  bpAttainmentPct: DeltaMetric;
  bpGapMillionTwd: DeltaMetric;
}

export interface DeltaMetric {
  base: number | null;
  scenario: number | null;
  delta: number | null;
  deltaPercent: number | null;
}

export interface ScenarioComparison {
  multipliers: ScenarioMultipliers;
  baseline: {
    calcResult: CalculationResult;
    bpModel: BpAnalysisModel;
    dqSummary: DataQualitySummary;
  };
  scenario: {
    calcResult: CalculationResult;
    bpModel: BpAnalysisModel;
    dqSummary: DataQualitySummary;
  };
  deltas: ScenarioDeltas;
}

export function defaultMultipliers(): ScenarioMultipliers {
  return { forecastVolume: 1.0, unitPrice: 1.0, coreCapacity: 1.0, buCapacity: 1.0 };
}

export function clampMultipliers(m: ScenarioMultipliers): ScenarioMultipliers {
  const clamp = (v: number) => Math.max(0.5, Math.min(2.0, v));
  return {
    forecastVolume: clamp(m.forecastVolume),
    unitPrice: clamp(m.unitPrice),
    coreCapacity: clamp(m.coreCapacity),
    buCapacity: clamp(m.buCapacity),
  };
}

export function applyScenarioMultipliers(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  multipliers: ScenarioMultipliers
): { skus: SKU[]; forecasts: Forecast[]; capacityPlans: CapacityPlan[] } {
  const m = clampMultipliers(multipliers);

  const scenarioSkus = skus.map((s) => ({
    ...s,
    unitPrice: s.unitPrice > 0 ? s.unitPrice * m.unitPrice : s.unitPrice,
  }));

  const scenarioForecasts = forecasts.map((f) => ({
    ...f,
    forecastPcs: f.forecastPcs * m.forecastVolume,
    unitPrice: f.unitPrice * m.unitPrice,
  }));

  const scenarioCapacityPlans = capacityPlans.map((cp) => ({
    ...cp,
    corePanelPerDay: cp.corePanelPerDay * m.coreCapacity,
    buPanelPerDay: cp.buPanelPerDay * m.buCapacity,
  }));

  return { skus: scenarioSkus, forecasts: scenarioForecasts, capacityPlans: scenarioCapacityPlans };
}

export function computeScenarioComparison(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  multipliers: ScenarioMultipliers,
  baselineDqSummary: DataQualitySummary
): ScenarioComparison {
  // Filter invalid months before any calculation
  const validForecasts = filterValidForecasts(forecasts);
  const scenarioData = applyScenarioMultipliers(skus, validForecasts, capacityPlans, multipliers);

  const baseCalcResult = runCalculation(skus, validForecasts, capacityPlans, params);
  const scenarioCalcResult = runCalculation(
    scenarioData.skus,
    scenarioData.forecasts,
    scenarioData.capacityPlans,
    params
  );

  const currencySettings = normalizeCurrencySettings(params.currencySettings);

  const baseBpModel = buildBpAnalysis(
    baseCalcResult.skuResults,
    skus,
    baseCalcResult.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    currencySettings
  );
  const scenarioBpModel = buildBpAnalysis(
    scenarioCalcResult.skuResults,
    scenarioData.skus,
    scenarioCalcResult.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    currencySettings
  );

  const scenarioDqSummary = buildDataQualitySummary({
    skus: scenarioData.skus,
    forecasts: scenarioData.forecasts,
    capacityPlans: scenarioData.capacityPlans,
    params,
  });

  const deltas: ScenarioDeltas = {
    totalRevenueUsd: computeDelta(baseCalcResult.totalRevenue, scenarioCalcResult.totalRevenue),
    totalForecastPcs: computeDelta(baseCalcResult.totalForecastPcs, scenarioCalcResult.totalForecastPcs),
    maxCoreUtilization: computeDelta(
      baseCalcResult.maxCoreUtilization === null ? Infinity : baseCalcResult.maxCoreUtilization,
      scenarioCalcResult.maxCoreUtilization === null ? Infinity : scenarioCalcResult.maxCoreUtilization
    ),
    maxBuUtilization: computeDelta(
      baseCalcResult.maxBuUtilization === null ? Infinity : baseCalcResult.maxBuUtilization,
      scenarioCalcResult.maxBuUtilization === null ? Infinity : scenarioCalcResult.maxBuUtilization
    ),
    shortageMonthCount: computeDelta(baseCalcResult.shortageMonthCount, scenarioCalcResult.shortageMonthCount),
    bpAttainmentPct: computeDelta(
      computeBpAttainmentPct(baseBpModel),
      computeBpAttainmentPct(scenarioBpModel)
    ),
    bpGapMillionTwd: computeDelta(
      computeBpGap(baseBpModel),
      computeBpGap(scenarioBpModel)
    ),
  };

  return {
    multipliers,
    baseline: { calcResult: baseCalcResult, bpModel: baseBpModel, dqSummary: baselineDqSummary },
    scenario: { calcResult: scenarioCalcResult, bpModel: scenarioBpModel, dqSummary: scenarioDqSummary },
    deltas,
  };
}

function computeDelta(base: number | null, scenario: number | null): DeltaMetric {
  const safeBase = base ?? 0;
  const safeScenario = scenario ?? 0;
  const delta = base !== null && scenario !== null ? safeScenario - safeBase : null;
  const deltaPercent = delta !== null && safeBase !== 0 ? (delta / safeBase) * 100 : null;
  return { base, scenario, delta, deltaPercent };
}

function computeBpAttainmentPct(bpModel: BpAnalysisModel): number | null {
  for (const record of bpModel.yearly) {
    if (record.status !== 'no-target' && record.attainment !== null) {
      return record.attainment * 100;
    }
  }
  return null;
}

function computeBpGap(bpModel: BpAnalysisModel): number | null {
  for (const record of bpModel.yearly) {
    if (record.status !== 'no-target' && record.gapMillionTwd !== null) {
      return record.gapMillionTwd;
    }
  }
  return null;
}

// ============================================================
// v1.55 — Annual multiplier support
// ============================================================

export type AnnualMultipliers = Record<string, ScenarioMultipliers>;

/** Extract YYYY from a YYYY-MM month key */
function yearOf(month: string): string {
  return month.substring(0, 4);
}

/**
 * Apply per-year multipliers to input data.
 * For each data point, extracts the year from its month field and
 * looks up the per-year multiplier. Falls back to identity (1.0) if
 * no multiplier is defined for that year.
 */
export function applyAnnualMultipliers(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  annual: AnnualMultipliers
): { skus: SKU[]; forecasts: Forecast[]; capacityPlans: CapacityPlan[] } {
  const getM = (year: string): ScenarioMultipliers => {
    return annual[year] ?? defaultMultipliers();
  };

  // SKU unitPrice: use the first available year's multiplier (or identity)
  const firstYear = Object.keys(annual).sort()[0];
  const skuM = firstYear ? getM(firstYear) : defaultMultipliers();

  const scenarioSkus = skus.map((s) => ({
    ...s,
    unitPrice: s.unitPrice > 0 ? s.unitPrice * skuM.unitPrice : s.unitPrice,
  }));

  const scenarioForecasts = forecasts.map((f) => {
    const m = getM(yearOf(f.month));
    return {
      ...f,
      forecastPcs: f.forecastPcs * m.forecastVolume,
      unitPrice: f.unitPrice * m.unitPrice,
    };
  });

  const scenarioCapacityPlans = capacityPlans.map((cp) => {
    const m = getM(yearOf(cp.month));
    return {
      ...cp,
      corePanelPerDay: cp.corePanelPerDay * m.coreCapacity,
      buPanelPerDay: cp.buPanelPerDay * m.buCapacity,
    };
  });

  return { skus: scenarioSkus, forecasts: scenarioForecasts, capacityPlans: scenarioCapacityPlans };
}

/** Per-year aggregated result row for the annual impact table */
export interface YearlyResult {
  year: string;
  totalRevenueUsd: number;
  totalForecastPcs: number;
  maxCoreUtilization: number | null;
  maxBuUtilization: number | null;
  shortageMonthCount: number;
  bpAttainmentPct: number | null;
  bpGapMillionTwd: number | null;
}

/** Aggregate a CalculationResult + BpAnalysisModel into per-year rows */
export function aggregateByYear(
  calcResult: CalculationResult,
  bpModel: BpAnalysisModel
): YearlyResult[] {
  const yearMap = new Map<string, {
    revenue: number;
    forecastPcs: number;
    coreUtils: number[];
    buUtils: number[];
    shortageCount: number;
  }>();

  for (const sr of calcResult.skuResults) {
    const y = yearOf(sr.month);
    if (!yearMap.has(y)) yearMap.set(y, { revenue: 0, forecastPcs: 0, coreUtils: [], buUtils: [], shortageCount: 0 });
    const entry = yearMap.get(y)!;
    entry.revenue += sr.revenue;
    entry.forecastPcs += sr.forecastPcs;
  }

  for (const ms of calcResult.monthlySummaries) {
    const y = yearOf(ms.month);
    if (!yearMap.has(y)) yearMap.set(y, { revenue: 0, forecastPcs: 0, coreUtils: [], buUtils: [], shortageCount: 0 });
    const entry = yearMap.get(y)!;
    if (ms.coreUtilization !== null) entry.coreUtils.push(ms.coreUtilization);
    if (ms.buUtilization !== null) entry.buUtils.push(ms.buUtilization);
    if (ms.coreShortage > 0 || ms.buShortage > 0) entry.shortageCount++;
  }

  const bpByYear = new Map<string, { attainment: number | null; gap: number | null }>();
  for (const rec of bpModel.yearly) {
    bpByYear.set(rec.period, {
      attainment: rec.attainment !== null ? rec.attainment * 100 : null,
      gap: rec.gapMillionTwd,
    });
  }

  const years = Array.from(yearMap.keys()).sort();
  return years.map((year) => {
    const e = yearMap.get(year)!;
    const bp = bpByYear.get(year);
    return {
      year,
      totalRevenueUsd: e.revenue,
      totalForecastPcs: e.forecastPcs,
      maxCoreUtilization: e.coreUtils.length > 0 ? Math.max(...e.coreUtils) * 100 : null,
      maxBuUtilization: e.buUtils.length > 0 ? Math.max(...e.buUtils) * 100 : null,
      shortageMonthCount: e.shortageCount,
      bpAttainmentPct: bp?.attainment ?? null,
      bpGapMillionTwd: bp?.gap ?? null,
    };
  });
}

/** Full annual comparison result */
export interface AnnualScenarioComparison {
  annualMultipliers: AnnualMultipliers;
  baseline: {
    yearly: YearlyResult[];
    overall: CalculationResult;
    bpModel: BpAnalysisModel;
  };
  scenario: {
    yearly: YearlyResult[];
    overall: CalculationResult;
    bpModel: BpAnalysisModel;
  };
}

/**
 * Compute annual scenario comparison: runs calculation with per-year multipliers,
 * then aggregates both baseline and scenario into per-year rows.
 */
export function computeAnnualScenarioComparison(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  annual: AnnualMultipliers
): AnnualScenarioComparison {
  const scenarioData = applyAnnualMultipliers(skus, forecasts, capacityPlans, annual);

  const baseCalc = runCalculation(skus, forecasts, capacityPlans, params);
  const scenarioCalc = runCalculation(
    scenarioData.skus, scenarioData.forecasts, scenarioData.capacityPlans, params
  );

  const currencySettings = normalizeCurrencySettings(params.currencySettings);
  const bpTargets = params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};

  const baseBp = buildBpAnalysis(baseCalc.skuResults, skus, baseCalc.monthlySummaries, bpTargets, currencySettings);
  const scenarioBp = buildBpAnalysis(scenarioCalc.skuResults, scenarioData.skus, scenarioCalc.monthlySummaries, bpTargets, currencySettings);

  return {
    annualMultipliers: annual,
    baseline: {
      yearly: aggregateByYear(baseCalc, baseBp),
      overall: baseCalc,
      bpModel: baseBp,
    },
    scenario: {
      yearly: aggregateByYear(scenarioCalc, scenarioBp),
      overall: scenarioCalc,
      bpModel: scenarioBp,
    },
  };
}

