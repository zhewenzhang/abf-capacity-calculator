import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { SKU } from '../types';

interface SKUVersionSnapshot {
  id: string;
  versionName: string;
  createdAt: Date;
  skus: SKU[];
}

function versionsPath(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/skuVersions`;
}

export async function saveVersion(
  userId: string,
  projectId: string,
  versionName: string,
  skus: SKU[]
): Promise<string> {
  const id = `sku-v-${Date.now()}`;
  const ref = doc(db!, versionsPath(userId, projectId), id);
  await setDoc(ref, {
    id,
    versionName,
    createdAt: new Date(),
    skus,
  });
  return id;
}

export async function getVersions(userId: string, projectId: string): Promise<SKUVersionSnapshot[]> {
  const q = query(collection(db!, versionsPath(userId, projectId)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    let createdAt = data.createdAt as any;
    if (createdAt && typeof createdAt.toDate === 'function') {
      createdAt = createdAt.toDate();
    }
    return { id: d.id, ...data, createdAt } as SKUVersionSnapshot;
  });
}

export async function deleteVersion(userId: string, projectId: string, versionId: string): Promise<void> {
  const ref = doc(db!, versionsPath(userId, projectId), versionId);
  await deleteDoc(ref);
}

export function restoreVersion(snapshot: SKUVersionSnapshot) {
  return { skus: snapshot.skus };
}
