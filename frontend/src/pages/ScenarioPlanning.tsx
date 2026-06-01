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
} from 'antd';
import {
  ExperimentOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
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
  computeScenarioComparison,
  type ScenarioMultipliers,
  type ScenarioComparison,
} from '../core/scenarioEngine';
import {
  formatNumber,
  formatPercent,
  formatCurrencyDisplay,
} from '../core/formatters';
import MetricCard from '../components/common/MetricCard';
import { DEFAULT_CURRENCY_SETTINGS, normalizeCurrencySettings } from '../core/currency';

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

function formatDeltaPercent(pct: number | null): string {
  if (pct === null) return '';
  const sign = pct >= 0 ? '+' : '';
  return `(${sign}${pct.toFixed(1)}%)`;
}

const ScenarioPlanningPage: React.FC<ScenarioPlanningProps> = ({ scope }) => {
  const { t } = useI18n();
  const writable = canEdit(scope.role);

  // Scenario mode state
  const [scenarioActive, setScenarioActive] = useState(false);
  const [multipliers, setMultipliers] = useState<ScenarioMultipliers>(defaultMultipliers());
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [computing, setComputing] = useState(false);
  const [dqDismissed, setDqDismissed] = useState(false);

  // Baseline data (loaded from Firestore)
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

  // --- Handlers ---

  const handleEnterMode = useCallback(() => {
    setScenarioActive(true);
    setComparison(null);
    setMultipliers(defaultMultipliers());
    setDqDismissed(false);
  }, []);

  const handleExitMode = useCallback(() => {
    setScenarioActive(false);
    setComparison(null);
    setMultipliers(defaultMultipliers());
  }, []);

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

  const handleResetAll = useCallback(() => {
    setMultipliers(defaultMultipliers());
  }, []);

  const handleRunScenario = useCallback(async () => {
    if (!params) return;
    const dq = baselineDq ?? buildDataQualitySummary({
      skus,
      forecasts,
      capacityPlans,
      params,
    });

    setComputing(true);
    try {
      // Yield to the browser so the spinner renders before heavy computation
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      const result = computeScenarioComparison(
        skus,
        forecasts,
        capacityPlans,
        params,
        multipliers,
        dq
      );
      setComparison(result);
    } finally {
      setComputing(false);
    }
  }, [skus, forecasts, capacityPlans, params, multipliers, baselineDq]);

  // --- Render helpers ---

  const renderMultiplierPercent = (key: keyof ScenarioMultipliers) => {
    const val = multipliers[key];
    const pct = (val - 1) * 100;
    const sign = pct >= 0 ? '+' : '';
    return `${val.toFixed(2)} (${sign}${pct.toFixed(0)}%)`;
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="db-page">
      {/* Page Header — Designbyte */}
      <div className="db-page-header">
        <h2 className="db-page-title">{t('scenario.title')}</h2>
        <p className="db-page-subtitle">{t('scenario.description')}</p>
      </div>

      {/* Info banner — Designbyte Alert */}
      <div className="db-alert db-alert--info" style={{ marginBottom: 16 }}>
        <InfoCircleOutlined />
        <span>{t('scenario.infoBanner')}</span>
      </div>

      {/* Viewer guard — Designbyte Alert */}
      {!writable && (
        <div className="db-alert db-alert--info" style={{ marginBottom: 16 }}>
          <InfoCircleOutlined />
          <span>{t('scenario.viewerReadOnly')}</span>
        </div>
      )}

      {/* DQ caveat — Designbyte Alert */}
      {showDqWarning && (
        <div className="db-alert db-alert--warning" style={{ marginBottom: 16 }}>
          <WarningOutlined />
          <span>{t('scenario.dqWarning')}</span>
          <Button
            type="text"
            size="small"
            onClick={() => setDqDismissed(true)}
            style={{ marginLeft: 'auto' }}
          >
            ✕
          </Button>
        </div>
      )}

      {/* No data guard — Designbyte Alert */}
      {!hasData && (
        <div className="db-alert db-alert--warning" style={{ marginBottom: 16 }}>
          <WarningOutlined />
          <span>{t('scenario.noData')}</span>
        </div>
      )}

      {/* Action bar — Designbyte Toolbar */}
      <div className="db-toolbar" style={{ marginBottom: 16 }}>
        <div className="db-toolbar-group">
          {!scenarioActive ? (
            <Button
              type="primary"
              icon={<ExperimentOutlined />}
              onClick={handleEnterMode}
              disabled={!writable || !hasData}
            >
              {t('scenario.enterMode')}
            </Button>
          ) : (
            <Button
              danger
              onClick={handleExitMode}
            >
              {t('scenario.exitMode')}
            </Button>
          )}
        </div>
      </div>

      {/* Multiplier panel — Designbyte Card */}
      {scenarioActive && (
        <div className="db-card" style={{ marginBottom: 16 }}>
          <div className="db-card-header">
            <span className="db-card-title">
              <ExperimentOutlined /> {t('scenario.title')}
            </span>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleResetAll}
              disabled={!writable}
              size="small"
            >
              {t('scenario.resetAll')}
            </Button>
          </div>
          <div className="db-card-body">
          <Row gutter={[24, 16]}>
            {MULTIPLIER_FIELDS.map(({ key, i18nLabel }) => (
              <Col xs={24} sm={12} key={key}>
                <div style={{ marginBottom: 4 }}>
                  <Text strong>{t(i18nLabel)}</Text>
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {renderMultiplierPercent(key)}
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

          <Divider />

          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={handleRunScenario}
            loading={computing}
            disabled={!writable}
            size="large"
          >
            {computing ? t('scenario.computing') : t('scenario.runScenario')}
          </Button>
        </div>
      </div>
      )}

      {/* Comparison dashboard — Designbyte Card */}
      {comparison && (
        <div className="db-card" style={{ marginBottom: 16 }}>
          <div className="db-card-header">
            <span className="db-card-title">{t('scenario.comparison.title')}</span>
          </div>
          <div className="db-card-body">
          <Row gutter={[16, 16]}>
            {/* Total Revenue */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.totalRevenue')}
                value={formatCurrencyDisplay(
                  comparison.deltas.totalRevenueUsd.scenario,
                  currencySettings
                )}
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {formatCurrencyDisplay(
                        comparison.deltas.totalRevenueUsd.base,
                        currencySettings
                      )}
                    </div>
                    <div>
                      {t('scenario.delta.totalRevenue')}:{' '}
                      <span
                        style={{
                          color:
                            comparison.deltas.totalRevenueUsd.delta !== null &&
                            comparison.deltas.totalRevenueUsd.delta >= 0
                              ? '#3f8600'
                              : '#cf1322',
                        }}
                      >
                        {formatCurrencyDisplay(
                          comparison.deltas.totalRevenueUsd.delta,
                          currencySettings,
                          { showSign: true }
                        )}{' '}
                        {formatDeltaPercent(
                          comparison.deltas.totalRevenueUsd.deltaPercent
                        )}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* Total Forecast PCS */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.totalForecastPcs')}
                value={formatNumber(
                  comparison.deltas.totalForecastPcs.scenario
                )}
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {formatNumber(
                        comparison.deltas.totalForecastPcs.base
                      )}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.totalForecastPcs.delta !== null &&
                            comparison.deltas.totalForecastPcs.delta >= 0
                              ? '#3f8600'
                              : '#cf1322',
                        }}
                      >
                        {comparison.deltas.totalForecastPcs.delta !== null
                          ? (comparison.deltas.totalForecastPcs.delta >= 0
                              ? '+'
                              : '') +
                            formatNumber(
                              comparison.deltas.totalForecastPcs.delta
                            )
                          : '—'}{' '}
                        {formatDeltaPercent(
                          comparison.deltas.totalForecastPcs.deltaPercent
                        )}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* Max Core Utilization */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.maxCoreUtil')}
                value={
                  comparison.deltas.maxCoreUtilization.scenario !== null
                    ? formatPercent(
                        comparison.deltas.maxCoreUtilization.scenario / 100
                      )
                    : '—'
                }
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {comparison.deltas.maxCoreUtilization.base !== null
                        ? formatPercent(
                            comparison.deltas.maxCoreUtilization.base / 100
                          )
                        : '—'}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.maxCoreUtilization.delta !== null
                              ? comparison.deltas.maxCoreUtilization.delta <= 0
                                ? '#3f8600'
                                : '#cf1322'
                              : '#666',
                        }}
                      >
                        {comparison.deltas.maxCoreUtilization.delta !== null
                          ? (comparison.deltas.maxCoreUtilization.delta >= 0
                              ? '+'
                              : '') +
                            formatPercent(
                              comparison.deltas.maxCoreUtilization.delta / 100,
                              { inputIsPercent: true }
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* Max BU Utilization */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.maxBuUtil')}
                value={
                  comparison.deltas.maxBuUtilization.scenario !== null
                    ? formatPercent(
                        comparison.deltas.maxBuUtilization.scenario / 100
                      )
                    : '—'
                }
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {comparison.deltas.maxBuUtilization.base !== null
                        ? formatPercent(
                            comparison.deltas.maxBuUtilization.base / 100
                          )
                        : '—'}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.maxBuUtilization.delta !== null
                              ? comparison.deltas.maxBuUtilization.delta <= 0
                                ? '#3f8600'
                                : '#cf1322'
                              : '#666',
                        }}
                      >
                        {comparison.deltas.maxBuUtilization.delta !== null
                          ? (comparison.deltas.maxBuUtilization.delta >= 0
                              ? '+'
                              : '') +
                            formatPercent(
                              comparison.deltas.maxBuUtilization.delta / 100,
                              { inputIsPercent: true }
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* Shortage Months */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.shortageMonths')}
                value={
                  comparison.deltas.shortageMonthCount.scenario !== null
                    ? comparison.deltas.shortageMonthCount.scenario
                    : '—'
                }
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {comparison.deltas.shortageMonthCount.base !== null
                        ? comparison.deltas.shortageMonthCount.base
                        : '—'}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.shortageMonthCount.delta !== null
                              ? comparison.deltas.shortageMonthCount.delta <= 0
                                ? '#3f8600'
                                : '#cf1322'
                              : '#666',
                        }}
                      >
                        {comparison.deltas.shortageMonthCount.delta !== null
                          ? (comparison.deltas.shortageMonthCount.delta >= 0
                              ? '+'
                              : '') +
                            comparison.deltas.shortageMonthCount.delta
                          : '—'}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* BP Attainment */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.bpAttainment')}
                value={
                  comparison.deltas.bpAttainmentPct.scenario !== null
                    ? formatPercent(
                        comparison.deltas.bpAttainmentPct.scenario / 100,
                        { inputIsPercent: true }
                      )
                    : '—'
                }
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {comparison.deltas.bpAttainmentPct.base !== null
                        ? formatPercent(
                            comparison.deltas.bpAttainmentPct.base / 100,
                            { inputIsPercent: true }
                          )
                        : '—'}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.bpAttainmentPct.delta !== null
                              ? comparison.deltas.bpAttainmentPct.delta >= 0
                                ? '#3f8600'
                                : '#cf1322'
                              : '#666',
                        }}
                      >
                        {comparison.deltas.bpAttainmentPct.delta !== null
                          ? (comparison.deltas.bpAttainmentPct.delta >= 0
                              ? '+'
                              : '') +
                            formatPercent(
                              comparison.deltas.bpAttainmentPct.delta / 100,
                              { inputIsPercent: true }
                            )
                          : '—'}
                      </span>
                    </div>
                  </div>
                }
              />
            </Col>

            {/* BP Gap */}
            <Col xs={24} sm={12} md={8} lg={6}>
              <MetricCard
                title={t('scenario.delta.bpGap')}
                value={
                  comparison.deltas.bpGapMillionTwd.scenario !== null
                    ? comparison.deltas.bpGapMillionTwd.scenario.toFixed(1)
                    : '—'
                }
                suffix={
                  comparison.deltas.bpGapMillionTwd.scenario !== null
                    ? 'M TWD'
                    : undefined
                }
                extra={
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    <div>
                      {t('scenario.baseline')}:{' '}
                      {comparison.deltas.bpGapMillionTwd.base !== null
                        ? comparison.deltas.bpGapMillionTwd.base.toFixed(1) +
                          ' M TWD'
                        : '—'}
                    </div>
                    <div>
                      <span
                        style={{
                          color:
                            comparison.deltas.bpGapMillionTwd.delta !== null
                              ? comparison.deltas.bpGapMillionTwd.delta <= 0
                                ? '#3f8600'
                                : '#cf1322'
                              : '#666',
                        }}
                      >
                        {comparison.deltas.bpGapMillionTwd.delta !== null
                          ? (comparison.deltas.bpGapMillionTwd.delta >= 0
                              ? '+'
                              : '') +
                            comparison.deltas.bpGapMillionTwd.delta.toFixed(1) +
                            ' M TWD'
                          : '—'}
                      </span>
                    </div>
                  </div>
                }
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
