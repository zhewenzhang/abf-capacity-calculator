/**
 * Scenario Result Presentation Module (v1.64.3)
 *
 * Converts raw scenario calculation data into presentation-ready models.
 * Semantically distinguishes capacity reduction from actual capacity gap (shortage).
 *
 * Pure functions, no side effects, zero imports from services/ or pages/.
 */

import type { SKU } from '../types';
import type { DataQualitySummary } from './dataQuality';
import type { ScenarioDeltas } from './scenarioEngine';
import type { CurrencySettings } from './currency';
import { convertFromUsd } from './currency';

// ============================================================
// Output types
// ============================================================

export interface ScenarioKpiItem {
  key: string;
  label: string;
  value: string;
  subtext: string;
  tooltip: string;
  state: 'default' | 'success' | 'warning' | 'danger';
  badge?: { text: string; state: 'success' | 'warning' | 'error' | 'default' };
}

export interface YearlyRiskRevenueRow {
  year: string;
  riskRevenueMntd: number;
  shortageMonths: number;
  topCustomers: string;
}

export interface UtilizationChartPoint {
  month: string;
  baseline: number | null;
  scenario: number | null;
  deltaPp: number | null;
}

export interface CapacityGapChartPoint {
  month: string;
  gapPanels: number;
  isTop3: boolean;
}

export interface CapacityReductionChartPoint {
  month: string;
  reductionPanels: number;
  isTop3: boolean;
}

export interface DataQualityInfo {
  issueCount: number;
  topIssue: string;
  impactDescription: string;
}

export interface ScenarioTypeInfo {
  typeLabel: string;
  emphasis: 'revenue' | 'capacity' | 'mixed';
  description: string;
}

// ============================================================
// Builders
// ============================================================

/**
 * Build 5 business KPIs for the delivery risk panel.
 * Semantics: capacity gap = unmet demand, capacity reduction = capacity removed.
 */
export function buildScenarioKpis(
  deltas: ScenarioDeltas | null,
  maxBuUtilPct: number,
  capacityGapPanels: number,
  capacityReductionPanels: number,
  totalRevenueAtRiskMntd: number,
  topYearRevenueAtRisk: { year: string; amount: number } | null,
): ScenarioKpiItem[] {
  const shortageDelta = deltas?.shortageMonthCount.delta ?? null;
  const shortageBase = deltas?.shortageMonthCount.base ?? null;

  // 1. 新增短缺月份
  const hasShortage = shortageDelta !== null && shortageDelta > 0;
  const kpi1: ScenarioKpiItem = {
    key: 'shortage',
    label: '新增短缺月份',
    value: shortageDelta !== null
      ? `${shortageDelta >= 0 ? '+' : ''}${shortageDelta} 个月`
      : '—',
    subtext: shortageBase !== null ? `原始：${shortageBase} 个月` : '—',
    tooltip: '与原始方案相比，模拟后新增的短缺月份数。',
    state: hasShortage ? 'danger' : 'default',
  };

  // 2. 最高 BU 利用率
  const utilState = maxBuUtilPct > 100 ? 'danger' : maxBuUtilPct > 85 ? 'warning' : 'default';
  const kpi2: ScenarioKpiItem = {
    key: 'utilization',
    label: '最高 BU 利用率',
    value: maxBuUtilPct > 0 ? `${maxBuUtilPct.toFixed(1)}%` : '—',
    subtext: maxBuUtilPct > 0 ? '情景模拟期间' : '—',
    tooltip: '模拟期间内最高的月度 BU 利用率。85% 以上为警戒，100% 以上代表超载。',
    state: utilState,
  };

  // 3. 产能缺口 (actual unmet demand = shortage)
  const hasGap = capacityGapPanels > 0;
  const kpi3: ScenarioKpiItem = {
    key: 'capGap',
    label: '产能缺口',
    value: hasGap ? `${capacityGapPanels.toLocaleString()} panels` : '0 panels',
    subtext: hasGap ? '需求超过可用产能的合计' : '需求仍低于可用产能',
    tooltip: hasGap
      ? `模拟期间内，需求超出可用产能的总和，共 ${capacityGapPanels.toLocaleString()} panels。`
      : '模拟后需求仍低于可用产能，因此未产生交付缺口。',
    state: hasGap ? 'danger' : 'success',
    badge: hasGap ? undefined : { text: 'OK', state: 'success' },
  };

  // 4. 产能减少量 (capacity removed by delay/reduction)
  const hasReduction = capacityReductionPanels > 0;
  const kpi4: ScenarioKpiItem = {
    key: 'capReduction',
    label: '产能减少量',
    value: hasReduction ? `${capacityReductionPanels.toLocaleString()} panels` : '0 panels',
    subtext: hasReduction ? '延迟/缩减期间被移除的产能' : '未发生产能移除',
    tooltip: '模拟期间内，因延迟或缩减而减少的可用产能总量。与产能缺口不同，此值不代表交付缺口。',
    state: hasReduction ? 'warning' : 'default',
  };

  // 5. 风险营收暴露（年度）
  const revenueState = totalRevenueAtRiskMntd > 0 ? 'warning' : 'default';
  const defaultYearString = topYearRevenueAtRisk
    ? `${topYearRevenueAtRisk.year}：${topYearRevenueAtRisk.amount.toFixed(1)} M NTD`
    : '—';
  const totalRevenueString = totalRevenueAtRiskMntd > 0
    ? `合计：${totalRevenueAtRiskMntd.toFixed(1)} M NTD`
    : '无风险营收';

  const kpi5: ScenarioKpiItem = {
    key: 'revenueAtRisk',
    label: '风险营收暴露（年度）',
    value: defaultYearString,
    subtext: totalRevenueString,
    tooltip: '短缺月份中的预测营收，默认显示影响最大年份。',
    state: revenueState,
  };

  return [kpi1, kpi2, kpi3, kpi4, kpi5];
}

