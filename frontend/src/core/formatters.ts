/**
 * Unified display formatters for ABF Capacity Calculator.
 *
 * Core principles:
 * - null/undefined/NaN/Infinity → '—' (em dash, indicates missing/invalid)
 * - 0 → '0' (zero is valid data, NOT confused with missing)
 * - Never write formatted strings back to state or Firestore
 *
 * @module core/formatters
 */

import type { CurrencySettings } from './currency';
import { convertCurrency, currencySymbol, normalizeCurrencySettings } from './currency';

/** Em dash for missing/invalid values */
export const MISSING = '—'; // '—'

/**
 * Check if a value is a valid finite number (including 0).
 * Returns false for null, undefined, NaN, Infinity, -Infinity.
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// ============================================================================
// Number Formatters
// ============================================================================

/**
 * Format a number with locale-specific formatting.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatNumber(
  value: number | null | undefined,
  options?: { precision?: number; locale?: string }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { precision, locale } = options ?? {};
  if (precision !== undefined) {
    return value.toLocaleString(locale, {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }
  return value.toLocaleString(locale);
}

/**
 * Format a number with sign (+/-) and thousands separators.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatNumberWithSign(
  value: number | null | undefined,
  options?: { precision?: number }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { precision = 1 } = options ?? {};
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${sign}${value < 0 ? '-' : ''}${formatted}`;
}

/**
 * Map internal currency code to display currency name.
 * TWD → NTD, CNY → RMB, USD → USD
 */
export function normalizeDisplayCurrency(currency: string): string {
  if (currency === 'TWD') return 'NTD';
  if (currency === 'CNY') return 'RMB';
  return 'USD';
}

/**
 * Format a number as plain money in millions with currency label.
 * Always uses M unit (no K/B auto-switching).
 * No $ / NT$ / ¥ symbols. Shows: "3,500.5 M NTD", "128.6 M USD"
 * Returns '—' for null/undefined/NaN/Infinity.
 *
 * @param value - The amount to format
 * @param currency - Currency code (TWD/CNY/USD)
 * @param options - Options object
 * @param options.alreadyMillions - If true, value is already in millions (skip /1e6 conversion)
 */
export function formatPlainMoney(
  value: number | null | undefined,
  currency: string = 'TWD',
  options?: { maximumFractionDigits?: number; signed?: boolean; alreadyMillions?: boolean }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { maximumFractionDigits = 1, signed = false, alreadyMillions = false } = options ?? {};

  const displayCurrency = normalizeDisplayCurrency(currency);
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : (signed ? '+' : '');

  // If value is already in millions, don't divide again
  const displayValue = alreadyMillions ? abs : abs / 1e6;

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maximumFractionDigits,
  });

  return `${sign}${formatted} M ${displayCurrency}`;
}

/**
 * Format a delta value with sign and thousands separators.
 * Returns '—' for null/undefined/NaN/Infinity.
 * Example: "+3,500.5", "-8,510.7 M NTD"
 */
export function formatDelta(
  value: number | null | undefined,
  options?: { precision?: number; suffix?: string; currency?: string }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { precision = 1, suffix = '', currency } = options ?? {};
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });

  let unitSuffix = suffix;
  if (currency) {
    const displayCurrency = normalizeDisplayCurrency(currency);
    unitSuffix = ` M ${displayCurrency}`;
  }

  return `${sign}${value < 0 ? '-' : ''}${formatted}${unitSuffix}`;
}

// ============================================================================
// Percentage Formatters
// ============================================================================

export interface PercentOptions {
  /** Value is 0-100 instead of 0-1 (default: false, assumes 0-1) */
  inputIsPercent?: boolean;
  /** Decimal places (default: 1) */
  precision?: number;
}

/**
 * Format a value as percentage.
 * By default, expects 0-1 range (e.g., 0.863 → "86.3%").
 * Use inputIsPercent: true if value is already 0-100.
 *
 * Returns '—' for null/undefined/NaN/Infinity.
 * Returns "0.0%" for zero.
 */
export function formatPercent(
  value: number | null | undefined,
  options?: PercentOptions
): string {
  if (!isValidNumber(value)) return MISSING;
  const { inputIsPercent = false, precision = 1 } = options ?? {};
  const pct = inputIsPercent ? value : value * 100;
  return `${pct.toFixed(precision)}%`;
}

/**
 * Format a percentage change/delta with sign.
 * Returns '—' for null/undefined/NaN/Infinity, "0.0%" for zero.
 */
