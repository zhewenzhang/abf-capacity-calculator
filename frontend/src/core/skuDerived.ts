/**
 * Shared SKU derived calculation helper.
 *
 * Contains the canonical implementations of UPP and Yield Estimate.
 * All pages (Products, ProductsSpreadsheetLab) should
 * use these functions to avoid algorithm drift.
 */

import type { SizeCategory } from '../types';
import { DEFAULT_YIELD_MATRIX } from './defaults';

// Panel parameters (shared constants)
const PANEL = {
  lengthMm: 244.1,
  widthMm: 246.2,
  marginLengthMm: 10,
  marginWidthMm: 5.3,
  toleranceMm: 0.3,
} as const;

/**
 * Calculate UPP (units per panel) from chip dimensions.
 * Uses the actual panel layout formula: fits chips in both orientations
 * and picks the best, multiplied by 4 (quadrants).
 */
export function calculateSkuUpp(chipLengthMm: number, chipWidthMm: number): number {
  if (!chipLengthMm || !chipWidthMm || chipLengthMm <= 0 || chipWidthMm <= 0) return 0;
  const { lengthMm: PL, widthMm: PW, marginLengthMm: ML, marginWidthMm: MW, toleranceMm: T } = PANEL;
  const nL1 = Math.floor((PL - ML + T) / (chipLengthMm + T));
  const nW1 = Math.floor((PW - MW + T) / (chipWidthMm + T));
  const nL2 = Math.floor((PL - ML + T) / (chipWidthMm + T));
  const nW2 = Math.floor((PW - MW + T) / (chipLengthMm + T));
  return Math.max(nL1 * nW1 * 4, nL2 * nW2 * 4, 0);
}

/**
 * Calculate yield estimate from size category and layer count.
 * Uses DEFAULT_YIELD_MATRIX with layer bucket lookup.
 */
export function calculateSkuYieldEstimate(sizeCategory: SizeCategory, layerCount: number): number {
  if (!sizeCategory || !layerCount || layerCount < 2) return 0;
  const bucket = layerCount <= 8 ? '4-8L'
    : layerCount <= 14 ? '10-14L'
    : layerCount <= 20 ? '16-20L'
    : '20L+';
  return DEFAULT_YIELD_MATRIX[sizeCategory]?.[bucket as keyof typeof DEFAULT_YIELD_MATRIX.small] ?? 0;
}

/**
 * Derive computed fields (upp, yieldEstimate) for a partial SKU.
 * Only computes if enough input data is present.
 */
export function deriveSkuFields(sku: Partial<{
  chipLengthMm: number;
  chipWidthMm: number;
  sizeCategory: string;
  layerCount: number;
}>): { upp?: number; yieldEstimate?: number } {
  const derived: { upp?: number; yieldEstimate?: number } = {};
  if (sku.chipLengthMm && sku.chipWidthMm) {
    derived.upp = calculateSkuUpp(sku.chipLengthMm, sku.chipWidthMm);
  }
  if (sku.sizeCategory && sku.layerCount) {
    derived.yieldEstimate = calculateSkuYieldEstimate(sku.sizeCategory as SizeCategory, sku.layerCount);
  }
  return derived;
}

/**
 * Normalize a draft SKU from spreadsheet-like input.
 * Coerces string numbers to actual numbers for numeric fields.
 */
export function normalizeSkuDraft(input: Record<string, any>): Record<string, any> {
  const result = { ...input };
  const numericFields = ['chipLengthMm', 'chipWidthMm', 'layerCount', 'unitPrice', 'coreThicknessMm', 'upp', 'yieldEstimate'];
  for (const field of numericFields) {
    if (typeof result[field] === 'string') {
      const n = parseFloat(result[field]);
      result[field] = isNaN(n) ? undefined : n;
    }
  }
  return result;
}
