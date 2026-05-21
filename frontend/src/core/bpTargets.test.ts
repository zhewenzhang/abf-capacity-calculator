import { describe, it, expect } from 'vitest';
import {
  buildBpAnalysis,
  buildBpAttainment,
  computeBpKpi,
  formatAttainment,
  formatBpAmount,
  formatBpGap,
  periodYear,
  getStatusColor,
  getStatusKey,
} from './bpTargets';
import type { SkuCalculationResult, MonthlyCapacitySummary, SKU } from '../types';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

const mockSkus: SKU[] = [
  { id: 'sku1', skuCode: 'SKU-001', customer: 'TSMC', deviceName: 'Dev1', osat: 'ASE', application: 'Mobile', productGrade: 'A', sizeCategory: 'small', chipLengthMm: 5, chipWidthMm: 5, layerCount: 4, unitPrice: 10 },
  { id: 'sku2', skuCode: 'SKU-002', customer: 'Intel', deviceName: 'Dev2', osat: 'Amkor', application: 'Server', productGrade: 'B', sizeCategory: 'medium', chipLengthMm: 10, chipWidthMm: 10, layerCount: 8, unitPrice: 20 },
];

const mockSkuResults: SkuCalculationResult[] = [
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2026-01', forecastPcs: 1000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 1111, pcsPerPanel: 100, requiredPanels: 12, coreSteps: 5, buSteps: 10, corePanelDemand: 120, buPanelDemand: 240, revenue: 10000 },
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2026-02', forecastPcs: 1000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 1111, pcsPerPanel: 100, requiredPanels: 12, coreSteps: 5, buSteps: 10, corePanelDemand: 120, buPanelDemand: 240, revenue: 10000 },
  { skuId: 'sku2', skuCode: 'SKU-002', month: '2026-01', forecastPcs: 500, unitPrice: 20, yieldRate: 0.9, requiredInputPcs: 556, pcsPerPanel: 50, requiredPanels: 12, coreSteps: 5, buSteps: 10, corePanelDemand: 120, buPanelDemand: 240, revenue: 10000 },
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2027-01', forecastPcs: 2000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 2222, pcsPerPanel: 100, requiredPanels: 24, coreSteps: 5, buSteps: 10, corePanelDemand: 240, buPanelDemand: 480, revenue: 20000 },
];

