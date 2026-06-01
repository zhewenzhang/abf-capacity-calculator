import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Row, Col, Table, Typography, Tag, Button, Badge, Space, Collapse, theme } from 'antd';
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
  type AbnormalityInsight,
  type RevenueBpSummary,
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
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    case 'warning':
      return <WarningOutlined style={{ color: '#faad14' }} />;
    case 'blocked':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    case 'notStarted':
      return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
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
// Severity helpers for abnormality insights
// ============================================================

function severityColor(severity: 'critical' | 'warning' | 'info'): string {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'warning':
      return 'orange';
    case 'info':
      return 'blue';
  }
}

// ============================================================
// Domain display info
// ============================================================

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  data: <InboxOutlined />,
  capacity: <CloudOutlined />,
  sales: <BarChartOutlined />,
  bp: <DollarOutlined />,
  scenario: <ExperimentOutlined />,
};

function domainLabelKey(domain: string): string {
  switch (domain) {
    case 'data':
      return 'menu.products';
    case 'capacity':
      return 'menu.capacity';
    case 'sales':
      return 'menu.forecasts';
    case 'bp':
      return 'menu.bpTargets';
    case 'scenario':
      return 'menu.scenario';
    default:
      return domain;
  }
}

// ============================================================
// Main Component
// ============================================================

