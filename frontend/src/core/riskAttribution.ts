/**
 * Risk Driver Attribution (Phase 5.2)
 *
 * Differs from analytics matrices:
 * - Matrices answer "who contributes most overall".
 * - Attribution answers "who contributes most during shortage / bottleneck months".
 *
 * SKU Health Signals is a deterministic MVP classification combining revenue share
 * and capacity-pressure share. It is NOT AI judgment and NOT a final causal model.
 *
 * MVP capacityPressureIndex = shortageCoreDemand + shortageBuDemand (unweighted).
 */

import type { SKU } from '../types';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';

// ============================================================
// Types
// ============================================================

export type RiskDriverDimension =
  | 'customer'
  | 'sku'
  | 'size'
  | 'application'
  | 'productGrade'
  | 'layerBucket';

export type RiskDriverMetric =
  | 'revenue'
  | 'coreDemand'
  | 'buDemand'
  | 'shortageCoreDemand'
  | 'shortageBuDemand'
  | 'bpGapContribution'
  | 'capacityPressureIndex';

export interface RiskDriver {
  dimension: RiskDriverDimension;
  label: string;
  metric: RiskDriverMetric;
  value: number;
  share?: number; // 0-100 of group total
  affectedPeriods: string[];
  affectedSkuIds?: string[];
  severity: 'critical' | 'warning' | 'info';
  reason: string;
}

export type SkuHealthClassification =
  | 'strategicGrowth'
  | 'cashCow'
  | 'capacityDrainer'
  | 'lowValueHighLoad'
  | 'watchList'
  | 'dataIncomplete';

export interface SkuHealthSignal {
  skuId: string;
  skuCode: string;
  customer: string;
  revenueUsd: number;
  coreDemand: number;
  buDemand: number;
  shortageCoreDemand: number;
  shortageBuDemand: number;
  revenueShare?: number; // 0-100 of total revenue
  capacityPressureShare?: number; // 0-100 of total capacity pressure index
  classification: SkuHealthClassification;
  reasons: string[];
}

export interface RiskAttributionModel {
  shortageMonths: string[];
  drivers: RiskDriver[];
  skuHealthSignals: SkuHealthSignal[];
}

// ============================================================
// Thresholds (MVP — documented in ANALYSIS_CONTRACT.md)
// ============================================================

export const HIGH_SHARE = 15; // % — high enough to dominate a dimension
export const LOW_SHARE = 5; // % — low enough to be considered minor
export const TOP_N_DRIVERS = 5;
export const TOP_N_HEALTH = 10;

// ============================================================
// Helpers
// ============================================================

function safeShare(value: number, total: number): number | undefined {
  if (total <= 0) return undefined;
  return Math.round((value / total) * 1000) / 10;
}

function getLayerBucket(layerCount: number): string {
  if (layerCount <= 8) return '2-8L';
  if (layerCount <= 14) return '10-14L';
  if (layerCount <= 20) return '16-20L';
  return '20L+';
}

function deterministicSort(a: { value: number; label: string }, b: { value: number; label: string }): number {
  if (b.value !== a.value) return b.value - a.value;
  return a.label.localeCompare(b.label);
}

// ============================================================
// Shortage month detection
// ============================================================

/**
 * A month qualifies as a shortage month if:
 *   - coreShortage > 0 or buShortage > 0 (explicit unmet demand), OR
 *   - utilization is null while corresponding demand > 0 (capacity = 0 with demand)
 */
function collectShortageMonths(model: AnalyticsModel): string[] {
  const out: string[] = [];
  for (const s of model.monthlySummaries) {
    const coreUnmet = s.coreShortage > 0 || (s.coreUtilization === null && s.totalCorePanelDemand > 0);
    const buUnmet = s.buShortage > 0 || (s.buUtilization === null && s.totalBuPanelDemand > 0);
    if (coreUnmet || buUnmet) out.push(s.month);
  }
  return out.sort();
}

// ============================================================
// Attribution group builder
// ============================================================

interface AggBucket {
  value: number;
  periods: Set<string>;
  skuIds: Set<string>;
}

function emptyBucket(): AggBucket {
  return { value: 0, periods: new Set(), skuIds: new Set() };
}

