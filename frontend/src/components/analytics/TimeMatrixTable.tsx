import React from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export interface TimeMatrixRow {
  /** Row label (displayed text) */
  label: string;
  /** Metric type identifier for cell formatting (e.g. 'revenue', 'utilization', 'shortage', 'bottleneck', 'number') */
  metricType?: string;
  /** Time-period values */
  values: Record<string, number>;
}

export interface TimeMatrixTableProps {
  /** Row data with label and time-period values */
  rows: TimeMatrixRow[];
  /** Time column labels in display order */
  timeColumns: string[];
  /** Number formatter. Default: locale string */
  formatValue?: (val: number) => React.ReactNode;
  /** Label for the first column */
  rowLabel?: string;
}

export const TimeMatrixTable: React.FC<TimeMatrixTableProps> = ({
  rows,
  timeColumns,
  formatValue,
  rowLabel = 'Dimension',
}) => {
  const columns: ColumnsType<any> = [
    {
      title: rowLabel,
      dataIndex: 'label',
      key: 'label',
      width: 140,
      fixed: 'left',
      ellipsis: true,
    },
    ...timeColumns.map(col => ({
      title: col,
      dataIndex: col,
      key: col,
      width: 100,
      align: 'right' as const,
      render: (val: number | undefined) => {
        if (val === undefined || val === 0) return '-';
        if (formatValue) return formatValue(val);
        return val.toLocaleString();
      },
    })),
  ];

  // Transform rows to Ant Design data source
  const dataSource = rows.map(row => {
    const obj: Record<string, any> = { label: row.label, key: row.label };
    for (const col of timeColumns) {
      obj[col] = row.values[col] ?? 0;
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
      className="matrix-table"
    />
  );
};

export default TimeMatrixTable;
