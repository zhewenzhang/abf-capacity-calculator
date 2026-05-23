/**
 * Currency conversion helper.
 * Calculation revenue stays USD-based; display can use USD/TWD/CNY.
 */

import type { CurrencyCode } from '../types';

export type DisplayCurrency = CurrencyCode;
export type ExchangeRateMode = 'constant' | 'yearly';

export interface CurrencySettings {
  baseCurrency: 'USD';
  displayCurrency: DisplayCurrency;
  exchangeRateMode: ExchangeRateMode;
  constantUsdToTwdRate: number;
  yearlyUsdToTwdRates: Record<string, number>;
  constantUsdToCnyRate: number;
  yearlyUsdToCnyRates: Record<string, number>;
}

const DEFAULT_YEARLY_USD_TO_TWD_RATES = {
  '2026': 32, '2027': 32, '2028': 32, '2029': 32, '2030': 32,
  '2031': 32, '2032': 32, '2033': 32, '2034': 32, '2035': 32,
  '2036': 32, '2037': 32, '2038': 32, '2039': 32, '2040': 32,
};

const DEFAULT_YEARLY_USD_TO_CNY_RATES = {
  '2026': 7.2, '2027': 7.2, '2028': 7.2, '2029': 7.2, '2030': 7.2,
  '2031': 7.2, '2032': 7.2, '2033': 7.2, '2034': 7.2, '2035': 7.2,
  '2036': 7.2, '2037': 7.2, '2038': 7.2, '2039': 7.2, '2040': 7.2,
};

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRateMode: 'constant',
  constantUsdToTwdRate: 32,
  yearlyUsdToTwdRates: DEFAULT_YEARLY_USD_TO_TWD_RATES,
  constantUsdToCnyRate: 7.2,
  yearlyUsdToCnyRates: DEFAULT_YEARLY_USD_TO_CNY_RATES,
};

export function normalizeCurrencyCode(value: unknown): CurrencyCode | null {
  const code = String(value ?? '').trim().toUpperCase();
  if (code === 'USD') return 'USD';
  if (code === 'TWD' || code === 'NTD') return 'TWD';
  if (code === 'CNY' || code === 'RMB') return 'CNY';
  return null;
}

export function currencyOrUsd(value: unknown): CurrencyCode {
  return normalizeCurrencyCode(value) ?? 'USD';
}

export function normalizeCurrencySettings(settings?: Partial<CurrencySettings>): CurrencySettings {
  return {
    ...DEFAULT_CURRENCY_SETTINGS,
    ...settings,
    baseCurrency: 'USD',
    displayCurrency: currencyOrUsd(settings?.displayCurrency),
    exchangeRateMode: settings?.exchangeRateMode === 'yearly' ? 'yearly' : 'constant',
    constantUsdToTwdRate: settings?.constantUsdToTwdRate || DEFAULT_CURRENCY_SETTINGS.constantUsdToTwdRate,
    yearlyUsdToTwdRates: {
      ...DEFAULT_CURRENCY_SETTINGS.yearlyUsdToTwdRates,
      ...(settings?.yearlyUsdToTwdRates ?? {}),
    },
    constantUsdToCnyRate: settings?.constantUsdToCnyRate || DEFAULT_CURRENCY_SETTINGS.constantUsdToCnyRate,
    yearlyUsdToCnyRates: {
      ...DEFAULT_CURRENCY_SETTINGS.yearlyUsdToCnyRates,
      ...(settings?.yearlyUsdToCnyRates ?? {}),
    },
  };
}

export function getUsdToCurrencyRate(settings: CurrencySettings, targetCurrency: CurrencyCode, year?: string): number {
  const normalized = normalizeCurrencySettings(settings);
  if (targetCurrency === 'USD') return 1;
  if (targetCurrency === 'TWD') return getUsdToTwdRate(normalized, year);
  if (normalized.exchangeRateMode === 'yearly' && year) {
    const yearlyRate = normalized.yearlyUsdToCnyRates[year];
    if (yearlyRate && yearlyRate > 0) return yearlyRate;
  }
  return normalized.constantUsdToCnyRate || DEFAULT_CURRENCY_SETTINGS.constantUsdToCnyRate;
}

export function getUsdToTwdRate(settings: CurrencySettings, year?: string): number {
  const normalized = normalizeCurrencySettings(settings);
  if (normalized.exchangeRateMode === 'yearly' && year) {
    const yearlyRate = normalized.yearlyUsdToTwdRates[year];
    if (yearlyRate && yearlyRate > 0) return yearlyRate;
  }
  return normalized.constantUsdToTwdRate || DEFAULT_CURRENCY_SETTINGS.constantUsdToTwdRate;
}

export function convertFromUsd(amountUsd: number, targetCurrency: CurrencyCode, settings: CurrencySettings, year?: string): number {
  return amountUsd * getUsdToCurrencyRate(settings, targetCurrency, year);
}

export function convertToUsd(amount: number, sourceCurrency: CurrencyCode | undefined, settings: CurrencySettings, year?: string): number {
  const currency = sourceCurrency ?? 'USD';
  if (currency === 'USD') return amount;
  return amount / getUsdToCurrencyRate(settings, currency, year);
}

export function convertCurrencyAmount(
  amount: number,
  sourceCurrency: CurrencyCode | undefined,
  targetCurrency: CurrencyCode,
  settings: CurrencySettings,
  year?: string
): number {
  const amountUsd = convertToUsd(amount, sourceCurrency ?? 'USD', settings, year);
  return convertFromUsd(amountUsd, targetCurrency, settings, year);
}

export function normalizePriceToUsd(
  unitPrice: number,
  unitPriceCurrency: CurrencyCode | undefined,
  settings: CurrencySettings,
  year?: string
): number {
  return convertToUsd(unitPrice, unitPriceCurrency ?? 'USD', settings, year);
}

export function convertCurrency(amountUsd: number, settings: CurrencySettings, year?: string): number {
  const normalized = normalizeCurrencySettings(settings);
  return convertFromUsd(amountUsd, normalized.displayCurrency, normalized, year);
}

export function formatCurrency(amountUsd: number, settings: CurrencySettings, year?: string): string {
  const normalized = normalizeCurrencySettings(settings);
  const converted = convertCurrency(amountUsd, normalized, year);
  if (normalized.displayCurrency === 'USD') {
    return converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function formatCurrencyShort(amountUsd: number, settings: CurrencySettings, year?: string): string {
  const converted = convertCurrency(amountUsd, settings, year);
  const abs = Math.abs(converted);
  const sign = converted < 0 ? '-' : '';

  let display: string;
  let unit: string;
  if (abs >= 1e9) {
    display = (abs / 1e9).toFixed(1);
    unit = 'B';
  } else if (abs >= 1e6) {
    display = (abs / 1e6).toFixed(1);
    unit = 'M';
  } else if (abs >= 1e3) {
    display = (abs / 1e3).toFixed(1);
    unit = 'K';
  } else {
    display = abs.toFixed(0);
    unit = '';
  }

  return `${sign}${display}${unit}`;
}

export function currencySymbol(settings: CurrencySettings): string {
  const displayCurrency = normalizeCurrencySettings(settings).displayCurrency;
  if (displayCurrency === 'USD') return '$';
  if (displayCurrency === 'TWD') return 'NT$';
  return '\u00A5';
}

export function currencyLabel(settings: CurrencySettings): string {
  return normalizeCurrencySettings(settings).displayCurrency;
}