function buildDriversForDimension(args: {
  shortageRows: Array<{ skuId: string; month: string; coreDemand: number; buDemand: number }>;
  skuMap: Map<string, SKU>;
  dimension: RiskDriverDimension;
  dimensionFn: (sku: SKU) => string;
  metric: RiskDriverMetric;
  valueFn: (row: { coreDemand: number; buDemand: number }) => number;
  reasonPrefix: string;
}): RiskDriver[] {
  const { shortageRows, skuMap, dimension, dimensionFn, metric, valueFn, reasonPrefix } = args;
  const buckets = new Map<string, AggBucket>();
  let total = 0;

  for (const row of shortageRows) {
    const sku = skuMap.get(row.skuId);
    if (!sku) continue;
    const v = valueFn(row);
    if (v <= 0) continue;
    const label = dimensionFn(sku);
    if (!buckets.has(label)) buckets.set(label, emptyBucket());
    const bucket = buckets.get(label)!;
    bucket.value += v;
    bucket.periods.add(row.month);
    bucket.skuIds.add(row.skuId);
    total += v;
  }

  const driverList: RiskDriver[] = [];
  for (const [label, bucket] of buckets) {
    if (bucket.value <= 0) continue;
    const share = safeShare(bucket.value, total);
    const severity: RiskDriver['severity'] = share !== undefined && share >= HIGH_SHARE ? 'critical' : share !== undefined && share >= LOW_SHARE ? 'warning' : 'info';
    driverList.push({
      dimension,
      label,
      metric,
      value: bucket.value,
      share,
      affectedPeriods: Array.from(bucket.periods).sort(),
      affectedSkuIds: Array.from(bucket.skuIds).sort(),
      severity,
      reason: share !== undefined
        ? `${reasonPrefix} ${share.toFixed(1)}% during ${bucket.periods.size} shortage month(s).`
        : `${reasonPrefix} during ${bucket.periods.size} shortage month(s).`,
    });
  }

  driverList.sort(deterministicSort);
  return driverList.slice(0, TOP_N_DRIVERS);
}

// ============================================================
// BP gap drivers (period-level)
// ============================================================

function buildBpGapDrivers(bp?: BpAnalysisModel): RiskDriver[] {
  if (!bp || bp.yearly.length === 0) return [];
  const missOrWatch = bp.yearly.filter((r) => r.status === 'miss' || r.status === 'watch');
  if (missOrWatch.length === 0) return [];
  const totalAbsGap = missOrWatch.reduce((s, r) => s + Math.abs(r.gapMillionTwd ?? 0), 0);
  const drivers: RiskDriver[] = missOrWatch.map((r) => {
    const gap = Math.abs(r.gapMillionTwd ?? 0);
    const share = safeShare(gap, totalAbsGap);
    const severity: RiskDriver['severity'] = r.status === 'miss' ? 'critical' : 'warning';
    return {
      dimension: 'customer', // period-level driver represented as label
      label: r.period,
      metric: 'bpGapContribution',
      value: gap,
      share,
      affectedPeriods: [r.period],
      severity,
      reason: `BP attainment ${((r.attainment ?? 0) * 100).toFixed(1)}%; gap ${gap.toFixed(1)}M TWD.`,
    };
  });
  drivers.sort(deterministicSort);
  return drivers;
}

// ============================================================
// SKU Health Signals
// ============================================================

interface SkuAggregate {
  skuId: string;
  skuCode: string;
  customer: string;
  revenueUsd: number;
  coreDemand: number;
  buDemand: number;
  shortageCoreDemand: number;
  shortageBuDemand: number;
}

