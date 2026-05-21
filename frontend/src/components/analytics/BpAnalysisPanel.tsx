/**
 * BP Analysis Panel component for Results page.
 *
 * Displays:
 * 1. KPI summary row
 * 2. Overall BP matrix (metrics as rows, periods as columns)
 * 3. Customer contribution table
 * 4. SKU contribution table
 */

import React from 'react';
import { Card, Row, Col, Table, Tabs, Typography, Tag, Space } from 'antd';
import { useI18n } from '../../i18n';
import { MetricCard } from '../common';
import {
  type BpAnalysisModel,
  type BpPeriodMode,
  computeBpKpi,
  formatBpAmount,
  formatBpGap,
  formatAttainment,
  getStatusColor,
  getStatusKey,
} from '../../core/bpTargets';

const { Text } = Typography;

interface BpAnalysisPanelProps {
  model: BpAnalysisModel;
}

const BpAnalysisPanel: React.FC<BpAnalysisPanelProps> = ({ model }) => {
  const { t } = useI18n();

  // Mode: year | quarter | month
  const [mode, setMode] = React.useState<BpPeriodMode>('year');

  // Select data based on mode
  const records = mode === 'year' ? model.yearly : mode === 'quarter' ? model.quarterly : model.monthly;
  const customerData = mode === 'year' ? model.customerRevenueByYear : mode === 'quarter' ? model.customerRevenueByQuarter : model.customerRevenueByMonth;
  const skuData = mode === 'year' ? model.skuRevenueByYear : mode === 'quarter' ? model.skuRevenueByQuarter : model.skuRevenueByMonth;
  const kpi = computeBpKpi(records);

  // Overall BP matrix columns (periods left-to-right)
  const overallColumns = [
    { title: '', dataIndex: 'metric', key: 'metric', width: 120, fixed: 'left' as const },
    ...records.map(r => ({
      title: r.period,
      dataIndex: r.period,
      key: r.period,
      width: 110,
      align: 'right' as const,
    })),
  ];

  // Build metric rows
  const buildRow = (label: string, getValue: (r: any) => React.ReactNode) => {
    const row: any = { metric: label };
    records.forEach(r => { row[r.period] = getValue(r); });
    return row;
  };

  const overallRows = [
    buildRow(t('bp.target'), (r: any) => formatBpAmount(r.targetMillionTwd)),
    buildRow(t('bp.forecast'), (r: any) => formatBpAmount(r.forecastMillionTwd)),
    buildRow(t('bp.attainment'), (r: any) => {
      if (r.attainment === null) return '-';
      return <Tag color={getStatusColor(r.status)}>{formatAttainment(r.attainment)}</Tag>;
    }),
    buildRow(t('bp.gap'), (r: any) => {
      if (r.gapMillionTwd === null) return '-';
      const color = r.gapMillionTwd >= 0 ? 'success' : 'danger';
      return <Text type={color}>{formatBpGap(r.gapMillionTwd)}</Text>;
    }),
    buildRow(t('bp.status'), (r: any) => {
      if (r.status === 'no-target') return <Tag>{t('bp.statusNoTarget')}</Tag>;
      return <Tag color={getStatusColor(r.status)}>{t(getStatusKey(r.status))}</Tag>;
    }),
  ];

  // Customer contribution columns
  const customerColumns = [
    { title: t('products.customer'), dataIndex: 'label', key: 'label', width: 120, fixed: 'left' as const },
    ...records.map(r => ({
      title: r.period,
      dataIndex: r.period,
      key: r.period,
      width: 100,
      align: 'right' as const,
      render: (v: number) => formatBpAmount(v),
    })),
  ];

  const customerDataSource = customerData.map(row => {
    const d: any = { label: row.label };
    records.forEach(r => { d[r.period] = row.values[r.period] || 0; });
    return d;
  });

  // SKU contribution columns
  const skuColumns = [
    { title: t('products.skuCode'), dataIndex: 'label', key: 'label', width: 200, fixed: 'left' as const },
    ...records.map(r => ({
      title: r.period,
      dataIndex: r.period,
      key: r.period,
      width: 100,
      align: 'right' as const,
      render: (v: number) => formatBpAmount(v),
    })),
  ];

  const skuDataSource = skuData.map(row => {
    const d: any = { label: row.label };
    records.forEach(r => { d[r.period] = row.values[r.period] || 0; });
    return d;
  });

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {/* KPI Row */}
      <Row gutter={[12, 12]}>
        <Col span={6}>
          <MetricCard
            title={t('bp.kpi.totalTarget')}
            value={kpi.totalTargetMillionTwd ?? 0}
            precision={1}
            suffix={kpi.totalTargetMillionTwd === null ? '' : t('bp.millionTwd')}
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title={t('bp.kpi.totalForecast')}
            value={kpi.totalForecastMillionTwd}
            precision={1}
            suffix={t('bp.millionTwd')}
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title={t('bp.kpi.overallAttainment')}
            value={kpi.overallAttainment === null ? '-' : formatAttainment(kpi.overallAttainment)}
            valueStyle={{
              color: kpi.overallAttainment === null ? undefined : kpi.overallAttainment >= 1 ? '#52c41a' : kpi.overallAttainment >= 0.8 ? '#faad14' : '#ff4d4f',
            }}
          />
        </Col>
        <Col span={6}>
          <MetricCard
            title={t('bp.kpi.totalGap')}
            value={kpi.totalGapMillionTwd === null ? '-' : formatBpGap(kpi.totalGapMillionTwd)}
            valueStyle={{
              color: kpi.totalGapMillionTwd === null ? undefined : kpi.totalGapMillionTwd >= 0 ? '#52c41a' : '#ff4d4f',
            }}
          />
        </Col>
      </Row>

      {/* Mode Switch + Overall Matrix */}
      <Card title={t('bp.analysis')} size="small">
        <Tabs
          items={[
            { key: 'year', label: t('bp.yearView'), children: null },
            { key: 'quarter', label: t('bp.quarterView'), children: null },
            { key: 'month', label: t('bp.monthView'), children: null },
          ]}
          activeKey={mode}
          onChange={v => setMode(v as BpPeriodMode)}
          size="small"
          tabBarStyle={{ marginBottom: 12 }}
        />
        <Table
          columns={overallColumns}
          dataSource={overallRows}
          rowKey="metric"
          size="small"
          pagination={false}
          scroll={{ x: 'max-content' }}
          className="analysis-table"
        />
      </Card>

      {/* Customer Contribution */}
      {customerData.length > 0 && (
        <Card title={t('bp.customerContribution')} size="small">
          <Table
            columns={customerColumns}
            dataSource={customerDataSource}
            rowKey="label"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            className="analysis-table"
          />
        </Card>
      )}

      {/* SKU Contribution */}
      {skuData.length > 0 && (
        <Card title={t('bp.skuContribution')} size="small">
          <Table
            columns={skuColumns}
            dataSource={skuDataSource}
            rowKey="label"
            size="small"
            pagination={false}
            scroll={{ x: 'max-content' }}
            className="analysis-table"
          />
        </Card>
      )}
    </Space>
  );
};

export default BpAnalysisPanel;
