import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Tag,
  Spin,
  Alert,
  Tabs,
  Row,
  Col,
  Typography,
  Segmented,
  Card,
  List,
  Collapse,
} from 'antd';
import {
  WarningOutlined,
  InfoCircleOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import { getParameters } from '../services/parameterService';
import { formatCurrency, DEFAULT_CURRENCY_SETTINGS } from '../core/currency';
import type { CurrencySettings } from '../core/currency';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import {
  buildAnalyticsModel,
  buildShortageExposure,
  type AnalyticsModel,
} from '../core/analytics';
import TimeMatrixTable, { type TimeMatrixRow } from '../components/analytics/TimeMatrixTable';
import { YearlyHealthMatrix } from '../components/analytics/YearlyHealthMatrix';
import { MetricCard } from '../components/common';
import { buildBpAnalysis } from '../core/bpTargets';
import BpAnalysisPanel from '../components/analytics/BpAnalysisPanel';
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';
import { buildAnalysisContractPayload } from '../core/analysisContract';
import { buildRiskBrief } from '../core/riskBrief';
import { METRIC_DEFINITIONS } from '../core/metricDefinitions';
import type { ProjectScope } from '../types';

const { Text } = Typography;

interface CalculationResultsPageProps {
  scope: ProjectScope;
}

type ResultsView = 'risk' | 'sales' | 'product' | 'capacity' | 'bp' | 'raw';

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ scope }) => {
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [capacityPlans, setCapacityPlans] = useState<CapacityPlan[]>([]);
  const [params, setParams] = useState<ProjectParameters | null>(null);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [view, setView] = useState<ResultsView>('risk');
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [skuData, forecastData, capacityData, paramsData] = await Promise.all([
          getSKUs(scope),
          getForecasts(scope),
          getCapacityPlans(scope),
          getParameters(scope),
        ]);
        setSkus(skuData);
        setForecasts(forecastData);
        setCapacityPlans(capacityData);
        setParams(paramsData);

        if (skuData.length === 0) {
          setModel(null);
          setBpTargets({});
          setError(t('results.noSkus'));
          setLoading(false);
          return;
        }
        if (forecastData.length === 0) {
          setModel(null);
          setBpTargets({});
          setError(t('results.noForecasts'));
          setLoading(false);
          return;
        }

        const m = buildAnalyticsModel(skuData, forecastData, capacityData, paramsData);
        setModel(m);

        if (paramsData.currencySettings) {
          const cs = paramsData.currencySettings as CurrencySettings;
          setCurrencySettings({ ...cs, displayCurrency: prefs.displayCurrency });
        }
        if (paramsData.bpTargets?.yearlyRevenueTargetsMillionTwd) {
          setBpTargets({ ...paramsData.bpTargets.yearlyRevenueTargetsMillionTwd });
        } else {
          setBpTargets({});
        }
      } catch (e: any) {
        setError(e.message || t('results.calcFailed'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [scope]);

  // Sync display currency when user preference changes
  useEffect(() => {
    setCurrencySettings(prev => ({ ...prev, displayCurrency: prefs.displayCurrency }));
  }, [prefs.displayCurrency]);

  // --- Shortage exposure ---
  const shortageExposure = useMemo(() => {
    if (!model) return [];
    return buildShortageExposure(model, skus);
  }, [model, skus]);

  // --- Year columns for matrix tables ---
  const yearColumns = useMemo(() => {
    if (!model) return [];
    return model.yearlyHealth.map(y => y.year);
  }, [model]);

  const bpAnalysisModel = useMemo(() => {
    if (!model) return undefined;
    return buildBpAnalysis(model.skuResults, skus, model.monthlySummaries, bpTargets, currencySettings);
  }, [model, skus, bpTargets, currencySettings]);

  const riskBrief = useMemo(() => {
    if (!model || !params) return null;
    const payload = buildAnalysisContractPayload(
      skus,
      forecasts,
      capacityPlans,
      params,
      model,
      bpAnalysisModel
    );
    return buildRiskBrief(payload);
  }, [skus, forecasts, capacityPlans, params, model, bpAnalysisModel]);

  // --- Reusable util cell render ---
  const renderUtil = (val: number | null, demand: number) => {
    if (val === null && demand > 0) return <Tag color="red">Over</Tag>;
    if (val === null) return '-';
    const pct = val * 100;
    return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
  };

  // --- Format helpers ---
  const fmtNum = (v: number) => v > 0 ? v.toLocaleString() : '-';
  const fmtRev = (v: number, year?: string) => {
    if (v <= 0) return '-';
    return formatCurrency(v, currencySettings, year);
  };

  // ============================
  // SALES VIEW TABS
  // ============================
  const salesItems = [
    {
      key: 'rev-by-customer',
      label: t('results.revByCustomer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueByCustomer}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Customer"
        />
      ) : null,
    },
    {
      key: 'fcst-by-customer',
      label: t('results.fcstByCustomer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.forecastByCustomer}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Customer"
        />
      ) : null,
    },
    {
      key: 'rev-by-sku',
      label: t('results.revBySku'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueBySku}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="SKU"
        />
      ) : null,
    },
    {
      key: 'shortage-exposure',
      label: t('results.shortageExposure'),
      children: shortageExposure.length > 0 ? (
        <TimeMatrixTable
          rows={shortageExposure.map(e => ({ label: e.customer, values: e.values }))}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Customer"
        />
      ) : (
        <Text type="secondary">{t('results.noShortage')}</Text>
      ),
    },
  ];

  // ============================
  // PRODUCT PLANNING VIEW TABS
  // ============================
  const productItems = [
    {
      key: 'rev-by-size',
      label: t('results.revBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueBySize}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'core-by-size',
      label: t('results.coreBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandBySize}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'bu-by-size',
      label: t('results.buBySize'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandBySize}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Size"
        />
      ) : null,
    },
    {
      key: 'core-by-app',
      label: t('results.coreByApp'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByApplication}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Application"
        />
      ) : null,
    },
    {
      key: 'bu-by-app',
      label: t('results.buByApp'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandByApplication}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Application"
        />
      ) : null,
    },
    {
      key: 'rev-by-grade',
      label: t('results.revByGrade'),
      children: model ? (
        <TimeMatrixTable
          rows={model.revenueByProductGrade}
          timeColumns={yearColumns}
          formatValue={fmtRev}
          rowLabel="Grade"
        />
      ) : null,
    },
    {
      key: 'core-by-grade',
      label: t('results.coreByGrade'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByProductGrade}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Grade"
        />
      ) : null,
    },
    {
      key: 'core-by-layer',
      label: t('results.coreByLayer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.coreDemandByLayerBucket}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Layer Bucket"
        />
      ) : null,
    },
    {
      key: 'bu-by-layer',
      label: t('results.buByLayer'),
      children: model ? (
        <TimeMatrixTable
          rows={model.buDemandByLayerBucket}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Layer Bucket"
        />
      ) : null,
    },
  ];

  // ============================
  // CAPACITY ANALYSIS VIEW
  // ============================
  // Yearly health as horizontal matrix (metrics as rows, years as columns)
  const yearlyHealthRows = useMemo((): TimeMatrixRow[] => {
    if (!model || model.yearlyHealth.length === 0) return [];
    return [
      { label: t('results.revenue'), metricType: 'revenue', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.revenue])) },
      { label: t('results.forecastPcs'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.forecastPcs])) },
      { label: t('results.coreDemand'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreDemand])) },
      { label: t('results.coreCapacity'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreCapacity])) },
      { label: t('results.coreUtil'), metricType: 'utilization', values: Object.fromEntries(model.yearlyHealth.map(y => { const v = y.coreCapacity > 0 ? (y.coreDemand / y.coreCapacity) * 100 : (y.coreDemand > 0 ? 999 : 0); return [y.year, v]; })) },
      { label: t('results.buDemand'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buDemand])) },
      { label: t('results.buCapacity'), values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buCapacity])) },
      { label: t('results.buUtil'), metricType: 'utilization', values: Object.fromEntries(model.yearlyHealth.map(y => { const v = y.buCapacity > 0 ? (y.buDemand / y.buCapacity) * 100 : (y.buDemand > 0 ? 999 : 0); return [y.year, v]; })) },
      { label: t('results.shortageMonthsLabel'), metricType: 'shortage', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.shortageMonths.length])) },
      { label: t('results.bottleneck'), metricType: 'bottleneck', values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.bottleneck === 'None' ? 0 : y.bottleneck === 'Core' ? 1 : 2])) },
    ];
  }, [model, t]);

  const yearlyHealthYears = useMemo(() => {
    if (!model) return [];
    return model.yearlyHealth.map(y => y.year);
  }, [model]);

  // Monthly Core/BU matrix
  const monthlyColumns = (metric: 'core' | 'bu'): ColumnsType<any> => {
    const demandKey = metric === 'core' ? 'totalCorePanelDemand' : 'totalBuPanelDemand';
    const capacityKey = metric === 'core' ? 'coreCapacity' : 'buCapacity';
    const utilKey = metric === 'core' ? 'coreUtilization' : 'buUtilization';
    const shortageKey = metric === 'core' ? 'coreShortage' : 'buShortage';

    return [
      { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
      { title: t('results.demand'), dataIndex: demandKey, key: demandKey, width: 100, render: (v: number) => fmtNum(v) },
      { title: t('results.capacity'), dataIndex: capacityKey, key: capacityKey, width: 100, render: (v: number) => fmtNum(v) },
      {
        title: t('results.utilization'),
        dataIndex: utilKey,
        key: utilKey,
        width: 100,
        render: (v: number | null, r: MonthlyCapacitySummary) => {
          const demand = r[demandKey] as number;
          return renderUtil(v, demand);
        },
      },
      {
        title: t('results.shortage'),
        dataIndex: shortageKey,
        key: shortageKey,
        width: 100,
        render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-',
      },
    ];
  };

  const capacityItems = [
    {
      key: 'yearly-health',
      label: t('results.yearlyHealth'),
      children: model && model.yearlyHealth.length > 0 ? (
        <YearlyHealthMatrix
          rows={yearlyHealthRows}
          years={yearlyHealthYears}
          currencySettings={currencySettings}
        />
      ) : null,
    },
    {
      key: 'monthly-core',
      label: t('results.monthlyCore'),
      children: model ? (
        <Table
          columns={monthlyColumns('core')}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'monthly-bu',
      label: t('results.monthlyBu'),
      children: model ? (
        <Table
          columns={monthlyColumns('bu')}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'bottleneck-calendar',
      label: t('results.bottleneckCalendar'),
      children: model ? (
        <Table
          columns={[
            { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
            { title: t('results.bottleneck'), dataIndex: 'bottleneck', key: 'bottleneck', width: 100, render: (v: string) => v === 'None' ? <Tag color="green">{t('common.none')}</Tag> : v === 'Core' ? <Tag color="orange">{t('common.core')}</Tag> : <Tag color="red">{t('common.bu')}</Tag> },
            { title: t('results.coreShortage'), dataIndex: 'coreShortage', key: 'coreShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
            { title: t('results.buShortage'), dataIndex: 'buShortage', key: 'buShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
          ]}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
  ];

  // ============================
  // RAW DETAIL TAB
  // ============================
  const skuColumns: ColumnsType<SkuCalculationResult> = [
    { title: t('results.sku'), dataIndex: 'skuCode', key: 'skuCode', width: 110, fixed: 'left' as const },
    { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90 },
    { title: t('results.forecastPcs'), dataIndex: 'forecastPcs', key: 'forecastPcs', render: (v: number) => v.toLocaleString() },
    { title: t('results.yield'), dataIndex: 'yieldRate', key: 'yieldRate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: t('results.inputPcs'), dataIndex: 'requiredInputPcs', key: 'requiredInputPcs', render: (v: number) => v.toLocaleString() },
    { title: t('results.pcsPerPanel'), dataIndex: 'pcsPerPanel', key: 'pcsPerPanel' },
    { title: t('results.panels'), dataIndex: 'requiredPanels', key: 'requiredPanels', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreSteps'), dataIndex: 'coreSteps', key: 'coreSteps' },
    { title: t('results.buSteps'), dataIndex: 'buSteps', key: 'buSteps' },
    { title: t('results.coreDemand'), dataIndex: 'corePanelDemand', key: 'corePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.buDemand'), dataIndex: 'buPanelDemand', key: 'buPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.revenue'), dataIndex: 'revenue', key: 'revenue', render: (v: number) => formatCurrency(v, currencySettings) },
  ];

  const summaryColumns: ColumnsType<MonthlyCapacitySummary> = [
    { title: t('results.month'), dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
    { title: t('results.coreDemand'), dataIndex: 'totalCorePanelDemand', key: 'totalCorePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreCapacity'), dataIndex: 'coreCapacity', key: 'coreCapacity', render: (v: number) => v.toLocaleString() },
    { title: t('results.coreUtil'), dataIndex: 'coreUtilization', key: 'coreUtilization', render: (v: number | null) => v === null ? <Tag color="red">{t('results.over')}</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: t('results.buDemand'), dataIndex: 'totalBuPanelDemand', key: 'totalBuPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: t('results.buCapacity'), dataIndex: 'buCapacity', key: 'buCapacity', render: (v: number) => v.toLocaleString() },
    { title: t('results.buUtil'), dataIndex: 'buUtilization', key: 'buUtilization', render: (v: number | null) => v === null ? <Tag color="red">{t('results.over')}</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: t('results.coreShortage'), dataIndex: 'coreShortage', key: 'coreShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: t('results.buShortage'), dataIndex: 'buShortage', key: 'buShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: t('results.bottleneck'), dataIndex: 'bottleneck', key: 'bottleneck', render: (v: string) => v === 'None' ? <Tag color="green">{t('common.none')}</Tag> : v === 'Core' ? <Tag color="orange">{t('common.core')}</Tag> : <Tag color="red">{t('common.bu')}</Tag> },
  ];

  const rawItems = [
    {
      key: 'sku-detail',
      label: t('results.skuDetail'),
      children: model ? (
        <Table
          columns={skuColumns}
          dataSource={model.skuResults}
          rowKey={(r) => `${r.skuId}-${r.month}`}
          size="small"
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'capacity-summary',
      label: t('results.capacitySummary'),
      children: model ? (
        <Table
          columns={summaryColumns}
          dataSource={model.monthlySummaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          scroll={{ x: 'max-content' }}
          rowClassName={(r) => r.coreShortage > 0 || r.buShortage > 0 ? 'shortage-row' : ''}
        />
      ) : null,
    },
  ];

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon />}
      {!error && model && (
        <>
          {/* Summary KPIs */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <MetricCard
                title={t('results.totalRevenue')}
                value={model.totalRevenue}
                precision={currencySettings.displayCurrency === 'USD' ? 2 : 0}
              />
            </Col>
            <Col span={6}>
              <MetricCard title={t('results.totalForecastPcs')} value={model.totalForecastPcs} precision={0} />
            </Col>
            <Col span={6}>
              <MetricCard title={t('results.calculationRows')} value={model.skuResults.length} />
            </Col>
            <Col span={6}>
              <MetricCard
                title={t('results.shortageMonthCount')}
                value={model.shortageMonthCount}
                valueStyle={{ color: model.shortageMonthCount > 0 ? '#cf1322' : '#3f8600' }}
              />
            </Col>
          </Row>

          {/* View selector */}
          <Segmented
            value={view}
            onChange={(v) => setView(v as ResultsView)}
            options={[
              { label: t('results.riskBrief') || 'Risk Brief', value: 'risk' },
              { label: t('results.salesView'), value: 'sales' },
              { label: t('results.productView'), value: 'product' },
              { label: t('results.capacityView'), value: 'capacity' },
              { label: t('bp.analysis'), value: 'bp' },
              { label: t('results.rawDetail'), value: 'raw' },
            ]}
            style={{ marginBottom: 16 }}
          />

          {/* Risk Brief View */}
          {view === 'risk' && riskBrief && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Executive Summary */}
              <Card title={t('results.riskBrief.executiveSummaryTitle')} bordered={false} size="small">
                <List
                  dataSource={riskBrief.executiveSummaryMessages}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Text style={{ fontSize: 14 }}>{t(item)}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Top Risk Periods */}
              {riskBrief.topRiskPeriods.length > 0 && (
                <Card title={t('results.riskBrief.topRiskPeriodsTitle', { count: riskBrief.topRiskPeriods.length })} bordered={false} size="small">
                  <Table
                    dataSource={riskBrief.topRiskPeriods}
                    rowKey="period"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: t('results.riskBrief.period'),
                        dataIndex: 'period',
                        key: 'period',
                        width: 80,
                        render: (v: string) => <Text strong>{v}</Text>,
                      },
                      {
                        title: t('results.riskBrief.severity'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 90,
                        render: (v: string) => (
                          <Tag color={v === 'red' ? 'red' : v === 'orange' ? 'orange' : 'green'}>
                            {v.toUpperCase()}
                          </Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.bottleneckCol'),
                        dataIndex: 'bottleneck',
                        key: 'bottleneck',
                        width: 90,
                        render: (v: string) => (
                          <Tag color={v === 'Core' ? 'orange' : v === 'BU' ? 'red' : 'default'}>{v}</Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.reason'),
                        dataIndex: 'reasonMessage',
                        key: 'reasonMessage',
                        render: (_v: unknown, record: typeof riskBrief.topRiskPeriods[0]) => t(record.reasonMessage),
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Key Facts */}
              {riskBrief.facts.length > 0 && (
                <Card title={t('results.riskBrief.keyFactsTitle')} bordered={false} size="small">
                  <List
                    dataSource={riskBrief.facts}
                    renderItem={(item) => (
                      <List.Item style={{ border: 'none', padding: '4px 0' }}>
                        <Tag
                          color={
                            item.severity === 'critical' ? 'red' :
                            item.severity === 'warning' ? 'orange' :
                            item.severity === 'positive' ? 'green' : 'blue'
                          }
                          style={{ marginRight: 8 }}
                        >
                          {item.severity.toUpperCase()}
                        </Tag>
                        <Text strong>{t(item.titleMessage)}:</Text>
                        <Text style={{ marginLeft: 4 }}>{t(item.detailMessage)}</Text>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* Risk Period Attribution — shortage-month drivers */}
              {riskBrief.attributionDrivers.length > 0 && (
                <Card
                  title={t('results.riskBrief.attributionTitle', { count: riskBrief.shortageMonths.length, plural: riskBrief.shortageMonths.length === 1 ? '' : 's' })}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.attributionSubtitle')}
                    </Text>
                  }
                >
                  <Table
                    dataSource={riskBrief.attributionDrivers}
                    rowKey={(r) => `${r.dimension}-${r.metric}-${r.label}`}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: t('results.riskBrief.dimension'), dataIndex: 'dimension', key: 'dimension', width: 110, render: (v: string) => t(`attr.dimension.${v}`) },
                      { title: t('results.riskBrief.driver'), dataIndex: 'label', key: 'label', width: 180 },
                      { title: t('results.riskBrief.metric'), dataIndex: 'metric', key: 'metric', width: 170, render: (v: string) => t(`attr.metric.${v}`) },
                      {
                        title: t('results.riskBrief.value'),
                        dataIndex: 'value',
                        key: 'value',
                        width: 110,
                        align: 'right',
                        render: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }),
                      },
                      {
                        title: t('results.riskBrief.share'),
                        dataIndex: 'share',
                        key: 'share',
                        width: 80,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.severity'),
                        dataIndex: 'severity',
                        key: 'severity',
                        width: 90,
                        render: (s: string) => (
                          <Tag color={s === 'critical' ? 'red' : s === 'warning' ? 'orange' : 'blue'}>{s.toUpperCase()}</Tag>
                        ),
                      },
                      {
                        title: t('results.riskBrief.periods'),
                        dataIndex: 'affectedPeriods',
                        key: 'affectedPeriods',
                        render: (ps: string[]) => (ps.length > 4 ? t('results.riskBrief.morePeriods', { shown: ps.slice(0, 4).join(', '), rest: ps.length - 4 }) : ps.join(', ') || '-'),
                      },
                      { title: t('results.riskBrief.reason'), dataIndex: 'reasonMessage', key: 'reasonMessage', render: (_v: unknown, record: typeof riskBrief.attributionDrivers[0]) => t(record.reasonMessage) },
                    ]}
                  />
                </Card>
              )}

              {/* SKU Health Signals (deterministic MVP) */}
              {riskBrief.skuHealthSignals.length > 0 && (
                <Card
                  title={t('results.riskBrief.healthSignalsTitle', { count: riskBrief.skuHealthSignals.length })}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.healthSignalsSubtitle')}
                    </Text>
                  }
                >
                  <Table
                    dataSource={riskBrief.skuHealthSignals}
                    rowKey="skuId"
                    pagination={false}
                    size="small"
                    columns={[
                      { title: t('results.sku'), dataIndex: 'skuCode', key: 'skuCode', width: 140 },
                      { title: t('attr.dimension.customer'), dataIndex: 'customer', key: 'customer', width: 140 },
                      {
                        title: t('results.riskBrief.classification'),
                        dataIndex: 'classification',
                        key: 'classification',
                        width: 160,
                        render: (c: string) => {
                          const colorMap: Record<string, string> = {
                            strategicGrowth: 'geekblue',
                            cashCow: 'green',
                            capacityDrainer: 'orange',
                            lowValueHighLoad: 'red',
                            watchList: 'default',
                            dataIncomplete: 'volcano',
                          };
                          return <Tag color={colorMap[c] ?? 'default'}>{t(`health.${c}`)}</Tag>;
                        },
                      },
                      {
                        title: t('results.riskBrief.revenueShare'),
                        dataIndex: 'revenueShare',
                        key: 'revenueShare',
                        width: 120,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.pressureShare'),
                        dataIndex: 'capacityPressureShare',
                        key: 'capacityPressureShare',
                        width: 130,
                        align: 'right',
                        render: (v: number | undefined) => (v !== undefined ? `${v.toFixed(1)}%` : '-'),
                      },
                      {
                        title: t('results.riskBrief.reason'),
                        dataIndex: 'reasonMessages',
                        key: 'reasonMessages',
                        render: (_v: unknown, record: typeof riskBrief.skuHealthSignals[0]) => record.reasonMessages.map((m) => t(m)).join(' '),
                      },
                    ]}
                  />
                </Card>
              )}

              {/* Overall Contribution Drivers */}
              {riskBrief.drivers.length > 0 && (
                <Card
                  title={t('results.riskBrief.contributionTitle')}
                  bordered={false}
                  size="small"
                  extra={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t('results.riskBrief.contributionSubtitle')}
                    </Text>
                  }
                >
                  <Tabs
                    size="small"
                    items={riskBrief.drivers.map((dg) => ({
                      key: dg.metric,
                      label: t(dg.titleMessage),
                      children: (
                        <Table
                          dataSource={dg.items}
                          rowKey="label"
                          pagination={false}
                          size="small"
                          columns={[
                            { title: t('results.riskBrief.driver'), dataIndex: 'label', key: 'label', width: 180 },
                            {
                              title: t('results.riskBrief.value'),
                              dataIndex: 'value',
                              key: 'value',
                              width: 120,
                              align: 'right',
                              render: (v: number) => dg.metric === 'revenue' ? formatCurrency(v, currencySettings) : v.toLocaleString(),
                            },
                            {
                              title: t('results.riskBrief.share'),
                              dataIndex: 'share',
                              key: 'share',
                              width: 80,
                              align: 'right',
                              render: (v: number | undefined) => v !== undefined ? `${v.toFixed(1)}%` : '-',
                            },
                            { title: t('results.riskBrief.reason'), dataIndex: 'reasonMessage', key: 'reasonMessage', render: (_v: unknown, record: typeof dg.items[0]) => t(record.reasonMessage) },
                          ]}
                        />
                      ),
                    }))}
                  />
                </Card>
              )}

              {/* BP Risk */}
              {riskBrief.bpRisk?.statement && (
                <Card title={t('results.riskBrief.bpRiskTitle')} bordered={false} size="small">
                  <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={t(riskBrief.bpRisk.statement.titleMessage)}
                    description={t(riskBrief.bpRisk.statement.detailMessage)}
                  />
                </Card>
              )}

              {/* Data Confidence & Caveats */}
              <Card title={t('results.riskBrief.dataConfidenceTitle')} bordered={false} size="small">
                <div style={{ marginBottom: 12 }}>
                  <Tag
                    color={
                      riskBrief.confidence === 'high' ? 'green' :
                      riskBrief.confidence === 'medium' ? 'orange' :
                      riskBrief.confidence === 'blocked' ? 'default' : 'red'
                    }
                  >
                    {riskBrief.confidence.toUpperCase()}
                  </Tag>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                    {t(riskBrief.confidenceExplanationMessage)}
                  </Text>
                </div>
                {riskBrief.dataCaveats.total > 0 && (
                  <Collapse
                    size="small"
                    items={[{
                      key: 'caveats',
                      label: t('results.riskBrief.caveatsCollapse', { shown: riskBrief.dataCaveats.top.length, total: riskBrief.dataCaveats.total }),
                      children: (
                        <List
                          size="small"
                          dataSource={riskBrief.dataCaveats.top}
                          renderItem={(issue) => (
                            <List.Item>
                              <Tag
                                color={
                                  issue.severity === 'error' ? 'red' :
                                  issue.severity === 'warning' ? 'orange' : 'blue'
                                }
                                style={{ marginRight: 8 }}
                              >
                                {issue.severity.toUpperCase()}
                              </Tag>
                              <Tag color="default" style={{ marginRight: 8 }}>{issue.domain}</Tag>
                              <Text strong>{t(issue.titleMessage)}</Text>
                              <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>{t(issue.detailMessage)}</Text>
                            </List.Item>
                          )}
                        />
                      ),
                    }]}
                  />
                )}
              </Card>

              {/* Assumptions */}
              <Card title={t('results.riskBrief.assumptionsTitle')} bordered={false} size="small">
                <List
                  dataSource={riskBrief.assumptions}
                  renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <InfoCircleOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                      <Text strong>{t(item.titleMessage)}:</Text>
                      <Text type="secondary" style={{ marginLeft: 4 }}>{t(item.detailMessage)}</Text>
                    </List.Item>
                  )}
                />
              </Card>

              {/* Role-Based Attention */}
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.salesTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.salesMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.productPlanningTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.productPlanningMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.capacityTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.capacityMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
                <Col xs={24} md={12}>
                  <Card title={t('results.riskBrief.executiveTitle')} size="small" bordered={false}>
                    <List
                      dataSource={riskBrief.roleAttention.executiveMessages}
                      renderItem={(item) => (
                        <List.Item style={{ border: 'none', padding: '6px 0' }}>
                          <CaretRightOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                          <Text style={{ fontSize: 13 }}>{t(item)}</Text>
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>

              {/* Metric Glossaries */}
              <Card title={t('results.riskBrief.metricRegistryTitle')} size="small" bordered={false}>
                <Table
                  dataSource={METRIC_DEFINITIONS}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: t('results.riskBrief.metricId'), dataIndex: 'id', key: 'id', width: 140 },
                    { title: t('results.riskBrief.formula'), dataIndex: 'formula', key: 'formula', width: 220, render: (v: string) => <code>{v}</code> },
                    { title: t('results.riskBrief.description'), dataIndex: 'definition', key: 'definition' },
                    { title: t('results.riskBrief.unit'), dataIndex: 'unit', key: 'unit', width: 90, render: (v: string) => <Tag>{v}</Tag> },
                  ]}
                />
              </Card>
            </div>
          )}

          {/* Sales View */}
          {view === 'sales' && (
            <Tabs items={salesItems} size="small" />
          )}

          {/* Product Planning View */}
          {view === 'product' && (
            <Tabs items={productItems} size="small" />
          )}

          {/* Capacity Analysis View */}
          {view === 'capacity' && (
            <Tabs items={capacityItems} size="small" />
          )}

          {/* BP Analysis View */}
          {view === 'bp' && model && Object.keys(bpTargets).length > 0 && (
            <BpAnalysisPanel
              model={buildBpAnalysis(model.skuResults, skus, model.monthlySummaries, bpTargets, currencySettings)}
            />
          )}

          {view === 'bp' && (!model || Object.keys(bpTargets).length === 0) && (
            <Alert message={model ? t('bp.noTarget') : t('bp.noData')} type="info" showIcon />
          )}

          {/* Raw Detail */}
          {view === 'raw' && (
            <Tabs items={rawItems} size="small" />
          )}
        </>
      )}
    </div>
  );
};

export default CalculationResultsPage;