function classifySku(
  agg: SkuAggregate,
  revShare: number | undefined,
  pressureShare: number | undefined,
  invalidSkuIds: Set<string>
): { classification: SkuHealthClassification; reasons: string[] } {
  const reasons: string[] = [];

  if (invalidSkuIds.has(agg.skuId)) {
    reasons.push('SKU has invalid or missing required attributes (see Data Caveats).');
    return { classification: 'dataIncomplete', reasons };
  }

  const r = revShare ?? 0;
  const p = pressureShare ?? 0;
  const hasPressure = agg.shortageCoreDemand + agg.shortageBuDemand > 0;

  // strategicGrowth: high revenue & high pressure
  if (r >= HIGH_SHARE && p >= HIGH_SHARE) {
    reasons.push(`High revenue share (${r.toFixed(1)}%) AND high capacity pressure share (${p.toFixed(1)}%). Strategic SKU; secure capacity.`);
    return { classification: 'strategicGrowth', reasons };
  }

  // cashCow: high revenue & low/no pressure
  if (r >= HIGH_SHARE && p < HIGH_SHARE) {
    reasons.push(`High revenue share (${r.toFixed(1)}%) without disproportionate capacity pressure (${p.toFixed(1)}%). Protect this stream.`);
    return { classification: 'cashCow', reasons };
  }

  // lowValueHighLoad: low revenue & high pressure
  if (r <= LOW_SHARE && p >= HIGH_SHARE) {
    reasons.push(`Low revenue share (${r.toFixed(1)}%) but high capacity pressure share (${p.toFixed(1)}%). Re-price or de-prioritize.`);
    return { classification: 'lowValueHighLoad', reasons };
  }

  // capacityDrainer: high pressure but revenue not proportionally high
  if (p >= HIGH_SHARE && r < p) {
    reasons.push(`Capacity pressure share (${p.toFixed(1)}%) exceeds revenue share (${r.toFixed(1)}%). Consumes scarce capacity without matching return.`);
    return { classification: 'capacityDrainer', reasons };
  }

  // watchList: any pressure exists but no stronger class applies
  if (hasPressure) {
    reasons.push(`SKU touches shortage months (pressure share ${p.toFixed(1)}%); monitor.`);
    return { classification: 'watchList', reasons };
  }

  // Default fallback when no shortage exposure: classify by revenue share only
  if (r >= HIGH_SHARE) {
    reasons.push(`High revenue share (${r.toFixed(1)}%) with no shortage exposure. Cash cow under current plan.`);
    return { classification: 'cashCow', reasons };
  }

  reasons.push(`Revenue share ${r.toFixed(1)}%, no shortage exposure. Routine monitoring.`);
  return { classification: 'watchList', reasons };
}

function collectInvalidSkuIds(skus: SKU[]): Set<string> {
  const invalid = new Set<string>();
  for (const sku of skus) {
    if (!sku.chipLengthMm || sku.chipLengthMm <= 0) invalid.add(sku.id);
    else if (!sku.chipWidthMm || sku.chipWidthMm <= 0) invalid.add(sku.id);
    else if (sku.layerCount === undefined || sku.layerCount === null || sku.layerCount <= 0) invalid.add(sku.id);
    else if (!sku.sizeCategory) invalid.add(sku.id);
    else if (sku.unitPrice === undefined || sku.unitPrice === null || sku.unitPrice < 0) invalid.add(sku.id);
  }
  return invalid;
}

// ============================================================
// Main builder
// ============================================================

