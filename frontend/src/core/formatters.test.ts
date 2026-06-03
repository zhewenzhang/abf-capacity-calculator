/**
 * Unit tests for core/formatters.ts
 */

import { describe, it, expect } from 'vitest';
import {
  MISSING,
  isValidNumber,
  formatNumber,
  formatNumberWithSign,
  formatPercent,
  formatPercentDelta,
  formatCurrencyDisplay,
  formatBpMillionTwd,
  formatBpGapMillionTwd,
  formatPanels,
  formatPanelsWithUnit,
  formatUtilization,
  getUtilizationColor,
  formatPlainMoney,
  formatDelta,
} from './formatters';
import type { CurrencySettings } from './currency';

const USD_SETTINGS: CurrencySettings = {
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRateMode: 'constant',
  constantUsdToTwdRate: 32,
  yearlyUsdToTwdRates: {},
  constantUsdToCnyRate: 7.2,
  yearlyUsdToCnyRates: {},
};

const TWD_SETTINGS: CurrencySettings = {
  ...USD_SETTINGS,
  displayCurrency: 'TWD',
};

describe('isValidNumber', () => {
  it('returns false for null', () => {
    expect(isValidNumber(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidNumber(undefined)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isValidNumber(NaN)).toBe(false);
  });

  it('returns false for Infinity', () => {
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
  });

  it('returns true for 0', () => {
    expect(isValidNumber(0)).toBe(true);
  });

  it('returns true for -0', () => {
    expect(isValidNumber(-0)).toBe(true);
  });

  it('returns true for finite numbers', () => {
    expect(isValidNumber(123)).toBe(true);
    expect(isValidNumber(-456)).toBe(true);
    expect(isValidNumber(3.14)).toBe(true);
  });
});

describe('formatNumber', () => {
  it('returns em dash for null/undefined/NaN/Infinity', () => {
    expect(formatNumber(null)).toBe(MISSING);
    expect(formatNumber(undefined)).toBe(MISSING);
    expect(formatNumber(NaN)).toBe(MISSING);
    expect(formatNumber(Infinity)).toBe(MISSING);
  });

  it('returns "0" for zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('formats numbers with locale', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('respects precision option', () => {
    expect(formatNumber(123.456, { precision: 2 })).toBe('123.46');
    expect(formatNumber(123, { precision: 2 })).toBe('123.00');
  });
});

describe('formatNumberWithSign', () => {
  it('returns em dash for invalid values', () => {
    expect(formatNumberWithSign(null)).toBe(MISSING);
  });

  it('adds + sign for positive numbers', () => {
    expect(formatNumberWithSign(5.67)).toBe('+5.7');
  });

  it('adds - sign for negative numbers', () => {
    expect(formatNumberWithSign(-5.67)).toBe('-5.7');
  });

  it('returns +0.0 for zero', () => {
    expect(formatNumberWithSign(0)).toBe('+0.0');
  });
});

