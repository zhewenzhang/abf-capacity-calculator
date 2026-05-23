import type { Forecast, SKU } from '../types';
import { currencyOrUsd } from './currency';

type SkipReason = 'target-has-data' | 'base-year-empty';

export interface YearlyGrowthBuildInput {
  skus: SKU[];
  forecasts: Forecast[];
  targetYears: string[];
  growthRatesByYear: Record<string, number>;
  selectedSkuIds?: string[];
}

export interface SkippedSkuYear {
  skuId: string;
  year: string;
  reason: SkipReason;
}

export interface YearlyGrowthBuildResult {
  generated: Array<Omit<Forecast, 'id'>>;
  generatedCount: number;
  skippedSkuYears: SkippedSkuYear[];
}

function monthKey(skuId: string, month: string): string {
  return `${skuId}::${month}`;
}

function monthsForYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

function previousYear(year: string): string {
  return String(Number(year) - 1);
}

function hasPositiveYearData(map: Map<string, Forecast>, skuId: string, year: string): boolean {
  return monthsForYear(year).some((month) => (map.get(monthKey(skuId, month))?.forecastPcs ?? 0) > 0);
}

export function buildYearlyGrowthForecasts(input: YearlyGrowthBuildInput): YearlyGrowthBuildResult {
  const selectedSet = input.selectedSkuIds?.length ? new Set(input.selectedSkuIds) : null;
  const targetSkus = selectedSet ? input.skus.filter((sku) => selectedSet.has(sku.id)) : input.skus;
  const forecastMap = new Map<string, Forecast>();
  const generated: Array<Omit<Forecast, 'id'>> = [];
  const skippedSkuYears: SkippedSkuYear[] = [];

  for (const forecast of input.forecasts) {
    forecastMap.set(monthKey(forecast.skuId, forecast.month), forecast);
  }

  const targetYears = [...input.targetYears]
    .map(String)
    .filter((year) => /^\d{4}$/.test(year))
    .sort();

  for (const year of targetYears) {
    const growthRate = input.growthRatesByYear[year] ?? 0;
    const multiplier = 1 + growthRate / 100;
    const baseYear = previousYear(year);

    for (const sku of targetSkus) {
      if (hasPositiveYearData(forecastMap, sku.id, year)) {
        skippedSkuYears.push({ skuId: sku.id, year, reason: 'target-has-data' });
        continue;
      }

      if (!hasPositiveYearData(forecastMap, sku.id, baseYear)) {
        skippedSkuYears.push({ skuId: sku.id, year, reason: 'base-year-empty' });
        continue;
      }

      for (let monthIndex = 1; monthIndex <= 12; monthIndex += 1) {
        const monthSuffix = String(monthIndex).padStart(2, '0');
        const baseMonth = `${baseYear}-${monthSuffix}`;
        const targetMonth = `${year}-${monthSuffix}`;
        const baseForecast = forecastMap.get(monthKey(sku.id, baseMonth));
        const basePcs = baseForecast?.forecastPcs ?? 0;

        if (basePcs <= 0) continue;

        const nextForecast: Omit<Forecast, 'id'> = {
          skuId: sku.id,
          month: targetMonth,
          forecastPcs: Math.round(basePcs * multiplier),
          unitPrice: sku.unitPrice ?? baseForecast?.unitPrice ?? 0,
          unitPriceCurrency: currencyOrUsd(sku.unitPriceCurrency ?? baseForecast?.unitPriceCurrency),
        };

        generated.push(nextForecast);
        forecastMap.set(monthKey(sku.id, targetMonth), { id: monthKey(sku.id, targetMonth), ...nextForecast });
      }
    }
  }

  return {
    generated,
    generatedCount: generated.length,
    skippedSkuYears,
  };
}
