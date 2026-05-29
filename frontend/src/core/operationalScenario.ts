/**
 * Operational What-if Scenario module (v1.44.0).
 *
 * Extends scenarioEngine.ts with three new scenario types:
 * - CapacityShiftScenario (delay / pull-forward)
 * - ForecastAdjustmentScenario (percentage adjustment, scoped)
 * - OrderDisappearanceScenario (remove matching forecasts)
 *
 * Also computes per-customer and per-SKU impact analysis (CustomerSkuImpact).
 *
 * Key design: Compute baseline from original data, transform data for scenario,
 * then compute scenario from transformed data. Build ScenarioComparison manually
 * with separate baseline/scenario runs. scenarioEngine.ts is NOT modified.
 *
 * Constraints:
 * - Pure function, zero side effects
 * - No imports from services/**
 * - Deterministic: same input always produces same output
 * - All outputs include "what-if projection" caveat
 * - Deep clone inputs before transformation (no mutation)
 */

import type {
  SKU,
  Forecast,
  CapacityPlan,
  ProjectParameters,
  SkuCalculationResult,
} from '../types';
import type { DataQualitySummary } from './dataQuality';
import type { BpAnalysisModel } from './bpTargets';
import type {
  ScenarioComparison,
  ScenarioDeltas,
  DeltaMetric,
} from './scenarioEngine';
import { defaultMultipliers } from './scenarioEngine';
import { normalizeCurrencySettings } from './currency';
import { runCalculation } from './calculationEngine';
import { buildBpAnalysis } from './bpTargets';
import { buildDataQualitySummary } from './dataQuality';

// ============================================================
// Types (implemented exactly per task spec)
// ============================================================

export type OperationalScenarioType =
  | 'capacityDelay'
  | 'capacityPullForward'
  | 'forecastAdjustment'
  | 'orderDisappearance';

export interface OperationalScenarioParams {
  scenarioType: OperationalScenarioType;
  skus: SKU[];
  forecasts: Forecast[];
  capacityPlans: CapacityPlan[];
  params: ProjectParameters;
  // Type-specific config
  capacityShiftMonths?: number; // for delay/pull-forward
  capacityShiftTarget?: 'core' | 'bu' | 'both';
  factoryIds?: string[];
  forecastAdjustPercent?: number; // for adjustment
  forecastFilter?: {
    customers?: string[];
    skuIds?: string[];
    skuCodes?: string[];
    months?: string[];
  };
  orderFilter?: {
    customer?: string;
    skuId?: string;
    skuCode?: string;
    month?: string;
  };
}

export interface CustomerSkuDelta {
  id: string;
  label: string;
  baselineRevenue: number;
  scenarioRevenue: number;
  delta: number;
  deltaPercent: number;
}

export interface CustomerSkuImpact {
  byCustomer: CustomerSkuDelta[];
  bySku: CustomerSkuDelta[];
  top20Sku: CustomerSkuDelta[];
}

export interface OperationalScenarioResult {
  comparison: ScenarioComparison;
  impact: CustomerSkuImpact;
  scenarioType: OperationalScenarioType;
  description: string;
  caveats: string[];
}

// ============================================================
// Constants
// ============================================================

const WHAT_IF_CAVEAT =
  'This result is a what-if projection based on simplified assumptions. '
  + 'Actual outcomes may differ due to supply chain dynamics, lead times, '
  + 'and other factors not captured in this model.';

const MIN_CAPACITY_SHIFT = -12;
const MAX_CAPACITY_SHIFT = 12;
const MIN_FORECAST_ADJUST = -50;
const MAX_FORECAST_ADJUST = 100;

// ============================================================
// Entry point
// ============================================================

/**
 * Run an operational what-if scenario.
 *
 * Dispatches to the correct handler based on `scenarioType`, transforms the
 * raw data, computes baseline and scenario separately, then builds a
 * ScenarioComparison.
 *
 * Pure function, zero side effects, deterministic.
 */
export function runOperationalScenario(
  params: OperationalScenarioParams,
): OperationalScenarioResult {
  switch (params.scenarioType) {
    case 'capacityDelay':
    case 'capacityPullForward':
      return runCapacityShiftScenario(params);
    case 'forecastAdjustment':
      return runForecastAdjustmentScenario(params);
    case 'orderDisappearance':
      return runOrderDisappearanceScenario(params);
  }
}

