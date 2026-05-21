import React from 'react';
import { Card } from 'antd';
import type { CardProps } from 'antd';

export interface SectionCardProps extends Omit<CardProps, 'title'> {
  /** Section title */
  title?: React.ReactNode;
  /** Extra content in the title bar (e.g., link, button) */
  extra?: React.ReactNode;
}

/**
 * Wrapper around Ant Design Card for page sections.
 * Provides consistent title spacing, margin, and size.
 */
export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  extra,
  children,
  className = '',
  size = 'small',
  style,
  ...rest
}) => (
  <Card
    title={title}
    extra={extra}
    size={size}
    className={`section-card ${className}`.trim()}
    style={{ marginTop: 16, ...style }}
    {...rest}
  >
    {children}
  </Card>
);

export default SectionCard;
