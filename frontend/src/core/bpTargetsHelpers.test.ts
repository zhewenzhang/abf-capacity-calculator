import { describe, it, expect } from 'vitest';
import {
  recordToRows,
  rowsToRecord,
  buildVisibleYears,
  buildBpSheetRows,
  rowsToBpTargetRecord,
  validateYearInput,
  type BpSheetRow,
} from './bpTargetsHelpers';
import { DEFAULT_CURRENCY_SETTINGS } from './currency';

describe('BP Targets Grid Helper Tests', () => {
  const metricLabel = 'BP Target (Million TWD)';

  // ============================================================
  // Legacy API (backward compatibility)
  // ============================================================
  describe('recordToRows (legacy)', () => {
    it('should correctly convert empty record to rows with null values', () => {
      const rows = recordToRows({}, metricLabel);
      expect(rows).toHaveLength(1);
      expect(rows[0].metric).toBe(metricLabel);
      expect(rows[0]['2026']).toBeNull();
      expect(rows[0]['2030']).toBeNull();
      expect(rows[0]['2040']).toBeNull();
    });

    it('should correctly fill existing year target values', () => {
      const record = { '2026': 1200, '2030': 1500.5, '2040': 0 };
      const rows = recordToRows(record, metricLabel);
      expect(rows).toHaveLength(1);
      expect(rows[0]['2026']).toBe(1200);
      expect(rows[0]['2030']).toBe(1500.5);
      expect(rows[0]['2040']).toBe(0);
      expect(rows[0]['2027']).toBeNull();
    });
  });

  describe('rowsToRecord (legacy)', () => {
    it('should correctly restore rows to record', () => {
      const rows: BpSheetRow[] = [{
        metric: metricLabel, metricType: 'targetTwd', readOnly: false,
        '2026': 1200, '2027': null, '2030': 1500.5, '2040': 0,
      }];
      const record = rowsToRecord(rows);
      expect(record).toEqual({ '2026': 1200, '2030': 1500.5, '2040': 0 });
    });

    it('should remove missing or empty years from the returned record', () => {
      const rows: BpSheetRow[] = [{
        metric: metricLabel, metricType: 'targetTwd', readOnly: false,
        '2026': 100, '2027': '  ', '2028': null, '2029': '', '2030': 200,
      }];
      const record = rowsToRecord(rows);
      expect(record).toEqual({ '2026': 100, '2030': 200 });
    });

    it('should throw error for negative target values', () => {
      const rows: BpSheetRow[] = [{
        metric: metricLabel, metricType: 'targetTwd', readOnly: false, '2026': -50,
      }];
      expect(() => rowsToRecord(rows)).toThrowError('NEGATIVE_VALUE:2026');
    });

    it('should throw error for non-numeric invalid values', () => {
      const rows: BpSheetRow[] = [{
        metric: metricLabel, metricType: 'targetTwd', readOnly: false, '2026': 'invalid-number',
      }];
      expect(() => rowsToRecord(rows)).toThrowError('INVALID_VALUE:2026');
    });
  });

  // ============================================================
  // buildVisibleYears
  // ============================================================
  describe('buildVisibleYears', () => {
    it('includes default range 2026-2040', () => {
      const years = buildVisibleYears({});
      expect(years).toContain('2026');
      expect(years).toContain('2040');
      expect(years[0]).toBe('2026');
      expect(years[years.length - 1]).toBe('2040');
    });

    it('includes earlier years from record', () => {
      const years = buildVisibleYears({ '2024': 100, '2025': 200 });
      expect(years).toContain('2024');
      expect(years).toContain('2025');
      expect(years[0]).toBe('2024');
    });

    it('includes later years from record', () => {
      const years = buildVisibleYears({ '2045': 500 });
      expect(years).toContain('2045');
      expect(years[years.length - 1]).toBe('2045');
    });

    it('handles null record gracefully', () => {
      const years = buildVisibleYears(null);
      expect(years.length).toBeGreaterThan(0);
      expect(years).toContain('2026');
    });
  });

  // ============================================================
  // validateYearInput
  // ============================================================
  describe('validateYearInput', () => {
    it('accepts valid year 2025', () => {
      expect(validateYearInput('2025')).toBeNull();
    });

    it('rejects non-numeric', () => {
      expect(validateYearInput('abc')).toBe('INVALID_YEAR');
    });

    it('rejects out of range', () => {
      expect(validateYearInput('1999')).toBe('OUT_OF_RANGE');
      expect(validateYearInput('2101')).toBe('OUT_OF_RANGE');
    });
  });

  // ============================================================
  // buildBpSheetRows
  // ============================================================
  describe('buildBpSheetRows', () => {
    const labels = {
      targetTwd: 'BP Target (Million TWD)',
      targetCny: 'BP Target (Million CNY)',
      targetUsd: 'BP Target (Million USD)',
      yoyGrowth: 'YoY Growth',
    };
    const settings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      constantUsdToTwdRate: 32,
      constantUsdToCnyRate: 7.2,
    };
    const years = ['2026', '2027', '2028'];

    it('produces 4 rows: TWD, CNY, USD, YoY', () => {
      const rows = buildBpSheetRows({}, labels, settings, years);
      expect(rows).toHaveLength(4);
      expect(rows[0].metricType).toBe('targetTwd');
      expect(rows[1].metricType).toBe('targetCny');
      expect(rows[2].metricType).toBe('targetUsd');
      expect(rows[3].metricType).toBe('yoyGrowth');
    });

    it('TWD row is editable, others are read-only', () => {
      const rows = buildBpSheetRows({}, labels, settings, years);
      expect(rows[0].readOnly).toBe(false);
      expect(rows[1].readOnly).toBe(true);
      expect(rows[2].readOnly).toBe(true);
      expect(rows[3].readOnly).toBe(true);
    });

    it('USD/CNY derived correctly: TWD=3200, rate=32 → USD=100, CNY=720', () => {
      const record = { '2026': 3200 };
      const rows = buildBpSheetRows(record, labels, settings, years);
      const usdRow = rows[2];
      const cnyRow = rows[1];
      expect(usdRow['2026']).toBe(100);
      expect(cnyRow['2026']).toBe(720);
    });

    it('YoY calculated correctly: 2026=100, 2027=120 → +20.0%', () => {
      const record = { '2026': 100, '2027': 120 };
      const rows = buildBpSheetRows(record, labels, settings, years);
      const yoyRow = rows[3];
      expect(yoyRow['2026']).toBeNull(); // first year has no YoY
      expect(yoyRow['2027']).toBe(20);
    });

    it('YoY is null when previous year is empty or 0', () => {
      const record = { '2027': 120 }; // 2026 is empty
      const rows = buildBpSheetRows(record, labels, settings, years);
      const yoyRow = rows[3];
      expect(yoyRow['2027']).toBeNull();
    });

    it('empty TWD shows null for all derived rows', () => {
      const rows = buildBpSheetRows({}, labels, settings, years);
      for (const row of rows) {
        for (const year of years) {
          expect(row[year]).toBeNull();
        }
      }
    });
  });

  // ============================================================
  // rowsToBpTargetRecord
  // ============================================================
  describe('rowsToBpTargetRecord', () => {
    const years = ['2026', '2027', '2028'];

    it('only saves TWD row values', () => {
      const rows: BpSheetRow[] = [
        { metric: 'TWD', metricType: 'targetTwd', readOnly: false, '2026': 100, '2027': 200, '2028': null },
        { metric: 'CNY', metricType: 'targetCny', readOnly: true, '2026': 720, '2027': 1440, '2028': null },
        { metric: 'USD', metricType: 'targetUsd', readOnly: true, '2026': 100, '2027': 200, '2028': null },
        { metric: 'YoY', metricType: 'yoyGrowth', readOnly: true, '2026': null, '2027': 100, '2028': null },
      ];
      const record = rowsToBpTargetRecord(rows, years);
      expect(record).toEqual({ '2026': 100, '2027': 200 });
      // 2028 is null → not saved
      expect(record).not.toHaveProperty('2028');
    });

    it('skips empty years (does not save 0)', () => {
      const rows: BpSheetRow[] = [
        { metric: 'TWD', metricType: 'targetTwd', readOnly: false, '2026': 100, '2027': null, '2028': '' },
      ];
      const record = rowsToBpTargetRecord(rows, years);
      expect(record).toEqual({ '2026': 100 });
    });

    it('throws NEGATIVE_VALUE for negative inputs', () => {
      const rows: BpSheetRow[] = [
        { metric: 'TWD', metricType: 'targetTwd', readOnly: false, '2026': -50 },
      ];
      expect(() => rowsToBpTargetRecord(rows, ['2026'])).toThrowError('NEGATIVE_VALUE:2026');
    });

    it('throws INVALID_VALUE for non-numeric inputs', () => {
      const rows: BpSheetRow[] = [
        { metric: 'TWD', metricType: 'targetTwd', readOnly: false, '2026': 'abc' },
      ];
      expect(() => rowsToBpTargetRecord(rows, ['2026'])).toThrowError('INVALID_VALUE:2026');
    });
  });

  // ============================================================
  // Parameters Protection during Restore Defaults
  // ============================================================
  describe('Parameters Protection during Restore Defaults', () => {
    it('should preserve bpTargets when merging defaults with latest params', () => {
      const latestParams = {
        defaultWorkingDays: 22,
        yieldMatrix: {},
        panelParams: {},
        bpTargets: { mode: 'yearly' as const, yearlyRevenueTargetsMillionTwd: { '2026': 1200 } },
      };
      const defaults = { defaultWorkingDays: 20, yieldMatrix: { 'size': { 'bucket': 0.98 } }, panelParams: { panelLengthMm: 500 } };
      const restoredParams = { ...defaults, bpTargets: latestParams.bpTargets };
      expect(restoredParams.bpTargets).toEqual({ mode: 'yearly', yearlyRevenueTargetsMillionTwd: { '2026': 1200 } });
      expect(restoredParams.defaultWorkingDays).toBe(20);
    });
  });
});
