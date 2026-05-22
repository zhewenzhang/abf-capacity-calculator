import { describe, expect, it } from 'vitest';
import type { Forecast, SKU } from '../types';
import { buildYearlyGrowthForecasts } from './forecastGrowth';

const skus: SKU[] = [
  {
    id: 'sku-a',
    skuCode: 'A',
    customer: 'Customer A',
    deviceName: 'Device A',
    osat: 'ASE',
    application: 'AI',
    productGrade: 'Auto',
    sizeCategory: 'medium',
    chipLengthMm: 10,
    chipWidthMm: 8,
    layerCount: 10,
    unitPrice: 2,
  },
  {
    id: 'sku-b',
    skuCode: 'B',
    customer: 'Customer B',
    deviceName: 'Device B',
    osat: 'Amkor',
    application: 'Server',
    productGrade: 'Industrial',
    sizeCategory: 'large',
    chipLengthMm: 12,
    chipWidthMm: 9,
    layerCount: 12,
    unitPrice: 5,
  },
];

function fc(skuId: string, month: string, forecastPcs: number, unitPrice = 1): Forecast {
  return {
    id: `${skuId}-${month}`,
    skuId,
    month,
    forecastPcs,
    unitPrice,
  };
}

describe('buildYearlyGrowthForecasts', () => {
  it('creates forecasts for an empty target year from the previous year with growth', () => {
    const forecasts = [
      fc('sku-a', '2026-01', 1000),
      fc('sku-a', '2026-02', 2000),
      fc('sku-b', '2026-01', 500),
    ];

    const result = buildYearlyGrowthForecasts({
      skus,
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 10 },
    });

    expect(result.generated).toEqual([
      { skuId: 'sku-a', month: '2027-01', forecastPcs: 1100, unitPrice: 2 },
      { skuId: 'sku-a', month: '2027-02', forecastPcs: 2200, unitPrice: 2 },
      { skuId: 'sku-b', month: '2027-01', forecastPcs: 550, unitPrice: 5 },
    ]);
    expect(result.generatedCount).toBe(3);
    expect(result.skippedSkuYears).toEqual([]);
  });

  it('does not overwrite a sku-year that already has positive forecast data', () => {
    const forecasts = [
      fc('sku-a', '2026-01', 1000),
      fc('sku-a', '2027-03', 300),
    ];

    const result = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 20 },
    });

    expect(result.generated).toEqual([]);
    expect(result.skippedSkuYears).toEqual([
      { skuId: 'sku-a', year: '2027', reason: 'target-has-data' },
    ]);
  });

  it('can cascade generated years so later empty years use the generated previous year', () => {
    const forecasts = [fc('sku-a', '2026-01', 1000)];

    const result = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts,
      targetYears: ['2027', '2028'],
      growthRatesByYear: { '2027': 10, '2028': 20 },
    });

    expect(result.generated).toEqual([
      { skuId: 'sku-a', month: '2027-01', forecastPcs: 1100, unitPrice: 2 },
      { skuId: 'sku-a', month: '2028-01', forecastPcs: 1320, unitPrice: 2 },
    ]);
  });

  it('limits generation to selected SKUs when selectedSkuIds is provided', () => {
    const forecasts = [
      fc('sku-a', '2026-01', 1000),
      fc('sku-b', '2026-01', 1000),
    ];

    const result = buildYearlyGrowthForecasts({
      skus,
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 10 },
      selectedSkuIds: ['sku-b'],
    });

    expect(result.generated).toEqual([
      { skuId: 'sku-b', month: '2027-01', forecastPcs: 1100, unitPrice: 5 },
    ]);
  });

  it('applies zero, positive, and negative growth rates per SKU per month', () => {
    const forecasts = [
      fc('sku-a', '2026-01', 1000),
      fc('sku-a', '2026-02', 333),
      fc('sku-b', '2026-01', 1000),
      fc('sku-b', '2026-02', 999),
    ];

    const zeroGrowth = buildYearlyGrowthForecasts({
      skus,
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 0 },
    });
    expect(zeroGrowth.generated).toEqual([
      { skuId: 'sku-a', month: '2027-01', forecastPcs: 1000, unitPrice: 2 },
      { skuId: 'sku-a', month: '2027-02', forecastPcs: 333, unitPrice: 2 },
      { skuId: 'sku-b', month: '2027-01', forecastPcs: 1000, unitPrice: 5 },
      { skuId: 'sku-b', month: '2027-02', forecastPcs: 999, unitPrice: 5 },
    ]);

    const positiveGrowth = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 12.5 },
    });
    expect(positiveGrowth.generated).toEqual([
      { skuId: 'sku-a', month: '2027-01', forecastPcs: 1125, unitPrice: 2 },
      { skuId: 'sku-a', month: '2027-02', forecastPcs: 375, unitPrice: 2 },
    ]);

    const negativeGrowth = buildYearlyGrowthForecasts({
      skus: [skus[1]],
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': -25 },
    });
    expect(negativeGrowth.generated).toEqual([
      { skuId: 'sku-b', month: '2027-01', forecastPcs: 750, unitPrice: 5 },
      { skuId: 'sku-b', month: '2027-02', forecastPcs: 749, unitPrice: 5 },
    ]);
  });

  it('sorts target years and uses generated data for later empty years regardless of input order', () => {
    const result = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts: [fc('sku-a', '2026-01', 1000)],
      targetYears: ['2028', 'not-a-year', '2027'],
      growthRatesByYear: { '2027': 10, '2028': 10 },
    });

    expect(result.generated).toEqual([
      { skuId: 'sku-a', month: '2027-01', forecastPcs: 1100, unitPrice: 2 },
      { skuId: 'sku-a', month: '2028-01', forecastPcs: 1210, unitPrice: 2 },
    ]);
    expect(result.skippedSkuYears).toEqual([]);
  });

  it('preserves existing forecasts when a target SKU-year has any positive data so reload cannot mix old and generated values', () => {
    const forecasts = [
      fc('sku-a', '2026-01', 1000),
      fc('sku-a', '2026-02', 2000),
      fc('sku-a', '2027-12', 1),
    ];

    const result = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 100 },
    });

    expect(result.generated).toEqual([]);
    expect(result.generatedCount).toBe(0);
    expect(result.skippedSkuYears).toEqual([
      { skuId: 'sku-a', year: '2027', reason: 'target-has-data' },
    ]);
  });

  it('skips sku-years when the previous year has no positive monthly data', () => {
    const forecasts = [fc('sku-a', '2026-01', 0)];

    const result = buildYearlyGrowthForecasts({
      skus: [skus[0]],
      forecasts,
      targetYears: ['2027'],
      growthRatesByYear: { '2027': 10 },
    });

    expect(result.generated).toEqual([]);
    expect(result.skippedSkuYears).toEqual([
      { skuId: 'sku-a', year: '2027', reason: 'base-year-empty' },
    ]);
  });
});
