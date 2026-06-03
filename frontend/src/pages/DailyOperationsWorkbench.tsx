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
  buildAbnormalityIntelligence,
  type AbnormalityIntelligenceOutput,
} from '../core/abnormalityIntelligence';
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
import { formatCurrency, DEFAULT_CURRENCY_SETTINGS, type CurrencySettings } from '../core/currency';
import { formatAttainment, formatBpAmount } from '../core/bpTargets';
import { formatPlainMoney, formatDelta } from '../core/formatters';
import { Line } from '@ant-design/charts';
import TimeMatrixTable from '../components/analytics/TimeMatrixTable';
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
  const [rankedOutput, setRankedOutput] = useState<AbnormalityIntelligenceOutput | null>(null);
  const [analyticsModel, setAnalyticsModel] = useState<AnalyticsModel | null>(null);
  const [bpModel, setBpModel] = useState<BpAnalysisModel | null>(null);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});
  const [managementReport, setManagementReport] = useState<ManagementReport | null>(null);
  const [reportPreview, setReportPreview] = useState<string>('');
  const [scenarioV2Loading, setScenarioV2Loading] = useState<string | null>(null);
  const [scenarioV2Result, setScenarioV2Result] = useState<OperationalScenarioResult | null>(null);
  const [showActionDetails, setShowActionDetails] = useState(false);
  const [bpSelectedYear, setBpSelectedYear] = useState<string>('2026');

  // ---- Aggregate abnormalities into action recommendations ----
  interface ActionRecommendation {
    id: string;
    type: 'capacity' | 'data' | 'bp' | 'forecast' | 'revenue';
    riskLevel: 'high' | 'medium' | 'check';
    title: string;
    impact: string;
    affectedMonths: string[];
    actions: Array<{ label: string; icon: React.ReactNode; onClick: () => void }>;
    details: Array<{ title: string; whyItMatters: string }>;
  }

  const actionRecommendations = useMemo((): ActionRecommendation[] => {
    if (!rankedOutput || rankedOutput.ranked.length === 0) return [];

    const recommendations: ActionRecommendation[] = [];

    // Group by category
    const byCategory = new Map<string, typeof rankedOutput.ranked>();
    for (const item of rankedOutput.ranked) {
      const cat = item.taxonomyType?.category ?? item.insight.domain;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    // Capacity issues
    const capacityItems = byCategory.get('capacity-constraint') ?? [];
    if (capacityItems.length > 0) {
      const months = new Set<string>();
      const details: Array<{ title: string; whyItMatters: string }> = [];
      let maxScore = 0;
      for (const item of capacityItems) {
        maxScore = Math.max(maxScore, item.severityScore);
        details.push({ title: item.insight.title, whyItMatters: item.whyItMatters });
        // Extract months from evidence if available
        const evidence = item.insight.evidence;
        if (evidence && typeof evidence.month === 'string') {
          months.add(evidence.month);
        }
      }
      const sortedMonths = Array.from(months).sort();
      recommendations.push({
        id: 'capacity-aggregate',
        type: 'capacity',
        riskLevel: maxScore >= 70 ? 'high' : maxScore >= 40 ? 'medium' : 'check',
        title: t('workbench.actionable.typeCapacity'),
        impact: sortedMonths.length > 0
          ? t('workbench.actionable.continuousPeriod', { start: sortedMonths[0], end: sortedMonths[sortedMonths.length - 1] })
          : `${capacityItems.length} issue(s) detected`,
        affectedMonths: sortedMonths,
        actions: [
          { label: t('workbench.actionable.viewCapacity'), icon: <CloudOutlined />, onClick: () => navigate('/capacity') },
          { label: t('workbench.actionable.runScenario'), icon: <ExperimentOutlined />, onClick: () => navigate('/scenario') },
          { label: t('workbench.actionable.askAI'), icon: <RobotOutlined />, onClick: () => navigate('/copilot?tool=capacityRisk') },
        ],
        details,
      });
    }

    // Data integrity issues
    const dataItems = byCategory.get('data-integrity') ?? [];
    if (dataItems.length > 0) {
      const details: Array<{ title: string; whyItMatters: string }> = [];
      let maxScore = 0;
      for (const item of dataItems) {
        maxScore = Math.max(maxScore, item.severityScore);
        details.push({ title: item.insight.title, whyItMatters: item.whyItMatters });
      }
      recommendations.push({
        id: 'data-aggregate',
        type: 'data',
        riskLevel: maxScore >= 70 ? 'high' : maxScore >= 40 ? 'medium' : 'check',
        title: t('workbench.actionable.typeData'),
        impact: `${dataItems.length} data issue(s) affecting calculations`,
        affectedMonths: [],
        actions: [
          { label: t('workbench.actionable.fixForecasts'), icon: <BarChartOutlined />, onClick: () => navigate('/forecasts') },
          { label: t('workbench.actionable.fixProducts'), icon: <InboxOutlined />, onClick: () => navigate('/products') },
          { label: t('workbench.actionable.askAI'), icon: <RobotOutlined />, onClick: () => navigate('/copilot?tool=dataProblems') },
        ],
        details,
      });
    }

    // BP / Revenue issues
    const bpItems = [...(byCategory.get('revenue-risk') ?? []), ...(byCategory.get('operational-readiness') ?? [])];
    if (bpItems.length > 0) {
      const details: Array<{ title: string; whyItMatters: string }> = [];
      let maxScore = 0;
      for (const item of bpItems) {
        maxScore = Math.max(maxScore, item.severityScore);
        details.push({ title: item.insight.title, whyItMatters: item.whyItMatters });
      }
      recommendations.push({
        id: 'bp-aggregate',
        type: 'bp',
        riskLevel: maxScore >= 70 ? 'high' : maxScore >= 40 ? 'medium' : 'check',
        title: t('workbench.actionable.typeBp'),
        impact: `${bpItems.length} BP/revenue issue(s) detected`,
        affectedMonths: [],
        actions: [
          { label: t('workbench.actionable.viewBpTargets'), icon: <DollarOutlined />, onClick: () => navigate('/bp-targets') },
          { label: t('workbench.actionable.viewRevenue'), icon: <BarChartOutlined />, onClick: () => navigate('/results') },
          { label: t('workbench.actionable.askAI'), icon: <RobotOutlined />, onClick: () => navigate('/copilot?tool=bpGap') },
        ],
        details,
      });
    }

    // Forecast gap issues
    const forecastItems = byCategory.get('forecast-gap') ?? [];
    if (forecastItems.length > 0) {
      const details: Array<{ title: string; whyItMatters: string }> = [];
      let maxScore = 0;
      for (const item of forecastItems) {
        maxScore = Math.max(maxScore, item.severityScore);
        details.push({ title: item.insight.title, whyItMatters: item.whyItMatters });
      }
      recommendations.push({
        id: 'forecast-aggregate',
        type: 'forecast',
        riskLevel: maxScore >= 70 ? 'high' : maxScore >= 40 ? 'medium' : 'check',
        title: t('workbench.actionable.typeForecast'),
        impact: `${forecastItems.length} forecast issue(s) detected`,
        affectedMonths: [],
        actions: [
          { label: t('workbench.actionable.fixForecasts'), icon: <BarChartOutlined />, onClick: () => navigate('/forecasts') },
          { label: t('workbench.actionable.askAI'), icon: <RobotOutlined />, onClick: () => navigate('/copilot?tool=dataProblems') },
        ],
        details,
      });
    }

    return recommendations;
  }, [rankedOutput, t, navigate]);

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

      // Build abnormality intelligence from workbench VM
      if (viewModel.abnormalities.length > 0) {
        const ranked = buildAbnormalityIntelligence({
          abnormalities: viewModel.abnormalities,
          dqSummary: dq,
        });
        setRankedOutput(ranked);
      } else {
        setRankedOutput(null);
      }

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
      <div className="twk-page">
        <Card>
          <Text type="danger">{error}</Text>
        </Card>
      </div>
    );
  }

  // ---- Empty state ----
  if (!vm || !hasData) {
    return (
      <div className="twk-page">
        <EmptyState
          title={t('workbench.title')}
          description={t('workbench.subtitle')}
        />
      </div>
    );
  }

  // ---- Look-ahead columns ----
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
    <div className="twk-page">
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
                    {formatPlainMoney(analyticsModel.totalRevenue, 'USD')}
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
              {chartMonths.length > 0 && (
                <div>
                  <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{t('dashboard.revenueTrendTitle')}</Text>
                  <div style={{ height: 200 }}>
                    <Line
                      data={(() => {
                        const chartData: Array<{ month: string; type: string; value: number }> = [];
                        for (const r of chartMonths) {
                          const year = r.month.substring(0, 4);
                          chartData.push({ month: r.month, type: t('dashboard.forecastRevenue'), value: r.revenue / 1e6 });
                          const yearlyTarget = bpTargets[year];
                          if (yearlyTarget && yearlyTarget > 0) {
                            chartData.push({ month: r.month, type: t('dashboard.monthlyBpTarget'), value: yearlyTarget / 12 });
                          }
                        }
                        return chartData;
                      })()}
                      xField="month"
                      yField="value"
                      seriesField="type"
                      height={200}
                      autoFit
                      xAxis={{
                        label: {
                          autoRotate: false,
                          formatter: (v: string) => {
                            // Only show Jan labels (01) to reduce clutter
                            const month = v.substring(5);
                            return month === '01' ? v.substring(0, 4) : '';
                          },
                        },
                      }}
                      yAxis={{ label: { formatter: (v: any) => `${Number(v).toLocaleString()} M` } }}
                      tooltip={{ formatter: (datum: any) => ({ name: datum.type, value: `${datum.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} M NTD` }) }}
                      color={['#1677ff', '#ff7a45']}
                      point={{ size: 3 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* SECTION 1D: Capacity Analysis — migrated from Dashboard */}
      {analyticsModel && analyticsModel.monthlyUtilization.length > 0 && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title"><CloudOutlined /> {t('dashboard.utilTrendTitle')}</span>
          </div>
          <div className="twk-card-body">
            <div style={{ height: 200 }}>
              <Line
                data={(() => {
                  const data: Array<{ month: string; type: string; value: number }> = [];
                  analyticsModel.monthlyUtilization.forEach(u => {
                    if (u.coreUtil !== null) data.push({ month: u.month, type: t('results.coreUtil'), value: u.coreUtil * 100 });
                    if (u.buUtil !== null) data.push({ month: u.month, type: t('results.buUtil'), value: u.buUtil * 100 });
                  });
                  return data;
                })()}
                xField="month"
                yField="value"
                seriesField="type"
                height={200}
                autoFit
                xAxis={{ label: { autoRotate: true } }}
                yAxis={{ label: { formatter: (v: any) => `${v}%` } }}
                color={['#1677ff', '#ff4d4f']}
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1E: Top Driver Snapshots — migrated from Dashboard */}
      {analyticsModel && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={8}>
            <div className="twk-card">
              <div className="twk-card-header">
                <span className="twk-card-title" style={{ fontSize: 13 }}>{t('dashboard.revByCustomer')}</span>
              </div>
              <div className="twk-card-body">
                <TimeMatrixTable
                  rows={analyticsModel.revenueByCustomer.slice(0, 5)}
                  timeColumns={analyticsModel.yearlyHealth.map(y => y.year)}
                  formatValue={(v) => formatCurrency(v, currencySettings, analyticsModel.yearlyHealth[0]?.year)}
                />
              </div>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <div className="twk-card">
              <div className="twk-card-header">
                <span className="twk-card-title" style={{ fontSize: 13 }}>{t('dashboard.coreBySize')}</span>
              </div>
              <div className="twk-card-body">
                <TimeMatrixTable
                  rows={analyticsModel.coreDemandBySize}
                  timeColumns={analyticsModel.yearlyHealth.map(y => y.year)}
                  formatValue={(v) => v.toLocaleString()}
                />
              </div>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <div className="twk-card">
              <div className="twk-card-header">
                <span className="twk-card-title" style={{ fontSize: 13 }}>{t('dashboard.revByApp')}</span>
              </div>
              <div className="twk-card-body">
                <TimeMatrixTable
                  rows={analyticsModel.revenueByApplication}
                  timeColumns={analyticsModel.yearlyHealth.map(y => y.year)}
                  formatValue={(v) => formatCurrency(v, currencySettings, analyticsModel.yearlyHealth[0]?.year)}
                />
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* SECTION 2B: Actionable Intelligence — v1.56.2 redesign */}
      <div className="twk-card" style={{ marginBottom: 16 }}>
        <div className="twk-card-header">
          <span className="twk-card-title"><AlertOutlined /> {t('workbench.actionable.title')}</span>
        </div>
        <div className="twk-card-body">
          {actionRecommendations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: 'var(--twk-success)', marginBottom: 8 }} />
              <div><Text strong>{t('workbench.actionable.noActions')}</Text></div>
              <div><Text type="secondary" style={{ fontSize: 12 }}>{t('workbench.actionable.noActionsDesc')}</Text></div>
            </div>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {actionRecommendations.map(rec => {
                const riskColor = rec.riskLevel === 'high' ? '#dc2626' : rec.riskLevel === 'medium' ? '#f59e0b' : '#6b7280';
                const riskLabel = rec.riskLevel === 'high' ? t('workbench.actionable.riskHigh') : rec.riskLevel === 'medium' ? t('workbench.actionable.riskMedium') : t('workbench.actionable.riskCheck');
                const typeLabel = t(`workbench.actionable.type${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}`);

                return (
                  <div key={rec.id} style={{ border: `1px solid ${riskColor}20`, borderRadius: 12, padding: '12px 16px', background: `${riskColor}05` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Tag color={riskColor} style={{ margin: 0, fontSize: 11 }}>{riskLabel}</Tag>
                      <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>{typeLabel}</Tag>
                      <Text strong style={{ fontSize: 13 }}>{rec.title}</Text>
                    </div>
                    <Text style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>{rec.impact}</Text>
                    {rec.affectedMonths.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
                        {t('workbench.actionable.affectedMonths', { count: rec.affectedMonths.length })}
                      </Text>
                    )}
                    <Space wrap size={[8, 8]}>
                      {rec.actions.map((action, idx) => (
                        <Button key={idx} size="small" icon={action.icon} onClick={action.onClick}>
                          {action.label}
                        </Button>
                      ))}
                    </Space>
                    {rec.details.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Button
                          type="link"
                          size="small"
                          style={{ padding: 0, fontSize: 11 }}
                          onClick={() => setShowActionDetails(!showActionDetails)}
                        >
                          {showActionDetails ? t('workbench.actionable.hideDetails') : t('workbench.actionable.showDetails')} ({rec.details.length})
                        </Button>
                        {showActionDetails && (
                          <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: 11 }}>
                            {rec.details.map((d, idx) => (
                              <li key={idx}>
                                <Text style={{ fontSize: 11 }}>{d.title}</Text>
                                <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>{d.whyItMatters}</Text>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </Space>
          )}
        </div>
      </div>

      {/* SECTION 3: Look-Ahead Focus Panel — Designbyte db-card + twk-table-wrapper */}
      <div className="twk-card" style={{ marginBottom: 16 }}>
        <div className="twk-card-header">
          <span className="twk-card-title"><BarChartOutlined /> {t('workbench.lookahead.title')}</span>
        </div>
        <div className="twk-card-body">
          {vm.lookAhead.length === 0 ? (
            <div className="twk-empty" style={{ padding: '24px 0' }}>
              <CheckCircleOutlined className="twk-empty-icon" style={{ color: 'var(--twk-success)' }} />
              <div className="twk-empty-title">{t('workbench.status.ready')}</div>
            </div>
          ) : (
            <div className="twk-table-wrapper">
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
                        {formatDelta(scenarioV2Result.comparison.deltas.totalRevenueUsd.delta, { currency: 'USD' })}
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
    </div>
  );
};

export default DailyOperationsWorkbench;
