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
import {
  buildScenarioKpis,
  buildYearlyRiskRevenueRows,
  buildCapacityGapChartSet,
  buildDataQualityInfo,
  buildScenarioTypeInfo,
  buildScenarioExplanation,
} from '../core/scenarioResultPresentation';
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
  }, [skus, forecasts, capacityPlans, params, delayStartMonth, delayMonths, delayRatio, lossCustomer, surgeTargetType, surgeTargetValue, surgePercent]);

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

  // ---- v1.64.2 Scenario result presentation (using helper module) ----
  const resultPresentation = useMemo(() => {
    if (!deliveryRisk || !displayTemplateScenarioDeltas || !displayComparison) return null;
    const sc = displayComparison as any;
    const baseSkuResults: any[] = sc.baseline?.calcResult?.skuResults ?? [];
    const monthlyGaps = deliveryRisk.monthlyGaps ?? [];

    // Collect affected month set
    const affectedMonths = monthlyGaps.filter((m: any) => m.scenShortage > m.baseShortage);
    const affectedMonthSet = new Set(affectedMonths.map((m: any) => m.month));

    // KPIs
    const topYearRevenueData = (() => {
      const yearMap = new Map<string, number>();
      for (const r of baseSkuResults) {
        if (!affectedMonthSet.has(r.month)) continue;
        const year = r.month.substring(0, 4);
        yearMap.set(year, (yearMap.get(year) ?? 0) + r.revenue);
      }
      let topYear = '';
      let topAmount = 0;
      for (const [y, rev] of yearMap) {
        const mntd = Math.round(convertFromUsd(rev, 'TWD', currencySettings) / 1e6 * 100) / 100;
        if (mntd > topAmount) { topAmount = mntd; topYear = y; }
      }
      return topYear ? { year: topYear, amount: topAmount } : null;
    })();

    // Compute the gap bars from the monthly data directly
    const gapBars = monthlyGaps.map((m: any) => ({
      month: m.month,
      gapPanels: Math.max(0, m.baseBuCapacity - m.scenBuCapacity),
    }));

    const kpis = buildScenarioKpis(
      displayTemplateScenarioDeltas,
      deliveryRisk.maxBuUtilPct,
      deliveryRisk.totalCapGap,
      deliveryRisk.affectedMonthCount,
      deliveryRisk.revenueAtRiskMntd,
      topYearRevenueData,
    );
    const yearlyRows = buildYearlyRiskRevenueRows(baseSkuResults, affectedMonthSet, skus, currencySettings);
    const gapChartData = buildCapacityGapChartSet(monthlyGaps);
    const dqInfo = buildDataQualityInfo(baselineDq);
    const scenarioTypeInfo = buildScenarioTypeInfo(templateResult?.scenarioType, templateResult?.description);
    const scenarioExplanation = buildScenarioExplanation(templateResult?.scenarioType);

    return {
      kpis,
      yearlyRows,
      gapChartData,
      dqInfo,
      scenarioTypeInfo,
      scenarioExplanation,
      topYearRevenueData,
      monthlyGaps,
      affectedMonthSet,
      gapBars,
    };
  }, [deliveryRisk, displayTemplateScenarioDeltas, displayComparison, skus, currencySettings, baselineDq, templateResult]);

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
          : `产能压力中等 — 最大利用率 ${maxUtil.toFixed(1)}%，产能缺口 ${capGap.toLocaleString()} panels。虽然未触发短缺，但产能已实质下降。`,
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

      {showDqWarning && baselineDq && (
        <Alert type="warning" showIcon closable
          onClose={() => setDqDismissed(true)}
          style={{ marginTop: 8, marginBottom: 16 }}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 13 }}>
                发现 {baselineDq.issues?.length ?? 0} 个资料品质问题
              </Text>
              <Text style={{ fontSize: 12 }}>
                {baselineDq.issues?.[0]?.detail ?? '资料品质异常'}。
                {baselineDq.confidence === 'blocked'
                  ? '部分关键资料缺失，模拟结果可能不完整。建议先修复资料问题。'
                  : '预测引用了不存在的 SKU，会影响客户、产品与产能归因。BP 或产能结论仍可参考，但归因可能不完整。'}
              </Text>
              <Button size="small" type="link" style={{ padding: 0, fontSize: 12 }} onClick={() => setDqDismissed(true)}>
                查看资料问题 →
              </Button>
            </Space>
          }
        />
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
                onDelayStartMonthChange={setDelayStartMonth}
                onDelayMonthsChange={v => setDelayMonths(v || 3)}
                onDelayRatioChange={v => setDelayRatio(v ?? 20)}
                onLossCustomerChange={setLossCustomer}
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
                ) : deliveryRisk ? (
                  <>
                    <Card style={{ ...S.card, marginBottom: 16 }}
                      title={<Space><BarChartOutlined /><Text strong>交付风险暴露 (Delivery Risk Exposure)</Text></Space>}>
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        {/* ---- KPI row (v1.64.2 business KPIs) ---- */}
                        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                          {resultPresentation!.kpis.map(kpi => {
                            const borderColor = kpi.state === 'danger' ? S.negative : kpi.state === 'warning' ? S.warning : kpi.state === 'success' ? S.accent : '#e8e8e8';
                            const valueColor = kpi.state === 'danger' ? S.negative : kpi.state === 'warning' ? S.warning : S.textPrimary;
                            return (
                              <Col xs={12} sm={6} key={kpi.key}>
                                <Card size="small" style={{ ...S.cardCompact, borderLeft: `4px solid ${borderColor}`, position: 'relative' }}>
                                  {kpi.badge && (
                                    <span style={{
                                      position: 'absolute', top: 6, right: 8,
                                      fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4,
                                      color: '#fff', background: kpi.badge.state === 'success' ? S.positive : S.warning,
                                    }}>
                                      {kpi.badge.text}
                                    </span>
                                  )}
                                  <Text type="secondary" style={{ fontSize: 12 }}>{kpi.label}</Text>
                                  <div style={{ fontSize: 22, fontWeight: 700, color: valueColor, marginTop: 4 }}>
                                    {kpi.value}
                                  </div>
                                  <Text type="secondary" style={{ fontSize: 11 }}>{kpi.subtext}</Text>
                                </Card>
                              </Col>
                            );
                          })}
                        </Row>

                        {/* ---- Yearly risk revenue breakdown (v1.64.2) ---- */}
                        {resultPresentation!.yearlyRows.length > 0 && (
                          <Card size="small" style={{ ...S.cardCompact, marginBottom: 16 }}
                            title={<Text strong style={{ fontSize: 13 }}>年度风险营收暴露</Text>}>
                            <Table dataSource={resultPresentation!.yearlyRows} rowKey="year" size="small" pagination={false}
                              columns={[
                                { title: "年度", dataIndex: "year", key: "year", width: 70 },
                                { title: "风险营收 (M NTD)", dataIndex: "riskRevenueMntd", key: "riskRevenueMntd", align: "right",
                                  render: (v: number) => v.toFixed(1) },
                                { title: "短缺月份", dataIndex: "shortageMonths", key: "shortageMonths", align: "right" },
                                { title: "主要客户", dataIndex: "topCustomers", key: "topCustomers" },
                              ]} />
                          </Card>
                        )}

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
                                    formatter={(value: any, name: any) => {
                                      if (name === 'deltaPp') return null; // hide raw delta
                                      return value !== null && value !== undefined ? `${Number(value).toFixed(1)}%` : '---';
                                    }}
                                    labelFormatter={(label: any) => `月份: ${label}`}
                                  />
                                  <Legend wrapperStyle={{ fontSize: 11 }} />
                                  <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="5 5" strokeWidth={1.5}
                                    label={{ value: '100% 警戒', position: 'right', fontSize: 10, fill: '#dc2626' }} />
                                  <ReferenceLine y={85} stroke="#d97706" strokeDasharray="3 3" strokeWidth={1}
                                    label={{ value: '85% 警戒', position: 'right', fontSize: 10, fill: '#d97706' }} />
                                  <Line type="monotone" dataKey="baseline" stroke="#9ca3af" name="Baseline" dot={false} strokeWidth={2} connectNulls={false} />
                                  <Line type="monotone" dataKey="scenario" stroke="#dc2626" name="Scenario" dot={false} strokeWidth={2} connectNulls={false} />
                                </LineChart>
                              </ResponsiveContainer>
                            </Card>
                          </Col>
                          <Col xs={24} lg={12}>
                            {resultPresentation!.gapChartData.isAllZero ? (
                              <Card size="small" style={{ ...S.cardCompact, height: '100%' }}
                                title={<Text strong style={{ fontSize: 13 }}>产能缺口</Text>}>
                                <div style={{ textAlign: 'center', padding: '20px 12px' }}>
                                  <Text strong style={{ fontSize: 14, color: S.accent, display: 'block', marginBottom: 4 }}>未产生产能缺口</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    模拟后可用产能仍高于需求{deliveryRisk.totalCapGap > 0 ? '，但产能余裕下降' : ''}，因此缺口为 0。
                                  </Text>
                                </div>
                              </Card>
                            ) : (
                              <Card size="small" style={{ ...S.cardCompact }}
                                title={<Text strong style={{ fontSize: 13 }}>产能缺口（面板数）</Text>}>
                                <ResponsiveContainer width="100%" height={220}>
                                  <BarChart data={resultPresentation!.gapChartData.bars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                                    <YAxis tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip
                                      formatter={(value: any) => [`${Number(value).toLocaleString()} panels`, '缺口']}
                                      labelFormatter={(label: any) => `月份: ${label}`}
                                    />
                                    <Bar dataKey="gapPanels" fill="#d97706" name="产能缺口" radius={[3, 3, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </Card>
                            )}
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
                            message={"短缺月份数未变化，但产能缺口总计 " + deliveryRisk.totalCapGap.toLocaleString() + " panels。"}
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