export function formatPercentDelta(
  value: number | null | undefined,
  options?: PercentOptions
): string {
  if (!isValidNumber(value)) return MISSING;
  const { inputIsPercent = false, precision = 1 } = options ?? {};
  const pct = inputIsPercent ? value : value * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(precision)}%`;
}

// ============================================================================
// Currency Formatters
// ============================================================================

export interface CurrencyDisplayOptions {
  /** Year for yearly exchange rate mode */
  year?: string;
  /** Use short format (K/M/B suffix) */
  short?: boolean;
  /** Show sign for deltas */
  showSign?: boolean;
}

/**
 * Format currency amount using display currency settings.
 * Returns '—' for null/undefined/NaN/Infinity.
 *
 * Example outputs:
 * - USD: "$1,234.56" or "$1.2M" (short)
 * - TWD: "NT$39,506" (no decimals)
 * - CNY: "¥8,929" (no decimals)
 */
export function formatCurrencyDisplay(
  amountUsd: number | null | undefined,
  settings: CurrencySettings,
  options?: CurrencyDisplayOptions
): string {
  if (!isValidNumber(amountUsd)) return MISSING;
  const { year, short = false, showSign = false } = options ?? {};
  const normalized = normalizeCurrencySettings(settings);
  const symbol = currencySymbol(normalized);
  const converted = convertCurrency(amountUsd, normalized, year);

  // Determine sign prefix
  const isNegative = converted < 0;
  const signPrefix = isNegative ? '-' : (showSign ? '+' : '');
  const absValue = Math.abs(converted);

  let formatted: string;
  if (short) {
    formatted = formatShortNumber(absValue);
  } else {
    // USD shows 2 decimals, TWD/CNY show 0
    const decimals = normalized.displayCurrency === 'USD' ? 2 : 0;
    formatted = absValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  return `${signPrefix}${symbol}${formatted}`;
}

/**
 * Format currency delta with sign.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatCurrencyDelta(
  amountUsd: number | null | undefined,
  settings: CurrencySettings,
  options?: CurrencyDisplayOptions
): string {
  return formatCurrencyDisplay(amountUsd, settings, { ...options, showSign: true });
}

/**
 * Helper to format large numbers with K/M/B suffix and thousands separators.
 */
function formatShortNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) return `${sign}${(abs / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ============================================================================
// BP (Million TWD) Formatters
// ============================================================================

/**
 * Format BP amount in Million TWD with thousands separators.
 * Returns '—' for null/undefined/NaN/Infinity.
 *
 * Note: Unit label "Million TWD" should be added separately in UI.
 */
export function formatBpMillionTwd(
  value: number | null | undefined,
  options?: { precision?: number }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { precision = 1 } = options ?? {};
  return value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Format BP gap with sign and thousands separators.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatBpGapMillionTwd(
  value: number | null | undefined,
  options?: { precision?: number }
): string {
  if (!isValidNumber(value)) return MISSING;
  const { precision = 1 } = options ?? {};
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
  return `${sign}${formatted}`;
}

// ============================================================================
// Panel Count Formatters
// ============================================================================

/**
 * Format panel count with locale formatting.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatPanels(value: number | null | undefined): string {
  return formatNumber(value);
}

/**
 * Format panel count with unit label.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatPanelsWithUnit(
  value: number | null | undefined,
  unit: 'panels' | 'panels/day' = 'panels'
): string {
  if (!isValidNumber(value)) return MISSING;
  return `${value.toLocaleString()} ${unit}`;
}

/**
 * Format panels per day rate.
 * Returns '—' for null/undefined/NaN/Infinity.
 */
export function formatPanelsPerDay(value: number | null | undefined): string {
  return formatPanelsWithUnit(value, 'panels/day');
}

// ============================================================================
// Utilization Formatters
// ============================================================================

export interface UtilizationOptions {
  /** Label for overflow (>100% or infinity) */
  overflowLabel?: string;
  /** Threshold for showing overflow */
  overflowThreshold?: number;
}

/**
 * Format utilization percentage.
 * Handles special cases:
 * - null/undefined/NaN/Infinity → '—'
 * - Value >= overflowThreshold (default 999) → overflowLabel
 *
 * Returns formatted percentage with 1 decimal.
 */
export function formatUtilization(
  value: number | null | undefined,
  options?: UtilizationOptions
): string {
  if (!isValidNumber(value)) return MISSING;

  const { overflowLabel = '>100%', overflowThreshold = 999 } = options ?? {};

  // Check for overflow sentinel or actual high utilization
  if (value >= overflowThreshold) return overflowLabel;

  return formatPercent(value / 100); // value is 0-100, convert to 0-1
}

/**
 * Render utilization with color coding.
 * Returns object with formatted value and color for styling.
 */
export function getUtilizationColor(value: number | null | undefined): 'green' | 'orange' | 'red' | 'default' {
  if (!isValidNumber(value)) return 'default';
  if (value >= 95) return 'red';
  if (value >= 80) return 'orange';
  return 'green';
}
