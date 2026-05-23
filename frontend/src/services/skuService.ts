import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SKU } from '../types';
import { currencyOrUsd } from '../core/currency';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function skuPath(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/skus`;
}

function normalizeSku(id: string, data: Record<string, unknown>): SKU {
  return { id, ...data, unitPriceCurrency: currencyOrUsd(data.unitPriceCurrency) } as SKU;
}

export async function getSKUs(userId: string, projectId: string): Promise<SKU[]> {
  const q = query(collection(db!, skuPath(userId, projectId)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeSku(d.id, d.data()));
}

export async function getSKU(userId: string, projectId: string, skuId: string): Promise<SKU | null> {
  const ref = doc(db!, skuPath(userId, projectId), skuId);
  const snap = await getDoc(ref);
  return snap.exists() ? normalizeSku(snap.id, snap.data()) : null;
}

export async function saveSKU(userId: string, projectId: string, sku: Omit<SKU, 'id'> & { id?: string }): Promise<string> {
  const id = sku.id || crypto.randomUUID();
  const ref = doc(db!, skuPath(userId, projectId), id);
  const now = new Date();
  const data = {
    ...sku,
    id,
    createdAt: sku.createdAt || now,
    updatedAt: now,
  };
  await setDoc(ref, data);
  return id;
}

export async function deleteSKU(userId: string, projectId: string, skuId: string): Promise<void> {
  const ref = doc(db!, skuPath(userId, projectId), skuId);
  await deleteDoc(ref);
}

export async function batchSaveSKUs(
  userId: string,
  projectId: string,
  skus: Array<Omit<SKU, 'id'> & { id?: string }>
): Promise<string[]> {
  const batch = writeBatch(db!);
  const now = new Date();
  const ids: string[] = [];
  for (const sku of skus) {
    const id = sku.id || crypto.randomUUID();
    ids.push(id);
    const ref = doc(db!, skuPath(userId, projectId), id);
    batch.set(ref, {
      ...sku,
      id,
      createdAt: sku.createdAt || now,
      updatedAt: now,
    });
  }
  await batch.commit();
  return ids;
}
