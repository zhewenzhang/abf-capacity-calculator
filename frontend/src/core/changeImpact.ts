/**
 * Change Impact calculation for Forecast Versioning (Phase 6).
 *
 * Compares two snapshots and computes the differences in:
 * - Revenue
 * - BP attainment
 * - Capacity utilization
 * - Shortage months
 * - Top changed customers / SKUs / months
 * - Price-driven vs quantity-driven revenue changes
 *
 * IMPORTANT: All attribution is proportional, NOT causal.
 * A "top changed customer" means that customer's revenue changed significantly,
 * NOT that the customer caused the change.
 */

import type { SKU, Forecast } from '../types';
import type { Snapshot } from '../types/snapshot';

/**
 * Delta for a single metric.
 */
export interface MetricDelta {
  base: number | null;
  target: number | null;
  delta: number | null;
  deltaPercent: number | null;
}

/**
 * Revenue delta broken down by price and quantity effects.
 */
export interface PriceQuantityAttribution {
  priceDrivenDeltaUsd: number;
  quantityDrivenDeltaUsd: number;
  priceDrivenPercent: number;
  quantityDrivenPercent: number;
}

/**
 * Top changed item with delta details.
 */
export interface TopChangedItem {
  id: string;
  label: string;
  baseRevenueUsd: number;
  targetRevenueUsd: number;
  revenueDeltaUsd: number;
  revenueDeltaPercent: number;
  baseForecastPcs: number;
  targetForecastPcs: number;
  forecastDeltaPcs: number;
}

/**
 * Monthly breakdown of changes.
 */
export interface MonthlyDelta {
  month: string;
  baseRevenueUsd: number;
  targetRevenueUsd: number;
  revenueDeltaUsd: number;
  baseForecastPcs: number;
  targetForecastPcs: number;
  forecastDeltaPcs: number;
  baseCoreUtil: number | null;
  targetCoreUtil: number | null;
  coreUtilDelta: number | null;
  baseBuUtil: number | null;
  targetBuUtil: number | null;
  buUtilDelta: number | null;
  baseShortage: boolean;
  targetShortage: boolean;
}

/**
 * Complete change impact result between two snapshots.
 */
export interface ChangeImpactResult {
  baseSnapshot: {
    id: string;
    name: string;
    createdAt: string;
  };
  targetSnapshot: {
    id: string;
    name: string;
    createdAt: string;
  };
  generatedAt: string;
  appVersion: string;
  summary: {
    revenueDelta: MetricDelta;
    bpAttainmentDelta: MetricDelta;
    bpGapDelta: MetricDelta;
    maxCoreUtilizationDelta: MetricDelta;
    maxBuUtilizationDelta: MetricDelta;
    shortageMonthDelta: MetricDelta;
    skuCountDelta: MetricDelta;
    forecastMonthDelta: MetricDelta;
  };
  priceQuantityAttribution: PriceQuantityAttribution;
  topChangedCustomers: TopChangedItem[];
  topChangedSkus: TopChangedItem[];
  topChangedMonths: TopChangedItem[];
  attributionDisclaimer: string;
}

/**
 * Compute the delta between two numeric values.
 */
function computeDelta(base: number | null, target: number | null): MetricDelta {
  if (base === null && target === null) {
    return { base: null, target: null, delta: null, deltaPercent: null };
  }

  const baseVal = base ?? 0;
  const targetVal = target ?? 0;
  const delta = targetVal - baseVal;

  let deltaPercent: number | null = null;
  if (baseVal !== 0) {
    deltaPercent = (delta / baseVal) * 100;
  } else if (targetVal !== 0) {
    deltaPercent = 100; // From 0 to something is +100%
  }

  return {
    base: baseVal,
    target: targetVal,
    delta,
    deltaPercent,
  };
}

/**
 * Build a map of SKU ID to SKU info.
 */
function buildSkuMap(skus: SKU[]): Map<string, SKU> {
  const map = new Map<string, SKU>();
  for (const sku of skus) {
    map.set(sku.id, sku);
  }
  return map;
}

/**
 * Build a map of SKU ID + month to forecast.
 */
function buildForecastMap(forecasts: Forecast[]): Map<string, Forecast> {
  const map = new Map<string, Forecast>();
  for (const f of forecasts) {
    map.set(`${f.skuId}:${f.month}`, f);
  }
  return map;
}

