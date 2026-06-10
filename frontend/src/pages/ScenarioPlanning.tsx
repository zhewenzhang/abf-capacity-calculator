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
import PageHeader from '../components/common/PageHeader';
import ScenarioTemplates from './ScenarioTemplates';

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
      return {
        month,
        baseBuCapacity: base?.buCapacity ?? 0,
        scenBuCapacity: scen?.buCapacity ?? 0,
        baseCoreCapacity: base?.coreCapacity ?? 0,
        scenCoreCapacity: scen?.coreCapacity ?? 0,
        baseBuUtil: base?.buUtilization !== undefined && base?.buUtilization !== null ? +(base.buUtilization * 100).toFixed(1) : null,
        scenBuUtil: scen?.buUtilization !== undefined && scen?.buUtilization !== null ? +(scen.buUtilization * 100).toFixed(1) : null,
        baseShortage: base?.buShortage ?? 0,
        scenShortage: scen?.buShortage ?? 0,
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

    return { monthlyGaps, affectedMonthCount: affectedMonths.length, revenueAtRiskMntd, customersAtRisk };
  }, [displayComparison, lastRunType, skus, currencySettings]);

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
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={8}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.negative }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>短缺变化</Text>
                              <div style={{ fontSize: 24, fontWeight: 700, color: (displayTemplateScenarioDeltas && displayTemplateScenarioDeltas.shortageMonthCount.delta !== null && displayTemplateScenarioDeltas.shortageMonthCount.delta > 0) ? S.negative : S.textPrimary, marginTop: 4 }}>
                                {displayTemplateScenarioDeltas && displayTemplateScenarioDeltas.shortageMonthCount.delta !== null
                                  ? (displayTemplateScenarioDeltas.shortageMonthCount.delta >= 0 ? "+" : "") + displayTemplateScenarioDeltas.shortageMonthCount.delta
                                  : "—"}
                                <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>
                                  (base: {displayTemplateScenarioDeltas?.shortageMonthCount.base ?? 0})
                                </Text>
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: "4px solid " + S.warning }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Max BU 利用率</Text>
                              <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                                {displayTemplateScenarioDeltas?.maxBuUtilization?.scenario !== null && displayTemplateScenarioDeltas?.maxBuUtilization?.scenario !== undefined && displayTemplateScenarioDeltas?.maxBuUtilization?.scenario !== Infinity
                                  ? displayTemplateScenarioDeltas.maxBuUtilization.scenario.toFixed(1) + "%"
                                  : "—"}
                              </div>
                            </Card>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Card size="small" style={{ ...S.cardCompact, borderLeft: (deliveryRisk.revenueAtRiskMntd > 0) ? "4px solid " + S.warning : "4px solid " + S.accent }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>风险营收暴露</Text>
                              <div style={{ fontSize: 24, fontWeight: 700, color: (deliveryRisk.revenueAtRiskMntd > 0) ? S.negative : S.textPrimary, marginTop: 4 }}>
                                {deliveryRisk.revenueAtRiskMntd > 0 ? deliveryRisk.revenueAtRiskMntd.toFixed(1) + " M NTD" : "0.0 M NTD"}
                              </div>
                              <Text type="secondary" style={{ fontSize: 11 }}>短缺月份中的预测营收</Text>
                            </Card>
                          </Col>
                        </Row>
                        <Table dataSource={deliveryRisk.monthlyGaps} rowKey="month" size="small" pagination={false}
                          columns={[
                            { title: "月份", dataIndex: "month", key: "month", width: 80 },
                            { title: "Base BU Cap", dataIndex: "baseBuCapacity", key: "baseBuCapacity", width: 100, align: "right",
                              render: (v: number) => v.toLocaleString() },
                            { title: "Scen BU Cap", dataIndex: "scenBuCapacity", key: "scenBuCapacity", width: 100, align: "right",
                              render: (v: number) => v.toLocaleString() },
                            { title: "Cap Gap", key: "gap", width: 70, align: "right",
                              render: (_: any, r: any) => {
                                const gap = r.baseBuCapacity > 0 ? Math.round((1 - r.scenBuCapacity / r.baseBuCapacity) * 100) : 0;
                                return <Text style={{ color: gap > 0 ? S.negative : S.textPrimary }}>{gap > 0 ? "-" + gap + "%" : "0%"}</Text>;
                              } },
                            { title: "BU Util (base)", dataIndex: "baseBuUtil", key: "baseBuUtil", width: 100, align: "right",
                              render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "—" },
                            { title: "BU Util (scen)", dataIndex: "scenBuUtil", key: "scenBuUtil", width: 100, align: "right",
                              render: (v: number | null) => v !== null ? v.toFixed(1) + "%" : "—" },
                            { title: "短缺", key: "shortage", width: 100, align: "right",
                              render: (_: any, r: any) => {
                                if (r.scenShortage > r.baseShortage) return <Text style={{ color: S.negative }}>+{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>;
                                if (r.scenShortage < r.baseShortage) return <Text style={{ color: S.positive }}>{(r.scenShortage - r.baseShortage).toLocaleString()}</Text>;
                                return "—";
                              } },
                          ]} />
                        {deliveryRisk.customersAtRisk.length > 0 && (
                          <div>
                            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>客户风险暴露</Text>
                            <Table dataSource={deliveryRisk.customersAtRisk} rowKey="customer" size="small" pagination={false}
                              columns={[
                                { title: t('scenario.templates.selectCustomer'), dataIndex: "customer", key: "customer" },
                                { title: "受影响产品数", dataIndex: "affectedMonthCount", key: "affectedMonthCount", align: "right" },
                                { title: "营收风险 (M NTD)", dataIndex: "revenueAtRiskMntd", key: "revenueAtRiskMntd", align: "right",
                                  render: (v: number) => <Text style={{ color: v > 0 ? S.warning : S.textPrimary }}>{v.toFixed(1)}</Text> },
                              ]} />
                          </div>
                        )}
                        <Alert type="info" showIcon message="产能延迟主要影响 BU 利用率与短缺月份。以上风险营收暴露 = 短缺月份中的预测营收（非实际损失确认），用于量化交付风险范围。" style={{ fontSize: 12 }} />
                      </Space>
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
