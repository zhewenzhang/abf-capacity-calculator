import React from 'react';
import { Card, Statistic } from 'antd';
import type { StatisticProps } from 'antd';

export interface MetricCardProps {
  /** Card title */
  title: React.ReactNode;
  /** Numeric value */
  value: StatisticProps['value'];
  /** Optional icon shown before the value */
  prefix?: StatisticProps['prefix'];
  /** Suffix shown after the value (e.g., '%') */
  suffix?: StatisticProps['suffix'];
  /** Decimal precision */
  precision?: number;
  /** Value text color (e.g., '#cf1322' for danger) */
  valueStyle?: React.CSSProperties;
  /** Extra content below the value */
  extra?: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Consistent KPI/metric card used in Dashboard and Results.
 * Ensures equal height, standard typography, and predictable spacing.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  precision,
  valueStyle,
  extra,
  className = '',
}) => (
  <Card className={`stat-card dashboard-kpi-card ${className}`.trim()}>
    <Statistic
      title={title}
      value={value}
      prefix={prefix}
      suffix={suffix}
      precision={precision}
      valueStyle={valueStyle}
    />
    {extra}
  </Card>
);

export default MetricCard;
