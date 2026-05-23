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
import type { SKU, ProjectScope } from '../types';
import { currencyOrUsd } from '../core/currency';
import { collectionPath, assertCanWrite } from './projectScope';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function skuPath(scope: ProjectScope) {
  return collectionPath(scope, 'skus');
}

function normalizeSku(id: string, data: Record<string, unknown>): SKU {
  return { id, ...data, unitPriceCurrency: currencyOrUsd(data.unitPriceCurrency) } as SKU;
}

export async function getSKUs(scope: ProjectScope): Promise<SKU[]> {
  const q = query(collection(db!, skuPath(scope)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => normalizeSku(d.id, d.data()));
}

export async function getSKU(scope: ProjectScope, skuId: string): Promise<SKU | null> {
  const ref = doc(db!, skuPath(scope), skuId);
  const snap = await getDoc(ref);
  return snap.exists() ? normalizeSku(snap.id, snap.data()) : null;
}

export async function saveSKU(scope: ProjectScope, sku: Omit<SKU, 'id'> & { id?: string }): Promise<string> {
  assertCanWrite(scope);
  const id = sku.id || crypto.randomUUID();
  const ref = doc(db!, skuPath(scope), id);
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

export async function deleteSKU(scope: ProjectScope, skuId: string): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, skuPath(scope), skuId);
  await deleteDoc(ref);
}

export async function batchSaveSKUs(
  scope: ProjectScope,
  skus: Array<Omit<SKU, 'id'> & { id?: string }>
): Promise<string[]> {
  assertCanWrite(scope);
  const batch = writeBatch(db!);
  const now = new Date();
  const ids: string[] = [];
  for (const sku of skus) {
    const id = sku.id || crypto.randomUUID();
    ids.push(id);
    const ref = doc(db!, skuPath(scope), id);
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
