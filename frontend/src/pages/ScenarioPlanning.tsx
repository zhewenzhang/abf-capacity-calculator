import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Slider,
  InputNumber,
  Button,
  Typography,
  Spin,
  Divider,
  Space,
  Table,
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  PlusOutlined,
  MinusOutlined,
  RocketOutlined,
} from '@ant-design/icons';
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
  clampMultipliers,
  type ScenarioMultipliers,
} from '../core/scenarioEngine';
import {
  formatNumber,
  formatCurrencyDisplay,
} from '../core/formatters';
import MetricCard from '../components/common/MetricCard';
import { DEFAULT_CURRENCY_SETTINGS, normalizeCurrencySettings } from '../core/currency';
import {
  defaultAssumption,
  clampAssumption,
  extractDataYears,
  buildScenarioVisibleYears,
  runYearlyScenario,
  type YearlyAssumption,
  type YearlyScenarioOutput,
  type YearlyResultRow,
} from '../core/yearlyScenario';

const { Text } = Typography;

interface ScenarioPlanningProps {
  scope: ProjectScope;
}

const MULTIPLIER_FIELDS: {
  key: keyof ScenarioMultipliers;
  i18nLabel: string;
}[] = [
  { key: 'forecastVolume', i18nLabel: 'scenario.multiplier.forecastVolume' },
  { key: 'unitPrice', i18nLabel: 'scenario.multiplier.unitPrice' },
  { key: 'coreCapacity', i18nLabel: 'scenario.multiplier.coreCapacity' },
  { key: 'buCapacity', i18nLabel: 'scenario.multiplier.buCapacity' },
];

const YEARLY_FIELDS: {
  key: keyof YearlyAssumption;
  i18nLabel: string;
}[] = [
  { key: 'forecastMultiplier', i18nLabel: 'scenario.yearly.forecastMultiplier' },
  { key: 'priceMultiplier', i18nLabel: 'scenario.yearly.priceMultiplier' },
  { key: 'coreCapacityMultiplier', i18nLabel: 'scenario.yearly.coreCapacityMultiplier' },
  { key: 'buCapacityMultiplier', i18nLabel: 'scenario.yearly.buCapacityMultiplier' },
];

