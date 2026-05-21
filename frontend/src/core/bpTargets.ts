/**
 * BP Target attainment analysis helper.
 *
 * Computes forecast revenue vs BP target, attainment %, gap, and status.
 * Supports Year / Quarter / Month views, plus Customer/SKU contribution analysis.
 *
 * BP targets are stored in million TWD.
 * Forecast revenue (USD) is converted to TWD, then compared in million TWD.
 *
 * Primary data source: skuResults (revenue-driven).
 * monthlySummaries is used only for additional capacity context.
 */

import type { SkuCalculationResult, MonthlyCapacitySummary, SKU } from '../types';
import type { CurrencySettings } from './currency';
import { convertCurrency } from './currency';

// --- Types ---

export type BpPeriodMode = 'year' | 'quarter' | 'month';

export interface BpPeriodRecord {
  period: string; // year (2026), quarter (2026-Q1), or month (2026-01)
  targetMillionTwd: number | null; // null = no target
  forecastMillionTwd: number;
  attainment: number | null; // null = no target
  gapMillionTwd: number | null; // null = no target
  status: 'no-target' | 'met' | 'watch' | 'miss';
}

export interface BpDimensionRecord {
  label: string;
  values: Record<string, number>; // period -> million TWD
  shareValues: Record<string, number>; // period -> share % (0-100)
}

export interface BpKpiSummary {
  totalTargetMillionTwd: number | null;
  totalForecastMillionTwd: number;
  overallAttainment: number | null;
  totalGapMillionTwd: number | null;
}

export interface BpAnalysisModel {
  yearly: BpPeriodRecord[];
  quarterly: BpPeriodRecord[];
  monthly: BpPeriodRecord[];
  customerRevenueByYear: BpDimensionRecord[];
  skuRevenueByYear: BpDimensionRecord[];
  customerRevenueByQuarter: BpDimensionRecord[];
  skuRevenueByQuarter: BpDimensionRecord[];
  customerRevenueByMonth: BpDimensionRecord[];
  skuRevenueByMonth: BpDimensionRecord[];
}

// --- Time helpers ---

function parseMonth(m: string): { year: number; month: number } {
  const [y, mo] = m.split('-').map(Number);
  return { year: y, month: mo };
}

function toYear(m: string): string {
  return String(parseMonth(m).year);
}

function toQuarter(m: string): string {
  const { year, month } = parseMonth(m);
  const q = Math.ceil(month / 3);
  return `${year}-Q${q}`;
}

// --- Core builder ---

/**
 * Build complete BP analysis model from SKU calculation results.
 *
 * @param skuResults - per-SKU monthly calculation results (revenue in USD)
 * @param skus - SKU definitions for dimension grouping
 * @param monthlySummaries - optional, for capacity context (not required for BP analysis)
 * @param bpTargetsMillionTwd - yearly revenue targets in million TWD
 * @param currencySettings - currency settings for USD→TWD conversion
 */
