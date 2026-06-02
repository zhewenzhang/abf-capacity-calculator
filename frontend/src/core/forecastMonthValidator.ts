/**
 * Forecast Month Validator — v1.54.6
 *
 * Shared validation utilities to prevent invalid month values from entering
 * the forecast system. Invalid months (e.g. "66ea", "c5a3", doc IDs, empty
 * strings) corrupt BP, capacity, scenario, and AI analysis calculations.
 *
 * Root cause: historical data or copy/import flows wrote non-YYYY-MM values
 * into Forecast.month. This module provides write-time rejection and
 * read-time filtering.
 */

import type { Forecast } from '../types';

/**
 * Strict YYYY-MM validation.
 * Accepts: "2026-01" through "2099-12"
 * Rejects: "66ea", "c5a3", "2026", "2026-13", "2026-00", "", null, undefined, UUIDs, etc.
 */
export function isValidForecastMonth(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^(?:20[0-9]{2})-(0[1-9]|1[0-2])$/.test(value);
}

/**
 * Extract the 4-digit year from a valid YYYY-MM month key.
 * Returns null if the key is invalid.
 */
export function extractYearFromMonth(value: string): string | null {
  if (!isValidForecastMonth(value)) return null;
  return value.substring(0, 4);
}

/**
 * Validate a forecast month value and throw if invalid.
 * Use in write paths (saveForecast, batchSaveForecasts) to reject bad data.
 */
export function assertValidForecastMonth(month: unknown, context?: string): void {
  if (!isValidForecastMonth(month)) {
    const ctx = context ? ` (${context})` : '';
    throw new Error(
      `INVALID_FORECAST_MONTH${ctx}: expected YYYY-MM format (e.g. "2026-01"), got "${String(month)}". ` +
      `This forecast will not be saved.`
    );
  }
}

/**
 * Filter forecasts to only those with valid YYYY-MM month values.
 * Used in read paths to prevent invalid data from entering calculations.
 */
export function filterValidForecasts(forecasts: Forecast[]): Forecast[] {
  return forecasts.filter((f) => isValidForecastMonth(f.month));
}

/**
 * Find all forecasts with invalid month values.
 * Used for DQ reporting and user-facing repair UI.
 */
export function findInvalidForecasts(forecasts: Forecast[]): Forecast[] {
  return forecasts.filter((f) => !isValidForecastMonth(f.month));
}

/**
 * Group invalid forecasts by their (invalid) month value for display.
 */
export function groupInvalidForecastsByMonth(forecasts: Forecast[]): Map<string, Forecast[]> {
  const groups = new Map<string, Forecast[]>();
  for (const f of findInvalidForecasts(forecasts)) {
    const key = f.month || '(empty)';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  }
  return groups;
}