describe('formatPercent', () => {
  it('returns em dash for invalid values', () => {
    expect(formatPercent(null)).toBe(MISSING);
    expect(formatPercent(undefined)).toBe(MISSING);
    expect(formatPercent(NaN)).toBe(MISSING);
  });

  it('formats 0-1 range as percentage', () => {
    expect(formatPercent(0.863)).toBe('86.3%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('handles inputIsPercent option', () => {
    expect(formatPercent(86.3, { inputIsPercent: true })).toBe('86.3%');
  });

  it('respects precision option', () => {
    // Note: toFixed uses banker's rounding / floating point behavior
    expect(formatPercent(0.86345, { precision: 2 })).toBe('86.34%');
    expect(formatPercent(0.86, { precision: 0 })).toBe('86%');
  });
});

describe('formatPercentDelta', () => {
  it('returns em dash for invalid values', () => {
    expect(formatPercentDelta(null)).toBe(MISSING);
  });

  it('adds + sign for positive', () => {
    expect(formatPercentDelta(0.052)).toBe('+5.2%');
  });

  it('adds - sign for negative', () => {
    expect(formatPercentDelta(-0.031)).toBe('-3.1%');
  });

  it('returns +0.0% for zero', () => {
    expect(formatPercentDelta(0)).toBe('+0.0%');
  });
});

describe('formatCurrencyDisplay', () => {
  it('returns em dash for invalid values', () => {
    expect(formatCurrencyDisplay(null, USD_SETTINGS)).toBe(MISSING);
    expect(formatCurrencyDisplay(NaN, USD_SETTINGS)).toBe(MISSING);
  });

  it('formats USD with 2 decimals', () => {
    expect(formatCurrencyDisplay(1234.56, USD_SETTINGS)).toBe('$1,234.56');
  });

  it('formats TWD with 0 decimals', () => {
    // 12345 USD * 32 = 395040 TWD
    expect(formatCurrencyDisplay(12345, TWD_SETTINGS)).toBe('NT$395,040');
  });

  it('returns $0.00 for zero USD', () => {
    expect(formatCurrencyDisplay(0, USD_SETTINGS)).toBe('$0.00');
  });

  it('supports short format', () => {
    expect(formatCurrencyDisplay(1234567, USD_SETTINGS, { short: true })).toBe('$1.2M');
    expect(formatCurrencyDisplay(1234, USD_SETTINGS, { short: true })).toBe('$1.2K');
  });

  it('supports showSign option', () => {
    expect(formatCurrencyDisplay(100, USD_SETTINGS, { showSign: true })).toBe('+$100.00');
    expect(formatCurrencyDisplay(-100, USD_SETTINGS, { showSign: true })).toBe('-$100.00');
  });
});

describe('formatBpMillionTwd', () => {
  it('returns em dash for invalid values', () => {
    expect(formatBpMillionTwd(null)).toBe(MISSING);
  });

  it('formats with 1 decimal by default', () => {
    expect(formatBpMillionTwd(1234.56)).toBe('1,234.6');
  });

  it('formats zero as 0.0', () => {
    expect(formatBpMillionTwd(0)).toBe('0.0');
  });
});

describe('formatBpGapMillionTwd', () => {
  it('returns em dash for invalid values', () => {
    expect(formatBpGapMillionTwd(null)).toBe(MISSING);
  });

  it('adds + sign for positive', () => {
    expect(formatBpGapMillionTwd(123.4)).toBe('+123.4');
  });

  it('adds - sign for negative', () => {
    expect(formatBpGapMillionTwd(-50.5)).toBe('-50.5');
  });

  it('returns +0.0 for zero', () => {
    expect(formatBpGapMillionTwd(0)).toBe('+0.0');
  });
});

describe('formatPanels', () => {
  it('returns em dash for invalid values', () => {
    expect(formatPanels(null)).toBe(MISSING);
  });

  it('formats with locale', () => {
    expect(formatPanels(1234567)).toBe('1,234,567');
  });

  it('returns 0 for zero', () => {
    expect(formatPanels(0)).toBe('0');
  });
});

describe('formatPanelsWithUnit', () => {
  it('returns em dash for invalid values', () => {
    expect(formatPanelsWithUnit(null)).toBe(MISSING);
  });

  it('adds panels unit by default', () => {
    expect(formatPanelsWithUnit(1000)).toBe('1,000 panels');
  });

  it('supports panels/day unit', () => {
    expect(formatPanelsWithUnit(500, 'panels/day')).toBe('500 panels/day');
  });
});

describe('formatUtilization', () => {
  it('returns em dash for invalid values', () => {
    expect(formatUtilization(null)).toBe(MISSING);
    expect(formatUtilization(NaN)).toBe(MISSING);
  });

  it('formats valid utilization as percentage', () => {
    expect(formatUtilization(86.3)).toBe('86.3%');
    expect(formatUtilization(0)).toBe('0.0%');
  });

  it('returns overflow label for high values', () => {
    expect(formatUtilization(999)).toBe('>100%');
    expect(formatUtilization(150, { overflowThreshold: 100 })).toBe('>100%');
  });

  it('supports custom overflow label', () => {
    expect(formatUtilization(999, { overflowLabel: 'Over' })).toBe('Over');
  });
});

describe('getUtilizationColor', () => {
  it('returns default for invalid values', () => {
    expect(getUtilizationColor(null)).toBe('default');
    expect(getUtilizationColor(NaN)).toBe('default');
  });

  it('returns green for low utilization', () => {
    expect(getUtilizationColor(50)).toBe('green');
    expect(getUtilizationColor(79)).toBe('green');
  });

  it('returns orange for medium utilization', () => {
    expect(getUtilizationColor(80)).toBe('orange');
    expect(getUtilizationColor(94)).toBe('orange');
  });

  it('returns red for high utilization', () => {
    expect(getUtilizationColor(95)).toBe('red');
    expect(getUtilizationColor(100)).toBe('red');
  });
});

describe('formatPlainMoney', () => {
  it('returns em dash for invalid values', () => {
    expect(formatPlainMoney(null)).toBe(MISSING);
    expect(formatPlainMoney(undefined)).toBe(MISSING);
    expect(formatPlainMoney(NaN)).toBe(MISSING);
  });

  it('formats TWD as M NTD', () => {
    expect(formatPlainMoney(3500500000, 'TWD')).toBe('3,500.5 M NTD');
  });

  it('formats CNY as M RMB', () => {
    expect(formatPlainMoney(912000000, 'CNY')).toBe('912 M RMB');
  });

  it('formats USD as M USD', () => {
    expect(formatPlainMoney(128600000, 'USD')).toBe('128.6 M USD');
  });

  it('formats negative values', () => {
    expect(formatPlainMoney(-8510700000, 'TWD')).toBe('-8,510.7 M NTD');
  });

  it('formats with signed option', () => {
    expect(formatPlainMoney(3500500000, 'TWD', { signed: true })).toBe('+3,500.5 M NTD');
  });

  it('always uses M unit, never K or B', () => {
    // Large number should still use M, not B
    expect(formatPlainMoney(5000000000000, 'USD')).toBe('5,000,000 M USD');
    // Small number should still use M
    expect(formatPlainMoney(500000, 'TWD')).toBe('0.5 M NTD');
  });

  it('handles alreadyMillions option for BP values', () => {
    // BP target 11076 means 11,076 million TWD
    expect(formatPlainMoney(11076, 'TWD', { alreadyMillions: true })).toBe('11,076 M NTD');
    // Total of 5 years: 11076 + 20216 + 28664 + 33859 + 43329 = 137144
    expect(formatPlainMoney(137144, 'TWD', { alreadyMillions: true })).toBe('137,144 M NTD');
  });
});

describe('formatDelta', () => {
  it('returns em dash for invalid values', () => {
    expect(formatDelta(null)).toBe(MISSING);
    expect(formatDelta(undefined)).toBe(MISSING);
  });

  it('formats positive with + sign', () => {
    expect(formatDelta(3500.5)).toBe('+3,500.5');
  });

  it('formats negative with - sign', () => {
    expect(formatDelta(-8510.7)).toBe('-8,510.7');
  });

  it('formats with currency mapping', () => {
    expect(formatDelta(3500.5, { currency: 'TWD' })).toBe('+3,500.5 M NTD');
    expect(formatDelta(-100, { currency: 'CNY' })).toBe('-100.0 M RMB');
    expect(formatDelta(50, { currency: 'USD' })).toBe('+50.0 M USD');
  });
});