/**
 * Build year-by-year risk revenue rows from affected months.
 */
export function buildYearlyRiskRevenueRows(
  baseSkuResults: any[],
  affectedMonthSet: Set<string>,
  skus: SKU[],
  currencySettings: CurrencySettings,
): YearlyRiskRevenueRow[] {
  const yearMap = new Map<string, { revenueUsd: number; months: Set<string>; customerRevenues: Map<string, number> }>();

  for (const r of baseSkuResults) {
    if (!affectedMonthSet.has(r.month)) continue;
    const year = r.month.substring(0, 4);
    const entry = yearMap.get(year) || { revenueUsd: 0, months: new Set(), customerRevenues: new Map() };
    entry.revenueUsd += r.revenue;
    entry.months.add(r.month);

    const sku = skus.find((s: SKU) => s.id === r.skuId);
    const customer = sku?.customer || 'Unknown';
    entry.customerRevenues.set(customer, (entry.customerRevenues.get(customer) ?? 0) + r.revenue);

    yearMap.set(year, entry);
  }

  return Array.from(yearMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, data]) => {
      const topCustomer = Array.from(data.customerRevenues.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 1)
        .map(([c]) => c)
        .join(', ');
      return {
        year,
        riskRevenueMntd: Math.round(convertFromUsd(data.revenueUsd, 'TWD', currencySettings) / 1e6 * 100) / 100,
        shortageMonths: data.months.size,
        topCustomers: topCustomer,
      };
    });
}

/**
 * Build capacity gap chart data using ACTUAL shortage/unmet demand.
 * Uses buShortage from scenario monthly summaries (already computed by calculationEngine).
 */
export function buildCapacityGapChartSet(
  monthlyGaps: Array<{
    month: string;
    scenShortage: number;
  }>,
): { bars: CapacityGapChartPoint[]; totalGap: number; isAllZero: boolean } {
  const bars: CapacityGapChartPoint[] = monthlyGaps.map(m => ({
    month: m.month,
    gapPanels: Math.max(0, m.scenShortage),
    isTop3: false,
  }));

  // Mark top 3 gap months
  const sortedByGap = [...bars].sort((a, b) => b.gapPanels - a.gapPanels);
  for (let i = 0; i < Math.min(3, sortedByGap.length); i++) {
    const top = sortedByGap[i];
    const found = bars.find(b => b.month === top.month);
    if (found && found.gapPanels > 0) found.isTop3 = true;
  }

  const totalGap = bars.reduce((s, b) => s + b.gapPanels, 0);
  return { bars, totalGap, isAllZero: totalGap === 0 };
}

