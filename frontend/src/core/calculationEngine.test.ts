import { describe, it, expect } from 'vitest';
import {
  calculateSteps,
  calculateSkuMonth,
  runCalculation,
} from './calculationEngine';
import { getYieldRate, layerCountToBucket } from './yieldMatrix';
import { calculatePanelLayout } from './panelLayout';
import { DEFAULT_YIELD_MATRIX, DEFAULT_PANEL_PARAMS, DEFAULT_WORKING_DAYS } from './defaults';
import type { SKU, Forecast, CapacityPlan, ProjectParameters } from '../types';

// Helper to create test data
function makeSku(overrides: Partial<SKU> = {}): SKU {
  return {
    id: 'sku-1',
    skuCode: 'TEST-001',
    customer: 'Test Corp',
    deviceName: 'TestDevice',
    osat: 'ASE',
    application: 'Mobile',
    productGrade: 'A',
    sizeCategory: 'medium',
    chipLengthMm: 10,
    chipWidthMm: 10,
    layerCount: 8,
    unitPrice: 5.0,
    ...overrides,
  };
}

function makeForecast(overrides: Partial<Forecast> = {}): Forecast {
  return {
    id: 'fc-1',
    skuId: 'sku-1',
    month: '2026-01',
    forecastPcs: 10000,
    unitPrice: 5.0,
    ...overrides,
  };
}

function makeCapacityPlan(overrides: Partial<CapacityPlan> = {}): CapacityPlan {
  return {
    id: 'cp-1',
    month: '2026-01',
    factoryId: 'fab-a',
    corePanelPerDay: 6000,
    buPanelPerDay: 0,
    ...overrides,
  };
}

const defaultParams: ProjectParameters = {
  defaultWorkingDays: DEFAULT_WORKING_DAYS,
  yieldMatrix: DEFAULT_YIELD_MATRIX,
  panelParams: DEFAULT_PANEL_PARAMS,
};

// ===== Yield Matrix Tests =====
describe('layerCountToBucket', () => {
  it('maps 2L to 4-8L', () => {
    expect(layerCountToBucket(2)).toBe('4-8L');
  });
  it('maps 4L to 4-8L', () => {
    expect(layerCountToBucket(4)).toBe('4-8L');
  });
  it('maps 8L to 4-8L', () => {
    expect(layerCountToBucket(8)).toBe('4-8L');
  });
  it('maps 10L to 10-14L', () => {
    expect(layerCountToBucket(10)).toBe('10-14L');
  });
  it('maps 14L to 10-14L', () => {
    expect(layerCountToBucket(14)).toBe('10-14L');
  });
  it('maps 16L to 16-20L', () => {
    expect(layerCountToBucket(16)).toBe('16-20L');
  });
  it('maps 20L to 16-20L', () => {
    expect(layerCountToBucket(20)).toBe('16-20L');
  });
  it('maps 22L to 20L+', () => {
    expect(layerCountToBucket(22)).toBe('20L+');
  });
  it('maps 24L to 20L+', () => {
    expect(layerCountToBucket(24)).toBe('20L+');
  });
});

describe('getYieldRate', () => {
  it('returns correct rate for medium 4-8L', () => {
    expect(getYieldRate('medium', 4, DEFAULT_YIELD_MATRIX)).toBe(0.88);
  });
  it('returns correct rate for medium 8L', () => {
    expect(getYieldRate('medium', 8, DEFAULT_YIELD_MATRIX)).toBe(0.88);
  });
  it('returns correct rate for large 10-14L', () => {
    expect(getYieldRate('large', 10, DEFAULT_YIELD_MATRIX)).toBe(0.80);
  });
  it('returns correct rate for small 20L+', () => {
    expect(getYieldRate('small', 22, DEFAULT_YIELD_MATRIX)).toBe(0.92);
  });
  it('returns correct rate for xlarge 16-20L', () => {
    expect(getYieldRate('xlarge', 18, DEFAULT_YIELD_MATRIX)).toBe(0.71);
  });
});

