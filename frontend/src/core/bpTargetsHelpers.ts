/**
 * BP Targets 表格数据双向转换与校验助手纯函数
 * v1.54.5 — 支持派生行 (CNY/USD/YoY) 与动态年份
 */

import type { CurrencySettings } from './currency';
import { getUsdToTwdRate, getUsdToCurrencyRate } from './currency';

// ============================================================
// Types
// ============================================================

export type BpSheetMetric = 'targetTwd' | 'targetCny' | 'targetUsd' | 'yoyGrowth';

export interface BpSheetRow {
  metric: string;
  metricType: BpSheetMetric;
  readOnly: boolean;
  [year: string]: number | null | undefined | string | boolean;
}

// ============================================================
// Constants
// ============================================================

export const START_YEAR = 2026;
export const END_YEAR = 2040;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

// ============================================================
// Year range helpers
// ============================================================

/**
 * Build the list of visible years from a BP target record.
 * Includes the default range plus any years present in the record.
 */
export function buildVisibleYears(
  record: Record<string, number> | undefined | null,
  defaultStartYear = START_YEAR,
  defaultEndYear = END_YEAR
): string[] {
  const data = record || {};
  const yearSet = new Set<number>();

  // Default range
  for (let y = defaultStartYear; y <= defaultEndYear; y++) {
    yearSet.add(y);
  }

  // Include any years from the record
  for (const key of Object.keys(data)) {
    const y = parseInt(key, 10);
    if (!isNaN(y) && y >= MIN_YEAR && y <= MAX_YEAR) {
      yearSet.add(y);
    }
  }

  return Array.from(yearSet).sort((a, b) => a - b).map(String);
}

/**
 * Validate a year string. Returns null if valid, error message if invalid.
 */
export function validateYearInput(value: string): string | null {
  const num = parseInt(value, 10);
  if (isNaN(num) || String(num) !== value.trim()) {
    return 'INVALID_YEAR';
  }
  if (num < MIN_YEAR || num > MAX_YEAR) {
    return 'OUT_OF_RANGE';
  }
  return null;
}

// ============================================================
// Sheet row builders
// ============================================================

/**
 * Build all 4 sheet rows (TWD, CNY, USD, YoY) for the BP targets grid.
 * Only the TWD row is editable; CNY/USD/YoY are derived read-only rows.
 */
export function buildBpSheetRows(
  record: Record<string, number> | undefined | null,
  labels: {
    targetTwd: string;
    targetCny: string;
    targetUsd: string;
    yoyGrowth: string;
  },
  currencySettings: CurrencySettings,
  visibleYears: string[]
): BpSheetRow[] {
  const data = record || {};

  // Row 1: TWD (editable)
  const twdRow: BpSheetRow = {
    metric: labels.targetTwd,
    metricType: 'targetTwd',
    readOnly: false,
  };

  // Row 2: CNY (derived read-only)
  const cnyRow: BpSheetRow = {
    metric: labels.targetCny,
    metricType: 'targetCny',
    readOnly: true,
  };

  // Row 3: USD (derived read-only)
  const usdRow: BpSheetRow = {
    metric: labels.targetUsd,
    metricType: 'targetUsd',
    readOnly: true,
  };

  // Row 4: YoY (derived read-only)
  const yoyRow: BpSheetRow = {
    metric: labels.yoyGrowth,
    metricType: 'yoyGrowth',
    readOnly: true,
  };

  const twdValues: Record<string, number | null> = {};

  for (const year of visibleYears) {
    const twdVal = data[year];
    const hasValue = twdVal !== undefined && twdVal !== null && twdVal !== 0;

    // TWD
    if (hasValue) {
      twdRow[year] = twdVal!;
      twdValues[year] = twdVal!;
    } else {
      twdRow[year] = null;
      twdValues[year] = null;
    }

    // USD: TWD / usdToTwd rate
    if (hasValue) {
      const usdToTwd = getUsdToTwdRate(currencySettings, year);
      usdRow[year] = usdToTwd > 0 ? roundTo(twdVal! / usdToTwd, 1) : null;
    } else {
      usdRow[year] = null;
    }

    // CNY: USD * usdToCny rate
    if (hasValue) {
      const usdToTwd = getUsdToTwdRate(currencySettings, year);
      const usdToCny = getUsdToCurrencyRate(currencySettings, 'CNY', year);
      if (usdToTwd > 0) {
        const usdVal = twdVal! / usdToTwd;
        cnyRow[year] = roundTo(usdVal * usdToCny, 1);
      } else {
        cnyRow[year] = null;
      }
    } else {
      cnyRow[year] = null;
    }
  }

  // YoY: needs sequential access to previous year
  const sortedYears = [...visibleYears].sort();
  for (let i = 0; i < sortedYears.length; i++) {
    const year = sortedYears[i];
    const currentTwd = twdValues[year];

    if (i === 0 || currentTwd === null || currentTwd === undefined) {
      yoyRow[year] = null;
      continue;
    }

    const prevYear = sortedYears[i - 1];
    const prevTwd = twdValues[prevYear];

    if (prevTwd === null || prevTwd === undefined || prevTwd === 0) {
      yoyRow[year] = null;
    } else {
      const yoy = ((currentTwd - prevTwd) / prevTwd) * 100;
      yoyRow[year] = roundTo(yoy, 1);
    }
  }

  return [twdRow, cnyRow, usdRow, yoyRow];
}

/**
 * Extract only the TWD row values into a Firestore-saveable record.
 * Skips null/empty values — does NOT save 0 for empty years.
 */
export function rowsToBpTargetRecord(
  rows: BpSheetRow[],
  visibleYears: string[]
): Record<string, number> {
  const record: Record<string, number> = {};
  const twdRow = rows.find((r) => r.metricType === 'targetTwd');
  if (!twdRow) return record;

  for (const year of visibleYears) {
    const val = twdRow[year];

    // Skip null, undefined, empty
    if (val === null || val === undefined || String(val).trim() === '') {
      continue;
    }

    const num = Number(val);

    if (isNaN(num) || !isFinite(num)) {
      throw new Error(`INVALID_VALUE:${year}`);
    }
    if (num < 0) {
      throw new Error(`NEGATIVE_VALUE:${year}`);
    }

    record[year] = num;
  }

  return record;
}

// ============================================================
// Legacy helpers (backward compatibility)
// ============================================================

/**
 * Legacy: convert Firestore record to single-row format (old API).
 * New code should use buildBpSheetRows instead.
 */
export function recordToRows(
  record: Record<string, number> | undefined | null,
  metricLabel: string
): BpSheetRow[] {
  const row: BpSheetRow = {
    metric: metricLabel,
    metricType: 'targetTwd',
    readOnly: false,
  };
  const data = record || {};
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const key = String(year);
    const value = data[key];
    if (value !== undefined && value !== null) {
      row[key] = value;
    } else {
      row[key] = null;
    }
  }
  return [row];
}

/**
 * Legacy: convert single-row format back to Firestore record (old API).
 * New code should use rowsToBpTargetRecord instead.
 */
export function rowsToRecord(rows: BpSheetRow[]): Record<string, number> {
  const record: Record<string, number> = {};
  if (!rows || rows.length === 0) return record;
  const row = rows[0];
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const key = String(year);
    const val = row[key];
    if (val === null || val === undefined || String(val).trim() === '') {
      continue;
    }
    const num = Number(val);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error(`INVALID_VALUE:${year}`);
    }
    if (num < 0) {
      throw new Error(`NEGATIVE_VALUE:${year}`);
    }
    record[key] = num;
  }
  return record;
}

// ============================================================
// Helpers
// ============================================================

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
