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
import type { SKU, ProjectScope } from '../types';
import { collectionPath, assertCanWrite } from './projectScope';

interface SKUVersionSnapshot {
  id: string;
  versionName: string;
  createdAt: Date;
  skus: SKU[];
}

function versionsPath(scope: ProjectScope) {
  return collectionPath(scope, 'skuVersions');
}

export async function saveVersion(
  scope: ProjectScope,
  versionName: string,
  skus: SKU[]
): Promise<string> {
  assertCanWrite(scope);
  const id = `sku-v-${Date.now()}`;
  const ref = doc(db!, versionsPath(scope), id);
  await setDoc(ref, {
    id,
    versionName,
    createdAt: new Date(),
    skus,
  });
  return id;
}

export async function getVersions(scope: ProjectScope): Promise<SKUVersionSnapshot[]> {
  const q = query(collection(db!, versionsPath(scope)), orderBy('createdAt', 'desc'));
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

export async function deleteVersion(scope: ProjectScope, versionId: string): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, versionsPath(scope), versionId);
  await deleteDoc(ref);
}

export function restoreVersion(snapshot: SKUVersionSnapshot) {
  return { skus: snapshot.skus };
}
