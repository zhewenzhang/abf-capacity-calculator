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
                    {analyticsModel.totalRevenue >= 1e6
                      ? `${(analyticsModel.totalRevenue / 1e6).toFixed(1)}M`
                      : analyticsModel.totalRevenue.toLocaleString()} TWD
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

      {/* SECTION 2B: Abnormality Intelligence Panel (v1.43) — Designbyte db-card */}
      {rankedOutput && rankedOutput.ranked.length > 0 && (
        <div className="twk-card" style={{ marginBottom: 16 }}>
          <div className="twk-card-header">
            <span className="twk-card-title"><AlertOutlined /> {t('workbench.abnormalityIntelligence.title')}</span>
          </div>
          <div className="twk-card-body">
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

      {/* SECTION 4: Revenue / BP Summary — Designbyte twk-kpi */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <div className="twk-kpi">
            <div className="twk-kpi-label">{t('workbench.revenue.current')}</div>
            <div className="twk-kpi-value" style={{ color: revenueBpStatusColor(vm.revenueBp.status) }}>
              {vm.revenueBp.currentRevenue?.toFixed(1) ?? '-'} <span style={{ fontSize: 14, fontWeight: 400 }}>M TWD</span>
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12}>
          <div className="twk-kpi">
            <div className="twk-kpi-label">{t('workbench.revenue.title')}</div>
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
