import { describe, it, expect } from 'vitest';
import {
  filterIssuesByDomain,
  filterIssuesByDomains,
  findIssueBySkuId,
  findIssueAffectingSku,
  findAllIssuesAffectingSku,
  findIssueByYear,
  hasIssueWithPrefix,
  getAffectedPeriods,
  countBySeverity,
  hasErrors,
  hasWarnings,
  groupIssuesBySkuId,
} from './dataQualityVisibility';
import type { DataQualityIssue, DataQualitySummary } from './dataQuality';

function makeIssue(
  id: string,
  domain: DataQualityIssue['domain'],
  severity: DataQualityIssue['severity'] = 'error',
  affectedSkuIds?: string[],
  affectedPeriods?: string[]
): DataQualityIssue {
  return {
    id,
    severity,
    domain,
    title: `Title for ${id}`,
    detail: `Detail for ${id}`,
    titleMessage: { key: `title.${id}` },
    detailMessage: { key: `detail.${id}` },
    affectedSkuIds,
    affectedPeriods,
  };
}

describe('dataQualityVisibility', () => {
  const issues: DataQualityIssue[] = [
    makeIssue('sku-missing-attr-sku1', 'products', 'error', ['sku1']),
    makeIssue('sku-zero-price-sku2', 'products', 'warning', ['sku2']),
    makeIssue('forecast-orphan-sku-fc1', 'forecast', 'error'),
    makeIssue('forecast-partial-year-sku3-2026', 'forecast', 'warning', ['sku3'], ['2026']),
    makeIssue('missing-constant-twd-rate', 'currency', 'error'),
    makeIssue('bp-target-zero-forecast-2027', 'bp', 'warning', undefined, ['2027']),
  ];

  const summary: DataQualitySummary = {
    status: 'error',
    confidence: 'medium',
    confidenceScore: 70,
    issues,
  };

  describe('filterIssuesByDomain', () => {
    it('filters issues by single domain', () => {
      const result = filterIssuesByDomain(summary, 'products');
      expect(result).toHaveLength(2);
      expect(result.every((i) => i.domain === 'products')).toBe(true);
    });

    it('returns empty array for domain with no issues', () => {
      const result = filterIssuesByDomain(summary, 'capacity');
      expect(result).toHaveLength(0);
    });
  });

  describe('filterIssuesByDomains', () => {
    it('filters issues by multiple domains', () => {
      const result = filterIssuesByDomains(summary, ['products', 'forecast']);
      expect(result).toHaveLength(4);
    });
  });

  describe('findIssueBySkuId', () => {
    it('finds issue by SKU ID with prefix', () => {
      const result = findIssueBySkuId(issues, 'sku1', 'sku-missing-attr');
      expect(result?.id).toBe('sku-missing-attr-sku1');
    });

    it('returns undefined if not found', () => {
      const result = findIssueBySkuId(issues, 'sku999', 'sku-missing-attr');
      expect(result).toBeUndefined();
    });
  });

  describe('findIssueAffectingSku', () => {
    it('finds issue affecting a specific SKU', () => {
      const result = findIssueAffectingSku(issues, 'sku2');
      expect(result?.id).toBe('sku-zero-price-sku2');
    });
  });

  describe('findAllIssuesAffectingSku', () => {
    it('finds all issues affecting a SKU', () => {
      const multiIssues = [
        ...issues,
        makeIssue('sku-zero-price-sku1', 'products', 'warning', ['sku1']),
      ];
      const result = findAllIssuesAffectingSku(multiIssues, 'sku1');
      expect(result).toHaveLength(2);
    });
  });

  describe('findIssueByYear', () => {
    it('finds issue by year prefix', () => {
      const result = findIssueByYear(issues, '2027', 'bp-target-zero-forecast');
      expect(result?.id).toBe('bp-target-zero-forecast-2027');
    });
  });

  describe('hasIssueWithPrefix', () => {
    it('returns true if any issue starts with prefix', () => {
      expect(hasIssueWithPrefix(issues, 'sku-')).toBe(true);
      expect(hasIssueWithPrefix(issues, 'nonexistent-')).toBe(false);
    });
  });

  describe('getAffectedPeriods', () => {
    it('returns affected periods for matching issue', () => {
      const result = getAffectedPeriods(issues, 'forecast-partial-year');
      expect(result).toEqual(['2026']);
    });

    it('returns empty array if no matching issue', () => {
      const result = getAffectedPeriods(issues, 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('countBySeverity', () => {
    it('counts issues by severity', () => {
      expect(countBySeverity(issues, 'error')).toBe(3);
      expect(countBySeverity(issues, 'warning')).toBe(3);
      expect(countBySeverity(issues, 'info')).toBe(0);
    });
  });

  describe('hasErrors', () => {
    it('returns true if any error exists', () => {
      expect(hasErrors(issues)).toBe(true);
      expect(hasErrors(issues.filter((i) => i.severity === 'warning'))).toBe(false);
    });
  });

  describe('hasWarnings', () => {
    it('returns true if any warning exists', () => {
      expect(hasWarnings(issues)).toBe(true);
    });
  });

  describe('groupIssuesBySkuId', () => {
    it('groups issues by SKU ID', () => {
      const result = groupIssuesBySkuId(issues);
      expect(result.get('sku1')).toHaveLength(1);
      expect(result.get('sku2')).toHaveLength(1);
      expect(result.get('sku3')).toHaveLength(1);
    });
  });
});
