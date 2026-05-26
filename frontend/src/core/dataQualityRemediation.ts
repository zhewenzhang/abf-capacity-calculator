/**
 * Data Quality Remediation Core Module
 *
 * v1.36.0 MVP - Data Quality Remediation Entry Points
 *
 * This module provides:
 * 1. Remediation type definitions (Quick Fix, Guided Fix, Navigation Fix)
 * 2. Validation functions for remediation inputs
 * 3. Remediation strategy classification based on DQ issue types
 * 4. URL parameter handling for navigation-based remediation
 *
 * IMPORTANT CONSTRAINTS:
 * - No new Firestore collections or schema changes
 * - All saves must reuse existing service APIs
 * - Viewer role must be blocked from all remediation actions
 * - No silent auto-fix - all changes require explicit user confirmation
 */

import type { DataQualityIssue } from './dataQuality';

// ========== Remediation Types ==========

export type RemediationType = 'quick-fix' | 'guided-fix' | 'navigation-fix';

export type RemediationDomain =
  | 'products'
  | 'forecasts'
  | 'capacity'
  | 'parameters'
  | 'bp-targets';

export interface RemediationContext {
  /** Type of remediation */
  type: RemediationType;
  /** Domain/page where remediation occurs */
  domain: RemediationDomain;
  /** The DQ issue being remediated */
  issue: DataQualityIssue;
  /** Whether the current user can edit (Owner/Editor vs Viewer) */
  canEdit: boolean;
  /** SKU ID if applicable */
  skuId?: string;
  /** Forecast ID if applicable */
  forecastId?: string;
  /** Year if applicable (for BP targets) */
  year?: string;
  /** Month if applicable (for capacity) */
  month?: string;
  /** Currency code if applicable */
  currency?: 'USD' | 'TWD' | 'CNY';
}

export interface QuickFixConfig {
  /** Fields that can be edited in this quick fix */
  editableFields: string[];
  /** Validation rules for each field */
  validationRules: Record<string, ValidationRule>;
  /** Service function to call for saving */
  saveAction: string;
}

export interface GuidedFixOption {
  /** Unique ID for this option */
  id: string;
  /** Display label (i18n key) */
  labelKey: string;
  /** Description (i18n key) */
  descriptionKey: string;
  /** Navigation target or action */
  action: 'navigate' | 'focus' | 'delete';
  /** Target URL if navigation */
  targetUrl?: string;
  /** URL parameters for navigation */
  urlParams?: Record<string, string>;
  /** Whether this option requires confirmation */
  requiresConfirm?: boolean;
}

export interface NavigationFixConfig {
  /** Target URL */
  targetUrl: string;
  /** URL parameters for focus/highlight */
  urlParams: Record<string, string>;
  /** CSS class for highlighting target element */
  highlightClass?: string;
}

// ========== Validation ==========

export interface ValidationRule {
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Whether the field is required */
  required?: boolean;
  /** Allowed values (for select/enum fields) */
  allowedValues?: string[];
  /** Custom validation function */
  customValidate?: (value: unknown) => boolean;
  /** Error message i18n key */
  errorMessageKey: string;
}

/**
 * Validate unit price value.
 * - Must be >= 0
 * - Must be a valid number
 */
export function validateUnitPrice(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'remediation.validation.invalidNumber' };
  }
  if (num < 0) {
    return { valid: false, error: 'remediation.validation.unitPriceMin' };
  }
  return { valid: true };
}

/**
 * Validate currency code.
 * - Must be one of: USD, TWD, CNY
 */
export function validateCurrency(value: unknown): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const allowed = ['USD', 'TWD', 'CNY'];
  if (!allowed.includes(String(value))) {
    return { valid: false, error: 'remediation.validation.invalidCurrency' };
  }
  return { valid: true };
}

/**
 * Validate layer count.
 * - Must be > 0
 * - Must be an integer
 */
