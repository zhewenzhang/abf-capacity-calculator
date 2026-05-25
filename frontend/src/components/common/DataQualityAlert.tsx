import React from 'react';
import { Alert, Tooltip } from 'antd';
import type { DataQualityIssue, DataQualitySeverity } from '../../core/dataQuality';
import { useI18n } from '../../i18n';

export interface DataQualityAlertProps {
  /** List of DQ issues to display */
  issues: DataQualityIssue[];
  /** Filter to show only specific severity levels */
  severityFilter?: DataQualitySeverity[];
  /** Maximum number of issues to display */
  maxIssues?: number;
  /** Additional CSS class */
  className?: string;
  /** Whether to show as a compact inline alert */
  compact?: boolean;
}

/**
 * Renders a page-level or section-level Alert for DQ issues.
 * Used at the top of input pages to summarize data quality problems.
 */
export const DataQualityAlert: React.FC<DataQualityAlertProps> = ({
  issues,
  severityFilter,
  maxIssues = 5,
  className = 'abf-alert-page',
  compact = false,
}) => {
  const { t } = useI18n();

  const filteredIssues = severityFilter
    ? issues.filter((i) => severityFilter.includes(i.severity))
    : issues;

  if (filteredIssues.length === 0) return null;

  // Determine overall alert type based on highest severity
  const hasErrors = filteredIssues.some((i) => i.severity === 'error');
  const hasWarnings = filteredIssues.some((i) => i.severity === 'warning');
  const alertType: 'error' | 'warning' | 'info' = hasErrors ? 'error' : hasWarnings ? 'warning' : 'info';

  const visibleIssues = filteredIssues.slice(0, maxIssues);
  const remaining = filteredIssues.length - maxIssues;

  const message = compact ? (
    <span>
      {visibleIssues.length === 1
        ? t(visibleIssues[0].titleMessage.key, visibleIssues[0].titleMessage.params as Record<string, string | number>)
        : `${filteredIssues.length} data quality issue(s)`}
    </span>
  ) : (
    <span>
      {filteredIssues.length === 1
        ? t(visibleIssues[0].titleMessage.key, visibleIssues[0].titleMessage.params as Record<string, string | number>)
        : `${filteredIssues.length} data quality issue(s) found`}
    </span>
  );

  const description = compact ? undefined : (
    <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
      {visibleIssues.map((issue) => (
        <li key={issue.id}>
          {t(issue.detailMessage.key, issue.detailMessage.params as Record<string, string | number>)}
        </li>
      ))}
      {remaining > 0 && (
        <li style={{ color: '#999' }}>+{remaining} more issue(s)</li>
      )}
    </ul>
  );

  return (
    <Alert
      type={alertType}
      showIcon
      message={message}
      description={description}
      className={className}
    />
  );
};

/**
 * Renders a compact inline indicator for DQ issues.
 * Useful for showing issue count in headers or toolbars.
 */
export const DataQualityIndicator: React.FC<{
  issues: DataQualityIssue[];
  label?: string;
}> = ({ issues, label }) => {
  if (issues.length === 0) return null;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  const tooltipContent = (
    <div>
      {errorCount > 0 && <div style={{ color: '#ff4d4f' }}>{errorCount} error(s)</div>}
      {warningCount > 0 && <div style={{ color: '#faad14' }}>{warningCount} warning(s)</div>}
    </div>
  );

  const color = errorCount > 0 ? '#ff4d4f' : warningCount > 0 ? '#faad14' : '#1677ff';

  return (
    <Tooltip title={tooltipContent}>
      <span style={{ marginLeft: 8, color, fontSize: 13 }}>
        {label ?? `${issues.length} issue(s)`}
      </span>
    </Tooltip>
  );
};

export default DataQualityAlert;
