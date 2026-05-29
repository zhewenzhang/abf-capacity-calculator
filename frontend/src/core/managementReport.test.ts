import { describe, it, expect } from 'vitest';

/**
 * Unit tests for managementReport.ts (v1.45.0).
 *
 * Tests cover:
 * 1. Daily report -- generates 8 sections
 * 2. Weekly report -- generates 13 sections
 * 3. Executive summary -- non-empty string
 * 4. Data confidence -- matches input DQ confidence
 * 5. Risk list -- contains top risks
 * 6. Fix list -- contains high-impact DQ issues
 * 7. Markdown export -- contains section headers
 * 8. JSON export -- valid JSON, sorted keys
 * 9. No sensitive keys in export -- apiKey, token, etc. stripped
 * 10. Determinism -- same input produces same output
 * 11. Narrative draft -- includes source references and caveats
 * 12. Empty input -- returns valid report with blocked confidence
 */

import {
  buildManagementReport,
  exportReportToMarkdown,
  exportReportToJson,
  type ManagementReportInput,
} from './managementReport';
import type { WorkbenchViewModel, AbnormalityInsight } from './workbench';
import type { DataQualitySummary, DataQualityIssue } from './dataQuality';
import type { AnalyticsModel } from './analytics';
import type { BpAnalysisModel } from './bpTargets';
import type { ScenarioComparison } from './scenarioEngine';

// ============================================================
// Test Fixtures
// ============================================================

const FIXED_DATE = new Date('2026-05-28T10:00:00.000Z');

function makeDqIssue(overrides: Partial<DataQualityIssue> = {}): DataQualityIssue {
  return {
    id: 'test-issue-1',
    severity: 'error',
    domain: 'products',
    title: 'Test Issue',
    detail: 'Test detail',
    titleMessage: { key: 'test.title' },
    detailMessage: { key: 'test.detail' },
    decisionImpact: 'high',
    ...overrides,
  };
}

function makeDqSummary(overrides: Partial<DataQualitySummary> = {}): DataQualitySummary {
  return {
    status: 'ok',
    confidence: 'high',
    confidenceScore: 90,
    issues: [],
    ...overrides,
  };
}

function makeAbnormality(overrides: Partial<AbnormalityInsight> = {}): AbnormalityInsight {
  return {
    domain: 'capacity',
    severity: 'critical',
    title: 'Capacity shortage in 2026-06',
    detail: 'Shortage detected: Core 500 panels, BU 300 panels',
    evidence: { month: '2026-06', coreShortage: 500, buShortage: 300 },
    sourcePage: '/capacity',
    recommendedAction: 'workbench.abnormality.capacity.shortage',
    ...overrides,
  };
}

function makeWorkbench(overrides: Partial<WorkbenchViewModel> = {}): WorkbenchViewModel {
  return {
    stages: [],
    abnormalities: [makeAbnormality()],
    lookAhead: [
      {
        month: '2026-06',
        coreUtilization: 1.05,
        buUtilization: 0.95,
        bottleneck: 'Core',
        hasShortage: true,
      },
    ],
    revenueBp: {
      currentRevenue: 500.0,
      bpTarget: 600.0,
      attainment: 0.833,
      gap: -100.0,
      status: 'watch',
    },
    scenarioPresets: [],
    dqConfidence: 'high',
    ...overrides,
  };
}

