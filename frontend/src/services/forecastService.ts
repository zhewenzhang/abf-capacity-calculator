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
