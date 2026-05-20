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
import type { Forecast } from '../types';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function forecastPath(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/forecasts`;
}

export async function getForecasts(userId: string, projectId: string): Promise<Forecast[]> {
  const q = query(collection(db!, forecastPath(userId, projectId)), orderBy('month', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Forecast));
}

export async function getForecastsBySku(userId: string, projectId: string, skuId: string): Promise<Forecast[]> {
  const q = query(
    collection(db!, forecastPath(userId, projectId)),
    where('skuId', '==', skuId),
    orderBy('month', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Forecast));
}

export async function saveForecast(userId: string, projectId: string, forecast: Omit<Forecast, 'id'> & { id?: string }): Promise<string> {
  const id = forecast.id || crypto.randomUUID();
  const ref = doc(db!, forecastPath(userId, projectId), id);
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
  userId: string,
  projectId: string,
  forecasts: Array<Omit<Forecast, 'id'> & { id?: string }>
): Promise<void> {
  const batch = writeBatch(db!);
  const now = new Date();
  for (const fc of forecasts) {
    const id = fc.id || crypto.randomUUID();
    const ref = doc(db!, forecastPath(userId, projectId), id);
    batch.set(ref, {
      ...fc,
      id,
      createdAt: fc.createdAt || now,
      updatedAt: now,
    });
  }
  await batch.commit();
}

export async function deleteForecast(userId: string, projectId: string, forecastId: string): Promise<void> {
  const ref = doc(db!, forecastPath(userId, projectId), forecastId);
  await deleteDoc(ref);
}
