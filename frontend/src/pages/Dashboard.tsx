import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Spin, Alert, Tag, Button, Popconfirm, Space } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { getSKUs } from '../services/skuService';
import { getForecasts } from '../services/forecastService';
import { getCapacityPlans } from '../services/capacityService';
import { getParameters } from '../services/parameterService';
import { buildAnalyticsModel, getDashboardHighlights, type AnalyticsModel, type DashboardHighlights, type YearlyHealth } from '../core/analytics';
import { loadDemoData } from '../services/demoDataService';
import { Link } from 'react-router-dom';
import TimeMatrixTable from '../components/analytics/TimeMatrixTable';
import type { ColumnsType } from 'antd/es/table';

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
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [highlights, setHighlights] = useState<DashboardHighlights | null>(null);

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
        const m = buildAnalyticsModel(skus, forecasts, capacityPlans, params);
        setModel(m);
        setHighlights(getDashboardHighlights(m));
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [userId, projectId]);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const result = await loadDemoData(userId, projectId);
      (window as any).message?.success?.(result);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  // --- Revenue chart data ---
  const revenueChartData = useMemo(() => {
    if (!model) return [];
    return model.monthlyRevenue.map(r => ({
      month: r.month,
      revenue: r.revenue,
    }));
  }, [model]);

  // --- Yearly health table ---
  const yearlyHealthColumns: ColumnsType<YearlyHealth> = [
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      width: 70,
      fixed: 'left',
      render: (v: string, r: YearlyHealth) => (
        <Tag color={r.severity === 'red' ? 'red' : r.severity === 'orange' ? 'orange' : 'green'}>{v}</Tag>
      ),
    },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', width: 120, render: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
    { title: 'Forecast PCS', dataIndex: 'forecastPcs', key: 'forecastPcs', width: 110, render: (v: number) => v.toLocaleString() },
    { title: 'Core Demand', dataIndex: 'coreDemand', key: 'coreDemand', width: 100, render: (v: number) => v.toLocaleString() },
    { title: 'Core Capacity', dataIndex: 'coreCapacity', key: 'coreCapacity', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: 'Core Util.',
      dataIndex: 'coreUtil',
      key: 'coreUtil',
      width: 90,
      render: (v: number | null, r: YearlyHealth) => {
        if (v === null && r.coreDemand > 0) return <Tag color="red">Over</Tag>;
        if (v === null) return '-';
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
      },
    },
    { title: 'BU Demand', dataIndex: 'buDemand', key: 'buDemand', width: 100, render: (v: number) => v.toLocaleString() },
    { title: 'BU Capacity', dataIndex: 'buCapacity', key: 'buCapacity', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: 'BU Util.',
      dataIndex: 'buUtil',
      key: 'buUtil',
      width: 90,
      render: (v: number | null, r: YearlyHealth) => {
        if (v === null && r.buDemand > 0) return <Tag color="red">Over</Tag>;
        if (v === null) return '-';
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
      },
    },
    {
      title: 'Shortage Months',
      dataIndex: 'shortageMonths',
      key: 'shortageMonths',
      width: 120,
      render: (v: string[]) => v.length > 0 ? <Text type="danger">{v.length} months</Text> : <Text type="success">0</Text>,
    },
    {
      title: 'Bottleneck',
      dataIndex: 'bottleneck',
      key: 'bottleneck',
      width: 90,
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

      {/* Executive KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="Total SKUs" value={totalSkus} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title="Total Revenue" value={model?.totalRevenue ?? 0} precision={0} prefix="$" />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Revenue Trend"
              value={highlights?.revenueTrend === 'up' ? '↑' : highlights?.revenueTrend === 'down' ? '↓' : '→'}
              valueStyle={{
                color: highlights?.revenueTrend === 'up' ? '#3f8600' : highlights?.revenueTrend === 'down' ? '#cf1322' : '#666',
              }}
            />
            {highlights?.peakRevenueYear && (
              <Text type="secondary">Peak: {highlights.peakRevenueYear}</Text>
            )}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Worst Year"
              value={highlights?.worstYear ?? '—'}
              valueStyle={{ color: highlights?.worstYear ? '#cf1322' : '#3f8600' }}
            />
            {highlights?.worstYear && <Text type="danger">Capacity constrained</Text>}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Max Core Util."
              value={model?.maxCoreUtil === null ? 100 : (model?.maxCoreUtil ?? 0) * 100}
              precision={1}
              suffix="%"
              valueStyle={{ color: (model?.maxCoreUtil === null || (model?.maxCoreUtil ?? 0) > 1) ? '#cf1322' : '#3f8600' }}
              prefix={model?.maxCoreUtil === null ? <WarningOutlined /> : (model?.maxCoreUtil ?? 0) > 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="Shortage Months"
              value={model?.shortageMonthCount ?? 0}
              suffix={`/ ${model?.monthlySummaries.length ?? 0}`}
              valueStyle={{ color: (model?.shortageMonthCount ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
            {model?.worstMonth && <Text type="danger">Worst: {model.worstMonth}</Text>}
          </Card>
        </Col>
      </Row>

      {/* Yearly Capacity Health */}
      {model && model.yearlyHealth.length > 0 && (
        <Card title="Yearly Capacity Health" style={{ marginTop: 16 }}>
          <Table
            columns={yearlyHealthColumns}
            dataSource={model.yearlyHealth}
            rowKey="year"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            rowClassName={(r) => r.severity === 'red' ? 'shortage-row' : r.severity === 'orange' ? 'warning-row' : ''}
          />
        </Card>
      )}

      {/* Revenue Trend Chart */}
      {model && model.monthlyRevenue.length > 0 && (
        <Card title="Revenue Trend" extra={<LineChartOutlined />} style={{ marginTop: 16 }}>
          {revenueChartData.length > 0 ? (
            <Line
              data={revenueChartData}
              xField="month"
              yField="revenue"
              height={250}
              autoFit
              xAxis={{ label: { autoRotate: true } }}
              yAxis={{ label: { formatter: (v: any) => `$${Number(v).toLocaleString()}` } }}
            />
          ) : (
            <Text type="secondary">No revenue data</Text>
          )}
        </Card>
      )}

      {/* Utilization Trend Chart */}
      {model && model.monthlyUtilization.length > 0 && (
        <Card title="Core & BU Utilization Trend" extra={<LineChartOutlined />} style={{ marginTop: 16 }}>
          <Line
            data={(() => {
              const data: any[] = [];
              model.monthlyUtilization.forEach(u => {
                if (u.coreUtil !== null) data.push({ month: u.month, type: 'Core Util.', value: u.coreUtil * 100 });
                if (u.buUtil !== null) data.push({ month: u.month, type: 'BU Util.', value: u.buUtil * 100 });
              });
              return data;
            })()}
            xField="month"
            yField="value"
            seriesField="type"
            height={250}
            autoFit
            xAxis={{ label: { autoRotate: true } }}
            yAxis={{ label: { formatter: (v: any) => `${v}%` } }}
            color={['#1677ff', '#ff4d4f']}
          />
        </Card>
      )}

      {/* Top Driver Snapshots */}
      {model && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Card title="Revenue by Customer" extra={<Link to="/results">View Detail →</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByCustomer.slice(0, 5)}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Core Demand by Size" extra={<Link to="/results">View Detail →</Link>} size="small">
              <TimeMatrixTable
                rows={model.coreDemandBySize}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => v.toLocaleString()}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Revenue by Application" extra={<Link to="/results">View Detail →</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByApplication}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Key Insights */}
      {highlights && (
        <Card title="Key Insights" style={{ marginTop: 16 }} size="small">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {highlights.bottleneckDriver !== 'None' && (
              <Text>
                🔧 <Tag color={highlights.bottleneckDriver === 'Core' ? 'orange' : 'red'}>{highlights.bottleneckDriver}</Tag> is the primary bottleneck driver.
              </Text>
            )}
            {highlights.topCustomer && (
              <Text>💰 <strong>{highlights.topCustomer}</strong> is the top revenue customer.</Text>
            )}
            {highlights.topSizeCategory && (
              <Text>📐 <strong>{highlights.topSizeCategory}</strong> size category dominates revenue.</Text>
            )}
            {highlights.worstYear && (
              <Text type="danger">⚠️ <strong>{highlights.worstYear}</strong> is the most constrained year — review capacity plans.</Text>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