export function buildBpAnalysis(
  skuResults: SkuCalculationResult[],
  skus: SKU[],
  _monthlySummaries: MonthlyCapacitySummary[],
  bpTargetsMillionTwd: Record<string, number>,
  currencySettings: CurrencySettings
): BpAnalysisModel {
  // Build SKU lookup for dimension grouping
  const skuMap = new Map<string, SKU>();
  skus.forEach(s => skuMap.set(s.id, s));

  // Aggregate revenue by month (in USD), then convert to TWD
  const monthlyRevenueUsd = new Map<string, number>();
  for (const r of skuResults) {
    monthlyRevenueUsd.set(r.month, (monthlyRevenueUsd.get(r.month) ?? 0) + r.revenue);
  }

  // Convert to TWD per month
  const monthlyRevenueTwd = new Map<string, number>();
  monthlyRevenueUsd.forEach((usd, month) => {
    const year = month.substring(0, 4);
    monthlyRevenueTwd.set(month, convertCurrency(usd, currencySettings, year));
  });

  // Get all periods from skuResults (not monthlySummaries)
  const allMonths = Array.from(new Set(skuResults.map(r => r.month))).sort();
  const years = Array.from(new Set(allMonths.map(m => m.substring(0, 4)))).sort();
  const quarters = Array.from(new Set(allMonths.map(m => toQuarter(m)))).sort();

  // Sorted targets
  const sortedTargets = Object.fromEntries(
    Object.entries(bpTargetsMillionTwd).sort(([a], [b]) => a.localeCompare(b))
  );

  // Yearly
  const yearly: BpPeriodRecord[] = years.map(year => {
    const targetMillion = sortedTargets[year] ?? 0;
    let revenueTwd = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const month = `${year}-${String(mo).padStart(2, '0')}`;
      revenueTwd += monthlyRevenueTwd.get(month) ?? 0;
    }
    const revenueMillion = revenueTwd / 1_000_000;
    return computeBpRecord(year, targetMillion, revenueMillion);
  });

  // Quarterly
  const quarterly: BpPeriodRecord[] = [];
  for (const year of years) {
    const annualTarget = sortedTargets[year] ?? 0;
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      let revenueTwd = 0;
      for (let mo = startMonth; mo < startMonth + 3; mo++) {
        const month = `${year}-${String(mo).padStart(2, '0')}`;
        revenueTwd += monthlyRevenueTwd.get(month) ?? 0;
      }
      const revenueMillion = revenueTwd / 1_000_000;
      quarterly.push(computeBpRecord(`${year}-Q${q}`, annualTarget > 0 ? annualTarget / 4 : 0, revenueMillion));
    }
  }

  // Monthly
  const monthly: BpPeriodRecord[] = allMonths.map(month => {
    const year = month.substring(0, 4);
    const annualTarget = sortedTargets[year] ?? 0;
    const monthTarget = annualTarget > 0 ? annualTarget / 12 : 0;
    const revenueTwd = monthlyRevenueTwd.get(month) ?? 0;
    const revenueMillion = revenueTwd / 1_000_000;
    return computeBpRecord(month, monthTarget, revenueMillion);
  });

  // Customer contribution by year
  const customerByYear = buildDimensionMatrix(skuResults, skuMap, s => s.customer, r => r.revenue, currencySettings, toYear, years);
  // Customer contribution by quarter
  const customerByQuarter = buildDimensionMatrix(skuResults, skuMap, s => s.customer, r => r.revenue, currencySettings, toQuarter, quarters);
  // Customer contribution by month
  const customerByMonth = buildDimensionMatrix(skuResults, skuMap, s => s.customer, r => r.revenue, currencySettings, m => m, allMonths);

  // SKU contribution by year
  const skuByYear = buildSkuDimensionMatrix(skuResults, skuMap, r => r.revenue, currencySettings, toYear, years);
  const skuByQuarter = buildSkuDimensionMatrix(skuResults, skuMap, r => r.revenue, currencySettings, toQuarter, quarters);
  const skuByMonth = buildSkuDimensionMatrix(skuResults, skuMap, r => r.revenue, currencySettings, m => m, allMonths);

  return {
    yearly,
    quarterly,
    monthly,
    customerRevenueByYear: customerByYear,
    skuRevenueByYear: skuByYear,
    customerRevenueByQuarter: customerByQuarter,
    skuRevenueByQuarter: skuByQuarter,
    customerRevenueByMonth: customerByMonth,
    skuRevenueByMonth: skuByMonth,
  };
}

/**
 * Build dimension matrix for customer contribution.
 */
