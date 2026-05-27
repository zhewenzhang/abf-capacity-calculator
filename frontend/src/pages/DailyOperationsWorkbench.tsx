import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Table, Typography, Tag, Button, Badge, Space, theme } from 'antd';
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
import { MetricCard, SectionCard, PageLoading } from '../components/common';
import EmptyState from '../components/common/EmptyState';
import { useI18n } from '../i18n';
import type { ProjectScope } from '../types';

const { Text, Title } = Typography;

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vm, setVm] = useState<WorkbenchViewModel | null>(null);

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

      const viewModel = buildWorkbenchViewModel({
        skus,
        forecasts,
        capacityPlans,
        params: paramsData,
      });
      setVm(viewModel);
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
    <div className="abf-page">
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>{t('workbench.title')}</Title>
        <Text type="secondary">{t('workbench.subtitle')}</Text>
      </div>

      {/* SECTION 1: Workflow Stage Stepper */}
      <SectionCard title={<><CalendarOutlined /> Pipeline Readiness</>} style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          {vm.stages.map((stage, idx) => (
            <Col xs={12} sm={8} md={6} lg={Math.floor(24 / vm.stages.length)} key={stage.id}>
              <Card
                size="small"
                hoverable
                style={{
                  borderColor: statusColor(stage.status) === 'default' ? undefined :
                    statusColor(stage.status) === 'green' ? '#52c41a' :
                    statusColor(stage.status) === 'orange' ? '#faad14' : '#ff4d4f',
                  cursor: stage.cta ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (stage.cta && stage.status !== 'ready') {
                    navigate(stage.cta);
                  }
                }}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space size={8}>
                    {STAGE_ICONS[stage.id] || <InfoCircleOutlined />}
                    {statusIcon(stage.status)}
                  </Space>
                  <Text strong style={{ fontSize: 12 }}>{t(stage.label)}</Text>
                  <Tag color={statusColor(stage.status)} style={{ fontSize: 11 }}>
                    {t(statusLabelKey(stage.status))}
                  </Tag>
                  {stage.cta && stage.status !== 'ready' && (
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
                  )}
                </Space>
                {idx < vm.stages.length - 1 && (
                  <RightOutlined
                    style={{
                      position: 'absolute',
                      right: -10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: token.colorTextQuaternary,
                      display: 'none',
                    }}
                  />
                )}
              </Card>
            </Col>
          ))}
        </Row>
      </SectionCard>

      {/* SECTION 2: Abnormality Summary */}
      <SectionCard title={<><WarningOutlined /> {t('workbench.abnormality.title')}</>} style={{ marginBottom: 16 }}>
        {domainKeys.length === 0 ? (
          <EmptyState
            title={t('workbench.status.ready')}
            description={t('workbench.subtitle')}
          />
        ) : (
          <Row gutter={[12, 12]}>
            {domainKeys.map(domain => {
              const insights = abnormalitiesByDomain[domain];
              const errorCount = insights.filter(i => i.severity === 'critical').length;
              const warnCount = insights.filter(i => i.severity === 'warning').length;
              return (
                <Col xs={24} sm={12} key={domain}>
                  <Card size="small">
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        {DOMAIN_ICONS[domain] || <InfoCircleOutlined />}
                        <Text strong>{t(domainLabelKey(domain))}</Text>
                        {errorCount > 0 && <Badge count={errorCount} style={{ backgroundColor: '#ff4d4f' }} />}
                        {warnCount > 0 && <Badge count={warnCount} style={{ backgroundColor: '#faad14' }} />}
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
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </SectionCard>

      {/* SECTION 3: Look-Ahead Focus Panel */}
      <SectionCard title={<><BarChartOutlined /> {t('workbench.lookahead.title')}</>} style={{ marginBottom: 16 }}>
        {vm.lookAhead.length === 0 ? (
          <Text type="secondary">{t('workbench.status.ready')}</Text>
        ) : (
          <Table
            columns={lookAheadColumns}
            dataSource={vm.lookAhead.map((item, idx) => ({ ...item, key: idx }))}
            size="small"
            pagination={false}
            scroll={{ x: 480 }}
          />
        )}
      </SectionCard>

      {/* SECTION 4: Revenue / BP Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <MetricCard
            title={t('workbench.revenue.current')}
            value={vm.revenueBp.currentRevenue}
            precision={1}
            suffix="M TWD"
            valueStyle={{ color: revenueBpStatusColor(vm.revenueBp.status) }}
          />
        </Col>
        <Col xs={24} sm={12}>
          <Card className="stat-card dashboard-kpi-card">
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary">{t('workbench.revenue.title')}</Text>
              <Space>
                <Text strong>{t('workbench.revenue.target')}:</Text>
                <Text>
                  {vm.revenueBp.bpTarget !== null
                    ? `${vm.revenueBp.bpTarget.toFixed(1)}M TWD`
                    : '-'}
                </Text>
              </Space>
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
            </Space>
          </Card>
        </Col>
      </Row>

      {/* SECTION 5: Scenario Shortcuts */}
      <SectionCard title={<><ExperimentOutlined /> {t('workbench.scenario.title')}</>} style={{ marginBottom: 16 }}>
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
        {scenarioDisabled && (
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            {t('workbench.cta.view')}
          </Text>
        )}
      </SectionCard>

      {/* SECTION 6: Copilot Quick Actions */}
      <SectionCard title={<><RobotOutlined /> {t('workbench.copilot.title')}</>}>
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
        </Space>
      </SectionCard>
    </div>
  );
};

export default DailyOperationsWorkbench;
