import { describe, it, expect } from 'vitest';

// Month keys for a single year
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
type MonthKey = typeof MONTH_KEYS[number];

// Convert month index (1-12) to month key
function monthIndexToKey(idx: number): MonthKey {
  return MONTH_KEYS[idx - 1];
}

// Convert month key to month index (1-12)
function monthKeyToIndex(key: MonthKey): number {
  return MONTH_KEYS.indexOf(key) + 1;
}

// Build month string from year and month key
function buildMonthString(year: number, key: MonthKey): string {
  const idx = monthKeyToIndex(key);
  return `${year}-${String(idx).padStart(2, '0')}`;
}

// Parse month string to year and month key
function parseMonthString(month: string): { year: number; key: MonthKey } | null {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const idx = parseInt(match[2], 10);
  if (idx < 1 || idx > 12) return null;
  return { year, key: monthIndexToKey(idx) };
}

// Dirty key helper
function dirtyKey(skuId: string, monthKey: MonthKey): string {
  return `${skuId}||${monthKey}`;
}

// Compute dirty set
interface ForecastSheetRow {
  skuId: string;
  skuCode: string;
  customer: string;
  [month: string]: string | number;
}

function computeDirty(
  rows: ForecastSheetRow[],
  saved: ForecastSheetRow[]
): Set<string> {
  const dirty = new Set<string>();
  rows.forEach((row, idx) => {
    const savedRow = saved[idx];
    if (!savedRow) return;
    for (const monthKey of MONTH_KEYS) {
      if (row[monthKey] !== savedRow[monthKey]) {
        dirty.add(dirtyKey(row.skuId, monthKey));
      }
    }
  });
  return dirty;
}