/**
 * Compute revenue by customer from SKU and forecast data.
 */
function computeRevenueByCustomer(
  skus: SKU[],
  forecasts: Forecast[]
): Map<string, { revenueUsd: number; forecastPcs: number }> {
  const result = new Map<string, { revenueUsd: number; forecastPcs: number }>();
  const skuMap = buildSkuMap(skus);

  for (const f of forecasts) {
    const sku = skuMap.get(f.skuId);
    if (!sku) continue;

    const customer = sku.customer || 'Unknown';
    const revenueUsd = f.forecastPcs * f.unitPrice;

    const existing = result.get(customer) || { revenueUsd: 0, forecastPcs: 0 };
    existing.revenueUsd += revenueUsd;
    existing.forecastPcs += f.forecastPcs;
    result.set(customer, existing);
  }

  return result;
}

/**
 * Compute revenue by SKU.
 */
function computeRevenueBySku(
  skus: SKU[],
  forecasts: Forecast[]
): Map<string, { skuCode: string; revenueUsd: number; forecastPcs: number }> {
  const result = new Map<string, { skuCode: string; revenueUsd: number; forecastPcs: number }>();
  const skuMap = buildSkuMap(skus);

  for (const f of forecasts) {
    const sku = skuMap.get(f.skuId);
    if (!sku) continue;

    const revenueUsd = f.forecastPcs * f.unitPrice;

    const existing = result.get(f.skuId) || {
      skuCode: sku.skuCode,
      revenueUsd: 0,
      forecastPcs: 0,
    };
    existing.revenueUsd += revenueUsd;
    existing.forecastPcs += f.forecastPcs;
    result.set(f.skuId, existing);
  }

  return result;
}

/**
 * Compute revenue and forecast by month.
 */
function computeRevenueByMonth(
  forecasts: Forecast[]
): Map<string, { revenueUsd: number; forecastPcs: number }> {
  const result = new Map<string, { revenueUsd: number; forecastPcs: number }>();

  for (const f of forecasts) {
    const revenueUsd = f.forecastPcs * f.unitPrice;

    const existing = result.get(f.month) || { revenueUsd: 0, forecastPcs: 0 };
    existing.revenueUsd += revenueUsd;
    existing.forecastPcs += f.forecastPcs;
    result.set(f.month, existing);
  }

  return result;
}

/**
 * Compute price-driven vs quantity-driven revenue attribution.
 *
 * For each SKU-month pair that exists in both snapshots:
 * - Price effect = (new_price - old_price) * old_quantity
 * - Quantity effect = (new_quantity - old_quantity) * old_price
 *
 * This is a simplified attribution that shows the first-order effects.
 * Cross-effects (price * quantity changes) are split 50/50.
 */
function computePriceQuantityAttribution(
  baseForecasts: Forecast[],
  targetForecasts: Forecast[]
): PriceQuantityAttribution {
  const baseMap = buildForecastMap(baseForecasts);
  const targetMap = buildForecastMap(targetForecasts);

  let priceDrivenDeltaUsd = 0;
  let quantityDrivenDeltaUsd = 0;

  // Find common SKU-month pairs
  for (const [key, baseF] of baseMap) {
    const targetF = targetMap.get(key);
    if (!targetF) continue;

    const priceDelta = targetF.unitPrice - baseF.unitPrice;
    const quantityDelta = targetF.forecastPcs - baseF.forecastPcs;

    // Price effect: price change * old quantity
    const priceEffect = priceDelta * baseF.forecastPcs;

    // Quantity effect: quantity change * old price
    const quantityEffect = quantityDelta * baseF.unitPrice;

    // Cross effect: price change * quantity change (split 50/50)
    const crossEffect = priceDelta * quantityDelta;

    priceDrivenDeltaUsd += priceEffect + crossEffect / 2;
    quantityDrivenDeltaUsd += quantityEffect + crossEffect / 2;
  }

  const totalDelta = Math.abs(priceDrivenDeltaUsd) + Math.abs(quantityDrivenDeltaUsd);
  const priceDrivenPercent = totalDelta > 0 ? (Math.abs(priceDrivenDeltaUsd) / totalDelta) * 100 : 0;
  const quantityDrivenPercent = totalDelta > 0 ? (Math.abs(quantityDrivenDeltaUsd) / totalDelta) * 100 : 0;

  return {
    priceDrivenDeltaUsd,
    quantityDrivenDeltaUsd,
    priceDrivenPercent,
    quantityDrivenPercent,
  };
}