export function validateLayerCount(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const num = Number(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    return { valid: false, error: 'remediation.validation.invalidInteger' };
  }
  if (num <= 0) {
    return { valid: false, error: 'remediation.validation.layerCountMin' };
  }
  return { valid: true };
}

/**
 * Validate size category.
 * - Must be one of: small, medium, large, xlarge
 */
export function validateSizeCategory(value: unknown): { valid: boolean; error?: string } {
  if (!value) {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const allowed = ['small', 'medium', 'large', 'xlarge'];
  if (!allowed.includes(String(value))) {
    return { valid: false, error: 'remediation.validation.invalidSizeCategory' };
  }
  return { valid: true };
}

/**
 * Validate exchange rate.
 * - Must be > 0
 * - Must be a valid number
 */
export function validateExchangeRate(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'remediation.validation.invalidNumber' };
  }
  if (num <= 0) {
    return { valid: false, error: 'remediation.validation.exchangeRateMin' };
  }
  return { valid: true };
}

/**
 * Validate BP target value.
 * - Must be >= 0
 * - Must be a valid number
 */
export function validateBpTarget(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'remediation.validation.invalidNumber' };
  }
  if (num < 0) {
    return { valid: false, error: 'remediation.validation.bpTargetMin' };
  }
  return { valid: true };
}

/**
 * Validate chip dimension (length or width).
 * - Must be > 0
 * - Must be a valid number
 */
export function validateChipDimension(value: unknown): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: 'remediation.validation.required' };
  }
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'remediation.validation.invalidNumber' };
  }
  if (num <= 0) {
    return { valid: false, error: 'remediation.validation.chipDimensionMin' };
  }
  return { valid: true };
}

// ========== Remediation Strategy Classification ==========

/**
 * Determine remediation type based on DQ issue ID pattern.
 */
export function getRemediationType(issue: DataQualityIssue): RemediationType {
  const id = issue.id;

  // Quick Fix patterns
  if (
    id.startsWith('sku-missing-attr-') ||
    id.startsWith('sku-zero-price-') ||
    id.startsWith('sku-unsupported-currency-') ||
    id.startsWith('forecast-zero-price-') ||
    id === 'missing-constant-twd-rate' ||
    id === 'missing-yearly-twd-rate' ||
    id === 'missing-constant-cny-rate' ||
    id === 'missing-yearly-cny-rate' ||
    id.startsWith('forecast-missing-bp-target-')
  ) {
    return 'quick-fix';
  }

  // Guided Fix patterns
  if (
    id.startsWith('forecast-orphan-sku-') ||
    id === 'bu-demand-zero-capacity'
  ) {
    return 'guided-fix';
  }

  // Navigation Fix patterns
  if (
    id === 'forecast-missing-capacity' ||
    id === 'capacity-without-forecast'
  ) {
    return 'navigation-fix';
  }

  // Default to quick-fix for unknown patterns
  return 'quick-fix';
}

/**
 * Get the domain for a DQ issue.
 */
export function getRemediationDomain(issue: DataQualityIssue): RemediationDomain {
  switch (issue.domain) {
    case 'products':
      return 'products';
    case 'forecast':
      return 'forecasts';
    case 'capacity':
      return 'capacity';
    case 'currency':
      return 'parameters';
    case 'bp':
      return 'bp-targets';
    default:
      return 'products';
  }
}

/**
 * Get quick fix configuration for SKU missing attributes.
 */
