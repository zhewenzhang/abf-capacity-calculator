import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Tag,
  Spin,
  Alert,
  Tabs,
  Statistic,
  Row,
  Col,
  Typography,
  Segmented,
} from 'antd';
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
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU } from '../types';

const { Text } = Typography;

interface CalculationResultsPageProps {
  userId: string;
  projectId: string;
}

type ResultsView = 'sales' | 'product' | 'capacity' | 'raw';

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ userId, projectId }) => {
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [view, setView] = useState<ResultsView>('sales');
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [skuData, forecasts, capacityPlans, params] = await Promise.all([
          getSKUs(userId, projectId),
          getForecasts(userId, projectId),
          getCapacityPlans(userId, projectId),
          getParameters(userId, projectId),
        ]);

        setSkus(skuData);

        if (skuData.length === 0) {
          setError('No SKUs found. Add products first.');
          setLoading(false);
          return;
        }
        if (forecasts.length === 0) {
          setError('No forecasts found. Add forecasts first.');
          setLoading(false);
          return;
        }

        const m = buildAnalyticsModel(skuData, forecasts, capacityPlans, params);
        setModel(m);

        // Load currency settings from parameters, merge with user prefs
        if (params.currencySettings) {
          const cs = params.currencySettings as CurrencySettings;
          setCurrencySettings({ ...cs, displayCurrency: prefs.displayCurrency });
        }
      } catch (e: any) {
        setError(e.message || 'Failed to run calculation');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, projectId]);

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
              <Card>
                <Statistic
                  title={t('results.totalRevenue')}
                  value={model.totalRevenue}
                  precision={currencySettings.displayCurrency === 'USD' ? 2 : 0}
                  prefix=""
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title={t('results.totalForecastPcs')} value={model.totalForecastPcs} precision={0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title={t('results.calculationRows')} value={model.skuResults.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title={t('results.shortageMonthCount')}
                  value={model.shortageMonthCount}
                  valueStyle={{ color: model.shortageMonthCount > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          {/* View selector */}
          <Segmented
            value={view}
            onChange={(v) => setView(v as ResultsView)}
            options={[
              { label: t('results.salesView'), value: 'sales' },
              { label: t('results.productView'), value: 'product' },
              { label: t('results.capacityView'), value: 'capacity' },
              { label: t('results.rawDetail'), value: 'raw' },
            ]}
            style={{ marginBottom: 16 }}
          />

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