/**
 * Compute top changed customers.
 */
function computeTopChangedCustomers(
  baseSkus: SKU[],
  baseForecasts: Forecast[],
  targetSkus: SKU[],
  targetForecasts: Forecast[],
  topN = 5
): TopChangedItem[] {
  const baseRevenue = computeRevenueByCustomer(baseSkus, baseForecasts);
  const targetRevenue = computeRevenueByCustomer(targetSkus, targetForecasts);

  // Get all customers
  const allCustomers = new Set([...baseRevenue.keys(), ...targetRevenue.keys()]);

  const changes: TopChangedItem[] = [];

  for (const customer of allCustomers) {
    const base = baseRevenue.get(customer) || { revenueUsd: 0, forecastPcs: 0 };
    const target = targetRevenue.get(customer) || { revenueUsd: 0, forecastPcs: 0 };

    const revenueDeltaUsd = target.revenueUsd - base.revenueUsd;
    const revenueDeltaPercent = base.revenueUsd > 0
      ? (revenueDeltaUsd / base.revenueUsd) * 100
      : (target.revenueUsd > 0 ? 100 : 0);

    changes.push({
      id: customer,
      label: customer,
      baseRevenueUsd: base.revenueUsd,
      targetRevenueUsd: target.revenueUsd,
      revenueDeltaUsd,
      revenueDeltaPercent,
      baseForecastPcs: base.forecastPcs,
      targetForecastPcs: target.forecastPcs,
      forecastDeltaPcs: target.forecastPcs - base.forecastPcs,
    });
  }

  // Sort by absolute delta, descending
  changes.sort((a, b) => Math.abs(b.revenueDeltaUsd) - Math.abs(a.revenueDeltaUsd));

  return changes.slice(0, topN);
}

/**
 * Compute top changed SKUs.
 */
function computeTopChangedSkus(
  baseSkus: SKU[],
  baseForecasts: Forecast[],
  targetSkus: SKU[],
  targetForecasts: Forecast[],
  topN = 5
): TopChangedItem[] {
  const baseRevenue = computeRevenueBySku(baseSkus, baseForecasts);
  const targetRevenue = computeRevenueBySku(targetSkus, targetForecasts);

  // Get all SKU IDs
  const allSkuIds = new Set([...baseRevenue.keys(), ...targetRevenue.keys()]);

  const changes: TopChangedItem[] = [];

  for (const skuId of allSkuIds) {
    const base = baseRevenue.get(skuId) || { skuCode: 'Unknown', revenueUsd: 0, forecastPcs: 0 };
    const target = targetRevenue.get(skuId) || { skuCode: base.skuCode, revenueUsd: 0, forecastPcs: 0 };

    const revenueDeltaUsd = target.revenueUsd - base.revenueUsd;
    const revenueDeltaPercent = base.revenueUsd > 0
      ? (revenueDeltaUsd / base.revenueUsd) * 100
      : (target.revenueUsd > 0 ? 100 : 0);

    changes.push({
      id: skuId,
      label: target.skuCode || base.skuCode,
      baseRevenueUsd: base.revenueUsd,
      targetRevenueUsd: target.revenueUsd,
      revenueDeltaUsd,
      revenueDeltaPercent,
      baseForecastPcs: base.forecastPcs,
      targetForecastPcs: target.forecastPcs,
      forecastDeltaPcs: target.forecastPcs - base.forecastPcs,
    });
  }

  // Sort by absolute delta, descending
  changes.sort((a, b) => Math.abs(b.revenueDeltaUsd) - Math.abs(a.revenueDeltaUsd));

  return changes.slice(0, topN);
}

/**
 * Compute top changed months.
 */