const DailyOperationsWorkbench: React.FC<DailyOperationsWorkbenchProps> = ({ scope }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { token } = theme.useToken();
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
  const [managementReport, setManagementReport] = useState<ManagementReport | null>(null);
  const [reportPreview, setReportPreview] = useState<string>('');
  const [scenarioV2Loading, setScenarioV2Loading] = useState<string | null>(null);
  const [scenarioV2Result, setScenarioV2Result] = useState<OperationalScenarioResult | null>(null);

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

      const currencySettings = normalizeCurrencySettings(paramsData.currencySettings);
      const bp = buildBpAnalysis(
        analytics.skuResults,
        skus,
        analytics.monthlySummaries,
        paramsData.bpTargets?.yearlyRevenueTargetsMillionTwd ?? {},
        currencySettings,
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

  const scenarioDisabled = useMemo(() => {
    if (!vm) return true;
    const analysisStage = vm.stages.find(s => s.id === 'analysis');
    return !analysisStage || analysisStage.status === 'notStarted' || analysisStage.status === 'blocked';
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

  const abnormalitiesByDomain = useMemo(() => {
    if (!vm) return {};
    const groups: Record<string, AbnormalityInsight[]> = {};
    for (const insight of vm.abnormalities) {
      if (!groups[insight.domain]) groups[insight.domain] = [];
      groups[insight.domain].push(insight);
    }
    return groups;
  }, [vm]);

  // ---- Loading state ----
  if (loading) {
    return <PageLoading />;
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="abf-page">
        <Card>
          <Text type="danger">{error}</Text>
        </Card>
      </div>
    );
  }

  // ---- Empty state ----
  if (!vm || !hasData) {
    return (
      <div className="abf-page">
        <EmptyState
          title={t('workbench.title')}
          description={t('workbench.subtitle')}
        />
      </div>
    );
  }

  const domainKeys = Object.keys(abnormalitiesByDomain);

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

  // ---- Revenue/BP status color ----
  const revenueBpStatusColor = (status: RevenueBpSummary['status']) => {
    switch (status) {
      case 'met':
        return token.colorSuccess;
      case 'watch':
        return token.colorWarning;
      case 'miss':
        return token.colorError;
      default:
        return token.colorTextSecondary;
    }
  };

  // ---- Render ----
  return (
    <div className="db-page">
      {/* Viewer read-only warning — Designbyte Alert */}
      {!writable && (
        <div className="db-alert db-alert--info" style={{ marginBottom: 16 }}>
          <InfoCircleOutlined />
          <span>{t('common.viewerReadOnly')}</span>
        </div>
      )}

      {/* SECTION 1: Workflow Stage Stepper — Designbyte db-card */}
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><CalendarOutlined /> Pipeline Readiness</span>
        </div>
        <div className="db-card-body">
          <div className="db-readiness-grid">
            {vm.stages.map((stage) => (
              <div
                className="db-readiness-card"
                key={stage.id}
                style={{
                  borderColor: statusColor(stage.status) === 'default' ? undefined :
                    statusColor(stage.status) === 'green' ? 'var(--db-success)' :
                    statusColor(stage.status) === 'orange' ? 'var(--db-warning)' : 'var(--db-error)',
                  cursor: stage.cta ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (stage.cta && stage.status !== 'ready') {
                    navigate(stage.cta);
                  }
                }}
              >
                <div className="db-readiness-card-top">
                  <Space size={8}>
                    {STAGE_ICONS[stage.id] || <InfoCircleOutlined />}
                    {statusIcon(stage.status)}
                  </Space>
                  <Tag color={statusColor(stage.status)} style={{ fontSize: 11 }}>
                    {t(statusLabelKey(stage.status))}
                  </Tag>
                </div>
                <div className="db-readiness-title">{t(stage.label)}</div>
                <div className="db-readiness-footer">
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

      {/* SECTION 2: Abnormality Summary — Designbyte db-card */}
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><WarningOutlined /> {t('workbench.abnormality.title')}</span>
        </div>
        <div className="db-card-body">
          {domainKeys.length === 0 ? (
            <div className="db-empty">
              <CheckCircleOutlined className="db-empty-icon" style={{ color: 'var(--db-success)' }} />
              <div className="db-empty-title">{t('workbench.status.ready')}</div>
              <div className="db-empty-description">{t('workbench.subtitle')}</div>
            </div>
          ) : (
            <Row gutter={[12, 12]}>
              {domainKeys.map(domain => {
                const insights = abnormalitiesByDomain[domain];
                const errorCount = insights.filter(i => i.severity === 'critical').length;
                const warnCount = insights.filter(i => i.severity === 'warning').length;
                return (
                  <Col xs={24} sm={12} key={domain}>
                    <div className="db-card" style={{ marginBottom: 0 }}>
                      <div className="db-card-body">
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            {DOMAIN_ICONS[domain] || <InfoCircleOutlined />}
                            <Text strong>{t(domainLabelKey(domain))}</Text>
                            {errorCount > 0 && <Badge count={errorCount} style={{ backgroundColor: 'var(--db-error)' }} />}
                            {warnCount > 0 && <Badge count={warnCount} style={{ backgroundColor: 'var(--db-warning)' }} />}
                          </Space>
                          {insights.slice(0, 3).map((insight, i) => (
                            <Space key={i} size={8} style={{ width: '100%' }}>
                              <Tag color={severityColor(insight.severity)} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                                {insight.severity.toUpperCase()}
                              </Tag>
                              <Text style={{ fontSize: 12 }} ellipsis={{ tooltip: insight.detail }}>
                                {insight.title}
                              </Text>
                            </Space>
                          ))}
                          {insights.length > 3 && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              +{insights.length - 3} more
                            </Text>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </div>

      {/* SECTION 2B: Abnormality Intelligence Panel (v1.43) — Designbyte db-card */}
      {rankedOutput && rankedOutput.ranked.length > 0 && (
        <div className="db-card" style={{ marginBottom: 16 }}>
          <div className="db-card-header">
            <span className="db-card-title"><AlertOutlined /> {t('workbench.abnormalityIntelligence.title')}</span>
          </div>
          <div className="db-card-body">
          {/* Must Act Today */}
          {rankedOutput.mustActToday.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ color: token.colorError, fontSize: 13 }}>
                {t('workbench.abnormalityIntelligence.mustActToday')}
              </Text>
              <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                {rankedOutput.mustActToday.map((item, idx) => {
                  const scoreColor = item.severityScore >= 80 ? '#ff4d4f'
                    : item.severityScore >= 60 ? '#fa8c16'
                    : item.severityScore >= 40 ? '#fadb14'
                    : '#d9d9d9';
                  return (
                    <Col xs={24} sm={8} key={idx}>
                      <Card size="small" style={{ borderColor: scoreColor, borderWidth: 2 }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                          <Space>
                            <Badge
                              count={item.severityScore}
                              style={{
                                backgroundColor: scoreColor,
                                color: item.severityScore >= 60 ? '#fff' : '#000',
                                fontWeight: 700,
                              }}
                            />
                            {item.taxonomyType && (
                              <Tag color="blue">{t(`workbench.abnormalityIntelligence.${item.impactCategory}`)}</Tag>
                            )}
                          </Space>
                          <Text strong style={{ fontSize: 12 }}>{item.insight.title}</Text>
                          <Text style={{ fontSize: 11 }} type="secondary">
                            {item.whyItMatters}
                          </Text>
                          {item.insight.sourcePage && (
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0, fontSize: 11 }}
                              onClick={() => navigate(item.insight.sourcePage)}
                            >
                              {t('workbench.abnormalityIntelligence.investigate')} <RightOutlined />
                            </Button>
                          )}
                        </Space>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          )}

          {/* All Ranked Abnormalities (compact) */}
          <Table
            dataSource={rankedOutput.ranked.map((r, idx) => ({ ...r, key: idx }))}
            size="small"
            pagination={{ pageSize: 5 }}
            scroll={{ x: 600 }}
            columns={[
              {
                title: t('workbench.abnormalityIntelligence.score'),
                dataIndex: 'severityScore',
                key: 'score',
                width: 70,
                sorter: (a: { severityScore: number }, b: { severityScore: number }) => a.severityScore - b.severityScore,
                render: (score: number) => {
                  const color = score >= 80 ? '#ff4d4f'
                    : score >= 60 ? '#fa8c16'
                    : score >= 40 ? '#fadb14'
                    : '#d9d9d9';
                  return <Badge count={score} style={{ backgroundColor: color, color: score >= 60 ? '#fff' : '#000' }} />;
                },
              },
              {
                title: t('workbench.abnormalityIntelligence.category'),
                dataIndex: ['taxonomyType', 'category'],
                key: 'category',
                width: 140,
                render: (_: unknown, record: any) => (
                  <Tag>{record.taxonomyType?.category ?? record.impactCategory}</Tag>
                ),
              },
              {
                title: t('workbench.abnormality.title'),
                dataIndex: ['insight', 'title'],
                key: 'title',
                ellipsis: true,
              },
              {
                title: t('workbench.abnormalityIntelligence.whyItMatters'),
                dataIndex: 'whyItMatters',
                key: 'whyItMatters',
                ellipsis: true,
                render: (text: string) => (
                  <Text style={{ fontSize: 11 }} ellipsis={{ tooltip: text }}>{text}</Text>
                ),
              },
            ]}
          />
          </div>
        </div>
      )}

      {/* SECTION 3: Look-Ahead Focus Panel — Designbyte db-card + db-table-wrapper */}
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><BarChartOutlined /> {t('workbench.lookahead.title')}</span>
        </div>
        <div className="db-card-body">
          {vm.lookAhead.length === 0 ? (
            <div className="db-empty" style={{ padding: '24px 0' }}>
              <CheckCircleOutlined className="db-empty-icon" style={{ color: 'var(--db-success)' }} />
              <div className="db-empty-title">{t('workbench.status.ready')}</div>
            </div>
          ) : (
            <div className="db-table-wrapper">
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

      {/* SECTION 4: Revenue / BP Summary — Designbyte db-kpi */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <div className="db-kpi">
            <div className="db-kpi-label">{t('workbench.revenue.current')}</div>
            <div className="db-kpi-value" style={{ color: revenueBpStatusColor(vm.revenueBp.status) }}>
              {vm.revenueBp.currentRevenue?.toFixed(1) ?? '-'} <span style={{ fontSize: 14, fontWeight: 400 }}>M TWD</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="db-kpi">
            <div className="db-kpi-label">{t('workbench.revenue.title')}</div>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Text strong>{t('workbench.revenue.target')}:</Text>
                <Text>
                  {vm.revenueBp.bpTarget !== null
                    ? `${vm.revenueBp.bpTarget.toFixed(1)}M TWD`
                    : '-'}
                </Text>
              </Space>
              <br />
              <Space>
                <Text strong>{t('workbench.revenue.attainment')}:</Text>
                <Text
                  style={{
                    color: vm.revenueBp.attainment !== null
                      ? vm.revenueBp.attainment >= 1.0
                        ? token.colorSuccess
                        : vm.revenueBp.attainment >= 0.8
                          ? token.colorWarning
                          : token.colorError
                      : undefined,
                  }}
                >
                  {vm.revenueBp.attainment !== null
                    ? `${(vm.revenueBp.attainment * 100).toFixed(1)}%`
                    : '-'}
                </Text>
              </Space>
              <br />
              <Space>
                <Text strong>{t('workbench.revenue.gap')}:</Text>
                <Text
                  style={{
                    color: vm.revenueBp.gap !== null
                      ? vm.revenueBp.gap >= 0
                        ? token.colorSuccess
                        : token.colorError
                      : undefined,
                  }}
                >
                  {vm.revenueBp.gap !== null
                    ? `${vm.revenueBp.gap > 0 ? '+' : ''}${vm.revenueBp.gap.toFixed(1)}M TWD`
                    : '-'}
                </Text>
              </Space>
            </div>
          </div>
        </Col>
      </Row>

      {/* SECTION 5: Scenario Shortcuts — Designbyte db-card + db-toolbar */}
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><ExperimentOutlined /> {t('workbench.scenario.title')}</span>
        </div>
        <div className="db-card-body">
          <Space wrap>
          {vm.scenarioPresets.map(preset => (
            <Button
              key={preset.id}
              icon={<ExperimentOutlined />}
              disabled={scenarioDisabled}
              onClick={() => {
                const params = new URLSearchParams({
                  fv: String(preset.params.forecastVolume),
                  up: String(preset.params.unitPrice),
                  cc: String(preset.params.coreCapacity),
                  bc: String(preset.params.buCapacity),
                });
                navigate(`/scenario?${params.toString()}`);
              }}
            >
              {t(preset.label)}
            </Button>
          ))}
          </Space>
        </div>
      </div>

      {/* SECTION 5B: Scenario v2 Shortcuts (v1.44) — Designbyte db-card */}
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><ThunderboltOutlined /> {t('workbench.scenario.v2.title')}</span>
        </div>
        <div className="db-card-body">
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
                        {scenarioV2Result.comparison.deltas.totalRevenueUsd.delta >= 0 ? '+' : ''}
                        {scenarioV2Result.comparison.deltas.totalRevenueUsd.delta.toFixed(1)} USD
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
      <div className="db-card" style={{ marginBottom: 16 }}>
        <div className="db-card-header">
          <span className="db-card-title"><FileTextOutlined /> {t('workbench.report.title')}</span>
        </div>
        <div className="db-card-body">
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
      <div className="db-card">
        <div className="db-card-header">
          <span className="db-card-title"><RobotOutlined /> {t('workbench.copilot.title')}</span>
        </div>
        <div className="db-card-body">
          <Space wrap>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('workbench.copilot.dq')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('workbench.copilot.capacity')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('workbench.copilot.bp')}
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('workbench.copilot.lookahead')}
          </Button>
          <Button
            icon={<AlertOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('copilot.quick.abnormalityDetail')}
          </Button>
          <Button
            icon={<ThunderboltOutlined />}
            onClick={() => navigate('/copilot')}
          >
            {t('copilot.quick.scenarioV2')}
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => navigate('/copilot')}
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
