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
import type { ProjectScope } from '../types';
import { collectionPath, assertCanWrite } from './projectScope';

interface VersionSnapshot {
  id: string;
  versionName: string;
  createdAt: Date;
  gridData: Record<string, { core: number; bu: number }>;
  factories: Array<{ id: string; name: string }>;
  workingDays: number;
}

function versionsPath(scope: ProjectScope) {
  return collectionPath(scope, 'capacityVersions');
}

export async function saveVersion(
  scope: ProjectScope,
  versionName: string,
  gridData: Map<string, { core: number; bu: number }>,
  factories: Array<{ id: string; name: string }>,
  workingDays: number
): Promise<string> {
  assertCanWrite(scope);
  const id = `v-${Date.now()}`;
  const ref = doc(db!, versionsPath(scope), id);
  const gridObj: Record<string, { core: number; bu: number }> = {};
  gridData.forEach((val, key) => {
    gridObj[key] = val;
  });
  await setDoc(ref, {
    id,
    versionName,
    createdAt: new Date(),
    gridData: gridObj,
    factories,
    workingDays,
  });
  return id;
}

export async function getVersions(scope: ProjectScope): Promise<VersionSnapshot[]> {
  const q = query(collection(db!, versionsPath(scope)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    // Convert Firestore Timestamp to Date
    let createdAt = data.createdAt as any;
    if (createdAt && typeof createdAt.toDate === 'function') {
      createdAt = createdAt.toDate();
    }
    return { id: d.id, ...data, createdAt } as VersionSnapshot;
  });
}

export async function deleteVersion(scope: ProjectScope, versionId: string): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, versionsPath(scope), versionId);
  await deleteDoc(ref);
}

export function restoreVersion(snapshot: VersionSnapshot) {
  const gridData = new Map<string, { core: number; bu: number }>();
  Object.entries(snapshot.gridData).forEach(([key, val]) => {
    gridData.set(key, val);
  });
  return {
    gridData,
    factories: snapshot.factories,
    workingDays: snapshot.workingDays,
  };
}
