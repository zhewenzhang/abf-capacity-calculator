import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { CapacityPlan, ProjectScope } from '../types';
import { collectionPath, assertCanWrite } from './projectScope';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function capacityPath(scope: ProjectScope) {
  return collectionPath(scope, 'capacityPlans');
}

export async function getCapacityPlans(scope: ProjectScope): Promise<CapacityPlan[]> {
  const q = query(collection(db!, capacityPath(scope)), orderBy('month', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CapacityPlan));
}

export async function saveCapacityPlan(scope: ProjectScope, plan: Omit<CapacityPlan, 'id'> & { id?: string }): Promise<string> {
  assertCanWrite(scope);
  const id = plan.id || `${plan.month}-${plan.factoryId}`;
  const ref = doc(db!, capacityPath(scope), id);
  const now = new Date();
  const data = {
    ...plan,
    id,
    createdAt: plan.createdAt || now,
    updatedAt: now,
  };
  await setDoc(ref, data);
  return id;
}

export async function deleteCapacityPlan(scope: ProjectScope, planId: string): Promise<void> {
  assertCanWrite(scope);
  const ref = doc(db!, capacityPath(scope), planId);
  await deleteDoc(ref);
}

// Batch save: deletes old docs for the months being updated, then writes new ones
export async function batchSaveCapacityPlans(
  scope: ProjectScope,
  updates: Array<{ month: string; factoryId: string; corePanelPerDay: number; buPanelPerDay: number }>,
  workingDays: number
): Promise<void> {
  assertCanWrite(scope);
  const batch = writeBatch(db!);
  const colRef = collection(db!, capacityPath(scope));

  // Delete existing docs for these month-factory combos
  const snapshot = await getDocs(colRef);
  const existingMap = new Map<string, string>(); // key -> docId
  for (const d of snapshot.docs) {
    const data = d.data() as CapacityPlan;
    const key = `${data.month}-${data.factoryId}`;
    existingMap.set(key, d.id);
  }

  const monthSet = new Set(updates.map((u) => u.month));
  for (const [key, docId] of existingMap) {
    const [month] = key.split('-');
    if (monthSet.has(month)) {
      batch.delete(doc(db!, capacityPath(scope), docId));
    }
  }

  // Write new docs
  const now = new Date();
  for (const u of updates) {
    const id = `${u.month}-${u.factoryId}`;
    const ref = doc(db!, capacityPath(scope), id);
    batch.set(ref, {
      id,
      month: u.month,
      factoryId: u.factoryId,
      corePanelPerDay: u.corePanelPerDay,
      buPanelPerDay: u.buPanelPerDay,
      workingDays, // keep for reference
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
}
