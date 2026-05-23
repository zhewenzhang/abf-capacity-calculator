import React, { useState, useEffect, useMemo } from 'react';
import { Card, Row, Col, Table, Typography, Spin, Alert, Tag, Button, Popconfirm, Space, theme } from 'antd';
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
import { buildDataQualitySummary } from '../core/dataQuality';
import type { DataQualitySummary } from '../core/dataQuality';
import { Link } from 'react-router-dom';
import TimeMatrixTable, { type TimeMatrixRow } from '../components/analytics/TimeMatrixTable';
import { YearlyHealthMatrix } from '../components/analytics/YearlyHealthMatrix';
import { MetricCard, SectionCard } from '../components/common';
import { useI18n } from '../i18n';
import { useAppPrefs } from '../context/AppPreferencesContext';
import { formatCurrency, formatCurrencyShort, DEFAULT_CURRENCY_SETTINGS, normalizeCurrencySettings } from '../core/currency';
import type { CurrencySettings } from '../core/currency';
import { buildBpAnalysis, computeBpKpi, formatAttainment, formatBpAmount, type BpPeriodRecord } from '../core/bpTargets';
import type { ProjectScope } from '../types';
import { canEdit } from '../services/projectScope';

const { Text } = Typography;

// Local types for BP Dashboard row builder
type BpDashboardRow = {
  metric: string;
  [period: string]: React.ReactNode;
};