// ============================================================
// Comparison builder (baseline vs scenario, separate runs)
// ============================================================

/**
 * Build a ScenarioComparison from two separate calculation runs:
 * one from original data (baseline) and one from transformed data (scenario).
 *
 * This replaces using computeScenarioComparison when the transformation
 * cannot be expressed as multipliers (e.g., capacity month shifts, order removal).
 */
function buildComparisonFromTransformedData(
  skus: SKU[],
  baselineForecasts: Forecast[],
  baselineCapacity: CapacityPlan[],
  scenarioForecasts: Forecast[],
  scenarioCapacity: CapacityPlan[],
  params: ProjectParameters,
  baselineDqSummary: DataQualitySummary,
): ScenarioComparison {
  const multipliers = defaultMultipliers();

  // Run baseline from original data
  const baseCalcResult = runCalculation(skus, baselineForecasts, baselineCapacity, params);
  // Run scenario from transformed data
  const scenarioCalcResult = runCalculation(skus, scenarioForecasts, scenarioCapacity, params);

  const currencySettings = normalizeCurrencySettings(params.currencySettings);

  const baseBpModel = buildBpAnalysis(
    baseCalcResult.skuResults,
    skus,
    baseCalcResult.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    currencySettings,
  );
  const scenarioBpModel = buildBpAnalysis(
    scenarioCalcResult.skuResults,
    skus,
    scenarioCalcResult.monthlySummaries,
    params.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
    currencySettings,
  );

  const scenarioDqSummary = buildDataQualitySummary({
    skus,
    forecasts: scenarioForecasts,
    capacityPlans: scenarioCapacity,
    params,
  });

  const deltas: ScenarioDeltas = {
    totalRevenueUsd: computeDelta(baseCalcResult.totalRevenue, scenarioCalcResult.totalRevenue),
    totalForecastPcs: computeDelta(baseCalcResult.totalForecastPcs, scenarioCalcResult.totalForecastPcs),
    maxCoreUtilization: computeDelta(
      baseCalcResult.maxCoreUtilization === null ? Infinity : baseCalcResult.maxCoreUtilization,
      scenarioCalcResult.maxCoreUtilization === null ? Infinity : scenarioCalcResult.maxCoreUtilization,
    ),
    maxBuUtilization: computeDelta(
      baseCalcResult.maxBuUtilization === null ? Infinity : baseCalcResult.maxBuUtilization,
      scenarioCalcResult.maxBuUtilization === null ? Infinity : scenarioCalcResult.maxBuUtilization,
    ),
    shortageMonthCount: computeDelta(baseCalcResult.shortageMonthCount, scenarioCalcResult.shortageMonthCount),
    bpAttainmentPct: computeDelta(
      computeBpAttainmentPct(baseBpModel),
      computeBpAttainmentPct(scenarioBpModel),
    ),
    bpGapMillionTwd: computeDelta(
      computeBpGap(baseBpModel),
      computeBpGap(scenarioBpModel),
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
// Capacity shift scenario
// ============================================================

function runCapacityShiftScenario(
  p: OperationalScenarioParams,
): OperationalScenarioResult {
  const { skus, forecasts, capacityPlans, params, scenarioType } = p;
  const rawShift = p.capacityShiftMonths ?? 0;
  const target = p.capacityShiftTarget ?? 'both';
  const factoryIds = p.factoryIds;

  // For pull-forward, the shift is negative
  const shiftMonths = scenarioType === 'capacityPullForward' ? -Math.abs(rawShift) : Math.abs(rawShift);
  const clampedShift = clampCapacityShift(shiftMonths);

  // Deep clone inputs
  const clonedSkus = deepCloneArray(skus);
  const clonedForecasts = deepCloneArray(forecasts);
  const clonedCapacityPlans = deepCloneArray(capacityPlans);

  // Transform: shift capacity plans by N months
  const shiftedCapacity = shiftCapacityPlans(
    clonedCapacityPlans,
    clampedShift,
    target,
    factoryIds,
    clonedForecasts,
  );

  const dqSummary = buildDataQualitySummary({
    skus: clonedSkus,
    forecasts: clonedForecasts,
    capacityPlans: clonedCapacityPlans,
    params,
  });

  const comparison = buildComparisonFromTransformedData(
    clonedSkus,
    clonedForecasts,
    clonedCapacityPlans, // baseline: original capacity
    clonedForecasts,
    shiftedCapacity,     // scenario: shifted capacity
    params,
    dqSummary,
  );

  const impact = computeCustomerSkuImpact(comparison, clonedSkus);
  const direction = clampedShift > 0 ? 'delayed' : 'pulled forward';

  return {
    comparison,
    impact,
    scenarioType,
    description:
      `Capacity ${direction} by ${Math.abs(clampedShift)} month(s)`
      + (target !== 'both' ? ` (target: ${target})` : '')
      + (factoryIds && factoryIds.length > 0
        ? ` (factories: ${factoryIds.join(', ')})`
        : ''),
    caveats: [WHAT_IF_CAVEAT],
  };
}

/**
 * Shift capacity plan entries by N months.
 *
 * - Entries for non-matching factory IDs are kept unchanged.
 * - Shifted entries that fall outside the forecast date range are dropped.
 */
function shiftCapacityPlans(
  capacityPlans: CapacityPlan[],
  shiftMonths: number,
  target: 'core' | 'bu' | 'both',
  factoryIds: string[] | undefined,
  forecasts: Forecast[],
): CapacityPlan[] {
  if (target !== 'both') {
    throw new Error(
      `shiftCapacityPlans: target="${target}" is not supported. Only "both" is currently supported.`
    );
  }
  const forecastMonths = forecasts.map((f) => f.month);
  const minMonth = forecastMonths.length > 0 ? forecastMonths.reduce((a, b) => (a < b ? a : b)) : '';
  const maxMonth = forecastMonths.length > 0 ? forecastMonths.reduce((a, b) => (a > b ? a : b)) : '';

  return capacityPlans
    .map((cp) => {
      // If factoryIds specified and this entry doesn't match, keep unchanged
      if (factoryIds && factoryIds.length > 0 && !factoryIds.includes(cp.factoryId)) {
        return cp;
      }

      // Shift the month
      const shiftedMonth = shiftMonthString(cp.month, shiftMonths);
      if (!shiftedMonth) {
        return null; // invalid month format
      }

      // Drop if outside forecast range
      if (minMonth && maxMonth && (shiftedMonth < minMonth || shiftedMonth > maxMonth)) {
        return null;
      }

      return {
        ...cp,
        month: shiftedMonth,
      };
    })
    .filter((cp): cp is CapacityPlan => cp !== null);
}

// ============================================================
// Forecast adjustment scenario
// ============================================================

function runForecastAdjustmentScenario(
  p: OperationalScenarioParams,
): OperationalScenarioResult {
  const { skus, forecasts, capacityPlans, params } = p;
  const rawPercent = p.forecastAdjustPercent ?? 0;
  const clampedPercent = clampForecastAdjust(rawPercent);
  const filter = p.forecastFilter;

  // Deep clone inputs
  const clonedSkus = deepCloneArray(skus);
  const clonedForecasts = deepCloneArray(forecasts);
  const clonedCapacityPlans = deepCloneArray(capacityPlans);

  // Build SKU map for customer/code lookups
  const skuMap = new Map<string, SKU>();
  for (const s of clonedSkus) skuMap.set(s.id, s);

  // Transform: adjust forecastPcs for matching entries
  const adjustedForecasts = adjustForecastVolume(
    clonedForecasts,
    clampedPercent,
    filter,
    skuMap,
  );

  const dqSummary = buildDataQualitySummary({
    skus: clonedSkus,
    forecasts: clonedForecasts,
    capacityPlans: clonedCapacityPlans,
    params,
  });

  const comparison = buildComparisonFromTransformedData(
    clonedSkus,
    clonedForecasts,     // baseline: original forecasts
    clonedCapacityPlans,
    adjustedForecasts,   // scenario: adjusted forecasts
    clonedCapacityPlans,
    params,
    dqSummary,
  );

  const impact = computeCustomerSkuImpact(comparison, clonedSkus);
  const direction = clampedPercent >= 0 ? 'increased' : 'decreased';

  const filterDesc = buildForecastFilterDescription(filter);

  return {
    comparison,
    impact,
    scenarioType: 'forecastAdjustment',
    description:
      `Forecast volume ${direction} by ${Math.abs(clampedPercent)}%`
      + (filterDesc ? ` (${filterDesc})` : ''),
    caveats: [WHAT_IF_CAVEAT],
  };
}

/**
 * Adjust forecast volume by a percentage for matching entries.
 * Non-matching entries are left unchanged.
 */
function adjustForecastVolume(
  forecasts: Forecast[],
  adjustPercent: number,
  filter: OperationalScenarioParams['forecastFilter'],
  skuMap: Map<string, SKU>,
): Forecast[] {
  return forecasts.map((f) => {
    if (!matchesForecastFilterWithSkus(f, filter, skuMap)) {
      return f;
    }
    return {
      ...f,
      forecastPcs: f.forecastPcs * (1 + adjustPercent / 100),
    };
  });
}

// ============================================================
// Order disappearance scenario
// ============================================================

function runOrderDisappearanceScenario(
  p: OperationalScenarioParams,
): OperationalScenarioResult {
  const { skus, forecasts, capacityPlans, params } = p;
  const filter = p.orderFilter;

  // Deep clone inputs
  const clonedSkus = deepCloneArray(skus);
  const clonedForecasts = deepCloneArray(forecasts);
  const clonedCapacityPlans = deepCloneArray(capacityPlans);

  // Build SKU map for customer/code lookups
  const skuMap = new Map<string, SKU>();
  for (const s of clonedSkus) skuMap.set(s.id, s);

  // Transform: filter out matching forecasts
  const filteredForecasts = removeMatchingForecasts(clonedForecasts, filter, skuMap);

  const dqSummary = buildDataQualitySummary({
    skus: clonedSkus,
    forecasts: clonedForecasts,
    capacityPlans: clonedCapacityPlans,
    params,
  });

  const comparison = buildComparisonFromTransformedData(
    clonedSkus,
    clonedForecasts,     // baseline: all forecasts
    clonedCapacityPlans,
    filteredForecasts,   // scenario: filtered forecasts
    clonedCapacityPlans,
    params,
    dqSummary,
  );

  const impact = computeCustomerSkuImpact(comparison, clonedSkus);

  const filterDesc = buildOrderFilterDescription(filter);

  return {
    comparison,
    impact,
    scenarioType: 'orderDisappearance',
    description:
      'Order disappearance'
      + (filterDesc ? `: ${filterDesc}` : ''),
    caveats: [WHAT_IF_CAVEAT],
  };
}

/**
 * Remove forecasts that match the given filter criteria.
 * If a filter field is set, only forecasts matching that field are removed.
 * Multiple fields use AND logic: a forecast must match ALL set fields to be removed.
 */
function removeMatchingForecasts(
  forecasts: Forecast[],
  filter: OperationalScenarioParams['orderFilter'],
  skuMap: Map<string, SKU>,
): Forecast[] {
  if (!filter) return forecasts;

  return forecasts.filter((f) => !matchesOrderFilterWithSkus(f, filter, skuMap));
}

// ============================================================
// Customer/SKU impact analysis
// ============================================================

/**
 * Compute per-customer and per-SKU revenue delta from a scenario comparison.
 * Uses baseline and scenario skuResults.
 */
function computeCustomerSkuImpact(
  comparison: ScenarioComparison,
  skus: SKU[],
): CustomerSkuImpact {
  const baselineResults = comparison.baseline.calcResult.skuResults;
  const scenarioResults = comparison.scenario.calcResult.skuResults;

  const byCustomer = aggregateByCustomer(baselineResults, scenarioResults, skus);
  const bySku = aggregateBySku(baselineResults, scenarioResults, skus);

  // Top 20 SKUs by absolute revenue delta
  const top20Sku = [...bySku]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20);

  return { byCustomer, bySku, top20Sku };
}

/**
 * Aggregate revenue deltas by customer.
 */
function aggregateByCustomer(
  baselineResults: SkuCalculationResult[],
  scenarioResults: SkuCalculationResult[],
  skus: SKU[],
): CustomerSkuDelta[] {
  const skuMap = new Map<string, SKU>();
  for (const s of skus) skuMap.set(s.id, s);

  // Aggregate by customer: baseline
  const customerBaseRevenue = new Map<string, number>();
  const customerScenarioRevenue = new Map<string, number>();

  for (const r of baselineResults) {
    const sku = skuMap.get(r.skuId);
    if (!sku) continue;
    const customer = sku.customer;
    customerBaseRevenue.set(customer, (customerBaseRevenue.get(customer) ?? 0) + r.revenue);
  }

  for (const r of scenarioResults) {
    const sku = skuMap.get(r.skuId);
    if (!sku) continue;
    const customer = sku.customer;
    customerScenarioRevenue.set(customer, (customerScenarioRevenue.get(customer) ?? 0) + r.revenue);
  }

  // Merge all customers
  const allCustomers = new Set<string>([
    ...customerBaseRevenue.keys(),
    ...customerScenarioRevenue.keys(),
  ]);

  const result: CustomerSkuDelta[] = [];
  for (const customer of allCustomers) {
    const base = customerBaseRevenue.get(customer) ?? 0;
    const scenario = customerScenarioRevenue.get(customer) ?? 0;
    const delta = scenario - base;
    result.push({
      id: customer,
      label: customer,
      baselineRevenue: base,
      scenarioRevenue: scenario,
      delta,
      deltaPercent: base !== 0 ? (delta / base) * 100 : 0,
    });
  }

  // Sort by absolute delta descending
  result.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return result;
}

/**
 * Aggregate revenue deltas by SKU.
 */
function aggregateBySku(
  baselineResults: SkuCalculationResult[],
  scenarioResults: SkuCalculationResult[],
  skus: SKU[],
): CustomerSkuDelta[] {
  const skuMap = new Map<string, SKU>();
  for (const s of skus) skuMap.set(s.id, s);

  // Aggregate by SKU ID
  const skuBaseRevenue = new Map<string, number>();
  const skuScenarioRevenue = new Map<string, number>();

  for (const r of baselineResults) {
    skuBaseRevenue.set(r.skuId, (skuBaseRevenue.get(r.skuId) ?? 0) + r.revenue);
  }

  for (const r of scenarioResults) {
    skuScenarioRevenue.set(r.skuId, (skuScenarioRevenue.get(r.skuId) ?? 0) + r.revenue);
  }

  const allSkuIds = new Set<string>([
    ...skuBaseRevenue.keys(),
    ...skuScenarioRevenue.keys(),
  ]);

  const result: CustomerSkuDelta[] = [];
  for (const skuId of allSkuIds) {
    const sku = skuMap.get(skuId);
    const label = sku ? sku.skuCode : skuId;
    const base = skuBaseRevenue.get(skuId) ?? 0;
    const scenario = skuScenarioRevenue.get(skuId) ?? 0;
    const delta = scenario - base;
    result.push({
      id: skuId,
      label,
      baselineRevenue: base,
      scenarioRevenue: scenario,
      delta,
      deltaPercent: base !== 0 ? (delta / base) * 100 : 0,
    });
  }

  result.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return result;
}

// ============================================================
// Filter matching helpers
// ============================================================

/**
 * Check if a forecast matches the forecast adjustment filter (with SKU lookup).
 * Empty arrays mean "no filter for this dimension".
 * Multiple dimensions use AND logic.
 */
function matchesForecastFilterWithSkus(
  forecast: Forecast,
  filter: OperationalScenarioParams['forecastFilter'],
  skuMap: Map<string, SKU>,
): boolean {
  if (!filter) return true;

  if (filter.customers && filter.customers.length > 0) {
    const sku = skuMap.get(forecast.skuId);
    if (!sku || !filter.customers.includes(sku.customer)) return false;
  }

  if (filter.skuIds && filter.skuIds.length > 0) {
    if (!filter.skuIds.includes(forecast.skuId)) return false;
  }

  if (filter.skuCodes && filter.skuCodes.length > 0) {
    const sku = skuMap.get(forecast.skuId);
    if (!sku || !filter.skuCodes.includes(sku.skuCode)) return false;
  }

  if (filter.months && filter.months.length > 0) {
    if (!filter.months.includes(forecast.month)) return false;
  }

  return true;
}

/**
 * Check if a forecast matches the order disappearance filter (with SKU lookup).
 * All set fields use AND logic.
 */
function matchesOrderFilterWithSkus(
  forecast: Forecast,
  filter: OperationalScenarioParams['orderFilter'],
  skuMap: Map<string, SKU>,
): boolean {
  if (!filter) return false;

  if (filter.month !== undefined && filter.month !== '' && forecast.month !== filter.month) {
    return false;
  }

  if (filter.skuId !== undefined && filter.skuId !== '' && forecast.skuId !== filter.skuId) {
    return false;
  }

  if (filter.customer !== undefined && filter.customer !== '') {
    const sku = skuMap.get(forecast.skuId);
    if (!sku || sku.customer !== filter.customer) return false;
  }

  if (filter.skuCode !== undefined && filter.skuCode !== '') {
    const sku = skuMap.get(forecast.skuId);
    if (!sku || sku.skuCode !== filter.skuCode) return false;
  }

  return true;
}

// ============================================================
// Month string utilities
// ============================================================

/**
 * Shift a YYYY-MM month string by N months.
 * Returns null if the input is invalid.
 */
function shiftMonthString(month: string, shift: number): string | null {
  const parts = month.split('-');
  if (parts.length !== 2) return null;

  const year = parseInt(parts[0], 10);
  const mo = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(mo) || mo < 1 || mo > 12) return null;

  // Convert to 0-indexed month, add shift, convert back
  let totalMonths = (year * 12 + (mo - 1)) + shift;

  // Clamp to reasonable range (2000-01 to 2099-12)
  totalMonths = Math.max(2000 * 12, Math.min(2099 * 12 + 11, totalMonths));

  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  return `${newYear}-${String(newMonth).padStart(2, '0')}`;
}

// ============================================================
// Clamping utilities
// ============================================================

/**
 * Clamp capacity shift months to [-12, +12].
 */
function clampCapacityShift(months: number): number {
  return Math.max(MIN_CAPACITY_SHIFT, Math.min(MAX_CAPACITY_SHIFT, months));
}

/**
 * Clamp forecast adjustment percentage to [-50%, +100%].
 */
function clampForecastAdjust(percent: number): number {
  return Math.max(MIN_FORECAST_ADJUST, Math.min(MAX_FORECAST_ADJUST, percent));
}

// ============================================================
// Deep clone
// ============================================================

/**
 * Deep clone an array of plain objects (spread + Object.assign for each entry).
 */
function deepCloneArray<T>(arr: T[]): T[] {
  return arr.map((item) => ({ ...item }));
}

// ============================================================
// Description builders
// ============================================================

function buildForecastFilterDescription(
  filter: OperationalScenarioParams['forecastFilter'],
): string {
  if (!filter) return '';
  const parts: string[] = [];
  if (filter.customers && filter.customers.length > 0) {
    parts.push(`customers: ${filter.customers.join(', ')}`);
  }
  if (filter.skuIds && filter.skuIds.length > 0) {
    parts.push(`SKU IDs: ${filter.skuIds.join(', ')}`);
  }
  if (filter.skuCodes && filter.skuCodes.length > 0) {
    parts.push(`SKU codes: ${filter.skuCodes.join(', ')}`);
  }
  if (filter.months && filter.months.length > 0) {
    parts.push(`months: ${filter.months.join(', ')}`);
  }
  return parts.join('; ');
}

function buildOrderFilterDescription(
  filter: OperationalScenarioParams['orderFilter'],
): string {
  if (!filter) return '';
  const parts: string[] = [];
  if (filter.customer) parts.push(`customer: ${filter.customer}`);
  if (filter.skuId) parts.push(`SKU ID: ${filter.skuId}`);
  if (filter.skuCode) parts.push(`SKU code: ${filter.skuCode}`);
  if (filter.month) parts.push(`month: ${filter.month}`);
  return parts.join('; ');
}
