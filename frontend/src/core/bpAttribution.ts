/**
 * BP Gap Attribution (Phase 5.3B, v1.20.0)
 *
 * Goal: deterministic attribution of BP miss / watch periods to customers, SKUs,
 * sizes, applications, product grades, and layer buckets — so users can answer
 * "which customer / SKU caused this BP gap?" without guessing.
 *
 * IMPORTANT: This is PROPORTIONAL CONTRIBUTION attribution, NOT a strict causal
 * model. We split the total period gap across each dimension in proportion to
 * that dimension's share of the period's forecast revenue. A driver with 30%
 * revenue share is recorded as carrying 30% of the gap. This is a clear,
 * stable starting point for decision support — it is NOT a claim that this
 * customer is "to blame" for the gap.
 *
 * Currency contract: BP targets remain in million TWD. Forecast revenue (USD)
 * is converted to TWD per year before share / gap math, matching the same
 * USD → TWD path used by bpTargets.ts. No changes to capacity / BP / currency
 * core formulas.
 */

import type { SKU, SkuCalculationResult } from '../types';
import type { BpAnalysisModel, BpPeriodRecord } from './bpTargets';
import type { CurrencySettings } from './currency';
import { convertFromUsd, normalizeCurrencySettings } from './currency';
import type { LocalizedMessage } from '../i18n';

function msg(key: string, params?: Record<string, string | number>): LocalizedMessage {
  return params ? { key, params } : { key };
}

export type BpAttributionDimension =
  | 'customer'
  | 'sku'
  | 'size'
  | 'application'
  | 'productGrade'
  | 'layerBucket';

export type BpAttributionPeriodMode = 'yearly' | 'quarterly' | 'monthly';

export interface BpGapDriver {
  dimension: BpAttributionDimension;
  label: string;
  period: string;
  forecastRevenueMillionTwd: number;
  /** Period total revenue (sum across all drivers of the same period & mode). */
  periodTotalRevenueMillionTwd: number;
  /** Proportional share of forecast revenue this driver carries (0-100). */
  revenueShare: number;
  /** Period BP target (million TWD), null when no target configured. */
  targetMillionTwd: number | null;
  /** Period total gap (negative = miss). */
  periodGapMillionTwd: number;
  /** Proportional gap contribution = abs(period gap) * revenueShare/100. Sign follows period gap. */
  gapContributionMillionTwd: number;
  /** Share of the absolute period gap this driver represents (0-100). */
  shareOfGap: number;
  /** Legacy English reason — UI should prefer reasonMessage. */
  reason: string;
  reasonMessage: LocalizedMessage;
}

export interface BpAttributionModel {
  yearly: BpGapDriver[];
  quarterly: BpGapDriver[];
  monthly: BpGapDriver[];
  worstPeriod: string | null;
  /** Top-N drivers across yearly (post-sorted), exposed as a quick-view list. */
  topDrivers: BpGapDriver[];
}

const TOP_N_PER_PERIOD = 5;
const TOP_N_OVERALL = 5;

function getLayerBucket(layerCount: number): string {
  if (layerCount <= 8) return '2-8L';
  if (layerCount <= 14) return '10-14L';
  if (layerCount <= 20) return '16-20L';
  return '20L+';
}

function parseMonth(m: string): { year: number; month: number } {
  const [y, mo] = m.split('-').map(Number);
  return { year: y, month: mo };
}

function toYear(m: string): string {
  return String(parseMonth(m).year);
}

function toQuarter(m: string): string {
  const { year, month } = parseMonth(m);
  return `${year}-Q${Math.ceil(month / 3)}`;
}

/** Map a BP period (year / quarter / month) back to the year it belongs to. */
function periodYear(period: string): string {
  // year: "2026", quarter: "2026-Q1", month: "2026-01"
  return period.substring(0, 4);
}

function dimensionLabel(sku: SKU, dim: BpAttributionDimension): string {
  switch (dim) {
    case 'customer':
      return sku.customer || '(no customer)';
    case 'sku':
      return `${sku.skuCode} / ${sku.customer || '(no customer)'}`;
    case 'size':
      return sku.sizeCategory || '(no size)';
    case 'application':
      return sku.application || '(no application)';
    case 'productGrade':
      return sku.productGrade || '(no grade)';
    case 'layerBucket':
      return getLayerBucket(sku.layerCount);
  }
}

interface PeriodBucket {
  /** dimensionKey → dimension label → million TWD revenue */
  perDimension: Record<BpAttributionDimension, Map<string, number>>;
  totalRevenueMillionTwd: number;
}

function emptyPeriodBucket(): PeriodBucket {
  return {
    perDimension: {
      customer: new Map(),
      sku: new Map(),
      size: new Map(),
      application: new Map(),
      productGrade: new Map(),
      layerBucket: new Map(),
    },
    totalRevenueMillionTwd: 0,
  };
}

const DIMENSIONS: BpAttributionDimension[] = [
  'customer',
  'sku',
  'size',
  'application',
  'productGrade',
  'layerBucket',
];

/**
 * Build BP gap attribution model from existing BP analysis + raw SKU results.
 *
 * Strategy:
 *   1. For each period (year/quarter/month), aggregate per-dimension forecast
 *      revenue in TWD (matching bpTargets.ts conversion path).
 *   2. Restrict to periods whose status is 'miss' or 'watch' (i.e., gap < 0).
 *   3. For each (period, dimension, label) split the absolute period gap by
 *      revenueShare. Sign follows the period gap.
 *
 * No mutation of bpAnalysis or skuResults. Currency path matches bpTargets.ts.
 */
