import { describe, it, expect } from 'vitest';
import { calculateSkuUpp, calculateSkuYieldEstimate, deriveSkuFields, normalizeSkuDraft } from './skuDerived';

describe('calculateSkuUpp', () => {
  it('returns 0 for zero dimensions', () => {
    expect(calculateSkuUpp(0, 5)).toBe(0);
    expect(calculateSkuUpp(5, 0)).toBe(0);
    expect(calculateSkuUpp(0, 0)).toBe(0);
  });

  it('returns 0 for negative dimensions', () => {
    expect(calculateSkuUpp(-1, 5)).toBe(0);
    expect(calculateSkuUpp(5, -1)).toBe(0);
  });

  it('returns a positive integer for valid chip dimensions', () => {
    const upp = calculateSkuUpp(10, 10);
    expect(upp).toBeGreaterThan(0);
    expect(Number.isInteger(upp)).toBe(true);
  });

  it('returns higher UPP for smaller chips', () => {
    const small = calculateSkuUpp(5, 5);
    const large = calculateSkuUpp(20, 20);
    expect(small).toBeGreaterThan(large);
  });

  it('handles asymmetric chips', () => {
    const upp = calculateSkuUpp(15, 8);
    expect(upp).toBeGreaterThan(0);
  });
});

describe('calculateSkuYieldEstimate', () => {
  it('returns 0 for invalid inputs', () => {
    expect(calculateSkuYieldEstimate('small' as any, 0)).toBe(0);
    expect(calculateSkuYieldEstimate('small' as any, 1)).toBe(0);
    expect(calculateSkuYieldEstimate('' as any, 8)).toBe(0);
  });

  it('returns expected value for small 4-8L', () => {
    expect(calculateSkuYieldEstimate('small', 4)).toBe(0.98);
    expect(calculateSkuYieldEstimate('small', 8)).toBe(0.98);
  });

  it('returns expected value for medium 10-14L', () => {
    expect(calculateSkuYieldEstimate('medium', 10)).toBe(0.86);
    expect(calculateSkuYieldEstimate('medium', 14)).toBe(0.86);
  });

  it('returns expected value for large 16-20L', () => {
    expect(calculateSkuYieldEstimate('large', 16)).toBe(0.78);
  });

  it('returns expected value for xlarge 20L+', () => {
    expect(calculateSkuYieldEstimate('xlarge', 22)).toBe(0.69);
  });

  it('bucket boundaries are correct', () => {
    expect(calculateSkuYieldEstimate('small', 8)).toBe(0.98);  // 4-8L
    expect(calculateSkuYieldEstimate('small', 9)).toBe(0.96);  // 10-14L
    expect(calculateSkuYieldEstimate('small', 14)).toBe(0.96); // 10-14L
    expect(calculateSkuYieldEstimate('small', 15)).toBe(0.94); // 16-20L
    expect(calculateSkuYieldEstimate('small', 20)).toBe(0.94); // 16-20L
    expect(calculateSkuYieldEstimate('small', 21)).toBe(0.92); // 20L+
  });
});

describe('deriveSkuFields', () => {
  it('adds upp when chip dimensions are present', () => {
    const result = deriveSkuFields({ chipLengthMm: 10, chipWidthMm: 10 });
    expect(result.upp).toBeDefined();
    expect(result.upp!).toBeGreaterThan(0);
  });

  it('adds yieldEstimate when size and layers are present', () => {
    const result = deriveSkuFields({ sizeCategory: 'small', layerCount: 8 });
    expect(result.yieldEstimate).toBe(0.98);
  });

  it('adds both when all fields are present', () => {
    const result = deriveSkuFields({
      chipLengthMm: 10,
      chipWidthMm: 10,
      sizeCategory: 'medium',
      layerCount: 12,
    });
    expect(result.upp).toBeGreaterThan(0);
    expect(result.yieldEstimate).toBeGreaterThan(0);
  });

  it('returns empty object when insufficient data', () => {
    const result = deriveSkuFields({});
    expect(result).toEqual({});
  });
});

describe('normalizeSkuDraft', () => {
  it('converts numeric strings to numbers', () => {
    const input = { chipLengthMm: '10.5', chipWidthMm: '8', layerCount: '12', skuCode: 'ABC' };
    const result = normalizeSkuDraft(input);
    expect(result.chipLengthMm).toBe(10.5);
    expect(result.chipWidthMm).toBe(8);
    expect(result.layerCount).toBe(12);
    expect(result.skuCode).toBe('ABC'); // string fields stay as-is
  });

  it('handles non-numeric strings as undefined', () => {
    const input = { chipLengthMm: 'abc', unitPrice: 'N/A' };
    const result = normalizeSkuDraft(input);
    expect(result.chipLengthMm).toBeUndefined();
    expect(result.unitPrice).toBeUndefined();
  });

  it('leaves numbers untouched', () => {
    const input = { chipLengthMm: 10, layerCount: 8 };
    const result = normalizeSkuDraft(input);
    expect(result.chipLengthMm).toBe(10);
    expect(result.layerCount).toBe(8);
  });
});
