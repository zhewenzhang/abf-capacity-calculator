/**
 * BP Target attainment analysis helper.
 *
 * Computes forecast revenue vs BP target, attainment %, and gap.
 * Supports Year / Quarter / Month views.
 */

import type { SkuCalculationResult, MonthlyCapacitySummary } from '../types';
import type { CurrencySettings } from './currency';
import { formatCurrency } from './currency';

export interface BpTargetRecord {
  period: string; // year, quarter (2026-Q1), or month (2026-01)
  bpTarget: number;
  forecastRevenue: number;
  attainment: number | null; // null = no target or target is 0
  gap: number;
}

export interface BpAttainmentResult {
  yearly: BpTargetRecord[];
  quarterly: BpTargetRecord[];
  monthly: BpTargetRecord[];
}

/**
 * Build BP attainment analysis from calculation results.
 *
 * @param skuResults - per-SKU monthly calculation results
 * @param monthlySummaries - monthly capacity summaries (for month list)
 * @param bpTargets - yearly revenue targets in USD
 * @returns BpAttainmentResult with yearly, quarterly, monthly views
 */
export function buildBpAttainment(
  skuResults: SkuCalculationResult[],
  monthlySummaries: MonthlyCapacitySummary[],
  bpTargets: Record<string, number>
): BpAttainmentResult {
  // Aggregate revenue by month
  const monthlyRevenue = new Map<string, number>();
  for (const r of skuResults) {
    const prev = monthlyRevenue.get(r.month) ?? 0;
    monthlyRevenue.set(r.month, prev + r.revenue);
  }

  // Get all years from monthly summaries
  const yearsSet = new Set<string>();
  for (const m of monthlySummaries) {
    yearsSet.add(m.month.substring(0, 4));
  }
  const years = Array.from(yearsSet).sort();

  // Yearly
  const yearly: BpTargetRecord[] = years.map(year => {
    const target = bpTargets[year] ?? 0;
    let revenue = 0;
    for (let mo = 1; mo <= 12; mo++) {
      const month = `${year}-${String(mo).padStart(2, '0')}`;
      revenue += monthlyRevenue.get(month) ?? 0;
    }
    return computeBpRecord(year, target, revenue);
  });

  // Quarterly
  const quarterly: BpTargetRecord[] = [];
  for (const year of years) {
    const annualTarget = bpTargets[year] ?? 0;
    for (let q = 1; q <= 4; q++) {
      const startMonth = (q - 1) * 3 + 1;
      let revenue = 0;
      for (let mo = startMonth; mo < startMonth + 3; mo++) {
        const month = `${year}-${String(mo).padStart(2, '0')}`;
        revenue += monthlyRevenue.get(month) ?? 0;
      }
      quarterly.push(computeBpRecord(`${year}-Q${q}`, annualTarget / 4, revenue));
    }
  }

  // Monthly
  const monthly: BpTargetRecord[] = monthlySummaries.map(summary => {
    const year = summary.month.substring(0, 4);
    const annualTarget = bpTargets[year] ?? 0;
    const monthTarget = annualTarget / 12;
    const revenue = monthlyRevenue.get(summary.month) ?? 0;
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
 * Format BP target / revenue with currency settings.
 */
export function formatBpAmount(value: number, settings: CurrencySettings, year?: string): string {
  if (value === 0) return '-';
  return formatCurrency(value, settings, year);
}

/**
 * Get year from a period string.
 */
export function periodYear(period: string): string {
  return period.substring(0, 4);
}
