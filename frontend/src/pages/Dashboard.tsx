import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Typography, Spin, Alert, Tag, Button, Popconfirm, Space } from 'antd';
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
import { buildAnalyticsModel, getDashboardHighlights, type AnalyticsModel, type DashboardHighlights } from '../core/analytics';
import { loadDemoData } from '../services/demoDataService';
import { Link } from 'react-router-dom';
import TimeMatrixTable, { type TimeMatrixRow } from '../components/analytics/TimeMatrixTable';
import { YearlyHealthMatrix } from '../components/analytics/YearlyHealthMatrix';
import { MetricCard, SectionCard } from '../components/common';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import { formatCurrency, formatCurrencyShort, DEFAULT_CURRENCY_SETTINGS } from '../core/currency';
import type { CurrencySettings } from '../core/currency';

const { Text } = Typography;

interface DashboardPageProps {
  userId: string;
  projectId: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ userId, projectId }) => {
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
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

      // Merge: displayCurrency from app prefs, rates from parameters
      const cs = paramsData.currencySettings;
      const baseSettings: CurrencySettings = cs ? {
        baseCurrency: 'USD',
        displayCurrency: cs.displayCurrency,
        exchangeRateMode: cs.exchangeRateMode,
        constantUsdToTwdRate: cs.constantUsdToTwdRate,
        yearlyUsdToTwdRates: cs.yearlyUsdToTwdRates,
      } : DEFAULT_CURRENCY_SETTINGS;

      // Override display currency from user preference
      setCurrencySettings({ ...baseSettings, displayCurrency: prefs.displayCurrency });

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

  // Sync display currency when user preference changes
  useEffect(() => {
    setCurrencySettings(prev => ({ ...prev, displayCurrency: prefs.displayCurrency }));
  }, [prefs.displayCurrency]);

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

  // --- Yearly health as horizontal matrix (metrics as rows, years as columns) ---
  const yearlyHealthRows = useMemo((): TimeMatrixRow[] => {
    if (!model || model.yearlyHealth.length === 0) return [];
    return [
      {
        label: t('results.revenue'),
        metricType: 'revenue',
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.revenue])),
      },
      {
        label: t('results.forecastPcs'),
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.forecastPcs])),
      },
      {
        label: t('results.coreDemand'),
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreDemand])),
      },
      {
        label: t('results.coreCapacity'),
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.coreCapacity])),
      },
      {
        label: t('results.coreUtil'),
        metricType: 'utilization',
        values: Object.fromEntries(model.yearlyHealth.map(y => {
          const val = y.coreCapacity > 0 ? (y.coreDemand / y.coreCapacity) * 100 : (y.coreDemand > 0 ? 999 : 0);
          return [y.year, val];
        })),
      },
      {
        label: t('results.buDemand'),
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buDemand])),
      },
      {
        label: t('results.buCapacity'),
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.buCapacity])),
      },
      {
        label: t('results.buUtil'),
        metricType: 'utilization',
        values: Object.fromEntries(model.yearlyHealth.map(y => {
          const val = y.buCapacity > 0 ? (y.buDemand / y.buCapacity) * 100 : (y.buDemand > 0 ? 999 : 0);
          return [y.year, val];
        })),
      },
      {
        label: t('results.shortageMonthsLabel'),
        metricType: 'shortage',
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.shortageMonths.length])),
      },
      {
        label: t('results.bottleneck'),
        metricType: 'bottleneck',
        values: Object.fromEntries(model.yearlyHealth.map(y => [y.year, y.bottleneck === 'None' ? 0 : y.bottleneck === 'Core' ? 1 : 2])),
      },
    ];
  }, [model, t]);

  const yearlyHealthYears = useMemo(() => {
    if (!model) return [];
    return model.yearlyHealth.map(y => y.year);
  }, [model]);

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
          <MetricCard title={t('dashboard.totalSkus')} value={totalSkus} />
        </Col>
        <Col span={4}>
          <MetricCard
            title={t('dashboard.totalRevenue')}
            value={model?.totalRevenue ?? 0}
            precision={currencySettings.displayCurrency === 'USD' ? 2 : 0}
          />
        </Col>
        <Col span={4}>
          <MetricCard
            title={t('dashboard.revenueTrend')}
            value={highlights?.revenueTrend === 'up' ? '↑' : highlights?.revenueTrend === 'down' ? '↓' : '→'}
            valueStyle={{
              color: highlights?.revenueTrend === 'up' ? '#3f8600' : highlights?.revenueTrend === 'down' ? '#cf1322' : '#666',
            }}
            extra={highlights?.peakRevenueYear && <Text type="secondary">{t('dashboard.peak')}: {highlights.peakRevenueYear}</Text>}
          />
        </Col>
        <Col span={4}>
          <MetricCard
            title={t('dashboard.worstYear')}
            value={highlights?.worstYear ?? '—'}
            valueStyle={{ color: highlights?.worstYear ? '#cf1322' : '#3f8600' }}
            extra={highlights?.worstYear && <Text type="danger">{t('dashboard.capacityConstrained')}</Text>}
          />
        </Col>
        <Col span={4}>
          <MetricCard
            title={t('dashboard.maxCoreUtil')}
            value={model?.maxCoreUtil === null ? 100 : (model?.maxCoreUtil ?? 0) * 100}
            precision={1}
            suffix="%"
            prefix={model?.maxCoreUtil === null ? <WarningOutlined /> : (model?.maxCoreUtil ?? 0) > 1 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            valueStyle={{ color: (model?.maxCoreUtil === null || (model?.maxCoreUtil ?? 0) > 1) ? '#cf1322' : '#3f8600' }}
          />
        </Col>
        <Col span={4}>
          <MetricCard
            title={t('dashboard.shortageMonths')}
            value={model?.shortageMonthCount ?? 0}
            suffix={`/ ${model?.monthlySummaries.length ?? 0}`}
            valueStyle={{ color: (model?.shortageMonthCount ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
            extra={model?.worstMonth && <Text type="danger">{t('dashboard.peak')}: {model.worstMonth}</Text>}
          />
        </Col>
      </Row>

      {/* Yearly Capacity Health (metrics as rows, years left-to-right as columns) */}
      {model && model.yearlyHealth.length > 0 && (
        <SectionCard title={t('dashboard.yearlyHealth')}>
          <YearlyHealthMatrix rows={yearlyHealthRows} years={yearlyHealthYears} currencySettings={currencySettings} />
        </SectionCard>
      )}

      {/* Revenue Trend Chart */}
      {model && model.monthlyRevenue.length > 0 && (
        <SectionCard title={t('dashboard.revenueTrendTitle')} extra={<LineChartOutlined />}>
          {revenueChartData.length > 0 ? (
            <Line
              data={revenueChartData}
              xField="month"
              yField="revenue"
              height={250}
              autoFit
              xAxis={{ label: { autoRotate: true } }}
              yAxis={{ label: { formatter: (v: any) => formatCurrencyShort(Number(v), currencySettings, (revenueChartData.length > 0 ? revenueChartData[0]?.month?.substring(0, 4) : undefined)) } }}
            />
          ) : (
            <Text type="secondary">{t('dashboard.noRevenueData')}</Text>
          )}
        </SectionCard>
      )}

      {/* Utilization Trend Chart */}
      {model && model.monthlyUtilization.length > 0 && (
        <SectionCard title={t('dashboard.utilTrendTitle')} extra={<LineChartOutlined />}>
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
        </SectionCard>
      )}

      {/* Top Driver Snapshots */}
      {model && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <SectionCard title={t('dashboard.revByCustomer')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByCustomer.slice(0, 5)}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => formatCurrency(v, currencySettings, model.yearlyHealth[0]?.year)}
              />
            </SectionCard>
          </Col>
          <Col span={8}>
            <SectionCard title={t('dashboard.coreBySize')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.coreDemandBySize}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => v.toLocaleString()}
              />
            </SectionCard>
          </Col>
          <Col span={8}>
            <SectionCard title={t('dashboard.revByApp')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByApplication}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => formatCurrency(v, currencySettings, model.yearlyHealth[0]?.year)}
              />
            </SectionCard>
          </Col>
        </Row>
      )}

      {/* Key Insights */}
      {highlights && (
        <SectionCard title={t('dashboard.keyInsights')} size="small">
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
        </SectionCard>
      )}
    </div>
  );
};

export default DashboardPage;