function multiplierToPercent(val: number): string {
  const pct = (val - 1) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(0)}%`;
}

const ScenarioPlanningPage: React.FC<ScenarioPlanningProps> = ({ scope }) => {
  const { t } = useI18n();
  const writable = canEdit(scope.role);

  // Global multipliers (used as "apply to all years" tool)
  const [multipliers, setMultipliers] = useState<ScenarioMultipliers>(defaultMultipliers());
  const [dqDismissed, setDqDismissed] = useState(false);

  // Yearly scenario state
  const [visibleYears, setVisibleYears] = useState<string[]>([]);
  const [yearlyAssumptions, setYearlyAssumptions] = useState<Record<string, YearlyAssumption>>({});
  const [yearlyOutput, setYearlyOutput] = useState<YearlyScenarioOutput | null>(null);
  const [yearlyComputing, setYearlyComputing] = useState(false);
  const [insertYearValue, setInsertYearValue] = useState<number | null>(null);

  // Baseline data
  const [loading, setLoading] = useState(true);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [baselineDq, setBaselineDq] = useState<DataQualitySummary | null>(null);

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
        const dq = buildDataQualitySummary({
          skus: skuData,
          forecasts: fcData,
          capacityPlans: cpData,
          params: paramData,
        });
        setBaselineDq(dq);
      }

      const dataYears = extractDataYears(fcData, cpData);
      const years = buildScenarioVisibleYears(dataYears);
      setVisibleYears(years);

      const initAssumptions: Record<string, YearlyAssumption> = {};
      for (const y of years) {
        initAssumptions[y] = defaultAssumption();
      }
      setYearlyAssumptions(initAssumptions);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currencySettings = useMemo(() => {
    if (!params?.currencySettings) return DEFAULT_CURRENCY_SETTINGS;
    return normalizeCurrencySettings(params.currencySettings);
  }, [params]);

  const hasData = skus.length > 0 && forecasts.length > 0 && params !== null;

  const showDqWarning =
    baselineDq &&
    (baselineDq.confidence === 'low' || baselineDq.confidence === 'blocked') &&
    !dqDismissed;

  // --- Global multiplier handlers ---
  const handleMultiplierChange = useCallback(
    (key: keyof ScenarioMultipliers, value: number | null) => {
      if (value === null) return;
      setMultipliers((prev) => clampMultipliers({ ...prev, [key]: value }));
    },
    []
  );

  const handleSliderChange = useCallback(
    (key: keyof ScenarioMultipliers, value: number) => {
      setMultipliers((prev) => clampMultipliers({ ...prev, [key]: value }));
    },
    []
  );

  const handleApplyGlobalToAll = useCallback(() => {
    const newAssumptions: Record<string, YearlyAssumption> = {};
    for (const y of visibleYears) {
      newAssumptions[y] = {
        forecastMultiplier: multipliers.forecastVolume,
        priceMultiplier: multipliers.unitPrice,
        coreCapacityMultiplier: multipliers.coreCapacity,
        buCapacityMultiplier: multipliers.buCapacity,
      };
    }
    setYearlyAssumptions(newAssumptions);
  }, [visibleYears, multipliers]);

  // --- Yearly assumption handlers ---
  const handleYearlyChange = useCallback(
    (year: string, key: keyof YearlyAssumption, value: number | null) => {
      if (value === null) return;
      setYearlyAssumptions((prev) => ({
        ...prev,
        [year]: clampAssumption({ ...(prev[year] ?? defaultAssumption()), [key]: value }),
      }));
    },
    []
  );

  const handleResetYearly = useCallback(() => {
    const reset: Record<string, YearlyAssumption> = {};
    for (const y of visibleYears) {
      reset[y] = defaultAssumption();
    }
    setYearlyAssumptions(reset);
    setYearlyOutput(null);
  }, [visibleYears]);

  // --- Year controls ---
  const handleAddPrevYear = useCallback(() => {
    if (!writable || visibleYears.length === 0) return;
    const minYear = Math.min(...visibleYears.map(Number));
    const newYear = String(minYear - 1);
    if (newYear < '2000') return;
    setVisibleYears((prev) => [newYear, ...prev]);
    setYearlyAssumptions((prev) => ({ ...prev, [newYear]: defaultAssumption() }));
  }, [writable, visibleYears]);

  const handleAddNextYear = useCallback(() => {
    if (!writable || visibleYears.length === 0) return;
    const maxYear = Math.max(...visibleYears.map(Number));
    const newYear = String(maxYear + 1);
    if (newYear > '2100') return;
    setVisibleYears((prev) => [...prev, newYear]);
    setYearlyAssumptions((prev) => ({ ...prev, [newYear]: defaultAssumption() }));
  }, [writable, visibleYears]);

  const handleInsertYear = useCallback(() => {
    if (!writable || insertYearValue === null) return;
    const yearStr = String(insertYearValue);
    const num = parseInt(yearStr, 10);
    if (isNaN(num) || num < 2000 || num > 2100) return;
    if (visibleYears.includes(yearStr)) return;
    setVisibleYears((prev) => [...prev, yearStr].sort());
    setYearlyAssumptions((prev) => ({ ...prev, [yearStr]: defaultAssumption() }));
    setInsertYearValue(null);
  }, [writable, insertYearValue, visibleYears]);

  // --- Run yearly scenario ---
  const handleRunYearlyScenario = useCallback(async () => {
    if (!params) return;
    setYearlyComputing(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const output = runYearlyScenario(
        skus, forecasts, capacityPlans, params,
        yearlyAssumptions, visibleYears
      );
      setYearlyOutput(output);
    } finally {
      setYearlyComputing(false);
    }
  }, [skus, forecasts, capacityPlans, params, yearlyAssumptions, visibleYears]);

  // --- Quick presets ---
  const applyPreset = useCallback((preset: Partial<YearlyAssumption>) => {
    setYearlyAssumptions((prev) => {
      const next = { ...prev };
      for (const y of visibleYears) {
        next[y] = clampAssumption({ ...(next[y] ?? defaultAssumption()), ...preset });
      }
      return next;
    });
  }, [visibleYears]);

  // --- Yearly results table (always call useMemo, even if output is null) ---
  const yearlyResultColumns = useMemo(() => {
    if (!yearlyOutput || yearlyOutput.results.length === 0) return [];

    const metrics: { key: string; label: string; format: (r: YearlyResultRow) => { base: string; scen: string; delta: string; deltaColor: string | undefined } }[] = [
      {
        key: 'revenue',
        label: t('scenario.yearly.revenue'),
        format: (r) => ({
          base: formatCurrencyDisplay(r.baseline.revenueUsd, currencySettings),
          scen: formatCurrencyDisplay(r.scenario.revenueUsd, currencySettings),
          delta: r.delta.revenuePct !== null ? `${r.delta.revenuePct >= 0 ? '+' : ''}${r.delta.revenuePct.toFixed(1)}%` : '—',
          deltaColor: r.delta.revenuePct !== null ? (r.delta.revenuePct >= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
      {
        key: 'forecastPcs',
        label: t('scenario.yearly.forecastPcs'),
        format: (r) => ({
          base: formatNumber(r.baseline.forecastPcs),
          scen: formatNumber(r.scenario.forecastPcs),
          delta: r.delta.forecastPct !== null ? `${r.delta.forecastPct >= 0 ? '+' : ''}${r.delta.forecastPct.toFixed(1)}%` : '—',
          deltaColor: r.delta.forecastPct !== null ? (r.delta.forecastPct >= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
      {
        key: 'coreUtil',
        label: t('scenario.yearly.maxCoreUtil'),
        format: (r) => ({
          base: r.baseline.maxCoreUtilizationPct !== null ? `${r.baseline.maxCoreUtilizationPct.toFixed(1)}%` : '—',
          scen: r.scenario.maxCoreUtilizationPct !== null ? `${r.scenario.maxCoreUtilizationPct.toFixed(1)}%` : '—',
          delta: r.delta.coreUtilizationPp !== null ? `${r.delta.coreUtilizationPp >= 0 ? '+' : ''}${r.delta.coreUtilizationPp.toFixed(1)}pp` : '—',
          deltaColor: r.delta.coreUtilizationPp !== null ? (r.delta.coreUtilizationPp <= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
      {
        key: 'buUtil',
        label: t('scenario.yearly.maxBuUtil'),
        format: (r) => ({
          base: r.baseline.maxBuUtilizationPct !== null ? `${r.baseline.maxBuUtilizationPct.toFixed(1)}%` : '—',
          scen: r.scenario.maxBuUtilizationPct !== null ? `${r.scenario.maxBuUtilizationPct.toFixed(1)}%` : '—',
          delta: r.delta.buUtilizationPp !== null ? `${r.delta.buUtilizationPp >= 0 ? '+' : ''}${r.delta.buUtilizationPp.toFixed(1)}pp` : '—',
          deltaColor: r.delta.buUtilizationPp !== null ? (r.delta.buUtilizationPp <= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
      {
        key: 'shortage',
        label: t('scenario.yearly.shortageMonths'),
        format: (r) => ({
          base: String(r.baseline.shortageMonthCount),
          scen: String(r.scenario.shortageMonthCount),
          delta: r.delta.shortageMonthCount !== 0 ? `${r.delta.shortageMonthCount >= 0 ? '+' : ''}${r.delta.shortageMonthCount}` : '0',
          deltaColor: r.delta.shortageMonthCount <= 0 ? '#3f8600' : '#cf1322',
        }),
      },
      {
        key: 'bpAttain',
        label: t('scenario.yearly.bpAttainment'),
        format: (r) => ({
          base: r.baseline.bpAttainmentPct !== null ? `${r.baseline.bpAttainmentPct.toFixed(1)}%` : '—',
          scen: r.scenario.bpAttainmentPct !== null ? `${r.scenario.bpAttainmentPct.toFixed(1)}%` : '—',
          delta: r.delta.bpAttainmentPp !== null ? `${r.delta.bpAttainmentPp >= 0 ? '+' : ''}${r.delta.bpAttainmentPp.toFixed(1)}pp` : '—',
          deltaColor: r.delta.bpAttainmentPp !== null ? (r.delta.bpAttainmentPp >= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
      {
        key: 'bpGap',
        label: t('scenario.yearly.bpGap'),
        format: (r) => ({
          base: r.baseline.bpGapMillionTwd !== null ? `${r.baseline.bpGapMillionTwd.toFixed(1)}M` : '—',
          scen: r.scenario.bpGapMillionTwd !== null ? `${r.scenario.bpGapMillionTwd.toFixed(1)}M` : '—',
          delta: r.delta.bpGapMillionTwd !== null ? `${r.delta.bpGapMillionTwd >= 0 ? '+' : ''}${r.delta.bpGapMillionTwd.toFixed(1)}M` : '—',
          deltaColor: r.delta.bpGapMillionTwd !== null ? (r.delta.bpGapMillionTwd <= 0 ? '#3f8600' : '#cf1322') : undefined,
        }),
      },
    ];

    return [
      {
        title: t('scenario.yearly.metric'),
        dataIndex: 'label',
        key: 'label',
        fixed: 'left' as const,
        width: 160,
        render: (text: string) => <Text strong style={{ fontSize: 12 }}>{text}</Text>,
      },
      ...yearlyOutput.results.flatMap((r) => [
        {
          title: `${r.year} ${t('scenario.baseline')}`,
          dataIndex: `base_${r.year}`,
          key: `base_${r.year}`,
          width: 110,
          align: 'right' as const,
          render: (_: unknown, _record: unknown, idx: number) => {
            const m = metrics[idx];
            return m ? <Text style={{ fontSize: 12 }}>{m.format(r).base}</Text> : null;
          },
        },
        {
          title: `${r.year} ${t('scenario.current')}`,
          dataIndex: `scen_${r.year}`,
          key: `scen_${r.year}`,
          width: 110,
          align: 'right' as const,
          render: (_: unknown, _record: unknown, idx: number) => {
            const m = metrics[idx];
            return m ? <Text style={{ fontSize: 12 }}>{m.format(r).scen}</Text> : null;
          },
        },
        {
          title: `${r.year} Δ`,
          dataIndex: `delta_${r.year}`,
          key: `delta_${r.year}`,
          width: 100,
          align: 'right' as const,
          render: (_: unknown, _record: unknown, idx: number) => {
            const m = metrics[idx];
            if (!m) return null;
            const d = m.format(r);
            return <Text style={{ fontSize: 12, color: d.deltaColor, fontWeight: 600 }}>{d.delta}</Text>;
          },
        },
      ]),
    ];
  }, [yearlyOutput, t, currencySettings]);

  const yearlyTableData = useMemo(() => {
    if (!yearlyOutput) return [];
    return [
      { key: 'revenue', label: t('scenario.yearly.revenue') },
      { key: 'forecastPcs', label: t('scenario.yearly.forecastPcs') },
      { key: 'coreUtil', label: t('scenario.yearly.maxCoreUtil') },
      { key: 'buUtil', label: t('scenario.yearly.maxBuUtil') },
      { key: 'shortage', label: t('scenario.yearly.shortageMonths') },
      { key: 'bpAttain', label: t('scenario.yearly.bpAttainment') },
      { key: 'bpGap', label: t('scenario.yearly.bpGap') },
    ];
  }, [yearlyOutput, t]);

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="twk-page">
      {/* Page Header */}
      <div className="twk-page-header">
        <h2 className="twk-page-title">{t('scenario.title')}</h2>
        <p className="twk-page-subtitle">{t('scenario.description')}</p>
      </div>

      {/* Info banner */}
      <div className="twk-alert twk-alert--info" style={{ marginBottom: 16 }}>
        <InfoCircleOutlined />
        <span>{t('scenario.infoBanner')}</span>
      </div>

      {/* Viewer guard */}
      {!writable && (
        <div className="twk-alert twk-alert--info" style={{ marginBottom: 16 }}>
          <InfoCircleOutlined />
          <span>{t('scenario.viewerReadOnly')}</span>
        </div>
      )}

      {/* DQ caveat */}
      {showDqWarning && (
        <div className="twk-alert twk-alert--warning" style={{ marginBottom: 16 }}>
          <WarningOutlined />
          <span>{t('scenario.yearly.dqWarning')}</span>
          <Button type="text" size="small" onClick={() => setDqDismissed(true)} style={{ marginLeft: 'auto' }}>✕</Button>
        </div>
      )}

      {/* No data guard */}
      {!hasData && (
        <div className="twk-alert twk-alert--warning" style={{ marginBottom: 16 }}>
          <WarningOutlined />
          <span>{t('scenario.noData')}</span>
        </div>
      )}

      {/* ============================================
          SECTION 1: Yearly Assumptions Table
          ============================================ */}
      {hasData && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title">
              <ExperimentOutlined /> {t('scenario.yearly.title')}
            </span>
            <Space>
              <Button size="small" icon={<MinusOutlined />} onClick={handleAddPrevYear} disabled={!writable}>
                {t('scenario.yearly.addPreviousYear')}
              </Button>
              <Button size="small" icon={<PlusOutlined />} onClick={handleAddNextYear} disabled={!writable}>
                {t('scenario.yearly.addNextYear')}
              </Button>
              <Space size={4}>
                <InputNumber
                  size="small"
                  min={2000}
                  max={2100}
                  precision={0}
                  value={insertYearValue}
                  onChange={(v) => setInsertYearValue(v)}
                  placeholder={t('scenario.yearly.insertYearPlaceholder')}
                  style={{ width: 120 }}
                />
                <Button size="small" onClick={handleInsertYear} disabled={insertYearValue === null || !writable}>
                  {t('scenario.yearly.insertYear')}
                </Button>
              </Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={handleResetYearly} disabled={!writable}>
                {t('scenario.yearly.resetAll')}
              </Button>
            </Space>
          </div>
          <div className="twk-card-body">
            <p style={{ color: '#6b6b6b', fontSize: 12, marginBottom: 12 }}>
              {t('scenario.yearly.subtitle')}
            </p>

            {/* Quick presets */}
            <Space wrap style={{ marginBottom: 12 }}>
              <Button size="small" disabled={!writable} onClick={() => applyPreset({ forecastMultiplier: 1.1 })}>
                {t('scenario.yearly.forecastUp')} +10%
              </Button>
              <Button size="small" disabled={!writable} onClick={() => applyPreset({ priceMultiplier: 1.05 })}>
                {t('scenario.yearly.priceUp')} +5%
              </Button>
              <Button size="small" disabled={!writable} onClick={() => applyPreset({ coreCapacityMultiplier: 0.9, buCapacityMultiplier: 0.9 })}>
                {t('scenario.yearly.capacityDelay')} -10%
              </Button>
              <Button size="small" disabled={!writable} onClick={() => applyPreset({ coreCapacityMultiplier: 1.1, buCapacityMultiplier: 1.1 })}>
                {t('scenario.yearly.capacityBoost')} +10%
              </Button>
              <Button size="small" disabled={!writable} onClick={() => applyPreset({ forecastMultiplier: 0.85 })}>
                {t('scenario.yearly.demandDown')} -15%
              </Button>
            </Space>

            {/* Yearly assumptions table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--twk-border)', fontWeight: 600, minWidth: 160, position: 'sticky', left: 0, background: 'var(--twk-card)', zIndex: 1 }}>
                      {t('scenario.yearly.metric')}
                    </th>
                    {visibleYears.map((year) => (
                      <th key={year} style={{ textAlign: 'center', padding: '8px 8px', borderBottom: '2px solid var(--twk-border)', fontWeight: 600, minWidth: 100 }}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {YEARLY_FIELDS.map(({ key, i18nLabel }) => (
                    <tr key={key}>
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--twk-border)', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--twk-card)', zIndex: 1 }}>
                        {t(i18nLabel)}
                      </td>
                      {visibleYears.map((year) => {
                        const val = yearlyAssumptions[year]?.[key] ?? 1.0;
                        return (
                          <td key={year} style={{ padding: '6px 8px', borderBottom: '1px solid var(--twk-border)', textAlign: 'center' }}>
                            <InputNumber
                              min={0}
                              max={3}
                              step={0.01}
                              value={val}
                              onChange={(v) => handleYearlyChange(year, key, v)}
                              disabled={!writable}
                              size="small"
                              style={{ width: 80 }}
                              addonAfter={<span style={{ fontSize: 10, color: '#999' }}>{multiplierToPercent(val)}</span>}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Divider />

            <Button
              type="primary"
              icon={<RocketOutlined />}
              onClick={handleRunYearlyScenario}
              loading={yearlyComputing}
              disabled={!writable || !hasData}
              size="large"
            >
              {yearlyComputing ? t('scenario.yearly.computing') : t('scenario.yearly.runScenario')}
            </Button>
          </div>
        </div>
      )}

      {/* ============================================
          SECTION 2: Global Multipliers (Quick Apply)
          ============================================ */}
      {hasData && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title">
              <ThunderboltOutlined /> {t('scenario.yearly.globalMultiplier')}
            </span>
            <Button
              size="small"
              onClick={handleApplyGlobalToAll}
              disabled={!writable}
              type="primary"
              ghost
            >
              {t('scenario.yearly.applyGlobal')}
            </Button>
          </div>
          <div className="twk-card-body">
            <Row gutter={[24, 16]}>
              {MULTIPLIER_FIELDS.map(({ key, i18nLabel }) => (
                <Col xs={24} sm={12} key={key}>
                  <div style={{ marginBottom: 4 }}>
                    <Text strong>{t(i18nLabel)}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      {multipliers[key].toFixed(2)} ({multiplierToPercent(multipliers[key])})
                    </Text>
                  </div>
                  <Row gutter={8} align="middle">
                    <Col flex="auto">
                      <Slider
                        min={0.5}
                        max={2.0}
                        step={0.01}
                        value={multipliers[key]}
                        onChange={(v) => handleSliderChange(key, v)}
                        disabled={!writable}
                      />
                    </Col>
                    <Col>
                      <InputNumber
                        min={0.5}
                        max={2.0}
                        step={0.01}
                        value={multipliers[key]}
                        onChange={(v) => handleMultiplierChange(key, v)}
                        disabled={!writable}
                        style={{ width: 72 }}
                      />
                    </Col>
                  </Row>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      )}

      {/* ============================================
          SECTION 3: Yearly Results Table
          ============================================ */}
      {yearlyOutput && yearlyOutput.results.length > 0 && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title">
              <ExperimentOutlined /> {t('scenario.yearly.resultsTitle')}
            </span>
          </div>
          <div className="twk-card-body" style={{ overflowX: 'auto' }}>
            <Table
              columns={yearlyResultColumns}
              dataSource={yearlyTableData}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
              bordered
            />
          </div>
        </div>
      )}

      {/* ============================================
          SECTION 4: Cross-Year Summary
          ============================================ */}
      {yearlyOutput && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title">{t('scenario.yearly.summaryTitle')}</span>
          </div>
          <div className="twk-card-body">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <MetricCard
                  title={t('scenario.yearly.maxRevenueBoostYear')}
                  value={yearlyOutput.summary.maxRevenueBoostYear ?? '—'}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <MetricCard
                  title={t('scenario.yearly.maxBpGapYear')}
                  value={yearlyOutput.summary.maxBpGapYear ?? '—'}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <MetricCard
                  title={t('scenario.yearly.maxCoreBottleneckYear')}
                  value={yearlyOutput.summary.maxCoreBottleneckYear ?? '—'}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <MetricCard
                  title={t('scenario.yearly.maxBuBottleneckYear')}
                  value={yearlyOutput.summary.maxBuBottleneckYear ?? '—'}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <MetricCard
                  title={t('scenario.yearly.totalShortageChange')}
                  value={yearlyOutput.summary.totalShortageChange !== 0
                    ? `${yearlyOutput.summary.totalShortageChange >= 0 ? '+' : ''}${yearlyOutput.summary.totalShortageChange}`
                    : '0'}
                  suffix="months"
                />
              </Col>
            </Row>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenarioPlanningPage;
