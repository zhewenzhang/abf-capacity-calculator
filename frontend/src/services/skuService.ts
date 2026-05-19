import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SKU } from '../types';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function skuPath(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/skus`;
}

export async function getSKUs(userId: string, projectId: string): Promise<SKU[]> {
  const q = query(collection(db!, skuPath(userId, projectId)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SKU));
}

export async function getSKU(userId: string, projectId: string, skuId: string): Promise<SKU | null> {
  const ref = doc(db!, skuPath(userId, projectId), skuId);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as SKU) : null;
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