function makeAnalyticsModel(): AnalyticsModel {
  return {
    skuResults: [],
    monthlySummaries: [],
    totalRevenue: 500000,
    totalForecastPcs: 100000,
    maxCoreUtil: 1.05,
    maxBuUtil: 0.85,
    shortageMonthCount: 1,
    worstMonth: '2026-06',
    allMonths: ['2026-01', '2026-02', '2026-03'],
    yearlyHealth: [
      {
        year: '2026',
        revenue: 500000,
        forecastPcs: 100000,
        coreDemand: 80000,
        coreCapacity: 75000,
        coreUtil: 1.067,
        buDemand: 60000,
        buCapacity: 70000,
        buUtil: 0.857,
        shortageMonths: ['2026-06'],
        bottleneck: 'Core',
        severity: 'red',
      },
    ],
    monthlyRevenue: [],
    monthlyUtilization: [],
    revenueByCustomer: [
      {
        label: 'CustomerA',
        values: { '2026': 300000 },
      },
    ],
    forecastByCustomer: [],
    revenueBySku: [
      {
        label: 'SKU-001',
        values: { '2026': 200000 },
      },
      {
        label: 'SKU-002',
        values: { '2026': 150000 },
      },
    ],
    revenueBySize: [],
    coreDemandBySize: [],
    buDemandBySize: [],
    coreDemandByApplication: [],
    buDemandByApplication: [],
    revenueByApplication: [],
    revenueByProductGrade: [],
    coreDemandByProductGrade: [],
    buDemandByProductGrade: [],
    coreDemandByLayerBucket: [],
    buDemandByLayerBucket: [],
  } as unknown as AnalyticsModel;
}

function makeBpModel(): BpAnalysisModel {
  return {
    yearly: [
      {
        period: '2026',
        targetMillionTwd: 600,
        forecastMillionTwd: 500,
        attainment: 0.833,
        gapMillionTwd: -100,
        status: 'watch',
      },
    ],
    quarterly: [],
    monthly: [],
    customerRevenueByYear: [],
    skuRevenueByYear: [],
    customerRevenueByQuarter: [],
    skuRevenueByQuarter: [],
    customerRevenueByMonth: [],
    skuRevenueByMonth: [],
  };
}

function makeScenarioComparison(): ScenarioComparison {
  return {
    multipliers: {
      forecastVolume: 1.1,
      unitPrice: 1.0,
      coreCapacity: 1.0,
      buCapacity: 1.0,
    },
    baseline: {
      calcResult: {
        skuResults: [],
        monthlySummaries: [],
        totalRevenue: 500000,
        totalForecastPcs: 100000,
        maxCoreUtilization: 1.05,
        maxBuUtilization: 0.85,
        shortageMonthCount: 1,
        worstBottleneckMonth: '2026-06',
      },
      bpModel: makeBpModel(),
      dqSummary: makeDqSummary(),
    },
    scenario: {
      calcResult: {
        skuResults: [],
        monthlySummaries: [],
        totalRevenue: 550000,
        totalForecastPcs: 110000,
        maxCoreUtilization: 1.15,
        maxBuUtilization: 0.93,
        shortageMonthCount: 2,
        worstBottleneckMonth: '2026-06',
      },
      bpModel: makeBpModel(),
      dqSummary: makeDqSummary(),
    },
    deltas: {
      totalRevenueUsd: { base: 500000, scenario: 550000, delta: 50000, deltaPercent: 10 },
      totalForecastPcs: { base: 100000, scenario: 110000, delta: 10000, deltaPercent: 10 },
      maxCoreUtilization: { base: 1.05, scenario: 1.15, delta: 0.1, deltaPercent: 9.5 },
      maxBuUtilization: { base: 0.85, scenario: 0.93, delta: 0.08, deltaPercent: 9.4 },
      shortageMonthCount: { base: 1, scenario: 2, delta: 1, deltaPercent: 100 },
      bpAttainmentPct: { base: 83.3, scenario: 75.7, delta: -7.6, deltaPercent: -9.1 },
      bpGapMillionTwd: { base: -100, scenario: -143, delta: -43, deltaPercent: 43 },
    },
  };
}

