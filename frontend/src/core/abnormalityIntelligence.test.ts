/**
 * Tests for abnormalityIntelligence.ts (v1.43)
 *
 * Covers:
 * 1. Empty input -- returns empty ranked list
 * 2. Single high-impact DQ issue -- ranks correctly with high score
 * 3. Multiple issues across domains -- sorts by composite score
 * 4. Evidence citation -- all high-severity issues have structured evidence
 * 5. "Why this matters" narrative -- generates non-empty string for critical issues
 * 6. Domain weights -- capacity issues score higher than scenario issues with same base
 * 7. Array cap -- never returns more than 20 items
 * 8. mustActToday -- top 3 by score
 * 9. Determinism -- same input produces same output
 * 10. Taxonomy mapping -- each DQ issue ID maps to a valid business category
 */

import { describe, it, expect } from 'vitest';
import {
  buildAbnormalityIntelligence,
  ABNORMALITY_TAXONOMY,
  type AbnormalityIntelligenceInput,
  type AbnormalityCategory,
} from './abnormalityIntelligence';
import type { DataQualitySummary, DataQualityIssue } from './dataQuality';
import type { AbnormalityInsight } from './workbench';

// ============================================================
// Test Helpers
// ============================================================

function makeDqIssue(overrides: Partial<DataQualityIssue> & { id: string }): DataQualityIssue {
  return {
    severity: 'warning',
    domain: 'products',
    title: 'Test Issue',
    detail: 'Test detail',
    titleMessage: { key: 'test.title' },
    detailMessage: { key: 'test.detail' },
    decisionImpact: 'medium',
    ...overrides,
  };
}

function makeDqSummary(issues: DataQualityIssue[]): DataQualitySummary {
  return {
    status: issues.some(i => i.severity === 'error') ? 'error' : 'warning',
    confidence: 'medium',
    confidenceScore: 50,
    issues,
  };
}

function makeInput(
  abnormalities: AbnormalityInsight[],
  dqSummary?: DataQualitySummary,
): AbnormalityIntelligenceInput {
  return {
    abnormalities,
    dqSummary: dqSummary ?? makeDqSummary([]),
    currentDate: new Date('2026-05-28'),
  };
}

// ============================================================
// Test 1: Empty input
// ============================================================

