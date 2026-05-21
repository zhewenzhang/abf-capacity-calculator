import { describe, it, expect } from 'vitest';
import {
  getUsdToTwdRate,
  convertCurrency,
  formatCurrency,
  DEFAULT_CURRENCY_SETTINGS,
} from './currency';
import type { CurrencySettings } from './currency';

describe('getUsdToTwdRate', () => {
  it('returns 1 for USD display currency', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'USD',
    };
    expect(getUsdToTwdRate(settings, '2026')).toBe(1);
  });

  it('returns constant rate for TWD constant mode', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'constant',
      constantUsdToTwdRate: 31.5,
    };
    expect(getUsdToTwdRate(settings, '2026')).toBe(31.5);
  });

  it('returns yearly rate for TWD yearly mode', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'yearly',
      yearlyUsdToTwdRates: { '2026': 30, '2027': 31 },
    };
    expect(getUsdToTwdRate(settings, '2026')).toBe(30);
    expect(getUsdToTwdRate(settings, '2027')).toBe(31);
  });

  it('falls back to constant rate when yearly rate is missing', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'yearly',
      constantUsdToTwdRate: 32,
      yearlyUsdToTwdRates: { '2026': 30 },
    };
    expect(getUsdToTwdRate(settings, '2099')).toBe(32);
  });
});

describe('convertCurrency', () => {
  it('returns original amount for USD', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'USD',
    };
    expect(convertCurrency(100, settings, '2026')).toBe(100);
  });

  it('multiplies by constant rate for TWD constant mode', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'constant',
      constantUsdToTwdRate: 32,
    };
    expect(convertCurrency(100, settings)).toBe(3200);
  });

  it('uses yearly rate for TWD yearly mode', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'yearly',
      yearlyUsdToTwdRates: { '2026': 30, '2027': 31 },
    };
    expect(convertCurrency(100, settings, '2026')).toBe(3000);
    expect(convertCurrency(100, settings, '2027')).toBe(3100);
  });
});

describe('formatCurrency', () => {
  it('formats USD with 2 decimals', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'USD',
    };
    const result = formatCurrency(1234.567, settings);
    expect(result).toBe('1,234.57');
  });

  it('formats TWD with no decimals', () => {
    const settings: CurrencySettings = {
      ...DEFAULT_CURRENCY_SETTINGS,
      displayCurrency: 'TWD',
      exchangeRateMode: 'constant',
      constantUsdToTwdRate: 32,
    };
    const result = formatCurrency(1000, settings);
    expect(result).toContain('32,000');
    expect(result).not.toContain('$');
  });
});
