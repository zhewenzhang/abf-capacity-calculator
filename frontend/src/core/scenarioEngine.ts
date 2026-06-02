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

