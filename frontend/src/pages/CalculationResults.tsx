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
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import {
  buildAnalyticsModel,
  buildShortageExposure,
  type AnalyticsModel,
} from '../core/analytics';
import TimeMatrixTable from '../components/analytics/TimeMatrixTable';
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU } from '../types';

const { Text } = Typography;

interface CalculationResultsPageProps {
  userId: string;
  projectId: string;
}

type ResultsView = 'sales' | 'product' | 'capacity' | 'raw';

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ userId, projectId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [view, setView] = useState<ResultsView>('sales');

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
      } catch (e: any) {
        setError(e.message || 'Failed to run calculation');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, projectId]);

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
  const fmtRev = (v: number) => v > 0 ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-';

  // ============================
  // SALES VIEW TABS
  // ============================
  const salesItems = [
    {
      key: 'rev-by-customer',
      label: 'Revenue by Customer',
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
      label: 'Forecast PCS by Customer',
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
      label: 'Revenue by SKU',
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
      label: 'Shortage Exposure by Customer',
      children: shortageExposure.length > 0 ? (
        <TimeMatrixTable
          rows={shortageExposure.map(e => ({ label: e.customer, values: e.values }))}
          timeColumns={yearColumns}
          formatValue={fmtNum}
          rowLabel="Customer"
        />
      ) : (
        <Text type="secondary">No shortage months detected.</Text>
      ),
    },
  ];

  // ============================
  // PRODUCT PLANNING VIEW TABS
  // ============================
  const productItems = [
    {
      key: 'rev-by-size',
      label: 'Revenue by Size',
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
      label: 'Core Demand by Size',
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
      label: 'BU Demand by Size',
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
      label: 'Core Demand by Application',
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
      label: 'BU Demand by Application',
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
      label: 'Revenue by Product Grade',
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
      label: 'Core Demand by Product Grade',
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
      label: 'Core Demand by Layer Bucket',
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
      label: 'BU Demand by Layer Bucket',
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
  // Yearly health table
  const yearlyHealthColumns: ColumnsType<any> = [
    { title: 'Year', dataIndex: 'year', key: 'year', width: 70, fixed: 'left', render: (v: string, r: any) => <Tag color={r.severity === 'red' ? 'red' : r.severity === 'orange' ? 'orange' : 'green'}>{v}</Tag> },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', width: 120, render: (v: number) => fmtRev(v) },
    { title: 'Forecast PCS', dataIndex: 'forecastPcs', key: 'forecastPcs', width: 110, render: (v: number) => fmtNum(v) },
    { title: 'Core Demand', dataIndex: 'coreDemand', key: 'coreDemand', width: 100, render: (v: number) => fmtNum(v) },
    { title: 'Core Capacity', dataIndex: 'coreCapacity', key: 'coreCapacity', width: 110, render: (v: number) => fmtNum(v) },
    { title: 'Core Util.', dataIndex: 'coreUtil', key: 'coreUtil', width: 90, render: (v: number | null, r: any) => renderUtil(v, r.coreDemand) },
    { title: 'BU Demand', dataIndex: 'buDemand', key: 'buDemand', width: 100, render: (v: number) => fmtNum(v) },
    { title: 'BU Capacity', dataIndex: 'buCapacity', key: 'buCapacity', width: 110, render: (v: number) => fmtNum(v) },
    { title: 'BU Util.', dataIndex: 'buUtil', key: 'buUtil', width: 90, render: (v: number | null, r: any) => renderUtil(v, r.buDemand) },
    { title: 'Shortage Months', dataIndex: 'shortageMonths', key: 'shortageMonths', width: 120, render: (v: string[]) => v.length > 0 ? <Text type="danger">{v.length} months</Text> : '0' },
    { title: 'Bottleneck', dataIndex: 'bottleneck', key: 'bottleneck', width: 90, render: (v: string) => v === 'None' ? <Tag color="green">None</Tag> : v === 'Core' ? <Tag color="orange">Core</Tag> : <Tag color="red">BU</Tag> },
  ];

  // Monthly Core/BU matrix
  const monthlyColumns = (metric: 'core' | 'bu'): ColumnsType<any> => {
    const demandKey = metric === 'core' ? 'totalCorePanelDemand' : 'totalBuPanelDemand';
    const capacityKey = metric === 'core' ? 'coreCapacity' : 'buCapacity';
    const utilKey = metric === 'core' ? 'coreUtilization' : 'buUtilization';
    const shortageKey = metric === 'core' ? 'coreShortage' : 'buShortage';

    return [
      { title: 'Month', dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
      { title: 'Demand', dataIndex: demandKey, key: demandKey, width: 100, render: (v: number) => fmtNum(v) },
      { title: 'Capacity', dataIndex: capacityKey, key: capacityKey, width: 100, render: (v: number) => fmtNum(v) },
      {
        title: 'Utilization',
        dataIndex: utilKey,
        key: utilKey,
        width: 100,
        render: (v: number | null, r: MonthlyCapacitySummary) => {
          const demand = r[demandKey] as number;
          return renderUtil(v, demand);
        },
      },
      {
        title: 'Shortage',
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
      label: 'Yearly Health',
      children: model ? (
        <Table
          columns={yearlyHealthColumns}
          dataSource={model.yearlyHealth}
          rowKey="year"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      ) : null,
    },
    {
      key: 'monthly-core',
      label: 'Monthly Core',
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
      label: 'Monthly BU',
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
      label: 'Bottleneck Calendar',
      children: model ? (
        <Table
          columns={[
            { title: 'Month', dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
            { title: 'Bottleneck', dataIndex: 'bottleneck', key: 'bottleneck', width: 100, render: (v: string) => v === 'None' ? <Tag color="green">None</Tag> : v === 'Core' ? <Tag color="orange">Core</Tag> : <Tag color="red">BU</Tag> },
            { title: 'Core Shortage', dataIndex: 'coreShortage', key: 'coreShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
            { title: 'BU Shortage', dataIndex: 'buShortage', key: 'buShortage', width: 110, render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
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
    { title: 'SKU', dataIndex: 'skuCode', key: 'skuCode', width: 110, fixed: 'left' as const },
    { title: 'Month', dataIndex: 'month', key: 'month', width: 90 },
    { title: 'Forecast PCS', dataIndex: 'forecastPcs', key: 'forecastPcs', render: (v: number) => v.toLocaleString() },
    { title: 'Yield', dataIndex: 'yieldRate', key: 'yieldRate', render: (v: number) => `${(v * 100).toFixed(1)}%` },
    { title: 'Input PCS', dataIndex: 'requiredInputPcs', key: 'requiredInputPcs', render: (v: number) => v.toLocaleString() },
    { title: 'PCS/Panel', dataIndex: 'pcsPerPanel', key: 'pcsPerPanel' },
    { title: 'Panels', dataIndex: 'requiredPanels', key: 'requiredPanels', render: (v: number) => v.toLocaleString() },
    { title: 'Core Steps', dataIndex: 'coreSteps', key: 'coreSteps' },
    { title: 'BU Steps', dataIndex: 'buSteps', key: 'buSteps' },
    { title: 'Core Demand', dataIndex: 'corePanelDemand', key: 'corePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'BU Demand', dataIndex: 'buPanelDemand', key: 'buPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (v: number) => `$${v.toFixed(2)}` },
  ];

  const summaryColumns: ColumnsType<MonthlyCapacitySummary> = [
    { title: 'Month', dataIndex: 'month', key: 'month', width: 90, fixed: 'left' as const },
    { title: 'Core Demand', dataIndex: 'totalCorePanelDemand', key: 'totalCorePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'Core Capacity', dataIndex: 'coreCapacity', key: 'coreCapacity', render: (v: number) => v.toLocaleString() },
    { title: 'Core Util.', dataIndex: 'coreUtilization', key: 'coreUtilization', render: (v: number | null) => v === null ? <Tag color="red">Over</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: 'BU Demand', dataIndex: 'totalBuPanelDemand', key: 'totalBuPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'BU Capacity', dataIndex: 'buCapacity', key: 'buCapacity', render: (v: number) => v.toLocaleString() },
    { title: 'BU Util.', dataIndex: 'buUtilization', key: 'buUtilization', render: (v: number | null) => v === null ? <Tag color="red">Over</Tag> : `${(v * 100).toFixed(1)}%` },
    { title: 'Core Shortage', dataIndex: 'coreShortage', key: 'coreShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: 'BU Shortage', dataIndex: 'buShortage', key: 'buShortage', render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-' },
    { title: 'Bottleneck', dataIndex: 'bottleneck', key: 'bottleneck', render: (v: string) => v === 'None' ? <Tag color="green">None</Tag> : v === 'Core' ? <Tag color="orange">Core</Tag> : <Tag color="red">BU</Tag> },
  ];

  const rawItems = [
    {
      key: 'sku-detail',
      label: 'SKU Detail',
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
      label: 'Capacity Summary',
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
                <Statistic title="Total Revenue" value={model.totalRevenue} precision={2} prefix="$" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Total Forecast PCS" value={model.totalForecastPcs} precision={0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Calculation Rows" value={model.skuResults.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Shortage Months"
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
              { label: '📊 Sales View', value: 'sales' },
              { label: '🏭 Product Planning', value: 'product' },
              { label: '⚡ Capacity Analysis', value: 'capacity' },
              { label: '📋 Raw Detail', value: 'raw' },
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
