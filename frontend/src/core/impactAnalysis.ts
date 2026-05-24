/**
 * Impact Analysis — Price + Capacity scenarios (Phase 5.3B, v1.20.0)
 *
 * Deterministic, read-only what-if scenarios for decision support. These do NOT
 * mutate inputs, do NOT write to Firebase, and do NOT change capacity / BP /
 * currency core formulas. They are evaluated by re-running the existing
 * calculation engine on cloned inputs.
 *
 * Scenarios are fixed in this MVP:
 *   - Price: -10% / -5% / +5% / +10%
 *   - Capacity: Core +10%, BU +10%, Both +10%
 *
 * An interactive scenario builder may come later; this is the deterministic
 * baseline so future AI consumers can reason about price/capacity sensitivity.
 */

import type { SKU, Forecast, CapacityPlan, ProjectParameters, MonthlyCapacitySummary } from '../types';
import type { CurrencySettings } from './currency';
import { runCalculation } from './calculationEngine';
import { buildBpAnalysis } from './bpTargets';
import type { BpPeriodRecord } from './bpTargets';

// ===== Price impact =====

export interface PriceImpactYearly {
  year: string;
  baseRevenueMillionTwd: number;
  scenarioRevenueMillionTwd: number;
  revenueDeltaMillionTwd: number;
  baseBpAttainment: number | null;
  scenarioBpAttainment: number | null;
  bpAttainmentDelta: number | null;
  baseGapMillionTwd: number | null;
  scenarioGapMillionTwd: number | null;
}

export interface PriceImpactScenario {
  scenarioId: string;
  priceDeltaPct: number;
  yearly: PriceImpactYearly[];
}

export interface PriceImpactModel {
  scenarios: PriceImpactScenario[];
  /** Year whose attainment is most sensitive (max |delta in pp| across scenarios). null if no BP target. */
  mostSensitiveYear: string | null;
  /** Max attainment delta in percentage points (e.g., 12.3 = +12.3pp under +10%). */
  maxAttainmentDeltaPp: number | null;
}

const PRICE_DELTAS = [-0.1, -0.05, 0.05, 0.1] as const;

function cloneForecasts(forecasts: Forecast[], deltaPct: number): Forecast[] {
  if (deltaPct === 0) return forecasts.map((f) => ({ ...f }));
  return forecasts.map((f) => ({
    ...f,
    unitPrice: typeof f.unitPrice === 'number' && f.unitPrice > 0
      ? f.unitPrice * (1 + deltaPct)
      : f.unitPrice,
  }));
}

function cloneSkus(skus: SKU[], deltaPct: number): SKU[] {
  if (deltaPct === 0) return skus.map((s) => ({ ...s }));
  return skus.map((s) => ({
    ...s,
    unitPrice: typeof s.unitPrice === 'number' && s.unitPrice > 0
      ? s.unitPrice * (1 + deltaPct)
      : s.unitPrice,
  }));
}

/**
 * Build deterministic price-impact scenarios.
 *
 * Both SKU unitPrice and Forecast unitPrice are scaled (since revenue logic picks
 * Forecast.unitPrice when set, otherwise SKU.unitPrice). Currency normalization
 * stays exactly as in production: existing currency code on each price is
 * preserved; calculationEngine + bpTargets handle USD → TWD via the same path.
 */
export function buildPriceImpact(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters,
  currencySettings: CurrencySettings,
  bpTargetsMillionTwd: Record<string, number>
): PriceImpactModel {
  if (skus.length === 0 || forecasts.length === 0) {
    return { scenarios: [], mostSensitiveYear: null, maxAttainmentDeltaPp: null };
  }

  const baseCalc = runCalculation(skus, forecasts, capacityPlans, params);
  const baseBp = buildBpAnalysis(baseCalc.skuResults, skus, baseCalc.monthlySummaries, bpTargetsMillionTwd, currencySettings);
  const baseByYear = new Map<string, BpPeriodRecord>();
  for (const r of baseBp.yearly) baseByYear.set(r.period, r);

  const scenarios: PriceImpactScenario[] = [];
  let maxAttainmentDeltaPp = 0;
  let mostSensitiveYear: string | null = null;

  for (const delta of PRICE_DELTAS) {
    const sScenarioSkus = cloneSkus(skus, delta);
    const sScenarioForecasts = cloneForecasts(forecasts, delta);
    const sCalc = runCalculation(sScenarioSkus, sScenarioForecasts, capacityPlans, params);
    const sBp = buildBpAnalysis(sCalc.skuResults, sScenarioSkus, sCalc.monthlySummaries, bpTargetsMillionTwd, currencySettings);

    const yearly: PriceImpactYearly[] = sBp.yearly.map((sRec) => {
      const base = baseByYear.get(sRec.period);
      const baseRev = base?.forecastMillionTwd ?? 0;
      const scenRev = sRec.forecastMillionTwd;
      const baseAtt = base?.attainment ?? null;
      const scenAtt = sRec.attainment ?? null;
      const baseGap = base?.gapMillionTwd ?? null;
      const scenGap = sRec.gapMillionTwd ?? null;
      const attDelta = baseAtt !== null && scenAtt !== null ? scenAtt - baseAtt : null;
      if (attDelta !== null) {
        const absPp = Math.abs(attDelta) * 100;
        if (absPp > maxAttainmentDeltaPp) {
          maxAttainmentDeltaPp = absPp;
          mostSensitiveYear = sRec.period;
        }
      }
      return {
        year: sRec.period,
        baseRevenueMillionTwd: baseRev,
        scenarioRevenueMillionTwd: scenRev,
        revenueDeltaMillionTwd: scenRev - baseRev,
        baseBpAttainment: baseAtt,
        scenarioBpAttainment: scenAtt,
        bpAttainmentDelta: attDelta,
        baseGapMillionTwd: baseGap,
        scenarioGapMillionTwd: scenGap,
      };
    });

    scenarios.push({
      scenarioId: `price_${delta > 0 ? '+' : ''}${(delta * 100).toFixed(0)}pct`,
      priceDeltaPct: delta,
      yearly,
    });
  }

  return {
    scenarios,
    mostSensitiveYear,
    maxAttainmentDeltaPp: maxAttainmentDeltaPp > 0 ? Math.round(maxAttainmentDeltaPp * 10) / 10 : null,
  };
}