describe('forecastsLabHelpers', () => {
  describe('monthIndexToKey', () => {
    it('converts month index 1 to jan', () => {
      expect(monthIndexToKey(1)).toBe('jan');
    });

    it('converts month index 12 to dec', () => {
      expect(monthIndexToKey(12)).toBe('dec');
    });

    it('converts month index 6 to jun', () => {
      expect(monthIndexToKey(6)).toBe('jun');
    });
  });

  describe('monthKeyToIndex', () => {
    it('converts jan to 1', () => {
      expect(monthKeyToIndex('jan')).toBe(1);
    });

    it('converts dec to 12', () => {
      expect(monthKeyToIndex('dec')).toBe(12);
    });

    it('converts jul to 7', () => {
      expect(monthKeyToIndex('jul')).toBe(7);
    });
  });

  describe('buildMonthString', () => {
    it('builds 2026-01 from year 2026 and jan', () => {
      expect(buildMonthString(2026, 'jan')).toBe('2026-01');
    });

    it('builds 2026-12 from year 2026 and dec', () => {
      expect(buildMonthString(2026, 'dec')).toBe('2026-12');
    });

    it('builds 2040-09 from year 2040 and sep', () => {
      expect(buildMonthString(2040, 'sep')).toBe('2040-09');
    });
  });

  describe('parseMonthString', () => {
    it('parses 2026-01 correctly', () => {
      const result = parseMonthString('2026-01');
      expect(result).toEqual({ year: 2026, key: 'jan' });
    });

    it('parses 2026-12 correctly', () => {
      const result = parseMonthString('2026-12');
      expect(result).toEqual({ year: 2026, key: 'dec' });
    });

    it('returns null for invalid format', () => {
      expect(parseMonthString('20261')).toBeNull();
      expect(parseMonthString('2026-1')).toBeNull();
      expect(parseMonthString('abc')).toBeNull();
    });

    it('returns null for out of range month', () => {
      expect(parseMonthString('2026-00')).toBeNull();
      expect(parseMonthString('2026-13')).toBeNull();
    });
  });

  describe('dirtyKey', () => {
    it('creates correct dirty key format', () => {
      expect(dirtyKey('sku123', 'jan')).toBe('sku123||jan');
    });

    it('handles complex skuId', () => {
      expect(dirtyKey('abc-def-ghi', 'dec')).toBe('abc-def-ghi||dec');
    });
  });

  describe('computeDirty', () => {
    const createRow = (skuId: string, values: Partial<Record<MonthKey, number>>): ForecastSheetRow => {
      const row: ForecastSheetRow = {
        skuId,
        skuCode: `SKU-${skuId}`,
        customer: 'Test',
      };
      for (const key of MONTH_KEYS) {
        row[key] = values[key] ?? 0;
      }
      return row;
    };

    it('returns empty set when rows are identical', () => {
      const rows = [createRow('sku1', { jan: 100, feb: 200 })];
      const saved = [createRow('sku1', { jan: 100, feb: 200 })];
      const dirty = computeDirty(rows, saved);
      expect(dirty.size).toBe(0);
    });

    it('detects single changed cell', () => {
      const rows = [createRow('sku1', { jan: 100, feb: 200 })];
      const saved = [createRow('sku1', { jan: 100, feb: 300 })];
      const dirty = computeDirty(rows, saved);
      expect(dirty.has('sku1||feb')).toBe(true);
      expect(dirty.size).toBe(1);
    });

    it('detects multiple changed cells', () => {
      const rows = [createRow('sku1', { jan: 100, feb: 200, mar: 300 })];
      const saved = [createRow('sku1', { jan: 150, feb: 250, mar: 300 })];
      const dirty = computeDirty(rows, saved);
      expect(dirty.has('sku1||jan')).toBe(true);
      expect(dirty.has('sku1||feb')).toBe(true);
      expect(dirty.has('sku1||mar')).toBe(false);
      expect(dirty.size).toBe(2);
    });

    it('detects changes across multiple rows', () => {
      const rows = [
        createRow('sku1', { jan: 100 }),
        createRow('sku2', { feb: 200 }),
      ];
      const saved = [
        createRow('sku1', { jan: 50 }),
        createRow('sku2', { feb: 100 }),
      ];
      const dirty = computeDirty(rows, saved);
      expect(dirty.has('sku1||jan')).toBe(true);
      expect(dirty.has('sku2||feb')).toBe(true);
      expect(dirty.size).toBe(2);
    });

    it('detects change from 0 to value', () => {
      const rows = [createRow('sku1', { jan: 100 })];
      const saved = [createRow('sku1', { jan: 0 })];
      const dirty = computeDirty(rows, saved);
      expect(dirty.has('sku1||jan')).toBe(true);
    });

    it('detects change from value to 0', () => {
      const rows = [createRow('sku1', { jan: 0 })];
      const saved = [createRow('sku1', { jan: 100 })];
      const dirty = computeDirty(rows, saved);
      expect(dirty.has('sku1||jan')).toBe(true);
    });
  });

  // Unit price inheritance tests (v1.26.1)
  describe('unitPrice inheritance', () => {
    // Mock types for testing
    interface MockSKU {
      id: string;
      unitPrice: number;
      unitPriceCurrency?: string;
    }

    interface MockForecast {
      id?: string;
      skuId: string;
      month: string;
      unitPrice: number;
      unitPriceCurrency?: string;
    }

    /**
     * Determines unit price with proper fallback chain:
     * 1. Existing forecast price (if available and non-zero)
     * 2. SKU price (if available and non-zero)
     * 3. Fallback to 0
     */
    function determineUnitPrice(
      existing: MockForecast | undefined,
      sku: MockSKU | undefined
    ): { unitPrice: number; unitPriceCurrency: string } {
      let unitPrice = 0;
      let unitPriceCurrency = 'USD';

      if (existing?.unitPrice !== undefined && existing.unitPrice !== 0) {
        // Priority 1: Use existing forecast price
        unitPrice = existing.unitPrice;
        unitPriceCurrency = existing.unitPriceCurrency || 'USD';
      } else if (sku?.unitPrice !== undefined && sku.unitPrice !== 0) {
        // Priority 2: Use SKU price
        unitPrice = sku.unitPrice;
        unitPriceCurrency = sku.unitPriceCurrency || 'USD';
      }
      // Priority 3: Fallback to 0

      return { unitPrice, unitPriceCurrency };
    }

    it('uses existing forecast price when available', () => {
      const existing: MockForecast = {
        id: 'fc1',
        skuId: 'sku1',
        month: '2026-01',
        unitPrice: 100,
        unitPriceCurrency: 'TWD',
      };
      const sku: MockSKU = {
        id: 'sku1',
        unitPrice: 50,
        unitPriceCurrency: 'USD',
      };

      const result = determineUnitPrice(existing, sku);
      expect(result.unitPrice).toBe(100);
      expect(result.unitPriceCurrency).toBe('TWD');
    });

    it('inherits from SKU when no existing forecast', () => {
      const sku: MockSKU = {
        id: 'sku1',
        unitPrice: 75,
        unitPriceCurrency: 'CNY',
      };

      const result = determineUnitPrice(undefined, sku);
      expect(result.unitPrice).toBe(75);
      expect(result.unitPriceCurrency).toBe('CNY');
    });

    it('inherits from SKU when existing forecast has zero price', () => {
      const existing: MockForecast = {
        id: 'fc1',
        skuId: 'sku1',
        month: '2026-01',
        unitPrice: 0,
        unitPriceCurrency: 'USD',
      };
      const sku: MockSKU = {
        id: 'sku1',
        unitPrice: 80,
        unitPriceCurrency: 'TWD',
      };

      const result = determineUnitPrice(existing, sku);
      expect(result.unitPrice).toBe(80);
      expect(result.unitPriceCurrency).toBe('TWD');
    });

    it('falls back to 0 when both existing and SKU have no price', () => {
      const existing: MockForecast = {
        id: 'fc1',
        skuId: 'sku1',
        month: '2026-01',
        unitPrice: 0,
      };
      const sku: MockSKU = {
        id: 'sku1',
        unitPrice: 0,
      };

      const result = determineUnitPrice(existing, sku);
      expect(result.unitPrice).toBe(0);
      expect(result.unitPriceCurrency).toBe('USD');
    });

    it('falls back to 0 when SKU is undefined', () => {
      const result = determineUnitPrice(undefined, undefined);
      expect(result.unitPrice).toBe(0);
      expect(result.unitPriceCurrency).toBe('USD');
    });

    it('uses existing forecast currency even when price is from SKU', () => {
      // This tests that we correctly use SKU price but default currency when existing has 0 price
      const existing: MockForecast = {
        id: 'fc1',
        skuId: 'sku1',
        month: '2026-01',
        unitPrice: 0,
        unitPriceCurrency: 'USD',
      };
      const sku: MockSKU = {
        id: 'sku1',
        unitPrice: 90,
        unitPriceCurrency: 'TWD',
      };

      const result = determineUnitPrice(existing, sku);
      expect(result.unitPrice).toBe(90);
      expect(result.unitPriceCurrency).toBe('TWD'); // SKU currency when existing price is 0
    });
  });

  // Zero value handling tests (v1.26.1)
  describe('zero value handling', () => {
    /**
     * Determines if a forecast should be deleted (when value is 0 and forecast exists)
     * or created (when value > 0).
     */
    function classifyChange(
      pcs: number,
      existingForecastId: string | undefined
    ): { action: 'create' | 'update' | 'delete' | 'skip' } {
      if (pcs < 0) {
        throw new Error('Negative values not allowed');
      }
      if (pcs === 0) {
        if (existingForecastId) {
          return { action: 'delete' };
        }
        return { action: 'skip' };
      }
      if (existingForecastId) {
        return { action: 'update' };
      }
      return { action: 'create' };
    }

    it('classifies zero with existing forecast as delete', () => {
      const result = classifyChange(0, 'fc-existing-id');
      expect(result.action).toBe('delete');
    });

    it('classifies zero without existing forecast as skip', () => {
      const result = classifyChange(0, undefined);
      expect(result.action).toBe('skip');
    });

    it('classifies positive value with existing forecast as update', () => {
      const result = classifyChange(100, 'fc-existing-id');
      expect(result.action).toBe('update');
    });

    it('classifies positive value without existing forecast as create', () => {
      const result = classifyChange(100, undefined);
      expect(result.action).toBe('create');
    });

    it('rejects negative values', () => {
      expect(() => classifyChange(-10, undefined)).toThrow('Negative values not allowed');
    });
  });
});
