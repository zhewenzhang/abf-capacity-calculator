import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Forecast, ProjectScope } from '../types';
import { currencyOrUsd } from '../core/currency';
import { assertValidForecastMonth } from '../core/forecastMonthValidator';
import { collectionPath, assertCanWrite } from './projectScope';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function forecastPath(scope: ProjectScope) {
  return collectionPath(scope, 'forecasts');
}

function normalizeForecast(id: string, data: Record<string, unknown>): Forecast {
  return { id, ...data, unitPriceCurrency: currencyOrUsd(data.unitPriceCurrency) } as Forecast;
}

export async function getForecasts(scope: ProjectScope): Promise<Forecast[]> {
  const q = query(collection(db!, forecastPath(scope)), orderBy('month', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeForecast(d.id, d.data()));
}

export async function getForecastsBySku(scope: ProjectScope, skuId: string): Promise<Forecast[]> {
  const q = query(
    collection(db!, forecastPath(scope)),
    where('skuId', '==', skuId),
    orderBy('month', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeForecast(d.id, d.data()));
}

export async function saveForecast(scope: ProjectScope, forecast: Omit<Forecast, 'id'> & { id?: string }): Promise<string> {
  assertCanWrite(scope);
  assertValidForecastMonth(forecast.month, 'saveForecast');
  const id = forecast.id || crypto.randomUUID();
  const ref = doc(db!, forecastPath(scope), id);
  const now = new Date();
  const data = {
    ...forecast,
    id,
    createdAt: forecast.createdAt || now,
    updatedAt: now,
  };
  await setDoc(ref, data);
  return id;
}

export async function batchSaveForecasts(
  scope: ProjectScope,
  forecasts: Array<Omit<Forecast, 'id'> & { id?: string }>
): Promise<void> {
  assertCanWrite(scope);

  // Validate all months before writing any
  const invalidSamples: string[] = [];
  for (const fc of forecasts) {
    if (typeof fc.month !== 'string' || !/^(?:20[0-9]{2})-(0[1-9]|1[0-2])$/.test(fc.month)) {
      if (invalidSamples.length < 5) {
        invalidSamples.push(`"${fc.month}" (skuId: ${fc.skuId})`);
      }
    }
  }
  if (invalidSamples.length > 0) {
    throw new Error(
      `INVALID_FORECAST_MONTH (batchSaveForecasts): ${invalidSamples.length}+ invalid month(s) detected. ` +
      `Samples: ${invalidSamples.join(', ')}. None were saved.`
    );
  }

  const batch = writeBatch(db!);
  const now = new Date();
  for (const fc of forecasts) {
    const id = fc.id || crypto.randomUUID();
    const ref = doc(db!, forecastPath(scope), id);
    batch.set(ref, {
      ...fc,
      id,
      createdAt: fc.createdAt || now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

export async function deleteForecast(scope: ProjectScope, forecastId: string): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, forecastPath(scope), forecastId);
  await deleteDoc(ref);
}

/**
 * Delete specific forecasts by their IDs.
 * Used for orphan forecast cleanup and rebind operations.
 */
export async function deleteForecastsByIds(scope: ProjectScope, forecastIds: string[]): Promise<number> {
  assertCanWrite(scope);
  if (forecastIds.length === 0) return 0;

  const BATCH_SIZE = 400;
  for (let i = 0; i < forecastIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db!);
    for (const id of forecastIds.slice(i, i + BATCH_SIZE)) {
      batch.delete(doc(db!, forecastPath(scope), id));
    }
    await batch.commit();
  }
  return forecastIds.length;
}

/**
 * Rebind orphan forecasts to a different SKU.
 * Updates the skuId field on each forecast document.
 */
export async function rebindForecastsToSku(
  scope: ProjectScope,
  forecastIds: string[],
  newSkuId: string
): Promise<number> {
  assertCanWrite(scope);
  if (forecastIds.length === 0) return 0;

  const BATCH_SIZE = 400;
  for (let i = 0; i < forecastIds.length; i += BATCH_SIZE) {
    const batch = writeBatch(db!);
    for (const id of forecastIds.slice(i, i + BATCH_SIZE)) {
      batch.update(doc(db!, forecastPath(scope), id), { skuId: newSkuId, updatedAt: new Date() });
    }
    await batch.commit();
  }
  return forecastIds.length;
}

/**
 * Delete all forecasts associated with a specific SKU.
 * Used for cascade cleanup when deleting a product.
 */
export async function deleteForecastsBySku(scope: ProjectScope, skuId: string): Promise<number> {
  assertCanWrite(scope);
  const forecasts = await getForecastsBySku(scope, skuId);
  if (forecasts.length === 0) return 0;

  const BATCH_SIZE = 400;
  for (let i = 0; i < forecasts.length; i += BATCH_SIZE) {
    const batch = writeBatch(db!);
    for (const fc of forecasts.slice(i, i + BATCH_SIZE)) {
      batch.delete(doc(db!, forecastPath(scope), fc.id));
    }
    await batch.commit();
  }
  return forecasts.length;
}
