/**
 * Risk Driver Attribution (Phase 5.2, weighted in Phase 5.3B)
 *
 * Differs from analytics matrices:
 * - Matrices answer "who contributes most overall".
 * - Attribution answers "who contributes most during shortage / bottleneck months".
 *
 * SKU Health Signals is a deterministic MVP classification combining revenue share
 * and capacity-pressure share. It is NOT AI judgment and NOT a final causal model.
 *
 * Phase 5.2 raw pressure index:
 *   capacityPressureIndex = shortageCoreDemand + shortageBuDemand
 *
 * Phase 5.3B weighted pressure index (analysis-only ranking weight, NOT a capacity
 * formula change — Core / BU panel demand & capacity computations in
 * calculationEngine remain untouched):
 *   weightedPressureIndex = shortageCoreDemand * coreWeight + shortageBuDemand * buWeight
 *
 * Both indices coexist on RiskAttributionModel / SkuHealthSignal so consumers can
 * inspect raw values and the weighted ranking side-by-side.
 */

import type { SKU } from '../types';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import type { LocalizedMessage } from '../i18n';

function msg(key: string, params?: Record<string, string | number>): LocalizedMessage {
  return params ? { key, params } : { key };
}

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
  labelMessage?: LocalizedMessage;
  metric: RiskDriverMetric;
  value: number;
  share?: number; // 0-100 of group total
  affectedPeriods: string[];
  affectedSkuIds?: string[];
  severity: 'critical' | 'warning' | 'info';
  /** Legacy English reason; UI should prefer reasonMessage. */
  reason: string;
  reasonMessage: LocalizedMessage;
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
  /** Raw capacity pressure index = shortageCoreDemand + shortageBuDemand (unweighted, Phase 5.2). */
  capacityPressureIndex: number;
  /** Weighted capacity pressure index (Phase 5.3B). Analysis-only ranking weight, not a capacity formula. */
  weightedPressureIndex: number;
  revenueShare?: number; // 0-100 of total revenue
  capacityPressureShare?: number; // 0-100 of total weighted pressure index (used for classification)
  /** Share of raw (unweighted) capacity pressure — for reference only. */
  rawCapacityPressureShare?: number;
  classification: SkuHealthClassification;
  /** Legacy English reasons; UI should prefer reasonMessages. */
  reasons: string[];
  reasonMessages: LocalizedMessage[];
}

export interface PressureWeightConfig {
  coreWeight: number;
  buWeight: number;
}

/**
 * Default analysis-only pressure ranking weights. Core is weighted higher than BU
 * because Core capacity is typically the more constrained resource in ABF panels:
 * once Core is saturated, no amount of BU headroom can rescue the affected SKUs.
 *
 * NOTE: This weight is used purely for ranking / health classification, NOT for
 * any production capacity formula. See ANALYTICS_GUIDE.md → "Weighted Pressure".
 */
export const DEFAULT_PRESSURE_WEIGHT_CONFIG: PressureWeightConfig = {
  coreWeight: 1.3,
  buWeight: 1.0,
};