// ===== Capacity impact =====

export interface CapacityImpactScenario {
  scenarioId: string;
  coreCapacityDeltaPct: number;
  buCapacityDeltaPct: number;
  shortageMonthsBefore: number;
  shortageMonthsAfter: number;
  resolvedShortageMonths: string[];
  remainingShortageMonths: string[];
  maxCoreUtilBefore: number | null;
  maxCoreUtilAfter: number | null;
  maxBuUtilBefore: number | null;
  maxBuUtilAfter: number | null;
}

export interface CapacityImpactModel {
  scenarios: CapacityImpactScenario[];
  /** Scenario id that resolves the most shortage months; null when no shortage to begin with. */
  bestScenarioId: string | null;
}

function cloneCapacityPlans(
  capacityPlans: CapacityPlan[],
  coreDelta: number,
  buDelta: number
): CapacityPlan[] {
  if (coreDelta === 0 && buDelta === 0) return capacityPlans.map((cp) => ({ ...cp }));
  return capacityPlans.map((cp) => ({
    ...cp,
    corePanelPerDay: cp.corePanelPerDay * (1 + coreDelta),
    buPanelPerDay: cp.buPanelPerDay * (1 + buDelta),
  }));
}

function shortageMonthsOf(summaries: MonthlyCapacitySummary[]): string[] {
  const out: string[] = [];
  for (const s of summaries) {
    const coreUnmet = s.coreShortage > 0 || (s.coreUtilization === null && s.totalCorePanelDemand > 0);
    const buUnmet = s.buShortage > 0 || (s.buUtilization === null && s.totalBuPanelDemand > 0);
    if (coreUnmet || buUnmet) out.push(s.month);
  }
  return out.sort();
}

function maxUtilOf(summaries: MonthlyCapacitySummary[], pick: 'core' | 'bu'): number | null {
  let max: number | null = null;
  let hasOverflow = false;
  for (const s of summaries) {
    const util = pick === 'core' ? s.coreUtilization : s.buUtilization;
    const demand = pick === 'core' ? s.totalCorePanelDemand : s.totalBuPanelDemand;
    if (util === null && demand > 0) {
      hasOverflow = true;
      continue;
    }
    if (util !== null) {
      if (max === null || util > max) max = util;
    }
  }
  // Express "capacity = 0 with demand" as null max (matches AnalyticsModel convention).
  return hasOverflow ? null : max;
}

const CAPACITY_SCENARIOS: Array<{ id: string; core: number; bu: number }> = [
  { id: 'capacity_core_+10pct', core: 0.1, bu: 0 },
  { id: 'capacity_bu_+10pct', core: 0, bu: 0.1 },
  { id: 'capacity_both_+10pct', core: 0.1, bu: 0.1 },
];

export function buildCapacityImpact(
  skus: SKU[],
  forecasts: Forecast[],
  capacityPlans: CapacityPlan[],
  params: ProjectParameters
): CapacityImpactModel {
  if (skus.length === 0 || forecasts.length === 0 || capacityPlans.length === 0) {
    return { scenarios: [], bestScenarioId: null };
  }

  const baseCalc = runCalculation(skus, forecasts, capacityPlans, params);
  const beforeShortage = shortageMonthsOf(baseCalc.monthlySummaries);
  const beforeShortageSet = new Set(beforeShortage);
  const maxCoreBefore = maxUtilOf(baseCalc.monthlySummaries, 'core');
  const maxBuBefore = maxUtilOf(baseCalc.monthlySummaries, 'bu');

  const scenarios: CapacityImpactScenario[] = [];
  let bestScenarioId: string | null = null;
  let bestResolved = 0;

  for (const cfg of CAPACITY_SCENARIOS) {
    const scenarioPlans = cloneCapacityPlans(capacityPlans, cfg.core, cfg.bu);
    const sCalc = runCalculation(skus, forecasts, scenarioPlans, params);
    const afterShortage = shortageMonthsOf(sCalc.monthlySummaries);
    const afterShortageSet = new Set(afterShortage);
    const resolved = beforeShortage.filter((m) => !afterShortageSet.has(m));
    const remaining = beforeShortage.filter((m) => afterShortageSet.has(m));
    // New shortage months that didn't exist before should never happen for +N% capacity,
    // but keep the model honest by also reporting "remaining" purely from before-set.
    void beforeShortageSet;
    if (resolved.length > bestResolved) {
      bestResolved = resolved.length;
      bestScenarioId = cfg.id;
    }
    scenarios.push({
      scenarioId: cfg.id,
      coreCapacityDeltaPct: cfg.core,
      buCapacityDeltaPct: cfg.bu,
      shortageMonthsBefore: beforeShortage.length,
      shortageMonthsAfter: afterShortage.length,
      resolvedShortageMonths: resolved,
      remainingShortageMonths: remaining,
      maxCoreUtilBefore: maxCoreBefore,
      maxCoreUtilAfter: maxUtilOf(sCalc.monthlySummaries, 'core'),
      maxBuUtilBefore: maxBuBefore,
      maxBuUtilAfter: maxUtilOf(sCalc.monthlySummaries, 'bu'),
    });
  }

  return { scenarios, bestScenarioId };
}
