/**
 * Data Quality Visibility Helper
 *
 * Provides filtered views of DataQualitySummary for individual input pages.
 * Each page can use these helpers to extract relevant issues without
 * duplicating DQ detection logic.
 *
 * IMPORTANT: This module does NOT modify any data. It only filters and
 * organizes existing DQ issues for UI rendering.
 */
import type { DataQualitySummary, DataQualityIssue, DataQualityDomain } from './dataQuality';

/**
 * Filter issues by domain.
 */
export function filterIssuesByDomain(
  summary: DataQualitySummary,
  domain: DataQualityDomain
): DataQualityIssue[] {
  return summary.issues.filter((i) => i.domain === domain);
}

/**
 * Filter issues by multiple domains.
 */
export function filterIssuesByDomains(
  summary: DataQualitySummary,
  domains: DataQualityDomain[]
): DataQualityIssue[] {
  return summary.issues.filter((i) => domains.includes(i.domain));
}

/**
 * Find issue by SKU ID.
 * Returns the first issue that matches the SKU ID prefix pattern.
 */
export function findIssueBySkuId(
  issues: DataQualityIssue[],
  skuId: string,
  prefix: string
): DataQualityIssue | undefined {
  return issues.find((i) => i.id === `${prefix}-${skuId}`);
}

/**
 * Find issue by SKU ID pattern (checks affectedSkuIds array).
 */
export function findIssueAffectingSku(
  issues: DataQualityIssue[],
  skuId: string
): DataQualityIssue | undefined {
  return issues.find((i) => i.affectedSkuIds?.includes(skuId));
}

/**
 * Find all issues affecting a specific SKU.
 */
export function findAllIssuesAffectingSku(
  issues: DataQualityIssue[],
  skuId: string
): DataQualityIssue[] {
  return issues.filter((i) => i.affectedSkuIds?.includes(skuId));
}

/**
 * Find issue by forecast ID.
 */
export function findIssueByForecastId(
  issues: DataQualityIssue[],
  forecastId: string,
  prefix: string
): DataQualityIssue | undefined {
  return issues.find((i) => i.id === `${prefix}-${forecastId}`);
}

/**
 * Find issue by SKU ID and year (for partial year checks).
 */
export function findIssueBySkuYear(
  issues: DataQualityIssue[],
  skuId: string,
  year: string
): DataQualityIssue | undefined {
  return issues.find((i) => i.id === `forecast-partial-year-${skuId}-${year}`);
}

/**
 * Find issue by year (for BP target checks).
 */
export function findIssueByYear(
  issues: DataQualityIssue[],
  year: string,
  prefix: string
): DataQualityIssue | undefined {
  return issues.find((i) => i.id === `${prefix}-${year}`);
}

/**
 * Check if there are any issues with a specific ID prefix.
 */
export function hasIssueWithPrefix(
  issues: DataQualityIssue[],
  prefix: string
): boolean {
  return issues.some((i) => i.id.startsWith(prefix));
}

/**
 * Get all affected periods from issues with a specific prefix.
 */
export function getAffectedPeriods(
  issues: DataQualityIssue[],
  prefix: string
): string[] {
  const issue = issues.find((i) => i.id.startsWith(prefix));
  return issue?.affectedPeriods ?? [];
}

/**
 * Count issues by severity.
 */
export function countBySeverity(
  issues: DataQualityIssue[],
  severity: 'error' | 'warning' | 'info'
): number {
  return issues.filter((i) => i.severity === severity).length;
}

/**
 * Check if any error-level issues exist.
 */
export function hasErrors(issues: DataQualityIssue[]): boolean {
  return issues.some((i) => i.severity === 'error');
}

/**
 * Check if any warning-level issues exist.
 */
export function hasWarnings(issues: DataQualityIssue[]): boolean {
  return issues.some((i) => i.severity === 'warning');
}

/**
 * Group issues by a specific field.
 * Useful for grouping by affectedSkuIds or affectedPeriods.
 */
export function groupIssuesBy<T extends string>(
  issues: DataQualityIssue[],
  keyFn: (issue: DataQualityIssue) => T | undefined
): Map<T, DataQualityIssue[]> {
  const map = new Map<T, DataQualityIssue[]>();
  for (const issue of issues) {
    const key = keyFn(issue);
    if (key) {
      const arr = map.get(key) ?? [];
      arr.push(issue);
      map.set(key, arr);
    }
  }
  return map;
}

/**
 * Group issues by affected SKU ID.
 */
export function groupIssuesBySkuId(
  issues: DataQualityIssue[]
): Map<string, DataQualityIssue[]> {
  const map = new Map<string, DataQualityIssue[]>();
  for (const issue of issues) {
    for (const skuId of issue.affectedSkuIds ?? []) {
      const arr = map.get(skuId) ?? [];
      arr.push(issue);
      map.set(skuId, arr);
    }
  }
  return map;
}