export function buildRiskAttributionModel(
  model: AnalyticsModel,
  skus: SKU[],
  bpAnalysis?: BpAnalysisModel
): RiskAttributionModel {
  // Empty state
  if (!model || model.skuResults.length === 0 || skus.length === 0) {
    return { shortageMonths: [], drivers: [], skuHealthSignals: [] };
  }

  const skuMap = new Map<string, SKU>();
  for (const s of skus) skuMap.set(s.id, s);

  const shortageMonths = collectShortageMonths(model);
  const shortageMonthSet = new Set(shortageMonths);

  // SKU-month rows restricted to shortage months (for attribution)
  const shortageRows = model.skuResults
    .filter((r) => shortageMonthSet.has(r.month))
    .map((r) => ({
      skuId: r.skuId,
      month: r.month,
      coreDemand: r.corePanelDemand,
      buDemand: r.buPanelDemand,
    }));

  const drivers: RiskDriver[] = [];

  if (shortageRows.length > 0) {
    // Customer attribution
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'customer',
        dimensionFn: (s) => s.customer || '(no customer)',
        metric: 'shortageCoreDemand',
        valueFn: (row) => row.coreDemand,
        reasonPrefix: 'Customer Core demand during shortage =',
      })
    );
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'customer',
        dimensionFn: (s) => s.customer || '(no customer)',
        metric: 'shortageBuDemand',
        valueFn: (row) => row.buDemand,
        reasonPrefix: 'Customer BU demand during shortage =',
      })
    );

    // SKU attribution
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'sku',
        dimensionFn: (s) => s.skuCode,
        metric: 'shortageCoreDemand',
        valueFn: (row) => row.coreDemand,
        reasonPrefix: 'SKU Core demand during shortage =',
      })
    );
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'sku',
        dimensionFn: (s) => s.skuCode,
        metric: 'shortageBuDemand',
        valueFn: (row) => row.buDemand,
        reasonPrefix: 'SKU BU demand during shortage =',
      })
    );

    // Size attribution (combined pressure)
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'size',
        dimensionFn: (s) => s.sizeCategory,
        metric: 'capacityPressureIndex',
        valueFn: (row) => row.coreDemand + row.buDemand,
        reasonPrefix: 'Size capacity pressure share =',
      })
    );

    // Application attribution (combined pressure)
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'application',
        dimensionFn: (s) => s.application || '(no application)',
        metric: 'capacityPressureIndex',
        valueFn: (row) => row.coreDemand + row.buDemand,
        reasonPrefix: 'Application capacity pressure share =',
      })
    );

    // Layer bucket attribution (combined pressure)
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'layerBucket',
        dimensionFn: (s) => getLayerBucket(s.layerCount),
        metric: 'capacityPressureIndex',
        valueFn: (row) => row.coreDemand + row.buDemand,
        reasonPrefix: 'Layer bucket capacity pressure share =',
      })
    );

    // Product grade attribution (combined pressure)
    drivers.push(
      ...buildDriversForDimension({
        shortageRows,
        skuMap,
        dimension: 'productGrade',
        dimensionFn: (s) => s.productGrade || '(no grade)',
        metric: 'capacityPressureIndex',
        valueFn: (row) => row.coreDemand + row.buDemand,
        reasonPrefix: 'Product grade capacity pressure share =',
      })
    );
  }

  // BP gap drivers (independent of shortage months — period-level financial risk)
  drivers.push(...buildBpGapDrivers(bpAnalysis));

  // ============================================================
  // SKU Health Signals
  // ============================================================

  const skuAgg = new Map<string, SkuAggregate>();
  for (const sku of skus) {
    skuAgg.set(sku.id, {
      skuId: sku.id,
      skuCode: sku.skuCode,
      customer: sku.customer,
      revenueUsd: 0,
      coreDemand: 0,
      buDemand: 0,
      shortageCoreDemand: 0,
      shortageBuDemand: 0,
    });
  }

  let totalRevenue = 0;
  let totalPressureIndex = 0;

  for (const r of model.skuResults) {
    const agg = skuAgg.get(r.skuId);
    if (!agg) continue;
    agg.revenueUsd += r.revenue;
    agg.coreDemand += r.corePanelDemand;
    agg.buDemand += r.buPanelDemand;
    totalRevenue += r.revenue;
    if (shortageMonthSet.has(r.month)) {
      agg.shortageCoreDemand += r.corePanelDemand;
      agg.shortageBuDemand += r.buPanelDemand;
      totalPressureIndex += r.corePanelDemand + r.buPanelDemand;
    }
  }

  const invalidSkuIds = collectInvalidSkuIds(skus);

  const signals: SkuHealthSignal[] = [];
  for (const agg of skuAgg.values()) {
    if (agg.revenueUsd === 0 && agg.coreDemand === 0 && agg.buDemand === 0 && !invalidSkuIds.has(agg.skuId)) {
      // SKU with no activity: skip unless it has data quality issue
      continue;
    }
    const revenueShare = safeShare(agg.revenueUsd, totalRevenue);
    const pressureValue = agg.shortageCoreDemand + agg.shortageBuDemand;
    const capacityPressureShare = safeShare(pressureValue, totalPressureIndex);
    const { classification, reasons } = classifySku(agg, revenueShare, capacityPressureShare, invalidSkuIds);
    signals.push({
      skuId: agg.skuId,
      skuCode: agg.skuCode,
      customer: agg.customer,
      revenueUsd: agg.revenueUsd,
      coreDemand: agg.coreDemand,
      buDemand: agg.buDemand,
      shortageCoreDemand: agg.shortageCoreDemand,
      shortageBuDemand: agg.shortageBuDemand,
      revenueShare,
      capacityPressureShare,
      classification,
      reasons,
    });
  }

  // Sort: dataIncomplete first (operational blocker), then by pressure share desc, then by revenue desc
  const priorityOrder: Record<SkuHealthClassification, number> = {
    dataIncomplete: 0,
    lowValueHighLoad: 1,
    capacityDrainer: 2,
    strategicGrowth: 3,
    cashCow: 4,
    watchList: 5,
  };
  signals.sort((a, b) => {
    const pa = priorityOrder[a.classification];
    const pb = priorityOrder[b.classification];
    if (pa !== pb) return pa - pb;
    const ap = a.capacityPressureShare ?? 0;
    const bp = b.capacityPressureShare ?? 0;
    if (bp !== ap) return bp - ap;
    const ar = a.revenueUsd;
    const br = b.revenueUsd;
    if (br !== ar) return br - ar;
    return a.skuCode.localeCompare(b.skuCode);
  });

  return {
    shortageMonths,
    drivers,
    skuHealthSignals: signals.slice(0, TOP_N_HEALTH),
  };
}
