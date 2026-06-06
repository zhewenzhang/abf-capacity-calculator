import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Table, Typography, Tag, Button, Space, Collapse, Segmented, theme } from 'antd';
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  InboxOutlined,
  BarChartOutlined,
  CloudOutlined,
  DollarOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  RightOutlined,
  RobotOutlined,
  CalendarOutlined,
  SettingOutlined,
  AlertOutlined,
  FileTextOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import {
  buildWorkbenchViewModel,
  type WorkbenchViewModel,
  type WorkflowStageStatus,
} from '../core/workbench';
import { buildDataQualitySummary, type DataQualitySummary } from '../core/dataQuality';
import { buildAnalyticsModel, type AnalyticsModel } from '../core/analytics';
import { buildBpAnalysis, type BpAnalysisModel } from '../core/bpTargets';
import { normalizeCurrencySettings } from '../core/currency';
import {
  runOperationalScenario,
  type OperationalScenarioResult,
} from '../core/operationalScenario';
import {
  buildManagementReport,
  exportReportToMarkdown,
  exportReportToJson,
  type ManagementReport,
} from '../core/managementReport';
import { PageLoading } from '../components/common';
import EmptyState from '../components/common/EmptyState';
import { canEdit } from '../services/projectScope';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import PageShell from '../components/layout/PageShell';
import { convertFromUsd, DEFAULT_CURRENCY_SETTINGS, type CurrencySettings } from '../core/currency';
import { formatAttainment, formatBpAmount } from '../core/bpTargets';
import { formatPlainMoney, formatDelta } from '../core/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import type { ProjectScope, SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

const { Text } = Typography;

// ============================================================
// Props
// ============================================================

interface DailyOperationsWorkbenchProps {
  scope: ProjectScope;
}

// ============================================================
// Stage icon mapping
// ============================================================

const STAGE_ICONS: Record<string, React.ReactNode> = {
  products: <InboxOutlined />,
  forecasts: <BarChartOutlined />,
  capacity: <CloudOutlined />,
  parameters: <SettingOutlined />,
  bpTargets: <DollarOutlined />,
  analysis: <CalculatorOutlined />,
  scenario: <ExperimentOutlined />,
};

// ============================================================
// Status icon and color helpers
// ============================================================

