import React from 'react';
import { Tooltip } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { DataQualitySeverity, DataQualityIssue } from '../../core/dataQuality';
import { useI18n } from '../../i18n';

export interface DataQualityBadgeProps {
  /** Severity level of the issue */
  severity: DataQualitySeverity;
  /** Tooltip message (already translated) */
  message: React.ReactNode;
  /** Additional CSS class */
  className?: string;
  /** Size of the icon */
  size?: number;
  /** Style variant */
  variant?: 'icon' | 'dot';
}

/**
 * Renders a small DQ indicator icon with a tooltip.
 * Used inline in table cells to indicate data quality issues.
 */
export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({
  severity,
  message,
  className = '',
  size = 14,
  variant = 'icon',
}) => {
  const iconProps = {
    style: { fontSize: size },
    className,
  };

  const renderIcon = () => {
    if (variant === 'dot') {
      const dotColor =
        severity === 'error'
          ? '#ff4d4f'
          : severity === 'warning'
            ? '#faad14'
            : '#1677ff';
      return (
        <span
          style={{
            display: 'inline-block',
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: dotColor,
            ...iconProps.style,
          }}
          className={className}
        />
      );
    }

    switch (severity) {
      case 'error':
        return <ExclamationCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#ff4d4f' }} />;
      case 'warning':
        return <WarningOutlined {...iconProps} style={{ ...iconProps.style, color: '#faad14' }} />;
      case 'info':
        return <InfoCircleOutlined {...iconProps} style={{ ...iconProps.style, color: '#1677ff' }} />;
    }
  };

  return (
    <Tooltip title={message}>
      <span style={{ marginLeft: 4, cursor: 'help' }}>{renderIcon()}</span>
    </Tooltip>
  );
};

/**
 * Renders DQ badges for a list of issues.
 * Shows icons for each unique severity with combined tooltip.
 */
export const DataQualityBadgeList: React.FC<{
  issues: DataQualityIssue[];
  maxVisible?: number;
}> = ({ issues, maxVisible = 3 }) => {
  const { t } = useI18n();

  if (issues.length === 0) return null;

  const visibleIssues = issues.slice(0, maxVisible);
  const remaining = issues.length - maxVisible;

  // Get highest severity
  const getHighestSeverity = (): DataQualitySeverity => {
    if (issues.some((i) => i.severity === 'error')) return 'error';
    if (issues.some((i) => i.severity === 'warning')) return 'warning';
    return 'info';
  };

  const tooltipContent = (
    <div>
      {visibleIssues.map((issue) => (
        <div key={issue.id} style={{ marginBottom: 4 }}>
          {t(issue.detailMessage.key, issue.detailMessage.params as Record<string, string | number>)}
        </div>
      ))}
      {remaining > 0 && (
        <div style={{ color: '#999' }}>+{remaining} more</div>
      )}
    </div>
  );

  return (
    <DataQualityBadge
      severity={getHighestSeverity()}
      message={tooltipContent}
    />
  );
};

export default DataQualityBadge;