const mockMonthlySummaries: MonthlyCapacitySummary[] = [
  { month: '2026-01', totalCorePanelDemand: 240, totalBuPanelDemand: 480, coreCapacity: 200, buCapacity: 300, coreUtilization: 1.2, buUtilization: 1.6, coreShortage: 40, buShortage: 180, bottleneck: 'BU' },
  { month: '2026-02', totalCorePanelDemand: 120, totalBuPanelDemand: 240, coreCapacity: 200, buCapacity: 300, coreUtilization: 0.6, buUtilization: 0.8, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
  { month: '2027-01', totalCorePanelDemand: 240, totalBuPanelDemand: 480, coreCapacity: 200, buCapacity: 300, coreUtilization: 1.2, buUtilization: 1.6, coreShortage: 40, buShortage: 180, bottleneck: 'BU' },
];

const twdSettings = { ...DEFAULT_CURRENCY_SETTINGS, displayCurrency: 'TWD' as const, constantUsdToTwdRate: 32 };

// ========================================
// buildBpAnalysis - Main builder
// ========================================

describe('buildBpAnalysis', () => {
  it('computes yearly attainment correctly (targets in million TWD, revenue converted from USD)', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 3.2, '2027': 6.4 }, twdSettings);
    expect(result.yearly.length).toBe(2);
    // 2026: revenue = (10000+10000+10000) USD * 32 = 960000 TWD = 0.96 million TWD
    expect(result.yearly[0].period).toBe('2026');
    expect(result.yearly[0].targetMillionTwd).toBe(3.2);
    expect(result.yearly[0].forecastMillionTwd).toBeCloseTo(0.96, 2);
    expect(result.yearly[0].attainment).toBeCloseTo(0.3, 2);
    expect(result.yearly[0].gapMillionTwd).toBeCloseTo(-2.24, 2);
    expect(result.yearly[0].status).toBe('miss');
  });

  it('returns null attainment when target is missing', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, DEFAULT_CURRENCY_SETTINGS);
    expect(result.yearly[0].targetMillionTwd).toBeNull();
    expect(result.yearly[0].attainment).toBeNull();
    expect(result.yearly[0].gapMillionTwd).toBeNull();
    expect(result.yearly[0].status).toBe('no-target');
  });

  it('returns null attainment when target is zero', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 0, '2027': 0 }, DEFAULT_CURRENCY_SETTINGS);
    expect(result.yearly[0].status).toBe('no-target');
    expect(result.yearly[1].status).toBe('no-target');
  });

  it('allocates quarterly targets as annual/4', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 3.84 }, twdSettings);
    expect(result.quarterly[0].period).toBe('2026-Q1');
    expect(result.quarterly[0].targetMillionTwd).toBeCloseTo(0.96, 2);
  });

  it('allocates monthly targets as annual/12', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 3.84 }, twdSettings);
    expect(result.monthly[0].period).toBe('2026-01');
    expect(result.monthly[0].targetMillionTwd).toBeCloseTo(0.32, 2);
  });

  it('sets status met when >= 100%', () => {
    // target 0.64 million TWD, revenue ~0.96 million TWD
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 0.64 }, twdSettings);
    expect(result.yearly[0].status).toBe('met');
  });

  it('sets status watch when 80%-99.9%', () => {
    // target 1.1 million TWD, revenue ~0.96 million TWD -> ~87%
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 1.1 }, twdSettings);
    expect(result.yearly[0].status).toBe('watch');
  });

  it('sets status miss when < 80%', () => {
    // target 2.0 million TWD, revenue ~0.96 million TWD -> ~48%
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2026': 2.0 }, twdSettings);
    expect(result.yearly[0].status).toBe('miss');
  });

  it('generates periods from skuResults even when monthlySummaries is empty', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, [], { '2026': 3.2 }, twdSettings);
    expect(result.yearly.length).toBe(2); // 2026, 2027 from skuResults
    expect(result.quarterly.length).toBeGreaterThan(0);
    expect(result.monthly.length).toBeGreaterThan(0);
  });

  it('sorts periods left-to-right ascending', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, { '2027': 6.4, '2026': 3.2 }, twdSettings);
    expect(result.yearly[0].period).toBe('2026');
    expect(result.yearly[1].period).toBe('2027');
    expect(result.quarterly[0].period).toBe('2026-Q1');
    expect(result.monthly[0].period).toBe('2026-01');
  });

  it('computes customer revenue by year', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, twdSettings);
    expect(result.customerRevenueByYear.length).toBe(2); // TSMC, Intel
    expect(result.customerRevenueByYear[0].values['2026']).toBeGreaterThan(0);
  });

  it('computes SKU revenue by year', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, twdSettings);
    expect(result.skuRevenueByYear.length).toBe(2); // SKU-001, SKU-002
    const sku001 = result.skuRevenueByYear.find(r => r.label.includes('SKU-001'));
    expect(sku001).toBeDefined();
    expect(sku001!.values['2026']).toBeGreaterThan(0);
  });

  it('computes customer revenue by quarter', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, twdSettings);
    expect(result.customerRevenueByQuarter.length).toBe(2);
    expect(result.customerRevenueByQuarter[0].values['2026-Q1']).toBeGreaterThan(0);
  });

  it('computes SKU revenue by month', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, twdSettings);
    expect(result.skuRevenueByMonth.length).toBe(2);
  });

  it('uses correct yearly exchange rate when exchangeRateMode is yearly', () => {
    const yearlySettings = { ...DEFAULT_CURRENCY_SETTINGS, displayCurrency: 'TWD' as const, exchangeRateMode: 'yearly' as const, yearlyUsdToTwdRates: { '2026': 30, '2027': 33 } };
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, yearlySettings);
    // 2026 revenue: (10000+10000+10000) USD * 30 = 900000 TWD = 0.9 million TWD
    expect(result.yearly[0].forecastMillionTwd).toBeCloseTo(0.9, 2);
    // 2027 revenue: 20000 USD * 33 = 660000 TWD = 0.66 million TWD
    expect(result.yearly[1].forecastMillionTwd).toBeCloseTo(0.66, 2);
  });

  it('handles shareValues in dimension records', () => {
    const result = buildBpAnalysis(mockSkuResults, mockSkus, mockMonthlySummaries, {}, twdSettings);
    // Check that shareValues exist and are reasonable (each dimension's share per period)
    for (const row of result.customerRevenueByYear) {
      expect(row.shareValues).toBeDefined();
      // Each individual share should be between 0 and 100
      for (const share of Object.values(row.shareValues)) {
        expect(share).toBeGreaterThanOrEqual(0);
        expect(share).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ========================================
// computeBpKpi
// ========================================

describe('computeBpKpi', () => {
  const sampleRecords = [
    { period: '2026', targetMillionTwd: 3.2, forecastMillionTwd: 0.96, attainment: 0.3, gapMillionTwd: -2.24, status: 'miss' as const },
    { period: '2027', targetMillionTwd: 6.4, forecastMillionTwd: 0.66, attainment: 0.1, gapMillionTwd: -5.74, status: 'miss' as const },
  ];

  it('computes total target and forecast', () => {
    const kpi = computeBpKpi(sampleRecords);
    expect(kpi.totalTargetMillionTwd).toBeCloseTo(9.6, 2);
    expect(kpi.totalForecastMillionTwd).toBeCloseTo(1.62, 2);
  });

  it('computes overall attainment', () => {
    const kpi = computeBpKpi(sampleRecords);
    expect(kpi.overallAttainment).toBeCloseTo(0.16875, 4);
  });

  it('computes total gap', () => {
    const kpi = computeBpKpi(sampleRecords);
    expect(kpi.totalGapMillionTwd).toBeCloseTo(-7.98, 2);
  });

  it('returns null when no targets', () => {
    const noTargetRecords = [
      { period: '2026', targetMillionTwd: null, forecastMillionTwd: 0.96, attainment: null, gapMillionTwd: null, status: 'no-target' as const },
    ];
    const kpi = computeBpKpi(noTargetRecords);
    expect(kpi.totalTargetMillionTwd).toBeNull();
    expect(kpi.overallAttainment).toBeNull();
    expect(kpi.totalGapMillionTwd).toBeNull();
    expect(kpi.totalForecastMillionTwd).toBe(0.96);
  });
});

// ========================================
// Format helpers
// ========================================

describe('formatAttainment', () => {
  it('formats null as dash', () => { expect(formatAttainment(null)).toBe('-'); });
  it('formats 0.85 as 85.0%', () => { expect(formatAttainment(0.85)).toBe('85.0%'); });
  it('formats 1.2 as 120.0%', () => { expect(formatAttainment(1.2)).toBe('120.0%'); });
});

describe('formatBpAmount', () => {
  it('returns dash for null', () => { expect(formatBpAmount(null)).toBe('-'); });
  it('returns dash for zero', () => { expect(formatBpAmount(0)).toBe('-'); });
  it('formats 3.2 as 3.2', () => { expect(formatBpAmount(3.2)).toBe('3.2'); });
  it('formats 1234.5 with comma', () => { expect(formatBpAmount(1234.5)).toContain('1,234.5'); });
});

describe('formatBpGap', () => {
  it('returns dash for null', () => { expect(formatBpGap(null)).toBe('-'); });
  it('formats positive with +', () => { expect(formatBpGap(1.5)).toBe('+1.5'); });
  it('formats negative', () => { expect(formatBpGap(-2.3)).toBe('-2.3'); });
  it('formats zero', () => { expect(formatBpGap(0)).toBe('0.0'); });
});

describe('periodYear', () => {
  it('extracts year from year string', () => { expect(periodYear('2026')).toBe('2026'); });
  it('extracts year from quarter string', () => { expect(periodYear('2026-Q1')).toBe('2026'); });
  it('extracts year from month string', () => { expect(periodYear('2026-03')).toBe('2026'); });
});

describe('getStatusColor', () => {
  it('returns green for met', () => { expect(getStatusColor('met')).toBe('green'); });
  it('returns orange for watch', () => { expect(getStatusColor('watch')).toBe('orange'); });
  it('returns red for miss', () => { expect(getStatusColor('miss')).toBe('red'); });
  it('returns default for no-target', () => { expect(getStatusColor('no-target')).toBe('default'); });
});

describe('getStatusKey', () => {
  it('returns correct i18n key for met', () => { expect(getStatusKey('met')).toBe('bp.statusMet'); });
  it('returns correct i18n key for watch', () => { expect(getStatusKey('watch')).toBe('bp.statusWatch'); });
  it('returns correct i18n key for miss', () => { expect(getStatusKey('miss')).toBe('bp.statusMiss'); });
  it('returns correct i18n key for no-target', () => { expect(getStatusKey('no-target')).toBe('bp.statusNoTarget'); });
});

// ========================================
// Backward compatibility: buildBpAttainment
// ========================================

describe('buildBpAttainment (backward compat)', () => {
  it('returns legacy format matching new builder', () => {
    const legacyResult = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 3.2, '2027': 6.4 }, twdSettings);
    expect(legacyResult.yearly.length).toBe(2);
    expect(legacyResult.yearly[0].period).toBe('2026');
    expect(legacyResult.yearly[0].bpTarget).toBe(3.2);
  });

  it('works with empty monthlySummaries', () => {
    const result = buildBpAttainment(mockSkuResults, [], { '2026': 3.2 }, twdSettings);
    expect(result.yearly.length).toBe(2);
  });
});
