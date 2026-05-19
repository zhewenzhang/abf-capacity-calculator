import type { SizeCategory, LayerBucket } from '../types';

// Map layer count to yield bucket
// 2L -> 4-8L (unless explicit 2L bucket added)
// 4L-8L -> 4-8L
// 10L-14L -> 10-14L
// 16L-20L -> 16-20L
// 21L+ -> 20L+
export function layerCountToBucket(layerCount: number): LayerBucket {
  if (layerCount <= 8) return '4-8L';
  if (layerCount <= 14) return '10-14L';
  if (layerCount <= 20) return '16-20L';
  return '20L+';
}

// Get yield rate from matrix
export function getYieldRate(
  sizeCategory: SizeCategory,
  layerCount: number,
  yieldMatrix: Record<SizeCategory, Record<LayerBucket, number>>
): number {
  const bucket = layerCountToBucket(layerCount);
  const rate = yieldMatrix[sizeCategory][bucket];
  if (rate === undefined || rate <= 0 || rate > 1) {
    throw new Error(`Invalid yield rate for ${sizeCategory}/${bucket}: ${rate}`);
  }
  return rate;
}
