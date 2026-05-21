import { describe, it, expect } from 'vitest';
import { buildBpAttainment, formatAttainment, formatBpAmount, periodYear } from './bpTargets';
import type { SkuCalculationResult, MonthlyCapacitySummary } from '../types';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

const mockSkuResults: SkuCalculationResult[] = [
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2026-01', forecastPcs: 1000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 1111, pcsPerPanel: 100, requiredPanels: 12, coreSteps: 5, buSteps: 10, corePanelDemand: 120, buPanelDemand: 240, revenue: 10000 },
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2026-02', forecastPcs: 1000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 1111, pcsPerPanel: 100, requiredPanels: 12, coreSteps: 5, buSteps: 10, corePanelDemand: 120, buPanelDemand: 240, revenue: 10000 },
  { skuId: 'sku1', skuCode: 'SKU-001', month: '2027-01', forecastPcs: 2000, unitPrice: 10, yieldRate: 0.9, requiredInputPcs: 2222, pcsPerPanel: 100, requiredPanels: 24, coreSteps: 5, buSteps: 10, corePanelDemand: 240, buPanelDemand: 480, revenue: 20000 },
];

const mockMonthlySummaries: MonthlyCapacitySummary[] = [
  { month: '2026-01', totalCorePanelDemand: 120, totalBuPanelDemand: 240, coreCapacity: 200, buCapacity: 300, coreUtilization: 0.6, buUtilization: 0.8, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
  { month: '2026-02', totalCorePanelDemand: 120, totalBuPanelDemand: 240, coreCapacity: 200, buCapacity: 300, coreUtilization: 0.6, buUtilization: 0.8, coreShortage: 0, buShortage: 0, bottleneck: 'None' },
  { month: '2027-01', totalCorePanelDemand: 240, totalBuPanelDemand: 480, coreCapacity: 200, buCapacity: 300, coreUtilization: 1.2, buUtilization: 1.6, coreShortage: 40, buShortage: 180, bottleneck: 'BU' },
];

const twdSettings = { ...DEFAULT_CURRENCY_SETTINGS, displayCurrency: 'TWD' as const, constantUsdToTwdRate: 32 };

describe('buildBpAttainment', () => {
  it('computes yearly attainment correctly (targets in TWD, revenue converted from USD)', () => {
    // 2026: revenue 20000 USD * 32 = 640000 TWD, target 3,200,000 TWD
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 3200000, '2027': 6400000 }, twdSettings);
    expect(result.yearly.length).toBe(2);
    // 2026: target 3,200,000 TWD, revenue 20000 USD * 32 = 640,000 TWD
    expect(result.yearly[0].bpTarget).toBe(3200000);
    expect(result.yearly[0].forecastRevenue).toBe(640000);
    expect(result.yearly[0].attainment).toBe(0.2);
    expect(result.yearly[0].gap).toBe(-2560000);
    // 2027: target 6,400,000 TWD, revenue 20000 USD * 32 = 640,000 TWD
    expect(result.yearly[1].bpTarget).toBe(6400000);
    expect(result.yearly[1].forecastRevenue).toBe(640000);
    expect(result.yearly[1].attainment).toBe(0.1);
    expect(result.yearly[1].gap).toBe(-5760000);
  });

  it('returns null attainment when target is missing', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, {}, DEFAULT_CURRENCY_SETTINGS);
    expect(result.yearly[0].attainment).toBeNull();
  });

  it('returns null attainment when target is zero', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 0, '2027': 0 }, DEFAULT_CURRENCY_SETTINGS);
    expect(result.yearly[0].attainment).toBeNull();
    expect(result.yearly[1].attainment).toBeNull();
  });

  it('allocates quarterly targets as annual/4', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 3840000 }, twdSettings);
    // Q1 2026 target = 3,840,000 / 4 = 960,000 TWD
    expect(result.quarterly[0].bpTarget).toBe(960000);
    expect(result.quarterly[0].period).toBe('2026-Q1');
  });

  it('allocates monthly targets as annual/12', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 3840000 }, twdSettings);
    // Jan 2026 target = 3,840,000 / 12 = 320,000 TWD
    expect(result.monthly[0].bpTarget).toBe(320000);
    expect(result.monthly[0].period).toBe('2026-01');
  });

  it('handles gap calculation correctly', () => {
    // target 480,000 TWD = 15000 USD * 32
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 480000 }, twdSettings);
    // 2026: target 480,000 TWD, revenue 640,000 TWD, gap = +160,000
    expect(result.yearly[0].gap).toBe(160000);
  });

  it('uses correct yearly exchange rate when exchangeRateMode is yearly', () => {
    const yearlySettings = { ...DEFAULT_CURRENCY_SETTINGS, displayCurrency: 'TWD' as const, exchangeRateMode: 'yearly' as const, yearlyUsdToTwdRates: { '2026': 30, '2027': 33 } };
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 600000, '2027': 660000 }, yearlySettings);
    // 2026: revenue 20000 USD * 30 = 600,000 TWD, target 600,000 TWD
    expect(result.yearly[0].forecastRevenue).toBe(600000);
    expect(result.yearly[0].attainment).toBe(1.0);
    // 2027: revenue 20000 USD * 33 = 660,000 TWD, target 660,000 TWD
    expect(result.yearly[1].forecastRevenue).toBe(660000);
    expect(result.yearly[1].attainment).toBe(1.0);
  });
});

describe('formatAttainment', () => {
  it('formats null as dash', () => {
    expect(formatAttainment(null)).toBe('-');
  });

  it('formats 0.85 as 85.0%', () => {
    expect(formatAttainment(0.85)).toBe('85.0%');
  });

  it('formats 1.2 as 120.0%', () => {
    expect(formatAttainment(1.2)).toBe('120.0%');
  });
});

describe('formatBpAmount', () => {
  it('returns dash for zero', () => {
    expect(formatBpAmount(0, DEFAULT_CURRENCY_SETTINGS)).toBe('-');
  });

  it('formats TWD as integer with commas', () => {
    const result = formatBpAmount(1234567, twdSettings);
    expect(result).toContain('1,234,567');
  });
});

describe('periodYear', () => {
  it('extracts year from year string', () => {
    expect(periodYear('2026')).toBe('2026');
  });

  it('extracts year from quarter string', () => {
    expect(periodYear('2026-Q1')).toBe('2026');
  });

  it('extracts year from month string', () => {
    expect(periodYear('2026-03')).toBe('2026');
  });
});
