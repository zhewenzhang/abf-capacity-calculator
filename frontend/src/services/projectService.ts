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
import type { Project } from '../types';

if (!db) {
  throw new Error('Firestore not initialized. Check your .env configuration.');
}

function projectsPath(userId: string) {
  return `users/${userId}/projects`;
}

export async function getProjects(userId: string): Promise<Project[]> {
  const q = query(collection(db!, projectsPath(userId)), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
}

export async function createProject(userId: string, name: string): Promise<string> {
  const id = crypto.randomUUID();
  const ref = doc(db!, projectsPath(userId), id);
  const now = new Date();
  await setDoc(ref, { id, name, createdAt: now, updatedAt: now });
  return id;
}

export async function ensureDefaultProject(userId: string): Promise<string> {
  const projects = await getProjects(userId);
  if (projects.length > 0) {
    return projects[0].id;
  }
  return createProject(userId, 'Default Project');
}

export async function deleteProject(userId: string, projectId: string): Promise<void> {
  const ref = doc(db!, projectsPath(userId), projectId);
  await deleteDoc(ref);
}
