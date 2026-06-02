import { describe, it, expect } from 'vitest';
import {
  defaultAssumption,
  clampAssumption,
  extractDataYears,
  buildScenarioVisibleYears,
} from './yearlyScenario';
import type { Forecast, CapacityPlan } from '../types';

describe('yearlyScenario', () => {
  // ============================================================
  // defaultAssumption
  // ============================================================
  describe('defaultAssumption', () => {
    it('returns all multipliers at 1.0', () => {
      const a = defaultAssumption();
      expect(a.forecastMultiplier).toBe(1.0);
      expect(a.priceMultiplier).toBe(1.0);
      expect(a.coreCapacityMultiplier).toBe(1.0);
      expect(a.buCapacityMultiplier).toBe(1.0);
    });
  });

  // ============================================================
  // clampAssumption
  // ============================================================
  describe('clampAssumption', () => {
    it('clamps values to [0, 3]', () => {
      const a = clampAssumption({
        forecastMultiplier: -0.5,
        priceMultiplier: 4.0,
        coreCapacityMultiplier: 0.5,
        buCapacityMultiplier: 2.5,
      });
      expect(a.forecastMultiplier).toBe(0);
      expect(a.priceMultiplier).toBe(3);
      expect(a.coreCapacityMultiplier).toBe(0.5);
      expect(a.buCapacityMultiplier).toBe(2.5);
    });

    it('preserves valid values', () => {
      const a = clampAssumption({
        forecastMultiplier: 1.2,
        priceMultiplier: 0.8,
        coreCapacityMultiplier: 1.0,
        buCapacityMultiplier: 1.5,
      });
      expect(a.forecastMultiplier).toBe(1.2);
      expect(a.priceMultiplier).toBe(0.8);
      expect(a.coreCapacityMultiplier).toBe(1.0);
      expect(a.buCapacityMultiplier).toBe(1.5);
    });
  });

  // ============================================================
  // extractDataYears
  // ============================================================
  describe('extractDataYears', () => {
    it('extracts unique years from forecasts and capacity plans', () => {
      const forecasts: Partial<Forecast>[] = [
        { month: '2026-01' },
        { month: '2026-06' },
        { month: '2027-03' },
      ];
      const capacity: Partial<CapacityPlan>[] = [
        { month: '2026-01' },
        { month: '2028-12' },
      ];
      const years = extractDataYears(forecasts as Forecast[], capacity as CapacityPlan[]);
      expect(years).toEqual(['2026', '2027', '2028']);
    });

    it('handles empty inputs', () => {
      expect(extractDataYears([], [])).toEqual([]);
    });
  });

  // ============================================================
  // buildScenarioVisibleYears
  // ============================================================
  describe('buildScenarioVisibleYears', () => {
    it('includes default range', () => {
      const years = buildScenarioVisibleYears([]);
      expect(years).toContain('2026');
      expect(years).toContain('2034');
    });

    it('includes data years outside default range', () => {
      const years = buildScenarioVisibleYears(['2024', '2040']);
      expect(years).toContain('2024');
      expect(years).toContain('2040');
    });

    it('years are sorted', () => {
      const years = buildScenarioVisibleYears(['2030', '2025', '2028']);
      const sorted = [...years].sort();
      expect(years).toEqual(sorted);
    });
  });
});
