import React, { useState, useEffect } from 'react';
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
} from 'antd';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { runCalculation } from '../core/calculationEngine';
import type { SkuCalculationResult, MonthlyCapacitySummary } from '../types';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface CalculationResultsPageProps {
  userId: string;
  projectId: string;
}

const CalculationResultsPage: React.FC<CalculationResultsPageProps> = ({ userId, projectId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skuResults, setSkuResults] = useState<SkuCalculationResult[]>([]);
  const [summaries, setSummaries] = useState<MonthlyCapacitySummary[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalForecastPcs, setTotalForecastPcs] = useState(0);
  const [shortageCount, setShortageCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [skus, forecasts, capacityPlans, params] = await Promise.all([
          getSKUs(userId, projectId),
          getForecasts(userId, projectId),
          getCapacityPlans(userId, projectId),
          getParameters(userId, projectId),
        ]);

        if (skus.length === 0) {
          setError('No SKUs found. Add products first.');
          setLoading(false);
          return;
        }
        if (forecasts.length === 0) {
          setError('No forecasts found. Add forecasts first.');
          setLoading(false);
          return;
        }

        const result = runCalculation(skus, forecasts, capacityPlans, params);
        setSkuResults(result.skuResults);
        setSummaries(result.monthlySummaries);
        setTotalRevenue(result.totalRevenue);
        setTotalForecastPcs(result.totalForecastPcs);
        setShortageCount(result.shortageMonthCount);
      } catch (e: any) {
        setError(e.message || 'Failed to run calculation');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, projectId]);

  const formatUtil = (v: number | null) => {
    if (v === null) return 'Over';
    return `${(v * 100).toFixed(1)}%`;
  };

  const skuColumns: ColumnsType<SkuCalculationResult> = [
    { title: 'SKU', dataIndex: 'skuCode', key: 'skuCode' },
    { title: 'Month', dataIndex: 'month', key: 'month' },
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
    { title: 'Month', dataIndex: 'month', key: 'month' },
    { title: 'Core Demand', dataIndex: 'totalCorePanelDemand', key: 'totalCorePanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'Core Capacity', dataIndex: 'coreCapacity', key: 'coreCapacity', render: (v: number) => v.toLocaleString() },
    {
      title: 'Core Util.',
      dataIndex: 'coreUtilization',
      key: 'coreUtilization',
      render: (v: number | null) => {
        if (v === null) return <Tag color="red">Over Capacity</Tag>;
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 80 ? 'orange' : 'green'}>{formatUtil(v)}</Tag>;
      },
    },
    { title: 'BU Demand', dataIndex: 'totalBuPanelDemand', key: 'totalBuPanelDemand', render: (v: number) => v.toLocaleString() },
    { title: 'BU Capacity', dataIndex: 'buCapacity', key: 'buCapacity', render: (v: number) => v.toLocaleString() },
    {
      title: 'BU Util.',
      dataIndex: 'buUtilization',
      key: 'buUtilization',
      render: (v: number | null) => {
        if (v === null) return <Tag color="red">Over Capacity</Tag>;
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 80 ? 'orange' : 'green'}>{formatUtil(v)}</Tag>;
      },
    },
    {
      title: 'Core Shortage',
      dataIndex: 'coreShortage',
      key: 'coreShortage',
      render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-',
    },
    {
      title: 'BU Shortage',
      dataIndex: 'buShortage',
      key: 'buShortage',
      render: (v: number) => v > 0 ? <Text type="danger">{v.toLocaleString()}</Text> : '-',
    },
    {
      title: 'Bottleneck',
      dataIndex: 'bottleneck',
      key: 'bottleneck',
      render: (v: string) => {
        if (v === 'None') return <Tag color="green">None</Tag>;
        if (v === 'Core') return <Tag color="orange">Core</Tag>;
        return <Tag color="red">BU</Tag>;
      },
    },
  ];

  if (loading) {
    return <Spin size="large" />;
  }

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon />}
      {!error && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="Total Revenue" value={totalRevenue} precision={2} prefix="$" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Total Forecast PCS" value={totalForecastPcs} precision={0} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="Calculation Rows" value={skuResults.length} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Shortage Months"
                  value={shortageCount}
                  valueStyle={{ color: shortageCount > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>
          <Tabs
            items={[
              {
                key: 'sku',
                label: 'SKU Details',
                children: (
                  <Table
                    columns={skuColumns}
                    dataSource={skuResults}
                    rowKey={(r) => `${r.skuId}-${r.month}`}
                    size="small"
                    pagination={{ pageSize: 20 }}
                  />
                ),
              },
              {
                key: 'summary',
                label: 'Capacity Summary',
                children: (
                  <Table
                    columns={summaryColumns}
                    dataSource={summaries}
                    rowKey="month"
                    size="small"
                    pagination={{ pageSize: 12 }}
                    rowClassName={(r) =>
                      r.coreShortage > 0 || r.buShortage > 0 ? 'shortage-row' : ''
                    }
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
};

export default CalculationResultsPage;