export interface RiskAttributionModel {
  shortageMonths: string[];
  drivers: RiskDriver[];
  skuHealthSignals: SkuHealthSignal[];
  /** Analysis-only ranking weights used for weightedPressureIndex (Phase 5.3B). */
  weightConfig: PressureWeightConfig;
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
  reasonKey: string;
  reasonNoShareKey: string;
}): RiskDriver[] {
  const { shortageRows, skuMap, dimension, dimensionFn, metric, valueFn, reasonPrefix, reasonKey, reasonNoShareKey } = args;
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
    const months = bucket.periods.size;
    const reasonText = share !== undefined
      ? `${reasonPrefix} ${share.toFixed(1)}% during ${months} shortage month(s).`
      : `${reasonPrefix} during ${months} shortage month(s).`;
    const reasonMessage: LocalizedMessage = share !== undefined
      ? msg(reasonKey, { share: share.toFixed(1), months })
      : msg(reasonNoShareKey, { months });
    driverList.push({
      dimension,
      label,
      metric,
      value: bucket.value,
      share,
      affectedPeriods: Array.from(bucket.periods).sort(),
      affectedSkuIds: Array.from(bucket.skuIds).sort(),
      severity,
      reason: reasonText,
      reasonMessage,
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
    const attainment = ((r.attainment ?? 0) * 100).toFixed(1);
    const gapStr = gap.toFixed(1);
    return {
      dimension: 'customer', // period-level driver represented as label
      label: r.period,
      metric: 'bpGapContribution',
      value: gap,
      share,
      affectedPeriods: [r.period],
      severity,
      reason: `BP attainment ${attainment}%; gap ${gapStr}M TWD.`,
      reasonMessage: msg('attr.driver.bpGapReason', { attainment, gap: gapStr }),
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
): { classification: SkuHealthClassification; reasons: string[]; reasonMessages: LocalizedMessage[] } {
  const reasons: string[] = [];
  const reasonMessages: LocalizedMessage[] = [];

  if (invalidSkuIds.has(agg.skuId)) {
    reasons.push('SKU has invalid or missing required attributes (see Data Caveats).');
    reasonMessages.push(msg('attr.health.dataIncomplete'));
    return { classification: 'dataIncomplete', reasons, reasonMessages };
  }

  const r = revShare ?? 0;
  const p = pressureShare ?? 0;
  const hasPressure = agg.shortageCoreDemand + agg.shortageBuDemand > 0;
  const rStr = r.toFixed(1);
  const pStr = p.toFixed(1);

  // strategicGrowth: high revenue & high pressure
  if (r >= HIGH_SHARE && p >= HIGH_SHARE) {
    reasons.push(`High revenue share (${rStr}%) AND high capacity pressure share (${pStr}%). Strategic SKU; secure capacity.`);
    reasonMessages.push(msg('attr.health.strategicGrowth', { rev: rStr, pres: pStr }));
    return { classification: 'strategicGrowth', reasons, reasonMessages };
  }

  // cashCow: high revenue & low/no pressure
  if (r >= HIGH_SHARE && p < HIGH_SHARE) {
    reasons.push(`High revenue share (${rStr}%) without disproportionate capacity pressure (${pStr}%). Protect this stream.`);
    reasonMessages.push(msg('attr.health.cashCowProtected', { rev: rStr, pres: pStr }));
    return { classification: 'cashCow', reasons, reasonMessages };
  }

  // lowValueHighLoad: low revenue & high pressure
  if (r <= LOW_SHARE && p >= HIGH_SHARE) {
    reasons.push(`Low revenue share (${rStr}%) but high capacity pressure share (${pStr}%). Re-price or de-prioritize.`);
    reasonMessages.push(msg('attr.health.lowValueHighLoad', { rev: rStr, pres: pStr }));
    return { classification: 'lowValueHighLoad', reasons, reasonMessages };
  }

  // capacityDrainer: high pressure but revenue not proportionally high
  if (p >= HIGH_SHARE && r < p) {
    reasons.push(`Capacity pressure share (${pStr}%) exceeds revenue share (${rStr}%). Consumes scarce capacity without matching return.`);
    reasonMessages.push(msg('attr.health.capacityDrainer', { rev: rStr, pres: pStr }));
    return { classification: 'capacityDrainer', reasons, reasonMessages };
  }

  // watchList: any pressure exists but no stronger class applies
  if (hasPressure) {
    reasons.push(`SKU touches shortage months (pressure share ${pStr}%); monitor.`);
    reasonMessages.push(msg('attr.health.watchListPressure', { pres: pStr }));
    return { classification: 'watchList', reasons, reasonMessages };
  }

  // Default fallback when no shortage exposure: classify by revenue share only
  if (r >= HIGH_SHARE) {
    reasons.push(`High revenue share (${rStr}%) with no shortage exposure. Cash cow under current plan.`);
    reasonMessages.push(msg('attr.health.cashCowNoPressure', { rev: rStr }));
    return { classification: 'cashCow', reasons, reasonMessages };
  }

  reasons.push(`Revenue share ${rStr}%, no shortage exposure. Routine monitoring.`);
  reasonMessages.push(msg('attr.health.routine', { rev: rStr }));
  return { classification: 'watchList', reasons, reasonMessages };
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
  bpAnalysis?: BpAnalysisModel,
  weightConfig: PressureWeightConfig = DEFAULT_PRESSURE_WEIGHT_CONFIG
): RiskAttributionModel {
  // Empty state
  if (!model || model.skuResults.length === 0 || skus.length === 0) {
    return { shortageMonths: [], drivers: [], skuHealthSignals: [], weightConfig };
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
        reasonKey: 'attr.driver.customerCoreReason',
        reasonNoShareKey: 'attr.driver.customerCoreReasonNoShare',
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
        reasonKey: 'attr.driver.customerBuReason',
        reasonNoShareKey: 'attr.driver.customerBuReasonNoShare',
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
        reasonKey: 'attr.driver.skuCoreReason',
        reasonNoShareKey: 'attr.driver.skuCoreReasonNoShare',
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
        reasonKey: 'attr.driver.skuBuReason',
        reasonNoShareKey: 'attr.driver.skuBuReasonNoShare',
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
        reasonKey: 'attr.driver.sizeReason',
        reasonNoShareKey: 'attr.driver.sizeReasonNoShare',
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
        reasonKey: 'attr.driver.applicationReason',
        reasonNoShareKey: 'attr.driver.applicationReasonNoShare',
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
        reasonKey: 'attr.driver.layerReason',
        reasonNoShareKey: 'attr.driver.layerReasonNoShare',
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
        reasonKey: 'attr.driver.gradeReason',
        reasonNoShareKey: 'attr.driver.gradeReasonNoShare',
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
  let totalRawPressureIndex = 0;
  let totalWeightedPressureIndex = 0;

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
      totalRawPressureIndex += r.corePanelDemand + r.buPanelDemand;
      totalWeightedPressureIndex +=
        r.corePanelDemand * weightConfig.coreWeight + r.buPanelDemand * weightConfig.buWeight;
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
    const rawPressure = agg.shortageCoreDemand + agg.shortageBuDemand;
    const weightedPressure =
      agg.shortageCoreDemand * weightConfig.coreWeight + agg.shortageBuDemand * weightConfig.buWeight;
    const rawCapacityPressureShare = safeShare(rawPressure, totalRawPressureIndex);
    const capacityPressureShare = safeShare(weightedPressure, totalWeightedPressureIndex);
    const { classification, reasons, reasonMessages } = classifySku(agg, revenueShare, capacityPressureShare, invalidSkuIds);
    signals.push({
      skuId: agg.skuId,
      skuCode: agg.skuCode,
      customer: agg.customer,
      revenueUsd: agg.revenueUsd,
      coreDemand: agg.coreDemand,
      buDemand: agg.buDemand,
      shortageCoreDemand: agg.shortageCoreDemand,
      shortageBuDemand: agg.shortageBuDemand,
      capacityPressureIndex: rawPressure,
      weightedPressureIndex: weightedPressure,
      revenueShare,
      capacityPressureShare,
      rawCapacityPressureShare,
      classification,
      reasons,
      reasonMessages,
    });
  }

  // Sort: dataIncomplete first (operational blocker), then by weighted pressure share desc, then by revenue desc
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
    weightConfig,
  };
}
