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

describe('buildBpAttainment', () => {
  it('computes yearly attainment correctly', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 100000, '2027': 200000 });
    expect(result.yearly.length).toBe(2);
    // 2026: target 100000, revenue 20000 (2 months x 10000)
    expect(result.yearly[0].bpTarget).toBe(100000);
    expect(result.yearly[0].forecastRevenue).toBe(20000);
    expect(result.yearly[0].attainment).toBe(0.2);
    expect(result.yearly[0].gap).toBe(-80000);
    // 2027: target 200000, revenue 20000
    expect(result.yearly[1].bpTarget).toBe(200000);
    expect(result.yearly[1].forecastRevenue).toBe(20000);
    expect(result.yearly[1].attainment).toBe(0.1);
    expect(result.yearly[1].gap).toBe(-180000);
  });

  it('returns null attainment when target is missing', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, {});
    expect(result.yearly[0].attainment).toBeNull();
  });

  it('returns null attainment when target is zero', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 0, '2027': 0 });
    expect(result.yearly[0].attainment).toBeNull();
    expect(result.yearly[1].attainment).toBeNull();
  });

  it('allocates quarterly targets as annual/4', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 120000 });
    // Q1 2026 target = 120000 / 4 = 30000
    expect(result.quarterly[0].bpTarget).toBe(30000);
    expect(result.quarterly[0].period).toBe('2026-Q1');
  });

  it('allocates monthly targets as annual/12', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 120000 });
    // Jan 2026 target = 120000 / 12 = 10000
    expect(result.monthly[0].bpTarget).toBe(10000);
    expect(result.monthly[0].period).toBe('2026-01');
  });

  it('handles gap calculation correctly', () => {
    const result = buildBpAttainment(mockSkuResults, mockMonthlySummaries, { '2026': 15000 });
    // 2026: target 15000, revenue 20000, gap = +5000
    expect(result.yearly[0].gap).toBe(5000);
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

  it('formats USD with 2 decimals', () => {
    const result = formatBpAmount(1234.567, { ...DEFAULT_CURRENCY_SETTINGS, displayCurrency: 'USD' });
    expect(result).toContain('1,234.57');
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
