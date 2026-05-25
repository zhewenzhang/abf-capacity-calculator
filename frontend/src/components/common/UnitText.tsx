import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

export interface UnitTextProps {
  /** Unit text to display (e.g., "Million TWD", "PCS", "mm") */
  children: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Additional inline styles */
  style?: React.CSSProperties;
  /** Whether to show with parentheses (default: true) */
  parentheses?: boolean;
}

/**
 * Consistent unit text styling for labels and values.
 * Displays smaller, muted text for unit indicators.
 *
 * Usage:
 * <UnitText>Million TWD</UnitText>
 * <UnitText parentheses={false}>mm</UnitText>
 */
export const UnitText: React.FC<UnitTextProps> = ({
  children,
  className = '',
  style,
  parentheses = true,
}) => (
  <Text
    className={`abf-text-unit ${className}`.trim()}
    style={{ fontSize: 12, color: 'rgba(0, 0, 0, 0.45)', marginLeft: 4, ...style }}
  >
    {parentheses ? `(${children})` : children}
  </Text>
);

export default UnitText;
