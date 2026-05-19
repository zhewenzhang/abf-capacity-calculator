import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { CapacityPlan } from '../types';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function capacityPath(userId: string, projectId: string) {
  return `users/${userId}/projects/${projectId}/capacityPlans`;
}

export async function getCapacityPlans(userId: string, projectId: string): Promise<CapacityPlan[]> {
  const q = query(collection(db!, capacityPath(userId, projectId)), orderBy('month', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CapacityPlan));
}

export async function getCapacityPlanByMonth(userId: string, projectId: string, month: string): Promise<CapacityPlan | null> {
  const q = query(
    collection(db!, capacityPath(userId, projectId)),
    where('month', '==', month)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as CapacityPlan;
}

export async function saveCapacityPlan(userId: string, projectId: string, plan: Omit<CapacityPlan, 'id'> & { id?: string }): Promise<string> {
  const id = plan.id || crypto.randomUUID();
  const ref = doc(db!, capacityPath(userId, projectId), id);
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

export async function deleteCapacityPlan(userId: string, projectId: string, planId: string): Promise<void> {
  const ref = doc(db!, capacityPath(userId, projectId), planId);
  await deleteDoc(ref);
}