function makeBaseInput(overrides: Partial<ManagementReportInput> = {}): ManagementReportInput {
  return {
    workbench: makeWorkbench(),
    dqSummary: makeDqSummary(),
    analyticsModel: makeAnalyticsModel(),
    bpModel: makeBpModel(),
    reportType: 'daily',
    currentDate: FIXED_DATE,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe('managementReport', () => {
  // Test 1: Daily report -- generates 9 sections
  describe('daily report', () => {
    it('generates 9 sections with scenario', () => {
      const report = buildManagementReport(
        makeBaseInput({
          scenarioComparison: makeScenarioComparison(),
          scenarioCustomerImpact: [{ customer: 'CustomerA', revenueDelta: 50000 }],
        }),
      );
      expect(report.sections.length).toBe(9);
    });

    it('generates 9 sections without scenario (placeholder)', () => {
      const report = buildManagementReport(makeBaseInput());
      // Scenario section is always present (placeholder when no comparison)
      expect(report.sections.length).toBe(9);
    });

    it('sections are sorted by priority', () => {
      const report = buildManagementReport(makeBaseInput());
      for (let i = 1; i < report.sections.length; i++) {
        expect(report.sections[i].priority).toBeGreaterThanOrEqual(
          report.sections[i - 1].priority,
        );
      }
    });

    it('includes expected section IDs', () => {
      const report = buildManagementReport(makeBaseInput());
      const ids = report.sections.map(s => s.id);
      expect(ids).toContain('executive-summary');
      expect(ids).toContain('data-confidence');
      expect(ids).toContain('top-risks');
      expect(ids).toContain('required-fixes');
      expect(ids).toContain('revenue-bp');
      expect(ids).toContain('look-ahead');
      expect(ids).toContain('scenario-comparison');
      expect(ids).toContain('narrative');
    });
  });

  // Test 2: Weekly report -- generates 14 sections
  describe('weekly report', () => {
    it('generates 14 sections', () => {
      const report = buildManagementReport(
        makeBaseInput({
          reportType: 'weekly',
          scenarioComparison: makeScenarioComparison(),
          scenarioCustomerImpact: [{ customer: 'CustomerA', revenueDelta: 50000 }],
        }),
      );
      // Weekly: 9 daily + 5 weekly-only = 14
      expect(report.sections.length).toBe(14);
    });

    it('generates 14 sections without scenario (placeholder)', () => {
      const report = buildManagementReport(
        makeBaseInput({
          reportType: 'weekly',
        }),
      );
      expect(report.sections.length).toBe(14);
    });

    it('includes weekly-specific section IDs', () => {
      const report = buildManagementReport(makeBaseInput({ reportType: 'weekly' }));
      const ids = report.sections.map(s => s.id);
      expect(ids).toContain('week-over-week-trend');
      expect(ids).toContain('capacity-utilization-trend');
      expect(ids).toContain('forecast-accuracy');
      expect(ids).toContain('customer-concentration');
      expect(ids).toContain('sku-portfolio-health');
    });
  });

  // Test 3: Executive summary -- non-empty string
  describe('executive summary', () => {
    it('is a non-empty string', () => {
      const report = buildManagementReport(makeBaseInput());
      expect(typeof report.executiveSummary).toBe('string');
      expect(report.executiveSummary.length).toBeGreaterThan(0);
    });

    it('mentions the report type', () => {
      const dailyReport = buildManagementReport(makeBaseInput({ reportType: 'daily' }));
      expect(dailyReport.executiveSummary).toContain('Daily');

      const weeklyReport = buildManagementReport(makeBaseInput({ reportType: 'weekly' }));
      expect(weeklyReport.executiveSummary).toContain('Weekly');
    });

    it('mentions critical abnormality count', () => {
      const report = buildManagementReport(makeBaseInput());
      expect(report.executiveSummary).toContain('1 critical abnormality');
    });

    it('handles zero critical abnormalities', () => {
      const report = buildManagementReport(
        makeBaseInput({
          workbench: makeWorkbench({
            abnormalities: [makeAbnormality({ severity: 'warning' })],
          }),
        }),
      );
      expect(report.executiveSummary).toContain('No critical abnormalities');
    });
  });

  // Test 4: Data confidence -- matches input DQ confidence
  describe('data confidence', () => {
    it('matches input DQ confidence for high', () => {
      const report = buildManagementReport(
        makeBaseInput({ dqSummary: makeDqSummary({ confidence: 'high' }) }),
      );
      expect(report.dataConfidence).toBe('high');
    });

    it('matches input DQ confidence for medium', () => {
      const report = buildManagementReport(
        makeBaseInput({ dqSummary: makeDqSummary({ confidence: 'medium' }) }),
      );
      expect(report.dataConfidence).toBe('medium');
    });

    it('matches input DQ confidence for low', () => {
      const report = buildManagementReport(
        makeBaseInput({ dqSummary: makeDqSummary({ confidence: 'low' }) }),
      );
      expect(report.dataConfidence).toBe('low');
    });

    it('matches input DQ confidence for blocked', () => {
      const report = buildManagementReport(
        makeBaseInput({ dqSummary: makeDqSummary({ confidence: 'blocked' }) }),
      );
      expect(report.dataConfidence).toBe('blocked');
    });
  });

  // Test 5: Risk list -- contains top risks
  describe('risk list', () => {
    it('contains top risks from abnormalities', () => {
      const report = buildManagementReport(makeBaseInput());
      const riskSection = report.sections.find(s => s.type === 'risk-list');
      expect(riskSection).toBeDefined();

      const data = riskSection!.data as Record<string, unknown>;
      const risks = data.risks as Array<Record<string, unknown>>;
      expect(risks.length).toBeGreaterThan(0);
      expect(risks[0].title).toBe('Capacity shortage in 2026-06');
      expect(risks[0].severity).toBe('critical');
    });

    it('sorts risks by severity (critical first)', () => {
      const abnormalities = [
        makeAbnormality({ severity: 'info', title: 'Info item' }),
        makeAbnormality({ severity: 'critical', title: 'Critical item' }),
        makeAbnormality({ severity: 'warning', title: 'Warning item' }),
      ];
      const report = buildManagementReport(
        makeBaseInput({
          workbench: makeWorkbench({ abnormalities }),
        }),
      );
      const riskSection = report.sections.find(s => s.type === 'risk-list');
      const risks = (riskSection!.data as Record<string, unknown>).risks as Array<
        Record<string, unknown>
      >;
      expect(risks[0].severity).toBe('critical');
      expect(risks[1].severity).toBe('warning');
      expect(risks[2].severity).toBe('info');
    });

    it('caps at 5 risks', () => {
      const abnormalities = Array.from({ length: 8 }, (_, i) =>
        makeAbnormality({ title: `Risk ${i}` }),
      );
      const report = buildManagementReport(
        makeBaseInput({
          workbench: makeWorkbench({ abnormalities }),
        }),
      );
      const riskSection = report.sections.find(s => s.type === 'risk-list');
      const risks = (riskSection!.data as Record<string, unknown>).risks as Array<unknown>;
      expect(risks.length).toBe(5);
    });

    it('includes risk count metadata', () => {
      const report = buildManagementReport(makeBaseInput());
      const riskSection = report.sections.find(s => s.type === 'risk-list');
      const data = riskSection!.data as Record<string, unknown>;
      expect(data.totalRiskCount).toBe(1);
      expect(data.criticalCount).toBe(1);
    });
  });

  // Test 6: Fix list -- contains high-impact DQ issues
  describe('fix list', () => {
    it('contains high-impact DQ issues', () => {
      const highImpactIssue = makeDqIssue({
        id: 'forecast-missing-capacity',
        decisionImpact: 'high',
        title: 'Missing Capacity Config',
      });
      const report = buildManagementReport(
        makeBaseInput({
          dqSummary: makeDqSummary({ issues: [highImpactIssue] }),
        }),
      );
      const fixSection = report.sections.find(s => s.type === 'fix-list');
      expect(fixSection).toBeDefined();

      const data = fixSection!.data as Record<string, unknown>;
      const fixes = data.fixes as Array<Record<string, unknown>>;
      expect(fixes.length).toBe(1);
      expect(fixes[0].issueId).toBe('forecast-missing-capacity');
      expect(fixes[0].impact).toBe('high');
    });

    it('excludes low and medium impact issues', () => {
      const issues = [
        makeDqIssue({ id: 'high-1', decisionImpact: 'high' }),
        makeDqIssue({ id: 'medium-1', decisionImpact: 'medium' }),
        makeDqIssue({ id: 'low-1', decisionImpact: 'low' }),
      ];
      const report = buildManagementReport(
        makeBaseInput({
          dqSummary: makeDqSummary({ issues }),
        }),
      );
      const fixSection = report.sections.find(s => s.type === 'fix-list');
      const fixes = (fixSection!.data as Record<string, unknown>).fixes as Array<
        Record<string, unknown>
      >;
      expect(fixes.length).toBe(1);
      expect(fixes[0].issueId).toBe('high-1');
    });

    it('returns empty fixes when no high-impact issues', () => {
      const report = buildManagementReport(
        makeBaseInput({
          dqSummary: makeDqSummary({ issues: [makeDqIssue({ decisionImpact: 'low' })] }),
        }),
      );
      const fixSection = report.sections.find(s => s.type === 'fix-list');
      const data = fixSection!.data as Record<string, unknown>;
      expect((data.fixes as Array<unknown>).length).toBe(0);
      expect(data.totalFixCount).toBe(0);
    });
  });

  // Test 7: Markdown export -- contains section headers
  describe('markdown export', () => {
    it('contains section headers', () => {
      const report = buildManagementReport(makeBaseInput());
      const markdown = exportReportToMarkdown(report);

      expect(markdown).toContain('# Management Report');
      expect(markdown).toContain('## Executive Summary');
      expect(markdown).toContain('## Data Confidence');
      expect(markdown).toContain('## Top Risks');
      expect(markdown).toContain('## Required Fixes');
      expect(markdown).toContain('## Revenue vs BP Status');
      expect(markdown).toContain('## Look-Ahead Highlights');
      expect(markdown).toContain('## Scenario Recommendations');
      expect(markdown).toContain('## AI Narrative Draft');
      expect(markdown).toContain('## Caveats');
    });

    it('contains risk table', () => {
      const report = buildManagementReport(makeBaseInput());
      const markdown = exportReportToMarkdown(report);

      expect(markdown).toContain('| Rank |');
      expect(markdown).toContain('| 1 |');
      expect(markdown).toContain('critical');
    });

    it('includes scenario section when scenario is provided', () => {
      const report = buildManagementReport(
        makeBaseInput({ scenarioComparison: makeScenarioComparison() }),
      );
      const markdown = exportReportToMarkdown(report);

      expect(markdown).toContain('## Scenario Recommendations');
      expect(markdown).toContain('| Metric |');
    });
  });

  // Test 8: JSON export -- valid JSON, sorted keys
  describe('json export', () => {
    it('produces valid JSON (after stripping BOM)', () => {
      const report = buildManagementReport(makeBaseInput());
      const jsonStr = exportReportToJson(report);

      // Strip UTF-8 BOM
      const cleanJson = jsonStr.replace(/^\uFEFF/, '');
      expect(() => JSON.parse(cleanJson)).not.toThrow();
    });

    it('starts with UTF-8 BOM for Excel compatibility', () => {
      const report = buildManagementReport(makeBaseInput());
      const jsonStr = exportReportToJson(report);
      expect(jsonStr.charCodeAt(0)).toBe(0xFEFF);
    });

    it('has sorted keys', () => {
      const report = buildManagementReport(makeBaseInput());
      const jsonStr = exportReportToJson(report);
      const cleanJson = jsonStr.replace(/^\uFEFF/, '');
      const parsed = JSON.parse(cleanJson);
      const keys = Object.keys(parsed);
      const sortedKeys = [...keys].sort();
      expect(keys).toEqual(sortedKeys);
    });
  });

  // Test 9: No sensitive keys in export
  describe('sensitive key stripping', () => {
    it('strips apiKey from section data', () => {
      // Create a workbench with sensitive data in abnormalities
      const workbenchWithSecrets = makeWorkbench({
        abnormalities: [
          makeAbnormality({
            evidence: {
              month: '2026-06',
              apiKey: 'sk-secret-key-123',
              token: 'bearer-token-xyz',
              password: 'super-secret',
              normalField: 'safe-value',
            },
          }),
        ],
      });

      const report = buildManagementReport(
        makeBaseInput({ workbench: workbenchWithSecrets }),
      );

      const jsonStr = exportReportToJson(report);
      expect(jsonStr).not.toContain('sk-secret-key-123');
      expect(jsonStr).not.toContain('bearer-token-xyz');
      expect(jsonStr).not.toContain('super-secret');
      expect(jsonStr).toContain('safe-value');
    });

    it('strips sensitive keys from markdown export', () => {
      const workbenchWithSecrets = makeWorkbench({
        abnormalities: [
          makeAbnormality({
            evidence: {
              apiKey: 'leaked-key',
              normalField: 'visible',
            },
          }),
        ],
      });

      const report = buildManagementReport(
        makeBaseInput({ workbench: workbenchWithSecrets }),
      );

      const markdown = exportReportToMarkdown(report);
      expect(markdown).not.toContain('leaked-key');
      expect(markdown).toContain('visible');
    });
  });

  // Test 10: Determinism -- same input produces same output
  describe('determinism', () => {
    it('same input produces identical output', () => {
      const input = makeBaseInput();
      const report1 = buildManagementReport(input);
      const report2 = buildManagementReport(input);

      expect(report1).toEqual(report2);
    });

    it('same input produces identical JSON', () => {
      const input = makeBaseInput();
      const json1 = exportReportToJson(buildManagementReport(input));
      const json2 = exportReportToJson(buildManagementReport(input));

      expect(json1).toBe(json2);
    });

    it('same input produces identical markdown', () => {
      const input = makeBaseInput();
      const md1 = exportReportToMarkdown(buildManagementReport(input));
      const md2 = exportReportToMarkdown(buildManagementReport(input));

      expect(md1).toBe(md2);
    });
  });

  // Test 11: Narrative draft -- includes source references and caveats
  describe('narrative draft', () => {
    it('includes source references', () => {
      const report = buildManagementReport(makeBaseInput());
      const narrativeSection = report.sections.find(s => s.id === 'narrative');
      expect(narrativeSection).toBeDefined();

      const data = narrativeSection!.data as Record<string, unknown>;
      const sources = data.sources as string[];
      expect(sources).toContain('dataQuality.ts');
      expect(sources).toContain('workbench.ts');
      expect(sources).toContain('bpTargets.ts');
    });

    it('includes caveats about deterministic generation', () => {
      const report = buildManagementReport(makeBaseInput());
      const narrativeSection = report.sections.find(s => s.id === 'narrative');
      const data = narrativeSection!.data as Record<string, unknown>;
      expect(data.caveat).toContain('deterministic');
      expect(data.caveat).toContain('No external AI');
      expect(data.caveat).toContain('No causality claims');
    });

    it('includes key takeaways', () => {
      const report = buildManagementReport(makeBaseInput());
      const narrativeSection = report.sections.find(s => s.id === 'narrative');
      const data = narrativeSection!.data as Record<string, unknown>;
      const takeaways = data.keyTakeaways as string[];
      expect(takeaways.length).toBeGreaterThan(0);
    });

    it('includes open questions for missing BP model', () => {
      const report = buildManagementReport(makeBaseInput({ bpModel: null }));
      const narrativeSection = report.sections.find(s => s.id === 'narrative');
      const data = narrativeSection!.data as Record<string, unknown>;
      const questions = data.openQuestions as string[];
      expect(questions.some(q => q.includes('BP'))).toBe(true);
    });

    it('includes top risk reference in narrative paragraphs', () => {
      const report = buildManagementReport(makeBaseInput());
      const narrativeSection = report.sections.find(s => s.id === 'narrative');
      const data = narrativeSection!.data as Record<string, unknown>;
      const paragraphs = data.paragraphs as string[];
      const hasRiskReference = paragraphs.some(
        p => p.includes('Capacity shortage') || p.includes('top risk'),
      );
      expect(hasRiskReference).toBe(true);
    });
  });

  // Test 12: Empty input -- returns valid report with blocked confidence
  describe('empty input', () => {
    it('returns valid report with blocked confidence', () => {
      const emptyWorkbench: WorkbenchViewModel = {
        stages: [],
        abnormalities: [],
        lookAhead: [],
        revenueBp: {
          currentRevenue: 0,
          bpTarget: null,
          attainment: null,
          gap: null,
          status: 'no-target',
        },
        scenarioPresets: [],
        dqConfidence: 'blocked',
      };
      const emptyDqSummary: DataQualitySummary = {
        status: 'error',
        confidence: 'blocked',
        confidenceScore: 0,
        issues: [
          {
            id: 'no-data-blocked',
            severity: 'info',
            domain: 'analytics',
            title: 'No Data Loaded',
            detail: 'No data available',
            titleMessage: { key: 'dq.noData.title' },
            detailMessage: { key: 'dq.noData.detail' },
            decisionImpact: 'low',
          },
        ],
      };

      const report = buildManagementReport({
        workbench: emptyWorkbench,
        dqSummary: emptyDqSummary,
        analyticsModel: null,
        bpModel: null,
        reportType: 'daily',
        currentDate: FIXED_DATE,
      });

      expect(report.dataConfidence).toBe('blocked');
      expect(report.executiveSummary).toBeTruthy();
      expect(report.sections.length).toBeGreaterThan(0);
      expect(report.caveats.length).toBeGreaterThan(0);
      expect(report.generatedAt).toBeTruthy();
      expect(report.period).toBeTruthy();
    });

    it('produces a risk section with empty risks', () => {
      const emptyWorkbench: WorkbenchViewModel = {
        stages: [],
        abnormalities: [],
        lookAhead: [],
        revenueBp: {
          currentRevenue: 0,
          bpTarget: null,
          attainment: null,
          gap: null,
          status: 'no-target',
        },
        scenarioPresets: [],
        dqConfidence: 'blocked',
      };

      const report = buildManagementReport({
        workbench: emptyWorkbench,
        dqSummary: makeDqSummary({ confidence: 'blocked', confidenceScore: 0 }),
        analyticsModel: null,
        bpModel: null,
        reportType: 'daily',
        currentDate: FIXED_DATE,
      });

      const riskSection = report.sections.find(s => s.type === 'risk-list');
      expect(riskSection).toBeDefined();
      const risks = (riskSection!.data as Record<string, unknown>).risks as Array<unknown>;
      expect(risks.length).toBe(0);
    });

    it('produces valid markdown for empty input', () => {
      const emptyWorkbench: WorkbenchViewModel = {
        stages: [],
        abnormalities: [],
        lookAhead: [],
        revenueBp: {
          currentRevenue: 0,
          bpTarget: null,
          attainment: null,
          gap: null,
          status: 'no-target',
        },
        scenarioPresets: [],
        dqConfidence: 'blocked',
      };

      const report = buildManagementReport({
        workbench: emptyWorkbench,
        dqSummary: makeDqSummary({ confidence: 'blocked', confidenceScore: 0 }),
        analyticsModel: null,
        bpModel: null,
        reportType: 'daily',
        currentDate: FIXED_DATE,
      });

      const markdown = exportReportToMarkdown(report);
      expect(markdown).toContain('# Management Report');
      expect(markdown).toContain('## Executive Summary');
      expect(markdown.length).toBeGreaterThan(0);
    });
  });
});
