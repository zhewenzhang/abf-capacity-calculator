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
import { useI18n } from '../i18n';
import { formatCurrency, formatCurrencyShort, DEFAULT_CURRENCY_SETTINGS } from '../core/currency';
import type { CurrencySettings } from '../core/currency';
import type { ColumnsType } from 'antd/es/table';

const { Text } = Typography;

interface DashboardPageProps {
  userId: string;
  projectId: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userId, projectId }) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSkus, setTotalSkus] = useState(0);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [highlights, setHighlights] = useState<DashboardHighlights | null>(null);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [skus, forecasts, capacityPlans, paramsData] = await Promise.all([
        getSKUs(userId, projectId),
        getForecasts(userId, projectId),
        getCapacityPlans(userId, projectId),
        getParameters(userId, projectId),
      ]);

      setTotalSkus(skus.length);

      const cs = paramsData.currencySettings;
      if (cs) {
        setCurrencySettings({
          baseCurrency: 'USD',
          displayCurrency: cs.displayCurrency,
          exchangeRateMode: cs.exchangeRateMode,
          constantUsdToTwdRate: cs.constantUsdToTwdRate,
          yearlyUsdToTwdRates: cs.yearlyUsdToTwdRates,
        });
      }

      if (skus.length > 0 && forecasts.length > 0) {
        const m = buildAnalyticsModel(skus, forecasts, capacityPlans, paramsData);
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
      title: t('results.year'),
      dataIndex: 'year',
      key: 'year',
      width: 70,
      fixed: 'left',
      render: (v: string, r: YearlyHealth) => (
        <Tag color={r.severity === 'red' ? 'red' : r.severity === 'orange' ? 'orange' : 'green'}>{v}</Tag>
      ),
    },
    { title: t('results.revenue'), dataIndex: 'revenue', key: 'revenue', width: 120, render: (v: number) => formatCurrency(v, currencySettings) },
    { title: t('results.forecastPcs'), dataIndex: 'forecastPcs', key: 'forecastPcs', width: 110, render: (v: number) => v.toLocaleString() },
    { title: t('results.coreDemand'), dataIndex: 'coreDemand', key: 'coreDemand', width: 100, render: (v: number) => v.toLocaleString() },
    { title: t('results.coreCapacity'), dataIndex: 'coreCapacity', key: 'coreCapacity', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: t('results.coreUtil'),
      dataIndex: 'coreUtil',
      key: 'coreUtil',
      width: 90,
      render: (v: number | null, r: YearlyHealth) => {
        if (v === null && r.coreDemand > 0) return <Tag color="red">{t('dashboard.over')}</Tag>;
        if (v === null) return '-';
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
      },
    },
    { title: t('results.buDemand'), dataIndex: 'buDemand', key: 'buDemand', width: 100, render: (v: number) => v.toLocaleString() },
    { title: t('results.buCapacity'), dataIndex: 'buCapacity', key: 'buCapacity', width: 110, render: (v: number) => v.toLocaleString() },
    {
      title: t('results.buUtil'),
      dataIndex: 'buUtil',
      key: 'buUtil',
      width: 90,
      render: (v: number | null, r: YearlyHealth) => {
        if (v === null && r.buDemand > 0) return <Tag color="red">{t('dashboard.over')}</Tag>;
        if (v === null) return '-';
        const pct = v * 100;
        return <Tag color={pct > 100 ? 'red' : pct > 85 ? 'orange' : 'green'}>{pct.toFixed(1)}%</Tag>;
      },
    },
    {
      title: t('results.shortageMonthsLabel'),
      dataIndex: 'shortageMonths',
      key: 'shortageMonths',
      width: 120,
      render: (v: string[]) => v.length > 0 ? <Text type="danger">{v.length} {t('dashboard.months')}</Text> : <Text type="success">0</Text>,
    },
    {
      title: t('results.bottleneck'),
      dataIndex: 'bottleneck',
      key: 'bottleneck',
      width: 90,
      render: (v: string) => {
        if (v === 'None') return <Tag color="green">{t('results.bottleneck')}</Tag>;
        if (v === 'Core') return <Tag color="orange">{t('results.coreUtil')}</Tag>;
        return <Tag color="red">{t('results.buUtil')}</Tag>;
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
            <Typography.Text strong>{t('dashboard.welcomeTitle')}</Typography.Text>
            <Typography.Text>
              {t('dashboard.welcomeDesc')}
            </Typography.Text>
            <Popconfirm
              title={t('dashboard.loadDemoTitle')}
              description={t('dashboard.loadDemoDesc')}
              onConfirm={handleLoadDemo}
            >
              <Button type="primary" icon={<ThunderboltOutlined />} loading={loadingDemo}>
                {t('dashboard.loadDemo')}
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}

      {/* Executive KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title={t('dashboard.totalSkus')} value={totalSkus} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic title={t('dashboard.totalRevenue')} value={model?.totalRevenue ?? 0} precision={0} prefix={formatCurrencyShort(1, currencySettings).replace('1', '')} />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.revenueTrend')}
              value={highlights?.revenueTrend === 'up' ? '↑' : highlights?.revenueTrend === 'down' ? '↓' : '→'}
              valueStyle={{
                color: highlights?.revenueTrend === 'up' ? '#3f8600' : highlights?.revenueTrend === 'down' ? '#cf1322' : '#666',
              }}
            />
            {highlights?.peakRevenueYear && (
              <Text type="secondary">{t('dashboard.peak')}: {highlights.peakRevenueYear}</Text>
            )}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.worstYear')}
              value={highlights?.worstYear ?? '—'}
              valueStyle={{ color: highlights?.worstYear ? '#cf1322' : '#3f8600' }}
            />
            {highlights?.worstYear && <Text type="danger">{t('dashboard.capacityConstrained')}</Text>}
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title={t('dashboard.maxCoreUtil')}
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
              title={t('dashboard.shortageMonths')}
              value={model?.shortageMonthCount ?? 0}
              suffix={`/ ${model?.monthlySummaries.length ?? 0}`}
              valueStyle={{ color: (model?.shortageMonthCount ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            />
            {model?.worstMonth && <Text type="danger">{t('dashboard.peak')}: {model.worstMonth}</Text>}
          </Card>
        </Col>
      </Row>

      {/* Yearly Capacity Health */}
      {model && model.yearlyHealth.length > 0 && (
        <Card title={t('dashboard.yearlyHealth')} style={{ marginTop: 16 }}>
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
        <Card title={t('dashboard.revenueTrendTitle')} extra={<LineChartOutlined />} style={{ marginTop: 16 }}>
          {revenueChartData.length > 0 ? (
            <Line
              data={revenueChartData}
              xField="month"
              yField="revenue"
              height={250}
              autoFit
              xAxis={{ label: { autoRotate: true } }}
              yAxis={{ label: { formatter: (v: any) => formatCurrencyShort(Number(v), currencySettings) } }}
            />
          ) : (
            <Text type="secondary">{t('dashboard.noRevenueData')}</Text>
          )}
        </Card>
      )}

      {/* Utilization Trend Chart */}
      {model && model.monthlyUtilization.length > 0 && (
        <Card title={t('dashboard.utilTrendTitle')} extra={<LineChartOutlined />} style={{ marginTop: 16 }}>
          <Line
            data={(() => {
              const data: any[] = [];
              model.monthlyUtilization.forEach(u => {
                if (u.coreUtil !== null) data.push({ month: u.month, type: t('results.coreUtil'), value: u.coreUtil * 100 });
                if (u.buUtil !== null) data.push({ month: u.month, type: t('results.buUtil'), value: u.buUtil * 100 });
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
            <Card title={t('dashboard.revByCustomer')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByCustomer.slice(0, 5)}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => formatCurrency(v, currencySettings)}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title={t('dashboard.coreBySize')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.coreDemandBySize}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => v.toLocaleString()}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title={t('dashboard.revByApp')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByApplication}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => formatCurrency(v, currencySettings)}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Key Insights */}
      {highlights && (
        <Card title={t('dashboard.keyInsights')} style={{ marginTop: 16 }} size="small">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {highlights.bottleneckDriver !== 'None' && (
              <Text>
                <Tag color={highlights.bottleneckDriver === 'Core' ? 'orange' : 'red'}>{highlights.bottleneckDriver}</Tag> {t('dashboard.bottleneckDriver')}
              </Text>
            )}
            {highlights.topCustomer && (
              <Text>💰 <strong>{highlights.topCustomer}</strong> {t('dashboard.topCustomer')}</Text>
            )}
            {highlights.topSizeCategory && (
              <Text>📐 <strong>{highlights.topSizeCategory}</strong> {t('dashboard.topSize')}</Text>
            )}
            {highlights.worstYear && (
              <Text type="danger">⚠️ <strong>{highlights.worstYear}</strong> {t('dashboard.constrainedYear')}</Text>
            )}
          </Space>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
