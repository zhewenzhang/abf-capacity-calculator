/**
 * Currency conversion helper.
 * Handles USD/TWD display conversion and formatting.
 * Input values are always in USD; conversion is display-layer only.
 */

export type DisplayCurrency = 'USD' | 'TWD';
export type ExchangeRateMode = 'constant' | 'yearly';

export interface CurrencySettings {
  baseCurrency: 'USD';
  displayCurrency: DisplayCurrency;
  exchangeRateMode: ExchangeRateMode;
  constantUsdToTwdRate: number;
  yearlyUsdToTwdRates: Record<string, number>;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  baseCurrency: 'USD',
  displayCurrency: 'USD',
  exchangeRateMode: 'constant',
  constantUsdToTwdRate: 32,
  yearlyUsdToTwdRates: {
    '2026': 32, '2027': 32, '2028': 32, '2029': 32, '2030': 32,
    '2031': 32, '2032': 32, '2033': 32, '2034': 32, '2035': 32,
    '2036': 32, '2037': 32, '2038': 32, '2039': 32, '2040': 32,
  },
};

// Get the USD→TWD rate for a given year
export function getUsdToTwdRate(settings: CurrencySettings, year?: string): number {
  if (settings.displayCurrency === 'USD') return 1;
  if (settings.exchangeRateMode === 'yearly' && year) {
    const yearlyRate = settings.yearlyUsdToTwdRates[year];
    if (yearlyRate && yearlyRate > 0) return yearlyRate;
  }
  // Fallback to constant rate
  return settings.constantUsdToTwdRate || 32;
}

// Convert a USD amount to display currency
export function convertCurrency(amountUsd: number, settings: CurrencySettings, year?: string): number {
  if (settings.displayCurrency === 'USD') return amountUsd;
  return amountUsd * getUsdToTwdRate(settings, year);
}

// Format currency for display (e.g., "1,234.00" or "39,616")
export function formatCurrency(amountUsd: number, settings: CurrencySettings, year?: string): string {
  const converted = convertCurrency(amountUsd, settings, year);
  if (settings.displayCurrency === 'USD') {
    return converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Format currency for compact display (e.g., "1.2B" or "38M")
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

// Get the currency symbol for input labels
export function currencySymbol(settings: CurrencySettings): string {
  return settings.displayCurrency === 'USD' ? '$' : 'NT$';
}

// Get the display currency label
export function currencyLabel(settings: CurrencySettings): string {
  return settings.displayCurrency === 'USD' ? 'USD' : 'TWD';
}