function buildDimensionMatrix(
  skuResults: SkuCalculationResult[],
  skuMap: Map<string, SKU>,
  dimensionFn: (sku: SKU) => string,
  valueFn: (r: SkuCalculationResult) => number,
  currencySettings: CurrencySettings,
  timeFn: (m: string) => string,
  _timePeriods: string[]
): BpDimensionRecord[] {
  const dimMap = new Map<string, Map<string, number>>();
  for (const r of skuResults) {
    const sku = skuMap.get(r.skuId);
    if (!sku) continue;
    const dim = dimensionFn(sku);
    const time = timeFn(r.month);
    const year = r.month.substring(0, 4);
    const twdRevenue = convertCurrency(valueFn(r), currencySettings, year) / 1_000_000;
    if (!dimMap.has(dim)) dimMap.set(dim, new Map());
    const timeMap = dimMap.get(dim)!;
    timeMap.set(time, (timeMap.get(time) || 0) + twdRevenue);
  }
  const rows: BpDimensionRecord[] = [];
  for (const [label, timeMap] of dimMap) {
    const values: Record<string, number> = {};
    const totalPerPeriod: Record<string, number> = {};
    // Compute totals per period for share calculation
    const periodTotals = new Map<string, number>();
    dimMap.forEach(tm => {
      tm.forEach((v, t) => { periodTotals.set(t, (periodTotals.get(t) || 0) + v); });
    });
    timeMap.forEach((v, t) => {
      values[t] = v;
      const total = periodTotals.get(t) || 0;
      totalPerPeriod[t] = total > 0 ? (v / total) * 100 : 0;
    });
    rows.push({ label, values, shareValues: totalPerPeriod });
  }
  // Sort by total value descending
  rows.sort((a, b) => {
    const aTotal = Object.values(a.values).reduce((s, v) => s + v, 0);
    const bTotal = Object.values(b.values).reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  return rows;
}

/**
 * Build SKU dimension matrix (with customer in label).
 */
function buildSkuDimensionMatrix(
  skuResults: SkuCalculationResult[],
  skuMap: Map<string, SKU>,
  valueFn: (r: SkuCalculationResult) => number,
  currencySettings: CurrencySettings,
  timeFn: (m: string) => string,
  _timePeriods: string[]
): BpDimensionRecord[] {
  const dimMap = new Map<string, Map<string, number>>();
  for (const r of skuResults) {
    const sku = skuMap.get(r.skuId);
    if (!sku) continue;
    const dim = `${r.skuCode} / ${sku.customer}`;
    const time = timeFn(r.month);
    const year = r.month.substring(0, 4);
    const twdRevenue = convertCurrency(valueFn(r), currencySettings, year) / 1_000_000;
    if (!dimMap.has(dim)) dimMap.set(dim, new Map());
    const timeMap = dimMap.get(dim)!;
    timeMap.set(time, (timeMap.get(time) || 0) + twdRevenue);
  }
  const rows: BpDimensionRecord[] = [];
  for (const [label, timeMap] of dimMap) {
    const values: Record<string, number> = {};
    const periodTotals = new Map<string, number>();
    dimMap.forEach(tm => {
      tm.forEach((v, t) => { periodTotals.set(t, (periodTotals.get(t) || 0) + v); });
    });
    const shareValues: Record<string, number> = {};
    timeMap.forEach((v, t) => {
      values[t] = v;
      const total = periodTotals.get(t) || 0;
      shareValues[t] = total > 0 ? (v / total) * 100 : 0;
    });
    rows.push({ label, values, shareValues });
  }
  rows.sort((a, b) => {
    const aTotal = Object.values(a.values).reduce((s, v) => s + v, 0);
    const bTotal = Object.values(b.values).reduce((s, v) => s + v, 0);
    return bTotal - aTotal;
  });
  return rows;
}

/**
 * Compute a single BP period record.
 */
function computeBpRecord(period: string, target: number, revenue: number): BpPeriodRecord {
  const hasTarget = target > 0;
  const attainment = hasTarget ? revenue / target : null;
  const gap = hasTarget ? revenue - target : null;
  let status: BpPeriodRecord['status'] = 'no-target';
  if (hasTarget) {
    if (attainment! >= 1.0) status = 'met';
    else if (attainment! >= 0.8) status = 'watch';
    else status = 'miss';
  }
  return {
    period,
    targetMillionTwd: hasTarget ? target : null,
    forecastMillionTwd: revenue,
    attainment,
    gapMillionTwd: gap,
    status,
  };
}

/**
 * Compute KPI summary for a set of BP period records.
 */
export function computeBpKpi(records: BpPeriodRecord[]): BpKpiSummary {
  const totalTarget = records.reduce((s, r) => s + (r.targetMillionTwd ?? 0), 0);
  const totalForecast = records.reduce((s, r) => s + r.forecastMillionTwd, 0);
  const hasAnyTarget = records.some(r => r.targetMillionTwd !== null && r.targetMillionTwd > 0);
  const totalGap = hasAnyTarget ? totalForecast - totalTarget : null;
  const overallAttainment = hasAnyTarget && totalTarget > 0 ? totalForecast / totalTarget : null;
  return {
    totalTargetMillionTwd: hasAnyTarget ? totalTarget : null,
    totalForecastMillionTwd: totalForecast,
    overallAttainment,
    totalGapMillionTwd: totalGap,
  };
}

// --- Formatting helpers ---

/**
 * Format attainment percentage for display.
 */
export function formatAttainment(value: number | null): string {
  if (value === null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format BP amount for display (million TWD, 1 decimal).
 */
export function formatBpAmount(value: number | null): string {
  if (value === null) return '-';
  if (value === 0) return '-';
  return value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Format BP amount with sign for gap display.
 */
export function formatBpGap(value: number | null): string {
  if (value === null) return '-';
  if (value === 0) return '0.0';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

/**
 * Get year from a period string.
 */
export function periodYear(period: string): string {
  return period.substring(0, 4);
}

/**
 * Get status color for attainment.
 */
export function getStatusColor(status: BpPeriodRecord['status']): string {
  switch (status) {
    case 'met': return 'green';
    case 'watch': return 'orange';
    case 'miss': return 'red';
    case 'no-target': return 'default';
  }
}

/**
 * Get status label i18n key.
 */
export function getStatusKey(status: BpPeriodRecord['status']): string {
  switch (status) {
    case 'met': return 'bp.statusMet';
    case 'watch': return 'bp.statusWatch';
    case 'miss': return 'bp.statusMiss';
    case 'no-target': return 'bp.statusNoTarget';
  }
}

// --- Backward compatibility ---

/**
 * Legacy function for Dashboard compatibility.
 * Returns the same data as before but using the new builder.
 */
export interface BpTargetRecord {
  period: string;
  bpTarget: number;
  forecastRevenue: number;
  attainment: number | null;
  gap: number;
}

export interface BpAttainmentResult {
  yearly: BpTargetRecord[];
  quarterly: BpTargetRecord[];
  monthly: BpTargetRecord[];
}

/**
 * Legacy: build BP attainment (for Dashboard backward compatibility).
 * Uses skuResults as primary source, not monthlySummaries.
 */
export function buildBpAttainment(
  skuResults: SkuCalculationResult[],
  _monthlySummaries: MonthlyCapacitySummary[],
  bpTargetsMillionTwd: Record<string, number>,
  currencySettings: CurrencySettings
): BpAttainmentResult {
  const model = buildBpAnalysis(skuResults, [], [], bpTargetsMillionTwd, currencySettings);
  return {
    yearly: model.yearly.map(r => ({
      period: r.period,
      bpTarget: r.targetMillionTwd ?? 0,
      forecastRevenue: r.forecastMillionTwd,
      attainment: r.attainment,
      gap: r.gapMillionTwd ?? 0,
    })),
    quarterly: model.quarterly.map(r => ({
      period: r.period,
      bpTarget: r.targetMillionTwd ?? 0,
      forecastRevenue: r.forecastMillionTwd,
      attainment: r.attainment,
      gap: r.gapMillionTwd ?? 0,
    })),
    monthly: model.monthly.map(r => ({
      period: r.period,
      bpTarget: r.targetMillionTwd ?? 0,
      forecastRevenue: r.forecastMillionTwd,
      attainment: r.attainment,
      gap: r.gapMillionTwd ?? 0,
    })),
  };
}
