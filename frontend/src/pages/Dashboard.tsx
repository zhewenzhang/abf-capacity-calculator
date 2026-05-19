import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Spin, Alert, Tag, Button, Popconfirm, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { runCalculation } from '../core/calculationEngine';
import { loadDemoData } from '../services/demoDataService';
import type { MonthlyCapacitySummary } from '../types';
import type { ColumnsType } from 'antd/es/table';
import { message } from 'antd';

const { Text } = Typography;

interface DashboardPageProps {
  userId: string;
  projectId: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userId, projectId }) => {
  const [loading, setLoading] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSkus, setTotalSkus] = useState(0);
  const [totalForecastPcs, setTotalForecastPcs] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [maxCoreUtil, setMaxCoreUtil] = useState<number | null>(null);
  const [maxBuUtil, setMaxBuUtil] = useState<number | null>(null);
  const [shortageCount, setShortageCount] = useState(0);
  const [worstMonth, setWorstMonth] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<MonthlyCapacitySummary[]>([]);

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

        setTotalSkus(skus.length);

        if (skus.length > 0 && forecasts.length > 0) {
          const result = runCalculation(skus, forecasts, capacityPlans, params);
          setTotalForecastPcs(result.totalForecastPcs);
          setTotalRevenue(result.totalRevenue);
          setMaxCoreUtil(result.maxCoreUtilization);
          setMaxBuUtil(result.maxBuUtilization);
          setShortageCount(result.shortageMonthCount);
          setWorstMonth(result.worstBottleneckMonth);
          setSummaries(result.monthlySummaries);
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userId, projectId]);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const result = await loadDemoData(userId, projectId);
      message.success(result);
      // Reload dashboard data
      const [skus, forecasts, capacityPlans, params] = await Promise.all([
        getSKUs(userId, projectId),
        getForecasts(userId, projectId),
        getCapacityPlans(userId, projectId),
        getParameters(userId, projectId),
      ]);
      setTotalSkus(skus.length);
      const calcResult = runCalculation(skus, forecasts, capacityPlans, params);
      setTotalForecastPcs(calcResult.totalForecastPcs);
      setTotalRevenue(calcResult.totalRevenue);
      setMaxCoreUtil(calcResult.maxCoreUtilization);
      setMaxBuUtil(calcResult.maxBuUtilization);
      setShortageCount(calcResult.shortageMonthCount);
      setWorstMonth(calcResult.worstBottleneckMonth);
      setSummaries(calcResult.monthlySummaries);
    } catch (e: any) {
      setError(e.message || 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const formatUtilization = (val: number | null) => {
    if (val === null) return 'Over Capacity';
    return `${(val * 100).toFixed(1)}%`;
  };

  const summaryColumns: ColumnsType<MonthlyCapacitySummary> = [
    { title: 'Month', dataIndex: 'month', key: 'month', sorter: (a, b) => a.month.localeCompare(b.month) },
    {
      title: 'Core Demand',
      dataIndex: 'totalCorePanelDemand',
      key: 'totalCorePanelDemand',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Core Capacity',
      dataIndex: 'coreCapacity',
      key: 'coreCapacity',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Core Util.',
      dataIndex: 'coreUtilization',
      key: 'coreUtilization',
      render: (v: number | null) => formatUtilization(v),
    },
    {
      title: 'BU Demand',
      dataIndex: 'totalBuPanelDemand',
      key: 'totalBuPanelDemand',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'BU Capacity',
      dataIndex: 'buCapacity',
      key: 'buCapacity',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'BU Util.',
      dataIndex: 'buUtilization',
      key: 'buUtilization',
      render: (v: number | null) => formatUtilization(v),
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
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {totalSkus === 0 && (
        <Card style={{ marginBottom: 16, background: '#e6f7ff', border: '1px solid #91d5ff' }}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text strong>Welcome! You have no data yet.</Typography.Text>
            <Typography.Text>
              Click below to load 5 demo SKUs (TSMC, Intel, AMD, NVIDIA, Qualcomm), 6 months of forecasts, and 2026–2028 capacity plans.
            </Typography.Text>
            <Popconfirm
              title="Load Demo Data"
              description="This will create 5 SKUs, 30 forecasts, and 36 capacity plan rows. Continue?"
              onConfirm={handleLoadDemo}
            >
              <Button type="primary" icon={<ThunderboltOutlined />} loading={loadingDemo}>
                Load Demo Data
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="Total SKUs" value={totalSkus} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="Total Forecast PCS" value={totalForecastPcs} precision={0} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Total Revenue"
              value={totalRevenue}
              precision={2}
              prefix="$"
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Max Core Util."
              value={maxCoreUtil === null ? 100 : maxCoreUtil * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: (maxCoreUtil === null || maxCoreUtil > 1) ? '#cf1322' : '#3f8600' }}
              prefix={maxCoreUtil === null ? <WarningOutlined /> : maxCoreUtil > 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
            {maxCoreUtil === null && <Text type="danger">Over Capacity</Text>}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Max BU Util."
              value={maxBuUtil === null ? 100 : maxBuUtil * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: (maxBuUtil === null || maxBuUtil > 1) ? '#cf1322' : '#3f8600' }}
              prefix={maxBuUtil === null ? <WarningOutlined /> : maxBuUtil > 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
            {maxBuUtil === null && <Text type="danger">Over Capacity</Text>}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Shortage Months"
              value={shortageCount}
              suffix={`/ ${summaries.length}`}
              valueStyle={{ color: shortageCount > 0 ? '#cf1322' : '#3f8600' }}
            />
            {worstMonth && (
              <Text type="danger">Worst: {worstMonth}</Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Monthly Capacity Summary" style={{ marginTop: 16 }}>
        <Table
          columns={summaryColumns}
          dataSource={summaries}
          rowKey="month"
          size="small"
          pagination={{ pageSize: 12 }}
          rowClassName={(record) =>
            record.coreShortage > 0 || record.buShortage > 0 ? 'shortage-row' : ''
          }
        />
      </Card>
    </div>
  );
};

export default DashboardPage;
