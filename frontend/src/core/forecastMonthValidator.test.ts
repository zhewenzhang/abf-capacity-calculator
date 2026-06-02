import { describe, it, expect } from 'vitest';
import {
  isValidForecastMonth,
  extractYearFromMonth,
  assertValidForecastMonth,
  filterValidForecasts,
  findInvalidForecasts,
  groupInvalidForecastsByMonth,
} from './forecastMonthValidator';
import type { Forecast } from '../types';

function makeForecast(month: string, id = 'test-id'): Forecast {
  return { id, skuId: 'sku-1', month, forecastPcs: 100, unitPrice: 1.0 };
}

describe('forecastMonthValidator', () => {
  describe('isValidForecastMonth', () => {
    it('accepts valid YYYY-MM values', () => {
      expect(isValidForecastMonth('2026-01')).toBe(true);
      expect(isValidForecastMonth('2026-12')).toBe(true);
      expect(isValidForecastMonth('2030-06')).toBe(true);
      expect(isValidForecastMonth('2099-12')).toBe(true);
    });

    it('rejects invalid values', () => {
      expect(isValidForecastMonth('66ea')).toBe(false);
      expect(isValidForecastMonth('c5a3')).toBe(false);
      expect(isValidForecastMonth('2026')).toBe(false);
      expect(isValidForecastMonth('2026-13')).toBe(false);
      expect(isValidForecastMonth('2026-00')).toBe(false);
      expect(isValidForecastMonth('')).toBe(false);
      expect(isValidForecastMonth(null)).toBe(false);
      expect(isValidForecastMonth(undefined)).toBe(false);
      expect(isValidForecastMonth(123)).toBe(false);
      expect(isValidForecastMonth('abc-def')).toBe(false);
      expect(isValidForecastMonth('2026-1')).toBe(false); // single digit month
      expect(isValidForecastMonth('26-01')).toBe(false); // 2-digit year
    });
  });

  describe('extractYearFromMonth', () => {
    it('extracts year from valid month', () => {
      expect(extractYearFromMonth('2026-01')).toBe('2026');
      expect(extractYearFromMonth('2030-12')).toBe('2030');
    });

    it('returns null for invalid month', () => {
      expect(extractYearFromMonth('66ea')).toBeNull();
      expect(extractYearFromMonth('c5a3')).toBeNull();
      expect(extractYearFromMonth('')).toBeNull();
    });
  });

  describe('assertValidForecastMonth', () => {
    it('does not throw for valid month', () => {
      expect(() => assertValidForecastMonth('2026-01')).not.toThrow();
    });

    it('throws for invalid month', () => {
      expect(() => assertValidForecastMonth('66ea')).toThrow('INVALID_FORECAST_MONTH');
      expect(() => assertValidForecastMonth('c5a3')).toThrow('INVALID_FORECAST_MONTH');
      expect(() => assertValidForecastMonth('')).toThrow('INVALID_FORECAST_MONTH');
    });

    it('includes context in error message', () => {
      expect(() => assertValidForecastMonth('66ea', 'test-context')).toThrow('test-context');
    });
  });

  describe('filterValidForecasts', () => {
    it('filters out invalid months', () => {
      const forecasts = [
        makeForecast('2026-01', 'a'),
        makeForecast('66ea', 'b'),
        makeForecast('2026-06', 'c'),
        makeForecast('c5a3', 'd'),
        makeForecast('2027-03', 'e'),
      ];
      const valid = filterValidForecasts(forecasts);
      expect(valid).toHaveLength(3);
      expect(valid.map((f) => f.id)).toEqual(['a', 'c', 'e']);
    });

    it('returns all when all are valid', () => {
      const forecasts = [makeForecast('2026-01'), makeForecast('2026-02')];
      expect(filterValidForecasts(forecasts)).toHaveLength(2);
    });

    it('returns empty when all are invalid', () => {
      const forecasts = [makeForecast('66ea'), makeForecast('c5a3')];
      expect(filterValidForecasts(forecasts)).toHaveLength(0);
    });
  });

  describe('findInvalidForecasts', () => {
    it('finds only invalid forecasts', () => {
      const forecasts = [
        makeForecast('2026-01', 'a'),
        makeForecast('66ea', 'b'),
        makeForecast('c5a3', 'c'),
      ];
      const invalid = findInvalidForecasts(forecasts);
      expect(invalid).toHaveLength(2);
      expect(invalid.map((f) => f.id)).toEqual(['b', 'c']);
    });
  });

  describe('groupInvalidForecastsByMonth', () => {
    it('groups by invalid month value', () => {
      const forecasts = [
        makeForecast('66ea', 'a'),
        makeForecast('66ea', 'b'),
        makeForecast('c5a3', 'c'),
        makeForecast('', 'd'),
      ];
      const groups = groupInvalidForecastsByMonth(forecasts);
      expect(groups.get('66ea')).toHaveLength(2);
      expect(groups.get('c5a3')).toHaveLength(1);
      expect(groups.get('(empty)')).toHaveLength(1);
    });
  });
});
