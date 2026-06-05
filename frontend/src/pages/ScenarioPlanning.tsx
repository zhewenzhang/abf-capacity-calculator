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
  Segmented,
  InputNumber,
  Tooltip,
  Empty,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { useI18n } from '../i18n';
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
import { formatNumber } from '../core/formatters';
import { convertFromUsd, normalizeCurrencySettings, DEFAULT_CURRENCY_SETTINGS, type CurrencySettings } from '../core/currency';
import PageHeader from '../components/common/PageHeader';

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

function getMetricValue(row: YearlyResult, key: string): number | null {
  const r = row as unknown as Record<string, number | null>;
  return r[key] ?? null;
}

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
  const [resultMode, setResultMode] = useState<'original' | 'simulated' | 'delta'>('simulated');
  const [dqDismissed, setDqDismissed] = useState(false);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);

  // Years management
  const [years, setYears] = useState<string[]>([]);

  const hasData = skus.length > 0 && forecasts.length > 0 && params !== null;

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
    } finally {
      setComputing(false);
    }
  }, [skus, forecasts, capacityPlans, params, annualMultipliers]);

  // ---- Derived results ----

  const displayYears = useMemo(() => {
    if (!comparison) return years;
    return getYearsFromResults(comparison.baseline.yearly);
  }, [comparison, years]);

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

  // Chart data
  const revenueChartData = useMemo(() => {
    if (!comparison) return [];
    return displayYears.map(y => {
      const b = comparison.baseline.yearly.find(r => r.year === y);
      const s = comparison.scenario.yearly.find(r => r.year === y);
      const baseRevTwd = b ? convertFromUsd(b.totalRevenueUsd, 'TWD', currencySettings) / 1e6 : 0;
      const scenRevTwd = s ? convertFromUsd(s.totalRevenueUsd, 'TWD', currencySettings) / 1e6 : 0;
      return {
        year: y,
        baseline: baseRevTwd,
        scenario: scenRevTwd,
      };
    });
  }, [comparison, displayYears, currencySettings]);

  const bpChartData = useMemo(() => {
    if (!comparison) return [];
    return displayYears.map(y => {
      const b = comparison.baseline.yearly.find(r => r.year === y);
      const s = comparison.scenario.yearly.find(r => r.year === y);
      return {
        year: y,
        baseline: b?.bpAttainmentPct ?? null,
        scenario: s?.bpAttainmentPct ?? null,
      };
    });
  }, [comparison, displayYears]);

  const utilChartData = useMemo(() => {
    if (!comparison) return [];
    return displayYears.map(y => {
      const b = comparison.baseline.yearly.find(r => r.year === y);
      const s = comparison.scenario.yearly.find(r => r.year === y);
      return {
        year: y,
        coreBase: b?.maxCoreUtilization ?? null,
        coreScen: s?.maxCoreUtilization ?? null,
        buBase: b?.maxBuUtilization ?? null,
        buScen: s?.maxBuUtilization ?? null,
      };
    });
  }, [comparison, displayYears]);

  // Results table data
  const tableRows = useMemo(() => {
    if (!comparison) return [];
    const base = comparison.baseline.yearly;
    const scen = comparison.scenario.yearly;

    const metrics: { key: string; labelKey: string; format: (v: number | null) => string; deltaFormat: (b: number | null, s: number | null) => string }[] = [
      {
        key: 'totalRevenueUsd',
        labelKey: 'scenario.metric.totalRevenue',
        format: v => {
          if (v === null) return '—';
          const vTwd = convertFromUsd(v, 'TWD', currencySettings);
          return `${(vTwd / 1e6).toFixed(1)} M NTD`;
        },
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const bTwd = convertFromUsd(b, 'TWD', currencySettings);
          const sTwd = convertFromUsd(s, 'TWD', currencySettings);
          const d = (sTwd - bTwd) / 1e6;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)} M NTD`;
        },
      },
      {
        key: 'bpAttainmentPct',
        labelKey: 'scenario.metric.bpAttainment',
        format: v => v !== null ? `${v.toFixed(1)}%` : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`;
        },
      },
      {
        key: 'bpGapMillionTwd',
        labelKey: 'scenario.metric.bpGap',
        format: v => v !== null ? `${v.toFixed(1)}M` : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)}M`;
        },
      },
      {
        key: 'totalForecastPcs',
        labelKey: 'scenario.metric.forecastPcs',
        format: v => v !== null ? formatNumber(v) : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${formatNumber(d)}`;
        },
      },
      {
        key: 'maxCoreUtilization',
        labelKey: 'scenario.metric.maxCoreUtil',
        format: v => v !== null ? `${v.toFixed(1)}%` : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`;
        },
      },
      {
        key: 'maxBuUtilization',
        labelKey: 'scenario.metric.maxBuUtil',
        format: v => v !== null ? `${v.toFixed(1)}%` : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${d.toFixed(1)}pp`;
        },
      },
      {
        key: 'shortageMonthCount',
        labelKey: 'scenario.metric.shortage',
        format: v => v !== null ? String(v) : '—',
        deltaFormat: (b, s) => {
          if (b === null || s === null) return '—';
          const d = s - b;
          return `${d >= 0 ? '+' : ''}${d}`;
        },
      },
    ];

    return metrics.map(m => ({
      key: m.key,
      label: t(m.labelKey),
      values: displayYears.map(y => {
        const bRow = base.find(r => r.year === y);
        const sRow = scen.find(r => r.year === y);
        const bVal = bRow ? getMetricValue(bRow, m.key) : null;
        const sVal = sRow ? getMetricValue(sRow, m.key) : null;
        if (resultMode === 'original') return m.format(bVal);
        if (resultMode === 'simulated') return m.format(sVal);
        return m.deltaFormat(bVal, sVal);
      }),
    }));
  }, [comparison, displayYears, resultMode, t, currencySettings]);

  // ---- Loading ----
  if (loading) {
    return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  const showDqWarning = baselineDq && (baselineDq.confidence === 'low' || baselineDq.confidence === 'blocked') && !dqDismissed;

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
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

      {/* ===== SECTION 3: Results ===== */}
      {!comparison ? (
        /* Empty state */
        <Card style={{ ...S.card, marginBottom: 16, textAlign: 'center', padding: '48px 24px' }}>
          <Empty
            description={
              <div>
                <Title level={5} style={{ color: S.textSecondary, marginBottom: 4 }}>
                  {t('scenario.empty.title')}
                </Title>
                <Text type="secondary">{t('scenario.empty.description')}</Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleRunScenario}
              disabled={!writable || !hasData}
              style={{ borderRadius: 10, background: S.accent, borderColor: S.accent }}
            >
              {t('scenario.runScenario')}
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {/* ---- KPI Summary Cards ---- */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={8}>
              <Card style={{ ...S.cardCompact, borderLeft: `4px solid ${S.accent}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.kpi.revenueImpact')}</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi && kpi.revDelta >= 0 ? S.positive : S.negative, marginTop: 4 }}>
                  {kpi ? `${kpi.revDelta >= 0 ? '+' : ''}${(kpi.revDelta / 1e6).toFixed(1)} M NTD` : '—'}
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ ...S.cardCompact, borderLeft: `4px solid ${kpi && kpi.worstBpDelta < -5 ? S.negative : S.accent}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.kpi.bpImpact')}</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi && kpi.worstBpDelta < 0 ? S.negative : S.textPrimary, marginTop: 4 }}>
                  {kpi && kpi.worstBpDelta !== 0 ? `${kpi.worstBpDelta >= 0 ? '+' : ''}${kpi.worstBpDelta.toFixed(1)}pp` : '—'}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {kpi?.worstBpYear ? `${kpi.worstBpYear}` : ''}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card style={{ ...S.cardCompact, borderLeft: `4px solid ${kpi && kpi.maxBuUtil > 90 ? S.warning : S.accent}` }}>
                <Text type="secondary" style={{ fontSize: 12 }}>{t('scenario.kpi.capacityImpact')}</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: kpi && kpi.maxBuUtil > 100 ? S.negative : kpi && kpi.maxBuUtil > 90 ? S.warning : S.textPrimary, marginTop: 4 }}>
                  {kpi ? `${kpi.maxBuUtil.toFixed(1)}%` : '—'}
                </div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {t('scenario.kpi.maxBuUtil')} {kpi?.maxBuYear ? `(${kpi.maxBuYear})` : ''}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* ---- Trend Charts ---- */}
          <Card style={{ ...S.card, marginBottom: 16 }}
            title={<Text strong>{t('scenario.charts.title')}</Text>}
          >
            <Row gutter={[16, 24]}>
              {/* Revenue chart */}
              <Col xs={24} lg={8}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {t('scenario.chart.revenue')}
                </Text>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 3 }} name={t('scenario.baseline')} />
                    <Line type="monotone" dataKey="scenario" stroke={S.accent} strokeWidth={2} dot={{ r: 3 }} name={t('scenario.current')} />
                  </LineChart>
                </ResponsiveContainer>
              </Col>

              {/* BP chart */}
              <Col xs={24} lg={8}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {t('scenario.chart.bpAttainment')}
                </Text>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bpChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={100} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: '100%', fontSize: 10, fill: '#9ca3af' }} />
                    <Line type="monotone" dataKey="baseline" stroke="#94a3b8" strokeWidth={1.5} dot={{ r: 3 }} name={t('scenario.baseline')} connectNulls={false} />
                    <Line type="monotone" dataKey="scenario" stroke={S.accent} strokeWidth={2} dot={{ r: 3 }} name={t('scenario.current')} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Col>

              {/* Utilization chart */}
              <Col xs={24} lg={8}>
                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  {t('scenario.chart.utilization')}
                </Text>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={utilChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                    <RTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={100} stroke="#fecaca" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="coreBase" stroke="#94a3b8" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Core (base)" />
                    <Line type="monotone" dataKey="coreScen" stroke="#f97316" strokeWidth={1.5} dot={{ r: 2 }} name="Core (sim)" />
                    <Line type="monotone" dataKey="buBase" stroke="#cbd5e1" strokeWidth={1} dot={false} strokeDasharray="4 4" name="BU (base)" />
                    <Line type="monotone" dataKey="buScen" stroke={S.negative} strokeWidth={1.5} dot={{ r: 2 }} name="BU (sim)" />
                  </LineChart>
                </ResponsiveContainer>
              </Col>
            </Row>
          </Card>

          {/* ---- Results Table with Mode Switch ---- */}
          <Card style={{ ...S.card, marginBottom: 16 }}
            title={<Text strong>{t('scenario.table.title')}</Text>}
            extra={
              <Segmented
                size="small"
                value={resultMode}
                onChange={v => setResultMode(v as 'original' | 'simulated' | 'delta')}
                options={[
                  { label: t('scenario.mode.original'), value: 'original' },
                  { label: t('scenario.mode.simulated'), value: 'simulated' },
                  { label: t('scenario.mode.delta'), value: 'delta' },
                ]}
              />
            }
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ minWidth: `${160 + displayYears.length * 120}px`, borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{
                      position: 'sticky', left: 0, background: '#fff', zIndex: 1,
                      textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid #e5e7eb',
                      fontWeight: 600, width: 160, minWidth: 160,
                      whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.35,
                    }}>
                      {t('scenario.table.metric')}
                    </th>
                    {displayYears.map(y => (
                      <th key={y} style={{
                        textAlign: 'right', padding: '8px 12px', borderBottom: '2px solid #e5e7eb',
                        fontWeight: 600, minWidth: 120, width: 120,
                      }}>
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map(row => (
                    <tr key={row.key}>
                      <td style={{
                        position: 'sticky', left: 0, background: '#fff', zIndex: 1,
                        padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 500,
                        minWidth: 160, width: 160,
                        whiteSpace: 'normal', wordBreak: 'keep-all', lineHeight: 1.35,
                      }}>
                        {row.label}
                      </td>
                      {row.values.map((val, i) => {
                        const isDelta = resultMode === 'delta';
                        const isPositive = isDelta && val !== '—' && !val.startsWith('-');
                        const isNegative = isDelta && val !== '—' && val.startsWith('-');
                        return (
                          <td key={i} style={{
                            textAlign: 'right', padding: '8px 12px',
                            borderBottom: '1px solid #f0f0f0',
                            color: isPositive ? S.positive : isNegative ? S.negative : S.textPrimary,
                            fontWeight: isDelta ? 600 : 400,
                            minWidth: 120, width: 120,
                          }}>
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ScenarioPlanningPage;