function statusIcon(status: WorkflowStageStatus): React.ReactNode {
  switch (status) {
    case 'ready':
      return <CheckCircleOutlined style={{ color: '#15803d' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#f59e0b' }} />;
    case 'blocked':
      return <CloseCircleOutlined style={{ color: '#dc2626' }} />;
    case 'notStarted':
      return <InfoCircleOutlined style={{ color: '#a3a3a3' }} />;
  }
}

function statusColor(status: WorkflowStageStatus): string {
  switch (status) {
    case 'ready':
      return 'green';
    case 'warning':
      return 'orange';
    case 'blocked':
      return 'red';
    case 'notStarted':
      return 'default';
  }
}

function statusLabelKey(status: WorkflowStageStatus): string {
  switch (status) {
    case 'ready':
      return 'workbench.status.ready';
    case 'warning':
      return 'workbench.status.warning';
    case 'blocked':
      return 'workbench.status.blocked';
    case 'notStarted':
      return 'workbench.status.notStarted';
  }
}

// ============================================================
// Main Component
// ============================================================

const DailyOperationsWorkbench: React.FC<DailyOperationsWorkbenchProps> = ({ scope }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const { prefs } = useAppPrefs();
  const writable = canEdit(scope.role);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vm, setVm] = useState<WorkbenchViewModel | null>(null);

  // v1.43-v1.45: new state for integrated modules
  const [rawData, setRawData] = useState<{
    skus: SKU[];
    forecasts: Forecast[];
    capacityPlans: CapacityPlan[];
    params: ProjectParameters;
  } | null>(null);
  const [dqSummary, setDqSummary] = useState<DataQualitySummary | null>(null);
  const [analyticsModel, setAnalyticsModel] = useState<AnalyticsModel | null>(null);
  const [bpModel, setBpModel] = useState<BpAnalysisModel | null>(null);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});
  const [managementReport, setManagementReport] = useState<ManagementReport | null>(null);
  const [reportPreview, setReportPreview] = useState<string>('');
  const [scenarioV2Loading, setScenarioV2Loading] = useState<string | null>(null);
  const [scenarioV2Result, setScenarioV2Result] = useState<OperationalScenarioResult | null>(null);
  const [bpSelectedYear, setBpSelectedYear] = useState<string>('2026');
  const [driverTab, setDriverTab] = useState<string>('customer');
  const [driverYear, setDriverYear] = useState<string>('2027');
  const [showRiskDetails, setShowRiskDetails] = useState(false);

  // ---- File download helper ----
  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // ---- Data loading ----
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [skus, forecasts, capacityPlans, paramsData] = await Promise.all([
        getSKUs(scope),
        getForecasts(scope),
        getCapacityPlans(scope),
        getParameters(scope),
      ]);

      // Store raw data for scenario v2 computations
      setRawData({ skus, forecasts, capacityPlans, params: paramsData });

      const viewModel = buildWorkbenchViewModel({
        skus,
        forecasts,
        capacityPlans,
        params: paramsData,
      });
      setVm(viewModel);

      // Build DQ summary for abnormality intelligence and report
      const dq = buildDataQualitySummary({
        skus,
        forecasts,
        capacityPlans,
        params: paramsData,
      });
      setDqSummary(dq);

      // Build analytics model and BP model for management report
      const analytics = buildAnalyticsModel(skus, forecasts, capacityPlans, paramsData);
      setAnalyticsModel(analytics);

      const cs = normalizeCurrencySettings(paramsData.currencySettings);
      setCurrencySettings({ ...cs, displayCurrency: prefs.displayCurrency });

      const bpTargetsData = paramsData.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {};
      setBpTargets({ ...bpTargetsData });

      const bp = buildBpAnalysis(
        analytics.skuResults,
        skus,
        analytics.monthlySummaries,
        bpTargetsData,
        cs,
      );
      setBpModel(bp);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load workbench data';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scope]);

  // ---- All derived values (must be before early returns for hooks rules) ----
  const hasData = useMemo(() => {
    if (!vm) return false;
    return vm.stages.some(s => s.status !== 'notStarted');
  }, [vm]);

  // ---- Generate management report ----
  const handleGenerateReport = useCallback((reportType: 'daily' | 'weekly') => {
    if (!writable) return;
    if (!vm || !dqSummary || !analyticsModel) return;

    const report = buildManagementReport({
      workbench: vm,
      dqSummary,
      analyticsModel,
      bpModel,
      reportType,
    });
    setManagementReport(report);
    setReportPreview(exportReportToMarkdown(report));
  }, [writable, vm, dqSummary, analyticsModel, bpModel]);

  // ---- Export report ----
  const handleExportMarkdown = useCallback(() => {
    if (!writable) return;
    if (!managementReport) return;
    const md = exportReportToMarkdown(managementReport);
    downloadFile(md, `management-report-${managementReport.period}.md`, 'text/markdown');
  }, [writable, managementReport, downloadFile]);

  const handleExportJson = useCallback(() => {
    if (!writable) return;
    if (!managementReport) return;
    const json = exportReportToJson(managementReport);
    downloadFile(json, `management-report-${managementReport.period}.json`, 'application/json');
  }, [writable, managementReport, downloadFile]);

  // ---- Run scenario v2 ----
  const handleRunScenarioV2 = useCallback((scenarioType: 'capacityDelay' | 'orderDisappearance' | 'forecastAdjustment') => {
    if (!writable) return;
    if (!rawData) return;
    setScenarioV2Loading(scenarioType);
    setScenarioV2Result(null);

    // Compute in next tick to allow loading state to render
    setTimeout(() => {
      try {
        let result: OperationalScenarioResult;
        if (scenarioType === 'capacityDelay') {
          result = runOperationalScenario({
            scenarioType: 'capacityDelay',
            skus: rawData.skus,
            forecasts: rawData.forecasts,
            capacityPlans: rawData.capacityPlans,
            params: rawData.params,
            capacityShiftMonths: 3,
            capacityShiftTarget: 'both',
          });
        } else if (scenarioType === 'orderDisappearance') {
          // Find top customer by SKU count
          const customerCounts = new Map<string, number>();
          for (const sku of rawData.skus) {
            customerCounts.set(sku.customer, (customerCounts.get(sku.customer) ?? 0) + 1);
          }
          const topCustomer = [...customerCounts.entries()]
            .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';

          result = runOperationalScenario({
            scenarioType: 'orderDisappearance',
            skus: rawData.skus,
            forecasts: rawData.forecasts,
            capacityPlans: rawData.capacityPlans,
            params: rawData.params,
            orderFilter: { customer: topCustomer },
          });
        } else {
          result = runOperationalScenario({
            scenarioType: 'forecastAdjustment',
            skus: rawData.skus,
            forecasts: rawData.forecasts,
            capacityPlans: rawData.capacityPlans,
            params: rawData.params,
            forecastAdjustPercent: 20,
          });
        }
        setScenarioV2Result(result);
      } catch {
        // Scenario computation failed silently
      } finally {
        setScenarioV2Loading(null);
      }
    }, 0);
  }, [writable, rawData]);

  // ---- Loading state ----
  if (loading) {
    return <PageLoading />;
  }

  // ---- Error state ----
  if (error) {
    return (
      <PageShell variant="wide">
        <Card>
          <Text type="danger">{error}</Text>
        </Card>
      </PageShell>
    );
  }

  // ---- Empty state ----
  if (!vm || !hasData) {
    return (
      <PageShell variant="wide">
        <EmptyState
          title={t('workbench.title')}
          description={t('workbench.subtitle')}
        />
      </PageShell>
    );
  }

  // ---- Risk classification helper ----
  type RiskLevel = 'safe' | 'watch' | 'risk' | 'overload';

  interface RiskClassification {
    level: RiskLevel;
    bottleneck: 'core' | 'bu' | 'none';
    maxUtilization: number;
  }

  function classifyRisk(coreUtil: number | null, buUtil: number | null, hasShortage: boolean): RiskClassification {
    const core = coreUtil !== null ? coreUtil * 100 : 0;
    const bu = buUtil !== null ? buUtil * 100 : 0;
    const maxUtil = Math.max(core, bu);

    let level: RiskLevel;
    if (hasShortage || maxUtil >= 100) {
      level = 'overload';
    } else if (maxUtil >= 90) {
      level = 'risk';
    } else if (maxUtil >= 80) {
      level = 'watch';
    } else {
      level = 'safe';
    }

    let bottleneck: 'core' | 'bu' | 'none';
    if (bu >= core && bu >= 80) {
      bottleneck = 'bu';
    } else if (core > bu && core >= 80) {
      bottleneck = 'core';
    } else {
      bottleneck = 'none';
    }

    return { level, bottleneck, maxUtilization: maxUtil };
  }

  function getRiskColor(level: RiskLevel): string {
    switch (level) {
      case 'safe': return '#52c41a';
      case 'watch': return '#faad14';
      case 'risk': return '#fa8c16';
      case 'overload': return '#ff4d4f';
    }
  }

  function getRiskLabel(level: RiskLevel): string {
    return t(`workbench.riskRadar.level.${level}`);
  }

  // ---- Look-ahead detail columns (for collapsed table) ----
  const lookAheadColumns = [
    {
      title: t('workbench.lookahead.month'),
      dataIndex: 'month',
      key: 'month',
      width: 100,
    },
    {
      title: t('workbench.lookahead.coreUtil'),
      dataIndex: 'coreUtilization',
      key: 'coreUtilization',
      width: 100,
      align: 'right' as const,
      render: (val: number | null) => {
        if (val === null) return '-';
        const pct = (val * 100).toFixed(1);
        const color = val > 1.0 ? token.colorError : val > 0.85 ? token.colorWarning : token.colorSuccess;
        return <Text style={{ color }}>{pct}%</Text>;
      },
    },
    {
      title: t('workbench.lookahead.buUtil'),
      dataIndex: 'buUtilization',
      key: 'buUtilization',
      width: 100,
      align: 'right' as const,
      render: (val: number | null) => {
        if (val === null) return '-';
        const pct = (val * 100).toFixed(1);
        const color = val > 1.0 ? token.colorError : val > 0.85 ? token.colorWarning : token.colorSuccess;
        return <Text style={{ color }}>{pct}%</Text>;
      },
    },
    {
      title: t('workbench.lookahead.bottleneck'),
      dataIndex: 'bottleneck',
      key: 'bottleneck',
      width: 100,
      render: (val: string) => {
        if (val === 'None') return <Text type="secondary">-</Text>;
        return <Tag color={val === 'Core' ? 'orange' : 'red'}>{val}</Tag>;
      },
    },
    {
      title: t('workbench.lookahead.shortage'),
      dataIndex: 'hasShortage',
      key: 'hasShortage',
      width: 80,
      render: (val: boolean) =>
        val ? <Tag color="red">Yes</Tag> : <Text type="secondary">-</Text>,
    },
  ];

  // ---- Render ----
  return (
    <PageShell variant="wide">
      {/* Viewer read-only warning — Designbyte Alert */}
      {!writable && (
        <div className="twk-alert twk-alert--info" style={{ marginBottom: 16 }}>
          <InfoCircleOutlined />
          <span>{t('common.viewerReadOnly')}</span>
        </div>
      )}

      {/* SECTION 1: Workflow Stage Stepper — Designbyte db-card */}
      <div className="twk-card" style={{ marginBottom: 16 }}>
        <div className="twk-card-header">
          <span className="twk-card-title"><CalendarOutlined /> Pipeline Readiness</span>
        </div>
        <div className="twk-card-body">
          <div className="twk-readiness-grid">
            {vm.stages.map((stage) => (
              <div
                className="twk-readiness-card"
                key={stage.id}
                style={{
                  borderColor: statusColor(stage.status) === 'default' ? undefined :
                    statusColor(stage.status) === 'green' ? 'var(--twk-success)' :
                    statusColor(stage.status) === 'orange' ? 'var(--twk-warning)' : 'var(--twk-error)',
                  cursor: stage.cta ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (stage.cta && stage.status !== 'ready') {
                    navigate(stage.cta);
                  }
                }}
              >
                <div className="twk-readiness-card-top">
                  <Space size={8}>
                    {STAGE_ICONS[stage.id] || <InfoCircleOutlined />}
                    {statusIcon(stage.status)}
                  </Space>
                  <Tag color={statusColor(stage.status)} style={{ fontSize: 11 }}>
                    {t(statusLabelKey(stage.status))}
                  </Tag>
                </div>
                <div className="twk-readiness-title">{t(stage.label)}</div>
                <div className="twk-readiness-footer">
                  {stage.cta && stage.status !== 'ready' ? (
                    <Button
                      type="link"
                      size="small"
                      style={{ padding: 0, fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (stage.cta) navigate(stage.cta);
                      }}
                    >
                      {stage.status === 'blocked' || stage.status === 'notStarted'
                        ? t('workbench.cta.fix')
                        : t('workbench.cta.view')}{' '}
                      <RightOutlined />
                    </Button>
                  ) : (
                    <span />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 1B: Executive KPI Strip — from Dashboard consolidation */}
      {analyticsModel && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title"><DollarOutlined /> {t('dashboard.executiveKpi') || 'Executive KPIs'}</span>
          </div>
          <div className="twk-card-body">
            <Row gutter={[12, 12]}>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dashboard.totalRevenue')}</Text>
                  <Text strong style={{ fontSize: 18 }}>
                    {formatPlainMoney(convertFromUsd(analyticsModel.totalRevenue, 'TWD', currencySettings), 'TWD')}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dashboard.maxCoreUtil')}</Text>
                  <Text strong style={{ fontSize: 18, color: (analyticsModel.maxCoreUtil === null || (analyticsModel.maxCoreUtil ?? 0) > 1) ? token.colorError : token.colorSuccess }}>
                    {analyticsModel.maxCoreUtil === null ? '—' : `${((analyticsModel.maxCoreUtil ?? 0) * 100).toFixed(1)}%`}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dashboard.maxBuUtil') || 'Max BU Util'}</Text>
                  <Text strong style={{ fontSize: 18, color: (analyticsModel.maxBuUtil === null || (analyticsModel.maxBuUtil ?? 0) > 1) ? token.colorError : token.colorSuccess }}>
                    {analyticsModel.maxBuUtil === null ? '—' : `${((analyticsModel.maxBuUtil ?? 0) * 100).toFixed(1)}%`}
                  </Text>
                </div>
              </Col>
              <Col xs={12} sm={8} md={4}>
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dashboard.shortageMonths')}</Text>
                  <Text strong style={{ fontSize: 18, color: (analyticsModel.shortageMonthCount ?? 0) > 0 ? token.colorError : token.colorSuccess }}>
                    {analyticsModel.shortageMonthCount ?? 0}
                  </Text>
                </div>
              </Col>
              {bpModel && bpModel.yearly.length > 0 && (() => {
                const firstTarget = bpModel.yearly.find(r => r.status !== 'no-target');
                return firstTarget ? (
                  <Col xs={12} sm={8} md={4}>
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                      <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('bp.kpi.overallAttainment')}</Text>
                      <Text strong style={{ fontSize: 18, color: (firstTarget.attainment ?? 0) >= 1 ? token.colorSuccess : (firstTarget.attainment ?? 0) >= 0.8 ? token.colorWarning : token.colorError }}>
                        {firstTarget.attainment !== null ? `${(firstTarget.attainment * 100).toFixed(1)}%` : '—'}
                      </Text>
                    </div>
                  </Col>
                ) : null;
              })()}
              {dqSummary && (
                <Col xs={12} sm={8} md={4}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{t('dashboard.dataConfidence')}</Text>
                    <Tag color={dqSummary.confidence === 'high' ? 'green' : dqSummary.confidence === 'medium' ? 'orange' : 'red'} style={{ fontSize: 14, padding: '2px 12px' }}>
                      {dqSummary.confidence.toUpperCase()}
                    </Tag>
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </div>
      )}

      {/* SECTION 1C: Revenue & BP Analysis — migrated from Dashboard */}
      {analyticsModel && Object.keys(bpTargets).length > 0 && bpModel && (() => {
        // Get available BP years
        const bpYears = bpModel.yearly.filter(r => r.status !== 'no-target').map(r => r.period);
        const currentYear = bpSelectedYear || bpYears[0] || '2026';

        // Current year KPI
        const currentYearRecord = bpModel.yearly.find(r => r.period === currentYear);
        const currentYearTarget = currentYearRecord?.targetMillionTwd ?? null;
        const currentYearForecast = currentYearRecord?.forecastMillionTwd ?? null;
        const currentYearAttainment = currentYearRecord?.attainment ?? null;
        const currentYearGap = currentYearRecord?.gapMillionTwd ?? null;

        // Chart data: only BP year range
        const chartMonths = analyticsModel.monthlyRevenue.filter(r => {
          const year = r.month.substring(0, 4);
          return bpYears.includes(year);
        });

        return (
          <div className="twk-card" style={{ marginBottom: 16 }}>
            <div className="twk-card-header">
              <span className="twk-card-title"><DollarOutlined /> {t('bp.attainmentTitle')}</span>
            </div>
            <div className="twk-card-body">
              {/* Year Selector */}
              <div style={{ marginBottom: 12 }}>
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t('bp.selectYear')}:</Text>
                  <Segmented
                    size="small"
                    value={currentYear}
                    onChange={v => setBpSelectedYear(v as string)}
                    options={bpYears.map(y => ({ label: y, value: y }))}
                  />
                </Space>
              </div>

              {/* BP KPI Cards — Current Year */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{currentYear} {t('bp.kpi.target')}</Text>
                    <Text strong style={{ fontSize: 18 }}>{formatPlainMoney(currentYearTarget, 'TWD', { alreadyMillions: true })}</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{currentYear} {t('bp.kpi.forecast')}</Text>
                    <Text strong style={{ fontSize: 18 }}>{formatPlainMoney(currentYearForecast, 'TWD', { alreadyMillions: true })}</Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{currentYear} {t('bp.kpi.attainment')}</Text>
                    <Text strong style={{ fontSize: 18, color: (currentYearAttainment ?? 0) >= 1 ? token.colorSuccess : (currentYearAttainment ?? 0) >= 0.8 ? token.colorWarning : token.colorError }}>
                      {currentYearAttainment !== null ? formatAttainment(currentYearAttainment) : '—'}
                    </Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{currentYear} {t('bp.kpi.gap')}</Text>
                    <Text strong style={{ fontSize: 18, color: (currentYearGap ?? 0) >= 0 ? token.colorSuccess : token.colorError }}>
                      {formatDelta(currentYearGap, { suffix: ' M NTD' })}
                    </Text>
                  </div>
                </Col>
              </Row>

              {/* BP Attainment Table */}
              <div style={{ overflowX: 'auto', marginBottom: 16 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600, position: 'sticky', left: 0, background: '#fff' }}>{t('scenario.annualMatrix.metric')}</th>
                      {bpModel.yearly.filter(r => r.status !== 'no-target').map(r => (
                        <th key={r.period} style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600, background: r.period === currentYear ? '#f0f9ff' : undefined }}>{r.period}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500, position: 'sticky', left: 0, background: '#fff' }}>{t('bp.target')}</td>
                      {bpModel.yearly.filter(r => r.status !== 'no-target').map(r => (
                        <td key={r.period} style={{ textAlign: 'right', padding: '6px 8px', background: r.period === currentYear ? '#f0f9ff' : undefined }}>{formatBpAmount(r.targetMillionTwd)}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500, position: 'sticky', left: 0, background: '#fff' }}>{t('bp.forecast')}</td>
                      {bpModel.yearly.filter(r => r.status !== 'no-target').map(r => (
                        <td key={r.period} style={{ textAlign: 'right', padding: '6px 8px', background: r.period === currentYear ? '#f0f9ff' : undefined }}>{formatBpAmount(r.forecastMillionTwd)}</td>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500, position: 'sticky', left: 0, background: '#fff' }}>{t('bp.attainment')}</td>
                      {bpModel.yearly.filter(r => r.status !== 'no-target').map(r => (
                        <td key={r.period} style={{ textAlign: 'right', padding: '6px 8px', background: r.period === currentYear ? '#f0f9ff' : undefined }}>
                          {r.attainment !== null ? <Tag color={r.attainment >= 1 ? 'green' : r.attainment >= 0.8 ? 'orange' : 'red'}>{formatAttainment(r.attainment)}</Tag> : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 500, position: 'sticky', left: 0, background: '#fff' }}>{t('bp.gap')}</td>
                      {bpModel.yearly.filter(r => r.status !== 'no-target').map(r => (
                        <td key={r.period} style={{ textAlign: 'right', padding: '6px 8px', background: r.period === currentYear ? '#f0f9ff' : undefined }}>
                          {r.gapMillionTwd !== null ? <Text type={r.gapMillionTwd >= 0 ? 'success' : 'danger'}>{formatDelta(r.gapMillionTwd, { suffix: ' M NTD' })}</Text> : '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Revenue Trend Chart with BP Monthly Target Line */}
              {chartMonths.length > 0 && (() => {
                // Chart color constants
                const REVENUE_BP_CHART_COLORS = {
                  forecastRevenue: '#10b981', // emerald green
                  monthlyBpTarget: '#f59e0b', // amber orange
                  grid: '#e5e7eb',
                  axis: '#94a3b8',
                };

                // Build chart data with semantic keys
                const chartData: Array<{
                  month: string;
                  year: number;
                  monthNumber: number;
                  forecastRevenueMillionNtd: number;
                  monthlyBpTargetMillionNtd: number;
                  gapMillionNtd: number;
                  attainment: number;
                }> = [];

                for (const r of chartMonths) {
                  const year = parseInt(r.month.substring(0, 4), 10);
                  const monthNum = parseInt(r.month.substring(5, 7), 10);
                  const revenueTwd = convertFromUsd(r.revenue, 'TWD', currencySettings, String(year));
                  const yearlyTarget = bpTargets[String(year)] ?? 0;
                  const monthlyTarget = yearlyTarget / 12;
                  const revenueM = revenueTwd / 1e6;
                  const gap = revenueM - monthlyTarget;
                  const attainment = monthlyTarget > 0 ? (revenueM / monthlyTarget * 100) : 0;

                  chartData.push({
                    month: r.month,
                    year,
                    monthNumber: monthNum,
                    forecastRevenueMillionNtd: revenueM,
                    monthlyBpTargetMillionNtd: monthlyTarget,
                    gapMillionNtd: gap,
                    attainment,
                  });
                }

                // X-axis formatter
                const formatRevenueBpMonthTick = (v: string): string => {
                  const month = parseInt(v.substring(5, 7), 10);
                  const year = v.substring(0, 4);
                  if (month === 1) return `${year}年1月`;
                  if (month === 4 || month === 7 || month === 10) return `${month}月`;
                  return '';
                };

                // Y-axis formatter
                const formatRevenueBpYAxisTick = (v: number): string => {
                  return `${v.toLocaleString()} M`;
                };

                // Custom tooltip
                const CustomTooltip = ({ active, payload }: any) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0]?.payload;
                  if (!data) return null;

                  const year = data.year;
                  const monthNum = data.monthNumber;
                  const revVal = data.forecastRevenueMillionNtd;
                  const targetVal = data.monthlyBpTargetMillionNtd;
                  const gapVal = data.gapMillionNtd;
                  const attVal = data.attainment;

                  return (
                    <div style={{
                      background: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: '10px 14px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>{year}年{monthNum}月</div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: REVENUE_BP_CHART_COLORS.monthlyBpTarget, marginRight: 6 }} />
                        <span>{t('dashboard.monthlyBpTarget')}：{targetVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} M NTD</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: REVENUE_BP_CHART_COLORS.forecastRevenue, marginRight: 6 }} />
                        <span>{t('dashboard.forecastRevenue')}：{revVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} M NTD</span>
                      </div>
                      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 4, marginTop: 4 }}>
                        <div>{t('bp.gap')}：{gapVal >= 0 ? '+' : ''}{gapVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} M NTD</div>
                        <div>{t('bp.attainment')}：{attVal.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                };

                // Custom label for last point
                const CustomLabel = ({ x, y, value, index }: any) => {
                  const lastIdx = chartData.length - 1;
                  if (index === lastIdx && value !== undefined) {
                    return (
                      <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fill="#666">
                        {Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} M
                      </text>
                    );
                  }
                  return null;
                };

                return (
                  <div>
                    <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{t('dashboard.revenueTrendTitle')}</Text>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={REVENUE_BP_CHART_COLORS.grid} />
                        <XAxis
                          dataKey="month"
                          tickFormatter={formatRevenueBpMonthTick}
                          tick={{ fontSize: 11, fill: REVENUE_BP_CHART_COLORS.axis }}
                          interval={0}
                        />
                        <YAxis
                          tickFormatter={formatRevenueBpYAxisTick}
                          tick={{ fontSize: 11, fill: REVENUE_BP_CHART_COLORS.axis }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                          formatter={(value: string) => {
                            if (value === 'monthlyBpTargetMillionNtd') return t('dashboard.monthlyBpTarget');
                            if (value === 'forecastRevenueMillionNtd') return t('dashboard.forecastRevenue');
                            return value;
                          }}
                          wrapperStyle={{ fontSize: 11 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="monthlyBpTargetMillionNtd"
                          name="monthlyBpTargetMillionNtd"
                          stroke={REVENUE_BP_CHART_COLORS.monthlyBpTarget}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: REVENUE_BP_CHART_COLORS.monthlyBpTarget }}
                          label={<CustomLabel />}
                        />
                        <Line
                          type="monotone"
                          dataKey="forecastRevenueMillionNtd"
                          name="forecastRevenueMillionNtd"
                          stroke={REVENUE_BP_CHART_COLORS.forecastRevenue}
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 5, fill: REVENUE_BP_CHART_COLORS.forecastRevenue }}
                          label={<CustomLabel />}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                      {t('dashboard.chartNote')}
                    </Text>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* SECTION 1D: Capacity Analysis — migrated from Dashboard */}
      {analyticsModel && analyticsModel.monthlyUtilization.length > 0 && (() => {
        // Utilization chart color constants
        const UTILIZATION_CHART_COLORS = {
          core: '#2563eb',      // blue
          bu: '#7c3aed',        // violet
          warning: '#f59e0b',   // amber, 90%
          critical: '#ef4444',  // red, 100%
          grid: '#e5e7eb',
          axis: '#94a3b8',
        };

        // Build chart data with semantic keys
        const utilChartData: Array<{
          month: string;
          year: number;
          monthNumber: number;
          coreUtilization: number | null;
          buUtilization: number | null;
        }> = [];

        // Filter to only include months with data (not empty future months)
        const bpYearSet = new Set(Object.keys(bpTargets));
        for (const u of analyticsModel.monthlyUtilization) {
          const year = parseInt(u.month.substring(0, 4), 10);
          const monthNum = parseInt(u.month.substring(5, 7), 10);
          // Include if has data or is within BP year range
          const hasData = (u.coreUtil !== null && u.coreUtil > 0) || (u.buUtil !== null && u.buUtil > 0);
          const inBpRange = bpYearSet.has(String(year));
          if (hasData || inBpRange) {
            utilChartData.push({
              month: u.month,
              year,
              monthNumber: monthNum,
              coreUtilization: u.coreUtil !== null ? u.coreUtil * 100 : null,
              buUtilization: u.buUtil !== null ? u.buUtil * 100 : null,
            });
          }
        }

        // X-axis formatter
        const formatUtilMonthTick = (v: string): string => {
          const month = parseInt(v.substring(5, 7), 10);
          const year = v.substring(0, 4);
          if (month === 1) return `${year}年1月`;
          if (month === 4 || month === 7 || month === 10) return `${month}月`;
          return '';
        };

        // Y-axis formatter
        const formatUtilYAxisTick = (v: number): string => {
          return `${v}%`;
        };

        // Custom tooltip
        const UtilizationTooltip = ({ active, payload }: any) => {
          if (!active || !payload || payload.length === 0) return null;
          const data = payload[0]?.payload;
          if (!data) return null;

          const year = data.year;
          const monthNum = data.monthNumber;
          const coreVal = data.coreUtilization;
          const buVal = data.buUtilization;

          // Determine risk status
          let statusText = '';
          let statusColor = '';
          if (buVal !== null && buVal >= 100) {
            statusText = t('dashboard.utilOverloaded');
            statusColor = UTILIZATION_CHART_COLORS.critical;
          } else if (coreVal !== null && coreVal >= 100) {
            statusText = t('dashboard.utilOverloaded');
            statusColor = UTILIZATION_CHART_COLORS.critical;
          } else if (buVal !== null && buVal >= 90) {
            statusText = t('dashboard.utilWarning');
            statusColor = UTILIZATION_CHART_COLORS.warning;
          } else if (coreVal !== null && coreVal >= 90) {
            statusText = t('dashboard.utilWarning');
            statusColor = UTILIZATION_CHART_COLORS.warning;
          }

          return (
            <div style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '10px 14px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{year}年{monthNum}月</div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: UTILIZATION_CHART_COLORS.core, marginRight: 6 }} />
                <span>{t('results.coreUtil')}：{coreVal !== null ? `${coreVal.toFixed(1)}%` : '-'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: UTILIZATION_CHART_COLORS.bu, marginRight: 6 }} />
                <span>{t('results.buUtil')}：{buVal !== null ? `${buVal.toFixed(1)}%` : '-'}</span>
              </div>
              {statusText && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 4, marginTop: 4, color: statusColor, fontWeight: 600 }}>
                  {statusText}
                </div>
              )}
            </div>
          );
        };

        // Find max values for labels
        const maxCore = Math.max(...utilChartData.map(d => d.coreUtilization ?? 0));
        const maxBu = Math.max(...utilChartData.map(d => d.buUtilization ?? 0));
        const maxCoreIdx = utilChartData.findIndex(d => d.coreUtilization === maxCore);
        const maxBuIdx = utilChartData.findIndex(d => d.buUtilization === maxBu);
        const lastIdx = utilChartData.length - 1;

        // Custom label for key points
        const UtilCustomLabel = ({ x, y, value, index, dataKey }: any) => {
          if (value === null || value === undefined) return null;
          const isMaxPoint = (dataKey === 'coreUtilization' && index === maxCoreIdx) ||
                             (dataKey === 'buUtilization' && index === maxBuIdx);
          const isLastPoint = index === lastIdx;
          if (isMaxPoint || isLastPoint) {
            return (
              <text x={x} y={y - 10} textAnchor="middle" fontSize={10} fill="#666">
                {Number(value).toFixed(1)}%
              </text>
            );
          }
          return null;
        };

        return (
          <div className="twk-card" style={{ marginBottom: 16 }}>
            <div className="twk-card-header">
              <span className="twk-card-title"><CloudOutlined /> {t('dashboard.utilTrendTitle')}</span>
            </div>
            <div className="twk-card-body">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={utilChartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={UTILIZATION_CHART_COLORS.grid} />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatUtilMonthTick}
                    tick={{ fontSize: 11, fill: UTILIZATION_CHART_COLORS.axis }}
                    interval={0}
                  />
                  <YAxis
                    tickFormatter={formatUtilYAxisTick}
                    tick={{ fontSize: 11, fill: UTILIZATION_CHART_COLORS.axis }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<UtilizationTooltip />} />
                  <Legend
                    formatter={(value: string) => {
                      if (value === 'coreUtilization') return t('results.coreUtil');
                      if (value === 'buUtilization') return t('results.buUtil');
                      return value;
                    }}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <ReferenceLine y={90} stroke={UTILIZATION_CHART_COLORS.warning} strokeDasharray="5 5" label={{ value: '90%', position: 'right', fontSize: 10, fill: UTILIZATION_CHART_COLORS.warning }} />
                  <ReferenceLine y={100} stroke={UTILIZATION_CHART_COLORS.critical} strokeDasharray="5 5" label={{ value: '100%', position: 'right', fontSize: 10, fill: UTILIZATION_CHART_COLORS.critical }} />
                  <Line
                    type="monotone"
                    dataKey="coreUtilization"
                    name="coreUtilization"
                    stroke={UTILIZATION_CHART_COLORS.core}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: UTILIZATION_CHART_COLORS.core }}
                    connectNulls={false}
                    label={<UtilCustomLabel />}
                  />
                  <Line
                    type="monotone"
                    dataKey="buUtilization"
                    name="buUtilization"
                    stroke={UTILIZATION_CHART_COLORS.bu}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: UTILIZATION_CHART_COLORS.bu }}
                    connectNulls={false}
                    label={<UtilCustomLabel />}
                  />
                </LineChart>
              </ResponsiveContainer>
              <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                {t('dashboard.utilChartNote')}
              </Text>
            </div>
          </div>
        );
      })()}

      {/* SECTION 1E: Operational Drivers — v1.57 redesign */}
      {analyticsModel && (() => {
        // Driver analysis helper functions
        const DRIVER_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

        // Get available years from yearlyHealth
        const availableYears = analyticsModel.yearlyHealth.map(y => y.year);

        // Ensure driverYear is valid
        const selectedYear = availableYears.includes(driverYear) ? driverYear : availableYears[availableYears.length - 1] || '2026';
        const prevYear = String(parseInt(selectedYear, 10) - 1);

        // Customer revenue data for selected year
        const customerData = analyticsModel.revenueByCustomer.map(row => {
          const currentVal = row.values[selectedYear] ?? 0;
          const prevVal = row.values[prevYear] ?? 0;
          const totalRevenue = analyticsModel.revenueByCustomer.reduce((s, r) => s + (r.values[selectedYear] ?? 0), 0);
          const share = totalRevenue > 0 ? (currentVal / totalRevenue * 100) : 0;
          const change = currentVal - prevVal;
          const yoy = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : (currentVal > 0 ? null : 0);
          return { label: row.label, current: currentVal, prev: prevVal, share, change, yoy };
        }).sort((a, b) => b.current - a.current);

        // Core demand by size for selected year
        const sizeData = analyticsModel.coreDemandBySize.map(row => {
          const currentVal = row.values[selectedYear] ?? 0;
          const prevVal = row.values[prevYear] ?? 0;
          const totalDemand = analyticsModel.coreDemandBySize.reduce((s, r) => s + (r.values[selectedYear] ?? 0), 0);
          const share = totalDemand > 0 ? (currentVal / totalDemand * 100) : 0;
          const change = currentVal - prevVal;
          const yoy = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : (currentVal > 0 ? null : 0);
          return { label: row.label, current: currentVal, prev: prevVal, share, change, yoy };
        }).sort((a, b) => b.current - a.current);

        // Application revenue data for selected year
        const appData = analyticsModel.revenueByApplication.map(row => {
          const currentVal = row.values[selectedYear] ?? 0;
          const prevVal = row.values[prevYear] ?? 0;
          const totalRevenue = analyticsModel.revenueByApplication.reduce((s, r) => s + (r.values[selectedYear] ?? 0), 0);
          const share = totalRevenue > 0 ? (currentVal / totalRevenue * 100) : 0;
          const change = currentVal - prevVal;
          const yoy = prevVal > 0 ? ((currentVal - prevVal) / prevVal * 100) : (currentVal > 0 ? null : 0);
          return { label: row.label, current: currentVal, prev: prevVal, share, change, yoy };
        }).sort((a, b) => b.current - a.current);

        // Get current tab data
        const getCurrentData = () => {
          switch (driverTab) {
            case 'customer': return customerData;
            case 'coreSize': return sizeData;
            case 'application': return appData;
            default: return customerData;
          }
        };

        const currentData = getCurrentData();
        const topItem = currentData[0];
        const fastestGrowth = currentData.filter(d => d.yoy !== null && d.yoy > 0).sort((a, b) => (b.yoy ?? 0) - (a.yoy ?? 0))[0];
        const top3Share = currentData.slice(0, 3).reduce((s, d) => s + d.share, 0);

        // Format value based on tab
        const formatDriverValue = (val: number) => {
          if (driverTab === 'coreSize') return val.toLocaleString();
          const valTwd = convertFromUsd(val, 'TWD', currencySettings);
          return formatPlainMoney(valTwd, 'TWD', { alreadyMillions: false });
        };

        // Chart data for horizontal bar
        const chartData = currentData.slice(0, 8).map((d, i) => ({
          label: d.label,
          value: d.current,
          color: DRIVER_COLORS[i % DRIVER_COLORS.length],
        }));

        return (
          <div className="twk-card" style={{ marginBottom: 16 }}>
            <div className="twk-card-header">
              <Space>
                <BarChartOutlined />
                <span className="twk-card-title">{t('dashboard.drivers.title')}</span>
              </Space>
              <Space>
                <Text type="secondary" style={{ fontSize: 11 }}>{t('dashboard.drivers.selectYear')}:</Text>
                <Segmented
                  size="small"
                  value={selectedYear}
                  onChange={v => setDriverYear(v as string)}
                  options={availableYears.map(y => ({ label: y, value: y }))}
                />
              </Space>
            </div>
            <div className="twk-card-body">
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
                {t('dashboard.drivers.subtitle')}
              </Text>

              {/* Tabs */}
              <Segmented
                value={driverTab}
                onChange={v => setDriverTab(v as string)}
                options={[
                  { label: t('dashboard.drivers.customer'), value: 'customer' },
                  { label: t('dashboard.drivers.coreSize'), value: 'coreSize' },
                  { label: t('dashboard.drivers.application'), value: 'application' },
                ]}
                style={{ marginBottom: 16 }}
              />

              {/* Insight Strip */}
              <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={8}>
                  <div style={{ padding: '10px 12px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{t('dashboard.drivers.topContributor')}</Text>
                    <Text strong style={{ fontSize: 14 }}>{topItem?.label ?? '-'}</Text>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {topItem ? `${formatDriverValue(topItem.current)} · ${topItem.share.toFixed(1)}%` : '-'}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ padding: '10px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{t('dashboard.drivers.fastestGrowth')}</Text>
                    <Text strong style={{ fontSize: 14 }}>{fastestGrowth?.label ?? '-'}</Text>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {fastestGrowth?.yoy !== null && fastestGrowth?.yoy !== undefined
                        ? `+${fastestGrowth.yoy.toFixed(1)}% YoY`
                        : '-'}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ padding: '10px 12px', background: top3Share > 70 ? '#fef3c7' : '#f5f5f5', borderRadius: 8, border: top3Share > 70 ? '1px solid #fcd34d' : '1px solid #e5e7eb' }}>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{t('dashboard.drivers.concentration')}</Text>
                    <Text strong style={{ fontSize: 14 }}>{top3Share.toFixed(1)}%</Text>
                    <div style={{ fontSize: 11, color: top3Share > 70 ? '#b45309' : '#6b7280' }}>
                      {t('dashboard.drivers.top3Share')}
                      {top3Share > 70 && ` · ${t('dashboard.drivers.concentrationWarning')}`}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Chart */}
              <div style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tickFormatter={(v: number) => driverTab === 'coreSize' ? v.toLocaleString() : `${(v / 1e6).toFixed(0)}M`} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => [
                        driverTab === 'coreSize'
                          ? `${Number(value).toLocaleString()} pcs`
                          : `${(Number(value) / 1e6).toFixed(1)} M NTD`,
                        t('dashboard.drivers.revenue'),
                      ]}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 4 }}>
                  {t('dashboard.drivers.chartNote')}
                </Text>
              </div>

              {/* Compact Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 600 }}>{driverTab === 'customer' ? t('dashboard.drivers.customer') : driverTab === 'coreSize' ? t('dashboard.drivers.coreSize') : t('dashboard.drivers.application')}</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>{selectedYear}</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>{prevYear}</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>{t('dashboard.drivers.change')}</th>
                      <th style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 600 }}>{t('dashboard.drivers.share')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentData.slice(0, 10).map((row, idx) => {
                      const currentTwd = driverTab === 'coreSize' ? row.current : convertFromUsd(row.current, 'TWD', currencySettings);
                      const prevTwd = driverTab === 'coreSize' ? row.prev : convertFromUsd(row.prev, 'TWD', currencySettings);
                      const changeTwd = driverTab === 'coreSize' ? row.change : convertFromUsd(row.change, 'TWD', currencySettings);
                      return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 500 }}>{row.label}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{driverTab === 'coreSize' ? currentTwd.toLocaleString() : formatPlainMoney(currentTwd, 'TWD', { alreadyMillions: false })}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{driverTab === 'coreSize' ? prevTwd.toLocaleString() : formatPlainMoney(prevTwd, 'TWD', { alreadyMillions: false })}</td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                          {row.yoy === null ? (
                            <Tag color="blue">{t('dashboard.drivers.new')}</Tag>
                          ) : (
                            <Text style={{ color: row.change >= 0 ? '#059669' : '#dc2626', fontSize: 12 }}>
                              {row.change >= 0 ? '+' : ''}{driverTab === 'coreSize' ? changeTwd.toLocaleString() : formatPlainMoney(changeTwd, 'TWD', { alreadyMillions: false })}
                            </Text>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', padding: '6px 8px' }}>{row.share.toFixed(1)}%</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION 3: Risk Radar — v1.57.2 redesign */}
      {(() => {
        if (vm.lookAhead.length === 0) {
          return (
            <div className="twk-card" style={{ marginBottom: 16 }}>
              <div className="twk-card-header">
                <span className="twk-card-title"><BarChartOutlined /> {t('workbench.riskRadar.title')}</span>
              </div>
              <div className="twk-card-body">
                <div className="twk-empty" style={{ padding: '24px 0' }}>
                  <CheckCircleOutlined className="twk-empty-icon" style={{ color: 'var(--twk-success)' }} />
                  <div className="twk-empty-title">{t('workbench.riskRadar.noRisk')}</div>
                </div>
              </div>
            </div>
          );
        }

        // Take first 6 months
        const next6 = vm.lookAhead.slice(0, 6);

        // Classify each month
        const classified = next6.map(item => ({
          ...item,
          risk: classifyRisk(item.coreUtilization, item.buUtilization, item.hasShortage),
        }));

        // Find highest risk month
        const riskOrder: Record<RiskLevel, number> = { overload: 4, risk: 3, watch: 2, safe: 1 };
        const highestRiskIdx = classified.reduce((maxIdx, item, idx) => {
          return riskOrder[item.risk.level] > riskOrder[classified[maxIdx].risk.level] ? idx : maxIdx;
        }, 0);

        // Summary stats
        const shortageCount = classified.filter(c => c.hasShortage).length;
        const maxUtil = Math.max(...classified.map(c => c.risk.maxUtilization));
        const bottleneckCounts = { core: 0, bu: 0, none: 0 };
        classified.forEach(c => { bottleneckCounts[c.risk.bottleneck]++; });
        const primaryBottleneck = bottleneckCounts.bu >= bottleneckCounts.core ? 'BU' : 'Core';

        // Top 3 risk months (sorted by: shortage first, then max util desc)
        const top3 = [...classified]
          .sort((a, b) => {
            if (a.hasShortage !== b.hasShortage) return a.hasShortage ? -1 : 1;
            if (riskOrder[a.risk.level] !== riskOrder[b.risk.level]) return riskOrder[b.risk.level] - riskOrder[a.risk.level];
            return b.risk.maxUtilization - a.risk.maxUtilization;
          })
          .slice(0, 3);

        // Build conclusion text
        const hasRisk = shortageCount > 0 || classified.some(c => c.risk.level !== 'safe');
        const riskMonths = top3.map(c => c.month).join(', ');
        const conclusion = hasRisk
          ? t('workbench.riskRadar.conclusion.hasRisk', {
              shortageCount,
              bottleneck: primaryBottleneck,
              maxUtil: maxUtil.toFixed(1),
              riskMonths,
            })
          : t('workbench.riskRadar.conclusion.safe');

        return (
          <div className="twk-card" style={{ marginBottom: 16 }}>
            <div className="twk-card-header">
              <span className="twk-card-title"><BarChartOutlined /> {t('workbench.riskRadar.title')}</span>
            </div>
            <div className="twk-card-body">
              {/* A. One-line risk conclusion */}
              <div style={{ marginBottom: 16, padding: '10px 14px', background: hasRisk ? '#fff7e6' : '#f6ffed', borderRadius: 8, border: hasRisk ? '1px solid #ffd591' : '1px solid #b7eb8f' }}>
                <Text style={{ fontSize: 13 }}>{conclusion}</Text>
              </div>

              {/* B. Risk timeline */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {classified.map((item, idx) => {
                    const isHighest = idx === highestRiskIdx;
                    return (
                      <div
                        key={item.month}
                        style={{
                          flex: '0 0 auto',
                          minWidth: 100,
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: `2px solid ${getRiskColor(item.risk.level)}`,
                          background: isHighest ? `${getRiskColor(item.risk.level)}10` : '#fff',
                          position: 'relative',
                        }}
                      >
                        {isHighest && (
                          <div style={{ position: 'absolute', top: -8, right: 4, background: getRiskColor(item.risk.level), color: '#fff', fontSize: 9, padding: '1px 6px', borderRadius: 4 }}>
                            {t('workbench.riskRadar.highestRisk')}
                          </div>
                        )}
                        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>{item.month}</div>
                        <div style={{ fontSize: 11, color: getRiskColor(item.risk.level), fontWeight: 600 }}>
                          {getRiskLabel(item.risk.level)}
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                          {item.risk.bottleneck === 'bu' ? 'BU' : item.risk.bottleneck === 'core' ? 'Core' : '-'} · {item.risk.maxUtilization.toFixed(1)}%
                        </div>
                        {item.hasShortage && (
                          <div style={{ fontSize: 10, color: '#ff4d4f', marginTop: 2 }}>● {t('workbench.riskRadar.shortage')}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* C. Top 3 risk month cards */}
              {hasRisk && (
                <div style={{ marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{t('workbench.riskRadar.top3Title')}</Text>
                  <Row gutter={[8, 8]}>
                    {top3.map((item) => (
                      <Col xs={24} sm={8} key={item.month}>
                        <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${getRiskColor(item.risk.level)}`, background: '#fff' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 13 }}>{item.month}</Text>
                            <Tag color={getRiskColor(item.risk.level)} style={{ margin: 0, fontSize: 10 }}>{getRiskLabel(item.risk.level)}</Tag>
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                            {item.risk.bottleneck === 'bu' ? t('workbench.riskRadar.buBottleneck') : item.risk.bottleneck === 'core' ? t('workbench.riskRadar.coreBottleneck') : t('workbench.riskRadar.noBottleneck')}
                          </div>
                          <div style={{ fontSize: 11, marginBottom: 4 }}>
                            {t('workbench.lookahead.coreUtil')}: {item.coreUtilization !== null ? `${(item.coreUtilization * 100).toFixed(1)}%` : '-'} · {t('workbench.lookahead.buUtil')}: {item.buUtilization !== null ? `${(item.buUtilization * 100).toFixed(1)}%` : '-'}
                          </div>
                          {item.hasShortage && (
                            <div style={{ fontSize: 11, color: '#ff4d4f', marginBottom: 4 }}>{t('workbench.riskRadar.shortage')}</div>
                          )}
                          <Space size={4} style={{ marginTop: 4 }}>
                            <Button size="small" type="link" style={{ padding: 0, fontSize: 11 }} onClick={() => navigate('/capacity')}>
                              {t('workbench.riskRadar.viewCapacity')}
                            </Button>
                            <Button size="small" type="link" style={{ padding: 0, fontSize: 11 }} onClick={() => navigate('/scenario')}>
                              {t('workbench.riskRadar.runScenario')}
                            </Button>
                          </Space>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              )}

              {/* D. Collapsible detail table */}
              <div>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, fontSize: 11 }}
                  onClick={() => setShowRiskDetails(!showRiskDetails)}
                >
                  {showRiskDetails ? t('workbench.riskRadar.hideDetails') : t('workbench.riskRadar.viewDetails')}
                </Button>
                {showRiskDetails && (
                  <div style={{ marginTop: 8 }}>
                    <Table
                      columns={lookAheadColumns}
                      dataSource={vm.lookAhead.map((item, idx) => ({ ...item, key: idx }))}
                      size="small"
                      pagination={false}
                      scroll={{ x: 480 }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION 5B: Scenario v2 Shortcuts (v1.44) — Designbyte db-card */}
      <div className="twk-card" style={{ marginBottom: 16 }}>
        <div className="twk-card-header">
          <span className="twk-card-title"><ThunderboltOutlined /> {t('workbench.scenario.v2.title')}</span>
        </div>
        <div className="twk-card-body">
        <Space wrap>
          <Button
            icon={<ExperimentOutlined />}
            loading={scenarioV2Loading === 'capacityDelay'}
            disabled={!rawData || !writable}
            onClick={() => handleRunScenarioV2('capacityDelay')}
          >
            {t('workbench.scenario.v2.buCapacityDelay')}
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            loading={scenarioV2Loading === 'orderDisappearance'}
            disabled={!rawData || !writable}
            onClick={() => handleRunScenarioV2('orderDisappearance')}
          >
            {t('workbench.scenario.v2.topCustomerDown')}
          </Button>
          <Button
            icon={<ExperimentOutlined />}
            loading={scenarioV2Loading === 'forecastAdjustment'}
            disabled={!rawData || !writable}
            onClick={() => handleRunScenarioV2('forecastAdjustment')}
          >
            {t('workbench.scenario.v2.forecastSurge')}
          </Button>
        </Space>

        {/* Scenario v2 Result Preview */}
        {scenarioV2Result && (
          <div style={{ marginTop: 12 }}>
            <Card size="small" style={{ background: token.colorBgTextHover }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <Text strong style={{ fontSize: 12 }}>{scenarioV2Result.description}</Text>
                <Space wrap size={16}>
                  {scenarioV2Result.comparison.deltas.totalRevenueUsd.delta !== null && (
                    <Text style={{ fontSize: 12 }}>
                      Revenue: <Text strong style={{
                        color: scenarioV2Result.comparison.deltas.totalRevenueUsd.delta >= 0
                          ? token.colorSuccess : token.colorError,
                      }}>
                        {formatDelta(convertFromUsd(scenarioV2Result.comparison.deltas.totalRevenueUsd.delta, 'TWD', currencySettings), { suffix: ' M NTD' })}
                      </Text>
                    </Text>
                  )}
                  {scenarioV2Result.comparison.deltas.shortageMonthCount.delta !== null && (
                    <Text style={{ fontSize: 12 }}>
                      Shortage months: <Text strong>{scenarioV2Result.comparison.deltas.shortageMonthCount.delta}</Text>
                    </Text>
                  )}
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {scenarioV2Result.caveats[0]}
                  </Text>
                </Space>
              </Space>
            </Card>
          </div>
        )}
        </div>
      </div>

      {/* SECTION 5C: Management Report (v1.45) — Designbyte db-card */}
      <div className="twk-card" style={{ marginBottom: 16 }}>
        <div className="twk-card-header">
          <span className="twk-card-title"><FileTextOutlined /> {t('workbench.report.title')}</span>
        </div>
        <div className="twk-card-body">
        <Space wrap style={{ marginBottom: 12 }}>
          <Button
            icon={<FileTextOutlined />}
            disabled={!vm || !dqSummary || !analyticsModel || !writable}
            onClick={() => handleGenerateReport('daily')}
          >
            {t('workbench.report.generateDaily')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            disabled={!vm || !dqSummary || !analyticsModel || !writable}
            onClick={() => handleGenerateReport('weekly')}
          >
            {t('workbench.report.generateWeekly')}
          </Button>
          {managementReport && (
            <>
              <Button
                icon={<DownloadOutlined />}
                disabled={!writable}
                onClick={handleExportMarkdown}
              >
                {t('workbench.report.exportMarkdown')}
              </Button>
              <Button
                icon={<DownloadOutlined />}
                disabled={!writable}
                onClick={handleExportJson}
              >
                {t('workbench.report.exportJson')}
              </Button>
            </>
          )}
        </Space>

        {managementReport ? (
          <Collapse
            size="small"
            items={[{
              key: 'preview',
              label: (
                <Space>
                  <Text strong>{t('workbench.report.preview')}</Text>
                  <Tag color={managementReport.dataConfidence === 'high' ? 'green'
                    : managementReport.dataConfidence === 'medium' ? 'orange'
                    : managementReport.dataConfidence === 'low' ? 'red' : 'default'}>
                    {t('workbench.report.confidence')}: {managementReport.dataConfidence}
                  </Tag>
                  <Tag>{managementReport.reportType}</Tag>
                  <Tag>{managementReport.period}</Tag>
                </Space>
              ),
              children: (
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    {t('workbench.report.executiveSummary')}
                  </Text>
                  <Text style={{ display: 'block', marginBottom: 12 }}>
                    {managementReport.executiveSummary}
                  </Text>
                  <pre style={{
                    fontSize: 11,
                    maxHeight: 400,
                    overflow: 'auto',
                    background: token.colorBgContainer,
                    padding: 12,
                    borderRadius: 4,
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}>
                    {reportPreview}
                  </pre>
                </div>
              ),
            }]}
          />
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {t('workbench.report.noReport')}
          </Text>
        )}
        </div>
      </div>

      {/* SECTION 6: Copilot Quick Actions — Designbyte db-card */}
      <div className="twk-card">
        <div className="twk-card-header">
          <span className="twk-card-title"><RobotOutlined /> {t('workbench.copilot.title')}</span>
        </div>
        <div className="twk-card-body">
          <Space wrap>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot?tool=dataProblems')}
          >
            {t('workbench.copilot.dq')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot?tool=capacityRisk')}
          >
            {t('workbench.copilot.capacity')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot?tool=bpGap')}
          >
            {t('workbench.copilot.bp')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot?tool=lookAhead')}
          >
            {t('workbench.copilot.lookahead')}
          </Button>
          <Button
            icon={<AlertOutlined />}
            onClick={() => navigate('/copilot?tool=abnormalityDetail')}
          >
            {t('copilot.quick.abnormalityDetail')}
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/copilot?tool=scenarioV2')}
          >
            {t('copilot.quick.scenarioV2')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate('/copilot?tool=reportNarrative')}
          >
            {t('copilot.quick.reportNarrative')}
          </Button>
          </Space>
        </div>
      </div>
    </PageShell>
  );
};

export default DailyOperationsWorkbench;