describe('buildAbnormalityIntelligence', () => {
  it('returns empty ranked list for empty input', () => {
    const result = buildAbnormalityIntelligence(makeInput([]));
    expect(result.ranked).toEqual([]);
    expect(result.mustActToday).toEqual([]);
    expect(result.summary.total).toBe(0);
    expect(result.summary.blocking).toBe(0);
    expect(result.summary.topCategory).toBeNull();
  });

  // ============================================================
  // Test 2: Single high-impact DQ issue
  // ============================================================

  it('ranks a single high-impact critical DQ issue with a high score', () => {
    const insight: AbnormalityInsight = {
      domain: 'data',
      severity: 'critical',
      title: 'Missing SKU Attributes',
      detail: 'SKU TEST-001 has missing attributes',
      evidence: { issueId: 'sku-missing-attr-test', skuCode: 'TEST-001', missingCount: 3 },
      sourcePage: '/products',
      recommendedAction: 'workbench.abnormality.data.fix',
    };

    const dqIssue = makeDqIssue({
      id: 'sku-missing-attr-test',
      severity: 'error',
      domain: 'products',
      decisionImpact: 'high',
    });

    const result = buildAbnormalityIntelligence(makeInput([insight], makeDqSummary([dqIssue])));

    expect(result.ranked).toHaveLength(1);
    expect(result.ranked[0].severityScore).toBeGreaterThanOrEqual(80);
    expect(result.ranked[0].impactCategory).toBe('blocking');
    expect(result.ranked[0].taxonomyType).not.toBeNull();
    expect(result.ranked[0].taxonomyType?.category).toBe('data-integrity');
  });

  // ============================================================
  // Test 3: Multiple issues across domains -- sorted by score
  // ============================================================

  it('sorts multiple issues across domains by composite severity score', () => {
    const insights: AbnormalityInsight[] = [
      {
        domain: 'sales',
        severity: 'info',
        title: 'Top customer: CustomerA',
        detail: 'Customer concentration may be high',
        evidence: { topCustomer: 'CustomerA' },
        sourcePage: '/dashboard',
        recommendedAction: 'test.action',
      },
      {
        domain: 'capacity',
        severity: 'critical',
        title: 'Capacity shortage in 2026-07',
        detail: 'Shortage detected',
        evidence: { month: '2026-07', coreShortage: 500, buShortage: 200, bottleneck: 'Core' },
        sourcePage: '/capacity',
        recommendedAction: 'test.action',
      },
      {
        domain: 'bp',
        severity: 'critical',
        title: 'BP target missed: 2026',
        detail: 'Attainment 65%',
        evidence: { period: '2026', target: 100, forecast: 65, attainment: 0.65, gap: -35 },
        sourcePage: '/bp-targets',
        recommendedAction: 'test.action',
      },
    ];

    const result = buildAbnormalityIntelligence(makeInput(insights));

    expect(result.ranked).toHaveLength(3);
    // Verify descending order
    for (let i = 1; i < result.ranked.length; i++) {
      expect(result.ranked[i - 1].severityScore).toBeGreaterThanOrEqual(result.ranked[i].severityScore);
    }
    // The capacity critical should score higher than sales info
    const capacityRank = result.ranked.findIndex(r => r.insight.domain === 'capacity');
    const salesRank = result.ranked.findIndex(r => r.insight.domain === 'sales');
    expect(capacityRank).toBeLessThan(salesRank);
  });

  // ============================================================
  // Test 4: Evidence citation -- high-severity issues have structured evidence
  // ============================================================

  it('attaches structured evidence citations to high-severity issues', () => {
    const insight: AbnormalityInsight = {
      domain: 'capacity',
      severity: 'critical',
      title: 'Capacity shortage in 2026-07',
      detail: 'Shortage detected',
      evidence: {
        month: '2026-07',
        coreShortage: 500,
        buShortage: 200,
        bottleneck: 'Core',
        coreUtilization: 1.15,
        buUtilization: 1.08,
      },
      sourcePage: '/capacity',
      recommendedAction: 'test.action',
    };

    const result = buildAbnormalityIntelligence(makeInput([insight]));

    expect(result.ranked).toHaveLength(1);
    const citations = result.ranked[0].citations;
    expect(citations.length).toBeGreaterThan(0);

    // Check that citations have required fields
    for (const citation of citations) {
      expect(citation.metric).toBeTruthy();
      expect(citation.value).toBeDefined();
      expect(citation.unit).toBeTruthy();
      expect(citation.source).toBeTruthy();
    }

    // Check specific citations exist
    const monthCitation = citations.find(c => c.period === '2026-07');
    expect(monthCitation).toBeDefined();
    const shortageCitation = citations.find(c => c.metric === 'Core Shortage');
    expect(shortageCitation).toBeDefined();
    expect(shortageCitation?.value).toBe(500);
  });

  // ============================================================
  // Test 5: "Why this matters" narrative
  // ============================================================

  it('generates non-empty "why it matters" narrative for critical issues', () => {
    const insight: AbnormalityInsight = {
      domain: 'data',
      severity: 'critical',
      title: 'Missing SKU Attributes',
      detail: 'SKU TEST-001 has missing attributes',
      evidence: { issueId: 'sku-missing-attr-test', skuCode: 'TEST-001', missingCount: 3 },
      sourcePage: '/products',
      recommendedAction: 'test.action',
    };

    const result = buildAbnormalityIntelligence(makeInput([insight]));

    expect(result.ranked).toHaveLength(1);
    const narrative = result.ranked[0].whyItMatters;
    expect(narrative).toBeTruthy();
    expect(narrative.length).toBeGreaterThan(0);
    // Should contain severity and domain references
    expect(narrative).toContain('critical');
    expect(narrative).toContain('data');
    // Should contain consequence
    expect(narrative).toContain('If not resolved');
  });

  // ============================================================
  // Test 6: Domain weights
  // ============================================================

  it('scores capacity issues higher than scenario issues with the same base severity', () => {
    const insights: AbnormalityInsight[] = [
      {
        domain: 'capacity',
        severity: 'warning',
        title: 'Over-capacity in 2026-08',
        detail: 'Utilization exceeds 100%',
        evidence: { month: '2026-08', coreUtilization: 1.05 },
        sourcePage: '/capacity',
        recommendedAction: 'test.action',
      },
      {
        domain: 'scenario',
        severity: 'warning',
        title: 'Scenario warning',
        detail: 'Scenario detail',
        evidence: {},
        sourcePage: '/scenario',
        recommendedAction: 'test.action',
      },
    ];

    const result = buildAbnormalityIntelligence(makeInput(insights));

    expect(result.ranked).toHaveLength(2);
    const capacityScore = result.ranked.find(r => r.insight.domain === 'capacity')!.severityScore;
    const scenarioScore = result.ranked.find(r => r.insight.domain === 'scenario')!.severityScore;
    expect(capacityScore).toBeGreaterThan(scenarioScore);
    // Verify the weight difference: capacity 1.1 vs scenario 0.8
    // Base 50 * 1.1 = 55 vs 50 * 0.8 = 40
    expect(capacityScore).toBeCloseTo(55, 1);
    expect(scenarioScore).toBeCloseTo(40, 1);
  });

  // ============================================================
  // Test 7: Array cap -- never more than 20
  // ============================================================

  it('never returns more than 20 ranked abnormalities', () => {
    // Create 25 insights
    const insights: AbnormalityInsight[] = Array.from({ length: 25 }, (_, i) => ({
      domain: 'data' as const,
      severity: 'warning' as const,
      title: `Insight ${i}`,
      detail: `Detail ${i}`,
      evidence: {},
      sourcePage: '/test',
      recommendedAction: 'test.action',
    }));

    const result = buildAbnormalityIntelligence(makeInput(insights));

    expect(result.ranked.length).toBeLessThanOrEqual(20);
    expect(result.summary.total).toBeLessThanOrEqual(20);
  });

  // ============================================================
  // Test 8: mustActToday -- top 3 by score
  // ============================================================

  it('selects top 3 by score as mustActToday', () => {
    const insights: AbnormalityInsight[] = [
      {
        domain: 'data',
        severity: 'info',
        title: 'Info issue',
        detail: 'Info detail',
        evidence: {},
        sourcePage: '/test',
        recommendedAction: 'test.action',
      },
      {
        domain: 'capacity',
        severity: 'critical',
        title: 'Capacity shortage in 2026-07',
        detail: 'Shortage',
        evidence: { month: '2026-07', coreShortage: 500, buShortage: 200, bottleneck: 'Core' },
        sourcePage: '/capacity',
        recommendedAction: 'test.action',
      },
      {
        domain: 'bp',
        severity: 'critical',
        title: 'BP target missed: 2026',
        detail: 'Miss',
        evidence: { period: '2026', target: 100, forecast: 65, attainment: 0.65, gap: -35 },
        sourcePage: '/bp-targets',
        recommendedAction: 'test.action',
      },
      {
        domain: 'sales',
        severity: 'warning',
        title: 'Revenue trend declining',
        detail: 'Trend down',
        evidence: { revenueTrend: 'down' },
        sourcePage: '/dashboard',
        recommendedAction: 'test.action',
      },
      {
        domain: 'data',
        severity: 'warning',
        title: 'Partial year forecast',
        detail: 'Partial',
        evidence: {},
        sourcePage: '/forecasts',
        recommendedAction: 'test.action',
      },
    ];

    const result = buildAbnormalityIntelligence(makeInput(insights));

    expect(result.mustActToday).toHaveLength(3);
    // Verify mustActToday items are the top 3 from ranked
    for (let i = 0; i < 3; i++) {
      expect(result.mustActToday[i].severityScore).toBe(result.ranked[i].severityScore);
      expect(result.mustActToday[i].insight.title).toBe(result.ranked[i].insight.title);
    }
    // Verify descending order within mustActToday
    for (let i = 1; i < result.mustActToday.length; i++) {
      expect(result.mustActToday[i - 1].severityScore).toBeGreaterThanOrEqual(
        result.mustActToday[i].severityScore,
      );
    }
  });

  // ============================================================
  // Test 9: Determinism
  // ============================================================

  it('produces identical output for identical input', () => {
    const insights: AbnormalityInsight[] = [
      {
        domain: 'capacity',
        severity: 'critical',
        title: 'Capacity shortage in 2026-07',
        detail: 'Shortage',
        evidence: { month: '2026-07', coreShortage: 500, buShortage: 200, bottleneck: 'Core' },
        sourcePage: '/capacity',
        recommendedAction: 'test.action',
      },
      {
        domain: 'bp',
        severity: 'critical',
        title: 'BP target missed: 2026',
        detail: 'Miss',
        evidence: { period: '2026', target: 100, forecast: 65, attainment: 0.65, gap: -35 },
        sourcePage: '/bp-targets',
        recommendedAction: 'test.action',
      },
    ];

    const dqIssue = makeDqIssue({
      id: 'forecast-missing-capacity',
      severity: 'error',
      domain: 'capacity',
      decisionImpact: 'high',
    });
    const dqSummary = makeDqSummary([dqIssue]);
    const input = makeInput(insights, dqSummary);

    const result1 = buildAbnormalityIntelligence(input);
    const result2 = buildAbnormalityIntelligence(input);

    expect(result1).toEqual(result2);
    // Verify JSON serialization is also deterministic
    expect(JSON.stringify(result1)).toBe(JSON.stringify(result2));
  });

  // ============================================================
  // Test 10: Taxonomy mapping
  // ============================================================

  it('maps each known DQ issue ID pattern to a valid business category', () => {
    const validCategories: AbnormalityCategory[] = [
      'data-integrity',
      'capacity-constraint',
      'revenue-risk',
      'operational-readiness',
      'forecast-gap',
      'currency-mismatch',
    ];

    // Test known patterns
    const knownPatterns = [
      'sku-missing-attr-123',
      'sku-zero-price-456',
      'forecast-orphan-sku-789',
      'forecast-zero-price-abc',
      'forecast-partial-year-sku1-2026',
      'sku-unsupported-currency-sku2',
      'forecast-missing-capacity',
      'bu-demand-zero-capacity',
      'capacity-without-forecast',
      'missing-constant-twd-rate',
      'missing-yearly-twd-rate',
      'missing-constant-cny-rate',
      'missing-yearly-cny-rate',
      'forecast-missing-bp-target-2026',
      'bp-target-zero-forecast-2026',
      'bp-target-evenly-allocated',
      'fixed-working-days',
      'no-data-blocked',
      'capacity-shortage',
      'high-utilization',
      'bp-miss',
      'bp-watch',
      'revenue-trend-down',
      'customer-concentration',
    ];

    for (const pattern of knownPatterns) {
      const match = ABNORMALITY_TAXONOMY.lookup(pattern);
      expect(match).toBeDefined();
      expect(validCategories).toContain(match!.category);
      expect(match!.domain).toBeTruthy();
      expect(match!.label).toBeTruthy();
      expect(match!.impactDescription).toBeTruthy();
      expect(match!.investigationRoute).toBeTruthy();
    }
  });

  // ============================================================
  // Additional: taxonomy lookup returns undefined for unknown IDs
  // ============================================================

  it('returns undefined for unknown issue IDs', () => {
    expect(ABNORMALITY_TAXONOMY.lookup('completely-unknown-id')).toBeUndefined();
    expect(ABNORMALITY_TAXONOMY.lookup('')).toBeUndefined();
  });

  // ============================================================
  // Additional: summary counts are correct
  // ============================================================

  it('computes correct summary counts by impact category', () => {
    const insights: AbnormalityInsight[] = [
      {
        domain: 'data',
        severity: 'critical',
        title: 'Blocking issue',
        detail: 'Detail',
        evidence: { issueId: 'sku-missing-attr-test' },
        sourcePage: '/products',
        recommendedAction: 'test.action',
      },
      {
        domain: 'capacity',
        severity: 'warning',
        title: 'Degrading issue',
        detail: 'Detail',
        evidence: {},
        sourcePage: '/capacity',
        recommendedAction: 'test.action',
      },
      {
        domain: 'sales',
        severity: 'info',
        title: 'Informational issue',
        detail: 'Detail',
        evidence: {},
        sourcePage: '/dashboard',
        recommendedAction: 'test.action',
      },
    ];

    const result = buildAbnormalityIntelligence(makeInput(insights));

    expect(result.summary.total).toBe(3);
    expect(result.summary.blocking + result.summary.distorting + result.summary.degrading + result.summary.informational).toBe(3);
  });

  // ============================================================
  // Additional: BP citations include target, forecast, attainment, gap
  // ============================================================

  it('generates BP-specific citations for BP domain insights', () => {
    const insight: AbnormalityInsight = {
      domain: 'bp',
      severity: 'critical',
      title: 'BP target missed: 2026',
      detail: 'Attainment 65%, gap -35M TWD',
      evidence: {
        period: '2026',
        target: 100,
        forecast: 65,
        attainment: 0.65,
        gap: -35,
      },
      sourcePage: '/bp-targets',
      recommendedAction: 'test.action',
    };

    const result = buildAbnormalityIntelligence(makeInput([insight]));

    const citations = result.ranked[0].citations;
    const metricNames = citations.map(c => c.metric);
    expect(metricNames).toContain('BP Target');
    expect(metricNames).toContain('Forecast Revenue');
    expect(metricNames).toContain('Revenue Gap');
    expect(metricNames).toContain('BP Attainment');
    expect(metricNames).toContain('Affected Period');
  });
});