function computeTopChangedMonths(
  baseForecasts: Forecast[],
  targetForecasts: Forecast[],
  topN = 5
): TopChangedItem[] {
  const baseRevenue = computeRevenueByMonth(baseForecasts);
  const targetRevenue = computeRevenueByMonth(targetForecasts);

  // Get all months
  const allMonths = new Set([...baseRevenue.keys(), ...targetRevenue.keys()]);

  const changes: TopChangedItem[] = [];

  for (const month of allMonths) {
    const base = baseRevenue.get(month) || { revenueUsd: 0, forecastPcs: 0 };
    const target = targetRevenue.get(month) || { revenueUsd: 0, forecastPcs: 0 };

    const revenueDeltaUsd = target.revenueUsd - base.revenueUsd;
    const revenueDeltaPercent = base.revenueUsd > 0
      ? (revenueDeltaUsd / base.revenueUsd) * 100
      : (target.revenueUsd > 0 ? 100 : 0);

    changes.push({
      id: month,
      label: month,
      baseRevenueUsd: base.revenueUsd,
      targetRevenueUsd: target.revenueUsd,
      revenueDeltaUsd,
      revenueDeltaPercent,
      baseForecastPcs: base.forecastPcs,
      targetForecastPcs: target.forecastPcs,
      forecastDeltaPcs: target.forecastPcs - base.forecastPcs,
    });
  }

  // Sort by absolute delta, descending
  changes.sort((a, b) => Math.abs(b.revenueDeltaUsd) - Math.abs(a.revenueDeltaUsd));

  return changes.slice(0, topN);
}

/**
 * Main function: Compute change impact between two snapshots.
 */
export function computeChangeImpact(
  baseSnapshot: Snapshot,
  targetSnapshot: Snapshot
): ChangeImpactResult {
  const base = baseSnapshot.rawInputs;
  const target = targetSnapshot.rawInputs;

  const baseHighlights = baseSnapshot.derivedHighlights;
  const targetHighlights = targetSnapshot.derivedHighlights;

  // Summary deltas
  const revenueDelta = computeDelta(
    baseHighlights.totalRevenueUsd,
    targetHighlights.totalRevenueUsd
  );

  const bpAttainmentDelta = computeDelta(
    baseHighlights.bpAttainment,
    targetHighlights.bpAttainment
  );

  const bpGapDelta = computeDelta(
    baseHighlights.bpGapMillionTwd,
    targetHighlights.bpGapMillionTwd
  );

  const maxCoreUtilizationDelta = computeDelta(
    baseHighlights.maxCoreUtilization,
    targetHighlights.maxCoreUtilization
  );

  const maxBuUtilizationDelta = computeDelta(
    baseHighlights.maxBuUtilization,
    targetHighlights.maxBuUtilization
  );

  const shortageMonthDelta = computeDelta(
    baseHighlights.shortageMonthCount,
    targetHighlights.shortageMonthCount
  );

  const skuCountDelta = computeDelta(
    baseHighlights.skuCount,
    targetHighlights.skuCount
  );

  const forecastMonthDelta = computeDelta(
    baseHighlights.forecastMonthCount,
    targetHighlights.forecastMonthCount
  );

  // Price vs quantity attribution
  const priceQuantityAttribution = computePriceQuantityAttribution(
    base.forecasts,
    target.forecasts
  );

  // Top changed items
  const topChangedCustomers = computeTopChangedCustomers(
    base.skus,
    base.forecasts,
    target.skus,
    target.forecasts
  );

  const topChangedSkus = computeTopChangedSkus(
    base.skus,
    base.forecasts,
    target.skus,
    target.forecasts
  );

  const topChangedMonths = computeTopChangedMonths(
    base.forecasts,
    target.forecasts
  );

  return {
    baseSnapshot: {
      id: baseSnapshot.id,
      name: baseSnapshot.name,
      createdAt: baseSnapshot.createdAt.toISOString(),
    },
    targetSnapshot: {
      id: targetSnapshot.id,
      name: targetSnapshot.name,
      createdAt: targetSnapshot.createdAt.toISOString(),
    },
    generatedAt: new Date().toISOString(),
    appVersion: 'v1.22.0',
    summary: {
      revenueDelta,
      bpAttainmentDelta,
      bpGapDelta,
      maxCoreUtilizationDelta,
      maxBuUtilizationDelta,
      shortageMonthDelta,
      skuCountDelta,
      forecastMonthDelta,
    },
    priceQuantityAttribution,
    topChangedCustomers,
    topChangedSkus,
    topChangedMonths,
    attributionDisclaimer:
      'All attribution is proportional (revenue-share based), NOT causal. ' +
      'A "top changed customer" means that customer\'s revenue changed significantly, ' +
      'NOT that the customer caused the change. ' +
      'Price vs quantity attribution shows first-order effects only.',
  };
}