// ===== Core/BU Steps Tests =====
describe('calculateSteps', () => {
  it('2L: core=1, bu=0', () => {
    expect(calculateSteps(2)).toEqual({ coreSteps: 1, buSteps: 0 });
  });
  it('4L: core=1, bu=1', () => {
    expect(calculateSteps(4)).toEqual({ coreSteps: 1, buSteps: 1 });
  });
  it('8L: core=1, bu=3', () => {
    expect(calculateSteps(8)).toEqual({ coreSteps: 1, buSteps: 3 });
  });
  it('20L: core=1, bu=9', () => {
    expect(calculateSteps(20)).toEqual({ coreSteps: 1, buSteps: 9 });
  });
});

// ===== Panel Layout Tests =====
describe('calculatePanelLayout', () => {
  it('returns expected pcs per panel for 10x10mm chip', () => {
    const result = calculatePanelLayout(10, 10, DEFAULT_PANEL_PARAMS);
    // usableLength = 244.1 - 20 = 224.1, usableWidth = 246.2 - 10.6 = 235.6
    // floor(224.1/10) = 22, floor(235.6/10) = 23, pcsPerPanel = 22*23 = 506
    expect(result.pcsPerPanel).toBe(506);
    expect(result.error).toBeUndefined();
  });

  it('returns expected pcs per panel for 5x5mm chip', () => {
    const result = calculatePanelLayout(5, 5, DEFAULT_PANEL_PARAMS);
    // floor(224.1/5) = 44, floor(235.6/5) = 47, pcsPerPanel = 44*47 = 2068
    expect(result.pcsPerPanel).toBe(2068);
  });

  it('returns error for chip too large', () => {
    const result = calculatePanelLayout(300, 300, DEFAULT_PANEL_PARAMS);
    expect(result.pcsPerPanel).toBe(0);
    expect(result.error).toBeDefined();
  });

  it('returns error for zero chip dimensions', () => {
    const result = calculatePanelLayout(0, 10, DEFAULT_PANEL_PARAMS);
    expect(result.error).toBeDefined();
  });
});

// ===== Required Input PCS (ceiling + yield) =====
describe('required input PCS calculation', () => {
  it('uses ceiling with yield rate', () => {
    const sku = makeSku({ sizeCategory: 'medium', layerCount: 8 });
    const fc = makeForecast({ forecastPcs: 10000 });
    const result = calculateSkuMonth(sku, fc, defaultParams);
    // yield = 0.88, requiredInputPcs = ceil(10000/0.88) = ceil(11363.64) = 11364
    expect(result.requiredInputPcs).toBe(11364);
  });

  it('correctly calculates for different yield rates', () => {
    const sku = makeSku({ sizeCategory: 'small', layerCount: 4 });
    const fc = makeForecast({ forecastPcs: 5000 });
    const result = calculateSkuMonth(sku, fc, defaultParams);
    // yield = 0.98, requiredInputPcs = ceil(5000/0.98) = ceil(5102.04) = 5103
    expect(result.requiredInputPcs).toBe(5103);
  });
});

// ===== Revenue Test =====
describe('revenue calculation', () => {
  it('revenue = forecastPcs * unitPrice', () => {
    const sku = makeSku({ unitPrice: 3.5 });
    const fc = makeForecast({ forecastPcs: 10000, unitPrice: 3.5 });
    const result = calculateSkuMonth(sku, fc, defaultParams);
    expect(result.revenue).toBe(35000);
  });

  it('revenue uses forecast unitPrice not SKU price', () => {
    const sku = makeSku({ unitPrice: 5.0 });
    const fc = makeForecast({ forecastPcs: 1000, unitPrice: 4.0 });
    const result = calculateSkuMonth(sku, fc, defaultParams);
    expect(result.revenue).toBe(4000);
  });
});

