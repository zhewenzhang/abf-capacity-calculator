import React from 'react';
import { Tag } from 'antd';

export type Severity = 'green' | 'orange' | 'red' | 'blue' | 'default';

export interface StatusTagProps {
  /** Display text */
  label: string;
  /** Severity level that maps to a color */
  severity?: Severity;
}

const COLOR_MAP: Record<Severity, string> = {
  green: 'green',
  orange: 'orange',
  red: 'red',
  blue: 'blue',
  default: 'default',
};

/**
 * Consistent status tag with severity-based coloring.
 * Used for utilization, bottleneck, and health indicators.
 */
export const StatusTag: React.FC<StatusTagProps> = ({ label, severity = 'default' }) => (
  <Tag color={COLOR_MAP[severity]}>{label}</Tag>
);

export default StatusTag;
