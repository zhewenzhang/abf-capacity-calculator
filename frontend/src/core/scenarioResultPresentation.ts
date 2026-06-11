/**
 * Scenario Result Presentation Module (v1.64.2)
 *
 * Converts raw scenario calculation data into presentation-ready models.
 * Keeps business derivation out of ScenarioPlanning.tsx.
 *
 * Pure functions, no side effects, zero imports from services/ or pages/.
 */

import type { SKU } from '../types';
import type { DataQualitySummary } from './dataQuality';
import type { ScenarioDeltas } from './scenarioEngine';
import type { CurrencySettings } from './currency';
import { convertFromUsd } from './currency';

// ============================================================
// Output types — consumed by the page component for rendering
// ============================================================

export interface ScenarioKpiItem {
  key: string;
  label: string;
  value: string;
  subtext: string;
  tooltip: string;
  /** 'default' | 'success' | 'warning' | 'danger' */
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

export interface UtilizationChartSet {
  allMonths: UtilizationChartPoint[];
  windowMonths: UtilizationChartPoint[];
  maxBaseline: number;
  maxScenario: number;
  affectedMonths: string[];
}

export interface CapacityGapChartPoint {
  month: string;
  gapPanels: number;
  isTop3: boolean;
}

export interface CapacityGapChartSet {
  bars: CapacityGapChartPoint[];
  totalGap: number;
  isAllZero: boolean;
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

export interface TopMonthInfo {
  month: string;
  capGapPct: number;
  baseBuUtil: number | null;
  scenBuUtil: number | null;
  shortageDelta: number;
}

export interface TopCustomerInfo {
  customer: string;
  affectedMonthCount: number;
  revenueAtRiskMntd: number;
}

// ============================================================
// Builders
// ============================================================

/**
 * Build 4 business KPIs for the delivery risk panel.
 */
export function buildScenarioKpis(
  deltas: ScenarioDeltas | null,
  maxBuUtilPct: number,
  totalCapGap: number,
  _affectedMonthCount: number,
  totalRevenueAtRiskMntd: number,
  topYearRevenueAtRisk: { year: string; amount: number } | null,
): ScenarioKpiItem[] {
  const shortageDelta = deltas?.shortageMonthCount.delta ?? null;
  const shortageBase = deltas?.shortageMonthCount.base ?? null;

  // 1. 新增短缺月份
  const hasShortage = shortageDelta !== null && shortageDelta > 0;
  const kpiShortage: ScenarioKpiItem = {
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
  const kpiUtil: ScenarioKpiItem = {
    key: 'utilization',
    label: '最高 BU 利用率',
    value: maxBuUtilPct > 0 ? `${maxBuUtilPct.toFixed(1)}%` : '—',
    subtext: maxBuUtilPct > 0 ? '情景模拟期间' : '—',
    tooltip: '模拟期间内最高的月度 BU 利用率。85% 以上为警戒，100% 以上代表超载。',
    state: utilState,
  };

  // 3. 产能缺口
  const hasGap = totalCapGap > 0;
  const kpiGap: ScenarioKpiItem = {
    key: 'capGap',
    label: '产能缺口',
    value: hasGap ? `${totalCapGap.toLocaleString()} panels` : '0 panels',
    subtext: hasGap ? '短缺月份的需求 - 可用产能合计' : '未触发短缺，产能余裕下降',
    tooltip: hasGap
      ? `延迟/缩减期间，需求超出可用产能的总和，共 ${totalCapGap.toLocaleString()} panels。`
      : '模拟后可用产能仍高于需求，因此缺口为 0。',
    state: hasGap ? 'warning' : 'success',
    badge: hasGap ? undefined : { text: 'OK', state: 'success' },
  };

  // 4. 风险营收暴露（年度）
  const revenueState = totalRevenueAtRiskMntd > 0 ? 'warning' : 'default';
  const defaultYearString = topYearRevenueAtRisk
    ? `${topYearRevenueAtRisk.year}：${topYearRevenueAtRisk.amount.toFixed(1)} M NTD`
    : '—';
  const totalRevenueString = totalRevenueAtRiskMntd > 0
    ? `合计：${totalRevenueAtRiskMntd.toFixed(1)} M NTD`
    : '无风险营收';

  const kpiRevenue: ScenarioKpiItem = {
    key: 'revenueAtRisk',
    label: '风险营收暴露（年度）',
    value: defaultYearString,
    subtext: totalRevenueString,
    tooltip: '短缺月份中的预测营收，默认显示影响最大年份。',
    state: revenueState,
  };

  return [kpiShortage, kpiUtil, kpiGap, kpiRevenue];
}

/**
 * Build year-by-year risk revenue rows.
 */
export function buildYearlyRiskRevenueRows(
  baseSkuResults: any[],
  affectedMonthSet: Set<string>,
  skus: SKU[],
  currencySettings: CurrencySettings,
): YearlyRiskRevenueRow[] {
  // Group affected SKU results by year
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
      // Top customer for this year
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
 * Build utilization chart series with full and windowed views.
 */
export function buildUtilizationChartSet(
  monthlyGaps: Array<{
    month: string;
    baseBuUtil: number | null;
    scenBuUtil: number | null;
  }>,
  affectedMonths: string[],
): UtilizationChartSet {
  const allMonths: UtilizationChartPoint[] = monthlyGaps.map(m => {
    const base = m.baseBuUtil;
    const scen = m.scenBuUtil;
    return {
      month: m.month,
      baseline: base,
      scenario: scen,
      deltaPp: base !== null && scen !== null ? +(scen - base).toFixed(1) : null,
    };
  });

  const maxBaseline = Math.max(...allMonths.filter(p => p.baseline !== null).map(p => p.baseline!), 0);
  const maxScenario = Math.max(...allMonths.filter(p => p.scenario !== null).map(p => p.scenario!), 0);

  return { allMonths, windowMonths: allMonths, maxBaseline, maxScenario, affectedMonths };
}

/**
 * Build capacity gap chart data.
 */
export function buildCapacityGapChartSet(
  monthlyGaps: Array<{
    month: string;
    baseBuCapacity: number;
    scenBuCapacity: number;
  }>,
): CapacityGapChartSet {
  const bars: CapacityGapChartPoint[] = monthlyGaps.map(m => ({
    month: m.month,
    gapPanels: Math.max(0, m.baseBuCapacity - m.scenBuCapacity),
    isTop3: false,
  }));

  // Mark top 3
  const sortedByGap = [...bars].sort((a, b) => b.gapPanels - a.gapPanels);
  for (let i = 0; i < Math.min(3, sortedByGap.length); i++) {
    const topBar = sortedByGap[i];
    const found = bars.find(b => b.month === topBar.month);
    if (found && found.gapPanels > 0) found.isTop3 = true;
  }

  const totalGap = bars.reduce((s, b) => s + b.gapPanels, 0);
  const isAllZero = totalGap === 0;

  return { bars, totalGap, isAllZero };
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
  /* unused: deltas */
): ScenarioTypeInfo {
  const sType = scenarioType ?? 'unknown';

  if (sType === 'forecastAdjustment') {
    const pct = description?.match(/(\d+)%/)?.[1];
    return {
      typeLabel: '预测激增',
      emphasis: 'revenue',
      description: pct ? `模拟预测数量增加 ${pct}% 对营收、产能和 BP 达成的影响。` : '模拟预测数量变动的影响。',
    };
  }

  if (sType === 'orderDisappearance') {
    return {
      typeLabel: '客户流失',
      emphasis: 'revenue',
      description: `模拟订单流失对营收、BP 差距和产能释放的影响。关注需补回营收金额。`,
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
 * Build empty state message based on scenario status.
 */
export function getScenarioResultEmptyState(lastRunType: string | null): string {
  if (lastRunType === 'template') return '暂无模拟结果，请先执行一个情境剧本。';
  if (lastRunType === 'annual') return '暂无模拟结果，请先执行年度倍率模拟。';
  return '选择参数后点击「执行模拟」查看结果。';
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
