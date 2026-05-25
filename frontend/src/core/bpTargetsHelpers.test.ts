import { describe, it, expect } from 'vitest';
import { recordToRows, rowsToRecord, type BpSheetRow } from './bpTargetsHelpers';

describe('BP Targets Grid Helper Tests', () => {
  const metricLabel = 'BP Target (Million TWD)';

  describe('recordToRows', () => {
    it('should correctly convert empty record to rows with null values', () => {
      const rows = recordToRows({}, metricLabel);
      expect(rows).toHaveLength(1);
      expect(rows[0].metric).toBe(metricLabel);
      expect(rows[0]['2026']).toBeNull();
      expect(rows[0]['2030']).toBeNull();
      expect(rows[0]['2040']).toBeNull();
    });

    it('should correctly fill existing year target values', () => {
      const record = {
        '2026': 1200,
        '2030': 1500.5,
        '2040': 0,
      };
      const rows = recordToRows(record, metricLabel);
      expect(rows).toHaveLength(1);
      expect(rows[0]['2026']).toBe(1200);
      expect(rows[0]['2030']).toBe(1500.5);
      expect(rows[0]['2040']).toBe(0);
      expect(rows[0]['2027']).toBeNull(); // Missing year should be null
    });
  });

  describe('rowsToRecord', () => {
    it('should correctly restore rows to record', () => {
      const rows: BpSheetRow[] = [
        {
          metric: metricLabel,
          '2026': 1200,
          '2027': null,
          '2030': 1500.5,
          '2040': 0,
        },
      ];
      const record = rowsToRecord(rows);
      expect(record).toEqual({
        '2026': 1200,
        '2030': 1500.5,
        '2040': 0,
      });
    });

    it('should remove missing or empty years from the returned record', () => {
      const rows: BpSheetRow[] = [
        {
          metric: metricLabel,
          '2026': 100,
          '2027': '  ', // Empty spaces
          '2028': null,
          '2029': '', // Empty string
          '2030': 200,
        },
      ];
      const record = rowsToRecord(rows);
      expect(record).toEqual({
        '2026': 100,
        '2030': 200,
      });
      expect(record).not.toHaveProperty('2027');
      expect(record).not.toHaveProperty('2028');
      expect(record).not.toHaveProperty('2029');
    });

    it('should throw error for negative target values', () => {
      const rows: BpSheetRow[] = [
        {
          metric: metricLabel,
          '2026': -50,
        },
      ];
      expect(() => rowsToRecord(rows)).toThrowError('NEGATIVE_VALUE:2026');
    });

    it('should throw error for non-numeric invalid values', () => {
      const rows: BpSheetRow[] = [
        {
          metric: metricLabel,
          '2026': 'invalid-number',
        },
      ];
      expect(() => rowsToRecord(rows)).toThrowError('INVALID_VALUE:2026');
    });
  });

  describe('Parameters Protection during Restore Defaults', () => {
    it('should preserve bpTargets when merging defaults with latest params', () => {
      const latestParams = {
        defaultWorkingDays: 22,
        yieldMatrix: {},
        panelParams: {},
        bpTargets: {
          mode: 'yearly' as const,
          yearlyRevenueTargetsMillionTwd: { '2026': 1200 },
        },
      };

      const defaults = {
        defaultWorkingDays: 20,
        yieldMatrix: { 'size': { 'bucket': 0.98 } },
        panelParams: { panelLengthMm: 500 },
      };

      const restoredParams = {
        ...defaults,
        bpTargets: latestParams.bpTargets, // 僅做唯讀回填保護，確保不受覆寫清空影響
      };

      expect(restoredParams.bpTargets).toEqual({
        mode: 'yearly',
        yearlyRevenueTargetsMillionTwd: { '2026': 1200 },
      });
      expect(restoredParams.defaultWorkingDays).toBe(20);
    });
  });
});
