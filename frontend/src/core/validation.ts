import type { SKU, Forecast, CapacityPlan, ValidationError, SizeCategory } from '../types';

const VALID_SIZES: SizeCategory[] = ['small', 'medium', 'large', 'xlarge'];

export function validateSKU(sku: Partial<SKU>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!sku.skuCode || sku.skuCode.trim() === '') {
    errors.push({ field: 'skuCode', message: 'SKU code is required' });
  }
  if (!sku.customer || sku.customer.trim() === '') {
    errors.push({ field: 'customer', message: 'Customer is required' });
  }
  if (!sku.deviceName || sku.deviceName.trim() === '') {
    errors.push({ field: 'deviceName', message: 'Device name is required' });
  }
  if (!sku.sizeCategory || !VALID_SIZES.includes(sku.sizeCategory)) {
    errors.push({ field: 'sizeCategory', message: 'Valid size category is required' });
  }
  if (!sku.chipLengthMm || sku.chipLengthMm <= 0) {
    errors.push({ field: 'chipLengthMm', message: 'Chip length must be positive' });
  }
  if (!sku.chipWidthMm || sku.chipWidthMm <= 0) {
    errors.push({ field: 'chipWidthMm', message: 'Chip width must be positive' });
  }
  if (!sku.layerCount || sku.layerCount < 2 || sku.layerCount % 2 !== 0) {
    errors.push({ field: 'layerCount', message: 'Layer count must be an even integer >= 2' });
  }
  if (sku.unitPrice === undefined || sku.unitPrice === null || sku.unitPrice < 0) {
    errors.push({ field: 'unitPrice', message: 'Unit price must be >= 0' });
  }

  return errors;
}

export function validateForecast(fc: Partial<Forecast>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!fc.skuId) {
    errors.push({ field: 'skuId', message: 'SKU is required' });
  }
  if (!fc.month || !/^\d{4}-\d{2}$/.test(fc.month)) {
    errors.push({ field: 'month', message: 'Month must be in YYYY-MM format' });
  }
  if (fc.forecastPcs === undefined || fc.forecastPcs === null || fc.forecastPcs < 0) {
    errors.push({ field: 'forecastPcs', message: 'Forecast PCS must be >= 0' });
  }

  return errors;
}

export function validateCapacityPlan(cp: Partial<CapacityPlan>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!cp.month || !/^\d{4}-\d{2}$/.test(cp.month)) {
    errors.push({ field: 'month', message: 'Month must be in YYYY-MM format' });
  }
  if (cp.workingDays === undefined || cp.workingDays === null || cp.workingDays < 0) {
    errors.push({ field: 'workingDays', message: 'Working days must be >= 0' });
  }
  if (cp.corePanelPerDay === undefined || cp.corePanelPerDay === null || cp.corePanelPerDay < 0) {
    errors.push({ field: 'corePanelPerDay', message: 'Core panel/day must be >= 0' });
  }
  if (cp.buPanelPerDay === undefined || cp.buPanelPerDay === null || cp.buPanelPerDay < 0) {
    errors.push({ field: 'buPanelPerDay', message: 'BU panel/day must be >= 0' });
  }

  return errors;
}
