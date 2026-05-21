import React from 'react';
import { Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TimeMatrixRow } from './TimeMatrixTable';
import type { CurrencySettings } from '../../core/currency';
import { formatCurrency } from '../../core/currency';

const { Text } = Typography;

export interface YearlyHealthMatrixProps {
  rows: TimeMatrixRow[];
  years: string[];
  currencySettings: CurrencySettings;
}

/**
 * Yearly Health Matrix: metrics as rows, years as columns (left-to-right).
 * Supports severity-aware cell coloring for utilization, shortage, bottleneck.
 */
export const YearlyHealthMatrix: React.FC<YearlyHealthMatrixProps> = ({ rows, years, currencySettings }) => {
  const fmtCellValue = (metricType: string | undefined, val: number, year: string): React.ReactNode => {
    if (metricType === 'revenue') {
      return formatCurrency(val, currencySettings, year);
    }
    if (metricType === 'utilization') {
      if (val >= 999) return <Tag color="red">Over</Tag>;
      if (val > 100) return <Tag color="red">{val.toFixed(1)}%</Tag>;
      if (val >= 85) return <Tag color="orange">{val.toFixed(1)}%</Tag>;
      return <Tag color="green">{val.toFixed(1)}%</Tag>;
    }
    if (metricType === 'bottleneck') {
      if (val === 0) return <Tag color="green">None</Tag>;
      if (val === 1) return <Tag color="orange">Core</Tag>;
      return <Tag color="red">BU</Tag>;
    }
    if (metricType === 'shortage') {
      if (val > 0) return <Text type="danger">{val}</Text>;
      return '0';
    }
    return val.toLocaleString();
  };

  const columns: ColumnsType<any> = [
    {
      title: 'Metric',
      dataIndex: 'label',
      key: 'label',
      width: 140,
      fixed: 'left',
      ellipsis: true,
    },
    ...years.map(year => ({
      title: year,
      dataIndex: year,
      key: year,
      width: 110,
      align: 'right' as const,
      render: (val: number | undefined, r: any) => {
        const mt = r.metricType as string | undefined;
        if (val === undefined || val === 0) {
          if (mt === 'utilization') return '-';
          if (mt === 'bottleneck') return <Tag color="green">None</Tag>;
          if (mt === 'shortage') return '0';
          return '-';
        }
        return fmtCellValue(mt, val, year);
      },
    })),
  ];

  const dataSource = rows.map(row => {
    const obj: Record<string, any> = { label: row.label, key: row.label, metricType: row.metricType };
    for (const year of years) {
      obj[year] = row.values[year] ?? 0;
    }
    return obj;
  });

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="key"
      size="small"
      pagination={false}
      scroll={{ x: 'max-content' }}
      className="analysis-table"
    />
  );
};

export default YearlyHealthMatrix;