// ===== BU capacity = 0 with demand > 0 =====
describe('BU shortage when capacity is 0', () => {
  it('produces shortage and bottleneck when BU capacity is 0 but demand > 0', () => {
    const sku = makeSku({ layerCount: 8 }); // buSteps = 3
    const fc = makeForecast({ forecastPcs: 10000 });
    const cp = makeCapacityPlan({ corePanelPerDay: 100000, buPanelPerDay: 0 });
    
    const result = runCalculation([sku], [fc], [cp], defaultParams);
    
    const summary = result.monthlySummaries.find((s) => s.month === '2026-01')!;
    expect(summary).toBeDefined();
    expect(summary.totalBuPanelDemand).toBeGreaterThan(0);
    expect(summary.buCapacity).toBe(0);
    expect(summary.buShortage).toBeGreaterThan(0);
    expect(summary.buUtilization).toBeNull(); // Infinity case
    expect(summary.bottleneck).toBe('BU');
  });
});

// ===== Full calculation integration =====
describe('runCalculation', () => {
  it('returns correct summary for single SKU single month', () => {
    const sku = makeSku();
    const fc = makeForecast();
    const cp = makeCapacityPlan();
    
    const result = runCalculation([sku], [fc], [cp], defaultParams);
    
    expect(result.skuResults.length).toBe(1);
    expect(result.totalForecastPcs).toBe(10000);
    expect(result.totalRevenue).toBe(50000);
    expect(result.monthlySummaries.length).toBe(1);
  });

  it('skips zero-forecast entries', () => {
    const sku = makeSku();
    const fc = makeForecast({ forecastPcs: 0 });
    const cp = makeCapacityPlan();

    const result = runCalculation([sku], [fc], [cp], defaultParams);

    expect(result.skuResults.length).toBe(0);
  });

  it('silently skips orphan forecasts (no matching SKU)', () => {
    const sku = makeSku({ id: 'sku-1' });
    const validFc = makeForecast({ id: 'fc-valid', skuId: 'sku-1', forecastPcs: 10000 });
    const orphanFc = makeForecast({ id: 'fc-orphan', skuId: 'non-existent-sku', forecastPcs: 5000, month: '2026-02' });
    const cp = makeCapacityPlan();

    const result = runCalculation([sku], [validFc, orphanFc], [cp], defaultParams);

    // Only the valid forecast should produce a result; orphan is silently skipped
    expect(result.skuResults.length).toBe(1);
    expect(result.skuResults[0].skuId).toBe('sku-1');
    expect(result.totalForecastPcs).toBe(10000);
    expect(result.totalRevenue).toBe(50000);
  });

  it('aggregates multiple SKUs correctly', () => {
    const sku1 = makeSku({ id: 'sku-1', skuCode: 'A' });
    const sku2 = makeSku({ id: 'sku-2', skuCode: 'B' });
    const fc1 = makeForecast({ skuId: 'sku-1', forecastPcs: 5000 });
    const fc2 = makeForecast({ skuId: 'sku-2', forecastPcs: 5000 });
    const cp = makeCapacityPlan();
    
    const result = runCalculation([sku1, sku2], [fc1, fc2], [cp], defaultParams);
    
    expect(result.skuResults.length).toBe(2);
    expect(result.totalForecastPcs).toBe(10000);
    expect(result.totalRevenue).toBe(50000);
  });

  it('identifies shortage months correctly', () => {
    const sku = makeSku({ layerCount: 8 });
    const fc = makeForecast({ forecastPcs: 1000000 }); // huge demand
    const cp = makeCapacityPlan({ corePanelPerDay: 100, buPanelPerDay: 100 });
    
    const result = runCalculation([sku], [fc], [cp], defaultParams);
    
    expect(result.shortageMonthCount).toBeGreaterThan(0);
    expect(result.worstBottleneckMonth).toBe('2026-01');
  });
});