export function getSkuQuickFixConfig(issue: DataQualityIssue): QuickFixConfig | null {
  if (!issue.id.startsWith('sku-missing-attr-')) return null;

  return {
    editableFields: ['unitPrice', 'unitPriceCurrency', 'sizeCategory', 'layerCount', 'chipLengthMm', 'chipWidthMm', 'application'],
    validationRules: {
      unitPrice: { min: 0, required: true, errorMessageKey: 'remediation.validation.unitPriceMin' },
      unitPriceCurrency: { allowedValues: ['USD', 'TWD', 'CNY'], required: true, errorMessageKey: 'remediation.validation.invalidCurrency' },
      sizeCategory: { allowedValues: ['small', 'medium', 'large', 'xlarge'], required: true, errorMessageKey: 'remediation.validation.invalidSizeCategory' },
      layerCount: { min: 1, required: true, errorMessageKey: 'remediation.validation.layerCountMin' },
      chipLengthMm: { min: 0.01, required: true, errorMessageKey: 'remediation.validation.chipDimensionMin' },
      chipWidthMm: { min: 0.01, required: true, errorMessageKey: 'remediation.validation.chipDimensionMin' },
    },
    saveAction: 'saveSku',
  };
}

/**
 * Get guided fix options for orphan forecast.
 */
export function getOrphanForecastGuidedOptions(orphanSkuId: string): GuidedFixOption[] {
  return [
    {
      id: 'create-sku',
      labelKey: 'remediation.orphanForecast.createSku',
      descriptionKey: 'remediation.orphanForecast.createSkuDesc',
      action: 'navigate',
      targetUrl: '/products',
      urlParams: { createSku: orphanSkuId },
    },
    {
      id: 'edit-forecast',
      labelKey: 'remediation.orphanForecast.editForecast',
      descriptionKey: 'remediation.orphanForecast.editForecastDesc',
      action: 'focus',
    },
  ];
}

/**
 * Get navigation fix config for missing capacity.
 */
export function getMissingCapacityNavigationConfig(months: string[]): NavigationFixConfig {
  // Use the first affected month
  const targetMonth = months[0];

  return {
    targetUrl: '/capacity',
    urlParams: { focusMonth: targetMonth },
    highlightClass: 'remind-flash',
  };
}

// ========== URL Parameter Utilities ==========

/**
 * Parse remediation focus parameters from URL.
 */
export function parseRemediationFocusParams(search: string): {
  focusMonth?: string;
  focusField?: string;
  createSku?: string;
} {
  const params = new URLSearchParams(search);

  return {
    focusMonth: params.get('focusMonth') ?? undefined,
    focusField: params.get('focusField') ?? undefined,
    createSku: params.get('createSku') ?? undefined,
  };
}

/**
 * Build URL with remediation focus parameters.
 */
export function buildRemediationUrl(
  baseUrl: string,
  params: { focusMonth?: string; focusField?: string; createSku?: string }
): string {
  const url = new URL(baseUrl, window.location.origin);
  const searchParams = new URLSearchParams();

  if (params.focusMonth) searchParams.set('focusMonth', params.focusMonth);
  if (params.focusField) searchParams.set('focusField', params.focusField);
  if (params.createSku) searchParams.set('createSku', params.createSku);

  const searchString = searchParams.toString();
  return searchString ? `${url.pathname}?${searchString}` : url.pathname;
}

// ========== CSS Highlight Utilities ==========

/**
 * CSS class name for remediation highlight animation.
 */
export const REMEDIATION_HIGHLIGHT_CLASS = 'remind-flash';

/**
 * Duration of highlight animation in milliseconds.
 */
export const HIGHLIGHT_DURATION_MS = 3000;

/**
 * Apply highlight effect to an element.
 */
export function applyRemediationHighlight(element: HTMLElement): () => void {
  element.classList.add(REMEDIATION_HIGHLIGHT_CLASS);
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const timer = setTimeout(() => {
    element.classList.remove(REMEDIATION_HIGHLIGHT_CLASS);
  }, HIGHLIGHT_DURATION_MS);

  return () => {
    clearTimeout(timer);
    element.classList.remove(REMEDIATION_HIGHLIGHT_CLASS);
  };
}

/**
 * Generate element ID for capacity month field.
 */
export function getCapacityFieldId(month: string, field: 'core' | 'bu'): string {
  return `capacity-${month}-${field}`;
}

/**
 * Generate element ID for BP target year field.
 */
export function getBpTargetFieldId(year: string): string {
  return `bp-target-${year}`;
}
