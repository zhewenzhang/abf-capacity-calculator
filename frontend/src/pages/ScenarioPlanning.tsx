import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Alert,
  Space,
  Typography,
  Spin,
  Divider,
  InputNumber,
  Tooltip,
  Empty,
  Tabs,
  Table,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useI18n } from '../i18n';
import PageShell from '../components/layout/PageShell';
import { canEdit } from '../services/projectScope';
import type {
  ProjectScope,
  SKU,
  Forecast,
  CapacityPlan,
  ProjectParameters,
} from '../types';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { buildDataQualitySummary } from '../core/dataQuality';
import type { DataQualitySummary } from '../core/dataQuality';
import {
  defaultMultipliers,
  computeAnnualScenarioComparison,
  type ScenarioMultipliers,
  type AnnualMultipliers,
  type AnnualScenarioComparison,
  type YearlyResult,
} from '../core/scenarioEngine';
import { runOperationalScenario, type OperationalScenarioResult, type OperationalScenarioParams } from '../core/operationalScenario';
import { convertFromUsd, normalizeCurrencySettings, DEFAULT_CURRENCY_SETTINGS, type CurrencySettings } from '../core/currency';
import PageHeader from '../components/common/PageHeader';
import ScenarioTemplates from './ScenarioTemplates';
import { LineChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

const { Text, Title } = Typography;

interface ScenarioPlanningProps {
  scope: ProjectScope;
}

// ============================================================
// Design tokens (tweakcn / designbyte style)
// ============================================================

const S = {
  card: {
    borderRadius: 16,
    border: '1px solid #e8e8e8',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  } as React.CSSProperties,
  cardCompact: {
    borderRadius: 12,
    border: '1px solid #e8e8e8',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  } as React.CSSProperties,
  accent: '#34d399',      // mint green
  accentBg: '#ecfdf5',
  accentBorder: '#a7f3d0',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  positive: '#059669',
  negative: '#dc2626',
  warning: '#d97706',
};

// ============================================================
// Presets
// ============================================================

interface Preset {
  id: string;
  labelKey: string;
  multipliers: Partial<ScenarioMultipliers>;
}

const PRESETS: Preset[] = [
  { id: 'vol-up', labelKey: 'scenario.preset.volumeUp10', multipliers: { forecastVolume: 1.1 } },
  { id: 'price-up', labelKey: 'scenario.preset.priceUp5', multipliers: { unitPrice: 1.05 } },
  { id: 'cap-delay', labelKey: 'scenario.preset.capacityDelay', multipliers: { coreCapacity: 0.9, buCapacity: 0.9 } },
  { id: 'cap-ahead', labelKey: 'scenario.preset.capacityAhead', multipliers: { coreCapacity: 1.1, buCapacity: 1.1 } },
  { id: 'demand-down', labelKey: 'scenario.preset.demandDown15', multipliers: { forecastVolume: 0.85 } },
];

const MULTIPLIER_KEYS: (keyof ScenarioMultipliers)[] = [
  'forecastVolume', 'unitPrice', 'coreCapacity', 'buCapacity',
];

// ============================================================
// Helpers
// ============================================================

function pctFromMultiplier(v: number): number {
  return Math.round((v - 1) * 100);
}

function multiplierFromPct(pct: number): number {
  return Math.max(0.5, Math.min(2.0, 1 + pct / 100));
}

function formatPct(v: number): string {
  const pct = pctFromMultiplier(v);
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct}%`;
}

function getYearsFromResults(yearly: YearlyResult[]): string[] {
  return yearly.map(y => y.year);
}

/* UNUSED */
/* UNUSED - getMetricValue removed
function getMetricValue(row: YearlyResult, key: string): number | null {
  const r = row as unknown as Record<string, number | null>;
  return r[key] ?? null;
}
*/

// ============================================================
// Component
// ============================================================

const ScenarioPlanningPage: React.FC<ScenarioPlanningProps> = ({ scope }) => {
  const { t } = useI18n();
  const writable = canEdit(scope.role);

  // Data
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [baselineDq, setBaselineDq] = useState<DataQualitySummary | null>(null);

  // Scenario state
  const [annualMultipliers, setAnnualMultipliers] = useState<AnnualMultipliers>({});
  const [comparison, setComparison] = useState<AnnualScenarioComparison | null>(null);
  const [computing, setComputing] = useState(false);
    const [dqDismissed, setDqDismissed] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);

  // Template scenario state
  const [templateResult, setTemplateResult] = useState<OperationalScenarioResult | null>(null);
  const [templateLoading, setTemplateLoading] = useState<string | null>(null);
  // v1.63.1 — Enhanced template params
  const [lastRunType, setLastRunType] = useState<'annual' | 'template' | null>(null);
  const [activeTab, setActiveTab] = useState<string>('multipliers');
  const [delayStartMonth, setDelayStartMonth] = useState<string | undefined>(undefined);
  const [delayMonths, setDelayMonths] = useState(3);
  const [delayRatio, setDelayRatio] = useState(20);
  const [lossCustomer, setLossCustomer] = useState<string | undefined>(undefined);
  const [surgeTargetType, setSurgeTargetType] = useState<'all' | 'customer' | 'sku'>('all');
  const [surgeTargetValue, setSurgeTargetValue] = useState<string | undefined>(undefined);
  const [surgePercent, setSurgePercent] = useState(20);
  // v1.64 — Graduated churn params
  const [churnStartMonth, setChurnStartMonth] = useState<string | undefined>(undefined);
  const [churnMonths, setChurnMonths] = useState(3);
  const [churnRatio, setChurnRatio] = useState(50);
  const [churnScope, setChurnScope] = useState<'all' | 'sku'>('all');
  const [churnSkuCode, setChurnSkuCode] = useState<string | undefined>(undefined);

  // Years management
  const [years, setYears] = useState<string[]>([]);

  const hasData = skus.length > 0 && forecasts.length > 0 && params !== null;

  // v1.63.1 — Derived template data
  const customerList = useMemo(() => {
    const customers = new Set(skus.map(s => s.customer).filter(Boolean));
    return Array.from(customers).sort();
  }, [skus]);
  const skuCodeList = useMemo(() => {
    const codes = new Set(skus.map(s => s.skuCode).filter(Boolean));
    return Array.from(codes).sort();
  }, [skus]);
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    for (const cp of capacityPlans) months.add(cp.month);
    return Array.from(months).sort();
  }, [capacityPlans]);

  // v1.63.1 — displayComparison picks from template or annual results
  const displayComparison = useMemo(() => {
    if (lastRunType === 'template' && templateResult) return templateResult.comparison;
    return comparison;
  }, [lastRunType, templateResult, comparison]);
    const displayTemplateDesc = lastRunType === 'template' && templateResult ? templateResult.description : null;
  const displayTemplateScenarioDeltas = lastRunType === 'template' && templateResult ? templateResult.comparison.deltas : null;

  // Derive default years from forecasts
  const defaultYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const f of forecasts) {
      yearSet.add(f.month.substring(0, 4));
    }
    for (const cp of capacityPlans) {
      yearSet.add(cp.month.substring(0, 4));
    }
    return Array.from(yearSet).sort();
  }, [forecasts, capacityPlans]);

  // Initialize years and multipliers when data loads
  useEffect(() => {
    if (defaultYears.length > 0 && years.length === 0) {
      setYears(defaultYears);
      const init: AnnualMultipliers = {};
      for (const y of defaultYears) {
        init[y] = defaultMultipliers();
      }
      setAnnualMultipliers(init);
    }
  }, [defaultYears]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [skuData, fcData, cpData, paramData] = await Promise.all([
        getSKUs(scope),
        getForecasts(scope),
        getCapacityPlans(scope),
        getParameters(scope),
      ]);
      setSkus(skuData);
      setForecasts(fcData);
      setCapacityPlans(cpData);
      setParams(paramData);
      if (paramData) {
        setCurrencySettings(normalizeCurrencySettings(paramData.currencySettings));
        setBaselineDq(buildDataQualitySummary({
          skus: skuData, forecasts: fcData, capacityPlans: cpData, params: paramData,
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Multiplier handlers ----

  const handleGlobalApply = useCallback((key: keyof ScenarioMultipliers, pctValue: number) => {
    const m = multiplierFromPct(pctValue);
    setAnnualMultipliers(prev => {
      const next = { ...prev };
      for (const y of years) {
        next[y] = { ...(next[y] ?? defaultMultipliers()), [key]: m };
      }
      return next;
    });
  }, [years]);

  const handleCellChange = useCallback((year: string, key: keyof ScenarioMultipliers, value: number | null) => {
    if (value === null) return;
    setAnnualMultipliers(prev => ({
      ...prev,
      [year]: { ...(prev[year] ?? defaultMultipliers()), [key]: value },
    }));
  }, []);

  const handlePreset = useCallback((preset: Preset) => {
    setAnnualMultipliers(prev => {
      const next = { ...prev };
      for (const y of years) {
        const base = next[y] ?? defaultMultipliers();
        next[y] = { ...base, ...preset.multipliers };
      }
      return next;
    });
  }, [years]);

  const handleResetAll = useCallback(() => {
    const init: AnnualMultipliers = {};
    for (const y of years) {
      init[y] = defaultMultipliers();
    }
    setAnnualMultipliers(init);
  }, [years]);

  const handleAddYear = useCallback((position: 'before' | 'after') => {
    setYears(prev => {
      const sorted = [...prev].sort();
      const newYear = position === 'before'
        ? String(Number(sorted[0]) - 1)
        : String(Number(sorted[sorted.length - 1]) + 1);
      if (prev.includes(newYear)) return prev;
      setAnnualMultipliers(am => ({ ...am, [newYear]: defaultMultipliers() }));
      return [...prev, newYear].sort();
    });
  }, []);

  // ---- Run scenario ----

  const handleRunScenario = useCallback(async () => {
    if (!params) return;
    setComputing(true);
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      const result = computeAnnualScenarioComparison(
        skus, forecasts, capacityPlans, params, annualMultipliers
      );
      setComparison(result);
      setLastRunType('annual');
      setActiveTab('results');
    } finally {
      setComputing(false);
    }
  }, [skus, forecasts, capacityPlans, params, annualMultipliers]);

  // ---- Template scenario handlers ----
  const handleRunTemplateScenario = useCallback((scenarioType: 'capacityDelay' | 'orderDisappearance' | 'forecastAdjustment') => {
    if (!params) return;
    setTemplateLoading(scenarioType);
    setTemplateResult(null);
    setTimeout(() => {
      try {
        const baseInput = { skus, forecasts, capacityPlans, params };
        let result: OperationalScenarioResult;
        if (scenarioType === 'capacityDelay') {
          result = runOperationalScenario({
            ...baseInput,
            scenarioType: 'capacityDelay',
            capacityShiftMonths: delayMonths,
            capacityShiftTarget: 'both',
            capacityDelayStartMonth: delayStartMonth || undefined,
            capacityDelayRatio: delayRatio,
          });
        } else if (scenarioType === 'orderDisappearance') {
          const customer = lossCustomer || undefined;
          result = runOperationalScenario({
            ...baseInput,
            scenarioType: 'orderDisappearance',
            orderFilter: customer ? { customer } : undefined,
            // v1.64 — graduated churn params
            orderDisappearanceStartMonth: churnStartMonth || undefined,
            orderDisappearanceMonths: churnMonths,
            orderDisappearanceRatio: churnRatio,
            orderDisappearanceScope: churnScope,
            orderDisappearanceSkuCode: churnScope === 'sku' ? churnSkuCode : undefined,
          });
        } else {
          const filter: OperationalScenarioParams['forecastFilter'] = {};
          if (surgeTargetType === 'customer' && surgeTargetValue) {
            filter.customers = [surgeTargetValue];
          } else if (surgeTargetType === 'sku' && surgeTargetValue) {
            filter.skuCodes = [surgeTargetValue];
          }
          result = runOperationalScenario({
            ...baseInput,
            scenarioType: 'forecastAdjustment',
            forecastAdjustPercent: surgePercent,
            forecastFilter: surgeTargetType === 'all' ? undefined : filter,
          });
        }
        setTemplateResult(result);
        setLastRunType('template');
        setActiveTab('results');
      } catch { /* silent */ } finally { setTemplateLoading(null); }
    }, 0);
  }, [skus, forecasts, capacityPlans, params, delayStartMonth, delayMonths, delayRatio, lossCustomer, surgeTargetType, surgeTargetValue, surgePercent, churnStartMonth, churnMonths, churnRatio, churnScope, churnSkuCode]);

  // ---- v1.63.5 One-click stress test buttons ----
  // These run scenarios with custom parameters directly (bypassing form state).
  // They only change simulation parameters, never save formal data.
  const handleStrongStressTest = useCallback(() => {
    if (!params) return;
    setTemplateLoading('capacityDelay');
    setTemplateResult(null);
    setTimeout(() => {
      try {
        const result = runOperationalScenario({
          skus, forecasts, capacityPlans, params,
          scenarioType: 'capacityDelay',
          capacityShiftMonths: 6,
          capacityShiftTarget: 'both',
          capacityDelayStartMonth: delayStartMonth || undefined,
          capacityDelayRatio: 40,
        });
        setTemplateResult(result);
        setLastRunType('template');
        setActiveTab('results');
      } catch { /* silent */ } finally { setTemplateLoading(null); }
    }, 0);
  }, [skus, forecasts, capacityPlans, params, delayStartMonth]);

  const handleExtendDelay = useCallback(() => {
    if (!params) return;
    setTemplateLoading('capacityDelay');
    setTemplateResult(null);
    setTimeout(() => {
      try {
        const result = runOperationalScenario({
          skus, forecasts, capacityPlans, params,
          scenarioType: 'capacityDelay',
          capacityShiftMonths: 6,
          capacityShiftTarget: 'both',
          capacityDelayStartMonth: delayStartMonth || undefined,
          capacityDelayRatio: delayRatio,
        });
        setTemplateResult(result);
        setLastRunType('template');
        setActiveTab('results');
      } catch { /* silent */ } finally { setTemplateLoading(null); }
    }, 0);
  }, [skus, forecasts, capacityPlans, params, delayStartMonth, delayRatio]);

  const handleIncreaseForecast = useCallback(() => {
    if (!params) return;
    setTemplateLoading('forecastAdjustment');
    setTemplateResult(null);
    setTimeout(() => {
      try {
        const result = runOperationalScenario({
          skus, forecasts, capacityPlans, params,
          scenarioType: 'forecastAdjustment',
          forecastAdjustPercent: 30,
        });
        setTemplateResult(result);
        setLastRunType('template');
        setActiveTab('results');
      } catch { /* silent */ } finally { setTemplateLoading(null); }
    }, 0);
  }, [skus, forecasts, capacityPlans, params]);

  // ---- Derived results ----

  const displayYears = useMemo(() => {
    if (!comparison) return years;
    return getYearsFromResults(comparison.baseline.yearly);
  }, [comparison, years]);

  // Summary KPIs 

  // Summary KPIs
  const kpi = useMemo(() => {
    if (!comparison) return null;
    const base = comparison.baseline.yearly;
    const scen = comparison.scenario.yearly;

    // Total revenue delta across all years (convert USD to TWD)
    const totalBaseRevUsd = base.reduce((s, y) => s + y.totalRevenueUsd, 0);
    const totalScenRevUsd = scen.reduce((s, y) => s + y.totalRevenueUsd, 0);
    const totalBaseRev = convertFromUsd(totalBaseRevUsd, 'TWD', currencySettings);
    const totalScenRev = convertFromUsd(totalScenRevUsd, 'TWD', currencySettings);
    const revDelta = totalScenRev - totalBaseRev;

    // Max BP attainment change
    let worstBpDelta = 0;
    let worstBpYear = '';
    for (const y of displayYears) {
      const b = base.find(r => r.year === y);
      const s = scen.find(r => r.year === y);
      if (b?.bpAttainmentPct !== null && s?.bpAttainmentPct !== null && b?.bpAttainmentPct !== undefined && s?.bpAttainmentPct !== undefined) {
        const d = s.bpAttainmentPct - b.bpAttainmentPct;
        if (d < worstBpDelta) { worstBpDelta = d; worstBpYear = y; }
      }
    }

    // Max BU utilization in scenario
    let maxBuUtil = 0;
    let maxBuYear = '';
    for (const y of scen) {
      if (y.maxBuUtilization !== null && y.maxBuUtilization > maxBuUtil) {
        maxBuUtil = y.maxBuUtilization;
        maxBuYear = y.year;
      }
    }

    return { revDelta, worstBpDelta, worstBpYear, maxBuUtil, maxBuYear };
  }, [comparison, displayYears, currencySettings]);
  
  // v1.63.3 — Delivery risk exposure (for capacity-driven template scenarios)
  // Computes per-month capacity gap, revenue at risk, and customer risk
  const deliveryRisk = useMemo(() => {
    if (lastRunType !== 'template' || !displayComparison) return null;
    const sc = displayComparison as any;
    const baseMonthly: any[] = sc.baseline?.calcResult?.monthlySummaries ?? [];
    const scenMonthly: any[] = sc.scenario?.calcResult?.monthlySummaries ?? [];
    const baseSkuResults = sc.baseline?.calcResult?.skuResults ?? [];

    if (baseMonthly.length === 0) return null;

    // Collect all months
    const monthSet = new Set<string>();
    for (const m of baseMonthly) monthSet.add(m.month);
    for (const m of scenMonthly) monthSet.add(m.month);
    const months = Array.from(monthSet).sort();

    // Per-month capacity gap & utilization
    const monthlyGaps = months.map(month => {
      const base = baseMonthly.find((m: any) => m.month === month);
      const scen = scenMonthly.find((m: any) => m.month === month);
      const baseBuCap = base?.buCapacity ?? 0;
      const scenBuCap = scen?.buCapacity ?? 0;
      return {
        month,
        baseBuCapacity: baseBuCap,
        scenBuCapacity: scenBuCap,
        baseCoreCapacity: base?.coreCapacity ?? 0,
        scenCoreCapacity: scen?.coreCapacity ?? 0,
        baseBuUtil: base?.buUtilization !== undefined && base?.buUtilization !== null ? +(base.buUtilization * 100).toFixed(1) : null,
        scenBuUtil: scen?.buUtilization !== undefined && scen?.buUtilization !== null ? +(scen.buUtilization * 100).toFixed(1) : null,
        baseShortage: base?.buShortage ?? 0,
        scenShortage: scen?.buShortage ?? 0,
        capGapPct: baseBuCap > 0 ? Math.round((1 - scenBuCap / baseBuCap) * 100) : 0,
      };
    });

    // Months with increased BU shortage
    const affectedMonths = monthlyGaps.filter(m => m.scenShortage > m.baseShortage);
    const affectedMonthSet = new Set(affectedMonths.map(m => m.month));

    // Revenue at risk (revenue from affected months)
    const revenueAtRiskUsd = baseSkuResults
      .filter((r: any) => affectedMonthSet.has(r.month))
      .reduce((sum: number, r: any) => sum + r.revenue, 0);
    const revenueAtRiskMntd = Math.round(convertFromUsd(revenueAtRiskUsd, 'TWD', currencySettings) / 1e6 * 100) / 100;

    // Customers at risk
    const customerMap = new Map<string, { affectedMonthCount: number; revenueAtRiskUsd: number }>();
    for (const r of baseSkuResults) {
      if (!affectedMonthSet.has(r.month)) continue;
      const sku = skus.find((s: SKU) => s.id === r.skuId);
      const customer = sku?.customer || 'Unknown';
      const existing = customerMap.get(customer) || { affectedMonthCount: 0, revenueAtRiskUsd: 0 };
      existing.affectedMonthCount++;
      existing.revenueAtRiskUsd += r.revenue;
      customerMap.set(customer, existing);
    }
    const customersAtRisk = Array.from(customerMap.entries())
      .map(([customer, data]) => ({
        customer,
        affectedMonthCount: data.affectedMonthCount,
        revenueAtRiskMntd: Math.round(convertFromUsd(data.revenueAtRiskUsd, 'TWD', currencySettings) / 1e6 * 100) / 100,
      }))
      .sort((a, b) => b.revenueAtRiskMntd - a.revenueAtRiskMntd);

    // Severity metrics
    const totalCapGap = monthlyGaps.reduce((s, m) => s + (m.baseBuCapacity - m.scenBuCapacity), 0);
    const maxBuUtilPct = Math.max(...monthlyGaps.filter(m => m.scenBuUtil !== null).map(m => m.scenBuUtil!), 0);
    // Chart data
    const utilChartData = monthlyGaps.map(m => ({ month: m.month, baseline: m.baseBuUtil, scenario: m.scenBuUtil }));
    const gapChartData = monthlyGaps.map(m => ({ month: m.month, gapPct: m.capGapPct }));
    // Top 6 months, top 5 customers
    const topMonths = [...monthlyGaps].sort((a, b) => b.capGapPct - a.capGapPct).slice(0, 6);
    const topCustomers = (customersAtRisk || []).slice(0, 5);
    return { monthlyGaps, topMonths, affectedMonthCount: affectedMonths.length, revenueAtRiskMntd, customersAtRisk, topCustomers, totalCapGap, maxBuUtilPct, utilChartData, gapChartData };
  }, [displayComparison, lastRunType, skus, currencySettings]);

  // ---- v1.63.5 Stress level classification ----
  const stressInfo = useMemo(() => {
    if (!deliveryRisk || !displayTemplateScenarioDeltas) return null;
    const shortageDelta = displayTemplateScenarioDeltas.shortageMonthCount.delta ?? 0;
    const maxUtil = deliveryRisk.maxBuUtilPct;
    const capGap = deliveryRisk.totalCapGap;
    // HIGH: severe shortage, near-capacity utilization, or massive cap gap
    if (shortageDelta > 3 || maxUtil > 85 || capGap > 150000) {
      return {
        level: 'high' as const,
        label: '高',
        color: '#dc2626',
        explanation: `产能压力高 — 短缺${shortageDelta > 0 ? '增加 ' + shortageDelta + ' 个月' : ''}${maxUtil > 85 ? '，最大利用率 ' + maxUtil.toFixed(1) + '%' : ''}。建议立即评估交付计划。`,
      };
    }
    // MEDIUM: some shortage or noticeable utilization
    if (shortageDelta > 0 || maxUtil > 30 || capGap > 50000) {
      return {
        level: 'medium' as const,
        label: '中',
        color: '#d97706',
        explanation: shortageDelta > 0
          ? `产能压力中等 — 短缺增加 ${shortageDelta} 个月，最大利用率 ${maxUtil.toFixed(1)}%。建议关注高风险月份。`
          : `产能压力中等 — 最大利用率 ${maxUtil.toFixed(1)}%，产能缺口 ${(capGap / 1000).toFixed(0)}K Panel PNL。虽然未触发短缺，但产能已实质下降。`,
      };
    }
    // LOW: very comfortable capacity
    return {
      level: 'low' as const,
      label: '低',
      color: '#10b981',
      explanation: `产能基线利用率仅 ${maxUtil.toFixed(1)}%，产能十分宽松。当前模拟参数不足以触发短缺。建议尝试加大压力参数以观察产能瓶颈效应。`,
      suggestionNote: '以下按钮可一键运行更强压力模拟（不保存正式数据）：',
    };
  }, [deliveryRisk, displayTemplateScenarioDeltas]);

  // ---- v1.64 Customer churn analysis ----
  const isChurnScenario = lastRunType === 'template' && templateResult?.scenarioType === 'orderDisappearance';

  const churnAnalysis = useMemo(() => {
    if (!isChurnScenario || !templateResult) return null;

    const comp = templateResult.comparison;
    const deltas = comp.deltas;
    const baseCalc = comp.baseline.calcResult;
    const scenCalc = comp.scenario.calcResult;
    const impact = templateResult.impact;

    // Revenue impact (M NTD)
    const revenueDeltaUsd = deltas.totalRevenueUsd.delta ?? 0;
    const revenueDeltaMntd = Math.round(convertFromUsd(revenueDeltaUsd, 'TWD', currencySettings) / 1e6 * 100) / 100;

    // Revenue to compensate (absolute negative delta)
    const revenueToCompensateMntd = revenueDeltaUsd < 0
      ? Math.round(convertFromUsd(Math.abs(revenueDeltaUsd), 'TWD', currencySettings) / 1e6 * 100) / 100
      : 0;

    // BP metrics
    const bpAttainmentDelta = deltas.bpAttainmentPct.delta;
    const bpGapBase = deltas.bpGapMillionTwd.base;
    const bpGapScen = deltas.bpGapMillionTwd.scenario;
    const shortageDelta = deltas.shortageMonthCount.delta ?? 0;

    // Core/BU capacity released: compare demand reduction between baseline and scenario
    const baseMonthly = baseCalc.monthlySummaries;
    const scenMonthly = scenCalc.monthlySummaries;
    let totalCoreDemandFreed = 0;
    let totalBuDemandFreed = 0;
    for (const baseM of baseMonthly) {
      const scenM = scenMonthly.find((m: any) => m.month === baseM.month);
      if (scenM) {
        totalCoreDemandFreed += Math.max(0, (baseM as any).totalCorePanelDemand - (scenM as any).totalCorePanelDemand);
        totalBuDemandFreed += Math.max(0, (baseM as any).totalBuPanelDemand - (scenM as any).totalBuPanelDemand);
      }
    }

    // Annual revenue comparison data (aggregate by year from skuResults)
    const yearMap = new Map<string, { baseRevenue: number; scenRevenue: number }>();
    for (const r of baseCalc.skuResults) {
      const year = r.month.substring(0, 4);
      const entry = yearMap.get(year) || { baseRevenue: 0, scenRevenue: 0 };
      entry.baseRevenue += r.revenue;
      yearMap.set(year, entry);
    }
    for (const r of scenCalc.skuResults) {
      const year = r.month.substring(0, 4);
      const entry = yearMap.get(year) || { baseRevenue: 0, scenRevenue: 0 };
      entry.scenRevenue += r.revenue;
      yearMap.set(year, entry);
    }
    const annualData = Array.from(yearMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([year, data]) => ({
      year,
      baseRevenueMntd: Math.round(convertFromUsd(data.baseRevenue, 'TWD', currencySettings) / 1e6 * 100) / 100,
      scenRevenueMntd: Math.round(convertFromUsd(data.scenRevenue, 'TWD', currencySettings) / 1e6 * 100) / 100,
      deltaMntd: Math.round(convertFromUsd(data.scenRevenue - data.baseRevenue, 'TWD', currencySettings) / 1e6 * 100) / 100,
    }));

    // Capacity released by year
    const capYearMap = new Map<string, { coreFreed: number; buFreed: number }>();
    for (const baseM of baseMonthly) {
      const scenM = scenMonthly.find((m: any) => m.month === baseM.month);
      if (scenM) {
        const year = (baseM as any).month.substring(0, 4);
        const entry = capYearMap.get(year) || { coreFreed: 0, buFreed: 0 };
        entry.coreFreed += Math.max(0, (baseM as any).totalCorePanelDemand - (scenM as any).totalCorePanelDemand);
        entry.buFreed += Math.max(0, (baseM as any).totalBuPanelDemand - (scenM as any).totalBuPanelDemand);
        capYearMap.set(year, entry);
      }
    }
    const capReleaseData = Array.from(capYearMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([year, data]) => ({
      year, coreFreed: Math.round(data.coreFreed), buFreed: Math.round(data.buFreed),
    }));

    // Alternative order suggestions: top unaffected customers by revenue
    const affectedCustomer = lossCustomer;
    const alternativeCustomers = impact.byCustomer
      .filter(c => c.delta === 0 && c.baselineRevenue > 0 && c.label !== affectedCustomer)
      .sort((a, b) => b.baselineRevenue - a.baselineRevenue)
      .slice(0, 5)
      .map(c => ({
        customer: c.label,
        currentRevenueMntd: Math.round(convertFromUsd(c.baselineRevenue, 'TWD', currencySettings) / 1e6 * 100) / 100,
      }));

    return {
      revenueDeltaMntd, revenueToCompensateMntd,
      bpAttainmentDelta, bpGapBase, bpGapScen,
      shortageDelta,
      totalCoreDemandFreed: Math.round(totalCoreDemandFreed),
      totalBuDemandFreed: Math.round(totalBuDemandFreed),
      annualData, capReleaseData, alternativeCustomers,
    };
  }, [isChurnScenario, templateResult, currencySettings, lossCustomer]);

// ---- Loading ----
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  const showDqWarning = baselineDq && (baselineDq.confidence === 'low' || baselineDq.confidence === 'blocked') && !dqDismissed;

  // ============================================================
  // Render
  // ============================================================
  return (
    <PageShell variant="wide">
      <PageHeader title={t('scenario.title')} description={t('scenario.description')} />

      {showDqWarning && (
        <Alert message={t('scenario.dqWarning')} type="warning" showIcon closable
          onClose={() => setDqDismissed(true)} style={{ marginBottom: 16 }} />
      )}

      {!writable && (
        <Alert message={t('scenario.viewerReadOnly')} type="info" showIcon style={{ marginBottom: 16 }} />
      )}

      {!hasData && (
        <Alert message={t('scenario.noData')} type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

            <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginTop: 8 }}
        items={[
          {
            key: 'multipliers',
            label: <span><ExperimentOutlined /> {t('scenario.tab.annualMultipliers')}</span>,
            children: (
              <>
{/* ===== SECTION 1: Global Batch Adjust + Presets ===== */}
      <Card style={{ ...S.card, marginBottom: 16 }}
        title={<Space><ExperimentOutlined /><Text strong>{t('scenario.globalAdjust.title')}</Text></Space>}
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleResetAll} disabled={!writable} size="small">
            {t('scenario.resetAll')}
          </Button>
        }
      >
{/* Presets */}
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
            {t('scenario.presets.label')}
          </Text>
          <Space wrap size={[8, 8]}>
            {PRESETS.map(p => (
              <Button key={p.id} size="small"
                style={{ borderRadius: 8, borderColor: S.accentBorder, color: S.textPrimary }}
                disabled={!writable}
                onClick={() => handlePreset(p)}
              >
                {t(p.labelKey)}
              </Button>
            ))}
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Global multiplier inputs */}
        <Row gutter={[16, 12]}>
          {MULTIPLIER_KEYS.map(key => {
            // Show current value (use first year as representative)
            const firstYear = years[0];
            const currentVal = annualMultipliers[firstYear]?.[key] ?? 1.0;
            const currentPct = pctFromMultiplier(currentVal);

            return (
              <Col xs={12} sm={6} key={key}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                  {t(`scenario.multiplier.${key}`)}
                </Text>
                <Space size={4}>
                  <InputNumber
                    size="small"
                    min={-50}
                    max={100}
                    value={currentPct}
                    onChange={v => { if (v !== null) handleGlobalApply(key, v); }}
                    disabled={!writable}
                    style={{ width: 72 }}
                    addonAfter="%"
                  />
                </Space>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* ===== SECTION 2: Annual Multiplier Matrix ===== */}
      <Card style={{ ...S.card, marginBottom: 16 }}
        title={<Space><Text strong>{t('scenario.annualMatrix.title')}</Text></Space>}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: `${140 + years.length * 90 + 60}px`, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{
                  position: 'sticky', left: 0, background: '#fff', zIndex: 1,
                  textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #f0f0f0',
                  width: 140, minWidth: 140, fontWeight: 600,
                  whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.35,
                }}>
                  {t('scenario.annualMatrix.metric')}
                </th>
                {years.map(y => (
                  <th key={y} style={{
                    textAlign: 'center', padding: '8px 8px', borderBottom: '1px solid #f0f0f0',
                    fontWeight: 600, minWidth: 90, width: 90,
                  }}>
                    {y}
                  </th>
                ))}
                <th style={{ padding: '8px 4px', borderBottom: '1px solid #f0f0f0', width: 60 }}>
                  <Space size={2}>
                    <Tooltip title={t('scenario.annualMatrix.addYearBefore')}>
                      <Button size="small" type="text" icon={<MinusOutlined />}
                        onClick={() => handleAddYear('before')} disabled={!writable}
                        style={{ fontSize: 10, padding: '0 2px' }} />
                    </Tooltip>
                    <Tooltip title={t('scenario.annualMatrix.addYearAfter')}>
                      <Button size="small" type="text" icon={<PlusOutlined />}
                        onClick={() => handleAddYear('after')} disabled={!writable}
                        style={{ fontSize: 10, padding: '0 2px' }} />
                    </Tooltip>
                  </Space>
                </th>
              </tr>
            </thead>
            <tbody>
              {MULTIPLIER_KEYS.map(key => (
                <tr key={key}>
                  <td style={{
                    position: 'sticky', left: 0, background: '#fff', zIndex: 1,
                    padding: '6px 12px', borderBottom: '1px solid #f0f0f0',
                    fontWeight: 500, minWidth: 140, width: 140,
                    whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.35,
                  }}>
                    {t(`scenario.multiplier.${key}`)}
                  </td>
                  {years.map(y => {
                    const val = annualMultipliers[y]?.[key] ?? 1.0;
                    const isChanged = val !== 1.0;
                    return (
                      <td key={y} style={{
                        textAlign: 'center', padding: '4px 4px',
                        borderBottom: '1px solid #f0f0f0',
                        background: isChanged ? S.accentBg : undefined,
                        transition: 'background 0.3s',
                      }}>
                        <div>
                          <InputNumber
                            size="small"
                            min={0.5}
                            max={2.0}
                            step={0.01}
                            value={val}
                            onChange={v => handleCellChange(y, key, v)}
                            disabled={!writable}
                            style={{ width: 68, fontSize: 12 }}
                            controls={false}
                          />
                        </div>
                        <Text type="secondary" style={{ fontSize: 10 }}>
                          {formatPct(val)}
                        </Text>
                      </td>
                    );
                  })}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Divider style={{ margin: '16px 0 12px' }} />

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleRunScenario}
          loading={computing}
          disabled={!writable || !hasData}
          size="large"
          style={{ borderRadius: 10, background: S.accent, borderColor: S.accent }}
        >
          {computing ? t('scenario.computing') : t('scenario.runScenario')}
        </Button>
      </Card>

      
              </>
            ),
          },
          {
            key: 'templates',
            label: <span><ThunderboltOutlined /> {t('scenario.tab.templates')}</span>,
            children: (
              <ScenarioTemplates
                customerList={customerList}
                skuCodeList={skuCodeList}
                availableMonths={availableMonths}
                delayStartMonth={delayStartMonth}
                delayMonths={delayMonths}
                delayRatio={delayRatio}
                lossCustomer={lossCustomer}
                surgeTargetType={surgeTargetType}
                surgeTargetValue={surgeTargetValue}
                surgePercent={surgePercent}
                templateLoading={templateLoading}
                churnStartMonth={churnStartMonth}
                churnMonths={churnMonths}
                churnRatio={churnRatio}
                churnScope={churnScope}
                churnSkuCode={churnSkuCode}
                onDelayStartMonthChange={setDelayStartMonth}
                onDelayMonthsChange={v => setDelayMonths(v || 3)}
                onDelayRatioChange={v => setDelayRatio(v ?? 20)}
                onLossCustomerChange={setLossCustomer}
                onChurnStartMonthChange={setChurnStartMonth}
                onChurnMonthsChange={v => setChurnMonths(v || 3)}
                onChurnRatioChange={v => setChurnRatio(v ?? 50)}
                onChurnScopeChange={setChurnScope}
                onChurnSkuCodeChange={setChurnSkuCode}
                onSurgeTargetTypeChange={setSurgeTargetType}
                onSurgeTargetValueChange={setSurgeTargetValue}
                onSurgePercentChange={v => setSurgePercent(v || 20)}
                onRunTemplate={handleRunTemplateScenario}
              />
            ),
          },
          {
            key: 'results',
            label: <span><BarChartOutlined /> {t('scenario.tab.results')}</span>,
            children: (
              <>
                {displayTemplateDesc && (
                  <Alert message={displayTemplateDesc} type="success" showIcon style={{ marginBottom: 16 }} closable />
                )}
                {!displayComparison ? (
                  <Card style={{ ...S.card, marginBottom: 16, textAlign: 'center', padding: '48px 24px' }}>
                    <Empty
                      description={
                        <div>
                          <Title level={5} style={{ color: S.textSecondary, marginBottom: 4 }}>
                            {t('scenario.empty.title')}
                          </Title>
                          <Text type="secondary">{t('scenario.templates.results.noData')}</Text>
                        </div>
                      }
                    />
                  </Card>
                ) : churnAnalysis ? (
                  <>
                    <Card style={{ ...S.card, marginBottom: 16 }}
                      title={<Space><TeamOutlined /><Text strong>客户流失影响分析</Text></Space>}>
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {/* Churn KPI row */}
                        <Row gutter={[12, 12]}>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.negative }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>营收影响</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, color: churnAnalysis.revenueDeltaMntd >= 0 ? S.positive : S.negative, marginTop: 4 }}>
                                {churnAnalysis.revenueDeltaMntd >= 0 ? "+" : ""}{churnAnalysis.revenueDeltaMntd.toFixed(1)} M NTD
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.warning }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>需补回营收</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, color: churnAnalysis.revenueToCompensateMntd > 0 ? S.negative : S.textPrimary, marginTop: 4 }}>
                                {churnAnalysis.revenueToCompensateMntd > 0 ? churnAnalysis.revenueToCompensateMntd.toFixed(1) + " M NTD" : "—"}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: (churnAnalysis.bpAttainmentDelta !== null && churnAnalysis.bpAttainmentDelta < 0) ? "4px solid " + S.negative : "4px solid " + S.accent }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>BP 达成率变化</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                                {churnAnalysis.bpAttainmentDelta !== null
                                  ? (churnAnalysis.bpAttainmentDelta >= 0 ? "+" : "") + churnAnalysis.bpAttainmentDelta.toFixed(1) + "%"
                                  : "—"}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: (churnAnalysis.bpGapBase !== null && churnAnalysis.bpGapScen !== null && (churnAnalysis.bpGapScen ?? 0) > (churnAnalysis.bpGapBase ?? 0)) ? "4px solid " + S.negative : "4px solid " + S.accent }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>BP 差距</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                                {churnAnalysis.bpGapBase !== null && churnAnalysis.bpGapScen !== null
                                  ? churnAnalysis.bpGapScen.toFixed(1) + " M NTD"
                                  : "—"}
                              </div>
                            </Card>
                          </Col>
                        </Row>

                        {/* Capacity released KPI sub-row */}
                        <Row gutter={[12, 12]}>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid #3b82f6" }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Core 产能释放</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                                {churnAnalysis.totalCoreDemandFreed > 0 ? churnAnalysis.totalCoreDemandFreed.toLocaleString() + " Panel PNL" : "0"}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid #10b981" }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>BU 产能释放</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                                {churnAnalysis.totalBuDemandFreed > 0 ? churnAnalysis.totalBuDemandFreed.toLocaleString() + " Panel PNL" : "0"}
                              </div>
                            </Card>
                          </Col>
                        </Row>

                        {/* Annual impact chart */}
                        <Card size="small" style={{ ...S.cardCompact }}
                          title={<Text strong style={{ fontSize: 13 }}>年度营收影响</Text>}>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={churnAnalysis.annualData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                              <YAxis tickFormatter={(v: number) => `${v} M`} tick={{ fontSize: 10 }} />
                              <RechartsTooltip formatter={(value: any) => `${Number(value).toFixed(1)} M NTD`} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="baseRevenueMntd" fill="#9ca3af" name="基线" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="scenRevenueMntd" fill="#dc2626" name="情景" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>

                        {/* Capacity released chart */}
                        <Card size="small" style={{ ...S.cardCompact }}
                          title={<Text strong style={{ fontSize: 13 }}>产能释放（按年）</Text>}>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={churnAnalysis.capReleaseData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                              <YAxis tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} tick={{ fontSize: 10 }} />
                              <RechartsTooltip formatter={(value: any) => Number(value).toLocaleString() + " Panel PNL"} />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="coreFreed" fill="#3b82f6" name="Core 面板" radius={[3, 3, 0, 0]} />
                              <Bar dataKey="buFreed" fill="#10b981" name="BU 面板" radius={[3, 3, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </Card>

                        {/* Annual impact table */}
                        <Card size="small" style={{ ...S.cardCompact }}
                          title={<Text strong style={{ fontSize: 13 }}>年度影响明细</Text>}>
                          <Table dataSource={churnAnalysis.annualData} rowKey="year" size="small" pagination={false}
                            columns={[
                              { title: "年度", dataIndex: "year", key: "year", width: 80 },
                              { title: "基线营收 (M NTD)", dataIndex: "baseRevenueMntd", key: "baseRevenueMntd", align: "right",
                                render: (v: number) => v.toFixed(1) },
                              { title: "情景营收 (M NTD)", dataIndex: "scenRevenueMntd", key: "scenRevenueMntd", align: "right",
                                render: (v: number, record: any) => {
                                  const base = record?.baseRevenueMntd ?? 0;
                                  return <Text style={{ color: v < base ? S.negative : S.textPrimary }}>{v.toFixed(1)}</Text>;
                                } },
                              { title: "差异 (M NTD)", dataIndex: "deltaMntd", key: "deltaMntd", align: "right",
                                render: (v: number) => {
                                  return <Text style={{ color: v < 0 ? S.negative : v > 0 ? S.positive : S.textPrimary }}>
                                    {v >= 0 ? "+" : ""}{v.toFixed(1)}
                                  </Text>;
                                } },
                            ]} />
                        </Card>

                        {/* Alternative order suggestions */}
                        {churnAnalysis.alternativeCustomers.length > 0 && (
                          <Card size="small" style={{ ...S.cardCompact }}
                            title={<Text strong style={{ fontSize: 13 }}>替代订单建议</Text>}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                              以下客户营收未受影响，具备替代订单潜力：
                            </Text>
                            <Table dataSource={churnAnalysis.alternativeCustomers} rowKey="customer" size="small" pagination={false}
                              columns={[
                                { title: "客户", dataIndex: "customer", key: "customer" },
                                { title: "当前营收 (M NTD)", dataIndex: "currentRevenueMntd", key: "currentRevenueMntd", align: "right",
                                  render: (v: number) => v.toFixed(1) },
                              ]} />
                          </Card>
                        )}
                      </Space>
                    </Card>
                  </>
                ) : deliveryRisk ? (
                  <>
                    <Card style={{ ...S.card, marginBottom: 16 }}
                      title={<Space><BarChartOutlined /><Text strong>交付风险暴露 (Delivery Risk Exposure)</Text></Space>}>
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.negative }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>短缺变化</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, color: (displayTemplateScenarioDeltas?.shortageMonthCount.delta ?? 0) > 0 ? S.negative : S.textPrimary, marginTop: 4 }}>
                                {(displayTemplateScenarioDeltas?.shortageMonthCount?.delta ?? null) !== null ? ((displayTemplateScenarioDeltas?.shortageMonthCount?.delta ?? 0) >= 0 ? "+" : "") + (displayTemplateScenarioDeltas?.shortageMonthCount?.delta ?? 0) : "—"}
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>(base: {displayTemplateScenarioDeltas?.shortageMonthCount.base ?? 0})</Text>
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.warning }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Max BU 利用率</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                                {deliveryRisk.maxBuUtilPct > 0 ? deliveryRisk.maxBuUtilPct.toFixed(1) + "%" : "—"}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: (deliveryRisk.totalCapGap > 0) ? "4px solid " + S.warning : "4px solid " + S.accent }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>产能缺口</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{(deliveryRisk.totalCapGap / 1000).toFixed(0)}K Panel PNL</div>
                              <Text type="secondary" style={{ fontSize: 11 }}>BU capacity reduction sum</Text>
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: (deliveryRisk.revenueAtRiskMntd > 0) ? "4px solid " + S.warning : "4px solid " + S.accent }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>风险营收暴露</Text>
                              <div style={{ fontSize: 22, fontWeight: 700, color: (deliveryRisk.revenueAtRiskMntd > 0) ? S.negative : S.textPrimary, marginTop: 4 }}>
                                {deliveryRisk.revenueAtRiskMntd > 0 ? deliveryRisk.revenueAtRiskMntd.toFixed(1) + " M NTD" : "0.0 M NTD"}
                              </div>
                              <Text type="secondary" style={{ fontSize: 11 }}>短缺月份中的预测营收</Text>
                            </Card>
                          </Col>
                        </Row>

                        {/* ---- v1.63.5 Stress level + suggestions ---- */}
                        {stressInfo && (
                          <Card size="small" style={{
                            ...S.cardCompact, marginBottom: 16,
                            borderLeft: `4px solid ${stressInfo.color}`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                              <span style={{
                                display: 'inline-block', fontSize: 12, fontWeight: 600,
                                padding: '2px 10px', borderRadius: 4,
                                color: '#fff', background: stressInfo.color,
                              }}>
                                压力等级: {stressInfo.label}
                              </span>
                              <Text style={{ fontSize: 13, flex: 1, minWidth: 200 }}>{stressInfo.explanation}</Text>
                            </div>
                            {stressInfo.level === 'low' && (
                              <div style={{ marginTop: 10 }}>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{stressInfo.suggestionNote}</Text>
                                <Space wrap size={[8, 8]}>
                                  <Button size="small" type="primary" onClick={handleStrongStressTest}
                                    style={{ borderRadius: 8, background: S.negative, borderColor: S.negative }}>
                                    套用强压力测试
                                  </Button>
                                  <Button size="small" onClick={handleExtendDelay} style={{ borderRadius: 8 }}>
                                    延长延迟至 6 个月
                                  </Button>
                                  <Button size="small" onClick={handleIncreaseForecast} style={{ borderRadius: 8 }}>
                                    提高预测 30%
                                  </Button>
                                  <Text type="secondary" style={{ fontSize: 10, fontStyle: 'italic' }}>
                                    仅模拟，不保存
                                  </Text>
                                </Space>
                              </div>
                            )}
                          </Card>
                        )}

                        {/* ---- Charts row: BU utilization + capacity gap ---- */}
                        <Row gutter={[12, 12]}>
                          <Col xs={24} lg={12}>
                            <Card size="small" style={{ ...S.cardCompact }}
                              title={<Text strong style={{ fontSize: 13 }}>BU 利用率趋势</Text>}>
                              <ResponsiveContainer width="100%" height={220}>
                                <LineChart data={deliveryRisk.utilChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                  <YAxis domain={[0, 'auto']} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} />
                                  <RechartsTooltip
                                    formatter={(value: any) => value !== null && value !== undefined ? `${Number(value).toFixed(1)}%` : '---'}
                                    labelFormatter={(label: any) => `月份: ${label}`}
                                  />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={1.5}
                                    label={{ value: '100% 警戒线', position: 'right', fontSize: 10, fill: '#dc2626' }} />
                                  <Line type="monotone" dataKey="baseline" stroke="#9ca3af" name="Baseline" dot={false} strokeWidth={2} connectNulls={false} />
                                  <Line type="monotone" dataKey="scenario" stroke="#dc2626" name="Scenario" dot={false} strokeWidth={2} connectNulls={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Card>
                          </Col>
                          <Col xs={24} lg={12}>
                            <Card size="small" style={{ ...S.cardCompact }}
                              title={<Text strong style={{ fontSize: 13 }}>产能缺口率</Text>}>
                              <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={deliveryRisk.gapChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                  <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} />
                                  <RechartsTooltip
                                    formatter={(value: any) => [`${Number(value).toFixed(0)}%`, '产能缺口']}
                                    labelFormatter={(label: any) => `月份: ${label}`}
                                  />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <Bar dataKey="gapPct" fill="#d97706" name="Cap Gap %" radius={[3, 3, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </Card>
                          </Col>
                        </Row>

                        {/* Top 6 months by capacity gap */}
                        <Card style={{ ...S.card, marginBottom: 16 }} size="small"
                          title={<Text strong style={{ fontSize: 13 }}>重点月份 Top 6</Text>}>
                          <Table dataSource={deliveryRisk.topMonths} rowKey="month" size="small" pagination={false}
                            columns={[
                              { title: "月份", dataIndex: "month", key: "month", width: 80 },
                              { title: "Cap Gap", key: "capGapPct", width: 70, align: "right",
                                render: (_: any, r: any) => <Text style={{ color: r.capGapPct > 0 ? S.negative : S.textPrimary }}>{r.capGapPct > 0 ? "-" + r.capGapPct + "%" : "0%"}</Text> },
                              { title: "BU(b)", dataIndex: "baseBuUtil", key: "baseBuUtil", width: 80, align: "right",
                                render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "---" },
                              { title: "BU(s)", dataIndex: "scenBuUtil", key: "scenBuUtil", width: 80, align: "right",
                                render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "---" },
                              { title: "Short", key: "shortage", width: 80, align: "right",
                                render: (_: any, r: any) => r.scenShortage > r.baseShortage
                                  ? <Text style={{ color: S.negative }}>+{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>
                                  : r.scenShortage < r.baseShortage
                                    ? <Text style={{ color: S.positive }}>{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>
                                    : "---" },
                            ]} />
                        </Card>
                        {deliveryRisk.topCustomers.length > 0 && (
                          <Card style={{ ...S.card, marginBottom: 16 }} size="small"
                            title={<Text strong style={{ fontSize: 13 }}>客户影响 Top 5</Text>}>
                            <Table dataSource={deliveryRisk.topCustomers} rowKey="customer" size="small" pagination={false}
                              columns={[
                                { title: "客户", dataIndex: "customer", key: "customer" },
                                { title: "SKU 数", dataIndex: "affectedMonthCount", key: "affectedMonthCount", align: "right" },
                                { title: "营收风险 (M NTD)", dataIndex: "revenueAtRiskMntd", key: "revenueAtRiskMntd", align: "right",
                                  render: (v: number) => <Text style={{ color: v > 0 ? S.warning : S.textPrimary }}>{v.toFixed(1)}</Text> },
                              ]} />
                          </Card>
                        )}
                        <details style={{ marginBottom: 16 }}>
                          <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: S.textSecondary, padding: 8 }}>
                            查看全部月份明细 ({deliveryRisk.monthlyGaps.length} 个月)
                          </summary>
                          <Table dataSource={deliveryRisk.monthlyGaps} rowKey="month" size="small" pagination={false}
                            columns={[
                              { title: "月份", dataIndex: "month", key: "month", width: 80 },
                              { title: "Cap Gap", dataIndex: "capGapPct", key: "capGapPct", width: 70, align: "right",
                                render: (v: number) => <Text style={{ color: v > 0 ? S.negative : S.textPrimary }}>{v > 0 ? "-" + v + "%" : "0%"}</Text> },
                              { title: "BU(b)", dataIndex: "baseBuUtil", key: "baseBuUtil", width: 80, align: "right",
                                render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "---" },
                              { title: "BU(s)", dataIndex: "scenBuUtil", key: "scenBuUtil", width: 80, align: "right",
                                render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "---" },
                              { title: "Short", key: "shortage", width: 80, align: "right",
                                render: (_: any, r: any) => r.scenShortage > r.baseShortage
                                  ? <Text style={{ color: S.negative }}>+{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>
                                  : r.scenShortage < r.baseShortage
                                    ? <Text style={{ color: S.positive }}>{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>
                                    : "---" },
                            ]} />
                        </details>
                        {deliveryRisk.affectedMonthCount === 0 && deliveryRisk.totalCapGap > 0 && (
                          <Alert type="warning" showIcon
                            message={"短缺月份数未变化，但产能缺口总计 " + (deliveryRisk.totalCapGap / 1000).toFixed(0) + "K Panel PNL。"}
                            description={"BU 利用率从基线 " + (displayTemplateScenarioDeltas?.maxBuUtilization?.base !== null && displayTemplateScenarioDeltas?.maxBuUtilization?.base !== Infinity
                              ? Number(displayTemplateScenarioDeltas?.maxBuUtilization?.base).toFixed(1) + "%" : "---") + " 上升至情景 " + deliveryRisk.maxBuUtilPct.toFixed(1) + "%。产能可用性已实质性下降。"}
                            style={{ fontSize: 12 }} />
                        )}</Space>
                    </Card>
                  </>
                ) : (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                      <Col xs={24} sm={8}>
                        <Card style={{ ...S.cardCompact, borderLeft: "4px solid " + S.accent }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.kpi.revenueImpact')}</Text>
                          <div style={{ fontSize: 24, fontWeight: 700, color: (kpi && kpi.revDelta >= 0) ? S.positive : S.negative, marginTop: 4 }}>
                            {kpi ? (kpi.revDelta >= 0 ? "+" : "") + (kpi.revDelta / 1e6).toFixed(1) + " M NTD" : "—"}
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </>
                )}
              </>
            ),
          },
        ]}
      />
    </PageShell>
  );
};

export default ScenarioPlanningPage;