export function buildBpAttributionModel(
  bpAnalysis: BpAnalysisModel | undefined,
  skuResults: SkuCalculationResult[],
  skus: SKU[],
  currencySettings: CurrencySettings
): BpAttributionModel {
  if (!bpAnalysis || skuResults.length === 0 || skus.length === 0) {
    return { yearly: [], quarterly: [], monthly: [], worstPeriod: null, topDrivers: [] };
  }

  const normalized = normalizeCurrencySettings(currencySettings);
  const skuMap = new Map<string, SKU>();
  for (const s of skus) skuMap.set(s.id, s);

  // ---- Aggregate revenue per (period, dimension, label) in million TWD ----
  function aggregateForPeriods(
    timeFn: (m: string) => string
  ): Map<string, PeriodBucket> {
    const periodMap = new Map<string, PeriodBucket>();
    for (const r of skuResults) {
      const sku = skuMap.get(r.skuId);
      if (!sku) continue;
      const period = timeFn(r.month);
      if (!periodMap.has(period)) periodMap.set(period, emptyPeriodBucket());
      const bucket = periodMap.get(period)!;
      const year = r.month.substring(0, 4);
      const twdMillion =
        convertFromUsd(r.revenue, 'TWD', normalized, year) / 1_000_000;
      bucket.totalRevenueMillionTwd += twdMillion;
      for (const dim of DIMENSIONS) {
        const label = dimensionLabel(sku, dim);
        const m = bucket.perDimension[dim];
        m.set(label, (m.get(label) ?? 0) + twdMillion);
      }
    }
    return periodMap;
  }

  function attributeFor(
    records: BpPeriodRecord[],
    aggregated: Map<string, PeriodBucket>
  ): BpGapDriver[] {
    const out: BpGapDriver[] = [];
    for (const rec of records) {
      // Only attribute miss / watch periods that have a configured target & gap.
      if (rec.status !== 'miss' && rec.status !== 'watch') continue;
      if (rec.gapMillionTwd === null) continue;
      const gap = rec.gapMillionTwd;
      const absGap = Math.abs(gap);
      if (absGap <= 0) continue;
      const bucket = aggregated.get(rec.period);
      if (!bucket || bucket.totalRevenueMillionTwd <= 0) continue;

      for (const dim of DIMENSIONS) {
        const m = bucket.perDimension[dim];
        // Per-period top drivers per dimension; we keep TOP_N_PER_PERIOD biggest.
        const entries = Array.from(m.entries())
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, TOP_N_PER_PERIOD);
        for (const [label, twdMillion] of entries) {
          const revenueShare =
            Math.round((twdMillion / bucket.totalRevenueMillionTwd) * 1000) / 10;
          // gap sign follows period; magnitude proportional to revenue share
          const gapContribution = (gap / absGap) * absGap * (revenueShare / 100);
          const shareOfGap = revenueShare; // gap is split proportionally so share-of-gap == revenue share
          const shareStr = revenueShare.toFixed(1);
          const gapStr = Math.abs(gapContribution).toFixed(1);
          out.push({
            dimension: dim,
            label,
            period: rec.period,
            forecastRevenueMillionTwd: twdMillion,
            periodTotalRevenueMillionTwd: bucket.totalRevenueMillionTwd,
            revenueShare,
            targetMillionTwd: rec.targetMillionTwd,
            periodGapMillionTwd: gap,
            gapContributionMillionTwd: gapContribution,
            shareOfGap,
            reason: `${dim} ${label} contributes ${shareStr}% of ${rec.period} revenue → carries ${gapStr}M TWD of the gap (proportional, not causal).`,
            reasonMessage: msg('bpAttr.driver.reason', {
              dimension: dim,
              label,
              period: rec.period,
              share: shareStr,
              gap: gapStr,
            }),
          });
        }
      }
    }
    // Stable sort: largest absolute gap contribution first, then bigger revenue share, then label.
    out.sort((a, b) => {
      const ag = Math.abs(b.gapContributionMillionTwd) - Math.abs(a.gapContributionMillionTwd);
      if (ag !== 0) return ag;
      if (b.revenueShare !== a.revenueShare) return b.revenueShare - a.revenueShare;
      return a.label.localeCompare(b.label);
    });
    return out;
  }

  const yearlyAgg = aggregateForPeriods(toYear);
  const quarterlyAgg = aggregateForPeriods(toQuarter);
  const monthlyAgg = aggregateForPeriods((m) => m);

  const yearly = attributeFor(bpAnalysis.yearly, yearlyAgg);
  const quarterly = attributeFor(bpAnalysis.quarterly, quarterlyAgg);
  const monthly = attributeFor(bpAnalysis.monthly, monthlyAgg);

  // worstPeriod: the yearly period with largest absolute gap
  let worstPeriod: string | null = null;
  let worstAbs = 0;
  for (const r of bpAnalysis.yearly) {
    if (r.gapMillionTwd === null) continue;
    if (r.status !== 'miss' && r.status !== 'watch') continue;
    const abs = Math.abs(r.gapMillionTwd);
    if (abs > worstAbs) {
      worstAbs = abs;
      worstPeriod = r.period;
    }
  }

  // topDrivers: top-N from yearly attribution (drives quick-view in UI / Risk Brief)
  const topDrivers = yearly.slice(0, TOP_N_OVERALL);

  // periodYear is exported via type only; keep here for potential future per-year grouping.
  void periodYear;

  return { yearly, quarterly, monthly, worstPeriod, topDrivers };
}
