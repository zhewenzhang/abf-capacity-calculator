/**
 * BP Target attainment analysis helper.
 *
 * Computes forecast revenue vs BP target, attainment %, and gap.
 * All values are in TWD. BP targets are stored in TWD.
 * Forecast revenue (USD) is converted to TWD using currency settings.
 * Supports Year / Quarter / Month views.
 */

import type { SkuCalculationResult, MonthlyCapacitySummary } from '../types';
import type { CurrencySettings } from './currency';
import { convertCurrency } from './currency';

export interface BpTargetRecord {
  period: string; // year, quarter (2026-Q1), or month (2026-01)
  bpTarget: number; // TWD
  forecastRevenue: number; // TWD
  attainment: number | null; // null = no target or target is 0
  gap: number; // TWD
}

export interface BpAttainmentResult {
  yearly: BpTargetRecord[];
  quarterly: BpTargetRecord[];
  monthly: BpTargetRecord[];
}

/**
 * Build BP attainment analysis from calculation results.
 *
 * BP targets are stored in TWD.
 * Forecast revenue (stored in USD) is converted to TWD for comparison.
 *
 * @param skuResults - per-SKU monthly calculation results (revenue in USD)
 * @param monthlySummaries - monthly capacity summaries (for month list)
 * @param bpTargetsTwd - yearly revenue targets in TWD
 * @param currencySettings - currency settings for USD→TWD conversion
 * @returns BpAttainmentResult with yearly, quarterly, monthly views (all TWD)
 */
export function buildBpAttainment(
  skuResults: SkuCalculationResult[],
  monthlySummaries: MonthlyCapacitySummary[],
  bpTargetsTwd: Record<string, number>,
  currencySettings: CurrencySettings
): BpAttainmentResult {
  // Aggregate revenue by month (in USD), then convert to TWD
  const monthlyRevenueUsd = new Map<string, number>();
  for (const r of skuResults) {
    const prev = monthlyRevenueUsd.get(r.month) ?? 0;
    monthlyRevenueUsd.set(r.month, prev + r.revenue);
  }

  // Convert monthly USD revenue to TWD
  const monthlyRevenueTwd = new Map<string, number>();
  monthlyRevenueUsd.forEach((usd, month) => {
    const year = month.substring(0, 4);
    const twd = convertCurrency(usd, currencySettings, year);
    monthlyRevenueTwd.set(month, twd);
  });

  // Get all years from monthly summaries
  const yearsSet = new Set<string>();
  for (const m of monthlySummaries) {
    yearsSet.add(m.month.substring(0, 4));
  }
  const years = Array.from(yearsSet).sort();

  // Yearly
  const yearly: BpTargetRecord[] = years.map(year => {
    const target = bpTargetsTwd[year] ?? 0;
    let revenue = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const month = `${year}-${String(mo).padStart(2, '0')}`;
      revenue += monthlyRevenueTwd.get(month) ?? 0;
    }
    return computeBpRecord(year, target, revenue);
  });

  // Quarterly
  const quarterly: BpTargetRecord[] = [];
  for (const year of years) {
    const annualTarget = bpTargetsTwd[year] ?? 0;
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      let revenue = 0;
      for (let mo = startMonth; mo < startMonth + 3; mo++) {
        const month = `${year}-${String(mo).padStart(2, '0')}`;
        revenue += monthlyRevenueTwd.get(month) ?? 0;
      }
      quarterly.push(computeBpRecord(`${year}-Q${q}`, annualTarget / 4, revenue));
    }
  }

  // Monthly
  const monthly: BpTargetRecord[] = monthlySummaries.map(summary => {
    const year = summary.month.substring(0, 4);
    const annualTarget = bpTargetsTwd[year] ?? 0;
    const monthTarget = annualTarget / 12;
    const revenue = monthlyRevenueTwd.get(summary.month) ?? 0;
    return computeBpRecord(summary.month, monthTarget, revenue);
  });

  return { yearly, quarterly, monthly };
}

function computeBpRecord(period: string, target: number, revenue: number): BpTargetRecord {
  const hasTarget = target > 0;
  return {
    period,
    bpTarget: target,
    forecastRevenue: revenue,
    attainment: hasTarget ? revenue / target : null,
    gap: hasTarget ? revenue - target : 0,
  };
}

/**
 * Format attainment percentage for display.
 */
export function formatAttainment(value: number | null): string {
  if (value === null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format BP target / revenue for display.
 * Values are already in TWD, so we format as plain TWD number.
 */
export function formatBpAmount(value: number, _settings: CurrencySettings, _year?: string): string {
  if (value === 0) return '-';
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/**
 * Get year from a period string.
 */
export function periodYear(period: string): string {
  return period.substring(0, 4);
}