/**
 * Build capacity reduction chart data (capacity removed, regardless of demand).
 */
export function buildCapacityReductionChartSet(
  monthlyGaps: Array<{
    month: string;
    baseBuCapacity: number;
    scenBuCapacity: number;
  }>,
): { bars: CapacityReductionChartPoint[]; totalReduction: number; isAllZero: boolean } {
  const bars: CapacityReductionChartPoint[] = monthlyGaps.map(m => ({
    month: m.month,
    reductionPanels: Math.max(0, m.baseBuCapacity - m.scenBuCapacity),
    isTop3: false,
  }));

  const sortedByRed = [...bars].sort((a, b) => b.reductionPanels - a.reductionPanels);
  for (let i = 0; i < Math.min(3, sortedByRed.length); i++) {
    const top = sortedByRed[i];
    const found = bars.find(b => b.month === top.month);
    if (found && found.reductionPanels > 0) found.isTop3 = true;
  }

  const totalReduction = bars.reduce((s, b) => s + b.reductionPanels, 0);
  return { bars, totalReduction, isAllZero: totalReduction === 0 };
}

/**
 * Build data quality info from DQ summary.
 */
export function buildDataQualityInfo(dq: DataQualitySummary | null): { info: DataQualityInfo | null; showWarning: boolean } {
  if (!dq) return { info: null, showWarning: false };

  const showWarning = dq.confidence === 'low' || dq.confidence === 'blocked';
  if (!showWarning) return { info: null, showWarning: false };

  const issueCount = dq.issues?.length ?? 0;
  const topIssue = dq.issues?.[0]?.detail ?? '资料品质异常';

  const impactDescription = dq.confidence === 'blocked'
    ? '部分关键资料缺失，模拟结果可能不完整。建议先修复资料问题。'
    : '预测引用了不存在的 SKU，会影响客户、产品与产能归因。BP 或产能结论仍可参考，但归因可能不完整。';

  return {
    info: { issueCount, topIssue, impactDescription },
    showWarning,
  };
}

/**
 * Build scenario type info for adapting panel emphasis.
 */
export function buildScenarioTypeInfo(
  scenarioType: string | undefined,
  description: string | undefined,
): ScenarioTypeInfo {
  const sType = scenarioType ?? 'unknown';

  if (sType === 'forecastAdjustment') {
    return {
      typeLabel: '预测激增',
      emphasis: 'revenue',
      description: `模拟预测数量变动对营收、产能和 BP 达成的影响。`,
    };
  }

  if (sType === 'orderDisappearance') {
    return {
      typeLabel: '客户流失',
      emphasis: 'revenue',
      description: '模拟订单流失对营收、BP 差距和产能释放的影响。关注需补回营收金额。',
    };
  }

  if (sType === 'capacityDelay') {
    return {
      typeLabel: '产能延迟',
      emphasis: 'capacity',
      description: '模拟产能延迟/缩减对利用率、短缺和交付风险的影响。',
    };
  }

  return {
    typeLabel: sType,
    emphasis: 'mixed',
    description: description ?? '',
  };
}

/**
 * Build the scenario-type-aware explanation note for the results panel.
 */
export function buildScenarioExplanation(scenarioType: string | undefined): string {
  switch (scenarioType) {
    case 'capacityDelay':
      return '以下数据比较了原始方案与产能延迟/缩减后的差异。关注利用率上升、短缺增加和交付风险。';
    case 'orderDisappearance':
      return '以下数据比较了原始方案与订单流失后的差异。关注营收下降、BP 差距变化和释放的产能。';
    case 'forecastAdjustment':
      return '以下数据比较了原始方案与预测数量变动后的差异。关注营收变化和利用率压力。';
    default:
      return '以下数据比较了原始方案与模拟情境的差异。';
  }
}