interface DashboardPageProps {
  scope: ProjectScope;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ scope }) => {
  const writable = canEdit(scope.role);
  const { t } = useI18n();
  const { prefs } = useAppPrefs();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalSkus, setTotalSkus] = useState(0);
  const [model, setModel] = useState<AnalyticsModel | null>(null);
  const [highlights, setHighlights] = useState<DashboardHighlights | null>(null);
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(DEFAULT_CURRENCY_SETTINGS);
  const [bpTargets, setBpTargets] = useState<Record<string, number>>({});
  const [qualitySummary, setQualitySummary] = useState<DataQualitySummary | null>(null);

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

      setTotalSkus(skus.length);

      const cs = paramsData.currencySettings;
      const baseSettings: CurrencySettings = normalizeCurrencySettings(cs);

      setCurrencySettings({ ...baseSettings, displayCurrency: prefs.displayCurrency });

      const bp = paramsData.bpTargets;
      if (bp?.yearlyRevenueTargetsMillionTwd) {
        setBpTargets({ ...bp.yearlyRevenueTargetsMillionTwd });
      } else {
        setBpTargets({});
      }

      if (skus.length > 0 && forecasts.length > 0) {
        const m = buildAnalyticsModel(skus, forecasts, capacityPlans, paramsData);
        setModel(m);
        setHighlights(getDashboardHighlights(m));
        setQualitySummary(buildDataQualitySummary({ skus, forecasts, capacityPlans, params: paramsData }));
      } else {
        setModel(null);
        setHighlights(null);
        setQualitySummary(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [scope]);

  useEffect(() => {
    setCurrencySettings(prev => ({ ...prev, displayCurrency: prefs.displayCurrency }));
  }, [prefs.displayCurrency]);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const result = await loadDemoData(scope);
      (window as any).message?.success?.(result);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to load demo data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const revenueChartData = useMemo(() => {
    if (!model) return [];
    return model.monthlyRevenue.map(r => ({
      month: r.month,
      revenue: r.revenue,
    }));
  }, [model]);

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

  // --- Centered loading state with accessibility ---
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}
      >
        <Spin size="large" tip={t('common.loading')} />
      </div>
    );
  }

  // --- Derived token colors for KPI status ---
  const colorGood = token.colorSuccess;
  const colorBad = token.colorError;
  const colorWarn = token.colorWarning;
  const colorNeutral = token.colorTextSecondary;

  // Trend arrow color
  const trendColor = highlights?.revenueTrend === 'up'
    ? colorGood
    : highlights?.revenueTrend === 'down'
      ? colorBad
      : colorNeutral;

  return (
    <div>
      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}
      {qualitySummary && (
        <Alert
          message={
            <span>
              <strong>Data Confidence: </strong>
              <Tag color={
                qualitySummary.confidence === 'high' ? 'green' :
                qualitySummary.confidence === 'medium' ? 'orange' :
                qualitySummary.confidence === 'blocked' ? 'default' : 'red'
              }>
                {qualitySummary.confidence.toUpperCase()}
              </Tag>
              {qualitySummary.status !== 'ok' && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {qualitySummary.issues.filter(i => i.severity === 'error').length} error(s), {qualitySummary.issues.filter(i => i.severity === 'warning').length} warning(s).
                </Text>
              )}
              {highlights?.worstYear && qualitySummary.confidence !== 'blocked' && (
                <Text type="danger" style={{ marginLeft: 8 }}>
                  Highest risk period: {highlights.worstYear}.
                </Text>
              )}
            </span>
          }
          type={
            qualitySummary.status === 'error' ? 'error' :
            qualitySummary.status === 'warning' ? 'warning' : 'info'
          }
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
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
              disabled={!writable}
            >
              <Button type="primary" icon={<ThunderboltOutlined />} loading={loadingDemo} disabled={!writable} aria-label={t('dashboard.loadDemo')}>
                {t('dashboard.loadDemo')}
              </Button>
            </Popconfirm>
          </Space>
        </Card>
      )}

      {/* Executive KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard title={t('dashboard.totalSkus')} value={totalSkus} />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard
            title={t('dashboard.totalRevenue')}
            value={model?.totalRevenue ?? 0}
            precision={currencySettings.displayCurrency === 'USD' ? 2 : 0}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard
            title={t('dashboard.revenueTrend')}
            value={highlights?.revenueTrend === 'up' ? '↑' : highlights?.revenueTrend === 'down' ? '↓' : '→'}
            valueStyle={{ color: trendColor }}
            extra={highlights?.peakRevenueYear && <Text type="secondary">{t('dashboard.peak')}: {highlights.peakRevenueYear}</Text>}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard
            title={t('dashboard.worstYear')}
            value={highlights?.worstYear ?? '—'}
            valueStyle={{ color: highlights?.worstYear ? colorBad : colorGood }}
            extra={highlights?.worstYear && <Text type="danger">{t('dashboard.capacityConstrained')}</Text>}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard
            title={t('dashboard.maxCoreUtil')}
            value={model?.maxCoreUtil === null ? 100 : (model?.maxCoreUtil ?? 0) * 100}
            precision={1}
            suffix="%"
            prefix={
              model?.maxCoreUtil === null
                ? <WarningOutlined title={t('dashboard.warningIcon')} aria-label={t('dashboard.warningIcon')} />
                : (model?.maxCoreUtil ?? 0) > 1
                  ? <ArrowUpOutlined title={t('dashboard.increaseIcon')} aria-label={t('dashboard.increaseIcon')} />
                  : <ArrowDownOutlined title={t('dashboard.decreaseIcon')} aria-label={t('dashboard.decreaseIcon')} />
            }
            valueStyle={{ color: (model?.maxCoreUtil === null || (model?.maxCoreUtil ?? 0) > 1) ? colorBad : colorGood }}
          />
        </Col>
        <Col xs={24} sm={12} md={8} lg={6} xl={4}>
          <MetricCard
            title={t('dashboard.shortageMonths')}
            value={model?.shortageMonthCount ?? 0}
            suffix={`/ ${model?.monthlySummaries.length ?? 0}`}
            valueStyle={{ color: (model?.shortageMonthCount ?? 0) > 0 ? colorBad : colorGood }}
            extra={model?.worstMonth && <Text type="danger">{t('dashboard.peak')}: {model.worstMonth}</Text>}
          />
        </Col>
      </Row>

      {/* Yearly Capacity Health */}
      {model && model.yearlyHealth.length > 0 && (
        <SectionCard title={t('dashboard.yearlyHealth')}>
          <YearlyHealthMatrix rows={yearlyHealthRows} years={yearlyHealthYears} currencySettings={currencySettings} />
        </SectionCard>
      )}

      {/* BP Attainment Section */}
      {model && Object.keys(bpTargets).length > 0 && (() => {
        const bpModel = buildBpAnalysis(model.skuResults, [], model.monthlySummaries, bpTargets, currencySettings);
        const kpi = computeBpKpi(bpModel.yearly);

        // Columns: periods left-to-right
        const columns = [
          { title: '', dataIndex: 'metric', key: 'metric', width: 120, fixed: 'left' as const },
          ...bpModel.yearly.map((r: BpPeriodRecord) => ({
            title: r.period,
            dataIndex: r.period,
            key: r.period,
            width: 100,
            align: 'right' as const,
          })),
        ];

        // Typed row builder
        const buildRow = (
          label: string,
          getValue: (record: BpPeriodRecord) => React.ReactNode
        ): BpDashboardRow => {
          const row: BpDashboardRow = { metric: label };
          bpModel.yearly.forEach((record: BpPeriodRecord) => {
            row[record.period] = getValue(record);
          });
          return row;
        };

        const rows: BpDashboardRow[] = [
          buildRow(t('bp.target'), (r: BpPeriodRecord) => formatBpAmount(r.targetMillionTwd)),
          buildRow(t('bp.forecast'), (r: BpPeriodRecord) => formatBpAmount(r.forecastMillionTwd)),
          buildRow(t('bp.attainment'), (r: BpPeriodRecord) => {
            if (r.attainment === null) return '-';
            const pct = r.attainment * 100;
            return <Tag color={pct >= 100 ? 'green' : pct >= 80 ? 'orange' : 'red'}>{formatAttainment(r.attainment)}</Tag>;
          }),
          buildRow(t('bp.gap'), (r: BpPeriodRecord) => {
            if (r.gapMillionTwd === null) return '-';
            const colorType = r.gapMillionTwd >= 0 ? 'success' : 'danger';
            const text = r.gapMillionTwd > 0
              ? `+${r.gapMillionTwd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`
              : r.gapMillionTwd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            return <Text type={colorType}>{text}</Text>;
          }),
        ];

        return (
          <SectionCard title={t('bp.attainmentTitle')}>
            {/* BP KPI Cards — responsive breakpoints */}
            <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  title={t('bp.kpi.totalTarget')}
                  value={kpi.totalTargetMillionTwd ?? 0}
                  precision={1}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  title={t('bp.kpi.totalForecast')}
                  value={kpi.totalForecastMillionTwd}
                  precision={1}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  title={t('bp.kpi.overallAttainment')}
                  value={kpi.overallAttainment === null ? '-' : formatAttainment(kpi.overallAttainment)}
                  valueStyle={{
                    color: kpi.overallAttainment === null ? undefined : kpi.overallAttainment >= 1 ? colorGood : kpi.overallAttainment >= 0.8 ? colorWarn : colorBad,
                  }}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <MetricCard
                  title={t('bp.kpi.totalGap')}
                  value={kpi.totalGapMillionTwd === null ? '-' : (kpi.totalGapMillionTwd > 0 ? '+' : '') + kpi.totalGapMillionTwd.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  valueStyle={{
                    color: kpi.totalGapMillionTwd === null ? undefined : kpi.totalGapMillionTwd >= 0 ? colorGood : colorBad,
                  }}
                />
              </Col>
            </Row>
            <Table
              columns={columns}
              dataSource={rows}
              rowKey="metric"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              className="analysis-table"
            />
          </SectionCard>
        );
      })()}

      {/* Revenue Trend Chart — with ARIA label */}
      {model && model.monthlyRevenue.length > 0 && (
        <SectionCard title={t('dashboard.revenueTrendTitle')} extra={<LineChartOutlined aria-hidden="true" />}>
          {revenueChartData.length > 0 ? (
            <div role="img" aria-label={t('dashboard.revenueTrendAria')}>
              <Line
                data={revenueChartData}
                xField="month"
                yField="revenue"
                height={250}
                autoFit
                xAxis={{ label: { autoRotate: true } }}
                yAxis={{ label: { formatter: (v: any) => formatCurrencyShort(Number(v), currencySettings, (revenueChartData.length > 0 ? revenueChartData[0]?.month?.substring(0, 4) : undefined)) } }}
              />
            </div>
          ) : (
            <Text type="secondary">{t('dashboard.noRevenueData')}</Text>
          )}
        </SectionCard>
      )}

      {/* Utilization Trend Chart — with ARIA label */}
      {model && model.monthlyUtilization.length > 0 && (
        <SectionCard title={t('dashboard.utilTrendTitle')} extra={<LineChartOutlined aria-hidden="true" />}>
          <div role="img" aria-label={t('dashboard.utilTrendAria')}>
            <Line
              data={(() => {
                const data: Array<{ month: string; type: string; value: number }> = [];
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
          </div>
        </SectionCard>
      )}

      {/* Top Driver Snapshots — responsive breakpoints */}
      {model && (
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <SectionCard title={t('dashboard.revByCustomer')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.revenueByCustomer.slice(0, 5)}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => formatCurrency(v, currencySettings, model.yearlyHealth[0]?.year)}
              />
            </SectionCard>
          </Col>
          <Col xs={24} lg={8}>
            <SectionCard title={t('dashboard.coreBySize')} extra={<Link to="/results">{t('dashboard.viewDetail')}</Link>} size="small">
              <TimeMatrixTable
                rows={model.coreDemandBySize}
                timeColumns={model.yearlyHealth.map(y => y.year)}
                formatValue={(v) => v.toLocaleString()}
              />
            </SectionCard>
          </Col>
          <Col xs={24} lg={8}>
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
              <Text> <strong>{highlights.topSizeCategory}</strong> {t('dashboard.topSize')}</Text>
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
